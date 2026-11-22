import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNewGame, GameEngine } from '../assets/engine.js';
import { createItem, getItemSelectionFloor } from '../assets/items.js';
import { Random } from '../assets/random.js';
import { MODE_ORDER, getModeConfig } from '../assets/modes.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('a rear monster sidesteps a monster blocking the direct approach, then attacks from the new lane', () => {
  const state = createNewGame(0x521210, 'intermediate');
  state.dungeon.tiles = Array.from({ length: 20 }, () => Array(20).fill(1));
  state.dungeon.stairs = null;
  state.player.x = 8;
  state.player.y = 5;
  const blocker = {
    id: 'front-monster', kind: 'slime', name: '前方のスライム',
    x: 7, y: 5, hp: 80, maxHp: 80, attack: 4, defense: 0, exp: 5,
    boss: false, floorBalanceVersion: 7,
  };
  const pursuer = {
    id: 'rear-monster', kind: 'bat', name: '後方のコウモリ',
    x: 6, y: 5, hp: 80, maxHp: 80, attack: 4, defense: 0, exp: 5,
    boss: false, floorBalanceVersion: 7,
  };
  state.monsters = [blocker, pursuer];
  const engine = new GameEngine(state);
  const minimumRandom = { int: (min) => min, chance: () => false };
  const hpBefore = state.player.hp;

  engine.performMonsterAction(pursuer, minimumRandom);
  assert.deepEqual({ x: pursuer.x, y: pursuer.y }, { x: 7, y: 4 },
    'the pursuer should sidestep the occupied shortest-path tile rather than detour across the room');

  engine.performMonsterAction(pursuer, minimumRandom);
  assert.ok(state.player.hp < hpBefore,
    'the pursuer should close from the adjacent open tile and attack the player');
});

test('a monster boxed in by walls and an ally waits rather than wandering away from the player', () => {
  const state = createNewGame(0x521211, 'intermediate');
  state.dungeon.tiles = Array.from({ length: 20 }, () => Array(20).fill(0));
  state.dungeon.tiles[5][5] = 1;
  state.dungeon.tiles[5][6] = 1;
  state.dungeon.tiles[5][10] = 1;
  state.dungeon.stairs = null;
  state.player.x = 10;
  state.player.y = 5;
  const blocker = {
    id: 'corridor-blocker', kind: 'slime', name: '通路のスライム',
    x: 6, y: 5, hp: 80, maxHp: 80, attack: 4, defense: 0, exp: 5,
    boss: false, floorBalanceVersion: 7,
  };
  const pursuer = {
    id: 'corridor-pursuer', kind: 'bat', name: '後方のコウモリ',
    x: 5, y: 5, hp: 80, maxHp: 80, attack: 4, defense: 0, exp: 5,
    boss: false, floorBalanceVersion: 7,
  };
  state.monsters = [blocker, pursuer];
  const engine = new GameEngine(state);
  engine.performMonsterAction(pursuer, { int: (min) => min, chance: () => false });
  assert.deepEqual({ x: pursuer.x, y: pursuer.y }, { x: 5, y: 5 });
});

test('premium loot selection never borrows a future-floor item template', async () => {
  const source = await read('assets/items.js');
  const itemFloors = new Map(
    [...source.matchAll(/id: '([^']+)'[^\n]*minFloor: (\d+)/g)]
      .map((match) => [match[1], Number(match[2])]),
  );
  const kinds = ['weapon', 'shield', 'armor', 'potion', 'food', 'valuable'];

  for (const modeId of MODE_ORDER) {
    for (let floor = 1; floor <= Math.min(4, getModeConfig(modeId).floors); floor += 1) {
      assert.equal(getItemSelectionFloor(floor, modeId, 'premium'), floor);
      for (const kind of kinds) {
        for (const seed of [1, 17, 203, 90210]) {
          const item = createItem(floor, new Random(seed + floor * 1000), kind, modeId, 'premium');
          const minimumFloor = itemFloors.get(item.templateId);
          assert.ok(Number.isInteger(minimumFloor), `missing minimum floor for ${item.templateId}`);
          assert.ok(minimumFloor <= floor,
            `${modeId} F${floor}: ${item.name} requires F${minimumFloor}`);
        }
      }
    }
  }
});

test('game-over state retains the fatal hit message for the presentation pause', () => {
  const state = createNewGame(0x521212, 'beginner');
  state.message = '魔物の攻撃！ 12 ダメージを受けた。';
  state.player.hp = 0;
  const engine = new GameEngine(state);
  engine.handleGameOver();

  assert.equal(state.status, 'gameover');
  assert.match(state.message, /魔物の攻撃！ 12 ダメージ/);
  assert.match(state.message, /力尽きた/);
});

test('gameplay actions and game-over transition have visible pacing', async () => {
  const main = await read('assets/main.js');
  assert.match(main, /const ACTION_DELAY_MS = 65/);
  assert.match(main, /const GAME_OVER_RESULT_DELAY_MS = 1120/);
  assert.match(main, /await wait\(ACTION_DELAY_MS\)/);
  assert.match(main, /await wait\(GAME_OVER_RESULT_DELAY_MS\)/);
  assert.match(main, /const wait = \(milliseconds\) => new Promise/);
});

test('boss theme is preloaded during exploration and crossfades faster on boss-floor entry', async () => {
  const audio = await read('assets/audio.js');
  const main = await read('assets/main.js');
  assert.match(audio, /if \(!boss\)\s+void this\.loadTrack\('boss'\)/);
  assert.match(audio, /track === 'boss' \? 0\.16 : 0\.55/);
  assert.match(audio, /track === 'boss' \? 0\.16 : 0\.32/);
  assert.match(main, /this\.sound\.startBgm\(this\.state\.modeId, bossFloor\)/);
});
