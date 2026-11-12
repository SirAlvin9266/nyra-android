'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/character.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const integratedPath = path.resolve(__dirname, '../app/src/main/assets/www/index.html');
const integratedHtml = fs.readFileSync(integratedPath, 'utf8');
const bundleStart = integratedHtml.indexOf('const pages = {items: "');
const bundleMatch = bundleStart >= 0 ? integratedHtml.slice(bundleStart).match(/character: "([^"]+)"/) : null;
assert.ok(bundleMatch, 'O aplicativo deve conter a página Character Creator.');
assert.equal(Buffer.from(bundleMatch[1], 'base64').toString('utf8'), html,
  'A página Character Creator integrada deve ser idêntica à cópia auditada.');
assert.ok(html.includes('id="paintScope"'), 'O seletor de escopo de pintura deve existir.');
for (const option of ['piece', 'group', 'model']) {
  assert.ok(html.includes('value="' + option + '"'), 'Escopo de pintura ausente: ' + option);
}

const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match, 'O Character Creator deve conter seu script de módulo.');
const source = match[1];
const tempPath = path.join(os.tmpdir(), 'nyra-character-paint-audit-' + process.pid + '.mjs');
try {
  fs.writeFileSync(tempPath, source, 'utf8');
  const syntax = spawnSync(process.execPath, ['--check', tempPath], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, 'Sintaxe JavaScript do Character Creator inválida:\n' + syntax.stderr + syntax.stdout);
} finally {
  try { fs.unlinkSync(tempPath); } catch (_) {}
}

const checks = [
  ['escopo peça limita a pintura aos meshes diretamente ligados à peça', source.includes("paintMaterials(part,color,false)")],
  ['escopo grupo percorre apenas a subárvore selecionada', source.includes("paintMaterials(part,color,true)")],
  ['escopo modelo aplica a cor ao projeto inteiro', source.includes('function paintWholeProject(color)')],
  ['modelo inteiro inclui o personagem', source.includes('paintMaterials(character,color,true)')],
  ['modelo inteiro inclui voxels e formas', source.includes('paintMaterials(voxelGroup,color,true)')],
  ['modelo inteiro inclui modelo Blockbench ativo', source.includes('if(bbmodelState?.rootGroup)paintMaterials(bbmodelState.rootGroup,color,true)')],
  ['grupo Blockbench é encontrado sem alcançar irmãos', source.includes('parent!==character&&parent!==voxelGroup&&!parent.userData?.bbGroupUuid')],
  ['pintura não usa mais traverse irrestrito do grupo selecionado', !source.includes("part?.traverse(node=>{if(node.isMesh)")],
  ['exportador Blockbench recebe a cena atual do RoboTV', source.includes('function nyraApplyRoboTVTransferToBBModel(doc)')],
  ['serializador compartilhado é usado pelo exportador .bbmodel', source.includes('const out=buildBBModelExportData()')],
  ['JSON do Character Creator reutiliza o serializador Blockbench atualizado', source.includes('bbmodel:bbmodelState?buildBBModelExportData():null')],
  ['RoboTV pode acionar o exportador JSON original', source.includes("event.data.type==='NYRA_ROBOTV_EXPORT_PROJECT_JSON'") && source.includes("document.querySelector('#save').click()")],
  ['exportação reaproveita o handler existente do Criador', source.includes('bbmodelExport.click()')],
  ['transformações de grupos são aplicadas ao exportador', source.includes('group.node.position.fromArray(t.position||[0,0,0])')],
  ['transformações e visibilidade das peças são aplicadas', source.includes('record.pivot.position.fromArray(t.position||[0,0,0])') && source.includes('record.element.visibility=node.visibility!==false')],
  ['hierarquia reparentada é serializada no outliner Blockbench', source.includes('raw.outliner=outliner')],
  ['escala de grupos não é descartada silenciosamente', source.includes('O formato .bbmodel não preserva escala aplicada diretamente a grupos.')],
  ['malhas livres modificadas recebem erro explícito', source.includes('não converte transformações ou associações de malhas livres')],
  ['importação mantém requestId entre Criador e RoboTV', source.includes('nyraSendBBModelToRoboTV(event.data.requestId)')],

];

for (const [label, passed] of checks) {
  assert.ok(passed, 'Falha na auditoria: ' + label);
  process.stdout.write('PASS ' + label + '\n');
}
process.stdout.write('Character Creator paint-scope audit: ' + checks.length + '/' + checks.length + ' passed.\n');
