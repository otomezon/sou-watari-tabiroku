import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundManager } from '../assets/audio.js';

test('monster level-up has a distinct, full-bodied phrase around 2.2 seconds long', () => {
  const sound = new SoundManager();
  sound.context = { currentTime: 10, state: 'running' };
  sound.sfxGain = {};
  const tones = [];
  sound.playFanfareTone = (...args) => tones.push(args);

  sound.playMonsterLevelUpFanfare(10);

  assert.equal(tones.length, 28, 'the monster cue should layer lead, harmonics, chord beds, and a finish');
  assert.equal(tones[0][4], 'square', 'the lead should have a bright, defined waveform distinct from the player');
  assert.ok(tones.some((tone) => tone[4] === 'triangle'), 'chord beds should give the phrase body');
  assert.ok(tones.some((tone) => tone[4] === 'sine'), 'a bell-like finish should distinguish the cue');
  const lastEnd = Math.max(...tones.map((tone) => tone[1] + tone[2]));
  assert.ok(lastEnd - 10.018 >= 2.1 && lastEnd - 10.018 <= 2.25,
    'the monster fanfare should last about 2.2 seconds, not end abruptly');

  const leadStarts = tones.filter((tone) => tone[4] === 'square').map((tone) => tone[1]);
  const averageLeadGap = leadStarts.slice(1).reduce((sum, time, index) => sum + time - leadStarts[index], 0) /
    (leadStarts.length - 1);
  assert.ok(averageLeadGap <= 0.185, 'the monster melody should have a brisker note pulse');
});

test('monster fanfare is shorter and faster than the unchanged player fanfare', () => {
  const sound = new SoundManager();
  sound.context = { currentTime: 20, state: 'running' };
  sound.sfxGain = {};
  const monsterTones = [];
  sound.playFanfareTone = (...args) => monsterTones.push(args);
  sound.playMonsterLevelUpFanfare(20);
  const monsterEnd = Math.max(...monsterTones.map((tone) => tone[1] + tone[2])) - 20.018;

  const playerTones = [];
  sound.playFanfareTone = (...args) => playerTones.push(args);
  sound.playLevelUpFanfare(30);
  const playerEnd = Math.max(...playerTones.map((tone) => tone[1] + tone[2])) - 30.018;

  assert.ok(monsterEnd > 2.1 && monsterEnd < playerEnd);
  assert.ok(playerEnd > 2.8 && playerEnd < 3.0, 'the player fanfare duration should remain unchanged');
});

test('consecutive monster level-ups are queued faster than the longer player fanfare', () => {
  const sound = new SoundManager();
  sound.context = { currentTime: 20, state: 'running' };
  sound.sfxGain = {};
  const monsterStarts = [];
  sound.playMonsterLevelUpFanfare = (startAt) => monsterStarts.push(startAt);
  sound.effectSequence(['monster-level', 'monster-level']);
  assert.deepEqual(monsterStarts, [20, 22.35]);

  const playerStarts = [];
  sound.playLevelUpFanfare = (startAt) => playerStarts.push(startAt);
  sound.effectSequence(['level', 'level']);
  assert.deepEqual(playerStarts, [20, 23.05]);
});

test('player and hunter level-up phrases remain on the original shared player melody', () => {
  const sound = new SoundManager();
  sound.context = { currentTime: 30, state: 'running' };
  sound.sfxGain = {};
  const calls = [];
  sound.playLevelUpFanfare = (...args) => calls.push(args);
  sound.playHunterLevelUpFanfare(31);
  assert.deepEqual(calls, [[31, -2]]);
});
