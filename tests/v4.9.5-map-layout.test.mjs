import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('map heading and monster-presence text are removed', async () => {
  const html = await read('index.html');
  const main = await read('assets/main.js');
  assert.doesNotMatch(html, /探索エリア|enemy-count|魔物の気配/);
  assert.doesNotMatch(main, /enemy-count|希少個体の気配|周囲は静かだ/);
});

test('map frame and canvas no longer have nested borders', async () => {
  const css = await read('assets/style.css');
  const latest = css.slice(css.indexOf('/* v4.9.5:'));
  assert.match(latest, /\.dungeon-frame\s*\{[^}]*padding:\s*0;[^}]*background:\s*transparent;[^}]*border:\s*0/s);
  assert.match(latest, /#dungeon-canvas\s*\{[^}]*border:\s*0;[^}]*box-shadow:\s*none/s);
});

test('visible map tiles are larger with a proportionate canvas', async () => {
  const renderer = await read('assets/renderer.js');
  const html = await read('index.html');
  assert.match(renderer, /const TILE = 36;\s*const COLS = 15;\s*const ROWS = 9;/);
  assert.match(html, /id="dungeon-canvas" width="540" height="324"/);
});

test('PWA assets use v4.9.5', async () => {
  const [main, manifest, sw] = await Promise.all([read('assets/main.js'), read('manifest.webmanifest'), read('sw.js')]);
  assert.match(main, /APP_VERSION = '4\.9\.5'/);
  assert.match(manifest, /"version": "4\.9\.5"/);
  assert.match(sw, /sou-watari-tabiroku-v4-9-5/);
});
