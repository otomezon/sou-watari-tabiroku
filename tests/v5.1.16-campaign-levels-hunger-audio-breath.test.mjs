import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createNewGame,
  GameEngine,
  getExpectedPlayerLevel,
  getFloorMonsterCalibration,
  getLegacyFloorMonsterCalibration,
  EXPECTED_MONSTER_DEFEAT_RATE,
  HUNGER_DECAY_EVERY_ACTIONS,
} from '../assets/engine.js';
import { validateGameState, migrateGameState } from '../assets/storage.js';
import { MODE_ORDER } from '../assets/modes.js';
import { getRareHunterStatScale, getSlowVariantAttackMultiplier } from '../assets/balance.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('expected player level uses a conservative 40% monster-clear rate', () => {
  assert.equal(EXPECTED_MONSTER_DEFEAT_RATE, 0.40);
  assert.deepEqual([
    getExpectedPlayerLevel('tutorial', 5),
    getExpectedPlayerLevel('beginner', 10),
    getExpectedPlayerLevel('intermediate', 15),
    getExpectedPlayerLevel('advanced', 25),
    getExpectedPlayerLevel('expert', 30),
  ], [3, 7, 12, 20, 27]);
  for (const mode of MODE_ORDER) {
    assert.equal(getExpectedPlayerLevel(mode, 1), 1);
  }
});

test('floor monster calibration is deliberately softer than both previous models', () => {
  const floors = { tutorial: 5, beginner: 10, intermediate: 15, advanced: 25, expert: 30 };
  for (const [mode, totalFloors] of Object.entries(floors)) {
    for (let floor = 1; floor <= totalFloors; floor += 1) {
      const adjustment = getFloorMonsterCalibration(mode, floor);
      assert.ok(adjustment >= 0.45 && adjustment <= 1.05, `${mode} F${floor}: ${adjustment}`);
    }
    const current = getFloorMonsterCalibration(mode, totalFloors);
    const previous70 = getLegacyFloorMonsterCalibration(mode, totalFloors, 0.70);
    assert.ok(current < previous70, `${mode}: current ${current} should be below previous ${previous70}`);
  }
});

const FLOOR_POWER_TARGETS = Object.freeze({
  tutorial: 0.48,
  beginner: 0.56,
  intermediate: 0.64,
  advanced: 0.72,
  expert: 0.80,
});

function expectedUnequippedPlayerPower(level) {
  const hp = 34 + (level - 1) * 6;
  const attack = 5 + (level - 1);
  const defense = 2 + Math.floor(level / 2);
  return hp + attack * 6 + defense * 4;
}

function monsterCombatPower(monster) {
  return monster.maxHp + monster.attack * 6 + monster.defense * 4;
}

test('rare monsters keep distinct roles without extreme un-geared damage spikes', () => {
  assert.deepEqual(getRareHunterStatScale('beginner', 5), { hp: 1.38, attack: 1.12, defense: 3 });
  assert.deepEqual(getRareHunterStatScale('expert', 28), { hp: 1.30, attack: 1.08, defense: 2 });
  assert.equal(getSlowVariantAttackMultiplier('beginner', 5), 1.70);
  assert.equal(getSlowVariantAttackMultiplier('expert', 28), 1.50);
});

test('ordinary floors stay near the difficulty target with every equipment slot empty', () => {
  for (const modeId of MODE_ORDER) {
    const mode = getModeConfig(modeId);
    for (const seed of [0x51212026, 0x71a2b3c4]) {
      const state = createNewGame(seed, modeId);
      assert.deepEqual(state.equipment, { weapon: null, shield: null, armor: null });
      const engine = new GameEngine(state);

      for (let floor = 1; floor <= mode.floors; floor += 1) {
        const ordinary = state.monsters.filter((monster) => !monster.boss && !monster.rareVariant);
        if (ordinary.length > 0) {
          const playerLevel = getExpectedPlayerLevel(modeId, floor);
          const playerPower = expectedUnequippedPlayerPower(playerLevel);
          const averageMonsterPower = ordinary.reduce((sum, monster) => sum + monsterCombatPower(monster), 0) / ordinary.length;
          const ratio = averageMonsterPower / playerPower;
          const target = FLOOR_POWER_TARGETS[modeId];
          assert.ok(ratio >= target - 0.23 && ratio <= target + 0.23,
            `${modeId} F${floor}: un-geared monster power ratio ${ratio.toFixed(3)}, target ${target}`);
        }

        if (floor < mode.floors) {
          state.player.x = state.dungeon.stairs.x;
          state.player.y = state.dungeon.stairs.y;
          assert.equal(engine.descend(), true, `${modeId} could not descend from floor ${floor}`);
        }
      }
    }
  }
});

