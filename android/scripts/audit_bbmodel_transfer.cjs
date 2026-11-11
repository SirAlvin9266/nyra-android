'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {normalizeSceneTransfer} = require('./nyra_scene_transfer_v1.cjs');

const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/const pages = \{items: "([^"]+)", character: "([^"]+)", animation: "([^"]+)"\};/);
assert.ok(match, 'host must contain the three embedded editor pages');
const characterHtml = Buffer.from(match[2], 'base64').toString('utf8');
const start = characterHtml.indexOf('function nyraBuildSceneTransferFromBBModel(');
const end = characterHtml.indexOf('\nasync function nyraSendBBModelToRoboTV()', start);
assert.ok(start >= 0 && end > start, 'Character Creator must expose the BBModel transfer builder');
const importSuccess = characterHtml.indexOf("Importado com fidelidade estrutural:");
const enableTransfer = characterHtml.indexOf("sendRoboTvButton.disabled=false", importSuccess);
const importReturn = characterHtml.indexOf("return true;", importSuccess);
assert.ok(importSuccess >= 0 && enableTransfer > importSuccess && importReturn > enableTransfer,
  'successful BBModel import must enable the RoboTV transfer button before returning');

const context = vm.createContext({});
vm.runInContext(
  characterHtml.slice(start, end) + '\n;globalThis.__buildTransfer=nyraBuildSceneTransferFromBBModel;',
  context,
  {filename:'nyra-bbmodel-transfer-builder.js'}
);

const fixture = {
  name:'Nested rig fixture',
  meta:{model_format:'bedrock',format_version:'1.12.0'},
  resolution:{width:64,height:64},
  groups:[
    {uuid:'root-bone',name:'Root',origin:[16,32,0],rotation:[0,0,0]},
    {uuid:'arm-bone',name:'Arm',origin:[32,48,16],rotation:[0,0,0]}
  ],
  outliner:[
    {uuid:'root-bone',children:[
      {uuid:'arm-bone',children:['arm-cube']}
    ]}
  ],
  elements:[
    {uuid:'arm-cube',name:'Arm cube',type:'cube',from:[40,60,10],to:[56,76,26],origin:[48,64,16],rotation:[0,0,0],
     faces:{north:{uv:[0,0,16,16],rotation:90,texture:0},south:{uv:[16,0,32,16],rotation:0,texture:0}}}
  ],
  textures:[
    {uuid:'texture-1',name:'fixture.png',width:64,height:64,source:'data:image/png;base64,AA=='}
  ],
  animations:[
    {name:'walk',length:1,loop:true,animators:{
      'arm-bone':{keyframes:[
        {time:1,channel:'rotation',interpolation:'linear',data_points:[{x:0,y:90,z:0}]},
        {time:0,channel:'rotation',interpolation:'linear',data_points:[{x:0,y:0,z:0}]}
      ]},
      'arm-cube':{keyframes:[
        {time:0.5,channel:'molang.query.fixture',interpolation:'step',data_points:[{x:1,y:2,z:3}]}
      ]}
    }}
  ]
};

const built = context.__buildTransfer(fixture,'nested-rig.bbmodel');
const transfer = normalizeSceneTransfer(JSON.parse(JSON.stringify(built)));
assert.equal(transfer.project.target.format,'bedrock_entity');
assert.equal(transfer.project.source.format,'blockbench');

const nodes = new Map(transfer.scene.nodes.map(node=>[node.id,node]));
const root = nodes.get('group:root-bone');
const arm = nodes.get('group:arm-bone');
const cube = nodes.get('element:arm-cube');
assert.ok(root && arm && cube, 'all source nodes must be represented');
assert.equal(arm.parentId,'group:root-bone');
assert.equal(cube.parentId,'group:arm-bone');
assert.deepEqual(arm.transform.position,[1,1,1], 'nested group origins must become parent-relative');
assert.deepEqual(cube.transform.position,[1,1,0], 'element origins must become parent-relative');
assert.deepEqual(cube.pivot,[3,4,1], 'source pivot must be retained separately from the local transform');
assert.deepEqual(cube.geometry.faces.north.uv,[0,0,16,16], 'per-face UV rectangles must be retained');
assert.equal(cube.geometry.faces.north.rotation,90);
assert.equal(transfer.scene.textures[0].source,'data:image/png;base64,AA==');
assert.equal(transfer.extensions.blockbenchRaw.elements[0].uuid,'arm-cube');

const clip = transfer.animations.clips[0];
assert.equal(clip.name,'walk');
assert.equal(clip.loop,true);
const rotation = clip.channels.find(channel=>channel.targetNodeId==='group:arm-bone'&&channel.property==='rotation');
assert.ok(rotation,'bone rotation channels must target the matching stable node ID');
assert.ok(Math.abs(rotation.keyframes[1].value[1]-Math.PI/2)<1e-9,'Blockbench degree values must become radians');
const molang = clip.channels.find(channel=>channel.property==='molang.query.fixture');
assert.ok(molang,'unsupported source channels must remain in the document');
assert.equal(molang.keyframes[0].interpolation,'step');
assert.equal(transfer.warnings.length,1,'unsupported channel should be reported without being discarded');

console.log('PASS: Blockbench groups, cubes, parent-relative transforms, pivots, UV faces, textures and animation channels map into Nyra scene-transfer v1.');
console.log('PASS: unsupported/Molang animation channels remain preserved in source data with a warning.');
