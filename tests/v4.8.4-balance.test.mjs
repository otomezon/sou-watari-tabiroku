import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FOOD_HUNGER_MULTIPLIER, POTION_HP_MULTIPLIER, getItemRecovery, itemDescription, getMonsterTierBlend } from '../assets/balance.mjs';
const root = new URL('../', import.meta.url);
const readProjectFile = (path) => readFile(new URL(path, root), 'utf8');
test('food recovery is multiplied by 1.25 with nearest-integer rounding', () => {
 assert.equal(FOOD_HUNGER_MULTIPLIER,1.25);
 assert.deepEqual(getItemRecovery({kind:'food',hungerRestore:26}),{heal:0,hungerRestore:33});
 assert.deepEqual(getItemRecovery({kind:'food',hungerRestore:38}),{heal:0,hungerRestore:48});
 assert.deepEqual(getItemRecovery({kind:'food',hungerRestore:90}),{heal:0,hungerRestore:113});
});
test('potion HP recovery is multiplied by 1.75', () => {
 assert.equal(POTION_HP_MULTIPLIER,1.75);
 assert.deepEqual(getItemRecovery({kind:'potion',heal:8,hungerRestore:3}),{heal:14,hungerRestore:3});
 assert.deepEqual(getItemRecovery({kind:'potion',heal:15,hungerRestore:3}),{heal:26,hungerRestore:3});
 assert.deepEqual(getItemRecovery({kind:'potion',heal:125,hungerRestore:8}),{heal:219,hungerRestore:8});
});
test('potion secondary hunger recovery stays unchanged',()=>{
 assert.equal(getItemRecovery({kind:'potion',heal:40,hungerRestore:14}).hungerRestore,14);
});
test('item descriptions show the effective healing amount',()=>{
 assert.equal(itemDescription({kind:'food',hungerRestore:26}),'満腹度を33回復');
 assert.equal(itemDescription({kind:'potion',heal:15,hungerRestore:3}),'HPを26・満腹度を3回復');
});
test('invalid recovery inputs safely return zero',()=>{
 assert.deepEqual(getItemRecovery({kind:'food',hungerRestore:-3}),{heal:0,hungerRestore:0});
 assert.deepEqual(getItemRecovery({kind:'potion',heal:Number.NaN,hungerRestore:Infinity}),{heal:0,hungerRestore:0});
});
test('tier blend starts at the lowest tier and reaches the highest tier',()=>{
 assert.deepEqual(getMonsterTierBlend(0,6),{lowerTierIndex:0,upperTierIndex:1,upperChance:0});
 assert.deepEqual(getMonsterTierBlend(1,6),{lowerTierIndex:5,upperTierIndex:5,upperChance:0});
});
test('tier blend uses smoothstep midpoint weight',()=>{
 assert.deepEqual(getMonsterTierBlend(0.625,5),{lowerTierIndex:2,upperTierIndex:3,upperChance:0.5});
});
test('tier blend probability progresses monotonically and remains bounded',()=>{
 const rows=Array.from({length:101},(_,i)=>getMonsterTierBlend(i/100,6));
 const positions=rows.map(x=>x.lowerTierIndex+x.upperChance);
 for(let i=1;i<positions.length;i++) assert.ok(positions[i]>=positions[i-1]);
 for(const x of rows) assert.ok(x.upperChance>=0&&x.upperChance<=1);
});
test('tier blend handles single tier and invalid arguments',()=>{
 assert.deepEqual(getMonsterTierBlend(0.8,1),{lowerTierIndex:0,upperTierIndex:0,upperChance:0});
 assert.deepEqual(getMonsterTierBlend(Number.NaN,Number.NaN),{lowerTierIndex:0,upperTierIndex:0,upperChance:0});
});
test('floor loot weights increase equipment and decrease potions',async()=>{
 const s=await readProjectFile('assets/modes.js');
 assert.match(s,/equipmentWeight: 0\.19, foodWeight: 0\.40, potionWeight: 0\.41/);
 assert.match(s,/equipmentWeight: 0\.18, foodWeight: 0\.39, potionWeight: 0\.43/);
 assert.match(s,/equipmentWeight: 0\.20, foodWeight: 0\.34, potionWeight: 0\.46/);
});
test('regular monster drops increase equipment and decrease potions',async()=>{
 const s=await readProjectFile('assets/modes.js');
 assert.match(s,/enemyDropEquipment: 0\.011, enemyDropPotion: 0\.030/);
 assert.match(s,/enemyDropEquipment: 0\.012, enemyDropPotion: 0\.025/);
 assert.match(s,/enemyDropEquipment: 0\.014, enemyDropPotion: 0\.022/);
});
test('rare loot shifts one percentage point from potions to premium gear',async()=>{
 const s=await readProjectFile('assets/engine.js');
 assert.match(s,/if \(lootRoll < 0\.19\)[\s\S]*?else if \(lootRoll < 0\.26\)[\s\S]*?else if \(lootRoll < 0\.30\)/);
});
test('normal enemies use smooth adjacent-tier selection',async()=>{
 const s=await readProjectFile('assets/engine.js');
 assert.match(s,/const tierProgress = \(floor - 1\) \/ Math\.max\(1, mode\.floors - 2\)/);
  assert.match(s,/getMonsterTierBlend\(tierProgress, mode\.maxMonsterTier\)/);
 assert.match(s,/random\.chance\(tierBlend\.upperChance\)/);
});
test('fast rare variants receive lower HP, attack, defense and EXP',async()=>{
 const s=await readProjectFile('assets/engine.js');
 assert.match(s,/monster\.hp = Math\.ceil\(monster\.hp \* 1\.25\)/);
 assert.match(s,/monster\.attack = Math\.ceil\(monster\.attack \* 1\.20\)/);
 assert.match(s,/monster\.defense \+= 1/);
 assert.match(s,/monster\.exp = Math\.ceil\(monster\.exp \* 2\.3\)/);
});
test('fast boss and shopkeeper attacks are reduced',async()=>{
 const s=await readProjectFile('assets/engine.js');
 assert.match(s,/form === 'fast' \? 0\.80/);
 assert.match(s,/\) \* 0\.90\)\)/);
});
test('fast actors retain two actions each player turn',async()=>{
 const s=await readProjectFile('assets/engine.js');
 assert.match(s,/const actionCount = speed === 'fast' \? 2 : 1/);
});
test('existing inventories get updated recovery and descriptions',async()=>{
 const [e,m,i]=await Promise.all([readProjectFile('assets/engine.js'),readProjectFile('assets/main.js'),readProjectFile('assets/items.js')]);
 assert.match(e,/getItemRecovery\(item\)/);
 assert.match(m,/itemDescription\(stack\.item\)/);
 assert.match(m,/itemDescription\(entry\.item\)/);
 assert.match(m,/itemDescription\(good\.item\)/);
 assert.match(i,/export \{ getItemRecovery, itemDescription \} from "\.\/balance\.mjs"/);
});
test('release version, PWA cache and save schema remain consistent',async()=>{
 const [m,man,sw,e]=await Promise.all([readProjectFile('assets/main.js'),readProjectFile('manifest.webmanifest'),readProjectFile('sw.js'),readProjectFile('assets/engine.js')]);
 assert.match(m,/APP_VERSION = '4\.9\.3'/);
 assert.match(man,/"version": "4\.9\.3"/);
 assert.match(sw,/sou-watari-tabiroku-v4-9-3/);
 assert.match(e,/schemaVersion: 11/);
});
