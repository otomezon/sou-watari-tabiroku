import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNewGame, GameEngine } from '../assets/engine.js';
import { getItemRecovery, itemDescription, getMonsterTierProgress, getFloorStatAdjustment, getMonsterTierEntryMultiplier, canSpawnRareMonster, canSpawnMagicEater } from '../assets/balance.mjs';
import { getShopBuyPrice } from '../assets/shop.js';

test('expert final tier enters at floor 25 and ramps across floors 25–29', () => {
  assert.equal(getMonsterTierProgress('expert', 20, 30), Math.pow(19 / 28, 1.15));
  assert.equal(getMonsterTierProgress('expert', 25, 30), Math.pow(24 / 28, 1.15));
  assert.ok(getMonsterTierProgress('expert', 25, 30) > Math.pow(24 / 28, 1.6));
  const ramp = [25, 26, 27, 28, 29].map((floor) => getMonsterTierProgress('expert', floor, 30));
  assert.ok(ramp.every((value, index) => index === 0 || value > ramp[index - 1]));
  assert.equal(ramp.at(-1), 1);
  assert.equal(getMonsterTierProgress('advanced', 20, 25), 19 / 23);
});

test('all campaigns receive a small monotonic stat ramp on every ordinary floor', () => {
  const campaigns = [
    ['tutorial', 5, 0.02], ['beginner', 10, 0.025], ['intermediate', 15, 0.035],
    ['advanced', 25, 0.045], ['expert', 30, 0.05],
  ];
  for (const [mode, floors, maxBonus] of campaigns) {
    let previous = 0;
    for (let floor = 1; floor < floors; floor += 1) {
      const adjustment = getFloorStatAdjustment(mode, floor, floors);
      assert.ok(adjustment >= 1 && adjustment <= 1 + maxBonus);
      assert.ok(adjustment >= previous, `${mode} floor ${floor} regressed`);
      previous = adjustment;
    }
    assert.equal(getFloorStatAdjustment(mode, 1, floors), 1);
    assert.equal(getFloorStatAdjustment(mode, floors - 1, floors), 1 + maxBonus);
  }
});

test('new upper-tier monsters gradually reach their authored stats', () => {
  const base = { lowerTierIndex: 2, upperTierIndex: 3, upperChance: 0 };
  assert.equal(getMonsterTierEntryMultiplier(base), 0.94);
  assert.equal(getMonsterTierEntryMultiplier({ ...base, upperChance: 0.5 }), 0.97);
  assert.equal(getMonsterTierEntryMultiplier({ ...base, upperChance: 1 }), 1);
  assert.equal(getMonsterTierEntryMultiplier({ lowerTierIndex: 3, upperTierIndex: 3, upperChance: 0 }), 1);
});

test('rare monsters can spawn on the first floor outside tutorial; beginner still excludes magic-eaters', () => {
  assert.equal(canSpawnRareMonster('tutorial'), false);
  for (const mode of ['beginner', 'intermediate', 'advanced', 'expert'])
    assert.equal(canSpawnRareMonster(mode), true);
  assert.equal(canSpawnMagicEater('tutorial'), false);
  assert.equal(canSpawnMagicEater('beginner'), false);
  assert.equal(canSpawnMagicEater('intermediate'), true);
  assert.equal(canSpawnMagicEater('expert'), true);
});

test('HP recovery items restore fixed hit points regardless of maximum HP', () => {
  const potion = { kind: 'potion', heal: 50, hungerRestore: 3 };
  assert.deepEqual(getItemRecovery(potion, 80), { heal: 50, hungerRestore: 3 });
  assert.deepEqual(getItemRecovery({ kind: 'food', hungerRestore: 20 }, 80),
    { heal: 0, hungerRestore: 25 });
  assert.match(itemDescription(potion), /HPを50回復/);

  const state = createNewGame(0x51111, 'beginner');
  state.monsters = [];
  state.player.maxHp = 80;
  state.player.hp = 20;
  state.player.hunger = 120;
  state.inventory = [{ item: { uid: 'fixed-potion', name: '回復薬', kind: 'potion', heal: 50, hungerRestore: 0 }, count: 1 }];
  const engine = new GameEngine(state);
  assert.equal(engine.useItem('fixed-potion'), true);
  assert.equal(state.player.hp, 70);
});

