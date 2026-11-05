import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=(path)=>readFile(new URL(path,root),'utf8');

test('level-up fanfare is synthesized as a three-part D-major cadence',async()=>{
 const audio=await read('assets/audio.js');
 assert.match(audio,/playLevelUpFanfare/);
 assert.match(audio,/const melody = \[/);
 assert.match(audio,/const chords = \[/);
 assert.match(audio,/G major/);
 assert.match(audio,/A major/);
 assert.match(audio,/D major/);
 assert.match(audio,/2349\.32/);
});
test('level-up fanfare no longer depends on a downloaded audio asset',async()=>{
 const audio=await read('assets/audio.js');
 const sw=await read('sw.js');
 assert.match(audio,/playLevelUpFanfare/);
 assert.doesNotMatch(audio,/level-up-fanfare-v3\.wav/);
 assert.doesNotMatch(sw,/level-up-fanfare-v3\.wav/);
});
test('service worker cache namespace is bumped for the procedural cue release',async()=>{
 const sw=await read('sw.js');
 assert.match(sw,/sou-watari-tabiroku-v4-9-2/);
 assert.doesNotMatch(sw,/level-up-fanfare-v3\.wav/);
});
test('level-up queue leaves room for the new 3-second cue',async()=>{
 const audio=await read('assets/audio.js');
 assert.match(audio,/offset \+= 3\.05/);
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
test('all app version markers and cache namespace are bumped to 4.9.2',async()=>{
 const [main,manifest,sw]=await Promise.all([read('assets/main.js'),read('manifest.webmanifest'),read('sw.js')]);
 assert.match(main,/APP_VERSION = '4\.9\.2'/);
 assert.match(manifest,/"version": "4\.9\.2"/);
 assert.match(sw,/sou-watari-tabiroku-v4-9-2/);
});
test('attack sound is kept on a killing blow and the separate defeat cue is removed',async()=>{
 const main=await read('assets/main.js');
 const audio=await read('assets/audio.js');
 assert.match(main,/const actionCues = defaultEffect === 'attack' \? \['attack'\] : \[\]/);
 assert.doesNotMatch(main,/oldMonsters|effect\('defeat'\)/);
 assert.doesNotMatch(audio,/defeat: \{/);
});
test('save schema v11 is retained',async()=>{
 const engine=await read('assets/engine.js');
 assert.match(engine,/schemaVersion: 11/);
});
