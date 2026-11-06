import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('v4.9.8 uses a 16 by 12 map viewport', async () => {
  const renderer = await read('assets/renderer.js');
  const html = await read('index.html');
  assert.match(renderer, /const TILE = 36;\s*const COLS = 16;\s*const ROWS = 12;/);
  assert.match(html, /id="dungeon-canvas" width="576" height="432"/);
});

test('movement heading and panel wrapper are removed while arrow glyphs are unified', async () => {
  const html = await read('index.html');
  const css = await read('assets/style.css');
  assert.doesNotMatch(html, /controls-panel|controls-title|1操作 = 1ターン/);
  for (const glyph of ['↖', '↑', '↗', '←', '→', '↙', '↓', '↘']) assert.ok(html.includes(glyph), glyph);
  assert.match(css, /v4\.9\.8: remove the movement panel and enlarge a unified 8-way arrow pad/);
  assert.match(css, /grid-template-rows:\s*repeat\(3, clamp\(58px, 8svh, 72px\)\)/);
  assert.match(css, /\.dpad-button\[data-direction\][\s\S]*?font-size:\s*30px/);
});

test('PWA assets use v4.9.8', async () => {
  const [main, manifest, sw] = await Promise.all([read('assets/main.js'), read('manifest.webmanifest'), read('sw.js')]);
  assert.match(main, /APP_VERSION = '4\.9\.8'/);
  assert.match(manifest, /"version": "4\.9\.8"/);
  assert.match(sw, /sou-watari-tabiroku-v4-9-8/);
});
