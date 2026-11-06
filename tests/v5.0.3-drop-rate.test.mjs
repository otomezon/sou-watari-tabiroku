import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('all modes slightly increase non-gold monster drops while preserving gold rates', async () => {
  const modes = await read('assets/modes.js');
  const expected = [
    /enemyDropEquipment: 0\.013, enemyDropPotion: 0\.032, enemyDropFood: 0\.030, enemyDropGold: 0\.24, shopChance: 0\.05, enemyDropValuable: 0\.003/,
    /enemyDropEquipment: 0\.013, enemyDropPotion: 0\.028, enemyDropFood: 0\.022, enemyDropGold: 0\.28, shopChance: 0\.07, enemyDropValuable: 0\.004/,
    /enemyDropEquipment: 0\.014, enemyDropPotion: 0\.027, enemyDropFood: 0\.020, enemyDropGold: 0\.32, shopChance: 0\.08, enemyDropValuable: 0\.005/,
    /enemyDropEquipment: 0\.015, enemyDropPotion: 0\.026, enemyDropFood: 0\.018, enemyDropGold: 0\.36, shopChance: 0\.09, enemyDropValuable: 0\.007/,
    /enemyDropEquipment: 0\.016, enemyDropPotion: 0\.024, enemyDropFood: 0\.016, enemyDropGold: 0\.40, shopChance: 0\.10, enemyDropValuable: 0\.009/,
  ];
  assert.equal(expected.length, 5);
  for (const pattern of expected) assert.match(modes, pattern);
});

test('v5.0.3 release metadata and save schema remain compatible', async () => {
  const [main, manifest, sw, storage, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'), read('assets/storage.js'), read('RELEASE_v5.0.3.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5\\.0\\.3'/);
  assert.match(manifest, /"version": "5\\.0\\.3"/);
  assert.match(sw, /sou-watari-tabiroku-v5-0-3/);
  assert.match(storage, /state\\.schemaVersion !== 12/);
  assert.match(release, /type: patch/);
});
