import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('hunter item drop chance is reduced to 60%, remaining above other rare variants', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /lootRoll < 0\.60/);
  assert.match(engine, /else if \(monster\.rareVariant\)/);
  assert.match(engine, /lootRoll < 0\.35/);
  assert.match(engine, /魔喰いの豪華な戦利品/);
});

test('v5.0.7 metadata and save schema remain consistent', async () => {
  const [main, manifest, sw, storage, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'), read('assets/storage.js'), read('RELEASE_v5.0.7.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5\.0\.7'/);
  assert.match(manifest, /"version": "5\.0\.7"/);
  assert.match(sw, /sou-watari-tabiroku-v5-0-7/);
  assert.match(storage, /state\.schemaVersion !== 12/);
  assert.match(release, /type: patch/);
});
