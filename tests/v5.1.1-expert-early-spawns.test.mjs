import test from 'node:test';
import assert from 'node:assert/strict';
import { getMonsterSpawnRange } from '../assets/engine.js';
import { getModeConfig } from '../assets/modes.js';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('expert mode gradually eases monster density on floors 1–3', () => {
  const expert = getModeConfig('expert');
  assert.deepEqual(getMonsterSpawnRange(expert, 1), { min: 3, max: 4 });
  assert.deepEqual(getMonsterSpawnRange(expert, 2), { min: 4, max: 6 });
  assert.deepEqual(getMonsterSpawnRange(expert, 3), { min: 5, max: 8 });
  assert.deepEqual(getMonsterSpawnRange(expert, 4), { min: 6, max: 10 });
  assert.deepEqual(getMonsterSpawnRange(expert, 30), { min: 6, max: 10 });
});

test('all other modes retain their configured spawn ranges', () => {
  for (const modeId of ['tutorial', 'beginner', 'intermediate', 'advanced']) {
    const mode = getModeConfig(modeId);
    for (const floor of [1, 2, 3, 4, mode.floors])
      assert.deepEqual(getMonsterSpawnRange(mode, floor), { min: mode.minMonsters, max: mode.maxMonsters });
  }
});

test('v5.1.1 app, manifest, cache and release notes agree', async () => {
  const [main, manifest, sw, release, notes] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'),
    read('RELEASE_v5.1.1.yaml'), read('PATCH_NOTES_v5.1.1.md'),
  ]);
  assert.match(main, /APP_VERSION = '5\.1\.1'/);
  assert.match(manifest, /"version": "5\.1\.1"/);
  assert.match(sw, /sou-watari-tabiroku-v5-1-1/);
  assert.match(release, /type: patch/);
  assert.match(notes, /地下1階/);
});
