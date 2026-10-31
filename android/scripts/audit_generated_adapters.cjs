#!/usr/bin/env node
'use strict';

// Execute only the outer HTML bootstrap in a minimal DOM shim, generate each iframe
// document exactly as the app does, then syntax-check every inline script block.
const fs = require('node:fs');
const vm = require('node:vm');
const cp = require('node:child_process');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
// The Character Editor module script is nested inside a JS string. HTML still
// terminates the outer script on a literal </script>, even inside that string.
// Extract only the final closing tag that is part of the outer document.
const scriptTag = html.match(/<script\\b[^>]*>/i);
const scriptOpen = scriptTag ? scriptTag.index + scriptTag[0].length : -1;
const scriptEnd = scriptOpen >= 0 ? html.lastIndexOf('</script>') : -1;
const literalCloseCount = html.split('</script>').length - 1;
let outerSource = scriptEnd > scriptOpen ? html.slice(scriptOpen, scriptEnd) : '';
if (!outerSource || literalCloseCount !== 1) {
  console.error('FAIL: expected exactly one literal script closing tag in outer HTML');
  process.exit(1);
}
// Remove the injected model I/O template before parsing the outer bootstrap.
// The generated module is parsed from the final document below.
const modelStart = outerSource.indexOf('const modelTools = ');
if (modelStart >= 0) {
  const statementEnd = outerSource.indexOf('";', modelStart);
  const panelMarker = outerSource.indexOf('const panelEnd', modelStart);
  if (statementEnd < 0 || panelMarker < 0 || statementEnd > panelMarker) {
    console.error('FAIL: cannot isolate model I/O template in outer bootstrap');
    process.exit(1);
  }
  outerSource = outerSource.slice(0, modelStart) + 'const modelTools = "";' + outerSource.slice(statementEnd + 2);
}
const outerMatch = [null, outerSource];

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

checkJs('outer app bootstrap', outerMatch[1]);
vm.runInContext(outerMatch[1], context, { filename: 'nyra-outer-bootstrap.js' });

const generated = vm.runInContext(`({
  items: addAndroidExportAdapter(decodePage(pages.items), 'items'),
  character: addAndroidExportAdapter(decodePage(pages.character), 'character'),
  animation: addAndroidExportAdapter(decodePage(pages.animation), 'animation')
})`, context);

const requiredByEditor = {
  items: ['/assets/www/vendor/jszip/jszip.min.js'],
  character: ['/assets/www/vendor/three/build/three.module.js', 'three/addons/controls/OrbitControls.js', 'three/addons/loaders/GLTFLoader.js', 'three/addons/loaders/OBJLoader.js', 'three/addons/loaders/FBXLoader.js', 'three/addons/loaders/STLLoader.js', 'three/addons/exporters/GLTFExporter.js', 'three/addons/exporters/OBJExporter.js', 'three/addons/exporters/STLExporter.js'],
  animation: ['/assets/www/vendor/three/build/three.module.js', '/assets/www/vendor/three/examples/jsm/'],
};
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
    character: ['nyra.character.draft.v1', 'nyra.character.draft.mode.v1', 'Rascunho JSON local restaurado automaticamente.'],
    animation: ['nyra3d-robotv-project'],
  };
  for (const marker of editorSpecificMarkers[name] || []) {
    if (!page.includes(marker)) {
      console.error('FAIL: generated ' + name + ' editor lacks persistence marker ' + marker);
      process.exitCode = 1;
    }
  }

  for (const marker of [...(requiredByEditor[name] || []), ...requiredExportMarkers, ...(name === 'character' ? ['NyraModelIO', 'Importar modelo 3D', 'selectModel(importedModel)', 'animations:importedAnimations'] : [])]) {
    if (!page.includes(marker)) {
      console.error('FAIL: generated ' + name + ' document is missing ' + marker);
      process.exitCode = 1;
    }
  }
  if (name === 'character') {
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
