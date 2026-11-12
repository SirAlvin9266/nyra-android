'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/robotv.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const characterPath = path.resolve(__dirname, '../app/src/main/assets/www/character.html');
const characterHtml = fs.readFileSync(characterPath, 'utf8');
const characterScriptStart = characterHtml.indexOf('<script type="module">') + '<script type="module">'.length;
const characterScriptEnd = characterHtml.indexOf('</script>', characterScriptStart);
assert.ok(characterScriptStart >= 0 && characterScriptEnd > characterScriptStart, 'Character Creator module must exist for GLB node tagging.');
const characterSource = characterHtml.slice(characterScriptStart, characterScriptEnd);

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

const mapStart=source.indexOf('function nyraMapGLTFTransferObjects(candidate,doc,nodeMap=new Map()){');
const mapEnd=source.indexOf('\nasync function nyraLoadTransfer',mapStart);
assert.ok(mapStart>=0&&mapEnd>mapStart,'GLB transfer-node mapper must be extractable.');
const mapHelper=source.slice(mapStart,mapEnd);
const tagStart=characterSource.indexOf('function nyraTagBBModelForGLBExport(transfer){');
const tagEnd=characterSource.indexOf('\nasync function nyraSendBBModelToRoboTV',tagStart);
assert.ok(tagStart>=0&&tagEnd>tagStart,'Character Creator must tag Blockbench GLB nodes before export.');
const tagHelper=characterSource.slice(tagStart,tagEnd);

