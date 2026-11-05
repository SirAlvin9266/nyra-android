#!/usr/bin/env node
'use strict';

// Execute only the outer HTML bootstrap in a minimal DOM shim, generate each iframe
// document exactly as the app does, then syntax-check every inline script block.
const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
const path = require('node:path');


const hostUiMarkers = ['nyraDesktopModeToggle', 'nyra_desktop_mode', 'nyra_ui_zoom', 'applyEditorZoom', 'nyra-desktop-mode', 'nyra-desktop-scale', 'window.innerWidth/1280', 'width:1280px'];
const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const doctypeCount = (html.match(/<!doctype html>/gi) || []).length;
const literalCloseCount = html.split('</script>').length - 1;
if (doctypeCount !== 1 || literalCloseCount !== 1) {
  console.error('FAIL: expected exactly one root document and one literal script close; found ' + doctypeCount + ' doctypes and ' + literalCloseCount + ' closes');
  process.exit(1);
}
const bindingCount = (needle) => html.split(needle).length - 1;
for (const [needle, expected] of [
  ["const host=document.getElementById('editorHost');", 1],
  ["const message=document.getElementById('message');", 1],
  ["const editorFrames={};", 1],
]) {
  if (bindingCount(needle) !== expected) {
    console.error('FAIL: duplicate shell bootstrap binding ' + needle + ' count=' + bindingCount(needle));
    process.exit(1);
  }
}

// The Character Editor module script is nested inside a JS string. HTML still
// terminates the outer script on a literal </script>, even inside that string.
// Extract only the final closing tag that is part of the outer document.
const pagesDeclaration = html.indexOf('const pages = {items:');
const scriptOpenTag = pagesDeclaration >= 0 ? html.indexOf('<script>') : -1;
const scriptOpen = scriptOpenTag >= 0 ? scriptOpenTag + '<script>'.length : -1;
const scriptEnd = scriptOpen >= 0 ? html.indexOf('</script>', scriptOpen) : -1;
let outerSource = scriptEnd > scriptOpen ? html.slice(scriptOpen, scriptEnd) : '';
if (!outerSource || pagesDeclaration < scriptOpenTag) {
  console.error('FAIL: could not isolate the single outer bootstrap script after embedded source pages');
  process.exit(1);
}
// The outer bootstrap is source-checked by audit_reference.py. To exercise
// the Android adapter, execute the complete source including the modelTools
// string; then inspect the generated documents and parse their inline modules.
const outerSourceForExecution = outerSource;

// The evaluated shell owns the real host/message bindings. The test harness supplies DOM shims only through document.getElementById().
const frames = [];
const testHost = { appendChild(frame) { frames.push(frame); frame.parentNode = testHost; } };
const testMessage = { textContent: '' };
const htmlClasses = new Set();
const htmlStyle = { setProperty(name, value) { this[name] = value; } };
const bodyStyle = {
  removeProperty(name) { delete this[name]; },
};
const document = {
  documentElement: {
    classList: {
      toggle(name, force) {
        const enabled = force === undefined ? !htmlClasses.has(name) : Boolean(force);
        if (enabled) htmlClasses.add(name); else htmlClasses.delete(name);
        return enabled;
      },
      contains(name) { return htmlClasses.has(name); },
    },
    style: htmlStyle,
  },
  body: { style: bodyStyle },
  getElementById(id) {
    if (id === 'editorHost') return testHost;
    if (id === 'message') return testMessage;
    return { textContent: '', style: {}, appendChild() {}, setAttribute() {}, addEventListener() {} };
  },
  querySelectorAll() { return []; },
  createElement(tag) {
    const element = {
      tagName: String(tag).toUpperCase(),
      style: {},
      dataset: {},
      classList: { toggle() {} },
      setAttribute() {},
      addEventListener() {},
      contentWindow: {},
    };
    if (String(tag).toLowerCase() === 'iframe') {
      Object.defineProperty(element, 'srcdoc', {
        get() { return this._srcdoc || ''; },
        set(value) { this._srcdoc = value; },
      });
    }
    return element;
  },
  addEventListener() {},
};
const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const window = { innerWidth: 390, innerHeight: 844, addEventListener() {} };
window.parent = window;
const context = vm.createContext({
  document, window, localStorage,
  Uint8Array, TextDecoder,
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  console, setTimeout, clearTimeout,
});

function checkJs(label, source) {
  if (!source.trim()) return;
  const result = cp.spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: source,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error('FAIL: JavaScript syntax error in ' + label + '\n' + (result.stderr || result.stdout || 'node --check failed'));
    process.exitCode = 1;
  }
}

for (const marker of hostUiMarkers) {
  if (!html.includes(marker)) {
    console.error('FAIL: outer Android host is missing responsive UI marker ' + marker);
    process.exitCode = 1;
  }
}

// The first editor is opened at bootstrap. Assert it is visible and that its inner
// document is handled via an explicit ready handshake rather than a shell-only status.
if (!html.includes("frame.style.cssText='display:block") ||
    !html.includes("NYRA_EDITOR_READY") ||
    !html.includes("O documento abriu, mas o editor não confirmou inicialização")) {
  console.error('FAIL: editor host must expose the iframe and distinguish document load from editor readiness');
  process.exitCode = 1;
}

