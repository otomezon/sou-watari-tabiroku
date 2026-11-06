import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('魔喰いは初期耐久・攻撃が強化されている', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /monster\.hp = Math\.ceil\(monster\.hp \* 1\.70\)/);
  assert.match(engine, /monster\.attack = Math\.ceil\(monster\.attack \* 1\.25\)/);
  assert.match(engine, /monster\.defense \+= 6/);
  assert.match(engine, /monster\.maxHp = monster\.hp/);
});

test('魔喰いは撃破成長時にHPと防御力が伸びる', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /Math\.ceil\(monster\.maxHp \* 0\.18\)/);
  assert.match(engine, /monster\.defense = Math\.min\(10000, monster\.defense \+ 1\)/);
  assert.match(engine, /monster\.attack = Math\.min\(10000, monster\.attack \+ 1\)/);
});

test('v5.0.4 patch metadata and existing save schema are consistent', async () => {
  const [main, manifest, sw, storage, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'), read('assets/storage.js'), read('RELEASE_v5.0.4.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5\.0\.4'/);
  assert.match(manifest, /"version": "5\.0\.4"/);
  assert.match(sw, /sou-watari-tabiroku-v5-0-4/);
  assert.match(storage, /state\.schemaVersion !== 12/);
  assert.match(release, /type: patch/);
});
