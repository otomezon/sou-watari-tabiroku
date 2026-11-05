import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getEnemyLevel } from '../assets/enemy-level.mjs';

const root = new URL('../', import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, root), 'utf8');

test('Tier 1 slime starts at Lv1 using max HP and combat stats', () => {
    assert.equal(getEnemyLevel({ hp: 12, maxHp: 12, attack: 4, defense: 0 }), 1);
});

test('stronger defense and attack increase the derived level', () => {
    const base = getEnemyLevel({ maxHp: 12, attack: 4, defense: 0 });
    assert.equal(getEnemyLevel({ maxHp: 16, attack: 5, defense: 2 }), 2);
    assert.ok(getEnemyLevel({ maxHp: 30, attack: 10, defense: 4 }) > base);
});

test('level remains stable when current HP changes during combat', () => {
    const before = getEnemyLevel({ hp: 35, maxHp: 80, attack: 12, defense: 3 });
    const after = getEnemyLevel({ hp: 1, maxHp: 80, attack: 12, defense: 3 });
    assert.equal(before, after);
});

test('slow rare form uses post-modifier HP, attack, and defense', () => {
    const normal = getEnemyLevel({ maxHp: 12, attack: 4, defense: 0 });
    const slow = getEnemyLevel({ maxHp: 17, attack: 10, defense: 3 });
    assert.ok(slow > normal);
});

test('fast rare form uses post-modifier stats without a separate speed multiplier', () => {
    assert.equal(getEnemyLevel({ maxHp: 16, attack: 6, defense: 2 }), 2);
});

test('boss stats produce higher levels across campaign difficulty', () => {
    const tutorialBoss = getEnemyLevel({ maxHp: 82, attack: 10, defense: 2 });
    const expertBoss = getEnemyLevel({ maxHp: 640, attack: 38, defense: 12 });
    assert.equal(tutorialBoss, 4);
    assert.equal(expertBoss, 25);
    assert.ok(expertBoss > tutorialBoss);
});

test('missing or invalid stats safely resolve to at least Lv1', () => {
    assert.equal(getEnemyLevel({}), 1);
    assert.equal(getEnemyLevel({ maxHp: Number.NaN, hp: -2, attack: Infinity, defense: null }), 1);
});

test('renderer draws the level badge beside the preserved rare-speed marker', async () => {
    const renderer = await readProjectFile('assets/renderer.js');
    assert.match(renderer, /import \{ getEnemyLevel \} from "\.\/enemy-level\.mjs"/);
    assert.match(renderer, /getEnemyLevel\(monster\)/);
    assert.match(renderer, /ctx\.fillRect\(x \+ 1, y \+ 23, levelBadgeWidth, 9\)/);
    assert.match(renderer, /speed === 'fast' \? 'Ⅱ' : speed === 'slow' \? '½' : '★'/);
});

test('canvas help text explains level and speed marks accessibly', async () => {
    const html = await readProjectFile('index.html');
    assert.match(html, /Lv＝敵の能力値目安/);
    assert.match(html, /敵には能力値から算出したレベルが表示され/);
});

test('all release version identifiers and cache namespace are bumped', async () => {
    const [main, manifest, sw] = await Promise.all([
        readProjectFile('assets/main.js'),
        readProjectFile('manifest.webmanifest'),
        readProjectFile('sw.js'),
    ]);
    assert.match(main, /APP_VERSION = '4\.8\.3'/);
    assert.match(manifest, /"version": "4\.8\.3"/);
    assert.match(sw, /sou-watari-tabiroku-v4-8-3/);
});
