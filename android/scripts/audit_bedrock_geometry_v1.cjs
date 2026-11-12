'use strict';

const assert=require('node:assert/strict');
const {exportBedrockGeometry,importBedrockGeometry}=require('./bedrock_geometry_v1.cjs');
const {normalizeSceneTransfer}=require('./nyra_scene_transfer_v1.cjs');

const source={
  schema:'nyra.scene-transfer',schemaVersion:1,
  project:{id:'fixture',name:'Asymmetric Bedrock Fixture',source:{format:'blockbench',formatVersion:'5.0',modelFormat:'bedrock'},target:{format:'bedrock_entity'}},
  scene:{coordinateSystem:'nyra-local',nodes:[
    {id:'root',name:'root',type:'bone',parentId:null,children:['arm','box-cube'],pivot:[1,2,0],transform:{position:[1,2,0],rotation:[10*Math.PI/180,20*Math.PI/180,30*Math.PI/180],rotationUnit:'radians'},sourceData:{origin:[16,32,0],rotation:[10,20,30],bedrock:{binding:'head',mirror:true},locators:{hand:[1,2,3],muzzle:{offset:[4,5,6],rotation:[10,20,30]}}}},
    {id:'arm',name:'arm',type:'bone',parentId:'root',children:['rotated-cube'],pivot:[2,3,1],transform:{position:[1,1,1],rotation:[0,0,0],rotationUnit:'radians'},sourceData:{origin:[32,48,16],rotation:[0,0,0]}},
    {id:'rotated-cube',name:'rotated cube',type:'cube',parentId:'arm',children:[],pivot:[3,4,1],transform:{position:[0,0,0],rotation:[10*Math.PI/180,20*Math.PI/180,30*Math.PI/180],rotationUnit:'radians'},geometry:{kind:'blockbench_cube',from:[40,60,10],to:[56,76,26],inflate:0.25,mirror:false,faces:{north:{uv:[0,0,16,16],rotation:0},up:{uv:[2,4,10,12],rotation:90,material_name:'glass'}}},sourceData:{origin:[48,64,16],rotation:[10,20,30],from:[40,60,10],to:[56,76,26]}},
    {id:'box-cube',name:'box UV cube',type:'cube',parentId:'root',children:[],pivot:[0,0,0],transform:{position:[0,0,0],rotation:[0,0,0],rotationUnit:'radians'},geometry:{kind:'blockbench_cube',from:[-2,0,-2],to:[2,4,2],boxUv:true,uvOffset:[8,12],mirrorUv:false,faces:{}},sourceData:{origin:[0,0,0],rotation:[0,0,0],uv:[8,12],mirror_uv:false}}
  ],materials:[],textures:[{id:'skin',name:'skin.png',width:128,height:64,source:'data:image/png;base64,AA=='}]},
  animations:{clips:[{id:'walk',name:'walk',duration:1,loop:true,channels:[{targetNodeId:'arm',property:'rotation',keyframes:[{time:0,value:[0,0,0],interpolation:'linear',sourceData:{}},{time:1,value:[0,1,0],interpolation:'linear',sourceData:{}}]}]}]},
  extensions:{},diagnostics:[]
};
const normalized=normalizeSceneTransfer(source);
const exported=exportBedrockGeometry(normalized,{identifier:'fixture'});
const packed=JSON.parse(exported.json);
assert.equal(packed.format_version,'1.21.0','per-face UV rotation must select a supporting geometry version');
const geometry=packed['minecraft:geometry'][0];
assert.equal(geometry.description.texture_width,128);
assert.equal(geometry.description.texture_height,64);
assert.equal(geometry.description.visible_bounds_width,2,'visible bounds must not be derived from texture dimensions');
assert.equal(geometry.bones.length,2);
const root=geometry.bones.find(b=>b.name==='root');
const arm=geometry.bones.find(b=>b.name==='arm');
assert.deepEqual(root.pivot,[-16,32,0],'bone pivot must mirror X only');
assert.ok(root.rotation.every((v,i)=>Math.abs(v-[-10,-20,30][i])<1e-9),'bone rotation must mirror X and Y only');
assert.equal(root.binding,'head');
assert.deepEqual(root.locators.hand,[1,2,3]);
assert.deepEqual(root.locators.muzzle,{offset:[4,5,6],rotation:[10,20,30]});
assert.equal(arm.parent,'root');
const rotated=arm.cubes[0];
assert.deepEqual(rotated.origin,[-56,60,10],'cube origin must be [-to.x, from.y, from.z]');
assert.deepEqual(rotated.size,[16,16,16]);
assert.deepEqual(rotated.pivot,[-48,64,16]);
assert.ok(rotated.rotation.every((v,i)=>Math.abs(v-[-10,-20,30][i])<1e-9),'cube rotation must mirror X and Y only');
assert.equal(rotated.inflate,0.25);
assert.deepEqual(rotated.uv.north.uv,[0,0]);
assert.deepEqual(rotated.uv.north.uv_size,[16,16]);
assert.deepEqual(rotated.uv.up.uv,[10,12],'up/down UV origin must be flipped');
assert.deepEqual(rotated.uv.up.uv_size,[-8,-8],'up/down UV size must be negative after conversion');
assert.equal(rotated.uv.up.uv_rotation,90);
assert.equal(rotated.uv.up.material_instance,'glass');
const boxCube=root.cubes[0];
assert.deepEqual(boxCube.uv,[8,12],'box UV must remain a two-number offset');
assert.equal(boxCube.mirror,false,'cube mirror must override a mirrored parent bone when different');

