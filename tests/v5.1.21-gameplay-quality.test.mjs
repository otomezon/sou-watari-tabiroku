import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createNewGame, GameEngine, getFloorEncounterPowerTarget,
  getFloorMonsterCalibration, getLegacyV4FloorMonsterCalibration,
} from '../assets/engine.js';
import { getGoldDropChance, getItemRecovery, NORMAL_GOLD_DROP_CHANCE_MULTIPLIER } from '../assets/balance.mjs';
import { MODE_ORDER, DUNGEON_MODES } from '../assets/modes.js';
import { itemIcon } from '../assets/items.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const minimumRandom = { int: (min) => min, chance: () => true };

function makeDragonState(distance) {
  const state = createNewGame(0x52121, 'advanced');
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(1));
  state.dungeon.stairs = null;
  state.player.x = 12;
  state.player.y = 10;
  const dragon = {
    id: 'line-dragon', kind: 'wyvern', name: '検証ワイバーン',
    x: state.player.x - distance, y: state.player.y,
    hp: 100, maxHp: 100, attack: 20, defense: 0, exp: 40,
    boss: false, floorBalanceVersion: 5, rareVariant: false, actionSpeed: 'normal',
  };
  state.monsters = [dragon];
  return { state, dragon };
}

test('the expert opening eases over five floors and reaches the existing target on floor five', () => {
  assert.equal(getFloorEncounterPowerTarget('expert', 1), 0.72);
  assert.ok(Math.abs(getFloorEncounterPowerTarget('expert', 3) - 0.77) < 1e-12);
  assert.ok(Math.abs(getFloorEncounterPowerTarget('expert', 5) - 0.82) < 1e-12);
  assert.equal(getFloorEncounterPowerTarget('advanced', 1), 0.70);
  assert.ok(getFloorMonsterCalibration('expert', 1) < getLegacyV4FloorMonsterCalibration('expert', 1));
  assert.ok(Math.abs(
    getFloorMonsterCalibration('expert', 5) - getLegacyV4FloorMonsterCalibration('expert', 5),
  ) < 1e-12);
});

test('fresh campaigns start with one usable rice ball and no free equipment', () => {
  for (const mode of MODE_ORDER) {
    const state = createNewGame(0x52121, mode);
    assert.deepEqual(state.equipment, { weapon: null, shield: null, armor: null });
    assert.equal(state.inventory.length, 1);
    const stack = state.inventory[0];
    assert.equal(stack.item.templateId, 'rice-ball');
    assert.equal(stack.item.name, 'おむすび');
    assert.equal(stack.count, 1);
    assert.deepEqual(getItemRecovery(stack.item), { heal: 0, hungerRestore: 40 });
    assert.equal(itemIcon(stack.item), '🍙');
  }
});

test('the starting rice ball can be eaten through the existing consumable system', () => {
  const state = createNewGame(0x52122, 'beginner');
  state.monsters = [];
  state.player.hunger = 60;
  const uid = state.inventory[0].item.uid;
  const engine = new GameEngine(state);
  assert.equal(engine.useItem(uid), true);
  assert.equal(state.player.hunger, 100);
  assert.equal(state.inventory.length, 0);
});

test('ordinary monsters can path through the stair tile instead of treating it as a wall', () => {
  const state = createNewGame(0x52123, 'intermediate');
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(0));
  for (let x = 1; x <= 8; x += 1) state.dungeon.tiles[5][x] = 1;
  state.dungeon.stairs = { x: 4, y: 5 };
  state.player.x = 6;
  state.player.y = 5;
  const monster = {
    id: 'stair-pursuer', kind: 'slime', name: '追跡スライム',
    x: 2, y: 5, hp: 30, maxHp: 30, attack: 4, defense: 0, exp: 1,
    boss: false, floorBalanceVersion: 5, actionSpeed: 'normal',
  };
  state.monsters = [monster];
  const engine = new GameEngine(state);
  engine.performMonsterAction(monster, minimumRandom);
  assert.deepEqual({ x: monster.x, y: monster.y }, { x: 3, y: 5 });
  engine.performMonsterAction(monster, minimumRandom);
  assert.deepEqual({ x: monster.x, y: monster.y }, { x: 4, y: 5 });
});

test('dragon breath telegraphs and damages the tiles between the dragon and player', () => {
  const { state, dragon } = makeDragonState(4);
  const lineTarget = {
    id: 'line-target', kind: 'slime', name: '射線上のスライム',
    x: 10, y: 10, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1,
    boss: false, floorBalanceVersion: 5,
  };
  const sideTarget = {
    id: 'side-target', kind: 'bat', name: '射線外のコウモリ',
    x: 10, y: 11, hp: 40, maxHp: 40, attack: 1, defense: 0, exp: 1,
    boss: false, floorBalanceVersion: 5,
  };
  state.monsters.push(lineTarget, sideTarget);
  const engine = new GameEngine(state);
  engine.performMonsterAction(dragon, minimumRandom);
  assert.deepEqual(state.elementalAreaEffect.cells, [
    { x: 9, y: 10 }, { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 },
  ]);
  assert.equal(lineTarget.hp, 29);
  assert.equal(sideTarget.hp, 40);
});

