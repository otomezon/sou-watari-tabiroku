import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('v4.9.9 keeps the v4.9.8 16 by 12 map layout', async () => {
  const renderer = await read('assets/renderer.js');
  const html = await read('index.html');
  assert.match(renderer, /const TILE = 36;\s*const COLS = 16;\s*const ROWS = 12;/);
  assert.match(html, /id="dungeon-canvas" width="576" height="432"/);
});

test('horizontal and vertical gaps exactly match the action-button reference spacing', async () => {
  const css = await read('assets/style.css');
  const release = css.slice(css.lastIndexOf('/* v4.9.9:'));
  assert.match(release, /column-gap:\s*7px/);
  assert.match(release, /row-gap:\s*7px/);
  assert.match(release, /gap:\s*7px/);
  assert.doesNotMatch(release, /28px|30px|36px|42px/);
});

test('movement header remains removed and all eight directions plus wait remain', async () => {
  const html = await read('index.html');
  assert.doesNotMatch(html, /controls-panel|controls-title|1操作 = 1ターン/);
  for (const glyph of ['↖', '↑', '↗', '←', '→', '↙', '↓', '↘']) assert.ok(html.includes(glyph), glyph);
  assert.ok(html.includes('id="wait-button"'));
});

test('PWA assets use v4.9.9', async () => {
  const [main, manifest, sw] = await Promise.all([read('assets/main.js'), read('manifest.webmanifest'), read('sw.js')]);
  assert.match(main, /APP_VERSION = '4\.9\.9'/);
  assert.match(manifest, /"version": "4\.9\.9"/);
  assert.match(sw, /sou-watari-tabiroku-v4-9-9/);
});
