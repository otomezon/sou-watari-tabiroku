import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createNewGame,
  GameEngine,
  getExpectedPlayerLevel,
  getFloorMonsterCalibration,
  HUNGER_DECAY_EVERY_ACTIONS,
} from '../assets/engine.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('expected player level follows the planned campaign EXP curve at 55% monster defeats', () => {
  assert.deepEqual([
    getExpectedPlayerLevel('tutorial', 5),
    getExpectedPlayerLevel('beginner', 10),
    getExpectedPlayerLevel('intermediate', 15),
    getExpectedPlayerLevel('advanced', 25),
    getExpectedPlayerLevel('expert', 30),
  ], [3, 9, 15, 24, 32]);
  for (const mode of ['tutorial', 'beginner', 'intermediate', 'advanced', 'expert']) {
    assert.equal(getExpectedPlayerLevel(mode, 1), 1);
  }
});

test('floor monster stat calibration stays bounded and follows campaign pressure', () => {
  const floors = { tutorial: 5, beginner: 10, intermediate: 15, advanced: 25, expert: 30 };
  for (const [mode, totalFloors] of Object.entries(floors)) {
    for (let floor = 1; floor <= totalFloors; floor += 1) {
      const adjustment = getFloorMonsterCalibration(mode, floor);
      assert.ok(adjustment >= 0.85 && adjustment <= 1.08, `${mode} F${floor}: ${adjustment}`);
    }
  }
  assert.equal(getFloorMonsterCalibration('beginner', 1), 1.08);
  assert.ok(getFloorMonsterCalibration('intermediate', 15) > 1);
  assert.ok(getFloorMonsterCalibration('expert', 30) < 1);
});

test('new regular monsters carry a balance version and legacy monsters migrate once preserving HP ratio', () => {
  const state = createNewGame(0x5162026, 'beginner');
  assert.ok(state.monsters.every((monster) => monster.floorBalanceVersion === 1));
  state.monsters = [{
    id: 'legacy-monster', kind: 'slime', name: '旧バランスの魔物',
    x: state.player.x + 2, y: state.player.y, hp: 30, maxHp: 60,
    attack: 10, defense: 4, exp: 10, boss: false, actionSpeed: 'normal',
  }];
  const expectedAdjustment = getFloorMonsterCalibration('beginner', 1);
  new GameEngine(state);
  const migrated = state.monsters[0];
  assert.equal(migrated.floorBalanceVersion, 1);
  assert.equal(migrated.maxHp, Math.round(60 * expectedAdjustment));
  assert.ok(Math.abs(migrated.hp / migrated.maxHp - 0.5) < 0.02);
  assert.equal(migrated.attack, Math.round(10 * expectedAdjustment));
  assert.equal(migrated.defense, Math.round(4 * expectedAdjustment));
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

test('player level-up and received-hit cues share the start of the fanfare', async () => {
  const [main, audio] = await Promise.all([read('assets/main.js'), read('assets/audio.js')]);
  assert.match(main, /\? \['level', \.\.\.damageCues\] : \[\]/);
  assert.match(main, /needsFloorMonsterBalanceMigration/);
  assert.match(audio, /while \(effects\[index \+ 1\] === 'damage'\)/);
  assert.match(audio, /playDamageEffect\(fanfareStart \+ synchronizedHit \* 0\.24\)/);
});

test('dragon breath renderer displays the same vertical rectangular zone as collision logic', async () => {
  const [engine, renderer] = await Promise.all([read('assets/engine.js'), read('assets/renderer.js')]);
  assert.match(engine, /const areaWidth = 3;/);
  assert.match(engine, /const areaHeight = 5;/);
  assert.match(engine, /cell\.x >= left && cell\.x <= right && cell\.y >= top && cell\.y <= bottom/);
  assert.match(renderer, /effect\.width \?\? 1/);
  assert.match(renderer, /effect\.height \?\? 1/);
});
