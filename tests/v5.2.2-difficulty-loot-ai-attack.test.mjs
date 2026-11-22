import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNewGame, GameEngine, getAttack, getDefense } from '../assets/engine.js';
import { MODE_ORDER, getModeConfig } from '../assets/modes.js';
import { getRareValuableDropChances } from '../assets/balance.mjs';
import { SoundManager } from '../assets/audio.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('difficulty targets and enemy stat ceilings rise in a clear campaign order', async () => {
  const engineSource = await read('assets/engine.js');
  const expected = {
    tutorial: [0.58, 0.62, 1.19],
    beginner: [0.62, 0.65, 1.19],
    intermediate: [0.70, 0.76, 1.19],
    advanced: [0.67, 0.73, 1.19],
    expert: [0.78, 0.84, 1.38],
  };
  const caps = MODE_ORDER.map((mode) => expected[mode][2]);
  assert.ok(caps.every((cap, index) => index === 0 || cap >= caps[index - 1]));
  for (const modeId of MODE_ORDER) {
    const mode = getModeConfig(modeId);
    const values = Array.from({ length: mode.floors }, (_, index) => {
      const floor = index + 1;
      const progress = floor === mode.floors ? 1 : (floor - 1) / Math.max(1, mode.floors - 1);
      const eased = progress * progress * (3 - 2 * progress);
      return expected[modeId][0] + (expected[modeId][1] - expected[modeId][0]) * eased;
    });
    assert.equal(Number(values[0].toFixed(2)), expected[modeId][0]);
    assert.equal(Number(values.at(-1).toFixed(2)), expected[modeId][1]);
    assert.ok(values.every((value, index) => index === 0 || value >= values[index - 1]));
  }
  assert.match(engineSource, /FLOOR_MONSTER_BALANCE_VERSION = 7/);

  assert.match(engineSource, /const maximumAdjustment = modeId === 'expert' \? 1\.38 : 1\.19/);
});

test('floor caches and ordinary enemy item drops are less frequent in every campaign', async () => {
  const modesSource = await read('assets/modes.js');
  const expectedFloorRates = {
    tutorial: 0.44, beginner: 0.40, intermediate: 0.36, advanced: 0.34, expert: 0.32,
  };
  const expectedEnemyItemDrops = {
    tutorial: [0.010, 0.025, 0.026, 0.003],
    beginner: [0.010, 0.022, 0.020, 0.003],
    intermediate: [0.010, 0.021, 0.018, 0.0035],
    advanced: [0.011, 0.020, 0.017, 0.004],
    expert: [0.012, 0.019, 0.016, 0.0045],
  };
  for (const modeId of MODE_ORDER) {
    const mode = getModeConfig(modeId);
    assert.equal(mode.floorLootChance, expectedFloorRates[modeId]);
    assert.equal(mode.minMonsters, ({ tutorial: 3, beginner: 4, intermediate: 5, advanced: 5, expert: 6 })[modeId]);
    assert.equal(mode.maxMonsters, ({ tutorial: 5, beginner: 7, intermediate: 8, advanced: 9, expert: 10 })[modeId]);
    const actual = [
      mode.enemyDropEquipment, mode.enemyDropPotion,
      mode.enemyDropFood, mode.enemyDropValuable,
    ];
    assert.deepEqual(actual, expectedEnemyItemDrops[modeId]);
    assert.ok(actual.reduce((sum, rate) => sum + rate, 0) < 0.07,
      `${modeId}: ordinary monster item-drop odds should remain scarce`);
  }
  assert.deepEqual(getRareValuableDropChances('beginner'), { hunter: 0.10, otherRare: 0.03 });
  assert.deepEqual(getRareValuableDropChances('expert'), { hunter: 0.08, otherRare: 0.025 });
  assert.match(modesSource, /floorLootChance: 0\.32/);
});

