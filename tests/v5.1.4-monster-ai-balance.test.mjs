import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, GameEngine, getFastVariantAttack, getHunterInitialLevel } from '../assets/engine.js';
import { Random } from '../assets/random.js';

test('hunter initial level follows dungeon progress instead of always starting at level 1', () => {
  assert.equal(getHunterInitialLevel(0), 1);
  assert.equal(getHunterInitialLevel(0.25), 3);
  assert.equal(getHunterInitialLevel(0.5), 5);
  assert.equal(getHunterInitialLevel(1), 10);
  assert.equal(getHunterInitialLevel(1.5), 10);
});

test('hunter does not idle when the player blocks its only route to prey', () => {
  const state = createNewGame(0x12345678, 'intermediate');
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(0));
  state.dungeon.tiles[5][5] = 1;
  state.dungeon.tiles[5][6] = 1;
  state.dungeon.tiles[5][7] = 1;
  state.dungeon.stairs = null;
  state.player.x = 6;
  state.player.y = 5;
  const hunter = {
    id: 'hunter', kind: 'slime', name: '魔喰いのスライム',
    x: 5, y: 5, hp: 80, maxHp: 80, attack: 8, defense: 2,
    exp: 30, boss: false, hunterVariant: true, hunterLevel: 4,
  };
  const prey = {
    id: 'prey', kind: 'bat', name: '洞窟コウモリ',
    x: 7, y: 5, hp: 20, maxHp: 20, attack: 3, defense: 0,
    exp: 10, boss: false, hunterVariant: false,
  };
  state.monsters = [hunter, prey];
  const engine = new GameEngine(state);
  const hpBefore = state.player.hp;
  engine.performMonsterAction(hunter, new Random(123));
  assert.ok(state.player.hp < hpBefore, 'hunter should attack the adjacent player rather than idle');
});

test('fast rare variant keeps double actions but receives only a modest attack bonus', () => {
  assert.equal(getFastVariantAttack(20), 21);
  assert.equal(getFastVariantAttack(10), 11);
  assert.equal(getFastVariantAttack(5), 6);
});
