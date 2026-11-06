import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('gold drops are reduced and rare monster rates rise with difficulty', async () => {
  const modes = await read('assets/modes.js');
  const expected = [
    /rareMonsterChance: 0,.*enemyDropGold: 0\.20/s,
    /rareMonsterChance: 0\.062,.*enemyDropGold: 0\.23/s,
    /rareMonsterChance: 0\.068,.*enemyDropGold: 0\.26/s,
    /rareMonsterChance: 0\.074,.*enemyDropGold: 0\.29/s,
    /rareMonsterChance: 0\.080,.*enemyDropGold: 0\.32/s,
  ];
  for (const pattern of expected) assert.match(modes, pattern);
  const rates = [...modes.matchAll(/rareMonsterChance: ([0-9.]+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(rates, [0, 0.062, 0.068, 0.074, 0.080]);
});

test('gold amount and rare gold multipliers are lowered while rare variants keep their mode scaling', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /Math\.min\(0\.60, drops\.enemyDropGold \* 2\.0\)/);
  assert.match(engine, /monster\.rareVariant \? 1\.5 : 0\.75/);
  assert.match(engine, /random\.next\(\) \* 0\.062 \/ Math\.max\(0\.001, mode\.rareMonsterChance\)/);
  assert.match(engine, /state\.modeId !== 'tutorial' && state\.modeId !== 'beginner'/);
});

test('v5.0.5 metadata and save schema remain consistent', async () => {
  const [main, manifest, sw, storage, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'), read('assets/storage.js'), read('RELEASE_v5.0.5.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5\.0\.5'/);
  assert.match(manifest, /"version": "5\.0\.5"/);
  assert.match(sw, /sou-watari-tabiroku-v5-0-5/);
  assert.match(storage, /state\.schemaVersion !== 12/);
  assert.match(release, /type: patch/);
});
