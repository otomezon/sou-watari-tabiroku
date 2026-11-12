import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNewGame, GameEngine } from '../assets/engine.js';
import { canStepBetween, isWalkable } from '../assets/dungeon.js';

function findAdjacentOpenPair(state) {
  const tiles = state.dungeon.tiles;
  const player = state.player;
  const stairs = state.dungeon.stairs;
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < (tiles[y]?.length ?? 0); x += 1) {
      const from = { x, y };
      if (!isWalkable(tiles, from) || distance(from, player) < 4)
        continue;
      if (stairs && from.x === stairs.x && from.y === stairs.y)
        continue;

      for (const [dx, dy] of directions) {
        const to = { x: x + dx, y: y + dy };
        if (!isWalkable(tiles, to) || distance(to, player) < 4)
          continue;
        if (stairs && to.x === stairs.x && to.y === stairs.y)
          continue;
        if (canStepBetween(tiles, from, to))
          return { from, to };
      }
    }
  }

  throw new Error('Could not find an open adjacent monster pair for the regression test.');
}

function setUpHunterDefeat({ winnerLevel = 4 } = {}) {
  const state = createNewGame(0x5a10f00d, 'expert');
  const { from, to } = findAdjacentOpenPair(state);
  const winner = {
    id: 'hunter-defeat-winner',
    kind: 'slime',
    name: '勝者モンスター',
    x: from.x,
    y: from.y,
    hp: 24,
    maxHp: 40,
    attack: 100,
    defense: 3,
    exp: 1,
    level: winnerLevel,
    boss: false,
    rareVariant: false,
    hunterVariant: false,
    actionSpeed: 'normal',
    actionProgress: 0,
    retaliationTargetId: 'hunter-defeat-target',
  };
  const hunter = {
    id: 'hunter-defeat-target',
    kind: 'wolf',
    name: '魔喰いの検証敵',
    x: to.x,
    y: to.y,
    hp: 1,
    maxHp: 1,
    attack: 1,
    defense: 0,
    exp: 1,
    boss: false,
    rareVariant: true,
    hunterVariant: true,
    hunterLevel: 3,
    actionSpeed: 'normal',
    actionProgress: 0,
  };

  state.monsters = [winner, hunter];
  const engine = new GameEngine(state);
  return { state, engine, winner, hunter };
}

test('a monster that defeats a hunter levels up and reports one fanfare cue', () => {
  const { state, engine, winner, hunter } = setUpHunterDefeat();
  const before = { maxHp: winner.maxHp, hp: winner.hp, attack: winner.attack, defense: winner.defense };

  engine.wait();

  assert.equal(state.monsters.some((monster) => monster.id === hunter.id), false);
  assert.equal(winner.level, 5);
  assert.equal(winner.maxHp, before.maxHp + Math.max(6, Math.ceil(before.maxHp * 0.18)));
  assert.equal(winner.hp, before.hp + Math.max(6, Math.ceil(before.maxHp * 0.18)));
  assert.equal(winner.attack, before.attack + 1);
  assert.equal(winner.defense, before.defense + 1);
  assert.equal(engine.getMonsterLevelUpCount(), 1);
  assert.equal(engine.getHunterLevelUpCount(), 0);
  assert.match(state.message, /勝者モンスターが魔喰いを撃退した！ Lv\.5に成長/);
});

test('a level-99 winner defeats the hunter without a false level-up fanfare', () => {
  const { state, engine, winner, hunter } = setUpHunterDefeat({ winnerLevel: 99 });
  const before = { maxHp: winner.maxHp, hp: winner.hp, attack: winner.attack, defense: winner.defense };

  engine.wait();

  assert.equal(state.monsters.some((monster) => monster.id === hunter.id), false);
  assert.equal(winner.level, 99);
  assert.deepEqual(
    { maxHp: winner.maxHp, hp: winner.hp, attack: winner.attack, defense: winner.defense },
    before,
  );
  assert.equal(engine.getMonsterLevelUpCount(), 0);
  assert.match(state.message, /これ以上は成長できない/);
});

test('the app plays the regular level-up fanfare for monster growth notifications', async () => {
  const main = await readFile(new URL('../assets/main.js', import.meta.url), 'utf8');
  assert.match(main, /this\.engine\.getMonsterLevelUpCount\(\)/);
  assert.match(main, /monsterLevelCues = Array\.from\(\{ length: monsterLevelUps \}, \(\) => 'level'\)/);
  assert.match(main, /\.\.\.monsterLevelCues/);
});
