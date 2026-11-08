import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPrompt, layoutSheet, lintSheet } from '../src/sheet.js';

test('six panels pack into a 3×2 grid like the Python script', () => {
  const sizes = [
    { w: 800, h: 1200 }, { w: 900, h: 900 }, { w: 1200, h: 700 },
    { w: 600, h: 1000 }, { w: 1000, h: 1000 }, { w: 500, h: 500 },
  ];
  const s = layoutSheet(sizes, { cell: 1024, gap: 48 });
  assert.equal(s.cols, 3);
  assert.equal(s.rows, 2);
  assert.equal(s.width, 3 * 1024 + 4 * 48); // 3264, same as make_sheet.py
  assert.equal(s.height, 2 * 1024 + 3 * 48); // 2192
  // Tall image is fitted by height and centred horizontally in its cell.
  assert.deepEqual(s.rects[0], { x: 48 + Math.floor((1024 - 683) / 2), y: 48, w: 683, h: 1024 });
  // Small images are never upscaled.
  assert.equal(s.rects[5].w, 500);
});

test('every panel stays inside its own cell', () => {
  const sizes = Array.from({ length: 7 }, (_, i) => ({ w: 300 + i * 200, h: 1500 - i * 150 }));
  const s = layoutSheet(sizes, { cell: 512, gap: 24, cols: 3 });
  s.rects.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 24 + col * (512 + 24);
    const cy = 24 + row * (512 + 24);
    assert.ok(r.x >= cx && r.x + r.w <= cx + 512, `panel ${i} x`);
    assert.ok(r.y >= cy && r.y + r.h <= cy + 512, `panel ${i} y`);
  });
});

test('lint flags low resolution, small inputs and mismatched lighting', () => {
  const images = [
    { w: 400, h: 400, lum: 0.2 },
    { w: 1200, h: 1200, lum: 0.7 },
  ];
  const ids = lintSheet(images, { width: 1200, height: 700 })
    .filter((r) => r.level === 'warn')
    .map((r) => r.id);
  assert.deepEqual(ids.sort(), ['inputs', 'lighting', 'resolution']);
});

test('lint passes a well-prepared sheet', () => {
  const images = Array.from({ length: 6 }, () => ({ w: 1500, h: 1500, lum: 0.62 }));
  const warns = lintSheet(images, { width: 3264, height: 2192 }).filter((r) => r.level === 'warn');
  assert.equal(warns.length, 0);
});

test('prompt maps the tag and states ONE subject', () => {
  const p = buildPrompt({
    subject: 'product',
    description: 'matte-white water bottle',
    anchors: 'the green cap and embossed logo',
    action: 'The bottle rotates slowly on a wet stone surface',
    camera: 'Macro dolly-in',
    light: 'Soft morning light.',
    seconds: 5,
  });
  assert.match(p, /^@product is a reference sheet of ONE matte-white water bottle/);
  assert.match(p, /Keep the green cap and embossed logo identical/);
  assert.match(p, /Macro dolly-in\. Soft morning light\. 5 seconds\.$/);
});
