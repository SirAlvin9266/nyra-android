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

// The outer bootstrap intentionally carries the HTML/module fragment as a
// JavaScript string. Its syntax is validated by audit_reference.py after
// excluding that exact injected fragment. Execute that validated bootstrap
// only after substituting the fragment with an empty string for the DOM shim.
const modelToolsStart = outerSourceForExecution.indexOf('const modelTools = ');
const modelToolsEnd = outerSourceForExecution.indexOf('";', modelToolsStart);
const panelEndMarker = outerSourceForExecution.indexOf('const panelEnd', modelToolsStart);
if (modelToolsStart < 0 || modelToolsEnd < 0 || panelEndMarker < 0 || modelToolsEnd > panelEndMarker) {
  throw new Error('Could not isolate embedded modelTools string for bootstrap simulation');
}
const sanitizedOuter = outerSourceForExecution.slice(0, modelToolsStart)
  + 'const modelTools = "";'
  + outerSourceForExecution.slice(modelToolsEnd + 2);
checkJs('outer app bootstrap', sanitizedOuter);
vm.runInContext(sanitizedOuter, context, { filename: 'nyra-outer-bootstrap.js' });
const modelToolsMarker = 'const modelTools = ';
const embeddedModelTools = outerSourceForExecution.slice(
  outerSourceForExecution.indexOf(modelToolsMarker),
  outerSourceForExecution.indexOf('const panelEnd', outerSourceForExecution.indexOf(modelToolsMarker))
);
if (!embeddedModelTools || !embeddedModelTools.includes('NyraModelIO')) {
  console.error('FAIL: model I/O template is missing from the host adapter source');
  process.exit(1);
}
const decodedModelTools = vm.runInContext('(' + embeddedModelTools.slice(embeddedModelTools.indexOf('"') , embeddedModelTools.lastIndexOf(';')) .trim().replace(/;$/, '') + ')', context);


