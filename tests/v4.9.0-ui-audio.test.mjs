import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MONSTER_CATALOG } from '../assets/engine.js';
import { MONSTER_SHAPE_BY_KIND } from '../assets/renderer.js';
const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('all 60 catalogue monsters have an explicit sprite family', () => {
  assert.equal(MONSTER_CATALOG.length, 60);
  const missing = MONSTER_CATALOG.map((monster) => monster.kind).filter((kind) => !MONSTER_SHAPE_BY_KIND[kind]);
  assert.deepEqual(missing, []);
});
test('the monster catalogue uses a broad set of distinct silhouettes', () => {
  assert.ok(new Set(Object.values(MONSTER_SHAPE_BY_KIND)).size >= 18);
});
test('sprite drawing contains distinct anatomy for named families', async () => {
  const source = await read('assets/renderer.js');
  for (const family of ['blob','wing','beast','fungus','insect','crab','scorpion','spider','serpent','ghost','plant','armored','golem','dragon','bird','eye','giant','hydra','demon','skeleton']) {
    assert.match(source, new RegExp(`case '${family}'`));
  }
});
test('monster health, level, rarity and boss rendering are retained', async () => {
  const source = await read('assets/renderer.js');
  assert.match(source, /monster\.hp < monster\.maxHp/);
  assert.match(source, /getEnemyLevel\(monster\)/);
  assert.match(source, /monster\.rareVariant/);
  assert.match(source, /monster\.boss/);
  assert.match(source, /monster\.shopkeeper/);
});
test('redundant caption and its two explanation rows are removed', async () => {
  const html = await read('index.html');
  const css = await read('assets/style.css');
  assert.doesNotMatch(html, /dungeon-caption|あなた <span class="legend-dot/);
  assert.doesNotMatch(html, /Lv＝敵の能力値目安/);
  assert.doesNotMatch(css, /dungeon-caption|speed-legend/);
});
test('canvas accessibility description no longer depends on removed legend', async () => {
  const html = await read('index.html');
  assert.match(html, /ダンジョンの探索エリア/);
  assert.doesNotMatch(html, /希少個体には鈍足または倍速の印/);
});
test('player attack has its own multi-layer synthesized cue', async () => {
  const source = await read('assets/audio.js');
  assert.match(source, /playAttackEffect/);
  assert.match(source, /760,245,'sawtooth'/);
  assert.match(source, /1320,690,'triangle'/);
});
test('received damage has a low impact and midrange crack', async () => {
  const source = await read('assets/audio.js');
  assert.match(source, /playDamageEffect/);
  assert.match(source, /playTransientTone\(138, 62, 'triangle'/);
  assert.match(source, /playTransientTone\(286, 126, 'square'/);
});
test('sequential damage cues are spaced so two fast hits are distinct', async () => {
  const source = await read('assets/audio.js');
  assert.match(source, /offset \+= 0\.24/);
  assert.match(source, /playDamageEffect\(now \+ offset\)/);
});
test('new fanfare is referenced and precached for offline play', async () => {
  const [audio,sw] = await Promise.all([read('assets/audio.js'),read('sw.js')]);
  assert.match(audio, /level-up-fanfare-v3\.wav/);
  assert.match(sw, /audio\/level-up-fanfare-v3\.wav/);
});
test('level-up WAV has a valid PCM header and mono 16-bit format', async () => {
  const wav = await readFile(new URL('audio/level-up-fanfare-v3.wav', root));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(20), 1);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt16LE(34), 16);
});
test('level-up and damage cues can both play on the same turn', async () => {
  const source = await read('assets/main.js');
  assert.match(source, /effectSequence\(\['level', \.\.\.damageCues\]\)/);
});
test('release versions and save schema are consistent', async () => {
  const [main,manifest,sw,engine] = await Promise.all([read('assets/main.js'),read('manifest.webmanifest'),read('sw.js'),read('assets/engine.js')]);
  assert.match(main, /APP_VERSION = '4\.9\.1'/);
  assert.match(manifest, /"version": "4\.9\.1"/);
  assert.match(sw, /sou-watari-tabiroku-v4-9-0/);
  assert.match(engine, /schemaVersion: 11/);
});
