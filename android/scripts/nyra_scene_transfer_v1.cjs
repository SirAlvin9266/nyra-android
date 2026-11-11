'use strict';

const SCHEMA = 'nyra.scene-transfer';
const VERSION = 1;

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function finiteVector(value, size, label) {
  if (!Array.isArray(value) || value.length !== size ||
      !value.every(item => typeof item === 'number' && Number.isFinite(item))) {
    throw new TypeError(label + ' deve conter ' + size + ' números finitos.');
  }
  return value.slice();
}
function normalizeTransform(value, label) {
  const source = value == null ? {} : value;
  if (!object(source)) throw new TypeError(label + ' deve ser um objeto.');
  const position = finiteVector(source.position ?? [0,0,0], 3, label + '.position');
  const rotation = finiteVector(source.rotation ?? [0,0,0], 3, label + '.rotation');
  const scale = finiteVector(source.scale ?? [1,1,1], 3, label + '.scale');
  if (scale.some(v => v === 0)) throw new RangeError(label + '.scale não pode conter zero.');
  const rotationUnit = source.rotationUnit ?? 'radians';
  if (!['radians','degrees'].includes(rotationUnit)) {
    throw new TypeError(label + '.rotationUnit deve ser radians ou degrees.');
  }
  const rotationOrder = source.rotationOrder ?? 'XYZ';
  if (typeof rotationOrder !== 'string' || !/^(XYZ|XZY|YXZ|YZX|ZXY|ZYX)$/.test(rotationOrder)) {
    throw new TypeError(label + '.rotationOrder inválida.');
  }
  return {position,rotation,scale,rotationUnit,rotationOrder};
}
function serializableClone(value, label) {
  try {
    const clone = JSON.parse(JSON.stringify(value));
    if (clone === undefined) throw new Error('undefined');
    return clone;
  } catch (error) {
    throw new TypeError(label + ' precisa conter apenas dados JSON serializáveis: ' + error.message);
  }
}
function normalizeSceneTransfer(input) {
  if (!object(input)) throw new TypeError('O documento de transferência deve ser um objeto JSON.');
  if (input.schema !== SCHEMA) throw new Error('Schema de transferência não reconhecido.');
  if (input.schemaVersion !== VERSION) throw new Error('Versão de transferência não suportada: ' + input.schemaVersion);
  const project = object(input.project) ? input.project : {};
  const source = object(project.source) ? project.source : {};
  const target = object(project.target) ? project.target : {};
  const scene = object(input.scene) ? input.scene : {};
  const animations = object(input.animations) ? input.animations : {};
  const rawNodes = Array.isArray(scene.nodes) ? scene.nodes : [];
  const ids = new Set();
  const nodes = rawNodes.map((raw,index) => {
    const label = 'scene.nodes[' + index + ']';
    if (!object(raw)) throw new TypeError(label + ' deve ser objeto.');
    if (typeof raw.id !== 'string' || !raw.id.trim()) throw new Error(label + '.id obrigatório.');
    if (ids.has(raw.id)) throw new Error('ID de nó duplicado: ' + raw.id);
    ids.add(raw.id);
    const type = raw.type ?? 'empty';
    if (!['group','bone','cube','mesh','locator','empty'].includes(type)) {
      throw new Error(label + '.type inválido: ' + type);
    }
    const parentId = raw.parentId == null ? null : String(raw.parentId);
    const pivot = finiteVector(raw.pivot ?? [0,0,0],3,label+'.pivot');
    const normalized = {
      id:raw.id, sourceId:raw.sourceId == null ? null : String(raw.sourceId),
      name:String(raw.name ?? raw.id), type, parentId,
      transform:normalizeTransform(raw.transform,label+'.transform'),
      pivot, visibility:raw.visibility !== false,
      geometry:raw.geometry == null ? null : serializableClone(raw.geometry,label+'.geometry'),
      sourceData:serializableClone(raw.sourceData ?? {},label+'.sourceData')
    };
    if (raw.children !== undefined) {
      if (!Array.isArray(raw.children) || !raw.children.every(id=>typeof id==='string')) {
        throw new TypeError(label+'.children deve ser uma lista de IDs.');
      }
      normalized.children = raw.children.slice();
    }
    return normalized;
  });
  const byId = new Map(nodes.map(node=>[node.id,node]));
  for (const node of nodes) {
    if (node.parentId !== null && !byId.has(node.parentId)) {
      throw new Error('Pai inexistente "'+node.parentId+'" no nó "'+node.id+'".');
    }
    if (node.children) for (const childId of node.children) {
      if (!byId.has(childId)) throw new Error('Filho inexistente "'+childId+'" no nó "'+node.id+'".');
      if (byId.get(childId).parentId !== node.id) {
        throw new Error('Relação children/parentId inconsistente: '+node.id+' -> '+childId+'.');
      }
    }
  }
  const marks = new Map();
  function visit(id) {
    const mark=marks.get(id)||0;
    if(mark===1) throw new Error('Ciclo detectado na hierarquia em "'+id+'".');
    if(mark===2) return;
    marks.set(id,1);
    const parent=byId.get(id).parentId;
    if(parent!==null) visit(parent);
    marks.set(id,2);
  }
  for(const node of nodes) visit(node.id);

  const clips = (Array.isArray(animations.clips)?animations.clips:[]).map((raw,index)=>{
    const label='animations.clips['+index+']';
    if(!object(raw)) throw new TypeError(label+' deve ser objeto.');
    if(typeof raw.id!=='string'||!raw.id.trim()) throw new Error(label+'.id obrigatório.');
    const duration=Number(raw.duration);
    if(!Number.isFinite(duration)||duration<0) throw new Error(label+'.duration deve ser finita e não negativa.');
    const channels=(Array.isArray(raw.channels)?raw.channels:[]).map((channel,ci)=>{
      const clabel=label+'.channels['+ci+']';
      if(!object(channel)) throw new TypeError(clabel+' deve ser objeto.');
      if(typeof channel.targetNodeId!=='string'||!byId.has(channel.targetNodeId)) {
        throw new Error(clabel+' aponta para nó inexistente.');
      }
      const property=String(channel.property||'');
      if(!property) throw new Error(clabel+'.property obrigatório.');
      const keyframes=(Array.isArray(channel.keyframes)?channel.keyframes:[]).map((frame,fi)=>{
        const flabel=clabel+'.keyframes['+fi+']';
        if(!object(frame)) throw new TypeError(flabel+' deve ser objeto.');
        const time=Number(frame.time);
        if(!Number.isFinite(time)||time<0) throw new Error(flabel+'.time inválido.');
        const value=Array.isArray(frame.value)
          ? frame.value.map((v,j)=>{if(typeof v!=='number'||!Number.isFinite(v))throw new Error(flabel+'.value['+j+'] inválido.');return v;})
          : (typeof frame.value==='number'&&Number.isFinite(frame.value)?frame.value:serializableClone(frame.value,flabel+'.value'));
        return {time,value,interpolation:String(frame.interpolation??'linear'),sourceData:serializableClone(frame.sourceData??{},flabel+'.sourceData')};
      }).sort((a,b)=>a.time-b.time);
      return {targetNodeId:channel.targetNodeId,property,keyframes,sourceData:serializableClone(channel.sourceData??{},clabel+'.sourceData')};
    });
    return {id:raw.id,name:String(raw.name??raw.id),duration,loop:raw.loop===true,channels,sourceData:serializableClone(raw.sourceData??{},label+'.sourceData')};
  });
  const warnings=[];
  for(const clip of clips) for(const channel of clip.channels) {
    if(!['position','rotation','scale'].includes(channel.property)) warnings.push('Canal preservado, mas ainda não reproduzido: '+channel.property);
    for(const frame of channel.keyframes) if(!['linear','step','catmullrom','cubic'].includes(frame.interpolation)) warnings.push('Interpolação preservada, mas ainda não reproduzida: '+frame.interpolation);
  }
  return {
    schema:SCHEMA,schemaVersion:VERSION,
    project:{
      id:String(project.id??'nyra-project'),
      name:String(project.name??'Projeto sem título'),
      source:{format:String(source.format??'unknown'),formatVersion:source.formatVersion??null,modelFormat:source.modelFormat??null,fileName:source.fileName??null},
      target:{format:String(target.format??'generic_3d'),version:target.version??null}
    },
    scene:{
      coordinateSystem:String(scene.coordinateSystem??'nyra-local'),
      nodes,materials:serializableClone(scene.materials??[], 'scene.materials'),
      textures:serializableClone(scene.textures??[], 'scene.textures')
    },
    animations:{clips},extensions:serializableClone(input.extensions??{},'extensions'),
    diagnostics:serializableClone(input.diagnostics??[],'diagnostics'),
    warnings
  };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports={SCHEMA,VERSION,normalizeSceneTransfer};
} else {
  globalThis.NyraSceneTransferV1={SCHEMA,VERSION,normalizeSceneTransfer};
}
