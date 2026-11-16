import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('tutorial disables shop and all rare monster variants', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /state\.modeId === 'tutorial' \|\| state\.floor === mode\.floors/);
  assert.match(engine, /canSpawnRareMonster\(state\.modeId\)/);
  assert.match(engine, /canSpawnMagicEater\(state\.modeId\)/);
  assert.match(engine, /rarityRoll < 0\.012/);
  assert.match(engine, /rarityRoll < 0\.037/);
  assert.match(engine, /rarityRoll < 0\.062/);
});

test('beginner excludes only 魔喰い while keeping the other rare variants', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /canSpawnMagicEater\(state\.modeId\)/);
  assert.match(engine, /canSpawnRareMonster\(state\.modeId\)/);
});

test('each boss floor uses its campaign-specific support count', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /findBossSupportPoints\(state, state\.monsters\[0\], mode\.bossFloorMonsters, random\)/);
});

test('current app metadata is aligned while the historical v5.0.2 release record remains intact', async () => {
  const [main, manifest, sw, storage, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'),
    read('assets/storage.js'), read('RELEASE_v5.0.2.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5\.1\.20'/);
  assert.match(manifest, /"version": "5.1.20"/);
  assert.match(sw, /sou-watari-tabiroku-v5-1-20/);
  assert.match(storage, /state\.schemaVersion !== 12/);
  assert.match(release, /version: 5\.0\.2/);
  assert.match(release, /type: patch/);
});
