import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('current floor remains a single compact, non-truncated header line', async () => {
  const [html, css] = await Promise.all([read('index.html'), read('assets/style.css')]);
  assert.match(html, /class="status-topline"[\s\S]*?id="dungeon-name"[\s\S]*?id="floor-label"/);
  assert.doesNotMatch(html, /class="run-meta"/);
  assert.match(css, /\.floor-copy\s*\{[^}]*flex-direction:\s*row/s);
  assert.match(css, /#floor-label\s*\{[^}]*overflow:\s*visible/s);
});

test('turn and gold occupy the same six-cell stat row after attack and defense', async () => {
  const html = await read('index.html');
  const start = html.indexOf('<div class="stat-grid">');
  const end = html.indexOf('</section>', start);
  const statGrid = html.slice(start, end);
  const ids = [...statGrid.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['level-value', 'exp-value', 'attack-value', 'defense-value', 'turn-value', 'gold-value']);
  const css = await read('assets/style.css');
  assert.match(css, /\.stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/s);
});

test('playing viewport uses narrower side gutters and a full-width exploration canvas', async () => {
  const css = await read('assets/style.css');
  assert.match(css, /\.app-shell\.is-playing\s*\{[^}]*padding-left:\s*8px;[^}]*padding-right:\s*8px/s);
  assert.match(css, /#dungeon-canvas\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%/s);
  assert.match(css, /\.dungeon-frame\s*\{[^}]*padding:\s*4px 5px/s);
});

test('map receives more layout space while preserving usable controls', async () => {
  const css = await read('assets/style.css');
  assert.match(css, /\.game-screen\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) 36px auto auto/s);
  assert.match(css, /\.dpad\s*\{[^}]*clamp\(48px, 6\.4svh, 54px\)/s);
  assert.match(css, /\.dpad-button\s*\{[^}]*min-height:\s*48px/s);
});

test('PWA cache version is 4.9.4', async () => {
  const [main, manifest, sw] = await Promise.all([read('assets/main.js'), read('manifest.webmanifest'), read('sw.js')]);
  assert.match(main, /APP_VERSION = '4\.9\.4'/);
  assert.match(manifest, /"version": "4\.9\.4"/);
  assert.match(sw, /sou-watari-tabiroku-v4-9-4/);
});
