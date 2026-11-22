import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createNewGame,
  GameEngine,
  getExpectedPlayerLevel,
  getExpectedMonsterDefenseCap,
  getFloorMonsterCalibration,
  getLegacyFloorMonsterCalibration,
  getLegacyV3FloorMonsterCalibration,
  FLOOR_MONSTER_HP_MULTIPLIER,
  FLOOR_MONSTER_ATTACK_MULTIPLIER,
  FLOOR_MONSTER_DEFENSE_MULTIPLIER,
  EXPECTED_MONSTER_DEFEAT_RATE,
  HUNGER_DECAY_EVERY_ACTIONS,
} from '../assets/engine.js';
import { validateGameState, migrateGameState } from '../assets/storage.js';
import { MODE_ORDER, getModeConfig } from '../assets/modes.js';
import { getRareHunterStatScale, getSlowVariantAttackMultiplier } from '../assets/balance.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('expected player level uses a balanced 50% monster-clear rate', () => {
  assert.equal(EXPECTED_MONSTER_DEFEAT_RATE, 0.50);
  assert.deepEqual([
    getExpectedPlayerLevel('tutorial', 5),
    getExpectedPlayerLevel('beginner', 10),
    getExpectedPlayerLevel('intermediate', 15),
    getExpectedPlayerLevel('advanced', 25),
    getExpectedPlayerLevel('expert', 30),
  ], [3, 8, 14, 23, 30]);
  for (const mode of MODE_ORDER) {
    assert.equal(getExpectedPlayerLevel(mode, 1), 1);
  }
});

test('floor monster calibration stays within the refined, difficulty-specific range', () => {
  const floors = { tutorial: 5, beginner: 10, intermediate: 15, advanced: 25, expert: 30 };
  for (const [mode, totalFloors] of Object.entries(floors)) {
    for (let floor = 1; floor <= totalFloors; floor += 1) {
      const adjustment = getFloorMonsterCalibration(mode, floor);
      const maximumAdjustment = mode === 'expert' ? 1.35 : 1.18;
      assert.ok(adjustment >= 0.65 && adjustment <= maximumAdjustment, `${mode} F${floor}: ${adjustment}`);
      assert.ok(Number.isFinite(getLegacyV3FloorMonsterCalibration(mode, floor)));
      assert.ok(Number.isFinite(getLegacyFloorMonsterCalibration(mode, floor, 0.70)));
    }
  }
});

