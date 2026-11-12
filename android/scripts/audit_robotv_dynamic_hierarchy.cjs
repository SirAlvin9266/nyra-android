'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/robotv.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const integratedPath = path.resolve(__dirname, '../app/src/main/assets/www/index.html');
const integratedHtml = fs.readFileSync(integratedPath, 'utf8');
const pageBundleStart = integratedHtml.indexOf('const pages = {items: "');
const pagesMatch = pageBundleStart >= 0 ? integratedHtml.slice(pageBundleStart).match(/animation: "([^"]+)"/) : null;
assert.ok(pagesMatch, 'O aplicativo deve conter o bundle dos três editores.');
assert.equal(Buffer.from(pagesMatch[1], 'base64').toString('utf8'), html,
  'A página RoboTV integrada no aplicativo deve ser idêntica à cópia auditada.');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match, 'RoboTV deve conter o script de módulo esperado.');

const source = match[1];
const tempPath = path.join(os.tmpdir(), 'nyra-robotv-audit-' + process.pid + '.mjs');
try {
  fs.writeFileSync(tempPath, source, 'utf8');
  const syntax = spawnSync(process.execPath, ['--check', tempPath], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, 'Sintaxe JavaScript do RoboTV inválida:\n' + syntax.stderr + syntax.stdout);
} finally {
  try { fs.unlinkSync(tempPath); } catch (_) {}
}

const checks = [
  ['estado da peça selecionada declarado uma única vez', source.indexOf('let nyraTransferData=') >= 0 && source.indexOf('let nyraTransferData=') === source.lastIndexOf('let nyraTransferData=') && !source.includes('let nyraSelectedNodeId=null;')],
  ['seletor de viewport definido uma única vez', (source.match(/function nyraBindViewportSelection\(/g) || []).length === 1],
  ['listener do viewport protegido contra duplicação', source.includes('if(nyraViewportSelectionBound)return;')],
  ['clique no viewport usa Raycaster', source.includes('raycaster.intersectObjects(candidates,false)')],
  ['hierarquia oferece seleção por clique', source.includes("row.addEventListener('click',()=>nyraSelectTransferNode(node.id))")],
  ['seletor de partes humanoides foi removido da interface', !html.includes('id="joint"') && !html.includes('id="jointButtons"')],
  ['timeline e controles de animação foram preservados', html.includes('id="addFrame"') && html.includes('id="play"') && html.includes('id="stop"')],
  ['campos de transformação têm IDs únicos', ['px','py','pz','rx','ry','rz','sx','sy','sz'].every(id => (html.match(new RegExp('id="'+id+'"','g')) || []).length === 1)],
  ['nove controles de transformação estão ligados', source.includes("for(const id of ['px','py','pz','rx','ry','rz','sx','sy','sz'])") && source.includes('nyraUpdateSelectedVector(id,event.target.value)')],
  ['associação bloqueia ciclos', source.includes("if(cursor.id===childId)throw new Error('Associação inválida: isso criaria um ciclo.')")],
  ['associação preserva a matriz mundial', source.includes('new THREE.Matrix4().compose(worldPosition,worldQuaternion,worldScale)')],
  ['remoção da associação preserva a transformação mundial', source.includes('inverseRoot.multiply(object.matrixWorld.clone())')],
  ['importação da cena continua disponível', source.includes("event.data.type==='NYRA_SCENE_TRANSFER_IMPORT'")],
  ['exportação GLB continua disponível', source.includes('nyraExportGLB.onclick=async()=>')],
  ['exportação .bbmodel reutiliza o Criador de Personagens', html.includes('id="nyraExportBBModel"') && source.includes("type:'NYRA_ROBOTV_EXPORT_BBMODEL'")],
  ['exportação de projeto JSON reutiliza o Criador de Personagens', html.includes('id="nyraExportCharacterJSON"') && source.includes("type:'NYRA_ROBOTV_EXPORT_PROJECT_JSON'")],
  ['exportação JSON sincroniza transformações atuais', source.includes('if(object)nyraStoreObjectTransform(node,object)')],
  ['associação Blockbench aceita somente grupos como pai', source.includes("!['bone','group'].includes(parent.type)")],
  ['host encaminha exportação ao Criador de Personagens', integratedHtml.includes("type==='NYRA_ROBOTV_EXPORT_BBMODEL'") && integratedHtml.includes("type:'NYRA_ROBOTV_EXPORT_BBMODEL'")],
  ['host devolve o resultado da exportação ao RoboTV', integratedHtml.includes("type==='NYRA_ROBOTV_EXPORT_RESULT'")],
  ['importação Blockbench retorna o mesmo requestId', integratedHtml.includes("type==='NYRA_SCENE_TRANSFER_ACK'") && integratedHtml.includes("requestId:event.data.requestId")],

  ['exportação do contrato de cena continua disponível', source.includes('nyraExportTransfer.onclick=')],
];

for (const [label, passed] of checks) {
  assert.ok(passed, 'Falha na auditoria: ' + label);
  process.stdout.write('PASS ' + label + '\n');
}
process.stdout.write('RoboTV dynamic hierarchy audit: ' + checks.length + '/' + checks.length + ' passed.\n');
