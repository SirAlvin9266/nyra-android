#!/usr/bin/env node
'use strict';

// Exercise the actual Blockbench import functions extracted from the generated editor module.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractModelTools(source) {
  const assignment = 'const modelTools = ';
  const start = source.indexOf(assignment);
  if (start < 0) throw new Error('Model I/O template is missing from the Android host page.');
  const literalStart = start + assignment.length;
  const boundary = source.indexOf('const panelEnd = ', literalStart);
  if (boundary < 0) throw new Error('Host template boundary after modelTools was not found.');
  // The host uses automatic semicolon insertion: the string closes immediately
  // before the newline introducing panelEnd, not before a semicolon.
  const closingQuote = source.lastIndexOf('"', boundary);
  if (closingQuote < literalStart) throw new Error('Closing quote for modelTools was not found.');
  return JSON.parse(source.slice(literalStart, closingQuote + 1));
}
const modelTools=extractModelTools(html);

const moduleMarker = '/* NyraModelIO:';
const markerIndex = modelTools.indexOf(moduleMarker);
const moduleStart = modelTools.lastIndexOf('<script type="module">', markerIndex);
const escapedModuleEnd = modelTools.indexOf('<\\/script>', markerIndex);
const literalModuleEnd = modelTools.indexOf('</script>', markerIndex);
const moduleEnd = escapedModuleEnd >= 0 ? escapedModuleEnd : literalModuleEnd;
if (markerIndex < 0 || moduleStart < 0 || moduleEnd < 0) throw new Error('Could not extract the generated model module.');
const moduleSource = modelTools.slice(moduleStart, moduleEnd);
const helperStart = moduleSource.indexOf('function bbCoordinate(');
const helperEnd = moduleSource.indexOf('async function parseModel(', helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error('Blockbench importer functions are incomplete.');
const nyraParserStart = moduleSource.indexOf('async function parseNyraCharacterProject(', helperStart);
const helperSource = moduleSource.slice(helperStart, helperEnd) + '\nthis.parseBBModel = parseBBModel;\nthis.parseNyraCharacterProject = parseNyraCharacterProject;';

let nextUuid = 0;
class Vec3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
}
class Euler extends Vec3 {
  constructor(x=0,y=0,z=0,order='XYZ'){super(x,y,z);this.order=order;}
}
class Group {
  constructor(){
    this.uuid='test-node-'+(++nextUuid);this.name='';this.children=[];this.parent=null;
    this.position=new Vec3();this.rotation=new Euler();this.scale=new Vec3(1,1,1);
    this.userData={};this.visible=true;this.isGroup=true;this.isMesh=false;
  }
  add(child){if(child.parent)child.parent.remove(child);this.children.push(child);child.parent=this;}
  remove(child){const i=this.children.indexOf(child);if(i>=0)this.children.splice(i,1);child.parent=null;}
  traverse(callback){callback(this);for(const child of this.children)child.traverse(callback);}
  updateMatrixWorld(){}
}
class Attribute {
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;this.needsUpdate=false;}
  setXY(index,x,y){this.array[index*2]=x;this.array[index*2+1]=y;}
}
class Geometry {
  constructor(){this.attributes={};this.groups=[];this.index={array:new Uint16Array(36)};}
  setAttribute(name,value){this.attributes[name]=value;return this;}
  addGroup(start,count,materialIndex){this.groups.push({start,count,materialIndex});}
  clearGroups(){this.groups=[];}
  computeVertexNormals(){}
}
class BoxGeometry extends Geometry {
  constructor(){super();this.attributes.uv=new Attribute(new Float32Array(48),2);}
}
class Float32BufferAttribute extends Attribute {
  constructor(array,itemSize){super(new Float32Array(array),itemSize);}
}
class Material { constructor(options={}){Object.assign(this,options);this.userData={};} }
class TextureLoader { load(_source,onLoad){onLoad({colorSpace:'',flipY:false,magFilter:null,minFilter:null,generateMipmaps:true});return {}; } }
class Mesh extends Group {
  constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;this.isGroup=false;}
}
class Box3 {
  setFromObject(root){this.empty=true;root.traverse(node=>{if(node.isMesh&&node.geometry)this.empty=false;});return this;}
  isEmpty(){return this.empty;}
}
class Quaternion {
  constructor(){this.x=0;this.y=0;this.z=0;this.w=1;}
  setFromEuler(e){this.x=e.x;this.y=e.y;this.z=e.z;this.w=1;return this;}
}
class Track {
  constructor(name,times,values){this.name=name;this.times=times;this.values=values;this.interpolation=null;}
  setInterpolation(value){this.interpolation=value;return this;}
}
class AnimationClip {
  constructor(name,duration,tracks){this.name=name;this.duration=duration;this.tracks=tracks;}
}
const THREE = {
  Group,BoxGeometry,BufferGeometry:Geometry,Float32BufferAttribute,Mesh,MeshStandardMaterial:Material,
  TextureLoader,Box3,Euler,Quaternion,VectorKeyframeTrack:Track,QuaternionKeyframeTrack:Track,AnimationClip,
  DoubleSide:2,SRGBColorSpace:'srgb',NearestFilter:'nearest',InterpolateDiscrete:'discrete',
  MathUtils:{degToRad:value=>value*Math.PI/180}
};
const context=vm.createContext({THREE,Map,Set,WeakMap,Number,String,Array,Object,Math,Promise,Error,resourceUrls:[],URL:{createObjectURL:file=>'blob:'+file.name}});
vm.runInContext(helperSource,context,{filename:'nyra-bbmodel-import.js'});
const parseBBModel=context.parseBBModel;
const parseNyraCharacterProject=context.parseNyraCharacterProject;

