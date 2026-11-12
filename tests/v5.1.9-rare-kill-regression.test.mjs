import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, GameEngine } from '../assets/engine.js';

function scriptedLootRandom(lootRoll) {
  let nextCalls = 0;
  return {
    int(min) { return min; },
    next() {
      nextCalls += 1;
      return nextCalls === 1 ? lootRoll : 0.5;
    },
    pick(values) { return values[0]; },
    chance() { return false; },
  };
}

function defeatRareMonster({ hunterVariant, lootRoll }) {
  const state = createNewGame(0x51a9e8, 'expert');
  state.floor = 30;
  // Remove the random starting floor loot so assertions observe only this kill's drop.
  state.groundItems = [];
  state.groundGold = [];
  const monster = {
    id: 'rare-drop-regression',
    kind: 'test-monster',
    name: hunterVariant ? '魔喰いの検証敵' : '剛腕の検証敵',
    x: state.player.x + 1,
    y: state.player.y,
    hp: 1,
    maxHp: 1,
    attack: 1,
    defense: 0,
    exp: 1,
    boss: false,
    rareVariant: true,
    hunterVariant,
  };
  state.monsters = [monster];

  const engine = new GameEngine(state);
  engine.attackMonster(monster, scriptedLootRandom(lootRoll));

  return state;
}

test('defeating a late-game hunter can roll its potion drop without a ReferenceError', () => {
  const state = defeatRareMonster({ hunterVariant: true, lootRoll: 0.60 });
  assert.equal(state.monsters.length, 0);
  assert.equal(state.groundItems.length, 1);
  assert.equal(state.groundItems[0].item.kind, 'potion');
});

test('defeating a late-game hunter can roll its food drop at the cumulative threshold', () => {
  const state = defeatRareMonster({ hunterVariant: true, lootRoll: 0.69 });
  assert.equal(state.monsters.length, 0);
  assert.equal(state.groundItems.length, 1);
  assert.equal(state.groundItems[0].item.kind, 'food');
});

test('defeating a late-game non-hunter rare monster can roll potion and food drops', () => {
  const potionState = defeatRareMonster({ hunterVariant: false, lootRoll: 0.25 });
  assert.equal(potionState.groundItems[0].item.kind, 'potion');

  const foodState = defeatRareMonster({ hunterVariant: false, lootRoll: 0.29 });
  assert.equal(foodState.groundItems[0].item.kind, 'food');
});
