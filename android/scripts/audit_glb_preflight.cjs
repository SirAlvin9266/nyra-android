#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const html=fs.readFileSync(path.resolve(__dirname,'../app/src/main/assets/www/index.html'),'utf8');
function extractModelTools(source){
  const assignment='const modelTools = ';
  const start=source.indexOf(assignment);
  if(start<0)throw new Error('Model I/O template is missing from the Android host page.');
  const literalStart=start+assignment.length;
  const endMarker='\\n  const panelEnd = ';
  const end=source.indexOf(endMarker,literalStart);
  if(end<0)throw new Error('Host template boundary after modelTools was not found.');
  const closingQuote=end-1;
  if(source[closingQuote]!=='"')throw new Error('Closing quote for modelTools is not at the expected boundary.');
  return JSON.parse(source.slice(literalStart,closingQuote+1));
}
const modelTools=extractModelTools(html);
const moduleStart=modelTools.indexOf('<script type="module">');
// The outer HTML stores this nested module close escaped so it does not
// terminate the shell script. JSON.parse restores the backslash in this string.
const escapedClose='<'+String.fromCharCode(92)+'/script>';
const escapedModuleEnd=modelTools.indexOf(escapedClose,moduleStart);
const literalModuleEnd=modelTools.indexOf('</script>',moduleStart);
const moduleEnd=escapedModuleEnd>=0?escapedModuleEnd:literalModuleEnd;
assert.ok(moduleStart>=0&&moduleEnd>moduleStart,'Model I/O module must exist');
const moduleSource=modelTools.slice(moduleStart+'<script type="module">'.length,moduleEnd);
const preflightStart=moduleSource.indexOf('async function inspectGLBFile');
const parseStart=moduleSource.indexOf('async function parseModel',preflightStart);
assert.ok(preflightStart>=0&&parseStart>preflightStart,'GLB structural preflight must exist');

const context=vm.createContext({DataView,TextDecoder,JSON,Number,Math,Error});
vm.runInContext(moduleSource.slice(preflightStart,parseStart)+'\nthis.inspectGLBFile=inspectGLBFile;',context,{filename:'nyra-glb-preflight.js'});

function makeGlb(documentData){
  const json=Buffer.from(JSON.stringify(documentData));
  const paddedLength=(json.length+3)&~3;
  const padded=Buffer.alloc(paddedLength,0x20);
  json.copy(padded);
  const totalLength=12+8+paddedLength;
  const result=Buffer.alloc(totalLength);
  result.writeUInt32LE(0x46546c67,0);
  result.writeUInt32LE(2,4);
  result.writeUInt32LE(totalLength,8);
  result.writeUInt32LE(paddedLength,12);
  result.writeUInt32LE(0x4e4f534a,16);
  padded.copy(result,20);
  return result;
}
function fileFrom(bytes){
  return {
    size:bytes.length,
    slice(start,end){
      const part=bytes.subarray(start,end);
      return {arrayBuffer:async()=>part.buffer.slice(part.byteOffset,part.byteOffset+part.byteLength)};
    }
  };
}
async function expectReject(bytes,label){
  let caught=null;
  try{await context.inspectGLBFile(fileFrom(bytes));}catch(error){caught=error;}
  assert.ok(caught,label+': an invalid file must be rejected');
}

(async()=>{
  const valid={
    asset:{version:'2.0'},
    buffers:[{byteLength:36}],
    accessors:[{count:3},{count:3}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,mode:4}]}],
    images:[{bufferView:0,mimeType:'image/jpeg'},{bufferView:1,mimeType:'image/jpeg'}],
    textures:[{source:0},{source:1}],
    materials:[{name:'test'}]
  };
  const bytes=makeGlb(valid);
  const report=await context.inspectGLBFile(fileFrom(bytes));
  assert.equal(report.vertexCount,3);
  assert.equal(report.triangleCount,1);
  assert.equal(report.primitiveCount,1);
  assert.equal(report.meshCount,1);
  assert.equal(report.imageCount,2);
  assert.equal(report.textureCount,2);
  assert.equal(report.materialCount,1);
  assert.ok(report.estimatedMiB>=report.fileMiB);

  const wrongMagic=Buffer.from(bytes);wrongMagic.writeUInt32LE(0xdeadbeef,0);
  await expectReject(wrongMagic,'invalid GLB signature');
  const wrongVersion=Buffer.from(bytes);wrongVersion.writeUInt32LE(1,4);
  await expectReject(wrongVersion,'unsupported GLB version');
  const wrongSize=Buffer.from(bytes);wrongSize.writeUInt32LE(bytes.length+8,8);
  await expectReject(wrongSize,'declared length mismatch');
  const wrongChunk=Buffer.from(bytes);wrongChunk.writeUInt32LE(0x004e4942,16);
  await expectReject(wrongChunk,'missing JSON chunk');
  console.log('PASS: GLB v2 header validation, declared size, JSON chunk, accessor-based complexity counts and memory estimate.');
  console.log('PASS: invalid signature, version, length and chunk type are rejected before full model parsing.');
})().catch(error=>{console.error('FAIL: '+error.stack);process.exit(1);});
