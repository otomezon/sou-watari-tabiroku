import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, GameEngine, getFastVariantAttack, getHunterInitialLevel, levelUpMonsterAfterHunterVictory } from '../assets/engine.js';
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

test('a monster that defeats a magic-eater gains a level and stronger stats', () => {
  const state = createNewGame(0x12345678, 'intermediate');
  state.dungeon.tiles = Array.from({ length: 40 }, () => Array(40).fill(0));
  state.dungeon.tiles[5][5] = 1;
  state.dungeon.tiles[5][6] = 1;
  state.dungeon.stairs = null;
  const hunter = {
    id: 'hunter', kind: 'slime', name: '魔喰いのスライム',
    x: 5, y: 5, hp: 1, maxHp: 80, attack: 8, defense: 2,
    exp: 30, boss: false, hunterVariant: true, hunterLevel: 4,
  };
  const winner = {
    id: 'winner', kind: 'bat', name: '洞窟コウモリ',
    x: 6, y: 5, hp: 12, maxHp: 20, attack: 5, defense: 1,
    exp: 10, boss: false, hunterVariant: false, retaliationTargetId: 'hunter',
  };
  state.monsters = [hunter, winner];
  const engine = new GameEngine(state);
  engine.performMonsterAction(winner, new Random(123));
  assert.equal(state.monsters.some((entry) => entry.id === 'hunter'), false);
  assert.equal(winner.level, 2);
  assert.equal(winner.maxHp, 26);
  assert.equal(winner.hp, 18);
  assert.equal(winner.attack, 6);
  assert.equal(winner.defense, 2);
  assert.match(state.message, /洞窟コウモリが魔喰いを撃退した！ Lv\.2に成長/);
});

test('monster level growth is capped at level 99', () => {
  const monster = { level: 99, hp: 20, maxHp: 20, attack: 8, defense: 3 };
  assert.equal(levelUpMonsterAfterHunterVictory(monster), 99);
  assert.equal(monster.level, 99);
  assert.equal(monster.hp, 20);
  assert.equal(monster.attack, 8);
  assert.equal(monster.defense, 3);
});
