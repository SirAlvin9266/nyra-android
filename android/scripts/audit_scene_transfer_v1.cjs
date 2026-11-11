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
  {targetNodeId:'arm',property:'molang.foo',keyframes:[],sourceData:{expression:'query.foo'}},
  {targetNodeId:'arm',property:'vendor.custom',keyframes:[{time:0.25,value:[1,2,3,4],interpolation:'bezier',sourceData:{raw:true}}]}
 ]}]},
 extensions:{vendor:{raw:1}},diagnostics:[]
};
const result=normalizeSceneTransfer(valid);
assert.equal(result.scene.nodes.length,2);
assert.equal(result.scene.nodes[1].parentId,'root');
assert.deepEqual(result.scene.nodes[0].children,['arm'],'children must be derived from parentId');
assert.deepEqual(result.animations.clips[0].channels[0].keyframes.map(f=>f.time),[0,1]);
assert.equal(result.animations.clips[0].channels[1].property,'molang.foo');
assert.deepEqual(result.animations.clips[0].channels[2].keyframes[0].value,[1,2,3,4],'unknown channels must preserve arbitrary JSON keyframe value shapes');
assert.equal(result.warnings.length,2);
assert.equal(result.diagnostics.length,2);
assert.equal(result.project.source.format,'blockbench');
assert.equal(result.project.target.format,'bedrock_entity');
assert.equal(result.scene.nodes[1].geometry.size[1],2);

function invalid(doc,pattern){assert.throws(()=>normalizeSceneTransfer(doc),pattern);}
invalid({...valid,schemaVersion:9},/Versão/);
invalid({...valid,scene:{nodes:[{id:'same'},{id:'same'}]}},/duplicado/);
invalid({...valid,scene:{nodes:[{id:'child',parentId:'missing'}]}},/Pai inexistente/);
invalid({...valid,scene:{nodes:[{id:'a',parentId:'b'},{id:'b',parentId:'a'}]}},/Ciclo/);
invalid({...valid,animations:{clips:[{id:'c',duration:-1,channels:[]}]}},/duration/);
invalid({...valid,animations:{clips:[{id:'c',duration:'1',channels:[]}]}},/duration/);
invalid({...valid,animations:{clips:[{id:'c',duration:1,channels:[{targetNodeId:'missing',property:'rotation',keyframes:[]}]}]}},/nó inexistente/);
invalid({...valid,animations:{clips:[{id:'c',duration:1,channels:[{targetNodeId:'arm',property:'rotation',keyframes:[{time:0,value:[0,0,0]},{time:0,value:[1,0,0]}]}]}]}},/duplicados/);
invalid({...valid,scene:{nodes:[{id:'a',transform:{position:[0,NaN,0]}}]}},/position/);
invalid({...valid,scene:{nodes:[{id:'a',children:['missing']}] }},/Filho inexistente/);
invalid({...valid,scene:{nodes:[{id:'a',children:['b']},{id:'b',parentId:null}]},animations:{clips:[]}},/inconsistente/);
invalid({...valid,scene:{nodes:[{id:'a',children:[]},{id:'b',parentId:'a'}]},animations:{clips:[]}},/incompleta/);
invalid({...valid,scene:{nodes:[{id:'a',transform:{rotationUnit:'grad'}}]}},/rotationUnit/);
invalid({...valid,scene:{nodes:[{id:'a',transform:{scale:[1,0,1]}}]}},/scale/);
invalid({...valid,scene:{nodes:[{id:'a',geometry:{bad:()=>{}}}]}},/serializáveis/);


invalid({...valid,project:{id:'p1',name:'Fixture',source:{format:'blockbench',modelFormat:'bedrock'},target:{format:'bedrock_entity'},circular:(()=>{const x={};x.self=x;return x})()}},/circular/);
invalid({...valid,scene:{nodes:[{id:'a',geometry:{bad:()=>{}}}]}},/serializáveis/);
\nconsole.log('PASS: Nyra scene-transfer v1 validates schema, unique IDs, hierarchy, transforms, clips, channels and keyframes.');
console.log('PASS: unknown channels/interpolations are preserved with warnings; source/target and geometry payloads survive normalization.');
