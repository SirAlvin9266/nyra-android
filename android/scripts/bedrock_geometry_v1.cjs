'use strict';

// Bedrock geometry <-> Nyra scene-transfer v1.
// Coordinate rules follow Blockbench's Bedrock codec:
// - X is mirrored; Y and Z keep their direction.
// - cube origin = [-to.x, from.y, from.z]
// - pivots = [-x, y, z]
// - rotations = [-x, -y, z]
// - up/down per-face UV rectangles are flipped on export/import.
const DEFAULT_FORMAT_VERSION = '1.12.0';
const GEOMETRY_SCHEMA = 'minecraft:geometry';
const FACE_NAMES = ['north','south','east','west','up','down'];

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function vec3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(v => typeof v === 'number' && Number.isFinite(v))) {
    throw new TypeError(label + ' deve conter três números finitos.');
  }
  return value.slice();
}
function vec2(value, label) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(v => typeof v === 'number' && Number.isFinite(v))) {
    throw new TypeError(label + ' deve conter dois números finitos.');
  }
  return value.slice();
}
function finite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(label + ' deve ser finito.');
  return value;
}
function safeClone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function bbPositionToBedrock(value) { const v=vec3(value,'posição'); return [-v[0],v[1],v[2]]; }
function bedrockPositionToBB(value) { const v=vec3(value,'posição Bedrock'); return [-v[0],v[1],v[2]]; }
function bbRotationToBedrock(value) { const v=vec3(value,'rotação'); return [-v[0],-v[1],v[2]]; }
function bedrockRotationToBB(value) { const v=vec3(value,'rotação Bedrock'); return [-v[0],-v[1],v[2]]; }
function radiansToDegrees(value) { return value.map(v => v * 180 / Math.PI); }
function degreesToRadians(value) { return value.map(v => v * Math.PI / 180); }
function makeGeometryId(value) {
  const clean=String(value||'nyra_model').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9_.]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48)||'nyra_model';
  return clean.startsWith('geometry.') ? clean : 'geometry.nyra_'+clean;
}
function versionTuple(value) {
  const match=String(value||'').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new TypeError('format_version inválido: '+value);
  return match.slice(1).map(Number);
}
function compareVersions(a,b) {
  const x=versionTuple(a),y=versionTuple(b);
  for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]-y[i];}
  return 0;
}
function maxVersion(a,b) { return compareVersions(a,b)>=0?a:b; }
function nodeChildren(nodes) {
  const result=new Map();
  for(const node of nodes){if(node.parentId){if(!result.has(node.parentId))result.set(node.parentId,[]);result.get(node.parentId).push(node);}}
  return result;
}
function getBoneOrigin(node, byId, memo=new Map()) {
  if(memo.has(node.id)) return memo.get(node.id).slice();
  const raw=node.sourceData?.origin || node.sourceData?.bedrock?.pivot;
  if(Array.isArray(raw)) { const value=vec3(raw,'bone.origin'); memo.set(node.id,value); return value.slice(); }
  if(Array.isArray(node.pivot)) {
    const value=node.pivot.map(v=>v*16);
    memo.set(node.id,value); return value.slice();
  }
  const local=node.transform?.position || [0,0,0];
  const parent=node.parentId ? byId.get(node.parentId) : null;
  const base=parent && (parent.type==='bone'||parent.type==='group'||parent.type==='empty')
    ? getBoneOrigin(parent,byId,memo) : [0,0,0];
  const value=base.map((v,i)=>v+local[i]*16);
  memo.set(node.id,value);
  return value.slice();
}
function getNodeRotation(node, fallback=[0,0,0]) {
  if(Array.isArray(node.sourceData?.rotation)) return vec3(node.sourceData.rotation,'sourceData.rotation');
  const transform=node.transform||{};
  const value=vec3(transform.rotation||fallback,'transform.rotation');
  return transform.rotationUnit==='radians'?radiansToDegrees(value):value;
}
function normalizeFaceUV(face, faceName) {
  if(!isObject(face)) return null;
  const uv=face.uv;
  if(Array.isArray(uv)&&uv.length===4){
    const [u1,v1,u2,v2]=uv.map((v)=>finite(v,'face.uv'));
    let start=[u1,v1],size=[u2-u1,v2-v1];
    if(faceName==='up'||faceName==='down'){start=[u2,v2];size=[-size[0],-size[1]];}
    const out={uv:start,uv_size:size};
    const rotation=Number(face.rotation??face.uv_rotation??0);
    if(rotation) out.uv_rotation=finite(rotation,'face.rotation');
    const material=face.material_name??face.material_instance;
    if(typeof material==='string'&&material) out.material_instance=material;
    return out;
  }
  if(Array.isArray(face.uv)&&face.uv.length===2&&Array.isArray(face.uv_size)){
    const start=vec2(face.uv,'face.uv'),size=vec2(face.uv_size,'face.uv_size');
    const out={uv:start,uv_size:size};
    const rotation=Number(face.rotation??face.uv_rotation??0);
    if(rotation) out.uv_rotation=finite(rotation,'face.rotation');
    const material=face.material_name??face.material_instance;
    if(typeof material==='string'&&material) out.material_instance=material;
    return out;
  }
  return null;
}
function normalizeCube(node, boneMetadata={}) {
  const geometry=node.geometry||{},source=node.sourceData||{},bedrock=source.bedrock||{};
  const from=vec3(geometry.from||source.from,'cube.from');
  const to=vec3(geometry.to||source.to,'cube.to');
  const size=to.map((v,i)=>v-from[i]);
  if(size.some(v=>v<=0)) throw new RangeError('Cubo '+node.name+' tem dimensão zero ou negativa.');
  const cube={...safeClone(bedrock),origin:[-to[0],from[1],from[2]],size};
  delete cube.pivot; delete cube.rotation; delete cube.inflate; delete cube.mirror; delete cube.uv;
  const inflate=geometry.inflate??source.inflate??bedrock.inflate;
  if(inflate!==undefined&&inflate!==0) cube.inflate=finite(inflate,'cube.inflate');
  const boxUv=geometry.boxUv===true||source.box_uv===true||Array.isArray(source.uv)||Array.isArray(bedrock.uv);
  if(boxUv){
    const uv=geometry.uvOffset||source.uv_offset||source.uv||bedrock.uv;
    cube.uv=vec2(uv,'cube.uv');
    const mirror=geometry.mirrorUv??source.mirror_uv??source.mirror??bedrock.mirror;
    const boneMirror=boneMetadata.mirror===true;
    if(mirror!==undefined&&!!mirror!==boneMirror) cube.mirror=!!mirror;
  } else {
    const faces=geometry.faces||source.faces||{};
    const mapped={};
    for(const faceName of FACE_NAMES){
      const face=normalizeFaceUV(faces[faceName],faceName);
      if(face) mapped[faceName]=face;
    }
    if(Object.keys(mapped).length) cube.uv=mapped;
  }
  const mirror=geometry.mirror??source.mirror??bedrock.mirror;
  if(!boxUv&&mirror!==undefined) cube.mirror=!!mirror;
  const rotation=getNodeRotation(node);
  if(rotation.some(v=>v!==0)){
    const origin=source.origin||source.pivot||node.pivot?.map(v=>v*16);
    if(!Array.isArray(origin)) throw new Error('Cubo rotacionado sem pivô de origem: '+node.name);
    cube.pivot=bbPositionToBedrock(origin);
    cube.rotation=bbRotationToBedrock(rotation);
  }
  return cube;
}
function collectBoneMetadata(node) {
  const source=node.sourceData||{},bedrock=source.bedrock||{};
  const result={};
  for(const key of ['binding','reset','mirror','inflate','material','render_group_id','debug','neverRender','reset']) {
    const value=bedrock[key]??source[key];
    if(value!==undefined) result[key]=safeClone(value);
  }
  return result;
}
function exportBedrockGeometry(documentData, options={}) {
  if(!isObject(documentData)||documentData.schema!=='nyra.scene-transfer'||documentData.schemaVersion!==1) {
    throw new Error('Documento Nyra scene-transfer v1 obrigatório.');
  }
  const nodes=documentData.scene?.nodes;
  if(!Array.isArray(nodes)||!nodes.length) throw new Error('O projeto não possui nós para exportar.');
  const byId=new Map(nodes.map(n=>[n.id,n]));
  if(byId.size!==nodes.length) throw new Error('IDs de nós duplicados.');
  const children=nodeChildren(nodes);
  for(const node of nodes) if(node.parentId&&!byId.has(node.parentId)) throw new Error('Pai inexistente em '+node.name);
  const boneNodes=nodes.filter(n=>['bone','group','empty'].includes(n.type)&&n.sourceData?.role!=='bedrock-geometry-root');
  const meshNodes=nodes.filter(n=>n.type==='mesh');
  if(meshNodes.length) throw new Error('Malhas livres não possuem conversão automática segura para cubos Bedrock. Preserve-as no projeto Nyra ou converta-as para cubos.');
  const invalid=nodes.filter(n=>!['bone','group','empty','cube','locator'].includes(n.type));
  if(invalid.length) throw new Error('Há nós não suportados para Geometry Bedrock: '+invalid.map(n=>n.name).join(', '));
  if(!boneNodes.length&&!nodes.some(n=>n.type==='cube')) throw new Error('O projeto precisa de bones/grupos ou cubos para exportar.');
  const synthetic={id:'__nyra_bb_main__',name:'bb_main',type:'bone',parentId:null,sourceData:{origin:[0,0,0]},transform:{position:[0,0,0],rotation:[0,0,0],rotationUnit:'degrees'}};
  const rootCubeNodes=nodes.filter(n=>n.type==='cube'&&!boneNodes.some(b=>b.id===n.parentId));
  const rootLocatorNodes=nodes.filter(n=>n.type==='locator'&&!boneNodes.some(b=>b.id===n.parentId));
  const allBones=boneNodes.slice();
  if((!boneNodes.length&&nodes.some(n=>n.type==='cube'))||rootCubeNodes.length||rootLocatorNodes.length) allBones.unshift(synthetic);
  const boneById=new Map(allBones.map(n=>[n.id,n]));
  const usedNames=new Set(),nameById=new Map();
  for(const bone of allBones){
    let name=String(bone.name||bone.id).trim().replace(/[^A-Za-z0-9_.-]+/g,'_')||'bone';
    if(usedNames.has(name)) throw new Error('Nome de bone duplicado após normalização: '+name);
    usedNames.add(name);nameById.set(bone.id,name);
  }
  const parentIdFor=(bone)=>{
    if(bone===synthetic)return null;
    let parent=bone.parentId;
    while(parent&&!boneById.has(parent)){parent=byId.get(parent)?.parentId||null;}
    return parent||null;
  };
  const state=new Map(),ordered=[];
  function visit(bone){
    const mark=state.get(bone.id)||0;
    if(mark===1) throw new Error('Ciclo na hierarquia em '+bone.name);
    if(mark===2)return;
    state.set(bone.id,1);
    const parent=parentIdFor(bone);
    if(parent) visit(boneById.get(parent));
    state.set(bone.id,2);
    ordered.push(bone);
  }
  for(const bone of allBones) visit(bone);
  const worldOrigins=new Map();
  const geometryBones=[];
  let hasUvRotation=false,hasCubeRotation=false,hasBinding=false;
  for(const bone of ordered){
    const origin=bone===synthetic?[0,0,0]:getBoneOrigin(bone,byId,worldOrigins);
    const rotation=bone===synthetic?[0,0,0]:getNodeRotation(bone);
    const metadata=bone===synthetic?{}:collectBoneMetadata(bone);
    const rawBone=bone.sourceData?.bedrockOriginal||{};
    const item={...safeClone(rawBone),name:nameById.get(bone.id)};
    for(const key of ['parent','pivot','rotation','cubes','locators']) delete item[key];
    const parent=parentIdFor(bone);
    if(parent)item.parent=nameById.get(parent);
    const pivot=bbPositionToBedrock(origin);
    if(pivot.some(Boolean))item.pivot=pivot;
    if(rotation.some(Boolean))item.rotation=bbRotationToBedrock(rotation);
    for(const key of ['binding','reset','mirror','inflate','material','render_group_id','debug','neverRender']){
      if(metadata[key]!==undefined)item[key]=metadata[key];
    }
    if(item.binding)hasBinding=true;
    const cubes=[];
    for(const node of nodes.filter(n=>n.type==='cube'&&n.parentId===bone.id)){
      const cube=normalizeCube(node,metadata);
      if(cube.rotation)hasCubeRotation=true;
      if(cube.uv&& !Array.isArray(cube.uv)) for(const face of Object.values(cube.uv)) if(face.uv_rotation)hasUvRotation=true;
      cubes.push(cube);
    }
    if(bone===synthetic){
      for(const node of rootCubeNodes)cubes.push(normalizeCube(node,{}));
      for(const node of rootLocatorNodes) {
        const key=String(node.sourceData?.locatorName||node.name||'locator');
        const raw=node.sourceData?.bedrockLocator||node.sourceData?.locator;
        if(raw!==undefined){if(!item.locators)item.locators={};item.locators[key]=safeClone(raw);}
        else {
          const pos=node.transform?.position||[0,0,0];
          if(!item.locators)item.locators={};
          item.locators[key]=bbPositionToBedrock(pos.map(v=>v*16));
        }
      }
    }
    if(cubes.length)item.cubes=cubes;
    const locators=bone===synthetic?null:(bone.sourceData?.locators||bone.sourceData?.bedrock?.locators);
    if(locators&&Object.keys(locators).length)item.locators=safeClone(locators);
    for(const locator of nodes.filter(n=>n.type==='locator'&&n.parentId===bone.id)){
      const key=String(locator.sourceData?.locatorName||locator.name||'locator');
      const raw=locator.sourceData?.bedrockLocator||locator.sourceData?.locator;
      const value=raw!==undefined?safeClone(raw):bbPositionToBedrock((locator.transform?.position||[0,0,0]).map(v=>v*16));
      if(!item.locators)item.locators={};
      item.locators[key]=value;
    }
    geometryBones.push(item);
  }
  let required=DEFAULT_FORMAT_VERSION;
  if(hasCubeRotation) required=maxVersion(required,'1.14.0');
  if(hasBinding) required=maxVersion(required,'1.16.0');
  if(hasUvRotation) required=maxVersion(required,'1.21.0');
  const formatVersion=options.formatVersion||required;
  if(compareVersions(formatVersion,required)<0) {
    throw new Error('format_version '+formatVersion+' é insuficiente para os recursos usados; mínimo necessário: '+required+'.');
  }
  const firstTexture=documentData.scene?.textures?.[0];
  const resolution=documentData.extensions?.blockbenchRaw?.resolution||{};
  const bedrockDescription=documentData.extensions?.bedrockGeometryDescription||{};
  const width=finite(options.textureWidth??firstTexture?.width??resolution.width??bedrockDescription.texture_width??64,'texture_width');
  const height=finite(options.textureHeight??firstTexture?.height??resolution.height??bedrockDescription.texture_height??64,'texture_height');
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0) throw new RangeError('texture_width/texture_height devem ser inteiros positivos.');
  const identifier=makeGeometryId(options.identifier||documentData.project?.name||'nyra_model');
  const description={
    identifier,texture_width:width,texture_height:height,
    visible_bounds_width:finite(options.visibleBoundsWidth??2,'visible_bounds_width'),
    visible_bounds_height:finite(options.visibleBoundsHeight??2,'visible_bounds_height'),
    visible_bounds_offset:vec3(options.visibleBoundsOffset||[0,1,0],'visible_bounds_offset')
  };
  const raw={format_version:formatVersion,[GEOMETRY_SCHEMA]:[{description,bones:geometryBones}]};
  const json=JSON.stringify(raw,null,2);
  return {
    format:'bedrock_geometry',formatVersion,identifier,json,document:raw,
    report:{
      boneCount:geometryBones.length,
      cubeCount:geometryBones.reduce((sum,b)=>sum+(b.cubes?.length||0),0),
      locatorCount:geometryBones.reduce((sum,b)=>sum+Object.keys(b.locators||{}).length,0),
      textureCount:documentData.scene?.textures?.length||0,
      animationClips:documentData.animations?.clips?.length||0,
      requiredFormatVersion:required,
      notes:[
        'Coordenadas seguem a conversão do Blockbench: X espelhado; Y/Z preservados.',
        'Geometry JSON guarda dimensões de textura e UV, mas não incorpora o arquivo PNG.',
        'Animações e controladores não pertencem a este arquivo de geometria.',
        'Malhas livres/texture meshes são preservadas no projeto Nyra, mas não são convertidas automaticamente.'
      ]
    }
  };
}
function importBedrockGeometry(input) {
  const data=typeof input==='string'?JSON.parse(input):safeClone(input);
  if(!isObject(data)||typeof data.format_version!=='string'||!Array.isArray(data[GEOMETRY_SCHEMA])||data[GEOMETRY_SCHEMA].length!==1) {
    throw new Error('Arquivo não é um Minecraft Bedrock Geometry JSON reconhecível com uma geometria.');
  }
  versionTuple(data.format_version);
  const geometry=data[GEOMETRY_SCHEMA][0],description=geometry.description||{},rawBones=geometry.bones;
  if(!Array.isArray(rawBones)||!rawBones.length) throw new Error('Geometry sem bones.');
  const ids=new Map(),nodes=[],rawByName=new Map();
  const geometryId=String(description.identifier||'geometry.unnamed');
  const rootId='bedrock-root:'+geometryId;
  nodes.push({
    id:rootId,sourceId:null,name:geometryId,type:'group',parentId:null,children:[],
    pivot:[0,0,0],transform:{position:[0,0,0],rotation:[0,0,0],rotationUnit:'radians',rotationOrder:'XYZ',scale:[1,1,1]},
    visibility:true,geometry:null,sourceData:{role:'bedrock-geometry-root'}
  });
  for(const [index,bone] of rawBones.entries()){
    if(!isObject(bone)||typeof bone.name!=='string'||!bone.name.trim()) throw new Error('Bone inválido no índice '+index+'.');
    if(ids.has(bone.name)) throw new Error('Nome de bone duplicado: '+bone.name);
    const id='bedrock-bone:'+index+':'+bone.name;
    ids.set(bone.name,id);rawByName.set(bone.name,bone);
  }
  const boneOrigins=new Map();
  for(const bone of rawBones){
    const bbOrigin=bedrockPositionToBB(bone.pivot||[0,0,0]);
    boneOrigins.set(bone.name,bbOrigin);
  }
  for(const [index,bone] of rawBones.entries()){
    const id=ids.get(bone.name);
    const parentId=bone.parent?(ids.get(bone.parent)||null):rootId;
    if(bone.parent&&!parentId) throw new Error('Pai Bedrock inexistente: '+bone.parent);
    const parentOrigin=bone.parent?boneOrigins.get(bone.parent):[0,0,0];
    const origin=boneOrigins.get(bone.name);
    const localPosition=origin.map((v,i)=>(v-parentOrigin[i])/16);
    const rotation=bedrockRotationToBB(bone.rotation||[0,0,0]);
    const metadata={};
    for(const key of ['binding','reset','mirror','inflate','material','render_group_id','debug','neverRender']) {
      if(bone[key]!==undefined)metadata[key]=safeClone(bone[key]);
    }
    nodes.push({
      id,sourceId:null,name:bone.name,type:'bone',parentId,children:[],
      pivot:origin.map(v=>v/16),
      transform:{position:localPosition,rotation:degreesToRadians(rotation),rotationUnit:'radians',rotationOrder:'XYZ',scale:[1,1,1]},
      visibility:true,geometry:null,
      sourceData:{origin,rotation,locators:safeClone(bone.locators||{}),bedrock:metadata,bedrockOriginal:safeClone(bone)}
    });
    for(const [cubeIndex,cube] of (bone.cubes||[]).entries()){
      if(!isObject(cube))throw new Error('Cubo inválido em '+bone.name+'['+cubeIndex+'].');
      const originBedrock=vec3(cube.origin||[0,0,0],'cube.origin');
      const size=vec3(cube.size,'cube.size');
      if(size.some(v=>v<=0))throw new Error('Dimensão de cubo inválida em '+bone.name+'.');
      const from=[-originBedrock[0]-size[0],originBedrock[1],originBedrock[2]];
      const to=[-originBedrock[0],originBedrock[1]+size[1],originBedrock[2]+size[2]];
      const cubePivot=bedrockPositionToBB(cube.pivot||bone.pivot||[0,0,0]);
      const rotation=bedrockRotationToBB(cube.rotation||[0,0,0]);
      const faces={};
      if(Array.isArray(cube.uv)){
        // Box UV is a two-number offset; mirror inherits from the bone unless overridden.
        // Keep the exact source array in sourceData as well.
      } else if(isObject(cube.uv)){
        for(const faceName of FACE_NAMES){
          const face=cube.uv[faceName];
          if(!isObject(face)||!Array.isArray(face.uv))continue;
          const uv=vec2(face.uv,'face.uv');
          const uvSize=face.uv_size?vec2(face.uv_size,'face.uv_size'):[0,0];
          let rect=[uv[0],uv[1],uv[0]+uvSize[0],uv[1]+uvSize[1]];
          if(faceName==='up'||faceName==='down')rect=[uv[0]+uvSize[0],uv[1]+uvSize[1],uv[0],uv[1]];
          const faceData={uv:rect,rotation:face.uv_rotation||0};
          if(typeof face.material_instance==='string'&&face.material_instance)faceData.material_name=face.material_instance;
          faces[faceName]=faceData;
        }
      }
      const cubeId=id+':cube:'+cubeIndex;
      nodes.push({
        id:cubeId,sourceId:null,name:bone.name+' cube '+(cubeIndex+1),type:'cube',
        parentId:id,children:[],pivot:cubePivot.map(v=>v/16),
        transform:{position:[0,0,0],rotation:degreesToRadians(rotation),rotationUnit:'radians',rotationOrder:'XYZ',scale:[1,1,1]},
        visibility:true,
        geometry:{
          kind:'blockbench_cube',from,to,inflate:cube.inflate??bone.inflate??0,
          mirror:cube.mirror??bone.mirror??false,faces,
          boxUv:Array.isArray(cube.uv),uvOffset:Array.isArray(cube.uv)?vec2(cube.uv,'cube.uv'):null,
          mirrorUv:cube.mirror??bone.mirror??false
        },
        sourceData:{
          origin:cubePivot,rotation,from,to,inflate:cube.inflate??bone.inflate??0,
          mirror:cube.mirror??false,mirror_uv:cube.mirror??bone.mirror??false,
          uv:safeClone(cube.uv),bedrock:safeClone(cube)
        }
      });
    }
    if(isObject(bone.locators)){
      for(const [locatorName,locator] of Object.entries(bone.locators)){
        const rawOffset=Array.isArray(locator)?locator:locator?.offset;
        if(!Array.isArray(rawOffset)||rawOffset.length!==3)continue;
        const bbOffset=bedrockPositionToBB(rawOffset);
        const locatorId=id+':locator:'+locatorName;
        nodes.push({
          id:locatorId,sourceId:null,name:locatorName,type:'locator',parentId:id,children:[],
          pivot:[0,0,0],
          transform:{position:bbOffset.map(v=>v/16),rotation:[0,0,0],rotationUnit:'radians',rotationOrder:'XYZ',scale:[1,1,1]},
          visibility:true,geometry:null,
          sourceData:{locatorName,bedrockLocator:safeClone(locator)}
        });
      }
    }
  }
  const byId=new Map(nodes.map(n=>[n.id,n]));
  for(const node of nodes) if(node.parentId) byId.get(node.parentId).children.push(node.id);
  const warnings=[];
  for(const bone of rawBones){
    if(bone.poly_mesh)warnings.push('poly_mesh em '+bone.name+' foi preservado em sourceData, mas não foi convertido para geometria editável.');
    if(bone.texture_meshes)warnings.push('texture_meshes em '+bone.name+' foram preservados em sourceData, mas não foram convertidos para geometria editável.');
  }
  if(data.format_version==='1.12.0'&&rawBones.some(b=>(b.cubes||[]).some(c=>Array.isArray(c.rotation)&&c.rotation.some(v=>v!==0)))) {
    warnings.push('Modelo 1.12.0 contém pivôs de cubo rotacionado; a documentação do esquema registra diferença de comportamento de pivot entre 1.12 e 1.14.');
  }
  return {
    schema:'nyra.scene-transfer',schemaVersion:1,
    project:{
      id:'bedrock:'+geometryId,name:geometryId,
      source:{format:'bedrock_geometry',formatVersion:data.format_version,modelFormat:'bedrock_entity',fileName:null},
      target:{format:'bedrock_entity',version:data.format_version}
    },
    scene:{coordinateSystem:'nyra-local',nodes,materials:[],textures:[]},
    animations:{clips:[]},
    extensions:{
      bedrockGeometryOriginal:safeClone(data),
      bedrockGeometryDescription:safeClone(description),
      bedrockGeometryWarnings:warnings
    },
    diagnostics:warnings.slice()
  };
}
module.exports={DEFAULT_FORMAT_VERSION,GEOMETRY_SCHEMA,exportBedrockGeometry,importBedrockGeometry};
