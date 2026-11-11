'use strict';
const assert=require('node:assert/strict');
const {SCHEMA,VERSION,normalizeSceneTransfer}=require('./nyra_scene_transfer_v1.cjs');

const valid={
 schema:SCHEMA,schemaVersion:VERSION,
 project:{id:'p1',name:'Fixture',source:{format:'blockbench',modelFormat:'bedrock'},target:{format:'bedrock_entity'}},
 scene:{coordinateSystem:'nyra-local',nodes:[
  {id:'root',type:'bone',name:'root',pivot:[0,0,0]},
  {id:'arm',type:'cube',name:'arm',parentId:'root',transform:{position:[0,1,0]},geometry:{size:[1,2,1]}}
 ],materials:[],textures:[]},
 animations:{clips:[{id:'walk',name:'walk',duration:1,loop:true,channels:[
  {targetNodeId:'arm',property:'rotation',keyframes:[{time:1,value:[0,0,1]},{time:0,value:[0,0,0]}]},
  {targetNodeId:'arm',property:'molang.foo',keyframes:[],sourceData:{expression:'query.foo'}}
 ]}]},
 extensions:{vendor:{raw:1}},diagnostics:[]
};
const result=normalizeSceneTransfer(valid);
assert.equal(result.scene.nodes.length,2);
assert.equal(result.scene.nodes[1].parentId,'root');
assert.deepEqual(result.animations.clips[0].channels[0].keyframes.map(f=>f.time),[0,1]);
assert.equal(result.animations.clips[0].channels[1].property,'molang.foo');
assert.equal(result.warnings.length,1);

function invalid(doc,pattern){
 assert.throws(()=>normalizeSceneTransfer(doc),pattern);
}
invalid({...valid,schemaVersion:9},/Versão/);
invalid({...valid,scene:{nodes:[{id:'same'},{id:'same'}]}},/duplicado/);
invalid({...valid,scene:{nodes:[{id:'child',parentId:'missing'}]}},/Pai inexistente/);
invalid({...valid,scene:{nodes:[{id:'a',parentId:'b'},{id:'b',parentId:'a'}]}},/Ciclo/);
invalid({...valid,animations:{clips:[{id:'c',duration:1,channels:[{targetNodeId:'missing',property:'rotation',keyframes:[]}]}]}},/nó inexistente/);
invalid({...valid,animations:{clips:[{id:'c',duration:-1,channels:[]}]}},/duration/);
invalid({...valid,scene:{nodes:[{id:'a',transform:{position:[0,NaN,0]}}]}},/position/);
invalid({...valid,scene:{nodes:[{id:'a',children:['b']},{id:'b',parentId:null}]}},/inconsistente/);
invalid({...valid,scene:{nodes:[{id:'arm',type:'cube'}],textures:[{bad:()=>{}}]}},/serializáveis/);

console.log('PASS: Nyra scene-transfer v1 validates schema, unique IDs, parent references, cycles, transforms, clips, channels and keyframes.');
console.log('PASS: unknown channels/interpolations are preserved with warnings and keyframes are ordered.');
