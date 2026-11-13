const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('android/app/src/main/assets/www/character.html', 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Script do Criador não encontrado.');

const start = script.indexOf('const NyraCharacterScene = (() => {');
const end = script.indexOf('})();', start) + 4;
if (start < 0 || end < 4) throw new Error('Núcleo NyraCharacterScene não encontrado.');
const core = script.slice(start, end);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function makeNode(name, isMesh = false) {
  return {
    name, isMesh, children: [], parent: null,
    add(child) {
      if (child.parent) child.parent.remove(child);
      this.children.push(child);
      child.parent = this;
    },
    remove(child) {
      this.children = this.children.filter(item => item !== child);
      child.parent = null;
    }
  };
}

const scene = makeNode('scene');
const character = makeNode('character');
const voxelGroup = makeNode('voxels');
scene.add(character);
scene.add(voxelGroup);
const THREE = {};
const context = { scene, character, voxelGroup, bbmodelState: null, THREE };
vm.runInNewContext(core + '\nthis.api = NyraCharacterScene;', context);
const api = context.api;
const root = makeNode('root');
const a = makeNode('A');
const b = makeNode('B');
const c = makeNode('C');
const mesh = makeNode('mesh', true);
root.add(a); a.add(b); root.add(c); root.add(mesh);

assert(api.canReparent(c, a).ok, 'Associação válida deveria ser aceita.');
assert(!api.canReparent(a, c).ok, 'Ciclo deveria ser bloqueado.');
assert(!api.canReparent(a, a).ok, 'Auto-parenting deveria ser bloqueado.');
assert(!api.canReparent(b, a).ok, 'Mesmo pai deveria ser reconhecido como operação redundante.');
assert(!api.canReparent(c, mesh).ok, 'Mesh não pode ser destino.');
assert(script.includes('const oldLocal={position:child.position.clone(),quaternion:child.quaternion.clone(),rotation:child.rotation.clone(),scale:child.scale.clone()};'), 'Reparenting deve capturar a transformação local antes de tentar alterar o pai.');
assert(script.includes('child.position.copy(oldLocal.position);child.quaternion.copy(oldLocal.quaternion);child.rotation.copy(oldLocal.rotation);child.scale.copy(oldLocal.scale);'), 'Falha no reparenting deve restaurar a transformação local original.');
assert(script.includes('else parent.remove(child);'), 'Falha no reparenting deve remover o nó do destino quando ele não tinha pai anterior.');
assert(!api.canReparent(scene, a).ok, 'Raiz protegida não pode ser movida.');
assert(api.isAncestor(a, b), 'Detecção de ancestral falhou.');
assert(!api.isAncestor(b, a), 'Detecção de ancestral retornou falso positivo.');
const flat = api.hierarchy(root);
assert(flat.length === 2 && flat[0].node === a && flat[1].node === b, 'Listagem hierárquica incorreta.');
assert(flat[1].parentId === flat[0].id, 'Vínculo pai-filho não foi descrito corretamente.');

const historyStart = script.indexOf('const undoStack=[],redoStack=[];');
const historyEnd = script.indexOf('function refreshHierarchy()', historyStart);
if (historyStart < 0 || historyEnd < 0) throw new Error('Histórico unificado não encontrado.');
const historyScript = script.slice(historyStart, historyEnd);
const historyContext = {
  document: { querySelector: () => ({ textContent: '', disabled: false }) }
};
vm.runInNewContext(historyScript + '\nthis.history={recordCommand,pushUndo,undoCommand,redoCommand,undoStack,redoStack};', historyContext);
const history = historyContext.history;
const state = { value: 1 };
history.recordCommand('transformação', () => { state.value = 0; }, () => { state.value = 1; });
assert(history.undoCommand() && state.value === 0, 'Undo de comando reversível falhou.');
assert(history.redoCommand() && state.value === 1, 'Redo de comando reversível falhou.');
history.pushUndo('ação antiga', () => { state.value = 2; });
assert(history.undoCommand() && state.value === 2, 'Ação antiga deve continuar desfazível.');
assert(history.redoStack.length === 0, 'Ação antiga sem callback redo não deve entrar na pilha de refazer.');
assert(!history.redoCommand(), 'Ação antiga sem callback redo não deve fingir que pode ser refeita.');
history.recordCommand('nova operação', () => {}, () => {});
assert(history.redoStack.length === 0, 'Nova operação deve limpar a pilha redo.');
assert(script.includes('function pushUndo(label,undo){recordCommand(label,undo,null);}'), 'Ações antigas devem entrar no histórico sem callback redo fictício.');
assert(!script.includes("document.querySelector('#restorePart').onclick=undoLast"), 'Handler legado ainda sobrescreve o botão.');
assert(script.includes('O histórico unificado já registrou os handlers de undo/redo.'), 'Marcador de não sobrescrita ausente.');

console.log('Testes do núcleo hierárquico passaram: 16 invariantes de cena e histórico.');
