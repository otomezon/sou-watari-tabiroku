import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('tutorial disables shop and all rare monster variants', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /state\.modeId === 'tutorial' \|\| state\.floor === mode\.floors/);
  assert.match(engine, /state\.modeId !== 'tutorial' && state\.modeId !== 'beginner' && rarityRoll < 0\.012/);
  assert.match(engine, /state\.modeId !== 'tutorial' && rarityRoll < 0\.037/);
  assert.match(engine, /state\.modeId !== 'tutorial' && rarityRoll < 0\.062/);
});

test('beginner excludes only 魔喰い while keeping the other rare variants', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /state\.modeId !== 'beginner' && rarityRoll < 0\.012/);
  assert.match(engine, /state\.modeId !== 'tutorial' && rarityRoll < 0\.037/);
  assert.match(engine, /state\.modeId !== 'tutorial' && rarityRoll < 0\.062/);
});

test('each boss floor gets one additional regular support monster', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /index < mode\.bossFloorMonsters \+ 1/);
});

test('v5.0.2 release metadata and save schema remain compatible', async () => {
  const [main, manifest, sw, storage, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'),
    read('assets/storage.js'), read('RELEASE_v5.0.2.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5\.0\.2'/);
  assert.match(manifest, /"version": "5\.0\.2"/);
  assert.match(sw, /sou-watari-tabiroku-v5-0-2/);
  assert.match(storage, /state\.schemaVersion !== 12/);
  assert.match(release, /type: patch/);
});
