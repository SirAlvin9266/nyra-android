'use strict';

const assert=require('node:assert/strict');
const {exportBedrockGeometry,importBedrockGeometry}=require('./bedrock_geometry_v1.cjs');
const {normalizeSceneTransfer}=require('./nyra_scene_transfer_v1.cjs');

const source={
 schema:'nyra.scene-transfer',schemaVersion:1,
 project:{id:'fixture',name:'Bedrock Asymmetric',source:{format:'blockbench',formatVersion:'5.0',modelFormat:'bedrock'},target:{format:'bedrock_entity'}},
 scene:{coordinateSystem:'nyra-local',nodes:[
  {id:'root',name:'root',type:'bone',parentId:null,children:['body'],pivot:[0,0,0],transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},sourceData:{origin:[0,0,0]}},
  {id:'body',name:'body',type:'bone',parentId:'root',children:['cube'],pivot:[0,1,0],transform:{position:[0,1,0],rotation:[0,0,0],scale:[1,1,1]},sourceData:{origin:[0,16,0]}},
  {id:'cube',name:'body cube',type:'cube',parentId:'body',children:[],pivot:[0,1,0],transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},geometry:{kind:'blockbench_cube',from:[-8,-8,-8],to:[8,8,8],inflate:0,mirror:false,faces:{north:{uv:[0,0,16,16],rotation:0},south:{uv:[16,0,32,16],rotation:90}}},sourceData:{origin:[0,16,0],rotation:[0,0,0],from:[-8,-8,-8],to:[8,8,8],faces:{north:{uv:[0,0,16,16]},south:{uv:[16,0,32,16],rotation:90}}}}
 ],materials:[],textures:[{id:'skin',name:'skin.png',width:64,height:64,source:'data:image/png;base64,AA=='}]},
 animations:{clips:[{id:'walk',name:'walk',duration:1,loop:true,channels:[{targetNodeId:'body',property:'rotation',keyframes:[{time:0,value:[0,0,0]},{time:1,value:[0,1,0]}]}]}]},
 extensions:{},diagnostics:[]
};
const normalized=normalizeSceneTransfer(source);
const out=exportBedrockGeometry(normalized,{identifier:'fixture'});
const packed=JSON.parse(out.json);
assert.equal(packed.format_version,'1.12.0');
const geometry=packed['minecraft:geometry'][0];
assert.equal(geometry.bones.length,2);
assert.equal(geometry.bones[1].name,'body');
assert.equal(geometry.bones[1].parent,'root');
assert.equal(geometry.bones[1].cubes.length,1);
assert.deepEqual(geometry.bones[1].cubes[0].uv.north.uv,[0,0]);
assert.deepEqual(geometry.bones[1].cubes[0].uv.north.uv_size,[16,16]);
assert.equal(out.report.boneCount,2);
assert.equal(out.report.cubeCount,1);
const reopened=normalizeSceneTransfer(importBedrockGeometry(packed));
const again=exportBedrockGeometry(reopened,{identifier:'roundtrip'});
const roundGeometry=JSON.parse(again.json)['minecraft:geometry'][0];
assert.equal(roundGeometry.bones.length,2);
assert.equal(roundGeometry.bones[1].name,'body');
assert.equal(roundGeometry.bones[1].parent,'root');
assert.equal(roundGeometry.bones[1].cubes.length,1);
assert.throws(()=>exportBedrockGeometry({...normalized,scene:{...normalized.scene,nodes:[...normalized.scene.nodes,{id:'mesh',name:'mesh',type:'mesh',parentId:'root',transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},pivot:[0,0,0],geometry:{kind:'blockbench_mesh',vertices:{},faces:{}}}]}},{identifier:'unsupported'}),/Malhas livres/);
assert.throws(()=>importBedrockGeometry({format_version:'1.12.0','minecraft:geometry':[]}),/Geometry JSON/);
console.log('PASS: Bedrock geometry export/import round-trip preserves bone hierarchy, cube dimensions, pivots and per-face UV rectangles.');
console.log('PASS: unsupported arbitrary meshes and invalid geometry documents are rejected explicitly.');
