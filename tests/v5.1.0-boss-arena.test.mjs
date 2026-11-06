import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('final floor is generated as a dedicated grand hall', async () => {
  const dungeon = await read('assets/dungeon.js');
  const engine = await read('assets/engine.js');
  assert.match(dungeon, /export function generateBossDungeon\(seed\)/);
  assert.match(dungeon, /bossArena: true/);
  assert.match(dungeon, /stairs: null/);
  assert.match(dungeon, /width: 32, height: 31/);
  assert.match(engine, /this\.state\.floor === getModeConfig\(this\.state\.modeId\)\.floors\s*\? generateBossDungeon/);
});

test('boss occupies four tiles in placement, collision and movement', async () => {
  const engine = await read('assets/engine.js');
  const storage = await read('assets/storage.js');
  assert.match(engine, /function monsterSize\(monster\)\s*\{\s*return monster\.boss \? 2 : 1;/);
  assert.match(engine, /footprint\.every\(\(cell\) => isWalkable/);
  assert.match(engine, /monsterCovers\(monster, next\)/);
  assert.match(engine, /nextFootprintPathStep\(this\.state\.dungeon\.tiles/);
  assert.match(storage, /const footprintSize = monster\.boss \? 2 : 1/);
});

test('boss receives a modest stat increase, including migrated legacy encounters', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /mode\.bossHp \* 1\.15/);
  assert.match(engine, /mode\.bossAttack \* 1\.10/);
  assert.match(engine, /mode\.bossDefense \+ 2/);
  assert.match(engine, /boss\.hp = Math\.ceil\(boss\.hp \* 1\.15\)/);
  assert.match(engine, /boss\.attack = Math\.ceil\(boss\.attack \* 1\.10\)/);
});

test('large boss art, UI, save compatibility and PWA versions stay aligned', async () => {
  const [renderer, main, manifest, sw, release, notes] = await Promise.all([
    read('assets/renderer.js'), read('assets/main.js'), read('manifest.webmanifest'),
    read('sw.js'), read('RELEASE_v5.1.0.yaml'), read('PATCH_NOTES_v5.1.0.md'),
  ]);
  assert.match(renderer, /drawBoss\(x, y, monster\)/);
  assert.match(renderer, /ctx\.fillRect\(x \+ 8, y \+ 2, 56, 5\)/);
  assert.match(main, /APP_VERSION = '5\.1\.0'/);
  assert.match(main, / · 大広間/);
  assert.match(manifest, /"version": "5\.1\.0"/);
  assert.match(sw, /sou-watari-tabiroku-v5-1-0/);
  assert.match(release, /type: minor/);
  assert.match(notes, /スキーマ \*\*12\*\*/);
});
