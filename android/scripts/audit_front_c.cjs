#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'app/src/main/assets/www/index.html');
const characterPath = path.join(root, 'app/src/main/assets/www/nyra_personagem.json');
const javaPath = path.join(root, 'app/src/main/java/com/nyra/studio/MainActivity.java');
const html = fs.readFileSync(htmlPath, 'utf8');
const java = fs.readFileSync(javaPath, 'utf8');
const failures = [];

function requireText(source, marker, label) {
  if (!source.includes(marker)) failures.push(label + ': missing ' + marker);
}

const modelStart = html.indexOf('const modelTools = ');
const modelEnd = html.indexOf('const panelEnd', modelStart);
if (modelStart < 0 || modelEnd <= modelStart) {
  failures.push('Could not isolate the existing model I/O module');
}
const model = modelStart >= 0 && modelEnd > modelStart ? html.slice(modelStart, modelEnd) : '';

const guideStart = html.indexOf('const nyraGuideSteps=[');
const guideEnd = html.indexOf('let nyraGuideRobotRuntime=null', guideStart);
const guide = guideStart >= 0 && guideEnd > guideStart ? html.slice(guideStart, guideEnd) : '';
const guideCount = (guide.match(/\{title:/g) || []).length;
if (guideCount !== 23) failures.push('Expected 23 guide steps, found ' + guideCount);

for (const marker of [
  'nyraImport3D', 'nyraModelFiles', 'nyraExportGLB', 'nyraExportBB',
  'nyraExportOBJ', 'nyraExportSTL', 'nyraExportJSON', 'nyraPerfReport',
  'nyraCacheReport', 'nyraCacheClear', 'function nyraCreateSceneJSON',
  'function parseNyraSceneProject', 'async function parseNyraCharacterProject',
  "document.getElementById('nyraExportJSON').addEventListener",
  "nyraPerfRecord('import_started'", "nyraPerfRecord('import_completed'",
  'import_stage', 'frameP95Ms', 'nyraImportStartedAt', 'scene_build_and_commit', 'nyraDeserializeMaterial'
]) requireText(model, marker, 'Character Editor module');

for (const marker of [
  'nyraGuidePrev', 'nyraGuideNext', 'nyraGuideOpen',
  'function renderNyraGuide', 'nyraGuideHighlight'
]) requireText(html, marker, 'Guide shell');

const robotStart = html.indexOf('let nyraGuideRobotRuntime=null');
const robotEnd = html.indexOf('let nyraGuideIndex=', robotStart);
const robot = robotStart >= 0 && robotEnd > robotStart ? html.slice(robotStart, robotEnd) : '';
for (const marker of [
  "fetch('nyra_personagem.json'", 'Nyra Character+Voxel Project v4',
  'function nyraGuideRobotFallback', 'new T.WebGLRenderer'
]) requireText(robot, marker, 'Official guide robot');

if (!fs.existsSync(characterPath)) failures.push('Official Character+Voxel v4 JSON is not packaged in Android assets');
else {
  const source = fs.readFileSync(characterPath, 'utf8');
  for (const marker of [
    'Nyra Character+Voxel Project v4', '"parts"', '"voxels"', '"objects"'
  ]) requireText(source, marker, 'Packaged character JSON');
}

const addStart = html.indexOf('function addModel(object,name,animations=[])');
const addEnd = html.indexOf('function makeManager(files)', addStart);
const addModel = addStart >= 0 && addEnd > addStart ? html.slice(addStart, addEnd) : '';
for (const marker of [
  'exportButtons.forEach(button=>button.disabled=false);',
  'exportBBButton.disabled=false;',
  'exportJSONButton.disabled=false;',
  "document.getElementById('nyraPerfReport').disabled=false;"
]) requireText(addModel, marker, 'Successful import action enablement');

for (const marker of [
  'new File(getCacheDir(), "nyra-rebuildable")',
  'getRebuildableCacheReport()',
  'clearRebuildableCache()', 'MAX_REBUILDABLE_CACHE_BYTES', 'REBUILDABLE_CACHE_RETENTION_MS', 'pruneRebuildableCache()', 'rebuildableCacheBytes() + data.length', 'limitBytes', 'retentionDays'
]) requireText(java, marker, 'Safe Android rebuildable cache');

// Execute the actual Nyra Scene Project serializer/deserializer against a minimal Three.js test double.
try {
  const assignment = 'const modelTools = ';
  const literalStart = html.indexOf(assignment) + assignment.length;
  const boundary = html.indexOf('const panelEnd = ', literalStart);
  const closingQuote = html.lastIndexOf('"', boundary);
  if (literalStart < assignment.length || boundary < 0 || closingQuote < literalStart) {
    throw new Error('Could not decode the model I/O template for JSON round-trip testing.');
  }
  const modelHtml = JSON.parse(html.slice(literalStart, closingQuote + 1));
  const markerIndex = modelHtml.indexOf('/* NyraModelIO:');
  const moduleStart = modelHtml.lastIndexOf('<script type="module">', markerIndex);
  const moduleEnd = modelHtml.indexOf('<\\/script>', markerIndex);
  if (markerIndex < 0 || moduleStart < 0 || moduleEnd < 0) throw new Error('Model I/O module boundary missing.');
  const moduleSource = modelHtml.slice(moduleStart + '<script type="module">'.length, moduleEnd);
  const serializerStart = moduleSource.indexOf('function nyraSerializeMaterial(');
  const parserEnd = moduleSource.indexOf('async function parseNyraCharacterProject', serializerStart);
  if (serializerStart < 0 || parserEnd < 0) throw new Error('Nyra Scene Project JSON functions missing.');
  class TestVector {
    constructor(){this.x=0;this.y=0;this.z=0;}
    toArray(){return [this.x,this.y,this.z];}
    fromArray(v){[this.x,this.y,this.z]=v;return this;}
    set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  }
  class TestEuler extends TestVector {
    constructor(){super();this.order='XYZ';}
    set(x,y,z,order='XYZ'){super.set(x,y,z);this.order=order;return this;}
  }
  class TestNode {
    constructor(){this.name='';this.position=new TestVector();this.rotation=new TestEuler();this.quaternion={toArray:()=>[0,0,0,1],fromArray:()=>{}};this.scale=new TestVector();this.scale.set(1,1,1);this.visible=true;this.children=[];this.userData={};}
    add(child){this.children.push(child);child.parent=this;}
  }
  class TestGroup extends TestNode {}
  class TestBone extends TestNode {}
  class TestAttribute {
    constructor(array,itemSize){this.array=Array.from(array);this.itemSize=itemSize;this.count=this.array.length/itemSize;}
  }
  class TestGeometry {
    constructor(){this.attributes={};this.groups=[];this.index=null;}
    setAttribute(name,value){this.attributes[name]=value;}
    setIndex(value){this.index={array:Array.from(value),count:value.length};}
    addGroup(start,count,materialIndex){this.groups.push({start,count,materialIndex});}
    computeVertexNormals(){this.attributes.normal=new TestAttribute([0,0,1,0,0,1,0,0,1],3);}
  }
  class TestMaterial {
    constructor(options={}){Object.assign(this,options);this.color={getHexString:()=>String(options.color||'#aabbcc').replace('#','')};}
  }
  class TestMesh extends TestNode {
    constructor(geometry,material){super();this.isMesh=true;this.geometry=geometry;this.material=material;}
  }
  const THREE={Group:TestGroup,Bone:TestBone,Mesh:TestMesh,BufferGeometry:TestGeometry,Float32BufferAttribute:TestAttribute,MeshStandardMaterial:TestMaterial};
  const context=vm.createContext({THREE,Map,Set,Number,String,Array,Object,Math,Error,JSON});
  vm.runInContext(moduleSource.slice(serializerStart,parserEnd)+'\nthis.nyraJsonApi={nyraCreateSceneJSON,nyraDeserializeObject};',context,{filename:'nyra-front-c-json-roundtrip.js'});
  const root=new TestGroup();root.name='C1 round-trip';
  const geometry=new TestGeometry();
  geometry.setAttribute('position',new TestAttribute([0,0,0,1,0,0,0,1,0],3));
  geometry.setAttribute('uv',new TestAttribute([0,0,1,0,0,1],2));
  geometry.setAttribute('normal',new TestAttribute([0,0,1,0,0,1,0,0,1],3));
  geometry.setIndex([0,1,2]);geometry.addGroup(0,3,0);
  const mesh=new TestMesh(geometry,new TestMaterial({name:'Steel',color:'#aabbcc',roughness:.7,metalness:.2}));
  mesh.name='Triangle';root.add(mesh);
  const project=context.nyraJsonApi.nyraCreateSceneJSON(root);
  assert.equal(project.format,'Nyra Scene Project v1');
  assert.equal(project.vertices,3);
  const restored=context.nyraJsonApi.nyraDeserializeObject(project.scene,{vertices:0,maxVertices:600000});
  assert.equal(restored.children[0].name,'Triangle');
  assert.equal(restored.children[0].geometry.attributes.uv.count,3);
  assert.equal(restored.children[0].geometry.index.count,3);
  assert.equal(restored.children[0].geometry.groups.length,1);
  assert.equal(Array.isArray(restored.children[0].material),false,'single-material meshes must restore one material, not a one-item array');
  assert.throws(()=>context.nyraJsonApi.nyraDeserializeObject({type:'mesh',geometry:{positions:[0,0,0]}},{vertices:0,maxVertices:600000}),/Geometria inválida/);
} catch (error) {
  failures.push('Nyra Scene Project JSON round-trip: ' + (error && error.message ? error.message : String(error)));
}

// Front B geometry symbols already exist in the shared Character editor.
 // Their presence in the base application is not evidence that Front B was
 // implemented by this branch. Scope isolation is validated by the changed-file
 // set and the separate roadmap/status record instead of brittle symbol absence.


if (failures.length) {
  failures.forEach(message => console.error('FAIL: ' + message));
  process.exit(1);
}
console.log('PASS: Front C UI, 23-step guide, official robot source/fallback, JSON I/O, staged performance metrics, import/export state and safe Android temporary-cache checks.');
