import test from 'node:test';
import assert from 'node:assert/strict';
import { getRegularMonsterDepthScale, RARE_VALUABLE_DROP_CHANCES, RARE_GOLD_DROP_CHANCE_MULTIPLIER, RARE_GOLD_AMOUNT_MULTIPLIER } from '../assets/balance.mjs';
import { MONSTER_TIERS } from '../assets/engine.js';
import { getEnemyLevel } from '../assets/enemy-level.mjs';
import { DUNGEON_MODES } from '../assets/modes.js';
import { getShopBuyPrice, getShopSellPrice } from '../assets/shop.js';

test('expert regular monsters keep their standard campaign scaling on floors 26–30', () => {
  for (const floor of [25, 26, 27, 28, 29, 30]) {
    assert.equal(getRegularMonsterDepthScale('expert', floor), 1);
  }
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
    const scale = 1.35 * 1.40;
    return {
      maxHp: Math.round((template.hp + 10) * scale),
      attack: Math.round((template.attack + 5) * scale),
      defense: Math.round((template.defense + 4) * scale),
    };
  };
  const guardianStats = floor30Stats(guardian);
  const nightEmperorStats = floor30Stats(nightEmperor);
  assert.deepEqual(guardianStats, { maxHp: 223, attack: 53, defense: 30 });
  assert.deepEqual(nightEmperorStats, { maxHp: 227, attack: 53, defense: 30 });
  assert.equal(getEnemyLevel(guardianStats), 18);
  assert.equal(getEnemyLevel(nightEmperorStats), 18);
});

test('valuable and gold drop rates are trimmed in the late campaigns without changing rare spawn eligibility', () => {
  assert.equal(DUNGEON_MODES.advanced.enemyDropValuable, 0.0065);
  assert.equal(DUNGEON_MODES.expert.enemyDropValuable, 0.008);
  assert.equal(DUNGEON_MODES.advanced.enemyDropGold, 0.27);
  assert.equal(DUNGEON_MODES.expert.enemyDropGold, 0.29);
  assert.equal(RARE_VALUABLE_DROP_CHANCES.hunter, 0.16);
  assert.equal(RARE_VALUABLE_DROP_CHANCES.otherRare, 0.055);
  assert.equal(RARE_GOLD_DROP_CHANCE_MULTIPLIER, 1.75);
  assert.equal(RARE_GOLD_AMOUNT_MULTIPLIER, 1.75);
});

test('strong equipment receives a higher purchase price while basic gear stays unchanged', () => {
  const basic = { kind: 'weapon', attack: 7, enhancement: 0 };
  const improved = { kind: 'weapon', attack: 10, enhancement: 1 };
  const advanced = { kind: 'weapon', attack: 13, enhancement: 0 };
  const endgame = { kind: 'weapon', attack: 16, enhancement: 0 };

  assert.equal(getShopBuyPrice(basic, 20), 390);
  assert.equal(getShopBuyPrice(improved, 20), 600);
  assert.equal(getShopBuyPrice(advanced, 20), 740);
  assert.equal(getShopBuyPrice(endgame, 30), 990);
});

test('higher end buy-price markup does not inflate equipment resale income', () => {
  const endgame = { kind: 'weapon', attack: 16, enhancement: 0, durability: 100, maxDurability: 100 };
  assert.equal(getShopSellPrice(endgame, 30), 350);
});