test('rear monsters follow a one-way weighted route around a stationary blocker', () => {
  const state = createNewGame(0x522220, 'intermediate');
  state.dungeon.tiles = Array.from({ length: 24 }, () => Array(24).fill(1));
  state.dungeon.stairs = null;
  state.player.x = 12;
  state.player.y = 5;
  const blocker = {
    id: 'queue-front', kind: 'slime', name: '前方の魔物',
    x: 8, y: 5, hp: 90, maxHp: 90, attack: 1, defense: 0, exp: 5,
    boss: false, floorBalanceVersion: 7,
  };
  const pursuer = {
    id: 'queue-rear', kind: 'bat', name: '後方の魔物',
    x: 6, y: 5, hp: 90, maxHp: 90, attack: 1, defense: 0, exp: 5,
    boss: false, floorBalanceVersion: 7,
  };
  state.monsters = [blocker, pursuer];
  const engine = new GameEngine(state);
  const visited = [`${pursuer.x},${pursuer.y}`];
  const random = { int: (min) => min, chance: () => false };
  for (let action = 0; action < 10; action += 1) {
    engine.performMonsterAction(pursuer, random);
    const position = `${pursuer.x},${pursuer.y}`;
    if (position !== visited.at(-1))
      visited.push(position);
  }
  assert.ok(visited.length >= 3, 'the rear monster should route around the blocker rather than remain stuck');
  assert.equal(new Set(visited).size, visited.length,
    `the rear monster must not reverse through earlier cells: ${visited.join(' -> ')}`);
});

test('invalid attack directions and malformed combat stats cannot generate NaN or abort a turn', () => {
  const state = createNewGame(0x522221, 'beginner');
  state.dungeon.tiles = Array.from({ length: 20 }, () => Array(20).fill(1));
  state.dungeon.stairs = null;
  state.player.x = 5;
  state.player.y = 5;
  const target = {
    id: 'invalid-stat-target', kind: 'slime', name: '検証用スライム',
    x: 6, y: 5, hp: 100, maxHp: 100, attack: 1, defense: Number.NaN,
    exp: 1, boss: false, floorBalanceVersion: 7,
  };
  state.monsters = [target];
  const engine = new GameEngine(state);

  const turnBeforeInvalidInput = state.turn;
  assert.doesNotThrow(() => engine.move('not-a-direction'));
  assert.equal(state.turn, turnBeforeInvalidInput);
  assert.match(state.message, /移動方向/);

  state.equipment.weapon = {
    uid: 'damaged-invalid-weapon', kind: 'weapon', attack: Number.NaN,
    enhancement: Number.NaN, durability: 50,
  };
  assert.equal(Number.isFinite(getAttack(state)), true);
  assert.equal(Number.isFinite(getDefense(state)), true);
  assert.doesNotThrow(() => engine.move('right'));
  assert.ok(Number.isFinite(target.hp));
  assert.ok(target.hp < 100, 'a malformed optional stat must not prevent a valid attack');
  assert.equal(state.turn, turnBeforeInvalidInput + 1);
  assert.equal(engine.attackMonster(null, engine.actionRandom()), false);
});

test('attack sound failures and already-closed audio contexts never invalidate combat', async () => {
  const sound = new SoundManager();
  sound.context = { state: 'closed' };
  sound.sfxGain = {};
  assert.doesNotThrow(() => sound.effectSequence(['attack', 'damage']));

  const audio = await read('assets/audio.js');
  const main = await read('assets/main.js');
  assert.match(audio, /this\.context\.state === 'closed'/);
  assert.match(audio, /this\.context = new AudioContextConstructor\(\)/);
  assert.match(audio, /Short sound effect was skipped/);
  assert.match(main, /Sound playback failed after the game action/);
  assert.match(main, /if \(!player \|\| !step \|\| !Number\.isInteger\(step\.x\)/);
});

test('v5.2.2 historical patch metadata remains intact under the current v5.2.5 app', async () => {
  const [main, manifest, sw, release, engine] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'),
    read('RELEASE_v5.2.2.yaml'), read('assets/engine.js'),
  ]);
  assert.match(main, /APP_VERSION = '5\.2\.5'/);
  assert.match(manifest, /"version": "5\.2.5"/);
  assert.match(sw, /sou-watari-tabiroku-v5-2-5/);
  assert.match(engine, /schemaVersion: 12/);
  assert.match(main, /floorBalanceVersion \?\? 0\) < 7/);
  assert.match(release, /type: patch/);
  assert.match(release, /save_schema: 12/);
  assert.match(release, /enemy_balance_version: 7/);
});