const FLOOR_POWER_TARGETS = Object.freeze({
  tutorial: 0.54,
  beginner: 0.62,
  intermediate: 0.70,
  advanced: 0.70,
  expert: 0.82,
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

const MAX_SINGLE_ENEMY_TRADE_HP_SHARE = Object.freeze({
  tutorial: 0.33,
  beginner: 0.38,
  intermediate: 0.68,
  advanced: 0.68,
  expert: 0.85,
});

const MAX_LIGHT_GEAR_TRADE_HP_SHARE = Object.freeze({
  tutorial: 0.18,
  beginner: 0.25,
  intermediate: 0.45,
  advanced: 0.48,
  expert: 0.65,
});


test('deep expert ordinary monsters remain hittable without high-tier weapon drops', () => {
  for (const floor of [16, 22, 29]) {
    const level = getExpectedPlayerLevel('expert', floor);
    const attack = 5 + level - 1;
    assert.equal(getExpectedMonsterDefenseCap('expert', floor), Math.max(1, attack - 12));
  }
  for (const mode of ['tutorial', 'beginner', 'intermediate', 'advanced']) {
    assert.equal(
      getExpectedMonsterDefenseCap(mode, getModeConfig(mode).floors - 1),
      Math.max(1, 5 + getExpectedPlayerLevel(mode, getModeConfig(mode).floors - 1) - 1 - 7),
    );
  }
});

test('rare variants have meaningful special pressure without their old extreme multipliers', () => {
  assert.deepEqual(getRareHunterStatScale('beginner', 5), { hp: 1.48, attack: 1.16, defense: 4 });
  assert.deepEqual(getRareHunterStatScale('expert', 28), { hp: 1.38, attack: 1.12, defense: 3 });
  assert.equal(getSlowVariantAttackMultiplier('beginner', 5), 1.85);
  assert.equal(getSlowVariantAttackMultiplier('expert', 28), 1.65);
  assert.deepEqual(
    [FLOOR_MONSTER_HP_MULTIPLIER, FLOOR_MONSTER_ATTACK_MULTIPLIER, FLOOR_MONSTER_DEFENSE_MULTIPLIER],
    [1.08, 0.92, 0.95],
  );
});

test('ordinary enemies stay challenging but a typical no-gear duel remains survivable', () => {
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
          const expectedDefenseCap = getExpectedMonsterDefenseCap(modeId, floor);
          for (const monster of ordinary) {
            assert.ok(monster.defense <= expectedDefenseCap,
              `${modeId} F${floor}: ${monster.name} defense ${monster.defense} exceeds no-gear cap ${expectedDefenseCap}`);
          }
          const averageMonsterPower = ordinary.reduce((sum, monster) => sum + monsterCombatPower(monster), 0) / ordinary.length;
          const ratio = averageMonsterPower / playerPower;
          const target = FLOOR_POWER_TARGETS[modeId];
          // Expert floors 1–5 deliberately ease into upper-tier families; small floor samples can skew lower.
          const lowerTolerance = modeId === 'expert' ? 0.35 : 0.24;
          assert.ok(ratio >= target - lowerTolerance && ratio <= target + 0.20,
            `${modeId} F${floor}: un-geared monster power ratio ${ratio.toFixed(3)}, target ${target}, calibration ${getFloorMonsterCalibration(modeId, floor).toFixed(3)}, average power ${averageMonsterPower.toFixed(1)}, player power ${playerPower.toFixed(1)}`);

          if (floor < mode.floors) {
            const playerHp = 34 + (playerLevel - 1) * 6;
            const playerAttack = 5 + (playerLevel - 1);
            const playerDefense = 2 + Math.floor(playerLevel / 2);
            const bareTrade = ordinary.map((monster) => {
              const attacksToDefeat = Math.ceil(monster.maxHp / Math.max(1, playerAttack - monster.defense));
              const damagePerHit = Math.max(1, monster.attack - playerDefense);
              return attacksToDefeat * damagePerHit / playerHp;
            });
            const partialGearTrade = ordinary.map((monster) => {
              const attacksToDefeat = Math.ceil(monster.maxHp / Math.max(1, playerAttack + 2 - monster.defense));
              const damagePerHit = Math.max(1, monster.attack - playerDefense - 2);
              return attacksToDefeat * damagePerHit / playerHp;
            });
            const averageBareTrade = bareTrade.reduce((sum, share) => sum + share, 0) / bareTrade.length;
            const averagePartialTrade = partialGearTrade.reduce((sum, share) => sum + share, 0) / partialGearTrade.length;
            const tradeDetails = ordinary.map((monster, index) =>
              `${monster.kind}[HP${monster.maxHp}/ATK${monster.attack}/DEF${monster.defense}: no-gear ${bareTrade[index].toFixed(2)}, light-gear ${partialGearTrade[index].toFixed(2)}]`,
            ).join(', ');
            assert.ok(averageBareTrade <= MAX_SINGLE_ENEMY_TRADE_HP_SHARE[modeId],
              `${modeId} F${floor}: no-gear average ${averageBareTrade.toFixed(2)} HP bars, light-gear average ${averagePartialTrade.toFixed(2)}; ${tradeDetails}`);
            assert.ok(averagePartialTrade < averageBareTrade,
              `${modeId} F${floor}: modest equipment should improve the trade`);
            assert.ok(averagePartialTrade <= MAX_LIGHT_GEAR_TRADE_HP_SHARE[modeId],
              `${modeId} F${floor}: one light-gear duel costs ${averagePartialTrade.toFixed(2)} HP bars`);
          }
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

test('new regular monsters carry balance version 5 and legacy unscaled monsters migrate once', () => {
  const state = createNewGame(0x5162026, 'beginner');
  assert.ok(state.monsters.every((monster) => monster.floorBalanceVersion === 5));
  state.monsters = [{
    id: 'legacy-monster', kind: 'slime', name: '旧バランスの魔物',
    x: state.player.x + 2, y: state.player.y, hp: 30, maxHp: 60,
    attack: 10, defense: 4, exp: 10, boss: false, actionSpeed: 'normal',
  }];
  const expectedAdjustment = getFloorMonsterCalibration('beginner', 1);
  new GameEngine(state);
  const migrated = state.monsters[0];
  assert.equal(migrated.floorBalanceVersion, 5);
  assert.equal(migrated.maxHp, Math.round(60 * expectedAdjustment * FLOOR_MONSTER_HP_MULTIPLIER));
  assert.ok(Math.abs(migrated.hp / migrated.maxHp - 0.5) < 0.02);
  assert.equal(migrated.attack, Math.round(10 * expectedAdjustment * FLOOR_MONSTER_ATTACK_MULTIPLIER));
  assert.equal(migrated.defense, Math.min(getExpectedMonsterDefenseCap('beginner', 1), Math.round(4 * expectedAdjustment * FLOOR_MONSTER_DEFENSE_MULTIPLIER)));
});

test('version-1, version-2, and version-3 floor monsters migrate proportionally to v5', () => {
  for (const legacy of [
    { version: 1, defeatRate: 0.55, seed: 0x5162029 },
    { version: 2, defeatRate: 0.70, seed: 0x5162030 },
    { version: 3, defeatRate: 0.40, seed: 0x5162031 },
  ]) {
    const state = createNewGame(legacy.seed, 'advanced');
    state.floor = 24;
    const previousAdjustment = legacy.version === 3
      ? getLegacyV3FloorMonsterCalibration('advanced', state.floor)
      : getLegacyFloorMonsterCalibration('advanced', state.floor, legacy.defeatRate);
    const currentAdjustment = getFloorMonsterCalibration('advanced', state.floor);
    if (legacy.version === 3) {
      assert.ok(currentAdjustment > previousAdjustment);
    }
    else {
      assert.ok(currentAdjustment < previousAdjustment);
    }
    state.monsters = [{
      id: `v${legacy.version}-floor-monster`, kind: 'orc', name: '旧バランスの魔物',
      x: state.player.x + 2, y: state.player.y, hp: 40, maxHp: 80,
      attack: 20, defense: 8, exp: 20, boss: false, floorBalanceVersion: legacy.version,
    }];
    new GameEngine(state);
    const migrated = state.monsters[0];
    const ratio = currentAdjustment / previousAdjustment;
    assert.equal(migrated.floorBalanceVersion, 5);
    assert.equal(migrated.maxHp, Math.round(80 * ratio * FLOOR_MONSTER_HP_MULTIPLIER));
    assert.ok(Math.abs(migrated.hp / migrated.maxHp - 0.5) < 0.02);
    assert.equal(migrated.attack, Math.round(20 * ratio * FLOOR_MONSTER_ATTACK_MULTIPLIER));
    assert.equal(migrated.defense, Math.min(getExpectedMonsterDefenseCap('advanced', state.floor), Math.round(8 * ratio * FLOOR_MONSTER_DEFENSE_MULTIPLIER)) + (legacy.version === 1 || legacy.version === 2 ? 0 : 0));
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
  assert.match(main, /floorBalanceVersion \?\? 0\) < 5/);
  assert.match(audio, /while \(effects\[index \+ 1\] === 'damage'\)/);
  assert.match(audio, /playDamageEffect\(fanfareStart \+ synchronizedHit \* 0\.24\)/);
});

test('dragon breath renderer displays the same path cells as collision logic', async () => {
  const [engine, renderer] = await Promise.all([read('assets/engine.js'), read('assets/renderer.js')]);
  assert.match(engine, /const cells = getLineCells\(monster, center\)/);
  assert.match(engine, /hitCells\.has\(pointKey\(cell\)\)/);
  assert.match(renderer, /Array\.isArray\(effect\.cells\)/);
  assert.match(renderer, /for \(const cell of cells\)/);
});
