const fs = require('node:fs');
const vm = require('node:vm');

const path = process.argv[2] || 'android/app/src/main/assets/www/character.html';
const html = fs.readFileSync(path, 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!match) throw new Error('Criador de Personagens: script principal ausente');

// Parse only. This does not pretend to validate browser/WebGL behavior.
new vm.Script(match[1], { filename: path });

const required = [
  ['núcleo de cena local', 'const NyraCharacterScene'],
  ['identidade estável de nós', 'const ids=new WeakMap()'],
  ['regra anti-ciclo', 'Essa associação criaria um ciclo'],
  ['validação de matriz mundial', 'possível cisalhamento'],
  ['painel hierárquico', 'id="hierarchyTree"'],
  ['associação direta', 'id="associateSelected"'],
  ['remoção de associação', 'id="detachSelected"'],
  ['refazer associação', 'function redoCommand()'],
  ['importador Blockbench preservado', 'async function importBBModelFile'],
  ['exportador Blockbench preservado', 'function buildBBModelExportData'],
  ['ponte já existente para RoboTV preservada', 'NYRA_SCENE_TRANSFER_SUBMIT']
];
const missing = required.filter(([, marker]) => !html.includes(marker));
if (missing.length) {
  console.error('Marcadores ausentes:', missing.map(([name]) => name));
  process.exit(1);
}
console.log('Auditoria estrutural do Criador passou:', required.length, 'marcadores; sintaxe do módulo válida.');