const reopened=normalizeSceneTransfer(importBedrockGeometry(packed));
assert.equal(reopened.scene.nodes.filter(n=>n.type==='bone').length,2);
assert.equal(reopened.scene.nodes.filter(n=>n.sourceData?.role==='bedrock-geometry-root').length,1);
assert.equal(reopened.scene.textures.length,0,'geometry JSON must not pretend to contain texture bitmap data');
assert.equal(reopened.extensions.bedrockGeometryDescription.texture_width,128);
const reopenedRoot=reopened.scene.nodes.find(n=>n.name==='root');
const reopenedArm=reopened.scene.nodes.find(n=>n.name==='arm');
const reopenedCube=reopened.scene.nodes.find(n=>n.type==='cube'&&n.parentId===reopenedArm.id);
assert.deepEqual(reopenedRoot.sourceData.origin,[16,32,0]);
assert.ok(reopenedRoot.sourceData.rotation.every((v,i)=>Math.abs(v-[10,20,30][i])<1e-9));
assert.equal(reopenedRoot.sourceData.bedrock.binding,'head');
assert.ok(reopenedRoot.sourceData.locators.hand);
assert.deepEqual(reopenedCube.geometry.from,[40,60,10]);
assert.deepEqual(reopenedCube.geometry.to,[56,76,26]);
assert.deepEqual(reopenedCube.sourceData.origin,[48,64,16]);
assert.deepEqual(reopenedCube.geometry.faces.up.uv,[2,4,10,12]);
assert.equal(reopenedCube.geometry.faces.up.rotation,90);
const reExport=JSON.parse(exportBedrockGeometry(reopened,{identifier:'fixture'}).json);
const reRoot=reExport['minecraft:geometry'][0].bones.find(b=>b.name==='root');
const reArm=reExport['minecraft:geometry'][0].bones.find(b=>b.name==='arm');
assert.equal(reExport['minecraft:geometry'][0].bones.length,2,'synthetic import root must not leak into exported bones');
assert.deepEqual(reRoot.pivot,[-16,32,0]);
assert.deepEqual(reArm.cubes[0].origin,[-56,60,10]);
assert.deepEqual(reArm.cubes[0].uv.up.uv,[10,12]);
assert.deepEqual(reArm.cubes[0].uv.up.uv_size,[-8,-8]);
assert.deepEqual(reRoot.cubes[0].uv,[8,12]);

const noRotation={...normalized,scene:{...normalized.scene,nodes:normalized.scene.nodes.filter(n=>n.id!=='rotated-cube')}};
assert.equal(JSON.parse(exportBedrockGeometry(noRotation).json).format_version,'1.16.0','bone binding requires 1.16.0');
assert.throws(()=>exportBedrockGeometry(normalized,{formatVersion:'1.12.0'}),/mínimo necessário: 1.21.0/);

const loose={
  ...normalized,
  scene:{...normalized.scene,nodes:[{id:'loose',name:'loose',type:'cube',parentId:null,pivot:[0,0,0],transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},geometry:{from:[0,0,0],to:[1,1,1],faces:{}}}]}
};
const looseOut=JSON.parse(exportBedrockGeometry(loose).json)['minecraft:geometry'][0];
assert.equal(looseOut.bones.length,1);
assert.equal(looseOut.bones[0].name,'bb_main');
assert.equal(looseOut.bones[0].cubes.length,1);

