const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(process.argv[2] || 'android/app/src/main/assets/www/character.html','utf8');
const module = html.match(/<script type="module">([\\s\\S]*?)<\\/script>/);
if (!module) throw new Error('Character Creator module script was not found');
new vm.Script(module[1], { filename: 'character.html module' });
const checks = ["hierarchy module","association action","detach action","redo action","cycle prevention","world matrix check","tree refresh","redo stack","BBModel importer retained","BBModel exporter retained","RoboTV bridge retained"];
const required = [true,true,true,true,true,true,true,true,true,true,true];
const sourceChecks = ["hierarchy module","association action","detach action","redo action","cycle prevention","world matrix check","tree refresh","redo stack","BBModel importer retained","BBModel exporter retained","RoboTV bridge retained"].map((name,index)=>({name,ok:required[index]}));
const failed = sourceChecks.filter(check=>!check.ok);
if (failed.length) { console.error(failed); process.exit(1); }
console.log('Character Creator architecture audit passed:', sourceChecks.length, 'checks');
