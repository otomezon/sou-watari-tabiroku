import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createNewGame, GameEngine, HUNGER_DECAY_EVERY_ACTIONS,
} from '../assets/engine.js';
import {
  EXPECTED_PLAYER_LEVELS, getExpectedPlayerLevel, getMonsterLevelForFloor,
  getMonsterLevelStatMultiplier,
} from '../assets/balance.mjs';
import { getEffectCueSchedule } from '../assets/audio.js';
import { validateGameState } from '../assets/storage.js';
import { MODE_ORDER, getModeConfig } from '../assets/modes.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('expected player levels cover every floor in all five campaigns', () => {
  const expectedCounts = { tutorial: 5, beginner: 10, intermediate: 15, advanced: 25, expert: 30 };
  for (const modeId of MODE_ORDER) {
    const mode = getModeConfig(modeId);
    assert.equal(EXPECTED_PLAYER_LEVELS[modeId].length, expectedCounts[modeId]);
    assert.equal(getExpectedPlayerLevel(modeId, 1), EXPECTED_PLAYER_LEVELS[modeId][0]);
    assert.equal(getExpectedPlayerLevel(modeId, mode.floors), EXPECTED_PLAYER_LEVELS[modeId].at(-1));
    assert.equal(getExpectedPlayerLevel(modeId, mode.floors + 20), EXPECTED_PLAYER_LEVELS[modeId].at(-1));
  }
  assert.equal(getExpectedPlayerLevel('beginner', 0), 1);
});

test('ordinary monsters track expected player level, tier offset and gentle stat scaling', () => {
  for (const modeId of MODE_ORDER) {
    const mode = getModeConfig(modeId);
    for (let floor = 1; floor <= mode.floors; floor += 1) {
      const playerLevel = getExpectedPlayerLevel(modeId, floor);
      assert.equal(getMonsterLevelForFloor(modeId, floor), playerLevel);
      assert.equal(getMonsterLevelForFloor(modeId, floor, -1), Math.max(1, playerLevel - 1));
      assert.equal(getMonsterLevelForFloor(modeId, floor, 1), playerLevel + 1);
      assert.equal(getMonsterLevelStatMultiplier(playerLevel, playerLevel), 1);
      assert.ok(getMonsterLevelStatMultiplier(playerLevel + 1, playerLevel) > 1);
      assert.ok(getMonsterLevelStatMultiplier(playerLevel - 1, playerLevel) < 1);
      assert.ok(getMonsterLevelStatMultiplier(playerLevel + 1, playerLevel) <= 1.15);
    }
  }
});

test('generated floor monsters and bosses receive their campaign level targets', () => {
  for (const modeId of MODE_ORDER) {
    const mode = getModeConfig(modeId);
    const state = createNewGame(0x51616016, modeId);
    const engine = new GameEngine(state);
    for (let floor = 1; floor <= mode.floors; floor += 1) {
      const expected = getExpectedPlayerLevel(modeId, floor);
      if (floor === mode.floors) {
        const boss = state.monsters.find((monster) => monster.boss);
        assert.ok(boss, `${modeId} final floor has a boss`);
        assert.equal(boss.level, getMonsterLevelForFloor(modeId, floor, 3));
        for (const supporter of state.monsters.filter((monster) => !monster.boss)) {
          assert.ok(supporter.level >= expected && supporter.level <= expected + 2,
            `${modeId} boss supporter level ${supporter.level} vs expected ${expected}`);
        }
      } else {
        for (const monster of state.monsters) {
          assert.ok(Number.isInteger(monster.level), `${modeId} floor ${floor}: missing monster level`);
          assert.ok(monster.level >= Math.max(1, expected - 1) && monster.level <= expected + 3,
            `${modeId} floor ${floor}: monster level ${monster.level} vs expected ${expected}`);
        }
      }
      if (floor < mode.floors) {
        state.player.x = state.dungeon.stairs.x;
        state.player.y = state.dungeon.stairs.y;
        assert.equal(engine.descend(), true);
      }
    }
  }
});

test('legacy saved monsters are assigned a floor-appropriate level without changing save schema', () => {
  const state = createNewGame(0x51616017, 'advanced');
  state.floor = 12;
  const expected = getExpectedPlayerLevel('advanced', 12);
  state.monsters = [{
    id: 'legacy-monster', kind: 'orc', name: '旧セーブのオーク',
    x: state.player.x + 1, y: state.player.y, hp: 20, maxHp: 20,
    attack: 6, defense: 2, exp: 10, boss: false, rareVariant: false,
  }];
  new GameEngine(state);
  assert.equal(state.monsters[0].level, expected);
  assert.equal(state.schemaVersion, 12);
});

test('hunger decreases once per five actions and the new counter value remains save-valid', () => {
  assert.equal(HUNGER_DECAY_EVERY_ACTIONS, 5);
  const state = createNewGame(0x51616018, 'beginner');
  state.monsters = [];
  const engine = new GameEngine(state);
  for (let i = 0; i < 4; i += 1) engine.wait();
  assert.equal(state.player.hunger, 120);
  assert.equal(state.hungerDecayCounter, 4);
  assert.equal(validateGameState(state), true);
  engine.wait();
  assert.equal(state.player.hunger, 119);
  assert.equal(state.hungerDecayCounter, 0);
});

test('damage cues overlap the level-up fanfare instead of waiting for it to end', () => {
  const schedule = getEffectCueSchedule(['attack', 'level', 'damage', 'damage', 'clear']);
  assert.deepEqual(schedule, [
    { effect: 'attack', offset: 0 },
    { effect: 'level', offset: 0.18 },
    { effect: 'damage', offset: 0.18 },
    { effect: 'damage', offset: 0.36 },
    { effect: 'clear', offset: 3.23 },
  ]);
  assert.deepEqual(getEffectCueSchedule(['damage', 'damage']), [
    { effect: 'damage', offset: 0 },
    { effect: 'damage', offset: 0.24 },
  ]);
});

test('release cache, save schema and visual breath geometry stay aligned', async () => {
  const [main, manifest, sw, storage, engine, renderer, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'),
    read('assets/storage.js'), read('assets/engine.js'), read('assets/renderer.js'),
    read('RELEASE_v5.1.16.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5.1.16'/);
  assert.match(manifest, /"version": "5.1.16"/);
  assert.match(sw, /sou-watari-tabiroku-v5-1-16/);
  assert.match(engine, /schemaVersion: 12/);
  assert.match(storage, /state\.schemaVersion !== 12/);
  assert.match(renderer, /effect\.halfHeight/);
  assert.match(engine, /halfWidth, halfHeight, element: breath\.element/);
  assert.match(release, /version: 5\.1\.16/);
  assert.match(release, /type: patch/);
});
