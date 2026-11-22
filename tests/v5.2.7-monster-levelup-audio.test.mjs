import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundManager } from '../assets/audio.js';

test('monster level-up has a distinct bright phrase under half the player cue duration', () => {
  const sound = new SoundManager();
  sound.context = { currentTime: 10, state: 'running' };
  sound.sfxGain = {};
  const tones = [];
  sound.playFanfareTone = (...args) => tones.push(args);

  sound.playMonsterLevelUpFanfare(10);

  assert.ok(tones.length >= 10, 'the monster cue should layer a clear lead, harmonic accents, and a finish');
  assert.equal(tones[0][4], 'square', 'the lead should use a bright, defined waveform');
  assert.ok(tones.some((tone) => tone[4] === 'triangle'), 'upper harmonics should add definition');
  assert.ok(tones.some((tone) => tone[4] === 'sine'), 'a bell-like finish should distinguish the cue');
  const lastEnd = Math.max(...tones.map((tone) => tone[1] + tone[2]));
  assert.ok(lastEnd - 10.018 <= 1.23, 'the monster fanfare should finish in about 1.2 seconds');
});

test('consecutive monster level-ups are queued much faster than player level-ups', () => {
  const sound = new SoundManager();
  sound.context = { currentTime: 20, state: 'running' };
  sound.sfxGain = {};
  const monsterStarts = [];
  sound.playMonsterLevelUpFanfare = (startAt) => monsterStarts.push(startAt);
  sound.effectSequence(['monster-level', 'monster-level']);
  assert.deepEqual(monsterStarts, [20, 21.28]);

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
