'use strict';

const FORMAT_VERSION = '1.12.0';
const GEOMETRY_SCHEMA = 'minecraft:geometry';

function isObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function vec(value,label){if(!Array.isArray(value)||value.length!==3||!value.every(v=>Number.isFinite(Number(v))))throw new TypeError(label+' deve conter três números finitos.');return value.map(Number);}
function finite(value,label){const n=Number(value);if(!Number.isFinite(n))throw new TypeError(label+' deve ser finito.');return n;}
function makeGeometryId(value){
 const clean=String(value||'nyra_model').toLowerCase().normalize('NFKD').replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48)||'nyra_model';
 return clean.startsWith('geometry.')?clean:'geometry.nyra_'+clean;
}
function normalizeCube(node){
 const raw=node.geometry||{},source=node.sourceData||{};
 const from=vec(raw.from||source.from,'cube.from'),to=vec(raw.to||source.to,'cube.to');
 const origin=vec(source.origin||node.pivot||[0,0,0],'cube.origin');
 const size=from.map((v,i)=>Math.abs(to[i]-v));
 if(size.some(v=>v<=0))throw new RangeError('Cubo '+node.name+' tem dimensão zero ou negativa.');
 const cube={origin:from.map(v=>-v),size};
 const inflate=finite(raw.inflate??source.inflate??0,'cube.inflate');if(inflate)cube.inflate=inflate;
 const mirror=raw.mirror??source.mirror;if(mirror!==undefined)cube.mirror=!!mirror;
 const rotation=vec(source.rotation||[0,0,0],'cube.rotation');if(rotation.some(Boolean))cube.rotation=rotation;
 const pivot=vec(source.origin||origin,'cube.pivot');if(pivot.some(Boolean))cube.pivot=pivot.map(v=>-v);
 const faces={};const sourceFaces=raw.faces||source.faces||{};
 for(const faceName of ['north','south','east','west','up','down']){
  const face=sourceFaces[faceName];if(!face)continue;
  let uv=face.uv;
  if(Array.isArray(uv)&&uv.length===4){
   const [u1,v1,u2,v2]=uv.map(v=>finite(v,'face uv'));
   faces[faceName]={uv:[u1,v1],uv_size:[u2-u1,v2-v1]};
   if(face.rotation)faces[faceName].uv_rotation=Number(face.rotation);
  }else if(isObject(uv)&&Array.isArray(uv.uv)&&Array.isArray(uv.uv_size)){
   faces[faceName]={uv:vec2(uv.uv,'face.uv'),uv_size:vec2(uv.uv_size,'face.uv_size')};
  }
 }
 if(Object.keys(faces).length)cube.uv=faces;
 return cube;
}
function vec2(value,label){if(!Array.isArray(value)||value.length!==2||!value.every(v=>Number.isFinite(Number(v))))throw new TypeError(label+' deve conter dois números.');return value.map(Number);}
function exportBedrockGeometry(documentData,options={}){
 if(!isObject(documentData)||documentData.schema!=='nyra.scene-transfer'||documentData.schemaVersion!==1)throw new Error('Documento Nyra scene-transfer v1 obrigatório.');
 const nodes=documentData.scene?.nodes;if(!Array.isArray(nodes)||!nodes.length)throw new Error('O projeto não possui nós para exportar.');
 const byId=new Map(nodes.map(n=>[n.id,n]));const bones=nodes.filter(n=>n.type==='bone'||n.type==='group');
 const elements=nodes.filter(n=>n.type==='cube'||n.type==='mesh');
 if(elements.some(n=>n.type==='mesh'))throw new Error('Malhas livres não possuem conversão automática segura para cubos Bedrock. Converta-as para cubos antes de exportar.');
 const boneIdToName=new Map();const usedNames=new Set();
 for(const b of bones){let name=String(b.name||b.id).trim().replace(/[^A-Za-z0-9_.-]+/g,'_')||'bone';if(usedNames.has(name))throw new Error('Nome de bone duplicado: '+name);usedNames.add(name);boneIdToName.set(b.id,name);}
 if(!bones.length)throw new Error('O projeto precisa de pelo menos um grupo/bone para exportar Geometry Bedrock.');
 const children=new Map();for(const n of nodes){if(n.parentId){if(!byId.has(n.parentId))throw new Error('Pai inexistente em '+n.name);if(!children.has(n.parentId))children.set(n.parentId,[]);children.get(n.parentId).push(n);}}
 const ordered=[];const visit=(node,active=new Set())=>{if(active.has(node.id))throw new Error('Ciclo na hierarquia.');active.add(node.id);ordered.push(node);for(const child of children.get(node.id)||[])visit(child,active);active.delete(node.id);};for(const b of bones)if(!b.parentId||!boneIdToName.has(b.parentId))visit(b);
 const boneObjects=[];
 for(const bone of ordered.filter(n=>boneIdToName.has(n.id))){
  const item={name:boneIdToName.get(bone.id)};
  const parent=bone.parentId&&boneIdToName.has(bone.parentId)?boneIdToName.get(bone.parentId):null;if(parent)item.parent=parent;
  const pivot=vec(bone.sourceData?.origin||bone.pivot||[0,0,0],'bone.pivot').map(v=>-v);
  if(pivot.some(Boolean))item.pivot=pivot;
  const rotation=vec(bone.sourceData?.rotation||[0,0,0],'bone.rotation');if(rotation.some(Boolean))item.rotation=rotation;
  const cubes=[];
  for(const child of children.get(bone.id)||[])if(child.type==='cube')cubes.push(normalizeCube(child));
  if(cubes.length)item.cubes=cubes;
  const locators=(bone.sourceData?.locators||{});if(Object.keys(locators).length)item.locators=locators;
  boneObjects.push(item);
 }
 const unsupported=nodes.filter(n=>!['bone','group','cube','empty','locator'].includes(n.type));
 if(unsupported.length)throw new Error('Há nós não suportados para Geometry Bedrock: '+unsupported.map(n=>n.name).join(', '));
 const texture=documentData.scene.textures?.[0];
 const width=finite(options.textureWidth??texture?.width??documentData.extensions?.blockbenchRaw?.resolution?.width??64,'texture width');
 const height=finite(options.textureHeight??texture?.height??documentData.extensions?.blockbenchRaw?.resolution?.height??64,'texture height');
 const identifier=makeGeometryId(options.identifier||documentData.project?.name||'nyra_model');
 const raw={format_version:options.formatVersion||FORMAT_VERSION,[GEOMETRY_SCHEMA]:[{description:{identifier,texture_width:width,texture_height:height,visible_bounds_width:Math.max(1,width/16),visible_bounds_height:Math.max(1,height/16),visible_bounds_offset:[0,0,0]},bones:boneObjects}]};
 const json=JSON.stringify(raw,null,2);
 return {format:'bedrock_geometry',formatVersion:raw.format_version,identifier,json,document:raw,report:{boneCount:boneObjects.length,cubeCount:boneObjects.reduce((sum,b)=>sum+(b.cubes?.length||0),0),textures:documentData.scene.textures?.length||0,animationClips:documentData.animations?.clips?.length||0,notes:['Geometry JSON contém bones/cubos/UVs; animações continuam no projeto Nyra separado.','Confira coordenadas, pivôs e UVs contra o modelo original antes de usar no jogo.']}};
}
function importBedrockGeometry(input){
 const data=typeof input==='string'?JSON.parse(input):input;
 if(!isObject(data)||typeof data.format_version!=='string'||!Array.isArray(data[GEOMETRY_SCHEMA])||data[GEOMETRY_SCHEMA].length!==1)throw new Error('Arquivo não é um Minecraft Bedrock Geometry JSON reconhecível.');
 const geometry=data[GEOMETRY_SCHEMA][0],description=geometry.description||{},rawBones=geometry.bones;
 if(!Array.isArray(rawBones)||!rawBones.length)throw new Error('Geometry sem bones.');
 const ids=new Set(),nameToId=new Map(),nodes=[];
 const rootId='bedrock-geometry-root';
 nodes.push({id:rootId,sourceId:null,name:description.identifier||'Bedrock Geometry',type:'group',parentId:null,children:[],pivot:[0,0,0],transform:{position:[0,0,0],rotation:[0,0,0],rotationUnit:'degrees',rotationOrder:'XYZ',scale:[1,1,1]},visibility:true,geometry:null,sourceData:{role:'bedrock-geometry-root'}});
 for(const [i,bone] of rawBones.entries()){
  if(!isObject(bone)||typeof bone.name!=='string'||!bone.name.trim())throw new Error('Bone inválido no índice '+i+'.');
  if(nameToId.has(bone.name))throw new Error('Nome de bone duplicado: '+bone.name);
  const id='bedrock-bone:'+i+':'+bone.name;nameToId.set(bone.name,id);ids.add(id);
  const pivot=vec(bone.pivot||[0,0,0],'bone.pivot').map(v=>-v);
  const node={id,sourceId:null,name:bone.name,type:'bone',parentId:rootId,children:[],pivot,transform:{position:[0,0,0],rotation:vec(bone.rotation||[0,0,0],'bone.rotation'),rotationUnit:'degrees',rotationOrder:'XYZ',scale:[1,1,1]},visibility:true,geometry:null,sourceData:{origin:pivot.map(v=>-v),rotation:bone.rotation||[0,0,0],locators:bone.locators||{}}};
  nodes.push(node);
 }
 for(const bone of rawBones){const node=nodes.find(n=>n.name===bone.name);if(bone.parent){const parent=nameToId.get(bone.parent);if(!parent)throw new Error('Pai Bedrock inexistente: '+bone.parent);node.parentId=parent;} }
 for(const bone of rawBones){const node=nodes.find(n=>n.name===bone.name);for(const [i,cube] of (bone.cubes||[]).entries()){
  const origin=vec(cube.origin||[0,0,0],'cube.origin'),size=vec(cube.size,'cube.size');if(size.some(v=>v<=0))throw new Error('Cubo Bedrock inválido: '+bone.name);
  const from=origin.map(v=>-v),to=from.map((v,i)=>v+size[i]);
  const faces={};if(isObject(cube.uv)){for(const [faceName,face] of Object.entries(cube.uv)){if(isObject(face)&&Array.isArray(face.uv)&&Array.isArray(face.uv_size))faces[faceName]={uv:[...face.uv,...face.uv.map((v,i)=>v+face.uv_size[i])],rotation:face.uv_rotation||0};}}
  else if(Array.isArray(cube.uv))for(const faceName of ['north','south','east','west','up','down'])faces[faceName]={uv:[cube.uv[0],cube.uv[1],cube.uv[0]+size[0],cube.uv[1]+size[1]],rotation:0};
  const cubeId=node.id+':cube:'+i;nodes.push({id:cubeId,sourceId:null,name:bone.name+' cube '+(i+1),type:'cube',parentId:node.id,children:[],pivot:vec(cube.pivot||bone.pivot||[0,0,0],'cube.pivot').map(v=>-v),transform:{position:[0,0,0],rotation:vec(cube.rotation||[0,0,0],'cube.rotation'),rotationUnit:'degrees',rotationOrder:'XYZ',scale:[1,1,1]},visibility:true,geometry:{kind:'blockbench_cube',from,to,inflate:cube.inflate||0,mirror:!!cube.mirror,faces},sourceData:{origin:cube.pivot||bone.pivot||[0,0,0],rotation:cube.rotation||[0,0,0],mirror:cube.mirror||false,inflate:cube.inflate||0,uv:cube.uv}});
 }}
 const byId=new Map(nodes.map(n=>[n.id,n]));for(const n of nodes){if(n.parentId)byId.get(n.parentId).children.push(n.id);}
 const root={schema:'nyra.scene-transfer',schemaVersion:1,project:{id:'bedrock:'+description.identifier,name:description.identifier||'Modelo Bedrock',source:{format:'bedrock_geometry',formatVersion:data.format_version,modelFormat:'bedrock_entity',fileName:null},target:{format:'bedrock_entity',version:data.format_version}},scene:{coordinateSystem:'nyra-local',nodes,materials:[],textures:[]},animations:{clips:[]},extensions:{bedrockGeometryOriginal:data},diagnostics:[]};
 return root;
}
module.exports={FORMAT_VERSION,GEOMETRY_SCHEMA,exportBedrockGeometry,importBedrockGeometry};
