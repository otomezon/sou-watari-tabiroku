import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, GameEngine } from '../assets/engine.js';
import { validateGameState } from '../assets/storage.js';
import { DIRECTION_DELTA, nextPathStep } from '../assets/dungeon.js';
import { MODE_ORDER } from '../assets/modes.js';

const MIN_RANDOM = { int: (min) => min, chance: () => false };

function openState(modeId, seed) {
  const state = createNewGame(seed, modeId);
  state.dungeon.width = 20;
  state.dungeon.height = 20;
  state.dungeon.tiles = Array.from({ length: 20 }, () => Array(20).fill(1));
  state.dungeon.start = { x: 2, y: 2 };
  state.dungeon.stairs = { x: 18, y: 18 };
  state.player.x = 8;
  state.player.y = 5;
  state.player.maxHp = 10000;
  state.player.hp = 10000;
  state.monsters = [];
  return state;
}

test('a rear monster commits to one free attack slot and does not step backward and forward', () => {
  const state = openState('intermediate', 0x522201);
  const front = {
    id: 'front', kind: 'slime', name: '先頭', x: 7, y: 5,
    hp: 50, maxHp: 50, attack: 4, defense: 0, exp: 1,
    boss: false, floorBalanceVersion: 7,
  };
  const rear = {
    id: 'rear', kind: 'bat', name: '後続', x: 6, y: 5,
    hp: 50, maxHp: 50, attack: 4, defense: 0, exp: 1,
    boss: false, floorBalanceVersion: 7,
  };
  state.monsters = [front, rear];
  const engine = new GameEngine(state);

  engine.performMonsterAction(rear, MIN_RANDOM);
  const attackSlot = { x: rear.x, y: rear.y };
  assert.notDeepEqual(attackSlot, { x: 6, y: 5 });
  assert.equal(Math.max(Math.abs(rear.x - state.player.x), Math.abs(rear.y - state.player.y)), 1);

  for (let index = 0; index < 6; index += 1) {
    engine.performMonsterAction(rear, MIN_RANDOM);
    assert.deepEqual({ x: rear.x, y: rear.y }, attackSlot,
      'a monster with an available attack slot must stay there instead of jittering');
  }
});

test('when all attack slots and routes are occupied, a rear monster queues without wandering away', () => {
  const state = openState('intermediate', 0x522202);
  state.dungeon.tiles = Array.from({ length: 20 }, () => Array(20).fill(0));
  for (let x = 3; x <= 10; x += 1) state.dungeon.tiles[5][x] = 1;
  state.player.x = 10;
  state.player.y = 5;
  const front = {
    id: 'corridor-front', kind: 'slime', name: '先頭', x: 9, y: 5,
    hp: 50, maxHp: 50, attack: 4, defense: 0, exp: 1,
    boss: false, floorBalanceVersion: 7,
  };
  const rear = {
    id: 'corridor-rear', kind: 'bat', name: '後続', x: 8, y: 5,
    hp: 50, maxHp: 50, attack: 4, defense: 0, exp: 1,
    boss: false, floorBalanceVersion: 7,
  };
  state.monsters = [front, rear];
  const engine = new GameEngine(state);
  for (let index = 0; index < 5; index += 1) {
    engine.performMonsterAction(rear, MIN_RANDOM);
    assert.deepEqual({ x: rear.x, y: rear.y }, { x: 8, y: 5 });
  }
});

test('a monster can occupy a stair tile and the resulting state remains save-valid', () => {
  const state = openState('intermediate', 0x522203);
  state.dungeon.tiles = Array.from({ length: 20 }, () => Array(20).fill(0));
  for (let x = 3; x <= 8; x += 1) state.dungeon.tiles[5][x] = 1;
  state.player.x = 8;
  state.player.y = 5;
  state.shop = null;
  state.groundItems = [];
  state.groundGold = [];
  state.dungeon.start = { x: 3, y: 5 };
  state.dungeon.stairs = { x: 6, y: 5 };
  const pursuer = {
    id: 'stairs-pursuer', kind: 'slime', name: '階段の追跡者',
    x: 4, y: 5, hp: 30, maxHp: 30, attack: 4, defense: 0, exp: 1,
    boss: false, floorBalanceVersion: 7,
  };
  state.monsters = [pursuer];
  const engine = new GameEngine(state);

  engine.performMonsterAction(pursuer, MIN_RANDOM);
  assert.equal(validateGameState(state), true);
  engine.performMonsterAction(pursuer, MIN_RANDOM);
  assert.deepEqual({ x: pursuer.x, y: pursuer.y }, { x: 6, y: 5 });
  const stairSaveValid = validateGameState(state);
  assert.equal(stairSaveValid, true,
    `the save validator must allow an enemy to stand on a stair tile: ${JSON.stringify({
      schemaVersion: state.schemaVersion, status: state.status, floor: state.floor,
      player: state.player, start: state.dungeon.start, stairs: state.dungeon.stairs,
      bossArena: state.dungeon.bossArena, shop: state.shop,
      monsters: state.monsters.map(({ id, x, y, hp, maxHp, attack, defense, boss, hunterVariant, rareVariant }) =>
        ({ id, x, y, hp, maxHp, attack, defense, boss, hunterVariant, rareVariant })),
      groundItems: state.groundItems, groundGold: state.groundGold, inventory: state.inventory,
    })}`);

});

test('repeated player attacks and enemy turns keep every campaign save-valid', () => {
  const directionEntries = Object.entries(DIRECTION_DELTA);
  for (const modeId of MODE_ORDER) {
    const state = createNewGame(0x522204 + MODE_ORDER.indexOf(modeId), modeId);
    state.player.maxHp = 10000;
    state.player.hp = 10000;
    const engine = new GameEngine(state);
    let attacks = 0;

    for (let action = 0; action < 90 && state.status === 'playing'; action += 1) {
      const nearest = [...state.monsters].sort((a, b) =>
        Math.max(Math.abs(a.x - state.player.x), Math.abs(a.y - state.player.y)) -
        Math.max(Math.abs(b.x - state.player.x), Math.abs(b.y - state.player.y)))[0];
      const step = nearest
        ? nextPathStep(state.dungeon.tiles, state.player, nearest, new Set())
        : null;

      if (!step) {
        engine.wait();
      } else {
        const dx = step.x - state.player.x;
        const dy = step.y - state.player.y;
        const direction = directionEntries.find(([, delta]) => delta.x === dx && delta.y === dy)?.[0];
        assert.ok(direction, `${modeId}: invalid next attack direction ${dx},${dy}`);
        const defeatedBefore = state.defeatedMonsters;
        engine.move(direction);
        if (state.defeatedMonsters > defeatedBefore) attacks += 1;
      }

      const isSaveValid = validateGameState(state);
      assert.equal(isSaveValid, true,
        `${modeId}: invalid save state after action ${action}, floor ${state.floor}: ${JSON.stringify({
          schemaVersion: state.schemaVersion, status: state.status, messageLength: state.message?.length,
          player: { x: state.player.x, y: state.player.y, hp: state.player.hp, level: state.player.level },
          start: state.dungeon.start, stairs: state.dungeon.stairs,
          shopPresent: state.shop !== null,
          monsterPositions: state.monsters.map(({ id, x, y, hp, maxHp, attack, defense }) => ({ id, x, y, hp, maxHp, attack, defense })),
          groundItems: state.groundItems.map(({ x, y, item }) => ({ x, y, kind: item?.kind })),
          groundGold: state.groundGold, inventoryCount: state.inventory.length,
        })}`);
    }
    assert.ok(attacks > 0, `${modeId}: scripted combat should include a player kill`);
  }
});
