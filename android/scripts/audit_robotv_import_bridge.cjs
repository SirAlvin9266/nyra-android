'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=fs.readFileSync(path.resolve(__dirname,'../app/src/main/assets/www/index.html'),'utf8');
const match=root.match(/const pages = \{items: "([^"]+)", character: "([^"]+)", animation: "([^"]+)"\};/);
assert.ok(match,'O shell deve conter as páginas embarcadas.');
const character=Buffer.from(match[2],'base64').toString('utf8');
const robotv=Buffer.from(match[3],'base64').toString('utf8');

for(const marker of [
 'let characterImportReady=false;',
 'const pendingCharacterImports=[];',
 'function nyraRelayCharacterImport(payload,source)',
 'function nyraFlushCharacterImports()',
 "event.data?.type==='NYRA_CHARACTER_IMPORT_READY'&&sourceKey==='character'",
 "editorFrames.character||ensureEditor('character')",
 'frame.contentWindow.postMessage({type:\'NYRA_SCENE_TRANSFER_IMPORT_BBMODEL\'', 
]) assert.ok(root.includes(marker),'Ponte de importação sem requisito: '+marker);

const relayStart=root.indexOf("if(event.data?.type==='NYRA_SCENE_TRANSFER_IMPORT_BBMODEL'&&sourceKey==='animation')");
const relayEnd=root.indexOf("if(event.data?.type==='NYRA_ROBOTV_EXPORT_PROJECT_JSON'",relayStart);
assert.ok(relayStart>=0&&relayEnd>relayStart,'Rota de importação do RoboTV deve existir.');
const relay=root.slice(relayStart,relayEnd);
assert.ok(!relay.includes("contentDocument?.readyState==='complete'"),'Não usar readyState complete como prontidão do módulo ES.');

const listenerStart=character.indexOf("window.addEventListener('message',event=>");
const readyIndex=character.indexOf("window.parent.postMessage({type:'NYRA_CHARACTER_IMPORT_READY'}",listenerStart);
const resizeIndex=character.indexOf('function resize()',listenerStart);
assert.ok(listenerStart>=0&&readyIndex>listenerStart&&resizeIndex>readyIndex,'O Criador deve anunciar prontidão após registrar o listener de importação.');
assert.ok(character.includes("if(event.data.type==='NYRA_SCENE_TRANSFER_IMPORT_BBMODEL'&&event.data.file)"),'O Criador deve receber a mensagem de importação.');
assert.ok(character.includes('await importBBModelFile(file)'),'O arquivo recebido deve passar pelo importador real do Criador.');
assert.ok(character.includes('await nyraSendBBModelToRoboTV(event.data.requestId)'),'O modelo importado deve ser transferido ao RoboTV.');

assert.ok(robotv.includes('accept=".bbmodel,.json,application/json"'),'O seletor do RoboTV deve declarar os formatos que realmente encaminha.');
assert.ok(robotv.includes("window.parent.postMessage({type:'NYRA_SCENE_TRANSFER_IMPORT_BBMODEL'"),'O RoboTV deve encaminhar o arquivo ao shell.');
assert.ok(robotv.includes('requestId,file,name:file.name'),'O requestId e o arquivo precisam permanecer associados.');

for(const [label,html] of [['Character Creator',character],['RoboTV',robotv]]){
 const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match,label+' deve conter módulo JavaScript.');
 const temp=path.join(require('node:os').tmpdir(),'nyra-import-bridge-'+label.replace(/\W/g,'')+'-'+process.pid+'.mjs');
 try{fs.writeFileSync(temp,match[1]);const result=require('node:child_process').spawnSync(process.execPath,['--check',temp],{encoding:'utf8'});assert.equal(result.status,0,label+' tem sintaxe inválida: '+result.stderr);}
 finally{try{fs.unlinkSync(temp)}catch(_){}}
}
process.stdout.write('RoboTV import bridge audit: readiness handshake, queue, creator importer route and syntax passed.\n');
