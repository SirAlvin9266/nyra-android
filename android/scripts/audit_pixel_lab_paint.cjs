'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const rootPath = require.resolve('../app/src/main/assets/www/index.html');
const root = fs.readFileSync(rootPath, 'utf8');
const match = root.match(/const pages = \{items: "([^"]+)", character: "([^"]+)", animation: "([^"]+)"\};/);
assert.ok(match, 'O aplicativo deve conter o mapa Base64 das três páginas.');
const items = Buffer.from(match[1], 'base64').toString('utf8');

for (const marker of [
  'touch-action:none',
  'function pixelCellFromPointer(',
  "textureCanvas.addEventListener('pointerdown'",
  "textureCanvas.addEventListener('pointermove'",
  "textureCanvas.addEventListener('pointerup'",
  "textureCanvas.addEventListener('pointercancel'",
  "textureCanvas.addEventListener('lostpointercapture'",
  'textureCanvas.setPointerCapture(event.pointerId)',
  'saveMatrix(current,textureDragMatrix)',
]) {
  assert.ok(items.includes(marker), 'Pixel Lab sem suporte obrigatório: ' + marker);
}

const fnMatch = items.match(/function pixelCellFromPointer\([\s\S]*?\n\}/);
assert.ok(fnMatch, 'A função de conversão de coordenadas de toque precisa existir.');
const pixelCellFromPointer = vm.runInNewContext('(' + fnMatch[0].replace(/^function /, 'function ') + ')');

for (const size of [16, 32, 64, 128]) {
  const rect = { left: 20, top: 40, width: 320, height: 320 };
  assert.deepEqual(
    JSON.parse(JSON.stringify(pixelCellFromPointer(20, 40, rect, size, size))),
    { x: 0, y: 0 },
    'O canto superior esquerdo deve selecionar o primeiro pixel em ' + size + '×' + size
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(pixelCellFromPointer(180, 200, rect, size, size))),
    { x: Math.floor(size / 2), y: Math.floor(size / 2) },
    'O centro deve selecionar o pixel central em ' + size + '×' + size
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(pixelCellFromPointer(340, 360, rect, size, size))),
    { x: size - 1, y: size - 1 },
    'O canto inferior direito deve selecionar o último pixel em ' + size + '×' + size
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(pixelCellFromPointer(-100, -100, rect, size, size))),
    { x: 0, y: 0 },
    'Coordenadas fora da grade devem ser limitadas ao primeiro pixel em ' + size + '×' + size
  );
}

const editBlock = items.slice(items.indexOf('function editPixel('), items.indexOf("document.getElementById('erasePixel').onclick"));
assert.ok(editBlock.includes('ctx.clearRect(x,y,1,1)'), 'Apagar ou redesenhar deve limpar apenas o pixel alvo.');
assert.ok(editBlock.includes('ctx.fillRect(x,y,1,1)'), 'A pintura deve preencher apenas o pixel alvo.');
assert.ok(!editBlock.includes('paintMatrix(canvas'), 'A pintura em andamento não pode redimensionar o canvas.');
assert.ok(!editBlock.includes('render()'), 'A pintura em andamento não pode reconstruir o canvas inteiro.');
assert.ok(editBlock.includes('pointercancel') || items.includes("addEventListener('pointercancel'"), 'Cancelamento precisa finalizar o traço.');

process.stdout.write('Pixel Lab touch-paint audit: coordinate mapping 16/32/64/128 + pointer stroke + cell rendering passed.\n');
