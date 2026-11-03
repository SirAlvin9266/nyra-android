#!/usr/bin/env node
'use strict';

// Unit tests for the mathematical-model DSL embedded in the Character Editor.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const htmlPath = path.resolve(__dirname, '../app/src/main/assets/www/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const assignment = 'const modelTools = ';
const assignmentStart = html.indexOf(assignment);
const assignmentEnd = html.indexOf('";', assignmentStart);
if (assignmentStart < 0 || assignmentEnd < 0) {
  throw new Error('Model I/O template is missing from the Android host page.');
}
const modelToolsHtml = JSON.parse(html.slice(assignmentStart + assignment.length, assignmentEnd + 1));
const moduleMarker = '/* NyraModelIO:';
const moduleMarkerIndex = modelToolsHtml.indexOf(moduleMarker);
const moduleStart = modelToolsHtml.lastIndexOf('<script type="module">', moduleMarkerIndex);
// The nested module close is escaped so it does not terminate the outer HTML script.
const escapedModuleEnd = modelToolsHtml.indexOf('<\\/script>', moduleMarkerIndex);
const literalModuleEnd = modelToolsHtml.indexOf('</script>', moduleMarkerIndex);
const moduleEnd = escapedModuleEnd >= 0 ? escapedModuleEnd : literalModuleEnd;
if (moduleMarkerIndex < 0 || moduleStart < 0 || moduleEnd < 0) {
  throw new Error('Could not extract the Character Editor model module.');
}
const moduleSource = modelToolsHtml.slice(moduleStart + '<script type="module">'.length, moduleEnd);

const validationStart = moduleSource.indexOf('function mathVector(');
const geometryStart = moduleSource.indexOf('function geometryForMathComponent(', validationStart);
const buildStart = moduleSource.indexOf('function buildMathModel(', geometryStart);
if (validationStart < 0 || geometryStart < 0 || buildStart < 0) {
  throw new Error('Mathematical DSL validation or geometry functions are missing.');
}

const context = vm.createContext({ Map, Set, Number, String, Array, Object, Math, Error });
vm.runInContext(
  moduleSource.slice(validationStart, geometryStart)
    + '\nthis.validateMathDocument = validateMathDocument;',
  context,
  { filename: 'nyra-math-dsl-validation.js' }
);

const validDocument = {
  version: 1,
  name: 'Test model',
  components: [
    { id: 'root', type: 'group', name: 'Root' },
    { id: 'torso', type: 'box', name: 'Torso', parent: 'root', size: [1, 2, 0.5], position: [0, 1, 0], pivot: [0, 0.5, 0] },
    { id: 'head', type: 'sphere', name: 'Head', parent: 'root', radius: 0.4, color: '#aabbcc' },
    { id: 'arm', type: 'cylinder', name: 'Arm', parent: 'root', radiusTop: 0.1, radiusBottom: 0.15, height: 0.9 }
  ]
};
const normalized = context.validateMathDocument(validDocument);
assert.equal(normalized.name, 'Test model');
assert.equal(normalized.components.length, 4);
assert.deepEqual(Array.from(normalized.components[1].position), [0, 1, 0]);
assert.deepEqual(Array.from(normalized.components[1].pivot), [0, 0.5, 0]);
assert.equal(normalized.components[1].segments, 24);

function expectInvalid(label, document, expectedMessage) {
  let caught = null;
  try {
    context.validateMathDocument(document);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, label + ': expected a validation error');
  assert.ok(String(caught.message).includes(expectedMessage),
    label + ': expected error containing "' + expectedMessage + '", got "' + caught.message + '"');
}

expectInvalid('unsupported version', {version: 2, components: validDocument.components}, 'version: 1');
expectInvalid('duplicate id', {
  version: 1,
  components: [
    {id: 'same', type: 'group', name: 'A'},
    {id: 'same', type: 'box', name: 'B'}
  ]
}, 'Id duplicado');
expectInvalid('missing parent', {
  version: 1,
  components: [{id: 'x', type: 'box', name: 'X', parent: 'missing'}]
}, 'parent inexistente');
expectInvalid('hierarchy cycle', {
  version: 1,
  components: [
    {id: 'a', type: 'group', name: 'A', parent: 'b'},
    {id: 'b', type: 'group', name: 'B', parent: 'a'}
  ]
}, 'Ciclo detectado');
expectInvalid('invalid position vector', {
  version: 1,
  components: [{id: 'x', type: 'box', name: 'X', position: [1, 2]}]
}, 'position deve ter três números');
expectInvalid('non-positive size', {
  version: 1,
  components: [{id: 'x', type: 'box', name: 'X', size: [1, 0, 1]}]
}, 'size deve conter valores positivos');
expectInvalid('invalid color', {
  version: 1,
  components: [{id: 'x', type: 'box', name: 'X', color: 'red'}]
}, 'color deve usar #RRGGBB');
expectInvalid('too many components', {
  version: 1,
  components: Array.from({length: 501}, (_, i) => ({id: 'g' + i, type: 'group', name: 'G' + i}))
}, 'limite atual é de 500');

class TestGeometry {
  constructor(kind, args) { this.kind = kind; this.args = args; }
}
context.THREE = {
  BoxGeometry: class extends TestGeometry { constructor(...args) { super('box', args); } },
  SphereGeometry: class extends TestGeometry { constructor(...args) { super('sphere', args); } },
  CylinderGeometry: class extends TestGeometry { constructor(...args) { super('cylinder', args); } },
  ConeGeometry: class extends TestGeometry { constructor(...args) { super('cone', args); } },
};
vm.runInContext(
  moduleSource.slice(geometryStart, buildStart)
    + '\nthis.geometryForMathComponent = geometryForMathComponent;',
  context,
  { filename: 'nyra-math-dsl-geometry.js' }
);
const geom = context.geometryForMathComponent;
assert.equal(geom(normalized.components[1]).kind, 'box');
assert.equal(geom(normalized.components[2]).kind, 'sphere');
assert.equal(geom(normalized.components[3]).kind, 'cylinder');
assert.equal(geom({...normalized.components[3], type: 'cone'}).kind, 'cone');
assert.equal(geom(normalized.components[1]).args[1], 2);

console.log('PASS: mathematical DSL accepts valid hierarchies and rejects invalid IDs, parents, cycles, vectors, dimensions, colors and oversized documents.');
console.log('PASS: box, sphere, cylinder and cone geometry constructors receive the expected parameters.');
