import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('beginner is not visually recommended on the title screen', async () => {
  const [main, css] = await Promise.all([read('assets/main.js'), read('assets/style.css')]);
  assert.match(main, /node\('button', 'mode-card'\)/);
  assert.doesNotMatch(main, /mode-recommended|おすすめ/);
  assert.doesNotMatch(css, /mode-recommended|おすすめ/);
});

test('HUD gives the current floor its own visible, non-truncated element', async () => {
  const [html, main, css] = await Promise.all([read('index.html'), read('assets/main.js'), read('assets/style.css')]);
  assert.match(html, /id="dungeon-name"/);
  assert.match(html, /id="floor-label" class="floor-label"/);
  assert.match(main, /byId\('floor-label'\)\.textContent = `地下 \$\{state\.floor\} 階`/);
  assert.match(css, /#floor-label\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /#floor-label\s*\{[^}]*text-overflow:\s*clip/s);
});

test('deepest floor retains its numeric floor and displays deepest marker', async () => {
  const main = await read('assets/main.js');
  assert.match(main, /byId\('dungeon-name'\)\.textContent = `\$\{mode\.name\}\$\{state\.floor === mode\.floors \? ' · 最深部' : ''\}`/);
  assert.match(main, /byId\('floor-label'\)\.textContent = `地下 \$\{state\.floor\} 階`/);
});

test('PWA version and cache namespace are aligned at 4.9.3', async () => {
  const [main, manifest, sw] = await Promise.all([read('assets/main.js'), read('manifest.webmanifest'), read('sw.js')]);
  assert.match(main, /APP_VERSION = '4\.9\.3'/);
  assert.match(manifest, /"version": "4\.9\.3"/);
  assert.match(sw, /sou-watari-tabiroku-v4-9-3/);
});

test('save schema v11 is retained', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /schemaVersion: 11/);
});
