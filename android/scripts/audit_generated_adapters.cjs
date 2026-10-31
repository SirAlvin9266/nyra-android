#!/usr/bin/env node
'use strict';

// Execute only the outer HTML bootstrap in a minimal DOM shim, generate each iframe
// document exactly as the app does, then syntax-check every inline script block.
const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
const path = require('node:path');

const hostUiMarkers = ['nyraDesktopCanvasToggle', 'nyra_desktop_canvas', 'nyra_ui_zoom', 'applyEditorZoom', 'min(100,zoom)'];
const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
// The Character Editor module script is nested inside a JS string. HTML still
// terminates the outer script on a literal </script>, even inside that string.
// Extract only the final closing tag that is part of the outer document.
const scriptTag = html.match(/<script\b[^>]*>/i);
const scriptOpen = scriptTag ? scriptTag.index + scriptTag[0].length : -1;
const scriptEnd = scriptOpen >= 0 ? html.lastIndexOf('</script>') : -1;
const literalCloseCount = html.split('</script>').length - 1;
let outerSource = scriptEnd > scriptOpen ? html.slice(scriptOpen, scriptEnd) : '';
if (!outerSource || literalCloseCount !== 1) {
  console.error('FAIL: expected exactly one literal script closing tag in outer HTML');
  process.exit(1);
}
// The outer bootstrap is source-checked by audit_reference.py. To exercise
// the Android adapter, execute the complete source including the modelTools
// string; then inspect the generated documents and parse their inline modules.
const outerSourceForExecution = outerSource;

const frames = [];
const host = { appendChild(frame) { frames.push(frame); frame.parentNode = host; } };
const message = { textContent: '' };
const document = {
  getElementById(id) {
    if (id === 'editorHost') return host;
    if (id === 'message') return message;
    return { textContent: '', style: {}, appendChild() {}, setAttribute() {}, addEventListener() {} };
  },
  querySelectorAll() { return []; },
  createElement(tag) {
    return {
      tagName: String(tag).toUpperCase(),
      style: {},
      dataset: {},
      classList: { toggle() {} },
      setAttribute() {},
      addEventListener() {},
    };
  },
  addEventListener() {},
};
const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const window = { addEventListener() {} };
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

// The modelTools literal is now escaped for the enclosing HTML script context,
// so execute the real host bootstrap and inspect its actual generated editor pages.
checkJs('outer app bootstrap', outerSourceForExecution);
vm.runInContext(outerSourceForExecution, context, { filename: 'nyra-outer-bootstrap.js' });

const generated = vm.runInContext(`({
  items: addAndroidExportAdapter(decodePage(pages.items), 'items'),
  character: addAndroidExportAdapter(decodePage(pages.character), 'character'),
  animation: addAndroidExportAdapter(decodePage(pages.animation), 'animation')
})`, context);

// The sanitized bootstrap uses an empty modelTools placeholder for evaluation.
// Reattach the exact model I/O HTML source extracted from the host adapter.
const requiredByEditor = {
  items: ['/assets/www/vendor/jszip/jszip.min.js'],
  character: ['/assets/www/vendor/three/build/three.module.js'],
  animation: ['/assets/www/vendor/three/build/three.module.js', '/assets/www/vendor/three/examples/jsm/'],
};
const blockbenchMarkers = [
  'async function parseBBModel(file)',
  'function bbCoordinate(',
  'function bbEuler(',
  'new THREE.TextureLoader()',
  'new THREE.BufferGeometry()',
  'new THREE.BoxGeometry(',
  'bbImportedMeshes',
  'bbModelAnimationCount',
  "extension==='bbmodel'",
];
const requiredExportMarkers = [
  'HTMLAnchorElement.prototype.click',
  'beginExport',
  'appendExportChunk',
  'finishExport',
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

  for (const marker of [...(requiredByEditor[name] || []), ...requiredExportMarkers, ...(name === 'character' ? ['NyraModelIO', 'Importar modelo 3D', 'selectModel(importedModel)', 'animations:importedAnimations', 'function validateMathDocument(', 'function buildMathModel(', 'function geometryForMathComponent(', 'function generateMathModel(', 'async function parseBBModel(file)', 'function bbCoordinate(', 'function bbEuler(', 'new THREE.TextureLoader()', 'new THREE.BufferGeometry()', 'new THREE.BoxGeometry(', 'bbImportedMeshes', 'bbModelAnimationCount', "extension==='bbmodel'"] : [])]) {
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
    const moduleEnd = page.indexOf('</script>', moduleIndex);
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
