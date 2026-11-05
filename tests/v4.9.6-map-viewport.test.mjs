import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('v4.9.6 expands the actual map viewport vertically', async () => {
  const renderer = await read('assets/renderer.js');
  const html = await read('index.html');
  assert.match(renderer, /const TILE = 36;\s*const COLS = 15;\s*const ROWS = 13;/);
  assert.match(html, /id="dungeon-canvas" width="540" height="468"/);
  assert.equal(36 * 13, 468);
});

test('PWA assets use v4.9.6', async () => {
  const [main, manifest, sw] = await Promise.all([read('assets/main.js'), read('manifest.webmanifest'), read('sw.js')]);
  assert.match(main, /APP_VERSION = '4\.9\.6'/);
  assert.match(manifest, /"version": "4\.9\.6"/);
  assert.match(sw, /sou-watari-tabiroku-v4-9-6/);
});
