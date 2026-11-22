import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('game-over dissolves the dungeon and crossfades the result over the blood transition', async () => {
  const [main, styles, html, audio] = await Promise.all([
    read('assets/main.js'),
    read('assets/style.css'),
    read('index.html'),
    read('assets/audio.js'),
  ]);

  assert.match(main, /const GAME_OVER_CROSSFADE_START_MS = 460/);
  assert.match(main, /const GAME_OVER_CROSSFADE_MS = 760/);
  const bloodStart = main.indexOf("transitionBlood.classList.add('is-active')");
  const firstWait = main.indexOf('await wait(GAME_OVER_CROSSFADE_START_MS)', bloodStart);
  const resultReveal = main.indexOf('this.showResult({ transition: true })', firstWait);
  const bloodFade = main.indexOf("transitionBlood.classList.add('is-fading')", resultReveal);
  const secondWait = main.indexOf('await wait(GAME_OVER_CROSSFADE_MS)', bloodFade);
  const hideDungeon = main.indexOf("gameScreen.classList.add('hidden')", secondWait);
  assert.ok(bloodStart >= 0 && firstWait > bloodStart, 'blood must begin with the dungeon dissolve');
  assert.ok(resultReveal > firstWait && bloodFade > resultReveal, 'result screen must begin while blood is still visible');
  assert.ok(secondWait > bloodFade && hideDungeon > secondWait, 'dungeon must remain beneath the result until the crossfade is complete');
  assert.match(main, /showResult\(\{ transition = false \} = \{\}\)/);
  assert.match(main, /resultScreen.classList.add\('is-gameover-transitioned', 'is-gameover-entering'\)/);

  assert.match(styles, /@keyframes game-over-dungeon-dissolve/);
  assert.match(styles, /\.result-screen\.is-gameover-transitioned/);
  assert.match(styles, /@keyframes gameover-result-crossfade/);
  assert.match(styles, /@keyframes gameover-blood-reveal/);
  assert.match(styles, /feTurbulence/);
  assert.match(styles, /@keyframes gameover-blood-clear/);
  assert.match(html, /class="gameover-blood-art" viewBox="0 0 390 844"/);
  assert.match(html, /<path class="blood-wet"/);
  assert.doesNotMatch(html, /<span><\/span><span><\/span>/);

  assert.match(main, /window\.addEventListener\('pagehide', \(\) => this\.sound\.shutdown\(\)/);
  assert.match(main, /window\.addEventListener\('beforeunload', \(\) => this\.sound\.shutdown\(\)/);
  assert.match(audio, /shutdown\(\)\s*\{/);
  assert.match(audio, /this\.master\.gain\.setValueAtTime\(0, now\)/);
  assert.match(audio, /void context\.close\(\)\.catch\(\(\) => undefined\)/);
});
