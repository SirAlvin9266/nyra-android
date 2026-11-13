const fs = require('node:fs');
const vm = require('node:vm');

const path = process.argv[2] || 'android/app/src/main/assets/www/character.html';
const html = fs.readFileSync(path, 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!match) throw new Error('Criador de Personagens: script principal ausente');
new vm.Script(match[1], { filename: path });

const required = [
  ['núcleo de cena local', 'const NyraCharacterScene'],
  ['identidade estável de nós', 'const ids=new WeakMap()'],
  ['regra anti-ciclo', 'Essa associação criaria um ciclo'],
  ['validação de matriz mundial', 'possível cisalhamento'],
  ['painel hierárquico', 'id="hierarchyTree"'],
  ['associação direta', 'id="associateSelected"'],
  ['remoção de associação', 'id="detachSelected"'],
  ['redo compartilhado', 'function redoCommand()'],
  ['histórico antigo unificado', 'function pushUndo(label,undo){recordCommand(label,undo,()=>{});}'],
  ['handlers antigos não sobrescrevem undo/redo', 'O histórico unificado já registrou os handlers de undo/redo.'],
  ['redo das transformações do gizmo', "pushUndo('transformação',()=>{o.position.fromArray(snap.position)"],
  ['importador Blockbench preservado', 'async function importBBModelFile'],
  ['exportador Blockbench preservado', 'function buildBBModelExportData'],
  ['ponte existente preservada', 'NYRA_SCENE_TRANSFER_SUBMIT'],
  ['seleção centralizada', 'function activateSelection(object,kind,mesh=null)'],
  ['inspeção de geometria centralizada', 'NyraCharacterScene.geometryNode(selectedObject)'],
  ['escopo de pintura', 'function setSelectedColor(color)']
];
const missing = required.filter(([, marker]) => !html.includes(marker));
if (missing.length) {
  console.error('Marcadores ausentes:', missing.map(([name]) => name));
  process.exit(1);
}
console.log('Auditoria estrutural do Criador passou:', required.length, 'marcadores; sintaxe do módulo válida.');
