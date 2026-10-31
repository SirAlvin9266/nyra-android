#!/usr/bin/env node
'use strict';

// Exercise the actual Blockbench import functions extracted from the generated editor module.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const hostLine = html.split(/\r?\n/).find(line => line.includes('const modelTools = '));
if (!hostLine) throw new Error('Android modelTools adapter was not found.');
const literal = hostLine.slice(hostLine.indexOf('const modelTools = ') + 'const modelTools = '.length, -1);
const modelTools = JSON.parse(literal);
const moduleMarker = '/* NyraModelIO:';
const markerIndex = modelTools.indexOf(moduleMarker);
const moduleStart = modelTools.lastIndexOf('<script type="module">', markerIndex);
const moduleEnd = modelTools.indexOf('<\\/script>', markerIndex);
if (markerIndex < 0 || moduleStart < 0 || moduleEnd < 0) throw new Error('Could not extract the generated model module.');
const moduleSource = modelTools.slice(moduleStart, moduleEnd);
const helperStart = moduleSource.indexOf('function bbCoordinate(');
const helperEnd = moduleSource.indexOf('async function parseModel(', helperStart);
if (helperStart < 0 || helperEnd < 0) throw new Error('Blockbench importer functions are incomplete.');
const helperSource = moduleSource.slice(helperStart, helperEnd) + '\nthis.parseBBModel = parseBBModel;';

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
const context=vm.createContext({THREE,Map,Set,WeakMap,Number,String,Array,Object,Math,Promise,Error});
vm.runInContext(helperSource,context,{filename:'nyra-bbmodel-import.js'});
const parseBBModel=context.parseBBModel;

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

  let invalidRejected=false;
  try{await parseBBModel(fileFor({meta:{},elements:[{uuid:'empty',type:'point'}],outliner:['empty']}));}
  catch(_){invalidRejected=true;}
  assert(invalidRejected,'Unsupported/empty Blockbench model must be rejected before replacing the current scene.');

  console.log('PASS: Blockbench cube/UV import, free-mesh triangulation/material groups, Hytale cube geometry, and animation clip conversion.');
})().catch(error=>{console.error('FAIL: '+error.stack);process.exit(1);});