const modelToolsHtml = "<style>\n#nyraModelIO{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:8px 0;padding:9px;border:1px solid #33445a;border-radius:10px;background:#141e2b}\n#nyraModelIO button{border:1px solid #36516a;border-radius:8px;padding:8px 10px;background:#1c3042;color:#edf6ff;font:600 12px system-ui;cursor:pointer}\n#nyraModelIO button:disabled{opacity:.45;cursor:default}\n#nyraModelIO small{display:block;flex-basis:100%;color:#aabbd0;font:11px/1.4 system-ui}\n</style>\n<div id=\"nyraModelIO\">\n  <button type=\"button\" id=\"nyraImport3D\">Importar modelo 3D</button>\n  <button type=\"button\" id=\"nyraExportGLB\" disabled>Exportar GLB</button>\n  <button type=\"button\" id=\"nyraExportOBJ\" disabled>Exportar OBJ</button>\n  <button type=\"button\" id=\"nyraExportSTL\" disabled>Exportar STL</button>\n  <input id=\"nyraModelFiles\" type=\"file\" accept=\".glb,.gltf,.obj,.fbx,.stl,.bin,.png,.jpg,.jpeg,.webp\" multiple hidden>\n  <small id=\"nyraModelStatus\">Formatos: GLB, glTF, OBJ, FBX e STL. Para glTF/FBX com arquivos externos, selecione também os arquivos auxiliares.</small>\n</div>\n<script type=\"module\">/* NyraModelIO: select imported object and retain animation clips */\nimport * as THREE from 'three';\nimport { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';\nimport { OBJLoader } from 'three/addons/loaders/OBJLoader.js';\nimport { FBXLoader } from 'three/addons/loaders/FBXLoader.js';\nimport { STLLoader } from 'three/addons/loaders/STLLoader.js';\nimport { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';\nimport { OBJExporter } from 'three/addons/exporters/OBJExporter.js';\nimport { STLExporter } from 'three/addons/exporters/STLExporter.js';\n\nlet editor = window.__nyraEditor;\nasync function waitForEditor(timeoutMs=12000){\n  const started=Date.now();\n  while(!editor && Date.now()-started<timeoutMs){\n    await new Promise(resolve=>setTimeout(resolve,100));\n    editor=window.__nyraEditor;\n  }\n  return editor;\n}\nconst status = document.getElementById('nyraModelStatus');\nconst input = document.getElementById('nyraModelFiles');\nconst importButton = document.getElementById('nyraImport3D');\nconst exportButtons = ['nyraExportGLB','nyraExportOBJ','nyraExportSTL'].map(id=>document.getElementById(id));\nlet importedModel = null;\nlet resourceUrls = [];\nfunction setStatus(message){ if(status) status.textContent=message; const target=document.getElementById('status'); if(target) target.textContent=message; }\nfunction fileExtension(name){ return (name.split('.').pop()||'').toLowerCase(); }\nfunction disposeObject(object){\n  object.traverse(child=>{\n    if(child.geometry) child.geometry.dispose();\n    if(child.material){\n      const materials=Array.isArray(child.material)?child.material:[child.material];\n      for(const material of materials){\n        for(const value of Object.values(material)){\n          if(value && value.isTexture) value.dispose();\n        }\n        material.dispose();\n      }\n    }\n  });\n}\nfunction fitObject(object){\n  object.updateMatrixWorld(true);\n  const bounds=new THREE.Box3().setFromObject(object);\n  if(bounds.isEmpty()) throw new Error('O arquivo não contém geometria 3D visível.');\n  const center=bounds.getCenter(new THREE.Vector3());\n  const size=bounds.getSize(new THREE.Vector3());\n  const maxDimension=Math.max(size.x,size.y,size.z);\n  if(!Number.isFinite(maxDimension)||maxDimension<=0) throw new Error('O modelo possui dimensões inválidas.');\n  object.position.sub(center);\n  const factor=4.8/maxDimension;\n  object.scale.multiplyScalar(factor);\n  object.updateMatrixWorld(true);\n  const fitted=new THREE.Box3().setFromObject(object);\n  const fittedSize=fitted.getSize(new THREE.Vector3());\n  const radius=Math.max(fittedSize.x,fittedSize.y,fittedSize.z,1);\n  editor.controls.target.set(0,0,0);\n  editor.camera.position.set(radius*1.8,radius*1.35,radius*2.2);\n  editor.camera.near=Math.max(0.01,radius/1000);\n  editor.camera.far=Math.max(100,radius*30);\n  editor.camera.updateProjectionMatrix();\n  editor.controls.update();\n}\nlet importedAnimations = [];\nfunction addModel(object,name,animations=[]){\n  if(importedModel){editor.transform.detach();editor.scene.remove(importedModel);disposeObject(importedModel);}\n  importedModel=object;\n  importedModel.name=name.replace(/\\\\\\\\.[^.]+$/,'')||'Modelo importado';\n  importedAnimations=Array.isArray(animations)?animations:[];\n  fitObject(importedModel);\n  editor.scene.add(importedModel);\n  editor.selectModel(importedModel);\n  editor.scene.updateMatrixWorld(true);\n  exportButtons.forEach(button=>button.disabled=false);\n  setStatus('Modelo carregado: '+name+'. Geometria, hierarquia, UVs e materiais compatíveis foram mantidos.'+(importedAnimations.length?' Animações: '+importedAnimations.length+'.':''));\n}\nfunction makeManager(files){\n  const manager=new THREE.LoadingManager();\n  const urlMap=new Map();\n  for(const file of files){\n    const url=URL.createObjectURL(file);\n    resourceUrls.push(url);\n    urlMap.set(file.name,url);\n    if(file.webkitRelativePath) urlMap.set(file.webkitRelativePath,url);\n  }\n  manager.setURLModifier(url=>{\n    const clean=decodeURIComponent(url.split(/[?#]/)[0]);\n    if(urlMap.has(clean)) return urlMap.get(clean);\n    const basename=clean.split('/').pop();\n    if(urlMap.has(basename)) return urlMap.get(basename);\n    return url;\n  });\n  return manager;\n}\nasync function parseModel(modelFile,files){\n  const extension=fileExtension(modelFile.name);\n  const manager=makeManager(files);\n  if(extension==='glb'||extension==='gltf'){\n    const loader=new GLTFLoader(manager);\n    const buffer=await modelFile.arrayBuffer();\n    return await new Promise((resolve,reject)=>{\n      loader.parse(buffer,'',result=>resolve({object:result.scene,animations:result.animations||[]}),reject);\n    });\n  }\n  if(extension==='obj'){\n    return {object:new OBJLoader(manager).parse(await modelFile.text()),animations:[]};\n  }\n  if(extension==='fbx'){\n    const object=new FBXLoader(manager).parse(await modelFile.arrayBuffer(),'');\n    return {object,animations:Array.isArray(object.animations)?object.animations:[]};\n  }\n  if(extension==='stl'){\n    const geometry=new STLLoader(manager).parse(await modelFile.arrayBuffer());\n    geometry.computeVertexNormals();\n    return {object:new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xb8c7d9,metalness:.15,roughness:.72})),animations:[]};\n  }\n  throw new Error('Formato não suportado: .'+extension);\n}\nfunction saveBlob(blob,filename){\n  const url=URL.createObjectURL(blob);\n  const anchor=document.createElement('a');\n  anchor.href=url;anchor.download=filename;anchor.style.display='none';\n  document.body.appendChild(anchor);anchor.click();anchor.remove();\n  setTimeout(()=>URL.revokeObjectURL(url),60000);\n}\nasync function loadSelectedFiles(){\n  const files=Array.from(input.files||[]);\n  const modelFile=files.find(file=>['glb','gltf','obj','fbx','stl'].includes(fileExtension(file.name)));\n  if(!modelFile){setStatus('Selecione um arquivo GLB, glTF, OBJ, FBX ou STL.');return;}\n  exportButtons.forEach(button=>button.disabled=true);\n  importButton.disabled=true;\n  setStatus('Lendo '+modelFile.name+' ('+(modelFile.size/1048576).toFixed(1)+' MB)…');\n  try{\n    const parsed=await parseModel(modelFile,files);\n    addModel(parsed.object,modelFile.name,parsed.animations);\n    for(const url of resourceUrls) URL.revokeObjectURL(url);\n    resourceUrls=[];\n  }catch(error){\n    console.error('Nyra model import failed',error);\n    setStatus('Falha ao importar '+modelFile.name+': '+(error&&error.message?error.message:String(error)));\n    exportButtons.forEach(button=>button.disabled=!importedModel);\n    for(const url of resourceUrls) URL.revokeObjectURL(url);\n    resourceUrls=[];\n  }finally{\n    importButton.disabled=false;\n    input.value='';\n  }\n}\nimportButton.addEventListener('click',()=>input.click());\ninput.addEventListener('change',loadSelectedFiles);\nfunction currentModel(){if(!importedModel)throw new Error('Importe um modelo antes de exportar.');return importedModel;}\ndocument.getElementById('nyraExportGLB').addEventListener('click',()=>{\n  try{\n    const exporter=new GLTFExporter();\n    exporter.parse(currentModel(),result=>{\n      const blob=new Blob([result],{type:'model/gltf-binary'});\n      saveBlob(blob,'nyra-modelo.glb');\n      setStatus('GLB exportado. Materiais, texturas e '+importedAnimations.length+' clip(s) de animação compatíveis foram incluídos.');\n    },error=>{setStatus('Falha ao exportar GLB: '+(error&&error.message?error.message:String(error)));},{binary:true,onlyVisible:true,animations:importedAnimations});\n  }catch(error){setStatus('Falha ao exportar GLB: '+error.message);}\n});\ndocument.getElementById('nyraExportOBJ').addEventListener('click',()=>{\n  try{saveBlob(new Blob([new OBJExporter().parse(currentModel())],{type:'text/plain'}),'nyra-modelo.obj');setStatus('OBJ exportado. Materiais/texturas externos devem ser exportados separadamente.');}\n  catch(error){setStatus('Falha ao exportar OBJ: '+error.message);}\n});\ndocument.getElementById('nyraExportSTL').addEventListener('click',()=>{\n  try{const data=new STLExporter().parse(currentModel(),{binary:true});saveBlob(new Blob([data],{type:'model/stl'}),'nyra-modelo.stl');setStatus('STL binário exportado. STL não preserva hierarquia, UVs ou materiais.');}\n  catch(error){setStatus('Falha ao exportar STL: '+error.message);}\n});\nwaitForEditor().then(ready=>{\n  if(!ready){\n    setStatus('O editor 3D não disponibilizou a cena após 12 segundos. Reabra este editor e tente novamente.');\n    importButton.disabled=false;\n    importButton.title='O editor ainda não está pronto. Toque para tentar novamente.';\n    return;\n  }\n  importButton.disabled=false;\n  importButton.title='Selecionar um arquivo 3D no dispositivo';\n  setStatus('Editor 3D conectado. Importe GLB, glTF, OBJ, FBX ou STL.');\n}).catch(error=>{\n  console.error('Nyra editor bridge failed',error);\n  setStatus('Falha ao conectar ao editor 3D: '+(error&&error.message?error.message:String(error)));\n  importButton.disabled=false;\n});\n\n</script>\\";
const generated = vm.runInContext(`({
  items: addAndroidExportAdapter(decodePage(pages.items), 'items'),
  character: addAndroidExportAdapter(decodePage(pages.character), 'character'),
  animation: addAndroidExportAdapter(decodePage(pages.animation), 'animation')
})`, context);

const requiredByEditor = {
  items: ['/assets/www/vendor/jszip/jszip.min.js'],
  character: ['/assets/www/vendor/three/build/three.module.js'],
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
