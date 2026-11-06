import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, GameEngine, findItemDropPoint } from '../assets/engine.js';
import { migrateGameState, validateGameState } from '../assets/storage.js';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

function findCardinalPair(state) {
  const { tiles, width, height, start, stairs } = state.dungeon;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (tiles[y]?.[x] !== 1 || (x === start.x && y === start.y) || (x === stairs.x && y === stairs.y)) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const other = { x: x + dx, y: y + dy };
        if (tiles[other.y]?.[other.x] !== 1) continue;
        if ((other.x === start.x && other.y === start.y) || (other.x === stairs.x && other.y === stairs.y)) continue;
        if (Math.max(Math.abs(x - start.x), Math.abs(y - start.y)) < 3) continue;
        return [{ x, y }, other];
      }
    }
  }
  throw new Error('No adjacent floor pair found in generated dungeon');
}

function hunterFixture() {
  const state = createNewGame(0x5a17c0de, 'beginner');
  const [hunterPoint, preyPoint] = findCardinalPair(state);
  const hunter = {
    id: 'test-hunter', kind: 'slime', name: '魔喰いのスライム',
    ...hunterPoint, hp: 30, maxHp: 30, attack: 10, defense: 2, exp: 25,
    boss: false, actionSpeed: 'normal', actionProgress: 0, rareVariant: true,
    hunterVariant: true, hunterLevel: 1,
  };
  const prey = {
    id: 'test-prey', kind: 'bat', name: '洞窟コウモリ',
    ...preyPoint, hp: 1, maxHp: 1, attack: 2, defense: 0, exp: 5,
    boss: false, actionSpeed: 'normal', actionProgress: 0, rareVariant: false,
    hunterVariant: false,
  };
  state.monsters = [hunter, prey];
  state.groundItems = [];
  state.groundGold = [];
  return { state, hunter, prey, engine: new GameEngine(state) };
}

test('v5.0.0 shortens the message panel to 35px and offsets it down by 1px', async () => {
  const css = await read('assets/style.css');
  const block = css.slice(css.lastIndexOf('/* v5.0.0:'));
  assert.match(block, /\.message-panel\s*\{[^}]*height:\s*35px;[^}]*min-height:\s*35px;[^}]*max-height:\s*35px;[^}]*top:\s*1px;/);
});

test('loot moves to a free cardinal neighbour only when the death tile already contains an item', () => {
  const monster = { id: 'victim', x: 3, y: 3, hp: 0 };
  const tiles = Array.from({ length: 7 }, () => Array(7).fill(1));
  const state = {
    dungeon: { tiles, stairs: null },
    player: { x: 0, y: 0 },
    monsters: [monster],
    groundItems: [{ x: 3, y: 3, item: { name: 'old' } }, { x: 4, y: 3, item: { name: 'nearby' } }],
    shop: null,
  };
  assert.deepEqual(findItemDropPoint(state, monster), { x: 2, y: 3 });
  state.groundItems = [];
  assert.deepEqual(findItemDropPoint(state, monster), { x: 3, y: 3 });
});

test('魔喰い hunts another monster and grows its level, HP, attack and defense after a kill', () => {
  const { state, hunter, prey, engine } = hunterFixture();
  const before = { hp: hunter.maxHp, attack: hunter.attack, defense: hunter.defense };
  engine.performMonsterAction(hunter, { int: (_min, max) => max });
  assert.equal(state.monsters.some((monster) => monster.id === prey.id), false);
  assert.equal(hunter.hunterLevel, 2);
  assert.ok(hunter.maxHp > before.hp);
  assert.ok(hunter.hp > 0);
  assert.ok(hunter.attack > before.attack);
  assert.ok(hunter.defense > before.defense);
  assert.match(state.message, /魔喰いはLv\.2に成長/);
});

test('schema 11 saves migrate to schema 12 without losing the current run', () => {
  const state = createNewGame(0x38ab21ef, 'beginner');
  state.schemaVersion = 11;
  for (const monster of state.monsters) {
    delete monster.hunterVariant;
    delete monster.hunterLevel;
  }
  const migrated = migrateGameState(state);
  assert.equal(migrated.schemaVersion, 12);
  assert.ok(migrated.monsters.every((monster) => monster.hunterVariant === false));
  assert.equal(validateGameState(migrated), true);
});

test('schema 12 keeps hunter level and all release markers aligned', async () => {
  const { state, hunter } = hunterFixture();
  hunter.hunterLevel = 4;
  const migrated = migrateGameState(state);
  assert.equal(migrated.monsters.find((monster) => monster.id === hunter.id).hunterLevel, 4);
  assert.equal(validateGameState(migrated), true);
  const [main, manifest, sw, engine, storage] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'),
    read('assets/engine.js'), read('assets/storage.js'),
  ]);
  assert.match(main, /APP_VERSION = '5\.0\.0'/);
  assert.match(manifest, /"version": "5\.0\.0"/);
  assert.match(sw, /sou-watari-tabiroku-v5-0-0/);
  assert.match(engine, /schemaVersion: 12/);
  assert.match(storage, /version: 12, savedAt:/);
});
