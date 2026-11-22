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

  assert.ok(tones.length >= 25, 'the monster cue should layer the lead, harmonics, chord beds, and a finish');
  assert.equal(tones[0][4], 'square', 'the lead should have a bright, defined waveform distinct from the player');
  assert.ok(tones.some((tone) => tone[4] === 'triangle'), 'chord beds should give the phrase body');
  assert.ok(tones.some((tone) => tone[4] === 'sine'), 'a bell-like finish should distinguish the cue');
  const lastEnd = Math.max(...tones.map((tone) => tone[1] + tone[2]));
  assert.ok(lastEnd - 10.018 >= 2.1 && lastEnd - 10.018 <= 2.25,
    'the monster fanfare should last about 2.2 seconds, not end abruptly');
  const leadStarts = tones.filter((tone) => tone[4] === 'square').map((tone) => tone[1]);
  assert.ok(leadStarts[1] - leadStarts[0] <= 0.20, 'the monster melody should use a brisker note pulse');
  assert.ok(leadStarts.at(-1) < 10.018 + 1.8, 'the main melody should keep moving rather than stretch out');
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
