import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('game over fades the dungeon out and brings the result screen in', async () => {
  const [main, styles] = await Promise.all([
    read('assets/main.js'),
    read('assets/style.css'),
  ]);

  assert.match(main, /const GAME_OVER_RESULT_DELAY_MS = 1120/);
  assert.match(main, /byId\('game-screen'\)\.classList\.add\('is-dying'\)/);
  assert.match(main, /await wait\(GAME_OVER_RESULT_DELAY_MS\)/);
  assert.match(main, /classList\.toggle\('is-gameover-arrival', !cleared\)/);
  assert.match(styles, /\.game-screen\.is-dying\s*\{/);
  assert.match(styles, /@keyframes game-over-fade-out/);
  assert.match(styles, /\.result-screen\.is-gameover-arrival\s*\{/);
  assert.match(styles, /@keyframes gameover-result-arrive/);
});
