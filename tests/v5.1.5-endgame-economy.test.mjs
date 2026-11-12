import test from 'node:test';
import assert from 'node:assert/strict';
import { getRegularMonsterDepthScale, RARE_VALUABLE_DROP_CHANCES, RARE_GOLD_DROP_CHANCE_MULTIPLIER, RARE_GOLD_AMOUNT_MULTIPLIER } from '../assets/balance.mjs';
import { MONSTER_TIERS } from '../assets/engine.js';
import { getEnemyLevel } from '../assets/enemy-level.mjs';
import { DUNGEON_MODES } from '../assets/modes.js';
import { getShopBuyPrice, getShopSellPrice } from '../assets/shop.js';

test('expert regular monsters ease gradually toward the final floor', () => {
  assert.equal(getRegularMonsterDepthScale('expert', 20), 1);
  assert.equal(getRegularMonsterDepthScale('expert', 25), 0.97);
  assert.equal(getRegularMonsterDepthScale('expert', 30), 0.94);
  assert.equal(getRegularMonsterDepthScale('advanced', 25), 1);
  assert.equal(getRegularMonsterDepthScale('intermediate', 15), 1);
});

test('only Primal Guardian is slightly softened to match the level-18 endgame band', () => {
  const finalTier = MONSTER_TIERS[5];
  const guardian = finalTier.find((monster) => monster.kind === 'primal-guardian');
  const nightEmperor = finalTier.find((monster) => monster.kind === 'night-emperor');
  assert.deepEqual(
    { hp: guardian.hp, attack: guardian.attack, defense: guardian.defense },
    { hp: 108, attack: 23, defense: 12 },
  );

  const floor30Stats = (template) => {
    const scale = 1.35 * 1.40 * 0.94;
    return {
      maxHp: Math.round((template.hp + 10) * scale),
      attack: Math.round((template.attack + 5) * scale),
      defense: Math.round((template.defense + 4) * scale),
    };
  };
  const guardianStats = floor30Stats(guardian);
  const nightEmperorStats = floor30Stats(nightEmperor);
  assert.deepEqual(guardianStats, { maxHp: 210, attack: 50, defense: 28 });
  assert.deepEqual(nightEmperorStats, { maxHp: 213, attack: 50, defense: 28 });
  assert.equal(getEnemyLevel(guardianStats), 17);
  assert.equal(getEnemyLevel(nightEmperorStats), 17);
});

test('valuable and gold drop rates are trimmed in the late campaigns without changing rare spawn eligibility', () => {
  assert.equal(DUNGEON_MODES.intermediate.enemyDropValuable, 0.0055);
  assert.equal(DUNGEON_MODES.advanced.enemyDropValuable, 0.006);
  assert.equal(DUNGEON_MODES.expert.enemyDropValuable, 0.0065);
  assert.equal(DUNGEON_MODES.intermediate.enemyDropGold, 0.24);
  assert.equal(DUNGEON_MODES.advanced.enemyDropGold, 0.25);
  assert.equal(DUNGEON_MODES.expert.enemyDropGold, 0.26);
  assert.equal(RARE_VALUABLE_DROP_CHANCES.hunter, 0.12);
  assert.equal(RARE_VALUABLE_DROP_CHANCES.otherRare, 0.04);
  assert.equal(RARE_GOLD_DROP_CHANCE_MULTIPLIER, 1.5);
  assert.equal(RARE_GOLD_AMOUNT_MULTIPLIER, 1.5);
});

test('strong equipment receives a higher purchase price while basic gear stays unchanged', () => {
  const basic = { kind: 'weapon', attack: 7, enhancement: 0 };
  const improved = { kind: 'weapon', attack: 10, enhancement: 1 };
  const advanced = { kind: 'weapon', attack: 13, enhancement: 0 };
  const endgame = { kind: 'weapon', attack: 16, enhancement: 0 };

  assert.equal(getShopBuyPrice(basic, 20), 390);
  assert.equal(getShopBuyPrice(improved, 20), 610);
  assert.equal(getShopBuyPrice(advanced, 20), 770);
  assert.equal(getShopBuyPrice(endgame, 30), 1065);
});

test('higher end buy-price markup does not inflate equipment resale income', () => {
  const endgame = { kind: 'weapon', attack: 16, enhancement: 0, durability: 100, maxDurability: 100 };
  assert.equal(getShopSellPrice(endgame, 30), 350);
});