test('natural HP regeneration scales with max HP instead of always restoring one point', () => {
  const state = createNewGame(0x51112, 'beginner');
  state.monsters = [];
  state.player.maxHp = 200;
  state.player.hp = 100;
  state.player.hunger = 120;
  state.fedTurnCounter = 8;
  const engine = new GameEngine(state);
  engine.wait();
  assert.equal(state.player.hp, 102);
});

test('the shopkeeper attacks blockers and then continues along the pursuit route', () => {
  const state = createNewGame(0x51113, 'intermediate');
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(1));
  state.dungeon.stairs = null;
  state.player.x = 10;
  state.player.y = 5;
  const keeper = {
    id: 'pursuing-keeper', kind: 'stonewing-keeper', name: '石翼の番商',
    x: 3, y: 5, hp: 420, maxHp: 420, attack: 30, defense: 4,
    exp: 0, boss: false, shopkeeper: true, actionSpeed: 'fast',
  };
  const blocker = {
    id: 'route-blocker', kind: 'slime', name: '進路のスライム',
    x: 4, y: 5, hp: 1, maxHp: 1, attack: 1, defense: 0, exp: 1, boss: false,
  };
  state.monsters = [keeper, blocker];
  state.shop = { id: 'test-shop', hostile: true, stolenDebt: 100, keeper: { x: 3, y: 5 },
    bounds: { x: 1, y: 1, width: 3, height: 3 }, goods: [] };
  const engine = new GameEngine(state);
  const playerHpBefore = state.player.hp;
  engine.performMonsterAction(keeper, { int: (min) => min });
  assert.equal(state.monsters.some((monster) => monster.id === blocker.id), false);
  assert.equal(state.player.hp, playerHpBefore);
  engine.performMonsterAction(keeper, { int: (min) => min });
  assert.equal(keeper.x, 4);
  assert.equal(keeper.y, 5);
});

test('a boss can use a telegraphed area attack from several tiles away', () => {
  const state = createNewGame(0x51114, 'expert');
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(1));
  state.dungeon.stairs = null;
  state.player.x = 10;
  state.player.y = 6;
  const boss = {
    id: 'area-boss', kind: 'boss', name: '範囲攻撃ボス',
    x: 5, y: 5, hp: 500, maxHp: 500, attack: 40, defense: 5,
    exp: 10, boss: true, actionSpeed: 'normal', actionProgress: 0,
  };
  state.monsters = [boss];
  const engine = new GameEngine(state);
  const playerHpBefore = state.player.hp;
  engine.performMonsterAction(boss, { int: (min) => min, chance: () => true });
  assert.ok(state.player.hp < playerHpBefore);
  assert.match(state.message, /範囲攻撃/);
  assert.deepEqual(state.bossAreaEffect, { x: 10, y: 6, radius: 1, turn: state.turn + 1 });
});

test('top-tier gear receives a higher shop price', () => {
  const topWeapon = { kind: 'weapon', attack: 18, enhancement: 0 };
  const lowerWeapon = { kind: 'weapon', attack: 16, enhancement: 0 };
  assert.ok(getShopBuyPrice(topWeapon, 25) > getShopBuyPrice(lowerWeapon, 25));
});

test('the boss warning visual is rendered as an area overlay', async () => {
  const renderer = await readFile(new URL('../assets/renderer.js', import.meta.url), 'utf8');
  assert.match(renderer, /drawBossAreaEffect/);
  assert.match(renderer, /bossAreaEffect\.turn === state\.turn/);
});
