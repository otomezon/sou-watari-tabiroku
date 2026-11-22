import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNewGame, GameEngine, getDragonBreath } from '../assets/engine.js';
import { getEnemyLevel } from '../assets/enemy-level.mjs';

function makeDragonState(kind, seed) {
  const state = createNewGame(seed, 'advanced');
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(1));
  state.dungeon.stairs = null;
  state.player.x = 12;
  state.player.y = 10;
  state.monsters = [{
    id: 'dragon', kind, name: 'テストドラゴン',
    x: 8, y: 10, hp: 100, maxHp: 100, attack: 20, defense: 0,
    exp: 40, boss: false, floorBalanceVersion: 6, rareVariant: false, actionSpeed: 'normal',
  }];
  return state;
}

const guaranteedBreath = { int: (min) => min, chance: () => true };

test('dragon breath patterns are based on dragon kind, not rare-variant status', () => {
  assert.deepEqual(getDragonBreath('wyvern'), { element: 'fire', name: '炎のブレス' });
  assert.deepEqual(getDragonBreath('black-drake'), { element: 'fire', name: '炎のブレス' });
  assert.deepEqual(getDragonBreath('void-dragon'), { element: 'fire', name: '炎のブレス' });
  assert.deepEqual(getDragonBreath('frost-drake'), { element: 'blizzard', name: 'ブリザード' });
  assert.equal(getDragonBreath('salamander'), null);
});

test('a normal wyvern breathes outward from its position along a horizontal line', () => {
  const state = makeDragonState('wyvern', 0x51301);
  const dragon = state.monsters[0];
  state.monsters.push(
    { id: 'impact-tile', kind: 'slime', name: '着弾マスのスライム', x: 12, y: 10, hp: 1, maxHp: 1, attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 6 },
    { id: 'adjacent-a', kind: 'bat', name: '隣接マスのコウモリ', x: 12, y: 9, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 6 },
    { id: 'adjacent-b', kind: 'kobold', name: '横隣のコボルト', x: 11, y: 10, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 6 },
    { id: 'vertical-upper', kind: 'mushroom', name: '上側の胞子キノコ', x: 12, y: 8, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 6 },
    { id: 'vertical-lower', kind: 'scorpion', name: '下側の銅サソリ', x: 12, y: 12, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 6 },
    { id: 'outside-area', kind: 'wolf', name: '範囲外のオオカミ', x: 14, y: 10, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 6 },
  );
  const engine = new GameEngine(state);
  const playerHpBefore = state.player.hp;
  engine.performMonsterAction(dragon, guaranteedBreath);

  assert.deepEqual(state.elementalAreaEffect, {
    x: 12, y: 10,
    cells: [{ x: 9, y: 10 }, { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 }],
    element: 'fire', turn: state.turn + 1,
  });
  assert.equal(state.monsters.some((monster) => monster.id === 'impact-tile'), false);
  assert.equal(state.monsters.find((monster) => monster.id === 'adjacent-a').hp, 40);
  assert.equal(state.monsters.find((monster) => monster.id === 'adjacent-b').hp, 29);
  assert.equal(state.monsters.find((monster) => monster.id === 'vertical-upper').hp, 40);
  assert.equal(state.monsters.find((monster) => monster.id === 'vertical-lower').hp, 40);
  assert.equal(state.monsters.find((monster) => monster.id === 'outside-area').hp, 40);
  assert.equal(dragon.level, 2);
  assert.equal(getEnemyLevel(dragon), 2);
  assert.equal(engine.getMonsterLevelUpCount(), 1);
  assert.equal(state.player.hp, playerHpBefore - 9);
  assert.match(state.message, /炎のブレス/);
  assert.ok(state.message.includes('Lv.2に成長'));
});

test('frost drakes send blizzard along the same line from their position', () => {
  const state = makeDragonState('frost-drake', 0x51302);
  const dragon = state.monsters[0];
  state.monsters.push(
    { id: 'ice-impact', kind: 'slime', name: '氷に巻き込まれたスライム', x: 12, y: 10, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 6 },
    { id: 'ice-adjacent', kind: 'bat', name: '縦列のコウモリ', x: 12, y: 9, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 6 },
    { id: 'ice-side', kind: 'wolf', name: '横のオオカミ', x: 11, y: 10, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 6 },
  );
  const engine = new GameEngine(state);
  engine.performMonsterAction(dragon, guaranteedBreath);

  assert.deepEqual(state.elementalAreaEffect, {
    x: 12, y: 10,
    cells: [{ x: 9, y: 10 }, { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 }],
    element: 'blizzard', turn: state.turn + 1,
  });
  assert.equal(state.monsters.find((monster) => monster.id === 'ice-impact').hp, 29);
  assert.equal(state.monsters.find((monster) => monster.id === 'ice-adjacent').hp, 40);
  assert.equal(state.monsters.find((monster) => monster.id === 'ice-side').hp, 29);
  assert.match(state.message, /ブリザード/);
});

test('dragon breath cannot pass through walls', () => {
  const state = makeDragonState('wyvern', 0x51303);
  state.dungeon.tiles[10][10] = 0;
  const dragon = state.monsters[0];
  const engine = new GameEngine(state);
  const playerHpBefore = state.player.hp;
  engine.performMonsterAction(dragon, guaranteedBreath);

  assert.equal(state.elementalAreaEffect, undefined);
  assert.equal(state.player.hp, playerHpBefore);
});

test('elemental attack warnings render the same origin-to-player cells used by collision logic', async () => {
  const [engine, renderer] = await Promise.all([
    readFile(new URL('../assets/engine.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/renderer.js', import.meta.url), 'utf8'),
  ]);
  assert.match(engine, /const cells = getLineCells\(monster, center\)/);
  assert.match(engine, /hitCells\.has\(pointKey\(cell\)\)/);
  assert.match(renderer, /elementalAreaEffect\.turn === state\.turn/);
  assert.match(renderer, /Array\.isArray\(effect\.cells\)/);
  assert.match(renderer, /for \(const cell of cells\)/);
});