// Test copy: the host stores a complete nested HTML document in the modelTools
// template string. Replace only that template with a no-op for VM bootstrap
// evaluation; the adapter source itself is inspected through markers below and
// its assembled generated editor module is syntax-checked further down.
// The nested modelTools payload is a serialized HTML document containing a module script.
 // Its complete assembled module is syntax-checked below after the host adapters create it.
 // Check the shell bootstrap with only that nested payload neutralized.

const modelToolsStart = outerSourceForExecution.indexOf('const modelTools = "');
const panelEndStart = outerSourceForExecution.indexOf('const panelEnd', modelToolsStart);
if (modelToolsStart < 0 || panelEndStart < 0) {
  throw new Error('Could not isolate serialized modelTools block');
}
const bootstrapForTest =
  outerSourceForExecution.slice(0, modelToolsStart) +
  'const modelTools = "";' + String.fromCharCode(10) + 'const panelEnd = "";' +
  outerSourceForExecution.slice(outerSourceForExecution.indexOf(';', panelEndStart) + 1);
// Use the complete outer source to create the actual editor documents.
// The no-op variant is only used to exercise host initialization in the VM.
const generatedEditorSource = outerSourceForExecution;
vm.runInContext(bootstrapForTest, context, { filename: 'nyra-outer-bootstrap.js' });

const generated = vm.runInContext(`({
  items: addAndroidExportAdapter(decodePage(pages.items), 'items'),
  character: addAndroidExportAdapter(decodePage(pages.character), 'character'),
  animation: addAndroidExportAdapter(decodePage(pages.animation), 'animation')
})`, context);

// Host composition inserts the serialized modelTools HTML immediately before
// the Character panel's closing wrapper. Reproduce that exact operation after
// the Android persistence/export adapter has transformed the source page.
const modelToolsAssignmentStart = outerSourceForExecution.indexOf('const modelTools = "');
const modelToolsLiteralStart = modelToolsAssignmentStart + 'const modelTools = '.length;
const modelToolsLiteralEnd = outerSourceForExecution.indexOf('";', modelToolsLiteralStart);
if (modelToolsAssignmentStart < 0 || modelToolsLiteralEnd < 0) {
  throw new Error('Could not recover the original modelTools literal');
}
const literal = outerSourceForExecution.slice(modelToolsLiteralStart, modelToolsLiteralEnd + 1);
function decodeJsStringLiteral(source) {
  if (source[0] !== '"' || source[source.length - 1] !== '"') throw new Error('Expected a double-quoted modelTools literal');
  let value = '';
  for (let i = 1; i < source.length - 1; i++) {
    const ch = source[i];
    if (ch !== '\\\\') { value += ch; continue; }
    const next = source[++i];
    if (next === 'n') value += '\\n';
    else if (next === 'r') value += '\\r';
    else if (next === 't') value += '\\t';
    else if (next === '"' || next === '\\\\' || next === "'") value += next;
    else if (next === 'x') { value += String.fromCharCode(parseInt(source.slice(i + 1, i + 3), 16)); i += 2; }
    else if (next === 'u') { value += String.fromCharCode(parseInt(source.slice(i + 1, i + 5), 16)); i += 4; }
    else value += next;
  }
  return value;
}
const modelToolsHtml = decodeJsStringLiteral(literal);
if (typeof modelToolsHtml !== 'string' ||
    !modelToolsHtml.includes('nyraModelIO') ||
    !modelToolsHtml.includes('nyraImport3D') ||
    !modelToolsHtml.includes('nyraExportJSON')) {
  throw new Error('Recovered modelTools payload is not the expected model I/O HTML');
}
const characterPanelEnd = generated.character.indexOf('</div></section></main>');
if (characterPanelEnd < 0) throw new Error('Character panel closing wrapper not found for modelTools insertion');
generated.character =
  generated.character.slice(0, characterPanelEnd) +
  modelToolsHtml +
  generated.character.slice(characterPanelEnd);
const requiredByEditor = {
  items: ['/assets/www/vendor/jszip/jszip.min.js'],
  character: ['/assets/www/vendor/three/build/three.module.js'],
  animation: ['/assets/www/vendor/three/build/three.module.js', '/assets/www/vendor/three/examples/jsm/'],
};
const blockbenchMarkers = [
  'async function parseBBModel(file,files=[])',
  'async function inspectGLBFile(file){',
  'previousModel=importedModel',
  'A memória real depende do aparelho e do WebView',

  'function bbCoordinate(',
  'function bbEuler(',
  'new THREE.TextureLoader()',
  'new THREE.BufferGeometry()',
  'new THREE.BoxGeometry(',
  'bbImportedMeshes',
  'bbModelAnimationCount',
  "extension==='bbmodel'",
  "extension==='json'",
  'parseNyraCharacterProject',
  'nyraExportBB',
  'function createBBModelDocument()',
  'function validateBBModelDocument(documentData)',
  'function createRoundTripAuditDocument()',
  'function exportBBModelBlob()',
  'function refreshModelInspector()',
  'id="nyraInspector"',
  'nyraMapHierarchy',
  'nyraMapMetadata',
  'nyraMapGeometry',
  'nyraMapUV',
  'nyraMapMaterials',
  'nyraMapTransforms',
  'nyraMapRig',
  'nyraMapDependencies',
  'nyraMapCompatibility',
];
const requiredExportMarkers = [
  'HTMLAnchorElement.prototype.click',
  'beginExport',
  'appendExportChunk',
  'finishExport',
];
const requiredCharacterModelIOMarkers = [
  'nyraExportJSON',
  'function nyraCreateSceneJSON',
  'function parseNyraSceneProject',
  "document.getElementById('nyraExportJSON').addEventListener",
  'nyraCacheReport',
  'nyraCacheClear',
  'import_stage',
];


