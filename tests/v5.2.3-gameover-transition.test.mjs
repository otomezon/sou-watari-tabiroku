import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('blood flows over the dying dungeon and ends exactly at the result-screen switch', async () => {
  const [main, styles, html] = await Promise.all([
    read('assets/main.js'),
    read('assets/style.css'),
    read('index.html'),
  ]);

  assert.match(main, /const GAME_OVER_RESULT_DELAY_MS = 900/);
  assert.match(main, /byId\('game-screen'\)\.classList\.add\('is-dying'\)/);
  const bloodStart = main.indexOf("transitionBlood.classList.add('is-active')");
  const waitForBlood = main.indexOf('await wait(GAME_OVER_RESULT_DELAY_MS)', bloodStart);
  const bloodEnd = main.indexOf("transitionBlood.classList.remove('is-active')", waitForBlood);
  const resultSwitch = main.indexOf('this.showResult();', waitForBlood);
  assert.ok(bloodStart >= 0 && waitForBlood > bloodStart, 'blood must start before the transition wait');
  assert.ok(bloodEnd > waitForBlood && resultSwitch > bloodEnd, 'blood must remain active during the wait and clear before the result screen');
  assert.doesNotMatch(main, /classList\.toggle\('is-gameover-arrival'/);

  assert.match(styles, /\.game-screen\.is-dying\s*\{/);
  assert.match(styles, /@keyframes game-over-fade-out/);
  assert.match(styles, /\.gameover-transition-blood\.is-active\s*\{/);
  assert.match(styles, /@keyframes gameover-blood-flow/);
  assert.match(styles, /@keyframes gameover-blood-wash/);
  assert.doesNotMatch(styles, /@keyframes gameover-result-arrive/);
  assert.match(html, /id="gameover-transition-blood" class="gameover-transition-blood" aria-hidden="true"/);
  assert.doesNotMatch(html, /class="gameover-blood"/);
  assert.match(html, /<span><\/span><span><\/span><span><\/span><span><\/span><span><\/span><span><\/span><span><\/span>/);
});
