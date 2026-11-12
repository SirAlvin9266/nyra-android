'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, '../app/src/main/assets/www/character.html');
const html = fs.readFileSync(sourcePath, 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match, 'Character Creator module must exist.');
const source = match[1];
const start = source.indexOf('function nyraApplyRoboTVTransferToBBModel(doc){');
const end = source.indexOf("\nsendRoboTvButton?.addEventListener", start);
assert.ok(start >= 0 && end > start, 'RoboTV export bridge function must be extractable.');
const helper = source.slice(start, end);

function vector(initial = [0, 0, 0]) {
  return {
    x: initial[0], y: initial[1], z: initial[2],
    fromArray(values) { this.x = values[0]; this.y = values[1]; this.z = values[2]; },
    set(x,y,z) { this.x=x; this.y=y; this.z=z; },
    toArray() { return [this.x, this.y, this.z]; },
  };
}
function node(name) {
  return {
    name, position: vector(), scale: vector([1, 1, 1]),
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ', set(x, y, z) { this.x=x; this.y=y; this.z=z; } },
    visible: true, parent: null, children: [],
    add(child) {
      if (child.parent) {
        const index = child.parent.children.indexOf(child);
        if (index >= 0) child.parent.children.splice(index, 1);
      }
      child.parent = this;
      if (!this.children.includes(child)) this.children.push(child);
    },
  };
}
function transferFixture({badGroupScale = false, freeMesh = false, changeFreeMesh = false} = {}) {
  const root = node('root');
  const g1 = node('Root');
  const g2 = node('Arm');
  const pivot = node('Arm pivot');
  const mesh = node('Arm cube');
  const rawG1 = {uuid:'g1',name:'Root',children:[]};
  const rawG2 = {uuid:'g2',name:'Arm',children:[]};
  const element = {uuid:'c1',type:freeMesh?'mesh':'cube',visibility:true};
  const originalNodes = [
    {id:'bbmodel-root',sourceId:null,type:'group',parentId:null,transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}},
    {id:'group:g1',sourceId:'g1',type:'bone',parentId:'bbmodel-root',transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}},
    {id:'group:g2',sourceId:'g2',type:'bone',parentId:'bbmodel-root',transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}},
    {id:'element:c1',sourceId:'c1',type:freeMesh?'mesh':'cube',parentId:'group:g1',transform:{position:[0,1,0],rotation:[0,0,0],scale:[1,1,1]}},
  ];
  const docNodes = JSON.parse(JSON.stringify(originalNodes));
  docNodes[2].transform.position=[1,0,0];
  docNodes[2].transform.scale=badGroupScale?[2,1,1]:[1,1,1];
  docNodes[3].parentId='group:g2';
  docNodes[3].transform={position:changeFreeMesh?[0,2,0]:[0,1,0],rotation:[0,.5,0],scale:[2,1,1]};
  docNodes[3].visibility=false;
  root.add(g1);root.add(g2);g1.add(pivot);pivot.add(mesh);
  const raw={groups:[rawG1,rawG2],elements:[element],outliner:[rawG1]};
  const state={
    rootGroup:root,rawData:raw,
    groups:[{uuid:'g1',node:g1,parentOrigin:[0,0,0]},{uuid:'g2',node:g2,parentOrigin:[0,0,0]}],
    records:[{uuid:'c1',element,mesh,pivot,freeMesh,baseOrigin:[0,0,0],parentOrigin:[0,0,0]}],
  };
  return {
    state,root,g1,g2,pivot,mesh,rawG1,rawG2,element,
    original:{project:{id:'fixture-1'},scene:{nodes:originalNodes}},
    doc:{schema:'nyra.scene-transfer',schemaVersion:1,project:{id:'fixture-1',source:{format:'blockbench'}},scene:{nodes:docNodes}},
  };
}
function run(fixture) {
  const context=vm.createContext({
    bbmodelState:fixture.state,
    window:{__nyraLastTransfer:fixture.original},
    THREE:{MathUtils:{degToRad:value=>value*Math.PI/180}},
  });
  vm.runInContext(helper+';globalThis.applyTransfer=nyraApplyRoboTVTransferToBBModel;',context);
  context.applyTransfer(fixture.doc);
}

const good=transferFixture();
run(good);
assert.equal(good.pivot.parent,good.g2,'cube pivot must be reparented to the selected group');
assert.deepEqual(good.g2.position.toArray(),[1,0,0],'group position must match RoboTV transform');
assert.deepEqual(good.pivot.position.toArray(),[0,1,0],'cube pivot local position must be preserved');
assert.deepEqual(good.mesh.scale.toArray(),[2,1,1],'cube scale must be applied to the existing exporter mesh');
assert.equal(good.state.records[0].parentOrigin.join(','),'1,0,0','element origin must use the new parent origin');
assert.equal(good.element.visibility,false,'piece visibility must be preserved');
assert.equal(good.rawG1.children.length,0,'old parent group must no longer contain the cube');
assert.equal(good.rawG2.children.join(','),'c1','new parent group must contain the cube in Blockbench outliner');
assert.equal(good.state.rawData.outliner.length,2,'root outliner must retain both groups');

const badScale=transferFixture({badGroupScale:true});
assert.throws(()=>run(badScale),/não preserva escala aplicada diretamente a grupos/i);
assert.equal(badScale.g2.parent,badScale.root,'unsupported group scale must be rejected before scene mutation');

const badMesh=transferFixture({freeMesh:true,changeFreeMesh:true});
assert.throws(()=>run(badMesh),/malhas livres/i);
assert.equal(badMesh.g2.parent,badMesh.root,'unsupported free-mesh transform must be rejected before scene mutation');

process.stdout.write('Character Creator export bridge: 3 scenarios passed (cube/group mapping, unsupported group scale, unsupported free-mesh edits).\n');