function assert(condition,message){if(!condition)throw new Error(message);}
function fileFor(data,name='fixture.bbmodel'){return {name,text:async()=>JSON.stringify(data)};}

(async()=>{
  const texture={uuid:'texture-uuid',id:'0',source:'data:image/png;base64,AA==',width:16,height:16};
  const cubeData={
    name:'Bedrock cube test',meta:{format_version:'5.0',model_format:'bedrock'},
    resolution:{width:16,height:16},textures:[texture],
    groups:[{uuid:'group-1',name:'Wing',origin:[0,0,0],rotation:[0,0,0]}],
    elements:[{uuid:'cube-1',name:'Wing cube',type:'cube',from:[0,0,0],to:[16,16,16],origin:[0,0,0],
      faces:Object.fromEntries(['east','west','up','down','south','north'].map(name=>[name,{uv:[0,0,16,16],texture:0}]))}],
    outliner:[{uuid:'group-1',children:['cube-1']}],
    animations:[{name:'wing-flap',length:1,animators:{'group-1':{keyframes:[
      {channel:'rotation',time:0,data_points:[{x:'0',y:'0',z:'0'}],interpolation:'linear'},
      {channel:'rotation',time:1,data_points:[{x:'0',y:'0',z:'90'}],interpolation:'linear'}
    ]}}}]
  };
  const cubeResult=await parseBBModel(fileFor(cubeData));
  let cubeMeshes=0;cubeResult.object.traverse(node=>{if(node.isMesh)cubeMeshes++;});
  assert(cubeMeshes===1,'Cube fixture should create exactly one mesh.');
  assert(cubeResult.object.userData.bbImportedCubes===1,'Cube fixture count is incorrect.');
  assert(cubeResult.animations.length===1,'Blockbench animation was not converted to a Three.js clip.');
  assert(cubeResult.animations[0].tracks.length===1,'Blockbench rotation channel was not converted.');

  const meshData={
    name:'Free mesh test',meta:{format_version:'5.0',model_format:'free'},
    resolution:{width:64,height:16},textures:[texture],
    elements:[{uuid:'mesh-1',name:'Shield mesh',type:'mesh',origin:[0,0,0],rotation:[0,0,0],
      vertices:{a:[0,0,0],b:[16,0,0],c:[16,16,0],d:[0,16,0]},
      faces:{
        first:{vertices:['a','b','c'],uv:{a:[0,0],b:[16,0],c:[16,16]},texture:'texture-uuid'},
        second:{vertices:['a','c','d'],uv:{a:[0,0],c:[16,16],d:[0,16]},texture:'texture-uuid'}
      }}],
    outliner:['mesh-1']
  };
  const meshResult=await parseBBModel(fileFor(meshData));
  let importedMesh=null;meshResult.object.traverse(node=>{if(node.isMesh)importedMesh=node;});
  assert(meshResult.object.userData.bbImportedMeshes===1,'Free mesh fixture should create one mesh element.');
  assert(importedMesh&&importedMesh.geometry.attributes.position.count===6,'Free mesh faces were not triangulated into six vertices.');
  assert(importedMesh.geometry.groups.length===2,'Free mesh material groups were not preserved.');
  const untexturedData={...meshData,elements:[{...meshData.elements[0],faces:{plain:{...meshData.elements[0].faces.first,texture:null}}}]};
  const untexturedResult=await parseBBModel(fileFor(untexturedData));
  let untexturedMesh=null;untexturedResult.object.traverse(node=>{if(node.isMesh)untexturedMesh=node;});
  assert(untexturedMesh&&untexturedMesh.geometry.groups[0].materialIndex===0,'Explicitly untextured faces must use the fallback material even when one texture exists.');

  // Run the importer against the actual user-supplied Spartan shield regression model.
  const shieldPath=path.join(__dirname,'fixtures','spartan_shild_editavel.bbmodel');
  assert(fs.existsSync(shieldPath),'Real Spartan shield regression fixture is missing.');
  const shieldData=JSON.parse(fs.readFileSync(shieldPath,'utf8'));
  assert(shieldData.meta?.model_format==='free','Spartan shield fixture must exercise Blockbench free-mesh format.');
  assert(shieldData.elements.length===4,'Spartan shield fixture should contain four independent mesh elements.');
  const shieldResult=await parseBBModel({name:'spartan_shild_editavel.bbmodel',text:async()=>JSON.stringify(shieldData)});
  let shieldMeshCount=0,shieldUvCount=0,shieldMaterialCount=0;
  shieldResult.object.traverse(node=>{
    if(node.isMesh){
      shieldMeshCount++;
      if(node.geometry?.attributes?.uv)shieldUvCount++;
      const materials=Array.isArray(node.material)?node.material:[node.material];
      if(materials.some(material=>material?.map))shieldMaterialCount++;
    }
  });
  assert(shieldMeshCount===4,'Real Spartan shield should import as four editable mesh objects.');
  assert(shieldUvCount===4,'Real Spartan shield must retain UV attributes for all four meshes.');
  assert(shieldMaterialCount===4,'Real Spartan shield embedded atlas must attach to all four meshes.');
  assert(shieldResult.object.userData.bbImportedVertices===1736,'Real Spartan shield vertex count does not match the source.');
  assert(shieldResult.object.userData.bbImportedFaces===898,'Real Spartan shield triangle count does not match the source.');
  assert(shieldResult.object.userData.bbTextureCount===1,'Real Spartan shield embedded texture was not detected.');
  assert(shieldResult.object.userData.bbModelWarnings.length===0,'Real Spartan shield must not emit missing-texture warnings.');

  const hytaleData={
    name:'Hytale prop test',meta:{format_version:'5.0',model_format:'hytale_prop'},
    resolution:{width:16,height:16},textures:[texture],
    elements:[{uuid:'hytale-cube',type:'cube',name:'Chair part',from:[0,0,0],to:[16,8,16],origin:[8,4,8],rotation:[0,0,0],
      faces:{north:{uv:[0,0,16,8],texture:0}}}],
    outliner:['hytale-cube']
  };
  const hytaleResult=await parseBBModel(fileFor(hytaleData));
  assert(hytaleResult.object.userData.bbModelFormat==='hytale_prop','Hytale model format metadata was lost.');
  assert(hytaleResult.object.userData.bbImportedCubes===1,'Hytale cube element was not imported.');

  // External texture fixture mirrors real-world .bbmodel files that reference an image by path.
  const externalTextureFile={name:'shield.png',type:'image/png'};
  const externalTextureModel={...meshData,textures:[{uuid:'texture-uuid',id:'0',name:'shield.png',path:'textures/shield.png'}]};
  const externalModelFile=fileFor(externalTextureModel,'shield.bbmodel');
  const externalResult=await parseBBModel(externalModelFile,[externalModelFile,externalTextureFile]);
  let texturedMesh=null;
  externalResult.object.traverse(node=>{if(node.isMesh)texturedMesh=node;});
  assert(texturedMesh&&Array.isArray(texturedMesh.material),'External texture mesh/material was not created.');
  assert(texturedMesh.material.some(material=>material.map),'Selected external image was not attached to the Blockbench material.');
  assert(externalResult.object.userData.bbModelWarnings.length===0,'Resolved external texture should not emit a missing-texture warning.');

  const missingTextureModel={...meshData};
  delete missingTextureModel.textures;
  const missingResult=await parseBBModel(fileFor(missingTextureModel,'missing-texture.bbmodel'),[]);
  assert(missingResult.object.userData.bbModelWarnings.some(warning=>warning.includes('não estão incorporadas')),'Missing external texture should be reported clearly.');

  let invalidRejected=false;
  try{await parseBBModel(fileFor({meta:{},elements:[{uuid:'empty',type:'point'}],outliner:['empty']}));}
  catch(_){invalidRejected=true;}
  assert(invalidRejected,'Unsupported/empty Blockbench model must be rejected before replacing the current scene.');



  // Preservation contract: metadata and raw source document must remain attached to the imported root.
  const preservationData={
    ...cubeData,
    name:'Preservation contract fixture',
    meta:{...cubeData.meta,model_format:'bedrock',project_uuid:'project-uuid',box_uv:true},
    model_identifier:'example:preserved_model',
    visible_box:[1,2,3],
    resolution:{width:64,height:32},
    groups:[
      {uuid:'group-1',name:'Wing',origin:[1,2,3],rotation:[0,15,0],visibility:true,export:true,locked:true},
      {uuid:'empty-group',name:'Empty group',origin:[4,5,6],rotation:[0,0,0],visibility:true}
    ],
    outliner:[
      {uuid:'group-1',children:['cube-1']},
      {uuid:'empty-group',children:[]}
    ],
    elements:[
      {...cubeData.elements[0],inflate:0.25,shade:false,autouv:0,locked:true,export:false,visibility:false}
    ],
    animations:[{
      name:'multi-point animation',length:2,loop:'loop',override:true,animators:{
        'group-1':{name:'Wing animator',type:'bone',keyframes:[
          {channel:'position',time:0,data_points:[{x:'0',y:'0',z:'0'},{x:'1',y:'2',z:'3'}],interpolation:'catmullrom',bezier_linked:true},
          {channel:'position',time:1,data_points:[{x:'2',y:'0',z:'0'}],interpolation:'bezier',bezier_left_time:0.5,bezier_right_time:0.5}
        ]}
      }
    }],
    unknownExtension:{mustSurviveRoundTrip:true}
  };
  const preservationResult=await parseBBModel(fileFor(preservationData,'preservation.bbmodel'));
  const preserved=preservationResult.sourceData||preservationResult.object.userData.bbSourceDocument;
  assert(preserved,'Original Blockbench document was not retained in the import result.');
  assert(preserved.unknownExtension?.mustSurviveRoundTrip===true,'Unknown project metadata was discarded.');
  assert(preserved.groups[1].uuid==='empty-group','Empty group data was discarded.');
  assert(preserved.elements[0].inflate===0.25,'Element-level metadata was discarded.');
  assert(preserved.animations[0].animators['group-1'].keyframes[0].data_points.length===2,'Multiple keyframe data points were discarded from the preserved source.');
  assert(preservationResult.object.userData.bbSourceDocument?.meta?.project_uuid==='project-uuid','Original document metadata is not attached to the scene root.');
  const preservedGroup=preservationResult.object.children.find(node=>node.userData?.bbGroupUuid==='empty-group');
  assert(preservedGroup,'Empty outliner group was not retained as a scene node.');


  // Multi-file texture resolution must be deterministic and must not bind an ambiguous basename.
  const ambiguousA={name:'armor/albedo.png',type:'image/png'};
  const ambiguousB={name:'skin/albedo.png',type:'image/png'};
  const ambiguousModel={...meshData,textures:[{uuid:'ambiguous-texture',id:'0',name:'albedo.png',path:'albedo.png'}]};
  const ambiguousResult=await parseBBModel(fileFor(ambiguousModel,'ambiguous.bbmodel'),[fileFor(ambiguousModel,'ambiguous.bbmodel'),ambiguousA,ambiguousB]);
  assert(ambiguousResult.object.userData.bbModelWarnings.length>0,'Ambiguous external texture paths must be reported instead of selecting an arbitrary image.');

  // Reject duplicate element UUIDs and invalid free-mesh vertex references without partial scene replacement.
  const duplicateUuid={...cubeData,elements:[cubeData.elements[0],{...cubeData.elements[0],name:'Duplicate UUID'}]};
  let duplicateRejected=false;try{await parseBBModel(fileFor(duplicateUuid));}catch(_){duplicateRejected=true;}
  assert(duplicateRejected,'Duplicate element UUIDs must not be silently collapsed.');
  const badVertex={...meshData,elements:[{...meshData.elements[0],faces:{bad:{vertices:['a','missing','c'],uv:{a:[0,0],missing:[1,1],c:[1,0]},texture:'texture-uuid'}}}]};
  let badVertexRejected=false;try{await parseBBModel(fileFor(badVertex));}catch(_){badVertexRejected=true;}
  assert(badVertexRejected,'Free-mesh faces with missing vertex references must be rejected.');

  // Unsupported non-geometric elements remain visible in the preservation report.
  const withUnknown={...cubeData,elements:[...cubeData.elements,{uuid:'locator-1',type:'locator',name:'Hand socket',position:[0,0,0]}]};
  const unknownResult=await parseBBModel(fileFor(withUnknown));
  assert(unknownResult.object.userData.bbSourceDocument.elements.some(element=>element.type==='locator'),'Unsupported source element was not preserved in the raw source document.');
  assert(unknownResult.object.userData.bbUnsupportedElementCount>=1,'Unsupported source element count must be exposed to the compatibility report.');



  // Real Nyra Character+Voxel Project v4 fixture (parts map, colors and headScaleY).
  const nyraCharacter={
    format:'Nyra Character+Voxel Project v4',name:'Meu Personagem',
    colors:{torso:'#263548',head:'#35e5ff',armL:'#d5e2ed',armR:'#d5e2ed',legL:'#56677d',legR:'#56677d'},
    parts:{
      torso:{position:[0,2.2,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      head:{position:[0,.88,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      armL:{position:[-.72,.4,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      armR:{position:[.72,.4,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      legL:{position:[-.28,1.55,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      legR:{position:[.28,1.55,0],scale:[1,1,1],rotation:[0,0,0],visible:true}
    },headScaleY:1,voxels:[],objects:[]
  };
  const nyraResult=await parseNyraCharacterProject(nyraCharacter,'nyra_personagem.json');
  const nyraParts=[];
  nyraResult.object.traverse(node=>{if(node.userData?.nyraJsonPartId)nyraParts.push(node);});
  assert(nyraParts.length===6,'Nyra Character+Voxel v4 should reconstruct all six named body parts.');
  assert(nyraParts.find(node=>node.userData.nyraJsonPartId==='head').material.color==='#35e5ff','Nyra head palette color was not preserved.');
  assert(nyraResult.object.userData.nyraJsonSource.format==='Nyra Character+Voxel Project v4','Nyra source project was not preserved.');
  assert(nyraResult.object.userData.nyraJsonFormat.includes('character'),'Nyra project format was not retained.');


  const nyraCharacter={
    format:'Nyra Character+Voxel Project v4',
    name:'Meu Personagem',
    colors:{torso:'#263548',head:'#35e5ff',armL:'#d5e2ed',armR:'#d5e2ed',legL:'#56677d',legR:'#56677d'},
    parts:{
      torso:{position:[0,2.2,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      head:{position:[0,.88,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      armL:{position:[-.72,.4,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      armR:{position:[.72,.4,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      legL:{position:[-.28,1.55,0],scale:[1,1,1],rotation:[0,0,0],visible:true},
      legR:{position:[.28,1.55,0],scale:[1,1,1],rotation:[0,0,0],visible:true}
    },headScaleY:1,voxels:[],objects:[]
  };
  const nyraResult=await parseNyraCharacterProject(nyraCharacter,'nyra_personagem.json');
  const nyraParts=[];nyraResult.object.traverse(node=>{if(node.userData?.nyraJsonPartId)nyraParts.push(node);});
  assert(nyraParts.length===6,'Nyra v4 JSON must reconstruct six named parts.');
  assert(nyraParts.find(node=>node.userData.nyraJsonPartId==='head').material.color==='#35e5ff','Nyra head color palette was not retained.');
  assert(nyraResult.object.userData.nyraJsonSource.format==='Nyra Character+Voxel Project v4','Nyra JSON source was not preserved.');

  // The importer must reject duplicated source UUIDs rather than silently binding the first item.
  const duplicateSource={...cubeData,elements:[cubeData.elements[0],{...cubeData.elements[0],name:'duplicate'}]};
  let duplicateSourceRejected=false;
  try{await parseBBModel(fileFor(duplicateSource));}catch(error){duplicateSourceRejected=String(error.message).includes('UUIDs duplicados');}
  assert(duplicateSourceRejected,'Duplicate Blockbench UUIDs must be reported as an invalid source document.');

  // Outliner is a required source hierarchy and must not be guessed when absent.
  const noOutliner={...cubeData};delete noOutliner.outliner;
  let noOutlinerRejected=false;
  try{await parseBBModel(fileFor(noOutliner));}catch(error){noOutlinerRejected=String(error.message).includes('outliner');}
  assert(noOutlinerRejected,'Missing outliner must be rejected, not silently flattened.');

  // Source elements not represented by current Three geometry are counted for compatibility diagnostics.
  const unsupportedSource={...cubeData,elements:[...cubeData.elements,{uuid:'locator-unsupported',type:'locator',name:'Hand socket'}]};
  const unsupportedResult=await parseBBModel(fileFor(unsupportedSource));
  assert(unsupportedResult.object.userData.bbUnsupportedElementCount===1,'Unsupported Blockbench element count was not surfaced.');
  assert(unsupportedResult.object.userData.bbSourceDocument.elements.some(item=>item.uuid==='locator-unsupported'),'Unsupported source element must remain preserved in raw document snapshot.');

  console.log('PASS: Blockbench cube/UV import, free-mesh triangulation/material groups, Hytale geometry, animation clips, external texture matching, and missing-texture warnings.');
})().catch(error=>{console.error('FAIL: '+error.stack);process.exit(1);});
