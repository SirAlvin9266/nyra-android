#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const htmlPath = path.resolve(__dirname, '..', 'app/src/main/assets/www/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/const pages = \{items: "([^"]+)", character: "([^"]+)", animation: "([^"]+)"\};/);
if (!match) throw new Error('Não foi possível localizar os três payloads Base64.');
const [items, character, animation] = match.slice(1).map(value => Buffer.from(value, 'base64').toString('utf8'));
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };
function collectIds(source) { return [...source.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]); }
function checkUniqueIds(source, label) {
  const all = collectIds(source);
  const duplicates = all.filter((id, index) => all.indexOf(id) !== index);
  check(!duplicates.length, label + ' contém IDs repetidos: ' + [...new Set(duplicates)].join(', '));
}
for (const [name, source] of Object.entries({ items, character, animation })) {
  checkUniqueIds(source, name);
  let scriptNumber = 0;
  for (const script of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/importmap/i.test(script[1]) || !script[2].trim()) continue;
    scriptNumber++;
    const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: script[2], encoding: 'utf8' });
    check(result.status === 0, name + ' script #' + scriptNumber + ' inválido: ' + (result.stderr || result.stdout || '').slice(0, 500));
  }
}
for (const id of ['texture','preview','paintColor','erasePixel','resetTexture','download','toggleGrid','downloadJson','downloadAddon','gridResolution','itemId']) check(items.includes('id="' + id + '"'), 'Oficina sem controle ' + id);
for (const fn of ['paintMatrix','editPixel','saveMatrix','downloadBlob','render']) check(new RegExp('function\\s+' + fn + '\\s*\\(').test(items), 'Oficina sem função ' + fn);
check(/addEventListener\(['"]pointerdown['"]\s*,\s*editPixel/.test(items), 'Oficina sem pointerdown ligado diretamente a editPixel');
for (const id of ['view','partColor','hue','sat','lum','shapeType','addShape','deleteSelected','restorePart','save','load','file','saveBBModel','status']) check(character.includes('id="' + id + '"'), 'Criador sem controle ' + id);
for (const fn of ['project','apply','importBBModelFile','buildBBModel','pushUndo','undoLast','addVoxel','setVoxelMode']) check(new RegExp('function\\s+' + fn + '\\s*\\(').test(character), 'Criador sem função ' + fn);
for (const id of ['viewport','joint','rx','ry','rz','addFrame','duplicateFrame','deleteFrame','play','stop','saveProject','loadProject','exportProject','exportAnim']) check(animation.includes('id="' + id + '"'), 'RoboTV sem controle ' + id);
for (const fn of ['getPose','setPose','interpolate','projectData','renderFrames','playLoop','stopPlayback']) check(new RegExp('function\\s+' + fn + '\\s*\\(').test(animation), 'RoboTV sem função ' + fn);
check(html.includes('function addAndroidExportAdapter'), 'Shell sem adaptador Android');
check(html.includes('function ensureEditor'), 'Shell sem bootstrap dos iframes');
check(html.includes('nyraGuideSteps'), 'Shell sem etapas do Guia');
if (errors.length) {
  console.error('FALHA na auditoria de controles:');
  for (const error of errors) console.error(' - ' + error);
  process.exit(1);
}
console.log('PASS: estrutura dos três editores, IDs, funções e sintaxe dos scripts verificados.');
console.log('NOTA: teste estático; não prova interação no WebView, WebGL, toque ou exportação Android.');
