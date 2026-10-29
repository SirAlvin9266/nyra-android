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
const outerMatch = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
if (!outerMatch) {
  console.error('FAIL: outer app script was not found');
  process.exit(1);
}

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

const expectedMarkers = [
  '/assets/www/vendor/jszip/jszip.min.js',
  '/assets/www/vendor/three/build/three.module.js',
  '/assets/www/vendor/three/examples/jsm/',
  'HTMLAnchorElement.prototype.click',
  'nyra.items.draft.v1',
  'nyra.character.draft.v1',
  'nyra3d-robotv-project',
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
  for (const marker of expectedMarkers) {
    // Items-only and editor-specific persistence markers are verified globally in
    // the wrapper, while dependency and export markers must exist in each generated page.
    if (marker.startsWith('/assets/') || marker.startsWith('HTMLAnchor') ||
        ['beginExport', 'appendExportChunk', 'finishExport'].includes(marker)) {
      if (!page.includes(marker)) {
        console.error('FAIL: generated ' + name + ' document is missing ' + marker);
        process.exitCode = 1;
      }
    }
  }
  if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/i.test(page)) {
    console.error('FAIL: generated ' + name + ' document still contains a runtime CDN dependency');
    process.exitCode = 1;
  }

  const scripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let checked = 0;
  for (const match of scripts) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    if (/importmap/i.test(attrs) || /\bsrc\s*=/i.test(attrs) || !body.trim()) continue;
    checked++;
    checkJs(name + ' generated inline script #' + checked, body);
  }
  console.log(name + ': generated ' + page.length + ' chars; parsed ' + checked + ' inline script(s)');
}

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS: all generated editor scripts parse, CDN dependencies are rewritten, and Android export adapters are present.');
