import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNewGame, experienceToNext, GameEngine } from '../assets/engine.js';
import { Random } from '../assets/random.js';
import { MODE_ORDER, getModeConfig } from '../assets/modes.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const OPENING_RANGES = {
  tutorial: { floor1: [2, 3], floor2: [2, 4] },
  beginner: { floor1: [2, 5], floor2: [3, 6] },
  intermediate: { floor1: [3, 6], floor2: [4, 7] },
  advanced: { floor1: [3, 7], floor2: [4, 8] },
  expert: { floor1: [4, 8], floor2: [5, 9] },
};

function assertSafeOpening(state, range) {
  assert.ok(state.monsters.length >= range[0] && state.monsters.length <= range[1],
    `expected ${range[0]}–${range[1]} monsters, got ${state.monsters.length}`);
  for (const monster of state.monsters) {
    const distance = Math.max(
      Math.abs(monster.x - state.dungeon.start.x),
      Math.abs(monster.y - state.dungeon.start.y),
    );
    assert.ok(distance >= 4, `monster spawned too close to start: distance ${distance}`);
  }
}

for (const modeId of MODE_ORDER) {
  test(`${modeId}: floor 1 has a smaller, safely spaced encounter`, () => {
    for (const seed of [0x12345678, 0x5a17c0de, 0x6d2b79f5]) {
      assertSafeOpening(createNewGame(seed, modeId), OPENING_RANGES[modeId].floor1);
    }
  });

  test(`${modeId}: floor 2 keeps the opening protections`, () => {
    const state = createNewGame(0x38ab21ef, modeId);
    const engine = new GameEngine(state);
    state.player.x = state.dungeon.stairs.x;
    state.player.y = state.dungeon.stairs.y;
    assert.equal(engine.descend(), true);
    assert.equal(state.floor, 2);
    assertSafeOpening(state, OPENING_RANGES[modeId].floor2);
  });

  test(`${modeId}: opening support is not granted as free items`, () => {
    const state = createNewGame(0x12345678, modeId);
    assert.equal(state.equipment.weapon, null);
    assert.equal(state.equipment.shield, null);
    assert.equal(state.equipment.armor, null);
    assert.deepEqual(state.inventory, []);
  });

  test(`${modeId}: two ordinary opening kills can reach level 2`, () => {
    const state = createNewGame(0x4f1bbcdc, modeId);
    const engine = new GameEngine(state);
    assert.equal(experienceToNext(1), 18);
    for (let index = 0; index < 2; index += 1) {
      const monster = {
        id: `opening-test-${index}`, kind: 'slime', name: 'ぷるぷるスライム',
        x: 2 + index, y: 2, hp: 1, maxHp: 1, attack: 1, defense: 0,
        exp: 10, boss: false, actionSpeed: 'normal', actionProgress: 0,
        rareVariant: false,
      };
      state.monsters = [monster];
      engine.attackMonster(monster, new Random(100 + index));
    }
    assert.equal(state.player.level, 2);
    assert.ok(state.player.maxHp > 34);
    assert.ok(state.player.baseAttack > 5);
  });
}

test('5.1.6 app, manifest, cache and release metadata stay aligned without changing save schema', async () => {
  const [main, manifest, sw, engine, storage, release] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'),
    read('assets/engine.js'), read('assets/storage.js'), read('RELEASE_v5.1.6.yaml'),
  ]);
  assert.match(main, /APP_VERSION = '5.1.6'/);
  assert.match(manifest, /"version": "5.1.6"/);
  assert.match(sw, /sou-watari-tabiroku-v5-1-6/);
  assert.match(engine, /schemaVersion: 12/);
  assert.match(storage, /state\.schemaVersion !== 12/);
  assert.match(release, /type: patch/);
});

test('opening difficulty guard and original rare encounter eligibility are explicit', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /state\.floor <= 2 \? 0\.95 : 1/);
  assert.match(engine, /const canSpawnRare = state\.modeId !== 'tutorial'/);
});
