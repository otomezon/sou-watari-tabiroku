import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createNewGame, GameEngine, getFloorEncounterPowerTarget,
  getFloorMonsterCalibration, getLegacyV4FloorMonsterCalibration, getLegacyV5FloorMonsterCalibration,
} from '../assets/engine.js';
import { getItemRecovery } from '../assets/balance.mjs';
import { MODE_ORDER, getModeConfig } from '../assets/modes.js';
import { itemIcon } from '../assets/items.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const EXPECTED_CURVES = Object.freeze({
  tutorial: [0.56, 0.60],
  beginner: [0.60, 0.63],
  intermediate: [0.68, 0.74],
  advanced: [0.67, 0.73],
  expert: [0.76, 0.84],
});

test('all five campaigns ramp encounter pressure smoothly from the first floor to the final floor', () => {
  for (const modeId of MODE_ORDER) {
    const floors = getModeConfig(modeId).floors;
    const [start, end] = EXPECTED_CURVES[modeId];
    const values = Array.from({ length: floors }, (_, index) =>
      getFloorEncounterPowerTarget(modeId, index + 1));

    assert.ok(Math.abs(values[0] - start) < 1e-12, `${modeId}: incorrect first-floor target`);
    assert.ok(Math.abs(values.at(-1) - end) < 1e-12, `${modeId}: incorrect final-floor target`);
    assert.ok(values.every((value, index) =>
      value >= start && value <= end && (index === 0 || value >= values[index - 1])),
    `${modeId}: encounter pressure must increase monotonically across all floors`);
    assert.ok(values.some((value, index) => index > 0 && value > values[index - 1]),
      `${modeId}: every campaign should have a real floor-to-floor ramp`);
    for (let floor = 1; floor <= floors; floor += 1) {
      const scale = getFloorMonsterCalibration(modeId, floor);
      const maximumAdjustment = modeId === 'expert' ? 1.35 : 1.18;
      assert.ok(Number.isFinite(scale) && scale >= 0.65 && scale <= maximumAdjustment,
        `${modeId} F${floor}: invalid calibration ${scale}`);
    }
  }
});

test('new campaigns use one existing floor-one food item, never an invented rice-ball template', async () => {
  const itemsSource = await read('assets/items.js');
  assert.doesNotMatch(itemsSource, /id: 'rice-ball'/);
  for (const modeId of MODE_ORDER) {
    for (const seed of [0x52002026, 0x6a09e667]) {
      const state = createNewGame(seed, modeId);
      assert.deepEqual(state.equipment, { weapon: null, shield: null, armor: null });
      assert.equal(state.inventory.length, 1);
      const stack = state.inventory[0];
      assert.equal(stack.count, 1);
      assert.equal(stack.item.kind, 'food');
      assert.notEqual(stack.item.templateId, 'rice-ball');
      assert.match(itemsSource, new RegExp(`id: '${stack.item.templateId}'`));
      assert.ok(getItemRecovery(stack.item).hungerRestore > 0);
      assert.equal(itemIcon(stack.item), '🍞');
    }
  }
});

test('the existing starter food is consumed through the normal food system', () => {
  const state = createNewGame(0x52002027, 'beginner');
  state.monsters = [];
  state.player.hunger = 60;
  const item = state.inventory[0].item;
  const uid = item.uid;
  const expectedHunger = Math.min(120, 60 + getItemRecovery(item).hungerRestore);
  const engine = new GameEngine(state);

  assert.equal(engine.useItem(uid), true);
  assert.equal(state.player.hunger, expectedHunger);
  assert.equal(state.inventory.length, 0);
});

test('v4 and v5 enemy saves migrate to v6 without applying stat multipliers twice', () => {
  for (const version of [4, 5]) {
    const state = createNewGame(0x52002028 + version, 'expert');
    state.floor = 2;
    state.dungeon.stairs = null;
    const previousCalibration = version === 4
      ? getLegacyV4FloorMonsterCalibration('expert', state.floor)
      : getLegacyV5FloorMonsterCalibration('expert', state.floor);
    const currentCalibration = getFloorMonsterCalibration('expert', state.floor);
    const oldMonster = {
      id: `legacy-v${version}`, kind: 'slime', name: `v${version}保存敵`,
      x: state.player.x + 2, y: state.player.y, hp: 40, maxHp: 80,
      attack: 20, defense: 6, exp: 10, boss: false, floorBalanceVersion: version,
    };
    state.monsters = [oldMonster];

    new GameEngine(state);

    const ratio = currentCalibration / previousCalibration;
    assert.equal(oldMonster.floorBalanceVersion, 6);
    assert.equal(oldMonster.maxHp, Math.round(80 * ratio));
    assert.equal(oldMonster.hp, Math.round(oldMonster.maxHp * 0.5));
    assert.equal(oldMonster.attack, Math.max(1, Math.round(20 * ratio)));
  }
});

test('the new encounter curve keeps the intended difficulty order from tutorial to expert', () => {
  const firstFloor = MODE_ORDER.map((mode) => getFloorEncounterPowerTarget(mode, 1));
  const finalFloor = MODE_ORDER.map((mode) =>
    getFloorEncounterPowerTarget(mode, getModeConfig(mode).floors));

  assert.deepEqual(firstFloor, [0.56, 0.60, 0.68, 0.67, 0.76]);
  assert.deepEqual(finalFloor, [0.60, 0.63, 0.74, 0.73, 0.84]);
  const expectedOpeningCounts = MODE_ORDER.map((mode) => {
    const config = getModeConfig(mode);
    return (config.minMonsters + config.maxMonsters) / 2 - 1;
  });
  const expectedFinalCounts = MODE_ORDER.map((mode) => {
    const config = getModeConfig(mode);
    return (config.minMonsters + config.maxMonsters) / 2 - (mode === 'tutorial' ? 1 : 0);
  });
  const openingPressure = firstFloor.map((target, index) => target * expectedOpeningCounts[index]);
  const finalPressure = finalFloor.map((target, index) => target * expectedFinalCounts[index]);
  assert.ok(openingPressure.every((value, index) => index === 0 || value > openingPressure[index - 1]));
  assert.ok(finalPressure.every((value, index) => index === 0 || value > finalPressure[index - 1]));
  assert.ok(firstFloor[3] < firstFloor[2], 'advanced uses slightly lower per-monster pressure to offset its higher spawn count');
});