const checks = [
  ['estado da peça selecionada declarado uma única vez', source.indexOf('let nyraTransferData=') >= 0 && source.indexOf('let nyraTransferData=') === source.lastIndexOf('let nyraTransferData=') && !source.includes('let nyraSelectedNodeId=null;')],
  ['seletor de viewport definido uma única vez', (source.match(/function nyraBindViewportSelection\(/g) || []).length === 1],
  ['listener do viewport protegido contra duplicação', source.includes('if(nyraViewportSelectionBound)return;')],
  ['clique no viewport usa Raycaster', source.includes('raycaster.intersectObjects(candidates,false)')],
  ['hierarquia oferece seleção por clique', source.includes("row.addEventListener('click',()=>nyraSelectTransferNode(node.id))")],
  ['seletor de partes humanoides foi removido da interface', !html.includes('id="joint"') && !html.includes('id="jointButtons"')],
  ['timeline e controles de animação foram preservados', html.includes('id="addFrame"') && html.includes('id="play"') && html.includes('id="stop"')],
  ['campos de transformação têm IDs únicos', ['px','py','pz','rx','ry','rz','sx','sy','sz'].every(id => (html.match(new RegExp('id="'+id+'"','g')) || []).length === 1)],
  ['TransformControls está integrado ao viewport', source.includes("import { TransformControls } from 'three/addons/controls/TransformControls.js'") && source.includes('new TransformControls(camera,renderer.domElement)')],
  ['gizmo é conectado à peça selecionada', source.includes('transformControls.attach(object)') && source.includes('transformControls.setMode(nyraCurrentTransformMode)')],
  ['modo de associação desativa o gizmo', source.includes('transformControls.enabled=!!object&&!nyraAssociationMode')],
  ['ferramentas mover, rotacionar e escalar estão disponíveis', ['nyraMoveTool','nyraRotateTool','nyraScaleTool'].every(id => html.includes('id="'+id+'"'))],
  ['histórico de hierarquia registra associações e remoções', source.includes('function nyraPushHierarchyHistory(node,object)') && source.includes('nyraPushHierarchyHistory(child,childObject)') && source.includes('nyraPushHierarchyHistory(node,object)')],
  ['desfazer restaura pai e transformação anteriores', source.includes('function nyraUndoHierarchyChange()') && source.includes('node.parentId=previous.parentId')],
  ['botão de desfazer está ligado', html.includes('id="nyraUndoAssociation"') && source.includes("nyraUndoAssociation').onclick")],

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
  ['host encaminha exportação de projeto JSON', integratedHtml.includes("type==='NYRA_ROBOTV_EXPORT_PROJECT_JSON'") && integratedHtml.includes("type:'NYRA_ROBOTV_EXPORT_PROJECT_JSON'")],
  ['host devolve o resultado da exportação ao RoboTV', integratedHtml.includes("type==='NYRA_ROBOTV_EXPORT_RESULT'")],
  ['importação Blockbench retorna o mesmo requestId', integratedHtml.includes("type==='NYRA_SCENE_TRANSFER_ACK'") && integratedHtml.includes("requestId:event.data.requestId")],

  ['exportação do contrato de cena continua disponível', source.includes('nyraExportTransfer.onclick=')],
  ['GLB usa mapeamento estável de IDs de transferência', source.includes('nyraMapGLTFTransferObjects(candidate,normalized,nodeObjects)')],
  ['Criador marca o pivô de cada peça antes de exportar GLB', characterSource.includes('tag(record.pivot||record.mesh,node.id)')],
];


function mockObject(name,userData={}){const object={name,userData,parent:null,children:[],add(child){child.parent=this;this.children.push(child);},traverse(callback){callback(this);for(const child of this.children)child.traverse(callback);}};return object;}
const tagRoot=mockObject('Model'),tagGroup=mockObject('Arm group'),tagPivot=mockObject('Arm pivot'),tagMesh=mockObject('Arm cube');
const tagContext=vm.createContext({bbmodelState:{rootGroup:tagRoot,groups:[{uuid:'g1',node:tagGroup}],records:[{uuid:'e1',pivot:tagPivot,mesh:tagMesh}]}});
vm.runInContext(tagHelper+';globalThis.tag=nyraTagBBModelForGLBExport;',tagContext);
const restoreTags=tagContext.tag({scene:{nodes:[{id:'group:g1',sourceId:'g1'},{id:'element:e1',sourceId:'e1'}]}});
assert.equal(tagRoot.name,'__nyra_transfer_node__:bbmodel-root');assert.equal(tagGroup.userData.nyraTransferNodeId,'group:g1');assert.equal(tagPivot.name,'__nyra_transfer_node__:element:e1');assert.equal(tagMesh.name,'Arm cube');
restoreTags();assert.equal(tagRoot.name,'Model');assert.equal(tagGroup.name,'Arm group');assert.equal(tagPivot.name,'Arm pivot');assert.equal(tagPivot.userData.nyraTransferNodeId,undefined);
const scene=mockObject('scene'),glbRoot=mockObject('__nyra_transfer_node__:bbmodel-root'),glbGroup=mockObject('__nyra_transfer_node__:group:g1'),glbPivot=mockObject('__nyra_transfer_node__:element:e1'),glbMesh=mockObject('Arm cube');
scene.add(glbRoot);glbRoot.add(glbGroup);glbGroup.add(glbPivot);glbPivot.add(glbMesh);
const doc={scene:{nodes:[{id:'bbmodel-root',name:'Model',type:'group'},{id:'group:g1',name:'Arm group',type:'bone'},{id:'element:e1',name:'Arm cube',type:'cube'}]}};
const mapContext=vm.createContext({});vm.runInContext(mapHelper+';globalThis.map=nyraMapGLTFTransferObjects;',mapContext);
const mapped=mapContext.map(scene,doc,new Map());assert.equal(mapped.get('bbmodel-root'),glbRoot);assert.equal(mapped.get('group:g1'),glbGroup);assert.equal(mapped.get('element:e1'),glbPivot);assert.equal(glbPivot.name,'Arm cube');
const legacyScene=mockObject('scene'),legacyRoot=mockObject('root'),legacyPivot=mockObject('Arm cube pivot',{bbPivot:true}),legacyMesh=mockObject('Arm cube');
legacyScene.add(legacyRoot);legacyRoot.add(legacyPivot);legacyPivot.add(legacyMesh);
const legacyMap=mapContext.map(legacyScene,{scene:{nodes:[{id:'element:e1',name:'Arm cube',type:'cube'}]}},new Map());
assert.equal(legacyMap.get('element:e1'),legacyPivot,'legacy GLBs must fall back to the Blockbench pivot when available');
process.stdout.write('PASS GLB transfer IDs resolve groups and element pivots, with legacy pivot fallback and name restoration.\\n');

for (const [label, passed] of checks) {
  assert.ok(passed, 'Falha na auditoria: ' + label);
  process.stdout.write('PASS ' + label + '\n');
}
process.stdout.write('RoboTV dynamic hierarchy audit: ' + checks.length + '/' + checks.length + ' passed.\n');