assert.throws(()=>exportBedrockGeometry({...normalized,scene:{...normalized.scene,nodes:[...normalized.scene.nodes,{id:'mesh',name:'mesh',type:'mesh',parentId:'root',transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},pivot:[0,0,0],geometry:{kind:'blockbench_mesh'}}]}}),/Malhas livres/);

// Regression: edits to current Nyra fields must override the cloned Blockbench
// source snapshot. Otherwise old rotation, pivot and metadata can silently
// reappear in the generated .geo.json after a user resets/edits a property.
const editedSource = JSON.parse(JSON.stringify(normalized));
const editedRoot = editedSource.scene.nodes.find(n=>n.id==='root');
const editedArm = editedSource.scene.nodes.find(n=>n.id==='arm');
const editedCube = editedSource.scene.nodes.find(n=>n.id==='rotated-cube');
editedRoot.transform.rotation = [0,0,0];
editedRoot.transform.rotationUnit = 'degrees';
editedRoot.transform.position = [2,3,4];
editedRoot.sourceData.rotation = [22,33,44];
editedRoot.sourceData.bedrockOriginal = {rotation:[12,34,56],binding:'stale_binding'};
delete editedRoot.sourceData.bedrock.binding;
editedCube.transform.rotation = [0,0,0];
editedCube.pivot = [5,6,7];
editedCube.sourceData.rotation = [18,28,38];
editedCube.sourceData.bedrock = {rotation:[15,25,35],pivot:[9,9,9]};
editedCube.geometry.faces.up.material_name = 'updated_material';
const editedOut = JSON.parse(exportBedrockGeometry(normalizeSceneTransfer(editedSource)).json);
const editedRootOut = editedOut['minecraft:geometry'][0].bones.find(b=>b.name==='root');
const editedCubeOut = editedOut['minecraft:geometry'][0].bones.find(b=>b.name==='arm').cubes[0];
assert.equal(editedRootOut.rotation,undefined,'zeroed live bone rotation must override stale source rotation');
assert.deepEqual(editedRootOut.pivot,[-32,48,64],'edited local bone position must be exported as a world pivot');
assert.equal(editedRootOut.binding,undefined,'removed binding must not survive from raw source');
assert.equal(editedCubeOut.rotation,undefined,'zeroed live cube rotation must override stale source rotation');
assert.deepEqual(editedCubeOut.pivot,[-80,96,112],'edited cube pivot must override the source pivot');
assert.equal(editedCubeOut.uv.up.material_instance,'updated_material','edited material_instance must be exported');
assert.throws(()=>exportBedrockGeometry(normalizeSceneTransfer(normalized),{textureWidth:256}),/diverge da resolução/);
assert.throws(()=>importBedrockGeometry({format_version:'1.12.0','minecraft:geometry':[]}),/Geometry JSON/);
assert.throws(()=>importBedrockGeometry({format_version:'bad','minecraft:geometry':[{}]}),/format_version inválido/);
assert.throws(()=>importBedrockGeometry({format_version:'1.12.0','minecraft:geometry':[{bones:[{name:'a',parent:'missing'}]}]}),/Pai Bedrock inexistente/);

console.log('PASS: Blockbench <-> Bedrock coordinate conversion, asymmetric dimensions, pivots, rotations and parent hierarchy.');
console.log('PASS: box UV, per-face UV, up/down UV inversion, uv_rotation, material_instance, mirror, inflate and locators.');
console.log('PASS: import/export round-trip preserves bone metadata and texture dimensions without duplicating the synthetic root.');
console.log('PASS: required geometry format version is raised for binding and per-face UV rotation; invalid/unsupported inputs fail explicitly.');


const legacy18={
 format_version:'1.8.0',
 'minecraft:geometry':[
  {description:{identifier:'geometry.legacy_a',texture_width:64,texture_height:32},bones:[
   {name:'root',pivot:[0,0,0],cubes:[]},
   {name:'joint_without_cube',parent:'root',pivot:[-16,16,0],cubes:[]}
  ]},
  {description:{identifier:'geometry.legacy_b',texture_width:16,texture_height:16},bones:[
   {name:'body',pivot:[0,0,0],locators:{
    vector:[1,2,3],
    structured:{offset:[4,5,6],rotation:[0,90,0],ignore_inherited_scale:true}
   },cubes:[]}
  ]}
 ]
};
const legacyImported=importBedrockGeometry(legacy18);
assert.equal(legacyImported.project.source.formatVersion,'1.8.0');
assert.equal(legacyImported.extensions.bedrockGeometryCount,2);
assert.equal(legacyImported.extensions.bedrockGeometryIndex,0);
assert.ok(legacyImported.scene.nodes.some(n=>n.name==='joint_without_cube'));
assert.equal(legacyImported.extensions.bedrockGeometryOriginal['minecraft:geometry'].length,2);
const selected=importBedrockGeometry(legacy18,1);
assert.equal(selected.project.name,'geometry.legacy_b');
assert.equal(selected.extensions.bedrockGeometryIndex,1);
const structuredLocator=selected.scene.nodes.find(n=>n.type==='locator'&&n.name==='structured');
assert.ok(structuredLocator);
assert.deepEqual(structuredLocator.sourceData.bedrockLocator,{offset:[4,5,6],rotation:[0,90,0],ignore_inherited_scale:true});
assert.throws(()=>importBedrockGeometry(legacy18,2),/Índice de geometria fora/);

