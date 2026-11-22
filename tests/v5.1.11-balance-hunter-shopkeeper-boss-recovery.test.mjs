import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNewGame, GameEngine } from '../assets/engine.js';
import { getItemRecovery, itemDescription, POTION_HP_MULTIPLIER, getMonsterTierProgress, getFloorStatAdjustment, getMonsterTierEntryMultiplier, canSpawnRareMonster, canSpawnMagicEater } from '../assets/balance.mjs';
import { getBossStats, getModeConfig as getBossModeConfig } from '../assets/modes.js';
import { getShopBuyPrice } from '../assets/shop.js';

test('expert final tier enters at floor 25 and ramps across floors 25–29', () => {
  assert.equal(getMonsterTierProgress('expert', 20, 30), Math.pow(19 / 28, 1.15));
  assert.equal(getMonsterTierProgress('expert', 25, 30), Math.pow(24 / 28, 1.15));
  assert.ok(getMonsterTierProgress('expert', 25, 30) > Math.pow(24 / 28, 1.6));
  const ramp = [25, 26, 27, 28, 29].map((floor) => getMonsterTierProgress('expert', floor, 30));
  assert.ok(ramp.every((value, index) => index === 0 || value > ramp[index - 1]));
  assert.equal(ramp.at(-1), 1);
  assert.equal(getMonsterTierProgress('advanced', 20, 25), Math.pow(19 / 23, 1.35));
  const advancedRamp = [19, 20, 21, 22, 23, 24].map((floor) => getMonsterTierProgress('advanced', floor, 25));
  assert.ok(advancedRamp.every((value, index) => index === 0 || value > advancedRamp[index - 1]));
  assert.equal(advancedRamp.at(-1), 1);
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

test('HP recovery items restore the original fixed values with the 1.75 potion multiplier', () => {
  const potion = { kind: 'potion', heal: 15, hungerRestore: 3 };
  assert.equal(POTION_HP_MULTIPLIER, 1.75);
  assert.deepEqual(getItemRecovery(potion, 80), { heal: 26, hungerRestore: 3 });
  assert.deepEqual(getItemRecovery(potion, 200), { heal: 26, hungerRestore: 3 });
  assert.deepEqual(getItemRecovery({ kind: 'food', hungerRestore: 20 }, 80),
    { heal: 0, hungerRestore: 25 });
  assert.match(itemDescription(potion), /HPを26回復/);

  const state = createNewGame(0x51111, 'beginner');
  state.monsters = [];
  state.player.maxHp = 80;
  state.player.hp = 20;
  state.player.hunger = 120;
  state.inventory = [{ item: { uid: 'fixed-potion', name: '回復薬', kind: 'potion', heal: 15, hungerRestore: 0 }, count: 1 }];
  const engine = new GameEngine(state);
  assert.equal(engine.useItem('fixed-potion'), true);
  assert.equal(state.player.hp, 46);
});

test('every potion template matches its original fixed heal value and displayed recovery', async () => {
  const source = await readFile(new URL('../assets/items.js', import.meta.url), 'utf8');
  const expected = [
    ['potion', 8, 14], ['healing-potion', 15, 26], ['greater-potion', 25, 44],
    ['royal-potion', 40, 70], ['elixir', 65, 114], ['greater-elixir', 85, 149],
    ['ancient-elixir', 110, 193], ['honey-herb', 12, 21], ['spring-tonic', 32, 56],
    ['minor-elixir', 10, 18], ['deepwell-potion', 52, 91], ['phoenix-tear', 95, 166],
    ['moon-salve', 28, 49], ['void-tonic', 125, 219],
  ];
  for (const [id, rawHeal, displayedHeal] of expected) {
    const line = source.split('\n').find((entry) => entry.includes(`id: '${id}'`));
    assert.ok(line, `missing potion template ${id}`);
    assert.match(line, new RegExp(`heal: ${rawHeal},`));
    assert.match(line, new RegExp(`description: 'HPを${displayedHeal}回復`));
    assert.equal(getItemRecovery({ kind: 'potion', heal: rawHeal }).heal, displayedHeal);
  }
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
  const state = createNewGame(0x51114, 'intermediate');
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(1));
  state.dungeon.stairs = null;
  state.player.x = 10;
  state.player.y = 6;
  const boss = {
    id: 'area-boss', kind: 'boss', name: '範囲攻撃ボス',
    x: 5, y: 5, hp: 316, maxHp: 316, attack: 40, defense: 5,
    exp: 10, boss: true, bossBalanceVersion: 3, bossSize: 2,
    bossAreaAttackChance: 0.38, bossNovaAttackChance: 0, bossEnrageThreshold: 0,
    bossEnrageAttackMultiplier: 1, actionSpeed: 'normal', actionProgress: 0,
  };
  state.monsters = [boss];
  const engine = new GameEngine(state);
  const playerHpBefore = state.player.hp;
  engine.performMonsterAction(boss, { int: (min) => min, chance: () => true });
  assert.equal(playerHpBefore - state.player.hp, 22);
  assert.match(state.message, /範囲攻撃/);
  assert.deepEqual(state.bossAreaEffect, { x: 10, y: 6, radius: 1, turn: state.turn + 1 });
});

test('boss profiles scale in size, toughness and attack patterns across campaigns', () => {
  const expected = [
    ['tutorial', { hp: 42, attack: 6, defense: 1, bossSize: 1, bossVisualScale: 0.5, bossAreaAttackChance: 0, bossNovaAttackChance: 0 }],
    ['beginner', { hp: 160, attack: 14, defense: 4, bossSize: 2, bossVisualScale: 0.78, bossAreaAttackChance: 0.12, bossNovaAttackChance: 0 }],
    ['intermediate', { hp: 316, attack: 25, defense: 8, bossSize: 2, bossVisualScale: 1, bossAreaAttackChance: 0.38, bossNovaAttackChance: 0 }],
    ['advanced', { hp: 430, attack: 33, defense: 10, bossSize: 3, bossVisualScale: 1.5, bossAreaAttackChance: 0.42, bossNovaAttackChance: 0.12 }],
    ['expert', { hp: 560, attack: 42, defense: 12, bossSize: 4, bossVisualScale: 2, bossAreaAttackChance: 0.45, bossNovaAttackChance: 0.20 }],
  ];
  for (const [modeId, expectedStats] of expected) {
    const profile = getBossStats(modeId, 'normal');
    const actual = Object.fromEntries(Object.keys(expectedStats).map((key) => [key, profile[key]]));
    assert.deepEqual(actual, expectedStats, modeId);
  }
  assert.equal(getBossStats('tutorial', 'slow').attack, 6);
  assert.equal(getBossStats('beginner', 'fast').attack, 14);
  assert.equal(getBossStats('intermediate', 'slow').attack, 32);
  assert.equal(getBossModeConfig('beginner').bossFloorMonsters, 3);
  assert.equal(getBossModeConfig('intermediate').bossFloorMonsters, 5);
  assert.equal(getBossModeConfig('advanced').bossFloorMonsters, 6);
  assert.equal(getBossModeConfig('expert').bossFloorMonsters, 7);
  for (const modeId of ['beginner', 'intermediate', 'advanced', 'expert']) {
    const rareRate = getBossModeConfig(modeId).bossSupportRareChance;
    assert.ok(rareRate > 0 && rareRate <= 0.04, `${modeId} rare support rate should stay low`);
  }
});

test('tutorial boss has no ranged area attack or speed variant', () => {
  const state = createNewGame(0x515150, 'tutorial');
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(1));
  state.dungeon.stairs = null;
  state.player.x = 10;
  state.player.y = 6;
  const boss = {
    id: 'tutorial-boss', kind: 'boss', name: '坑道の守り手',
    x: 5, y: 5, hp: 42, maxHp: 42, attack: 6, defense: 1,
    exp: 78, boss: true, bossBalanceVersion: 3, bossSize: 1,
    bossAreaAttackChance: 0, bossNovaAttackChance: 0, bossEnrageThreshold: 0,
    bossEnrageAttackMultiplier: 1, actionSpeed: 'normal', actionProgress: 0,
  };
  state.monsters = [boss];
  const engine = new GameEngine(state);
  const playerHpBefore = state.player.hp;
  engine.performMonsterAction(boss, { int: (min) => min, chance: () => true });
  assert.equal(state.player.hp, playerHpBefore);
  assert.equal(state.bossAreaEffect, undefined);
});

