#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

// Front B geometry symbols already exist in the shared Character editor.
 // Their presence in the base application is not evidence that Front B was
 // implemented by this branch. Scope isolation is validated by the changed-file
 // set and the separate roadmap/status record instead of brittle symbol absence.


if (failures.length) {
  failures.forEach(message => console.error('FAIL: ' + message));
  process.exit(1);
}
console.log('PASS: Front C UI, 23-step guide, official robot source/fallback, JSON I/O, staged performance metrics, import/export state and safe Android temporary-cache checks.');
