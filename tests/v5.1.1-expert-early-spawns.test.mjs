import test from 'node:test';
import assert from 'node:assert/strict';
import { getMonsterSpawnRange } from '../assets/engine.js';
import { getModeConfig } from '../assets/modes.js';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('early-floor spawn ranges ease in by campaign difficulty', () => {
  const expected = {
    tutorial: [[3, 5], [3, 5], [3, 5], [3, 5]],
    beginner: [[3, 5], [4, 6], [4, 7], [4, 7]],
    intermediate: [[4, 6], [5, 7], [5, 8], [5, 8]],
    advanced: [[4, 6], [5, 8], [5, 9], [5, 9]],
    expert: [[3, 4], [4, 6], [5, 8], [6, 10]],
  };
  for (const [modeId, floors] of Object.entries(expected)) {
    const mode = getModeConfig(modeId);
    floors.forEach(([min, max], index) => {
      assert.deepEqual(getMonsterSpawnRange(mode, index + 1), { min, max }, `${modeId} floor ${index + 1}`);
    });
    assert.deepEqual(getMonsterSpawnRange(mode, mode.floors), { min: mode.minMonsters, max: mode.maxMonsters });
  }
});

test('all campaigns return to their configured spawn range after the easing period', () => {
  for (const modeId of ['tutorial', 'beginner', 'intermediate', 'advanced', 'expert']) {
    const mode = getModeConfig(modeId);
    for (const floor of [4, 5, 10, mode.floors])
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
  assert.match(notes, /全難易度/);
});
