import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=(path)=>readFile(new URL(path,root),'utf8');

test('v3 fanfare is a valid short PCM WAV',async()=>{
 const wav=await readFile(new URL('audio/level-up-fanfare-v3.wav',root));
 assert.equal(wav.toString('ascii',0,4),'RIFF');
 assert.equal(wav.toString('ascii',8,12),'WAVE');
 assert.equal(wav.readUInt16LE(20),1);
 assert.equal(wav.readUInt16LE(22),1);
 assert.equal(wav.readUInt32LE(24),32000);
 assert.equal(wav.readUInt16LE(34),16);
 assert.ok(wav.readUInt32LE(40)>0);
 assert.ok(Math.abs((wav.length-44)/2/32000-1.58)<0.01);
});
test('audio manager loads the new v3 level-up asset',async()=>{
 const audio=await read('assets/audio.js');
 assert.match(audio,/level-up-fanfare-v3\.wav/);
});
test('service worker precaches the new fanfare offline',async()=>{
 const sw=await read('sw.js');
 assert.match(sw,/audio\/level-up-fanfare-v3\.wav/);
});
test('level-up queue leaves room for the new short cue',async()=>{
 const audio=await read('assets/audio.js');
 assert.match(audio,/offset \+= effect === 'level' \? 1\.75 : 3\.8/);
});
test('normal and repeated damage use one identical sound recipe',async()=>{
 const audio=await read('assets/audio.js');
 assert.match(audio,/playDamageEffect\(startAt\)/);
 assert.match(audio,/playTransientTone\(138, 62, 'triangle'/);
 assert.match(audio,/playTransientTone\(286, 126, 'square'/);
 assert.doesNotMatch(audio,/damageIndex|variation=hitIndex/);
});
test('repeated damage events are separated by 0.24 seconds',async()=>{
 const audio=await read('assets/audio.js');
 assert.match(audio,/this\.playDamageEffect\(now \+ offset\);\s*offset \+= 0\.24/);
});
test('all app version markers and cache namespace are bumped to 4.9.1',async()=>{
 const [main,manifest,sw]=await Promise.all([read('assets/main.js'),read('manifest.webmanifest'),read('sw.js')]);
 assert.match(main,/APP_VERSION = '4\.9\.1'/);
 assert.match(manifest,/"version": "4\.9\.1"/);
 assert.match(sw,/sou-watari-tabiroku-v4-9-1/);
});
test('save schema v11 is retained',async()=>{
 const engine=await read('assets/engine.js');
 assert.match(engine,/schemaVersion: 11/);
});
