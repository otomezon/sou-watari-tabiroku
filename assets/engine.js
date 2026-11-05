import { generateDungeon, isWalkable, nextPathStep, pointKey } from "./dungeon.js";
import { createFloorLoot, createItem, itemDisplayName, itemDurability, itemEnhancement } from "./items.js";
import { floorSeed, makeSeed, Random } from "./random.js";
import { getModeConfig } from "./modes.js";
import { getShopBuyPrice, getShopSellPrice } from "./shop.js";
export const MAX_HUNGER = 120;
export const HUNGER_DECAY_EVERY_ACTIONS = 4;
const FED_HP_RECOVERY_TURNS = 9;
const STARVATION_DAMAGE_TURNS = 6;
const DELTA = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};
// Six depth bands provide distinct enemy families throughout the five campaigns.
export const MONSTER_TIERS = [
    [
        { kind: 'slime', name: 'ぷるぷるスライム', hp: 12, attack: 4, defense: 0, exp: 9 },
        { kind: 'bat', name: '洞窟コウモリ', hp: 11, attack: 4, defense: 0, exp: 10 },
        { kind: 'kobold', name: 'コボルト', hp: 14, attack: 5, defense: 1, exp: 11 },
        { kind: 'mushroom', name: '胞子キノコ', hp: 13, attack: 4, defense: 1, exp: 10 },
        { kind: 'cave-moth', name: '洞窟蛾', hp: 12, attack: 5, defense: 0, exp: 11 },
        { kind: 'cave-crab', name: '岩穴ガニ', hp: 15, attack: 4, defense: 2, exp: 11 },
        { kind: 'moss-pup', name: '苔犬', hp: 13, attack: 5, defense: 0, exp: 10 },
        { kind: 'glow-worm', name: '灯りミミズ', hp: 10, attack: 4, defense: 0, exp: 9 },
        { kind: 'stone-imp', name: '石小鬼', hp: 16, attack: 5, defense: 2, exp: 12 },
        { kind: 'root-sprite', name: '根の精', hp: 14, attack: 4, defense: 1, exp: 11 },
    ],
    [
        { kind: 'goblin', name: 'ゴブリン', hp: 12, attack: 4, defense: 1, exp: 10 },
        { kind: 'skeleton', name: 'スケルトン', hp: 14, attack: 4, defense: 1, exp: 12 },
        { kind: 'wolf', name: '洞窟オオカミ', hp: 11, attack: 4, defense: 0, exp: 11 },
        { kind: 'giant-rat', name: '大ネズミ', hp: 13, attack: 4, defense: 0, exp: 10 },
        { kind: 'sting-beetle', name: '毒針甲虫', hp: 15, attack: 5, defense: 1, exp: 13 },
        { kind: 'bone-hound', name: '骨猟犬', hp: 14, attack: 5, defense: 1, exp: 13 },
        { kind: 'bog-frog', name: '沼蛙', hp: 16, attack: 4, defense: 1, exp: 12 },
        { kind: 'goblin-guard', name: 'ゴブリン衛兵', hp: 18, attack: 5, defense: 2, exp: 15 },
        { kind: 'cave-ape', name: '洞窟猿', hp: 13, attack: 6, defense: 0, exp: 13 },
        { kind: 'copper-scorpion', name: '銅サソリ', hp: 16, attack: 5, defense: 2, exp: 14 },
    ],
    [
        { kind: 'orc', name: 'オーク', hp: 20, attack: 6, defense: 2, exp: 17 },
        { kind: 'wraith', name: 'レイス', hp: 17, attack: 5, defense: 1, exp: 18 },
        { kind: 'dark-knight', name: '闇の騎士', hp: 23, attack: 7, defense: 3, exp: 21 },
        { kind: 'giant-spider', name: '大グモ', hp: 21, attack: 7, defense: 2, exp: 20 },
        { kind: 'troll', name: '洞穴トロル', hp: 27, attack: 8, defense: 2, exp: 23 },
        { kind: 'lamia', name: '石眼ラミア', hp: 24, attack: 8, defense: 2, exp: 22 },
        { kind: 'shadow-hound', name: '影喰らい', hp: 22, attack: 9, defense: 1, exp: 24 },
        { kind: 'guardian-statue', name: '守護石像', hp: 32, attack: 7, defense: 5, exp: 24 },
        { kind: 'blood-wisp', name: '血霧の鬼火', hp: 18, attack: 9, defense: 1, exp: 25 },
        { kind: 'iron-golem', name: '鉄のゴーレム', hp: 35, attack: 8, defense: 5, exp: 27 },
    ],
    [
        { kind: 'fire-lizard', name: '火トカゲ', hp: 30, attack: 9, defense: 3, exp: 27 },
        { kind: 'ash-golem', name: '灰燼ゴーレム', hp: 39, attack: 10, defense: 5, exp: 32 },
        { kind: 'basilisk', name: 'バジリスク', hp: 33, attack: 11, defense: 3, exp: 31 },
        { kind: 'wyvern', name: 'ワイバーン', hp: 35, attack: 12, defense: 3, exp: 34 },
        { kind: 'succubus', name: '夜魔サキュバス', hp: 29, attack: 11, defense: 2, exp: 33 },
        { kind: 'salamander', name: '火蜥蜴', hp: 34, attack: 12, defense: 3, exp: 33 },
        { kind: 'crystal-gargoyle', name: '晶石ガーゴイル', hp: 38, attack: 10, defense: 6, exp: 34 },
        { kind: 'storm-harpy', name: '嵐羽ハーピー', hp: 30, attack: 13, defense: 2, exp: 35 },
        { kind: 'hellhound', name: '地獄猟犬', hp: 37, attack: 13, defense: 3, exp: 36 },
        { kind: 'ember-ent', name: '熾火の樹人', hp: 42, attack: 11, defense: 5, exp: 38 },
    ],
    [
        { kind: 'black-drake', name: '黒晶ドレイク', hp: 44, attack: 13, defense: 5, exp: 40 },
        { kind: 'abyss-reaper', name: '深淵の刈手', hp: 40, attack: 15, defense: 4, exp: 43 },
        { kind: 'cursed-paladin', name: '呪われた聖騎士', hp: 52, attack: 14, defense: 7, exp: 46 },
        { kind: 'magma-giant', name: '熔岩巨人', hp: 61, attack: 16, defense: 6, exp: 49 },
        { kind: 'phantom-lord', name: '幻影公', hp: 46, attack: 16, defense: 4, exp: 48 },
        { kind: 'frost-drake', name: '氷冠竜', hp: 56, attack: 16, defense: 7, exp: 50 },
        { kind: 'demon-general', name: '魔将', hp: 54, attack: 18, defense: 6, exp: 51 },
        { kind: 'beholder', name: '百眼の監視者', hp: 48, attack: 18, defense: 5, exp: 52 },
        { kind: 'abyss-knight', name: '深淵騎士', hp: 62, attack: 17, defense: 8, exp: 55 },
        { kind: 'corpse-eater', name: '屍喰らい', hp: 50, attack: 19, defense: 4, exp: 53 },
    ],
    [
        { kind: 'void-hydra', name: '虚空ヒュドラ', hp: 72, attack: 19, defense: 7, exp: 62 },
        { kind: 'astral-lich', name: '星骸リッチ', hp: 65, attack: 20, defense: 6, exp: 66 },
        { kind: 'calamity-beast', name: '厄災獣', hp: 83, attack: 22, defense: 8, exp: 72 },
        { kind: 'star-eater', name: '星喰らい', hp: 78, attack: 24, defense: 7, exp: 78 },
        { kind: 'ancient-warden', name: '古代の番人', hp: 96, attack: 21, defense: 10, exp: 80 },
        { kind: 'void-dragon', name: '虚空竜', hp: 104, attack: 25, defense: 10, exp: 86 },
        { kind: 'star-phoenix', name: '星炎フェニックス', hp: 78, attack: 24, defense: 8, exp: 84 },
        { kind: 'night-emperor', name: '夜天皇', hp: 110, attack: 23, defense: 12, exp: 88 },
        { kind: 'dimensional-fiend', name: '次元魔', hp: 92, attack: 27, defense: 9, exp: 90 },
        { kind: 'primal-guardian', name: '原初の守り手', hp: 122, attack: 24, defense: 13, exp: 92 },
    ],
];
export const MONSTER_CATALOG = MONSTER_TIERS.flat();
const MODE_SALT = {
    tutorial: 0x1a2b3c4d, beginner: 0x2b3c4d5e, intermediate: 0x3c4d5e6f,
    advanced: 0x4d5e6f70, expert: 0x5e6f7081,
};
export function experienceToNext(level) {
    return 18 + Math.max(0, level - 1) * 12;
}
export function createNewGame(seed = makeSeed(), modeId = 'beginner') {
    const random = new Random(seed);
    const mode = getModeConfig(modeId);
    const player = { x: 0, y: 0, hp: 34, maxHp: 34, level: 1, exp: 0, baseAttack: 5, baseDefense: 2, hunger: MAX_HUNGER };
    const equipment = { weapon: null, shield: null, armor: null };
    const state = {
        schemaVersion: 11,
        modeId,
        status: 'playing',
        seed,
        floor: 1,
        turn: 0,
        fedTurnCounter: 0,
        starvationTurnCounter: 0,
        hungerDecayCounter: 0,
        player,
        dungeon: generateDungeon(floorSeed(seed, 1, MODE_SALT[modeId])),
        monsters: [],
        groundItems: [],
        groundGold: [],
        gold: 0,
        shop: null,
        inventory: [],
        equipment,
        message: modeId === 'tutorial' ? 'はじまりの坑道へようこそ。十字キーで移動し、階段を探そう。' : `${mode.name}の探索が始まった。階段を探そう。`,
        defeatedMonsters: 0,
        startedAt: Date.now(),
        updatedAt: Date.now(),
    };
    state.player.x = state.dungeon.start.x;
    state.player.y = state.dungeon.start.y;
    populateFloor(state, random);
    return state;
}
function findBossPoint(state, reserved) {
    const rooms = state.dungeon.rooms;
    const preferredRooms = [...rooms].reverse();
    for (const room of preferredRooms) {
        const center = { x: Math.floor(room.x + room.width / 2), y: Math.floor(room.y + room.height / 2) };
        const candidates = [];
        for (let y = room.y; y < room.y + room.height; y += 1) {
            for (let x = room.x; x < room.x + room.width; x += 1) {
                const point = { x, y };
                if (isWalkable(state.dungeon.tiles, point) && !reserved.has(pointKey(point)))
                    candidates.push(point);
            }
        }
        candidates.sort((a, b) => (Math.abs(a.x - center.x) + Math.abs(a.y - center.y)) - (Math.abs(b.x - center.x) + Math.abs(b.y - center.y)));
        if (candidates[0])
            return candidates[0];
    }
    return null;
}
function createShop(state, random) {
    const mode = getModeConfig(state.modeId);
    if (state.floor === mode.floors || !random.chance(mode.shopChance))
        return null;
    const candidateRooms = state.dungeon.rooms.slice(1, -1);
    if (!candidateRooms.length)
        return null;
    const room = random.pick(candidateRooms);
    const keeper = { x: room.x + room.width - 2, y: room.y + 1 };
    const center = { x: Math.floor(room.x + room.width / 2), y: Math.floor(room.y + room.height / 2) };
    const spots = [];
    for (let y = room.y + 1; y < room.y + room.height - 1; y += 1) {
        for (let x = room.x + 1; x < room.x + room.width - 1; x += 1) {
            const point = { x, y };
            if (pointKey(point) === pointKey(keeper) || pointKey(point) === pointKey(center) || (point.x === state.dungeon.start.x && point.y === state.dungeon.start.y) || (state.dungeon.stairs && pointKey(point) === pointKey(state.dungeon.stairs)))
                continue;
            spots.push(point);
        }
    }
    if (spots.length < 4)
        return null;
    const count = random.int(4, Math.min(6, spots.length));
    const goods = [];
    for (let index = 0; index < count; index += 1) {
        const spot = spots.splice(random.int(0, spots.length - 1), 1)[0];
        const kindRoll = random.next();
        const kind = kindRoll < 0.40 ? random.pick(['weapon', 'shield', 'armor']) : kindRoll < 0.70 ? 'potion' : 'food';
        // Shop equipment is premium stock: it can draw from slightly deeper gear tiers and better +n rolls.
        const item = createItem(state.floor, random, kind, state.modeId, kind === 'weapon' || kind === 'shield' || kind === 'armor' ? 'premium' : 'normal');
        goods.push({ id: `shop-${state.floor}-${index}-${random.int(1000, 9999)}`, ...spot, item, price: getShopBuyPrice(item, state.floor), sold: false, stolen: false });
    }
    return {
        id: `shop-${state.seed}-${state.floor}`,
        bounds: { x: room.x, y: room.y, width: room.width, height: room.height },
        keeper, goods, stolenDebt: 0, selectedGoodId: null, hostile: false,
    };
}
function insideBounds(point, bounds) {
    return point.x >= bounds.x && point.y >= bounds.y && point.x < bounds.x + bounds.width && point.y < bounds.y + bounds.height;
}
function createRegularMonster(state, point, random, index, progress, template) {
    const mode = getModeConfig(state.modeId);
    const statScale = mode.difficultyScale * (1.00 + progress * 0.40);
    const hp = Math.max(1, Math.round((template.hp + Math.floor(state.floor * 0.35) + random.int(0, 2)) * statScale));
    const monster = {
        id: `f${state.floor}-m${index}-${random.int(1000, 9999)}`,
        kind: template.kind, name: template.name, x: point.x, y: point.y,
        hp, maxHp: hp,
        attack: Math.max(1, Math.round((template.attack + Math.floor(state.floor * 0.18)) * statScale)),
        defense: Math.max(0, Math.round((template.defense + Math.floor((state.floor - 1) / 7)) * statScale)),
        exp: Math.max(1, Math.round((template.exp + state.floor) * (0.8 + mode.difficultyScale * 0.2))),
        boss: false, actionSpeed: 'normal', actionProgress: 0, rareVariant: false,
    };
    const rarityRoll = random.next();
    if (rarityRoll < 0.025) {
        monster.actionSpeed = 'slow';
        monster.rareVariant = true;
        monster.name = `剛腕の${template.name}`;
        monster.hp = Math.ceil(monster.hp * 1.38);
        monster.maxHp = monster.hp;
        monster.attack = Math.ceil(monster.attack * 2.3);
        monster.defense += 3;
        monster.exp = Math.ceil(monster.exp * 2.5);
    }
    else if (rarityRoll < 0.05) {
        monster.actionSpeed = 'fast';
        monster.rareVariant = true;
        monster.name = `俊敏な${template.name}`;
        monster.hp = Math.ceil(monster.hp * 1.32);
        monster.maxHp = monster.hp;
        monster.attack = Math.ceil(monster.attack * 1.35);
        monster.defense += 2;
        monster.exp = Math.ceil(monster.exp * 2.5);
    }
    return monster;
}
function populateFloor(state, runRandom) {
    const floor = state.floor;
    const mode = getModeConfig(state.modeId);
    const random = runRandom ?? new Random(floorSeed(state.seed, floor, MODE_SALT[state.modeId]));
    const generated = state.dungeon;
    state.shop = createShop(state, random);
    state.groundGold = [];
    const reserved = new Set([pointKey(generated.start)]);
    if (generated.stairs)
        reserved.add(pointKey(generated.stairs));
    if (state.shop) {
        for (let y = state.shop.bounds.y; y < state.shop.bounds.y + state.shop.bounds.height; y += 1) {
            for (let x = state.shop.bounds.x; x < state.shop.bounds.x + state.shop.bounds.width; x += 1)
                reserved.add(`${x},${y}`);
        }
        reserved.delete(pointKey(generated.start));
        if (generated.stairs)
            reserved.add(pointKey(generated.stairs));
    }
    const occupied = new Set(reserved);
    const available = [];
    for (let y = 1; y < generated.height - 1; y += 1) {
        for (let x = 1; x < generated.width - 1; x += 1) {
            const point = { x, y };
            if (isWalkable(generated.tiles, point) && !occupied.has(pointKey(point)))
                available.push(point);
        }
    }
    const takePoint = (avoid = []) => {
        const avoidKeys = new Set(avoid.map(pointKey));
        const indices = available.filter((point) => !occupied.has(pointKey(point)) && !avoidKeys.has(pointKey(point)));
        if (!indices.length)
            return null;
        const point = indices[random.int(0, indices.length - 1)];
        occupied.add(pointKey(point));
        return point;
    };
    state.monsters = [];
    state.groundItems = [];
    if (floor === mode.floors) {
        // Boss placement never releases the stair tile from the reserved set.
        const bossPoint = findBossPoint(state, occupied) ?? takePoint();
        if (bossPoint) {
            const formRoll = random.next();
            const form = formRoll < 0.20 ? 'slow' : formRoll < 0.40 ? 'fast' : 'normal';
            const hp = Math.round(mode.bossHp * (form === 'slow' ? 1.12 : form === 'fast' ? 0.93 : 1));
            const attack = Math.ceil(mode.bossAttack * (form === 'slow' ? 1.8 : form === 'fast' ? 0.85 : 1));
            const formName = form === 'slow' ? `${mode.bossName}・剛腕形態` : form === 'fast' ? `${mode.bossName}・疾風形態` : mode.bossName;
            state.monsters.push({
                id: `boss-${state.modeId}-${state.seed}`, kind: 'boss', name: formName,
                x: bossPoint.x, y: bossPoint.y, hp, maxHp: hp, attack, defense: mode.bossDefense,
                exp: mode.bossExp, boss: true, actionSpeed: form, actionProgress: 0, rareVariant: true,
            });
            occupied.add(pointKey(bossPoint));
            const progress = 1;
            const tier = MONSTER_TIERS[mode.maxMonsterTier - 1] ?? MONSTER_TIERS[0];
            for (let index = 0; index < mode.bossFloorMonsters; index += 1) {
                const point = takePoint();
                if (!point)
                    break;
                state.monsters.push(createRegularMonster(state, point, random, index, progress, random.pick(tier)));
            }
            const supportCount = state.monsters.filter((monster) => !monster.boss).length;
            const supportMessage = supportCount > 0 ? ` 周囲には通常の魔物も${supportCount}体潜んでいる。` : '';
            state.message = form === 'slow'
                ? `最深部に到達した。${formName}が立ちはだかる！ 一撃に備えろ！${supportMessage}`
                : form === 'fast'
                    ? `最深部に到達した。${formName}が立ちはだかる！ 連続攻撃に注意！${supportMessage}`
                    : `最深部に到達した。${formName}が立ちはだかる！${supportMessage}`;
        }
    }
    else {
        const progress = mode.floors <= 1 ? 0 : (floor - 1) / (mode.floors - 1);
        const tierIndex = Math.min(mode.maxMonsterTier - 1, Math.floor(progress * mode.maxMonsterTier));
        const tier = MONSTER_TIERS[tierIndex] ?? MONSTER_TIERS[0];
        const count = random.int(mode.minMonsters, mode.maxMonsters);
        for (let index = 0; index < count; index += 1) {
            const point = takePoint();
            if (!point)
                break;
            const template = random.pick(tier);
            state.monsters.push(createRegularMonster(state, point, random, index, progress, template));
        }
        if (random.chance(mode.floorLootChance)) {
            const point = takePoint();
            if (point)
                state.groundItems.push({ ...point, item: createFloorLoot(floor, random, state.modeId) });
        }
        const tutorialHints = {
            1: '十字キーで移動。敵のいる方向へ進むと攻撃します。',
            2: 'アイテムに乗ると自動で拾います。持ち物から使用できます。',
            3: '武器・盾・防具は装備画面から交換できます。装備には耐久値があります。',
            4: '満腹度は行動で減少します。食料で回復し、0になる前に補給しましょう。',
            5: '階段の上で「降りる」を押すと次の階へ進みます。最深部にはボスがいます。',
        };
        state.message = state.modeId === 'tutorial' ? `地下 ${floor} 階。${tutorialHints[floor] ?? '探索を続けよう。'}` : `${mode.name}・地下 ${floor} 階。魔物の気配がする。`;
    }
}
export function getAttack(state) {
    const weapon = state.equipment.weapon;
    const weaponBonus = weapon && itemDurability(weapon) > 0 ? weapon.attack + itemEnhancement(weapon) : 0;
    return state.player.baseAttack + weaponBonus;
}
export function getDefense(state) {
    const shield = state.equipment.shield;
    const armor = state.equipment.armor;
    const shieldBonus = shield && itemDurability(shield) > 0 ? shield.defense + itemEnhancement(shield) : 0;
    const armorBonus = armor && itemDurability(armor) > 0 ? armor.defense + itemEnhancement(armor) : 0;
    return state.player.baseDefense + shieldBonus + armorBonus;
}
export function canDescend(state) {
    const stairs = state.dungeon.stairs;
    return state.status === 'playing' && state.floor < getModeConfig(state.modeId).floors && Boolean(stairs && stairs.x === state.player.x && stairs.y === state.player.y);
}
export class GameEngine {
    state;
    combatDamageReceived = false;
    combatHitCount = 0;
    didReceiveCombatDamage() { return this.combatDamageReceived; }
    getCombatHitCount() { return this.combatHitCount; }
    constructor(state) {
        this.state = state;
        this.relocateStairOccupants();
    }
    /** Safety net for legacy or malformed saves: monsters must never occupy stairs. */
    relocateStairOccupants() {
        const stairs = this.state.dungeon.stairs;
        if (!stairs)
            return;
        const key = pointKey(stairs);
        const occupied = new Set(this.state.monsters.filter((m) => pointKey(m) !== key).map(pointKey));
        occupied.add(pointKey(this.state.player));
        for (const monster of this.state.monsters) {
            if (pointKey(monster) !== key)
                continue;
            const candidates = [];
            for (let y = 1; y < this.state.dungeon.height - 1; y += 1) {
                for (let x = 1; x < this.state.dungeon.width - 1; x += 1) {
                    const point = { x, y };
                    if (isWalkable(this.state.dungeon.tiles, point) && pointKey(point) !== key && !occupied.has(pointKey(point)))
                        candidates.push(point);
                }
            }
            candidates.sort((a, b) => (Math.abs(a.x - stairs.x) + Math.abs(a.y - stairs.y)) - (Math.abs(b.x - stairs.x) + Math.abs(b.y - stairs.y)));
            const replacement = candidates[0];
            if (replacement) {
                monster.x = replacement.x;
                monster.y = replacement.y;
                occupied.add(pointKey(replacement));
            }
            else
                monster.hp = 0;
        }
        this.state.monsters = this.state.monsters.filter((monster) => monster.hp > 0);
    }
    move(direction) {
        if (this.state.status !== 'playing')
            return;
        const delta = DELTA[direction];
        const next = { x: this.state.player.x + delta.x, y: this.state.player.y + delta.y };
        const target = this.state.monsters.find((monster) => monster.x === next.x && monster.y === next.y);
        if (target) {
            const random = this.actionRandom();
            this.attackMonster(target, random);
            this.finishAction(random);
            return;
        }
        if (this.state.shop && !this.state.shop.hostile && pointKey(next) === pointKey(this.state.shop.keeper)) {
            this.state.message = '石翼の番商が通路を守っている。近づいて「店主」から取引しよう。';
            return;
        }
        if (!isWalkable(this.state.dungeon.tiles, next)) {
            this.state.message = '壁がある。別の道を探そう。';
            return;
        }
        this.state.player.x = next.x;
        this.state.player.y = next.y;
        this.pickupAtPlayer();
        const random = this.actionRandom();
        this.finishAction(random);
    }
    wait() {
        if (this.state.status !== 'playing')
            return;
        this.state.message = 'その場で様子をうかがった。';
        this.finishAction(this.actionRandom());
    }
    usePotion(uid) {
        const stack = this.state.inventory.find((entry) => entry.item.uid === uid && entry.item.kind === 'potion');
        return stack ? this.useItem(uid) : false;
    }
    useItem(uid) {
        if (this.state.status !== 'playing')
            return false;
        const stack = this.state.inventory.find((entry) => entry.item.uid === uid && (entry.item.kind === 'potion' || entry.item.kind === 'food'));
        if (!stack)
            return false;
        const item = stack.item;
        const hpRecovery = Math.min(item.heal, this.state.player.maxHp - this.state.player.hp);
        const hungerRecovery = Math.min(item.hungerRestore ?? 0, MAX_HUNGER - this.state.player.hunger);
        if (hpRecovery <= 0 && hungerRecovery <= 0) {
            this.state.message = item.kind === 'food' ? '満腹だ。今は食べる必要がない。' : 'HPも満腹度も十分だ。今は使う必要がない。';
            return false;
        }
        this.state.player.hp += hpRecovery;
        const hungerBeforeUse = this.state.player.hunger;
        this.state.player.hunger = Math.min(MAX_HUNGER, this.state.player.hunger + hungerRecovery);
        if (hungerRecovery > 0) {
            if (hungerBeforeUse === 0)
                this.state.fedTurnCounter = 0;
            this.state.starvationTurnCounter = 0;
        }
        this.removeOneFromStack(stack);
        const effects = [];
        if (hpRecovery > 0)
            effects.push(`HPが${hpRecovery}回復`);
        if (hungerRecovery > 0)
            effects.push(`満腹度が${hungerRecovery}回復`);
        this.state.message = `${item.name}を${item.kind === 'food' ? '食べた' : '使った'}。${effects.join('、')}。`;
        this.finishAction(this.actionRandom());
        return true;
    }
    equip(uid) {
        if (this.state.status !== 'playing')
            return false;
        const index = this.state.inventory.findIndex((entry) => entry.item.uid === uid);
        if (index < 0)
            return false;
        const entry = this.state.inventory[index];
        const slot = entry.item.kind;
        if (slot !== 'weapon' && slot !== 'shield' && slot !== 'armor')
            return false;
        const old = this.state.equipment[slot];
        this.state.equipment[slot] = entry.item;
        this.removeOneFromStack(entry);
        if (old)
            this.addInventory(old);
        this.state.message = `${entry.item.name}を装備した。`;
        this.finishAction(this.actionRandom());
        return true;
    }
    unequip(slot) {
        if (this.state.status !== 'playing')
            return false;
        const item = this.state.equipment[slot];
        if (!item)
            return false;
        this.state.equipment[slot] = null;
        this.addInventory(item);
        this.state.message = `${item.name}を外した。`;
        this.finishAction(this.actionRandom());
        return true;
    }
    canTalkToShopkeeper() {
        const shop = this.state.shop;
        if (!shop || shop.hostile || this.state.status !== 'playing')
            return false;
        return insideBounds(this.state.player, shop.bounds);
    }
    /** Legacy direct-buy API retained for compatibility; the shop UI uses pickup + selected purchase. */
    buyShopGood(goodId) {
        const shop = this.state.shop;
        if (!this.canTalkToShopkeeper() || !shop)
            return false;
        const good = shop.goods.find((entry) => entry.id === goodId && !entry.sold && !entry.stolen);
        if (!good)
            return false;
        if (this.state.gold < good.price) {
            this.state.message = `所持金が足りない。必要額は${good.price}G。`;
            return false;
        }
        this.state.gold -= good.price;
        good.sold = true;
        this.addInventory(good.item);
        this.state.message = `${itemDisplayName(good.item)}を${good.price}Gで購入した。`;
        this.state.updatedAt = Date.now();
        return true;
    }
    /** Pick up an item first; it enters the inventory as an unpaid shop item. */
    pickUpShopGood(goodId) {
        const shop = this.state.shop;
        if (!this.canTalkToShopkeeper() || !shop)
            return false;
        const good = shop.goods.find((entry) => entry.id === goodId && !entry.sold && !entry.stolen);
        if (!good)
            return false;
        good.stolen = true;
        shop.stolenDebt += good.price;
        shop.selectedGoodId = good.id;
        this.addInventory(good.item);
        this.state.message = `${itemDisplayName(good.item)}を手に取った。購入するまでは未払い扱いになる。`;
        this.state.updatedAt = Date.now();
        return true;
    }
    /** Backward-compatible method name for saves/tests created before the pickup UI. */
    stealShopGood(goodId) {
        return this.pickUpShopGood(goodId);
    }
    selectUnpaidShopGood(goodId) {
        const shop = this.state.shop;
        if (!this.canTalkToShopkeeper() || !shop)
            return false;
        const good = shop.goods.find((entry) => entry.id === goodId && entry.stolen && !entry.sold);
        if (!good)
            return false;
        shop.selectedGoodId = good.id;
        this.state.message = `${itemDisplayName(good.item)}を購入対象に選んだ。`;
        this.state.updatedAt = Date.now();
        return true;
    }
    /** Pay only for the currently selected picked-up item. */
    buySelectedShopGood() {
        const shop = this.state.shop;
        if (!this.canTalkToShopkeeper() || !shop || !shop.selectedGoodId)
            return false;
        const good = shop.goods.find((entry) => entry.id === shop.selectedGoodId && entry.stolen && !entry.sold);
        if (!good) {
            shop.selectedGoodId = null;
            return false;
        }
        if (this.state.gold < good.price) {
            this.state.message = `所持金が足りない。${itemDisplayName(good.item)}の購入には${good.price}G必要。`;
            return false;
        }
        this.state.gold -= good.price;
        shop.stolenDebt = Math.max(0, shop.stolenDebt - good.price);
        good.stolen = false;
        good.sold = true;
        shop.selectedGoodId = null;
        this.state.message = `${itemDisplayName(good.item)}を${good.price}Gで購入した。`;
        this.state.updatedAt = Date.now();
        return true;
    }
    sellInventoryItem(uid) {
        if (!this.canTalkToShopkeeper())
            return false;
        const stack = this.state.inventory.find((entry) => entry.item.uid === uid);
        if (!stack)
            return false;
        const price = getShopSellPrice(stack.item, this.state.floor);
        this.removeOneFromStack(stack);
        this.state.gold = Math.min(20_000_000, this.state.gold + price);
        this.state.message = `${itemDisplayName(stack.item)}を${price}Gで売却した。`;
        this.state.updatedAt = Date.now();
        return true;
    }
    payShopDebt() {
        const shop = this.state.shop;
        if (!this.canTalkToShopkeeper() || !shop || shop.stolenDebt <= 0)
            return false;
        if (this.state.gold < shop.stolenDebt) {
            this.state.message = `未払い${shop.stolenDebt}Gを支払うには所持金が足りない。`;
            return false;
        }
        this.state.gold -= shop.stolenDebt;
        shop.stolenDebt = 0;
        for (const good of shop.goods) {
            if (!good.stolen || good.sold)
                continue;
            good.stolen = false;
            good.sold = true;
        }
        shop.selectedGoodId = null;
        this.state.message = '未払いをまとめて精算した。店主は怒りを収めた。';
        this.state.updatedAt = Date.now();
        return true;
    }
    activateShopkeeperIfStolen() {
        const shop = this.state.shop;
        if (!shop || shop.hostile || shop.stolenDebt <= 0 || insideBounds(this.state.player, shop.bounds))
            return;
        shop.hostile = true;
        let keeperPoint = { ...shop.keeper };
        const occupied = new Set(this.state.monsters.map(pointKey));
        if (occupied.has(pointKey(keeperPoint)) || pointKey(keeperPoint) === pointKey(this.state.player)) {
            const options = [];
            for (let y = shop.bounds.y + 1; y < shop.bounds.y + shop.bounds.height - 1; y += 1) {
                for (let x = shop.bounds.x + 1; x < shop.bounds.x + shop.bounds.width - 1; x += 1) {
                    const point = { x, y };
                    const shopGoodPositions = new Set(shop.goods.map(pointKey));
                    if (isWalkable(this.state.dungeon.tiles, point) && !occupied.has(pointKey(point)) && !shopGoodPositions.has(pointKey(point)) && pointKey(point) !== pointKey(this.state.player))
                        options.push(point);
                }
            }
            keeperPoint = options[0] ?? keeperPoint;
        }
        const hp = 420;
        this.state.monsters.push({
            id: `stonewing-keeper-${shop.id}`, kind: 'stonewing-keeper', name: '石翼の番商',
            x: keeperPoint.x, y: keeperPoint.y, hp, maxHp: hp,
            attack: 14 + Math.floor(this.state.floor * 1.1) + Math.round(getModeConfig(this.state.modeId).difficultyScale * 2),
            defense: 4 + Math.floor(this.state.floor * 0.12), exp: 0, boss: false,
            actionSpeed: 'fast', actionProgress: 0, rareVariant: true, shopkeeper: true,
        });
        this.state.message = '未払いの商品を持って店の外へ出た！ 石翼の番商が怒り、追ってくる！';
    }
    descend() {
        if (!canDescend(this.state) || this.state.floor >= getModeConfig(this.state.modeId).floors)
            return false;
        this.state.floor += 1;
        // The run-wide turn counter and hunger cycles persist across floors.
        this.state.dungeon = generateDungeon(floorSeed(this.state.seed, this.state.floor, MODE_SALT[this.state.modeId]));
        this.state.player.x = this.state.dungeon.start.x;
        this.state.player.y = this.state.dungeon.start.y;
        populateFloor(this.state);
        this.state.updatedAt = Date.now();
        return true;
    }
    actionRandom() {
        const mixed = (this.state.seed ^ Math.imul(this.state.floor + 1, 0x9e3779b1) ^ Math.imul(this.state.turn + 1, 0x85ebca6b)) >>> 0;
        return new Random(mixed);
    }
    finishAction(random) {
        if (this.state.status !== 'playing')
            return;
        this.combatDamageReceived = false;
        this.combatHitCount = 0;
        this.activateShopkeeperIfStolen();
        this.enemyPhase(random);
        this.state.turn += 1;
        this.tickHunger();
        this.state.updatedAt = Date.now();
        if (this.state.player.hp <= 0)
            this.handleGameOver();
    }
    tickHunger() {
        const player = this.state.player;
        if (player.hunger > 0) {
            this.state.fedTurnCounter += 1;
            this.state.starvationTurnCounter = 0;
            this.state.hungerDecayCounter += 1;
            if (this.state.hungerDecayCounter >= HUNGER_DECAY_EVERY_ACTIONS) {
                this.state.hungerDecayCounter = 0;
                player.hunger = Math.max(0, player.hunger - 1);
            }
            if (this.state.fedTurnCounter >= FED_HP_RECOVERY_TURNS) {
                this.state.fedTurnCounter = 0;
                if (player.hp > 0 && player.hp < player.maxHp) {
                    player.hp += 1;
                }
            }
            return;
        }
        this.state.fedTurnCounter = 0;
        this.state.hungerDecayCounter = 0;
        this.state.starvationTurnCounter += 1;
        if (this.state.starvationTurnCounter >= STARVATION_DAMAGE_TURNS) {
            this.state.starvationTurnCounter = 0;
            player.hp = Math.max(0, player.hp - 1);
        }
    }
    attackMonster(monster, random) {
        const damage = Math.max(1, getAttack(this.state) + random.int(-1, 2) - monster.defense);
        monster.hp -= damage;
        this.state.message = `${monster.name}に ${damage} ダメージ！`;
        const weaponBreak = this.wearEquipment('weapon');
        if (weaponBreak)
            this.state.message += ` ${weaponBreak}`;
        if (monster.hp > 0)
            return;
        this.state.monsters = this.state.monsters.filter((entry) => entry.id !== monster.id);
        if (monster.shopkeeper) {
            if (this.state.shop)
                this.state.shop.hostile = true;
            this.state.message = '石翼の番商を退けた。店は閉ざされ、商品はもう手に入らない。';
            return;
        }
        this.state.defeatedMonsters += 1;
        this.state.player.exp += monster.exp;
        this.state.message = `${monster.name}を倒した！ EXP +${monster.exp}`;
        if (weaponBreak)
            this.state.message += ` ${weaponBreak}`;
        if (monster.boss) {
            this.state.status = 'clear';
            this.state.message = `${monster.name}を倒した！ ${getModeConfig(this.state.modeId).name}を踏破した！`;
            this.state.updatedAt = Date.now();
            return;
        }
        this.checkLevelUp();
        const lootRoll = random.next();
        const drops = getModeConfig(this.state.modeId);
        if (monster.rareVariant) {
            // Rare action-speed monsters are tougher encounters and have a premium loot table.
            let drop = null;
            if (lootRoll < 0.28)
                drop = createItem(this.state.floor, random, random.pick(['weapon', 'shield', 'armor']), this.state.modeId, 'premium');
            else if (lootRoll < 0.38)
                drop = createItem(this.state.floor, random, 'valuable', this.state.modeId, 'premium');
            else if (lootRoll < 0.45)
                drop = createItem(this.state.floor, random, 'potion', this.state.modeId, 'premium');
            else if (lootRoll < 0.50)
                drop = createItem(this.state.floor, random, 'food', this.state.modeId, 'premium');
            if (drop) {
                this.state.groundItems.push({ x: monster.x, y: monster.y, item: drop });
                this.state.message += ` 希少な戦利品 ${itemDisplayName(drop)}を落とした。`;
            }
        }
        else if (lootRoll < drops.enemyDropEquipment) {
            const gearKind = random.pick(['weapon', 'shield', 'armor']);
            const drop = createItem(this.state.floor, random, gearKind, this.state.modeId);
            this.state.groundItems.push({ x: monster.x, y: monster.y, item: drop });
            this.state.message += ` ${itemDisplayName(drop)}を落とした。`;
        }
        else if (lootRoll < drops.enemyDropEquipment + drops.enemyDropValuable) {
            const drop = createItem(this.state.floor, random, 'valuable', this.state.modeId);
            this.state.groundItems.push({ x: monster.x, y: monster.y, item: drop });
            this.state.message += `換金品 ${drop.name}を落とした。`;
        }
        else if (lootRoll < drops.enemyDropEquipment + drops.enemyDropValuable + drops.enemyDropPotion) {
            const drop = createItem(this.state.floor, random, 'potion', this.state.modeId);
            this.state.groundItems.push({ x: monster.x, y: monster.y, item: drop });
            this.state.message += ` ${drop.name}を落とした。`;
        }
        else if (lootRoll < drops.enemyDropEquipment + drops.enemyDropValuable + drops.enemyDropPotion + drops.enemyDropFood) {
            const drop = createItem(this.state.floor, random, 'food', this.state.modeId);
            this.state.groundItems.push({ x: monster.x, y: monster.y, item: drop });
            this.state.message += ` ${drop.name}を落とした。`;
        }
        if (random.chance(monster.rareVariant ? Math.min(0.80, drops.enemyDropGold * 3.5) : drops.enemyDropGold)) {
            const goldBase = random.int(15 + this.state.floor * 4, 35 + this.state.floor * 8);
            const amount = monster.rareVariant ? goldBase * 3 : goldBase;
            const existing = this.state.groundGold.find((entry) => entry.x === monster.x && entry.y === monster.y);
            if (existing)
                existing.amount += amount;
            else
                this.state.groundGold.push({ x: monster.x, y: monster.y, amount });
            this.state.message += ` ${amount}Gを落とした。`;
        }
    }
    enemyPhase(random) {
        for (const monster of [...this.state.monsters]) {
            if (monster.hp <= 0 || this.state.status !== 'playing')
                continue;
            if (this.state.player.hp <= 0)
                break;
            const speed = monster.actionSpeed ?? 'normal';
            if (speed === 'slow') {
                monster.actionProgress = (monster.actionProgress ?? 0) + 1;
                if (monster.actionProgress < 2)
                    continue;
                monster.actionProgress = 0;
                this.performMonsterAction(monster, random);
            }
            else {
                monster.actionProgress = 0;
                const actionCount = speed === 'fast' ? 2 : 1;
                for (let action = 0; action < actionCount; action += 1) {
                    if (this.state.status !== 'playing' || this.state.player.hp <= 0)
                        break;
                    this.performMonsterAction(monster, random);
                }
            }
        }
    }
    performMonsterAction(monster, random) {
        const distance = Math.abs(monster.x - this.state.player.x) + Math.abs(monster.y - this.state.player.y);
        if (distance === 1) {
            const damage = Math.max(1, monster.attack + random.int(-1, 1) - getDefense(this.state));
            this.state.player.hp = Math.max(0, this.state.player.hp - damage);
            this.combatDamageReceived = true;
            this.combatHitCount += 1;
            const broken = [];
            const shieldBreak = this.wearEquipment('shield');
            const armorBreak = this.wearEquipment('armor');
            if (shieldBreak)
                broken.push(shieldBreak);
            if (armorBreak)
                broken.push(armorBreak);
            const speedLabel = monster.actionSpeed === 'fast' ? '（連続攻撃）' : '';
            this.state.message = `${this.state.message} ${monster.name}の攻撃${speedLabel}！ ${damage} ダメージを受けた。${broken.length ? ` ${broken.join(' ')}` : ''}`.slice(0, 480);
            return;
        }
        if (distance > 14)
            return;
        const blocked = new Set(this.state.monsters.filter((other) => other.id !== monster.id).map(pointKey));
        const stairs = this.state.dungeon.stairs;
        // Stairs are reserved for the player. A chasing monster must never path onto them.
        // If the player is currently standing on the stairs, keep the target reachable so
        // enemies can still close in and attack from an adjacent tile, but never occupy it.
        if (stairs && (stairs.x !== this.state.player.x || stairs.y !== this.state.player.y)) {
            blocked.add(pointKey(stairs));
        }
        const step = nextPathStep(this.state.dungeon.tiles, monster, this.state.player, blocked);
        if (step) {
            monster.x = step.x;
            monster.y = step.y;
        }
    }
    wearEquipment(slot) {
        const item = this.state.equipment[slot];
        if (!item)
            return null;
        // Old v1 saves had no durability data; initialize them as serviceable gear.
        if (item.maxDurability === undefined) {
            const baseStat = item.attack || item.defense || 0;
            item.maxDurability = 100 + baseStat * 7 + itemEnhancement(item) * 12;
        }
        if (item.durability === undefined)
            item.durability = item.maxDurability;
        item.durability = Math.max(0, itemDurability(item) - 1);
        if (item.durability > 0)
            return null;
        this.state.equipment[slot] = null;
        return `${itemDisplayName(item)}が壊れてしまった！`;
    }
    pickupAtPlayer() {
        const goldIndex = this.state.groundGold.findIndex((entry) => entry.x === this.state.player.x && entry.y === this.state.player.y);
        let pickedMessage = '';
        if (goldIndex >= 0) {
            const [gold] = this.state.groundGold.splice(goldIndex, 1);
            this.state.gold = Math.min(20_000_000, this.state.gold + gold.amount);
            pickedMessage = `${gold.amount}Gを拾った。`;
        }
        const index = this.state.groundItems.findIndex((entry) => entry.x === this.state.player.x && entry.y === this.state.player.y);
        if (index >= 0) {
            const [ground] = this.state.groundItems.splice(index, 1);
            this.addInventory(ground.item);
            pickedMessage = `${pickedMessage ? `${pickedMessage} ` : ''}${ground.item.name}を拾った。`;
        }
        if (pickedMessage)
            this.state.message = pickedMessage;
    }
    addInventory(item) {
        const canStack = item.kind === 'potion' || item.kind === 'food' || item.kind === 'valuable';
        const existing = canStack ? this.state.inventory.find((entry) => entry.item.templateId === item.templateId) : undefined;
        if (existing)
            existing.count += 1;
        else
            this.state.inventory.push({ item, count: 1 });
    }
    removeOneFromStack(stack) {
        stack.count -= 1;
        if (stack.count <= 0)
            this.state.inventory = this.state.inventory.filter((entry) => entry !== stack);
    }
    checkLevelUp() {
        let leveled = false;
        while (this.state.player.exp >= experienceToNext(this.state.player.level)) {
            this.state.player.exp -= experienceToNext(this.state.player.level);
            this.state.player.level += 1;
            this.state.player.maxHp += 6;
            this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 6);
            this.state.player.baseAttack += 1;
            this.state.player.baseDefense += this.state.player.level % 2 === 0 ? 1 : 0;
            leveled = true;
        }
        if (leveled)
            this.state.message += ` レベルアップ！ Lv.${this.state.player.level}になった。`;
    }
    handleGameOver() {
        this.state.player.hp = 0;
        this.state.player.level = 1;
        this.state.player.exp = 0;
        this.state.player.maxHp = 34;
        this.state.player.baseAttack = 5;
        this.state.player.baseDefense = 2;
        this.state.inventory = [];
        this.state.gold = 0;
        this.state.groundGold = [];
        this.state.shop = null;
        this.state.equipment = { weapon: null, shield: null, armor: null };
        this.state.status = 'gameover';
        this.state.message = '力尽きた……。持ち物と装備をすべて失った。';
        this.state.updatedAt = Date.now();
    }
}
export function createFreshRun(modeId = 'beginner') {
    return createNewGame(makeSeed(), modeId);
}
export function itemSlotName(kind) {
    return kind === 'weapon' ? '武器' : kind === 'shield' ? '盾' : kind === 'armor' ? '防具' : kind === 'food' ? '食料' : '回復薬';
}