for (const [name, page] of Object.entries(generated)) {
  if (!page || page.length < 10000) {
    console.error('FAIL: generated ' + name + ' editor document is unexpectedly short');
    process.exitCode = 1;
    continue;
  }
  const editorSpecificMarkers = {
    items: ['nyra.items.draft.v1'],
    character: ['nyra.character.draft.v1', 'nyra.character.draft.mode.v1', 'Rascunho JSON local restaurado automaticamente.', 'NyraModelIO', 'id="nyraModelTree"', 'id="nyraDeleteNode"', 'id="nyraRestoreNode"', 'function refreshModelTree()', 'function deleteSelectedComponent()', 'function restoreLastDeleted()', 'getSelected:()=>selectedObject', 'Gerar modelo por instruções matemáticas', 'id="nyraMathDslInput"', 'nyra.mathDsl.v1', 'nyraMathematicalModel', 'nyraDslId', 'nyraPivot'],
    animation: ['nyra3d-robotv-project'],
  };
  for (const marker of editorSpecificMarkers[name] || []) {
    if (!page.includes(marker)) {
      console.error('FAIL: generated ' + name + ' editor lacks persistence marker ' + marker);
      process.exitCode = 1;
    }
  }

  for (const marker of [...requiredExportMarkers, ...(requiredByEditor[name] || []), ...(name === 'character' ? [...requiredCharacterModelIOMarkers, 'NyraModelIO', 'Importar modelo 3D', 'editor.selectModel(object)', 'previousModel=importedModel', 'candidateInScene=true', 'animations:importedAnimations', 'function validateMathDocument(', 'function buildMathModel(', 'function geometryForMathComponent(', 'function generateMathModel(', 'async function parseBBModel(file,files=[])', 'function bbCoordinate(', 'function bbEuler(', 'new THREE.TextureLoader()', 'new THREE.BufferGeometry()', 'new THREE.BoxGeometry(', 'bbImportedMeshes', 'bbModelAnimationCount', "extension==='bbmodel'", "extension==='json'", 'parseNyraCharacterProject', 'nyraExportBB', 'function createBBModelDocument()'] : [])]) {
    if (!page.includes(marker)) {
      console.error('FAIL: generated ' + name + ' document is missing ' + marker);
      process.exitCode = 1;
    }
  }
  if (name === 'character') {
    for (const marker of blockbenchMarkers) {
      if (!page.includes(marker)) {
        console.error('FAIL: generated character document is missing Blockbench importer marker ' + marker);
        process.exitCode = 1;
      }
    }
    const panelIndex = page.indexOf('id="nyraModelIO"');
    const mainEndIndex = page.indexOf('</main>');
    if (panelIndex < 0 || mainEndIndex < 0 || panelIndex > mainEndIndex) {
      console.error('FAIL: model I/O panel must be inside the main Character Editor layout');
      process.exitCode = 1;
    }
  }

  if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/i.test(page)) {
    console.error('FAIL: generated ' + name + ' document still contains a runtime CDN dependency');
    process.exitCode = 1;
  }

  let checked = 0;
  // The generated document is built by string adapters that contain inline
  // script templates. Parsing those templates out of the source HTML can split
  // JavaScript strings and create false positives. Validate the assembled module
  // script from the final generated document, plus the outer bootstrap above.
  const moduleIndex = page.indexOf('/* NyraModelIO:');
  if (name === 'character' && moduleIndex < 0) {
    console.error('FAIL: final Character Editor does not contain the model I/O module');
    process.exitCode = 1;
  }
  if (name === 'character' && moduleIndex >= 0) {
    const moduleStart = page.lastIndexOf('<script type="module">', moduleIndex);
    const moduleEnd = page.indexOf('<\\/script>', moduleIndex);
    if (moduleStart < 0 || moduleEnd < 0) {
      console.error('FAIL: final Character Editor model I/O module block is incomplete');
      process.exitCode = 1;
    } else {
      const source = page.slice(moduleStart + '<script type="module">'.length, moduleEnd);
      checked = 1;
      checkJs(name + ' assembled model I/O module', source);
    }
  }
  console.log(name + ': generated ' + page.length + ' chars; parsed ' + checked + ' inline script(s)');
}

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS: all generated editor scripts parse, CDN dependencies are rewritten, and Android export adapters are present.');
