import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, GameEngine } from '../assets/engine.js';
import { validateGameState } from '../assets/storage.js';
import { SoundManager } from '../assets/audio.js';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

function findCardinalPair(state) {
  const { tiles, width, height, start, stairs } = state.dungeon;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (tiles[y]?.[x] !== 1 || (x === start.x && y === start.y) || (x === stairs.x && y === stairs.y)) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const other = { x: x + dx, y: y + dy };
        if (tiles[other.y]?.[other.x] !== 1) continue;
        if ((other.x === start.x && other.y === start.y) || (other.x === stairs.x && other.y === stairs.y)) continue;
        if (Math.max(Math.abs(x - start.x), Math.abs(y - start.y)) < 3) continue;
        return [{ x, y }, other];
      }
    }
  }
  throw new Error('No adjacent floor pair found in generated dungeon');
}

function hunterFixture() {
  const state = createNewGame(0x5a17c0de, 'beginner');
  const [hunterPoint, preyPoint] = findCardinalPair(state);
  const hunter = {
    id: 'test-hunter', kind: 'slime', name: '魔喰いのスライム',
    ...hunterPoint, hp: 30, maxHp: 30, attack: 10, defense: 2, exp: 25,
    boss: false, actionSpeed: 'normal', actionProgress: 0, rareVariant: true,
    hunterVariant: true, hunterLevel: 1,
  };
  const prey = {
    id: 'test-prey', kind: 'bat', name: '洞窟コウモリ',
    ...preyPoint, hp: 40, maxHp: 40, attack: 2, defense: 0, exp: 5,
    boss: false, actionSpeed: 'normal', actionProgress: 0, rareVariant: false,
    hunterVariant: false,
  };
  state.monsters = [hunter, prey];
  state.groundItems = [];
  state.groundGold = [];
  return { state, hunter, prey, engine: new GameEngine(state) };
}

test('a normal monster remembers the 魔喰い that attacked it and retaliates', () => {
  const { hunter, prey, engine } = hunterFixture();
  const hunterHp = hunter.hp;
  engine.performMonsterAction(hunter, { int: (_min, max) => max });
  assert.equal(prey.retaliationTargetId, hunter.id);
  assert.ok(prey.hp < prey.maxHp);

  engine.performMonsterAction(prey, { int: (_min, max) => max });
  assert.ok(hunter.hp < hunterHp);
  assert.match(engine.state.message, /魔喰いに反撃/);
});

test('a retaliating monster pathfinds toward its remembered hunter', () => {
  const { state, hunter, prey, engine } = hunterFixture();
  state.dungeon.tiles = Array.from({ length: state.dungeon.height }, () => Array(state.dungeon.width).fill(1));
  hunter.x = 12;
  hunter.y = 12;
  prey.x = 5;
  prey.y = 5;
  prey.retaliationTargetId = hunter.id;
  state.player.x = 30;
  state.player.y = 30;
  const before = Math.max(Math.abs(hunter.x - prey.x), Math.abs(hunter.y - prey.y));
  engine.performMonsterAction(prey, { int: (_min, max) => max });
  const after = Math.max(Math.abs(hunter.x - prey.x), Math.abs(hunter.y - prey.y));
  assert.ok(after < before);
  assert.equal(prey.retaliationTargetId, hunter.id);
});

test('a monster clears its retaliation target after the hunter is gone', () => {
  const { state, hunter, prey, engine } = hunterFixture();
  prey.retaliationTargetId = hunter.id;
  state.monsters = state.monsters.filter((monster) => monster.id !== hunter.id);
  engine.performMonsterAction(prey, { int: (_min, max) => max });
  assert.equal(prey.retaliationTargetId, undefined);
});

test('retaliation target survives save validation', () => {
  const { state, hunter, prey } = hunterFixture();
  prey.retaliationTargetId = hunter.id;
  assert.equal(validateGameState(state), true);
});

test('魔喰い level-up fanfare is the player phrase transposed down two semitones', () => {
  const sound = new SoundManager();
  sound.context = { currentTime: 1 };
  sound.sfxGain = {};
  sound.settings = { muteSfx: false, sfxVolume: 0.5 };
  const frequencies = [];
  sound.playFanfareTone = (frequency) => frequencies.push(frequency);

  sound.playLevelUpFanfare();
  const playerPhrase = [...frequencies];
  frequencies.length = 0;
  sound.playHunterLevelUpFanfare();
  const hunterPhrase = [...frequencies];

  assert.equal(hunterPhrase.length, playerPhrase.length);
  const ratio = Math.pow(2, -2 / 12);
  for (let i = 0; i < playerPhrase.length; i += 1)
    assert.ok(Math.abs(hunterPhrase[i] / playerPhrase[i] - ratio) < 1e-10);
});

test('the main action flow queues a dedicated fanfare for each hunter level-up', async () => {
  const [main, audio, engine] = await Promise.all([
    read('assets/main.js'), read('assets/audio.js'), read('assets/engine.js'),
  ]);
  assert.match(main, /getHunterLevelUpCount\(\)/);
  assert.match(main, /Array\.from\(\{ length: hunterLevelUps \}, \(\) => 'hunter-level'\)/);
  assert.match(main, /\.\.\.hunterLevelCues/);
  assert.match(audio, /effect === 'hunter-level'[\s\S]*?playHunterLevelUpFanfare/);
  assert.match(engine, /this\.hunterLevelUpCount \+= 1/);
});

test('v5.0.1 keeps release version and the previous save schema', async () => {
  const [main, manifest, sw, storage] = await Promise.all([
    read('assets/main.js'), read('manifest.webmanifest'), read('sw.js'), read('assets/storage.js'),
  ]);
  assert.match(main, /APP_VERSION = '5\.0\.1'/);
  assert.match(manifest, /"version": "5\.0\.1"/);
  assert.match(sw, /sou-watari-tabiroku-v5-0-1/);
  assert.match(storage, /state\.schemaVersion !== 12/);
});
