import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('current monster item drops are controlled and floor caches are less frequent', async () => {
  const modes = await read('assets/modes.js');
  const expected = [
    /enemyDropEquipment: 0\\.014, enemyDropPotion: 0\\.033, enemyDropFood: 0\\.031, enemyDropGold: 0\\.19, shopChance: 0\\.05, enemyDropValuable: 0\\.004/,
    /enemyDropEquipment: 0\\.014, enemyDropPotion: 0\\.029, enemyDropFood: 0\\.023, enemyDropGold: 0\\.22, shopChance: 0\\.07, enemyDropValuable: 0\\.005/,
    /enemyDropEquipment: 0\\.015, enemyDropPotion: 0\\.028, enemyDropFood: 0\\.021, enemyDropGold: 0\\.23, shopChance: 0\\.08, enemyDropValuable: 0\\.0055/,
    /enemyDropEquipment: 0\\.016, enemyDropPotion: 0\\.027, enemyDropFood: 0\\.019, enemyDropGold: 0\\.24, shopChance: 0\\.09, enemyDropValuable: 0\\.006/,
    /enemyDropEquipment: 0\\.017, enemyDropPotion: 0\\.025, enemyDropFood: 0\\.017, enemyDropGold: 0\\.25, shopChance: 0\\.10, enemyDropValuable: 0\\.0065/,
  ];
  assert.equal(expected.length, 5);
  for (const pattern of expected) assert.match(modes, pattern);
  assert.match(modes, /floorLootChance: 0\\.55/);
  assert.match(modes, /floorLootChance: 0\\.48/);
});
test('v5.0.3 release metadata and save schema remain compatible', async () => {
  const [main, manifest, sw, storage, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'), read('assets/storage.js'), read('RELEASE_v5.0.3.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5\.2\.2'/);
  assert.match(manifest, /"version": "5\.2\.2"/);
  assert.match(sw, /sou-watari-tabiroku-v5-2-2/);
  assert.match(storage, /state\.schemaVersion !== 12/);
  assert.match(release, /type: patch/);
});
