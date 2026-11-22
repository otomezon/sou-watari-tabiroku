import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRegularMonsterDepthScale, getRareHunterStatScale, getSlowVariantAttackMultiplier,
  getGoldDropChance, getGoldDropAmount, getRareValuableDropChances, RARE_VALUABLE_DROP_CHANCES,
  RARE_GOLD_DROP_CHANCE_MULTIPLIER, NORMAL_GOLD_DROP_CHANCE_MULTIPLIER, RARE_GOLD_AMOUNT_MULTIPLIER,
} from '../assets/balance.mjs';
import { DUNGEON_MODES } from '../assets/modes.js';
import { getShopBuyPrice, getShopSellPrice } from '../assets/shop.js';

test('expert regular-monster scaling eases gradually only in the last ten floors', () => {
  assert.equal(getRegularMonsterDepthScale('expert', 19), 1);
  assert.equal(getRegularMonsterDepthScale('expert', 20), 1);
  assert.equal(getRegularMonsterDepthScale('expert', 25), 0.97);
  assert.equal(getRegularMonsterDepthScale('expert', 30), 0.94);
  for (const mode of ['tutorial', 'beginner', 'intermediate', 'advanced']) {
    assert.equal(getRegularMonsterDepthScale(mode, 30), 1);
  }
});

test('late expert rare forms retain their identities with moderated burst damage', () => {
  assert.deepEqual(getRareHunterStatScale('expert', 25), { hp: 1.48, attack: 1.16, defense: 4 });
  assert.deepEqual(getRareHunterStatScale('expert', 26), { hp: 1.38, attack: 1.12, defense: 3 });
  assert.equal(getSlowVariantAttackMultiplier('expert', 25), 1.85);
  assert.equal(getSlowVariantAttackMultiplier('expert', 26), 1.65);
  assert.equal(getSlowVariantAttackMultiplier('advanced', 30), 1.85);
});

test('monster gold yield is reduced while rare encounters remain more rewarding', () => {
  assert.equal(DUNGEON_MODES.tutorial.enemyDropGold, 0.19);
  assert.equal(DUNGEON_MODES.beginner.enemyDropGold, 0.22);
  assert.deepEqual(
    [DUNGEON_MODES.intermediate.enemyDropGold, DUNGEON_MODES.advanced.enemyDropGold, DUNGEON_MODES.expert.enemyDropGold],
    [0.23, 0.24, 0.25],
  );
  assert.equal(getGoldDropChance(0.26), 0.2288);
  assert.equal(getGoldDropChance(0.26, true), 0.3432);
  assert.equal(getGoldDropAmount(171), 123);
  assert.equal(getGoldDropAmount(171, true), 257);
  assert.equal(RARE_GOLD_DROP_CHANCE_MULTIPLIER, 1.5);
  assert.equal(NORMAL_GOLD_DROP_CHANCE_MULTIPLIER, 0.88);
  assert.equal(RARE_GOLD_AMOUNT_MULTIPLIER, 1.5);
  assert.deepEqual(RARE_VALUABLE_DROP_CHANCES, { hunter: 0.12, otherRare: 0.04 });
  assert.deepEqual(getRareValuableDropChances('beginner'), { hunter: 0.16, otherRare: 0.055 });
  assert.deepEqual(getRareValuableDropChances('expert'), { hunter: 0.12, otherRare: 0.04 });
  assert.equal(getGoldDropChance(0.22, true, 'beginner'), 0.3388);
  assert.equal(getGoldDropAmount(171, false, 'beginner'), 145);
  assert.equal(getGoldDropAmount(171, true, 'beginner'), 299);
});

test('basic consumables stay affordable while top-end recovery costs materially more', () => {
  const basicPotion = { kind: 'potion', heal: 15, hungerRestore: 3 };
  const endgamePotion = { kind: 'potion', heal: 110, hungerRestore: 8 };
  const legendaryPotion = { kind: 'potion', heal: 125, hungerRestore: 8 };
  const basicFood = { kind: 'food', hungerRestore: 26 };
  const endgameFood = { kind: 'food', hungerRestore: 90 };
  assert.equal(getShopBuyPrice(basicPotion, 1), 70);
  assert.equal(getShopBuyPrice(endgamePotion, 30), 445);
  assert.equal(getShopBuyPrice(legendaryPotion, 30), 490);
  assert.equal(getShopBuyPrice(basicFood, 1), 55);
  assert.equal(getShopBuyPrice(endgameFood, 30), 250);
});

test('late high-value loot has a lower resale rate without changing early-game sale value', () => {
  const relic = { kind: 'valuable', sellValue: 3200 };
  assert.equal(getShopSellPrice(relic, 1), 2880);
  assert.equal(getShopSellPrice(relic, 10, 'beginner'), 2900);
  assert.equal(getShopSellPrice(relic, 10, 'intermediate'), 2705);
  assert.equal(getShopSellPrice(relic, 30, 'expert'), 2555);
});
