import test from 'node:test';
import assert from 'node:assert/strict';
import { getMonsterSpawnRange } from '../assets/engine.js';
import { getModeConfig } from '../assets/modes.js';

test('only expert early floors receive reduced spawn ranges', () => {
  const expert = getModeConfig('expert');
  assert.deepEqual(getMonsterSpawnRange(expert, 1), { min: 3, max: 4 });
  assert.deepEqual(getMonsterSpawnRange(expert, 2), { min: 4, max: 6 });
  assert.deepEqual(getMonsterSpawnRange(expert, 3), { min: 5, max: 8 });
  assert.deepEqual(getMonsterSpawnRange(expert, 4), { min: 6, max: 10 });
  for (const modeId of ['tutorial', 'beginner', 'intermediate', 'advanced']) {
    const mode = getModeConfig(modeId);
    for (const floor of [1, 2, 3, mode.floors])
      assert.deepEqual(getMonsterSpawnRange(mode, floor), { min: mode.minMonsters, max: mode.maxMonsters });
  }
});

test('expert difficulty scale is reduced but remains above advanced', () => {
  assert.equal(getModeConfig('advanced').difficultyScale, 1.28);
  assert.equal(getModeConfig('expert').difficultyScale, 1.35);
  assert.ok(getModeConfig('expert').difficultyScale > getModeConfig('advanced').difficultyScale);
});