const unknownLocator={
 format_version:'1.8.0',
 'minecraft:geometry':[{description:{identifier:'geometry.locator_unknown'},bones:[
  {name:'root',locators:{custom:{rotation:[0,45,0],ignore_inherited_scale:true}},cubes:[]}
 ]}]
};
const unknownLocatorDoc=importBedrockGeometry(unknownLocator);
assert.ok(unknownLocatorDoc.scene.nodes.some(n=>n.type==='locator'&&n.name==='custom'));
assert.deepEqual(unknownLocatorDoc.scene.nodes.find(n=>n.type==='locator').sourceData.bedrockLocator,{rotation:[0,45,0],ignore_inherited_scale:true});

const structuredGeometry={
 format_version:'1.12.0',
 'minecraft:geometry':[{
  description:{identifier:'geometry.structured_test',texture_width:64,texture_height:64},
  bones:[
   {name:'root',pivot:[0,0,0],cubes:[],locators:{
    structured:{offset:[2,3,4],rotation:[5,15,25],ignore_inherited_scale:true},
    rotationOnly:{rotation:[0,45,0],ignore_inherited_scale:true}
   }},
   {name:'joint',parent:'root',pivot:[-8,16,0],cubes:[]}
  ]
 }]
};
const structuredDoc=importBedrockGeometry(structuredGeometry);
const structuredExport=JSON.parse(exportBedrockGeometry(normalizeSceneTransfer(structuredDoc),{identifier:'structured_test'}).json);
const structuredRoot=structuredExport['minecraft:geometry'][0].bones.find(b=>b.name==='root');
assert.deepEqual(structuredRoot.locators.structured,{offset:[2,3,4],rotation:[5,15,25],ignore_inherited_scale:true});
assert.deepEqual(structuredRoot.locators.rotationOnly,{rotation:[0,45,0],ignore_inherited_scale:true});
assert.equal(structuredExport['minecraft:geometry'][0].bones.length,2,'bones without cubes must survive a complete re-export');

const omittedFaces={
 format_version:'1.12.0',
 'minecraft:geometry':[{
  description:{identifier:'geometry.omitted_faces',texture_width:64,texture_height:64},
  bones:[{name:'root',pivot:[0,0,0],cubes:[{
   origin:[-16,0,0],size:[16,16,16],
   uv:{north:{uv:[0,0],uv_size:[8,8]},up:{uv:[8,8],uv_size:[-8,-8]}}
  }]}]
 }]
};
const omittedDoc=normalizeSceneTransfer(importBedrockGeometry(omittedFaces));
const omittedOut=JSON.parse(exportBedrockGeometry(omittedDoc,{identifier:'omitted_faces'}).json);
const omittedCube=omittedOut['minecraft:geometry'][0].bones[0].cubes[0];
assert.deepEqual(Object.keys(omittedCube.uv).sort(),['north','up'],'absent faces must not be invented on export');

const unsupportedRaw={
 format_version:'1.12.0',
 'minecraft:geometry':[{
  description:{identifier:'geometry.future_data',texture_width:64,texture_height:64,custom_description:{keep:true}},
  bones:[{name:'root',pivot:[0,0,0],custom_bone_flag:{keep:'yes'},cubes:[]}]
 }]
};
const unsupportedDoc=importBedrockGeometry(unsupportedRaw);
assert.deepEqual(unsupportedDoc.extensions.bedrockGeometryOriginal,unsupportedRaw,'the source Bedrock document must remain available in full');
assert.deepEqual(unsupportedDoc.extensions.bedrockGeometryDescription.custom_description,{keep:true});

console.log('PASS: structured locators, bones without cubes, omitted UV faces and unknown source metadata are retained.');
