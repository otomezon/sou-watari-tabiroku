import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('rare encounter rates rise by difficulty while tutorial and beginner hunter restrictions remain', async () => {
  const modes = await read('assets/modes.js');
  const rates = [...modes.matchAll(/rareMonsterChance: ([0-9.]+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(rates, [0, 0.085, 0.095, 0.105, 0.115]);
  const engine = await read('assets/engine.js');
  assert.match(engine, /random\.next\(\) \* 0\.062 \/ Math\.max\(0\.001, mode\.rareMonsterChance\)/);
  assert.match(engine, /state\.modeId !== 'tutorial' && state\.modeId !== 'beginner'/);
});

test('gold chance stays reduced, amount multipliers return, and regular item drops rise slightly', async () => {
  const modes = await read('assets/modes.js');
  for (const chance of ['0.20', '0.23', '0.26', '0.29', '0.32']) assert.ok(modes.includes(`enemyDropGold: ${chance}`));
  assert.match(modes, /enemyDropEquipment: 0\.014, enemyDropPotion: 0\.033, enemyDropFood: 0\.031/);
  const engine = await read('assets/engine.js');
  assert.match(engine, /monster\.rareVariant \? 2\.0 : 0\.85/);
  assert.match(engine, /Math\.min\(0\.60, drops\.enemyDropGold \* 2\.0\)/);
});

test('hunter variant has a distinct 80% premium loot table above other rare variants', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /if \(monster\.hunterVariant\)/);
  assert.match(engine, /lootRoll < 0\.80/);
  assert.match(engine, /魔喰いの豪華な戦利品/);
  assert.match(engine, /else if \(monster\.rareVariant\)/);
  assert.match(engine, /lootRoll < 0\.35/);
});

test('v5.0.6 metadata and save schema remain consistent', async () => {
  const [main, manifest, sw, storage, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'), read('assets/storage.js'), read('RELEASE_v5.0.6.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5\.0\.6'/);
  assert.match(manifest, /"version": "5\.0\.6"/);
  assert.match(sw, /sou-watari-tabiroku-v5-0-6/);
  assert.match(storage, /state\.schemaVersion !== 12/);
  assert.match(release, /type: patch/);
});