test('a two-tile dragon breath uses exactly two visible path tiles', () => {
  const { state, dragon } = makeDragonState(2);
  const engine = new GameEngine(state);
  engine.performMonsterAction(dragon, minimumRandom);
  assert.deepEqual(state.elementalAreaEffect.cells, [
    { x: 11, y: 10 }, { x: 12, y: 10 },
  ]);
});

test('reflective rare monsters return a small portion of nonlethal damage', () => {
  const state = createNewGame(0x52124, 'intermediate');
  const monster = {
    id: 'reflective-test', kind: 'slime', name: '反響するスライム',
    x: state.player.x + 1, y: state.player.y, hp: 50, maxHp: 50,
    attack: 4, defense: 0, exp: 1, boss: false, floorBalanceVersion: 5,
    rareVariant: true, reflectDamageRate: 0.22,
  };
  state.monsters = [monster];
  const engine = new GameEngine(state);
  const hpBefore = state.player.hp;
  engine.attackMonster(monster, { int: () => 0, next: () => 0.5, pick: (items) => items[0] });
  assert.equal(state.player.hp, hpBefore - 1);
  assert.match(state.message, /反響する力/);
});

test('weapon durability decreases once per two successful player strikes', () => {
  const state = createNewGame(0x52125, 'beginner');
  const weapon = {
    uid: 'durable-test-sword', name: '検証用の剣', kind: 'weapon',
    attack: 3, defense: 0, durability: 6, maxDurability: 6, enhancement: 0,
  };
  state.equipment.weapon = weapon;
  const monster = {
    id: 'durability-target', kind: 'slime', name: '耐久検証敵',
    x: state.player.x + 1, y: state.player.y, hp: 100, maxHp: 100,
    attack: 1, defense: 0, exp: 1, boss: false, floorBalanceVersion: 5,
  };
  state.monsters = [monster];
  const engine = new GameEngine(state);
  const random = { int: () => 0, next: () => 0.99 };
  engine.attackMonster(monster, random);
  assert.equal(weapon.durability, 6);
  assert.equal(weapon.durabilityWearCounter, 1);
  engine.attackMonster(monster, random);
  assert.equal(weapon.durability, 5);
  assert.equal(weapon.durabilityWearCounter, 0);
});

test('gold becomes less frequent as useful item drops become more common', () => {
  assert.equal(NORMAL_GOLD_DROP_CHANCE_MULTIPLIER, 0.88);
  assert.equal(getGoldDropChance(0.25), 0.22);
  assert.equal(getGoldDropChance(0.25, true), 0.33);
  const modes = Object.values(DUNGEON_MODES);
  assert.ok(modes.every((mode) =>
    mode.enemyDropEquipment + mode.enemyDropValuable + mode.enemyDropPotion + mode.enemyDropFood > 0.075));
  assert.ok(modes.every((mode) => mode.enemyDropGold < 0.30));
});

test('monster growth uses a distinct fanfare and the map uses item-specific silhouettes', async () => {
  const [audio, main, renderer] = await Promise.all([
    read('assets/audio.js'), read('assets/main.js'), read('assets/renderer.js'),
  ]);
  assert.match(main, /monsterLevelCues = Array\.from\(\{ length: monsterLevelUps \}, \(\) => 'monster-level'\)/);
  assert.match(audio, /playMonsterLevelUpFanfare/);
  assert.match(audio, /playLevelUpFanfare\(requestedStart, -7, true\)/);
  assert.match(renderer, /templateId === 'rice-ball'/);
  assert.match(renderer, /kind === 'weapon'/);
  assert.match(renderer, /kind === 'shield'/);
  assert.match(renderer, /kind === 'armor'/);
  assert.match(renderer, /kind === 'food'/);
  assert.match(renderer, /elementalAreaEffect/);
});

test('existing v4 monsters are recalibrated without double-applying the HP and combat-stat multipliers', () => {
  const state = createNewGame(0x52126, 'expert');
  state.floor = 2;
  state.dungeon.stairs = null;
  const oldCalibration = getLegacyV4FloorMonsterCalibration('expert', 2);
  const newCalibration = getFloorMonsterCalibration('expert', 2);
  const oldMonster = {
    id: 'legacy-v4', kind: 'slime', name: 'v4保存敵',
    x: state.player.x + 2, y: state.player.y, hp: 40, maxHp: 80,
    attack: 20, defense: 6, exp: 10, boss: false, floorBalanceVersion: 4,
  };
  state.monsters = [oldMonster];
  new GameEngine(state);
  const ratio = newCalibration / oldCalibration;
  assert.equal(oldMonster.floorBalanceVersion, 5);
  assert.equal(oldMonster.maxHp, Math.round(80 * ratio));
  assert.equal(oldMonster.hp, Math.round(oldMonster.maxHp * 0.5));
  assert.equal(oldMonster.attack, Math.max(1, Math.round(20 * ratio)));
});
