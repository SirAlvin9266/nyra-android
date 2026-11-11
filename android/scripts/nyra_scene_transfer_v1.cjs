'use strict';

const SCHEMA = 'nyra.scene-transfer';
const VERSION = 1;
const NODE_TYPES = new Set(['group','bone','cube','mesh','locator','empty']);
const ROTATION_UNITS = new Set(['radians','degrees']);
const ROTATION_ORDERS = new Set(['XYZ','XZY','YXZ','YZX','ZXY','ZYX']);
const PLAYABLE_PROPERTIES = new Set(['position','rotation','scale']);
const PLAYABLE_INTERPOLATIONS = new Set(['linear','step']);

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
  if (!ROTATION_UNITS.has(rotationUnit)) {
    throw new TypeError(label + '.rotationUnit deve ser radians ou degrees.');
  }
  const rotationOrder = source.rotationOrder ?? 'XYZ';
  if (!ROTATION_ORDERS.has(rotationOrder)) {
    throw new TypeError(label + '.rotationOrder inválida.');
  }
  return {position,rotation,scale,rotationUnit,rotationOrder};
}
function assertJsonSafe(value, label, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(label + ' contém número não finito.');
    return;
  }
  if (typeof value !== 'object') {
    throw new TypeError(label + ' contém tipo não JSON: ' + typeof value + '.');
  }
  if (seen.has(value)) throw new TypeError(label + ' contém referência circular.');
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(label + ' contém objeto que não é um objeto JSON simples.');
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        throw new TypeError(label + ' contém posição vazia em array.');
      }
      assertJsonSafe(value[index], label + '[' + index + ']', seen);
    }
  } else {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') throw new TypeError(label + ' contém chave Symbol.');
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError(label + '.' + key + ' contém getter ou setter.');
      }
      assertJsonSafe(descriptor.value, label + '.' + key, seen);
    }
  }
  seen.delete(value);
}
function serializableClone(value, label) {
  try {
    assertJsonSafe(value, label);
    const clone = JSON.parse(JSON.stringify(value));
    if (clone === undefined) throw new Error('undefined');
    return clone;
  } catch (error) {
    throw new TypeError(label + ' precisa conter apenas dados JSON serializáveis: ' + error.message);
  }
}
function normalizeProject(project) {
  if (!object(project)) throw new TypeError('project deve ser um objeto.');
  const source = object(project.source) ? project.source : {};
  const target = object(project.target) ? project.target : {};
  const normalized = {
    id:String(project.id ?? 'nyra-project'),
    name:String(project.name ?? 'Projeto sem título'),
    source:{
      format:String(source.format ?? 'unknown'),
      formatVersion:source.formatVersion == null ? null : String(source.formatVersion),
      modelFormat:source.modelFormat == null ? null : String(source.modelFormat),
      fileName:source.fileName == null ? null : String(source.fileName)
    },
    target:{
      format:String(target.format ?? 'generic_3d'),
      version:target.version == null ? null : String(target.version)
    }
  };
  if (!normalized.id.trim()) throw new Error('project.id não pode ficar vazio.');
  if (!normalized.name.trim()) throw new Error('project.name não pode ficar vazio.');
  return normalized;
}
function normalizeNodes(scene) {
  if (!object(scene)) throw new TypeError('scene deve ser um objeto.');
  if (!Array.isArray(scene.nodes)) throw new TypeError('scene.nodes deve ser uma lista.');
  const ids = new Set();
  const nodes = scene.nodes.map((raw,index) => {
    const label = 'scene.nodes[' + index + ']';
    if (!object(raw)) throw new TypeError(label + ' deve ser objeto.');
    if (typeof raw.id !== 'string' || !raw.id.trim()) throw new Error(label + '.id obrigatório.');
    if (ids.has(raw.id)) throw new Error('ID de nó duplicado: ' + raw.id);
    ids.add(raw.id);
    const type = raw.type ?? 'empty';
    if (!NODE_TYPES.has(type)) throw new Error(label + '.type inválido: ' + type);
    const parentId = raw.parentId == null ? null : String(raw.parentId);
    if (parentId === raw.id) throw new Error('Um nó não pode ser pai de si mesmo: ' + raw.id);
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
      if (new Set(raw.children).size !== raw.children.length) {
        throw new Error(label+'.children contém IDs duplicados.');
      }
      normalized.children = raw.children.slice();
    }
    return normalized;
  });
  const byId = new Map(nodes.map(node=>[node.id,node]));
  const derivedChildren = new Map(nodes.map(node=>[node.id,[]]));
  for (const node of nodes) {
    if (node.parentId !== null && !byId.has(node.parentId)) {
      throw new Error('Pai inexistente "'+node.parentId+'" no nó "'+node.id+'".');
    }
    if (node.parentId !== null) derivedChildren.get(node.parentId).push(node.id);
    if (node.children) for (const childId of node.children) {
      if (!byId.has(childId)) throw new Error('Filho inexistente "'+childId+'" no nó "'+node.id+'".');
      if (byId.get(childId).parentId !== node.id) {
        throw new Error('Relação children/parentId inconsistente: '+node.id+' -> '+childId+'.');
      }
    }
  }
  for (const node of nodes) {
    if (node.children) {
      const declared = new Set(node.children);
      const derived = new Set(derivedChildren.get(node.id));
      if (declared.size !== derived.size || [...derived].some(id=>!declared.has(id))) {
        throw new Error('Lista children incompleta para o nó "'+node.id+'".');
      }
    } else {
      node.children = derivedChildren.get(node.id);
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
  return nodes;
}
function normalizeAnimations(animations, byId) {
  if (!object(animations)) throw new TypeError('animations deve ser um objeto.');
  const rawClips = animations.clips ?? [];
  if (!Array.isArray(rawClips)) throw new TypeError('animations.clips deve ser uma lista.');
  const clipIds = new Set();
  const warnings = [];
  const clips = rawClips.map((raw,index)=>{
    const label='animations.clips['+index+']';
    if(!object(raw)) throw new TypeError(label+' deve ser objeto.');
    if(typeof raw.id!=='string'||!raw.id.trim()) throw new Error(label+'.id obrigatório.');
    if(clipIds.has(raw.id)) throw new Error('ID de clip duplicado: '+raw.id);
    clipIds.add(raw.id);
    const duration=raw.duration;
    if(typeof duration!=='number'||!Number.isFinite(duration)||duration<0) {
      throw new Error(label+'.duration deve ser um número finito e não negativo.');
    }
    if(raw.loop !== undefined && typeof raw.loop !== 'boolean') {
      throw new TypeError(label+'.loop deve ser booleano.');
    }
    if(!Array.isArray(raw.channels ?? [])) throw new TypeError(label+'.channels deve ser uma lista.');
    const channels=(raw.channels??[]).map((channel,ci)=>{
      const clabel=label+'.channels['+ci+']';
      if(!object(channel)) throw new TypeError(clabel+' deve ser objeto.');
      if(typeof channel.targetNodeId!=='string'||!byId.has(channel.targetNodeId)) {
        throw new Error(clabel+' aponta para nó inexistente.');
      }
      const property=String(channel.property||'');
      if(!property) throw new Error(clabel+'.property obrigatório.');
      const keyframes=(channel.keyframes??[]).map((frame,fi)=>{
        const flabel=clabel+'.keyframes['+fi+']';
        if(!object(frame)) throw new TypeError(flabel+' deve ser objeto.');
        if(typeof frame.time!=='number'||!Number.isFinite(frame.time)||frame.time<0) {
          throw new Error(flabel+'.time inválido.');
        }
        const value=PLAYABLE_PROPERTIES.has(property)
          ? finiteVector(frame.value,3,flabel+'.value')
          : serializableClone(frame.value,flabel+'.value');
        return {
          time:frame.time,value,
          interpolation:String(frame.interpolation??'linear'),
          sourceData:serializableClone(frame.sourceData??{},flabel+'.sourceData')
        };
      });
      keyframes.sort((a,b)=>a.time-b.time);
      for(let i=1;i<keyframes.length;i++) {
        if(keyframes[i].time===keyframes[i-1].time) {
          throw new Error(clabel+' possui keyframes duplicados no tempo '+keyframes[i].time+'.');
        }
      }
      if(keyframes.some(frame=>frame.time>duration)) {
        warnings.push('Keyframe posterior à duração declarada em '+clabel+'.');
      }
      if(!PLAYABLE_PROPERTIES.has(property)) {
        warnings.push('Canal preservado, mas ainda não reproduzido: '+property);
      }
      for(const frame of keyframes) {
        if(!PLAYABLE_INTERPOLATIONS.has(frame.interpolation)) {
          warnings.push('Interpolação preservada, mas ainda não reproduzida: '+frame.interpolation);
        }
      }
      return {
        targetNodeId:channel.targetNodeId,property,keyframes,
        sourceData:serializableClone(channel.sourceData??{},clabel+'.sourceData')
      };
    });
    return {
      id:raw.id,name:String(raw.name??raw.id),duration,loop:raw.loop===true,
      channels,sourceData:serializableClone(raw.sourceData??{},label+'.sourceData')
    };
  });
  return {clips,warnings};
}
function normalizeSceneTransfer(input) {
  if (!object(input)) throw new TypeError('O documento de transferência deve ser um objeto JSON.');
  assertJsonSafe(input, 'documento de transferência');
  if (input.schema !== SCHEMA) throw new Error('Schema de transferência não reconhecido.');
  if (input.schemaVersion !== VERSION) throw new Error('Versão de transferência não suportada: ' + input.schemaVersion);
  const project=normalizeProject(input.project??{});
  const scene=object(input.scene)?input.scene:{};
  const nodes=normalizeNodes(scene);
  const byId=new Map(nodes.map(node=>[node.id,node]));
  const normalizedAnimations=normalizeAnimations(input.animations??{},byId);
  const normalized = {
    schema:SCHEMA,schemaVersion:VERSION,project,
    scene:{
      coordinateSystem:String(scene.coordinateSystem??'nyra-local'),
      nodes,materials:serializableClone(scene.materials??[],'scene.materials'),
      textures:serializableClone(scene.textures??[],'scene.textures')
    },
    animations:{clips:normalizedAnimations.clips},
    extensions:serializableClone(input.extensions??{},'extensions'),
    diagnostics:serializableClone(input.diagnostics??[],'diagnostics')
  };
  normalized.diagnostics.push(...normalizedAnimations.warnings);
  normalized.warnings=normalizedAnimations.warnings;
  return normalized;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports={SCHEMA,VERSION,NODE_TYPES,PLAYABLE_PROPERTIES,PLAYABLE_INTERPOLATIONS,normalizeSceneTransfer};
} else {
  globalThis.NyraSceneTransferV1={SCHEMA,VERSION,NODE_TYPES,PLAYABLE_PROPERTIES,PLAYABLE_INTERPOLATIONS,normalizeSceneTransfer};
}
