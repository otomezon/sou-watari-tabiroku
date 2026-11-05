import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('level-up fanfare uses an original three-part D-major phrase', async () => {
  const audio = await read('assets/audio.js');
  assert.match(audio, /playLevelUpFanfare/);
  assert.match(audio, /const melody = \[/);
  assert.match(audio, /const chords = \[/);
  assert.match(audio, /G major/);
  assert.match(audio, /A major/);
  assert.match(audio, /D major/);
  assert.match(audio, /2349\.32/);
  assert.match(audio, /offset \+= 3\.05/);
});

test('old fanfare WAV is no longer downloaded or precached', async () => {
  const [audio, sw] = await Promise.all([read('assets/audio.js'), read('sw.js')]);
  assert.doesNotMatch(audio, /level-up-fanfare-v3\.wav/);
  assert.doesNotMatch(sw, /level-up-fanfare-v3\.wav/);
});

test('a killing blow always retains the player attack cue', async () => {
  const main = await read('assets/main.js');
  assert.match(main, /const actionCues = defaultEffect === 'attack' \? \['attack'\] : \[\]/);
  assert.match(main, /\.\.\.actionCues,[\s\S]*?\.\.\.damageCues/);
  assert.doesNotMatch(main, /oldMonsters|effect\('defeat'\)/);
});

test('the separate enemy-defeat or experience-pickup sound is removed', async () => {
  const [main, audio] = await Promise.all([read('assets/main.js'), read('assets/audio.js')]);
  assert.doesNotMatch(main, /effect\('defeat'\)/);
  assert.doesNotMatch(audio, /defeat: \{/);
});

test('attack and level-up cues are ordered before incoming damage and result cues', async () => {
  const main = await read('assets/main.js');
  assert.match(main, /\.\.\.actionCues,[\s\S]*?\.\.\.\(leveledUp \? \['level'\] : \[\]\),[\s\S]*?\.\.\.damageCues,[\s\S]*?\.\.\.resultCues/);
});

test('identical repeated damage cue timing remains unchanged', async () => {
  const audio = await read('assets/audio.js');
  assert.match(audio, /this\.playDamageEffect\(now \+ offset\);\s*offset \+= 0\.24/);
});

test('PWA versions and cache namespace are aligned at 4.9.4', async () => {
  const [main, manifest, sw] = await Promise.all([read('assets/main.js'), read('manifest.webmanifest'), read('sw.js')]);
  assert.match(main, /APP_VERSION = '4\.9\.4'/);
  assert.match(manifest, /"version": "4\.9\.4"/);
  assert.match(sw, /sou-watari-tabiroku-v4-9-4/);
});

test('save schema v11 is retained', async () => {
  const engine = await read('assets/engine.js');
  assert.match(engine, /schemaVersion: 11/);
});