test('legacy boss saves are rebalanced once while preserving the remaining HP ratio', () => {
  const state = createNewGame(0x515151, 'beginner');
  state.floor = getBossModeConfig('beginner').floors;
  state.dungeon.bossArena = true;
  state.dungeon.stairs = null;
  state.monsters = [{
    id: 'legacy-boss', kind: 'boss', name: '旧ボス',
    x: 5, y: 5, hp: 50, maxHp: 100, attack: 40, defense: 12,
    exp: 180, boss: true, actionSpeed: 'normal', actionProgress: 0,
  }];
  new GameEngine(state);
  assert.equal(state.monsters[0].maxHp, 160);
  assert.equal(state.monsters[0].hp, 80);
  assert.equal(state.monsters[0].attack, 14);
  assert.equal(state.monsters[0].defense, 4);
  assert.equal(state.monsters[0].bossBalanceVersion, 3);
  assert.equal(state.monsters[0].bossSize, 2);
  assert.equal(state.monsters.length, 4);
  new GameEngine(state);
  assert.equal(state.monsters[0].hp, 80);
  assert.equal(state.monsters[0].maxHp, 160);
  assert.equal(state.monsters.length, 4);
});

test('advanced bosses unlock the five-tile nova and a stronger low-HP phase', () => {
  const state = createNewGame(0x515152, 'expert');
  state.floor = getBossModeConfig('expert').floors;
  state.dungeon.bossArena = true;
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(1));
  state.dungeon.rooms = [{ x: 2, y: 2, width: 35, height: 35 }];
  state.dungeon.stairs = null;
  state.player.x = 14;
  state.player.y = 6;
  const boss = {
    id: 'expert-boss', kind: 'boss', name: '星喰らい',
    x: 5, y: 5, hp: 200, maxHp: 560, attack: 42, defense: 12,
    exp: 760, boss: true, bossBalanceVersion: 3, bossSize: 4,
    bossAreaAttackChance: 0.45, bossNovaAttackChance: 0.20,
    bossEnrageThreshold: 0.45, bossEnrageAttackMultiplier: 1.22,
    actionSpeed: 'normal', actionProgress: 0,
  };
  state.monsters = [boss];
  const engine = new GameEngine(state);
  engine.performMonsterAction(boss, { int: (min) => min, chance: () => true });
  assert.equal(boss.bossEnraged, true);
  assert.deepEqual(state.bossAreaEffect, { x: 14, y: 6, radius: 2, turn: state.turn + 1 });
  assert.match(state.message, /大爆発/);
  assert.match(state.message, /怒りに震え/);
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
  assert.match(renderer, /bossVisualScale/);
  assert.match(renderer, /bossVisualStyle/);
});