test('new regular monsters carry balance version 3 and legacy unscaled monsters migrate once', () => {
  const state = createNewGame(0x5162026, 'beginner');
  assert.ok(state.monsters.every((monster) => monster.floorBalanceVersion === 3));
  state.monsters = [{
    id: 'legacy-monster', kind: 'slime', name: '旧バランスの魔物',
    x: state.player.x + 2, y: state.player.y, hp: 30, maxHp: 60,
    attack: 10, defense: 4, exp: 10, boss: false, actionSpeed: 'normal',
  }];
  const expectedAdjustment = getFloorMonsterCalibration('beginner', 1);
  new GameEngine(state);
  const migrated = state.monsters[0];
  assert.equal(migrated.floorBalanceVersion, 3);
  assert.equal(migrated.maxHp, Math.round(60 * expectedAdjustment));
  assert.ok(Math.abs(migrated.hp / migrated.maxHp - 0.5) < 0.02);
  assert.equal(migrated.attack, Math.round(10 * expectedAdjustment));
  assert.equal(migrated.defense, Math.round(4 * expectedAdjustment));
});

test('version-1 and version-2 floor monsters migrate from their own calibration without losing HP ratio', () => {
  for (const legacy of [
    { version: 1, defeatRate: 0.55, seed: 0x5162029 },
    { version: 2, defeatRate: 0.70, seed: 0x5162030 },
  ]) {
    const state = createNewGame(legacy.seed, 'advanced');
    state.floor = 24;
    const previousAdjustment = getLegacyFloorMonsterCalibration('advanced', state.floor, legacy.defeatRate);
    const currentAdjustment = getFloorMonsterCalibration('advanced', state.floor);
    assert.ok(currentAdjustment < previousAdjustment);
    state.monsters = [{
      id: `v${legacy.version}-floor-monster`, kind: 'orc', name: '旧バランスの魔物',
      x: state.player.x + 2, y: state.player.y, hp: 40, maxHp: 80,
      attack: 20, defense: 8, exp: 20, boss: false, floorBalanceVersion: legacy.version,
    }];
    new GameEngine(state);
    const migrated = state.monsters[0];
    const ratio = currentAdjustment / previousAdjustment;
    assert.equal(migrated.floorBalanceVersion, 3);
    assert.equal(migrated.maxHp, Math.round(80 * ratio));
    assert.ok(Math.abs(migrated.hp / migrated.maxHp - 0.5) < 0.02);
    assert.equal(migrated.attack, Math.round(20 * ratio));
    assert.equal(migrated.defense, Math.round(8 * ratio));
  }
});

test('hunger decreases once every five actions rather than every four', () => {
  assert.equal(HUNGER_DECAY_EVERY_ACTIONS, 5);
  const state = createNewGame(0x5162027, 'beginner');
  const engine = new GameEngine(state);
  for (let turn = 0; turn < 4; turn += 1) engine.tickHunger();
  assert.equal(state.player.hunger, 120);
  engine.tickHunger();
  assert.equal(state.player.hunger, 119);
});

test('the four-action progress toward five-step hunger decay remains save-valid', () => {
  const state = createNewGame(0x5162028, 'beginner');
  state.hungerDecayCounter = 4;
  assert.equal(validateGameState(state), true);
  assert.equal(migrateGameState(state).hungerDecayCounter, 4);
});

test('player level-up and received-hit cues share the start of the fanfare', async () => {
  const [main, audio] = await Promise.all([read('assets/main.js'), read('assets/audio.js')]);
  assert.match(main, /\? \['level', \.\.\.damageCues\] : \[\]/);
  assert.match(main, /needsFloorMonsterBalanceMigration/);
  assert.match(main, /floorBalanceVersion \?\? 0\) < 3/);
  assert.match(audio, /while \(effects\[index \+ 1\] === 'damage'\)/);
  assert.match(audio, /playDamageEffect\(fanfareStart \+ synchronizedHit \* 0\.24\)/);
});

test('dragon breath renderer displays the same vertical rectangular zone as collision logic', async () => {
  const [engine, renderer] = await Promise.all([read('assets/engine.js'), read('assets/renderer.js')]);
  assert.match(engine, /const areaWidth = 1;/);
  assert.match(engine, /const areaHeight = 5;/);
  assert.match(engine, /cell\.x >= left && cell\.x <= right && cell\.y >= top && cell\.y <= bottom/);
  assert.match(renderer, /const width = 1;/);
  assert.match(renderer, /effect\.height \?\? 1/);
});
