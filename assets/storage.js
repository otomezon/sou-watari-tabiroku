import { isReachable, isWalkable } from "./dungeon.js";
import { getModeConfig, isDungeonModeId } from "./modes.js";
const DB_NAME = 'fushigi-dungeon-save';
const DB_VERSION = 1;
const SAVE_STORE = 'saves';
const SETTINGS_STORE = 'settings';
const SETTINGS_ID = 'audio';
export const DEFAULT_AUDIO_SETTINGS = {
    bgmVolume: 0.28,
    sfxVolume: 0.48,
    muteBgm: false,
    muteSfx: false,
};
let dbPromise = null;
function openDatabase() {
    if (!('indexedDB' in globalThis))
        return Promise.reject(new Error('このブラウザはIndexedDBに対応していません。'));
    if (dbPromise)
        return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(SAVE_STORE))
                db.createObjectStore(SAVE_STORE, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(SETTINGS_STORE))
                db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('セーブ領域を開けませんでした。'));
        request.onblocked = () => reject(new Error('別のタブがセーブ領域を使用中です。'));
    }).catch((error) => {
        dbPromise = null;
        throw error;
    });
    return dbPromise;
}
function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDBの操作に失敗しました。'));
    });
}
function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('セーブ処理に失敗しました。'));
        transaction.onabort = () => reject(transaction.error ?? new Error('セーブ処理が中断されました。'));
    });
}
export function validateGameState(value) {
    if (!value || typeof value !== 'object')
        return false;
    const state = value;
    if (state.schemaVersion !== 12 || !isDungeonModeId(state.modeId) || !['playing', 'gameover', 'clear'].includes(String(state.status)))
        return false;
    const mode = getModeConfig(state.modeId);
    if (!Number.isInteger(state.seed) || !Number.isInteger(state.floor) || state.floor < 1 || state.floor > mode.floors)
        return false;
    if (!Number.isInteger(state.turn) || state.turn < 0 || !Number.isInteger(state.fedTurnCounter) || state.fedTurnCounter < 0 || state.fedTurnCounter > 8 || !Number.isInteger(state.starvationTurnCounter) || state.starvationTurnCounter < 0 || state.starvationTurnCounter > 5 || !Number.isInteger(state.hungerDecayCounter) || state.hungerDecayCounter < 0 || state.hungerDecayCounter > 3 || !Array.isArray(state.monsters) || !Array.isArray(state.groundItems) || !Array.isArray(state.groundGold) || !Array.isArray(state.inventory) || !Number.isInteger(state.gold) || state.gold < 0 || state.gold > 20_000_000)
        return false;
    if (!state.player || !Number.isInteger(state.player.hunger) || state.player.hunger < 0 || state.player.hunger > 120 || !Number.isInteger(state.player.hp) || !Number.isInteger(state.player.maxHp) || state.player.maxHp < 30 || state.player.maxHp > 10000)
        return false;
    if (state.player.hp < 0 || state.player.hp > state.player.maxHp || !Number.isInteger(state.player.level) || state.player.level < 1 || state.player.level > 999)
        return false;
    if (!Number.isInteger(state.player.exp) || state.player.exp < 0 || !Number.isInteger(state.player.x) || !Number.isInteger(state.player.y))
        return false;
    if (!Number.isInteger(state.player.baseAttack) || state.player.baseAttack < 1 || state.player.baseAttack > 1000 || !Number.isInteger(state.player.baseDefense) || state.player.baseDefense < 0 || state.player.baseDefense > 1000)
        return false;
    if (!Number.isFinite(state.startedAt) || !Number.isFinite(state.updatedAt) || typeof state.message !== 'string' || state.message.length > 500)
        return false;
    if (state.status === 'gameover' && state.player.hp !== 0)
        return false;
    if (state.status === 'clear' && state.floor !== mode.floors)
        return false;
    if (state.status === 'gameover' && (state.inventory.length !== 0 || state.gold !== 0 || state.equipment?.weapon || state.equipment?.shield || state.equipment?.armor))
        return false;
    if (!state.dungeon || !Array.isArray(state.dungeon.tiles))
        return false;
    if (!Number.isInteger(state.dungeon.width) || !Number.isInteger(state.dungeon.height) || state.dungeon.width < 10 || state.dungeon.height < 10)
        return false;
    if (state.dungeon.tiles.length !== state.dungeon.height || state.dungeon.tiles.some((row) => !Array.isArray(row) || row.length !== state.dungeon.width || row.some((tile) => tile !== 0 && tile !== 1)))
        return false;
    if (state.player.y >= state.dungeon.height || state.player.x >= state.dungeon.width || !isWalkable(state.dungeon.tiles, state.player))
        return false;
    if (!state.dungeon.start || !Number.isInteger(state.dungeon.start.x) || !Number.isInteger(state.dungeon.start.y) || !isWalkable(state.dungeon.tiles, state.dungeon.start))
        return false;
    if (!isReachable(state.dungeon.tiles, state.dungeon.start, state.player))
        return false;
    if (!state.dungeon.stairs || !Number.isInteger(state.dungeon.stairs.x) || !Number.isInteger(state.dungeon.stairs.y) || !isWalkable(state.dungeon.tiles, state.dungeon.stairs))
        return false;
    if (!isReachable(state.dungeon.tiles, state.dungeon.start, state.dungeon.stairs))
        return false;
    if (!state.equipment || !('weapon' in state.equipment) || !('shield' in state.equipment) || !('armor' in state.equipment))
        return false;
    const validItem = (item, expectedKind) => {
        if (!item || typeof item !== 'object')
            return false;
        const entry = item;
        return typeof entry.uid === 'string' && entry.uid.length <= 120 && typeof entry.templateId === 'string' && entry.templateId.length <= 100 && typeof entry.name === 'string' && entry.name.length <= 100 &&
            ['weapon', 'shield', 'armor', 'potion', 'food', 'valuable'].includes(String(entry.kind)) && (!expectedKind || entry.kind === expectedKind) &&
            Number.isFinite(entry.attack) && Number.isFinite(entry.defense) && Number.isFinite(entry.heal) && (entry.sellValue === undefined || (Number.isInteger(entry.sellValue) && entry.sellValue >= 1 && entry.sellValue <= 1000000)) && (entry.kind !== 'valuable' || (Number.isInteger(entry.sellValue) && entry.sellValue > 0)) && (entry.hungerRestore === undefined || (Number.isFinite(entry.hungerRestore) && entry.hungerRestore >= 0 && entry.hungerRestore <= 120)) && (entry.kind !== 'food' || (Number.isInteger(entry.hungerRestore) && entry.hungerRestore > 0)) &&
            entry.attack >= 0 && entry.attack <= 1000 && entry.defense >= 0 && entry.defense <= 1000 && entry.heal >= 0 && entry.heal <= 10000 &&
            (entry.enhancement === undefined || (Number.isInteger(entry.enhancement) && entry.enhancement >= 0 && entry.enhancement <= 5)) &&
            (entry.maxDurability === undefined || (Number.isInteger(entry.maxDurability) && entry.maxDurability >= 1 && entry.maxDurability <= 600)) &&
            (entry.durability === undefined || (Number.isInteger(entry.durability) && entry.durability >= 0 && entry.durability <= (entry.maxDurability ?? 600))) &&
            typeof entry.description === 'string' && entry.description.length <= 200;
    };
    if (state.shop !== null) {
        const shop = state.shop;
        if (!shop || typeof shop.id !== 'string' || shop.id.length > 120 || !shop.bounds || !shop.keeper || !Array.isArray(shop.goods) || shop.goods.length < 4 || shop.goods.length > 6 || !Number.isInteger(shop.stolenDebt) || shop.stolenDebt < 0 || shop.stolenDebt > 10_000_000 || typeof shop.hostile !== 'boolean')
            return false;
        if (shop.selectedGoodId !== undefined && shop.selectedGoodId !== null && (typeof shop.selectedGoodId !== 'string' || !shop.goods.some((good) => good.id === shop.selectedGoodId && good.stolen && !good.sold)))
            return false;
        const bounds = shop.bounds;
        if (![bounds.x, bounds.y, bounds.width, bounds.height, shop.keeper.x, shop.keeper.y].every(Number.isInteger) || bounds.width < 5 || bounds.height < 5 || bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > state.dungeon.width || bounds.y + bounds.height > state.dungeon.height)
            return false;
        if (!isWalkable(state.dungeon.tiles, shop.keeper) || shop.keeper.x < bounds.x || shop.keeper.y < bounds.y || shop.keeper.x >= bounds.x + bounds.width || shop.keeper.y >= bounds.y + bounds.height)
            return false;
        const goodPositions = new Set();
        for (const good of shop.goods) {
            if (!good || typeof good.id !== 'string' || good.id.length > 120 || !Number.isInteger(good.x) || !Number.isInteger(good.y) || !validItem(good.item) || !Number.isInteger(good.price) || good.price < 1 || good.price > 1_000_000 || typeof good.sold !== 'boolean' || typeof good.stolen !== 'boolean')
                return false;
            if (good.x < bounds.x || good.y < bounds.y || good.x >= bounds.x + bounds.width || good.y >= bounds.y + bounds.height || !isWalkable(state.dungeon.tiles, good))
                return false;
            const key = `${good.x},${good.y}`;
            if (goodPositions.has(key) || key === `${shop.keeper.x},${shop.keeper.y}`)
                return false;
            goodPositions.add(key);
        }
    }
    if (state.equipment.weapon && !validItem(state.equipment.weapon, 'weapon'))
        return false;
    if (state.equipment.shield && !validItem(state.equipment.shield, 'shield'))
        return false;
    if (state.equipment.armor && !validItem(state.equipment.armor, 'armor'))
        return false;
    const occupied = new Set([`${state.player.x},${state.player.y}`]);
    for (const monster of state.monsters) {
        if (!monster || typeof monster.id !== 'string' || typeof monster.name !== 'string' || !Number.isInteger(monster.x) || !Number.isInteger(monster.y) || !Number.isInteger(monster.hp) || !Number.isInteger(monster.maxHp) || monster.hp <= 0 || monster.maxHp < monster.hp)
            return false;
        if (!Number.isInteger(monster.attack) || monster.attack < 0 || monster.attack > 10000 || !Number.isInteger(monster.defense) || monster.defense < 0 || monster.defense > 10000 || !Number.isInteger(monster.exp) || monster.exp < 0 || typeof monster.boss !== 'boolean')
            return false;
        if (monster.actionSpeed !== undefined && !['slow', 'normal', 'fast'].includes(monster.actionSpeed))
            return false;
        if (monster.actionProgress !== undefined && (!Number.isInteger(monster.actionProgress) || monster.actionProgress < 0 || monster.actionProgress > 1))
            return false;
        if (monster.rareVariant !== undefined && typeof monster.rareVariant !== 'boolean')
            return false;
        if (monster.hunterVariant !== undefined && typeof monster.hunterVariant !== 'boolean')
            return false;
        if (monster.hunterVariant === true && (!Number.isInteger(monster.hunterLevel) || monster.hunterLevel < 1 || monster.hunterLevel > 99))
            return false;
        if (monster.hunterVariant !== true && monster.hunterLevel !== undefined)
            return false;
        if (monster.shopkeeper !== undefined && typeof monster.shopkeeper !== 'boolean')
            return false;
        if (monster.x < 0 || monster.y < 0 || monster.x >= state.dungeon.width || monster.y >= state.dungeon.height || !isWalkable(state.dungeon.tiles, monster))
            return false;
        const key = `${monster.x},${monster.y}`;
        if (occupied.has(key))
            return false;
        occupied.add(key);
    }
    if (state.status === 'playing' && state.floor === mode.floors && state.monsters.filter((monster) => monster.boss).length !== 1)
        return false;
    if (state.status === 'playing' && state.floor < mode.floors && state.monsters.some((monster) => monster.boss))
        return false;
    if (state.dungeon.stairs && state.monsters.some((monster) => monster.x === state.dungeon.stairs.x && monster.y === state.dungeon.stairs.y))
        return false;
    for (const ground of state.groundItems) {
        if (!ground || !Number.isInteger(ground.x) || !Number.isInteger(ground.y) || !validItem(ground.item))
            return false;
        if (ground.x < 0 || ground.y < 0 || ground.x >= state.dungeon.width || ground.y >= state.dungeon.height || !isWalkable(state.dungeon.tiles, ground))
            return false;
    }
    for (const gold of state.groundGold) {
        if (!gold || !Number.isInteger(gold.x) || !Number.isInteger(gold.y) || !Number.isInteger(gold.amount) || gold.amount < 1 || gold.amount > 1_000_000)
            return false;
        if (gold.x < 0 || gold.y < 0 || gold.x >= state.dungeon.width || gold.y >= state.dungeon.height || !isWalkable(state.dungeon.tiles, gold))
            return false;
    }
    for (const stack of state.inventory) {
        if (!stack || !validItem(stack.item) || !Number.isInteger(stack.count) || stack.count <= 0 || stack.count > 100000)
            return false;
        if (stack.item.kind !== 'potion' && stack.item.kind !== 'food' && stack.item.kind !== 'valuable' && stack.count !== 1)
            return false;
    }
    return true;
}
const CURRENT_HUNGER_MAX = 120;
const MIGRATED_SATIETY = {
    potion: 3,
    'healing-potion': 3,
    'greater-potion': 4,
    'royal-potion': 5,
    elixir: 6,
    bread: 26,
    'hard-bread': 38,
    'dried-meat': 26,
    'big-bread': 54,
    'adventurer-ration': 46,
};
function migrateItem(item) {
    if (!item || typeof item !== 'object')
        return item;
    const entry = item;
    if (entry.kind === 'weapon' || entry.kind === 'shield' || entry.kind === 'armor') {
        const baseStat = Number(entry.attack || entry.defense || 0);
        const enhancement = Number(entry.enhancement || 0);
        const maxDurability = Number(entry.maxDurability) || Math.min(600, 100 + baseStat * 7 + enhancement * 12);
        return { ...entry, maxDurability, durability: Number.isInteger(entry.durability) ? entry.durability : maxDurability };
    }
    const satiety = MIGRATED_SATIETY[String(entry.templateId)];
    if (satiety === undefined || (entry.kind !== 'food' && entry.kind !== 'potion'))
        return entry;
    const description = entry.kind === 'food'
        ? `満腹度を${satiety}回復`
        : `HPを${Number(entry.heal) || 0}・満腹度を${satiety}回復`;
    return { ...entry, hungerRestore: satiety, description };
}
/** Upgrade legacy saves while preserving runs, selected dungeon modes and stair safety. */
export function migrateGameState(value) {
    if (!value || typeof value !== 'object')
        return null;
    const state = value;
    const sourceSchema = Number(state.schemaVersion);
    if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(sourceSchema) || !state.player || typeof state.player !== 'object')
        return null;
    const player = state.player;
    const oldHunger = Number(player.hunger);
    const hunger = sourceSchema < 4
        ? Number.isInteger(oldHunger) && oldHunger >= 0 && oldHunger <= 100 ? Math.round(oldHunger * CURRENT_HUNGER_MAX / 100) : CURRENT_HUNGER_MAX
        : sourceSchema < 5
            ? Number.isInteger(oldHunger) && oldHunger >= 0 && oldHunger <= 500 ? Math.round(oldHunger * CURRENT_HUNGER_MAX / 500) : CURRENT_HUNGER_MAX
            : Number.isInteger(oldHunger) && oldHunger >= 0 && oldHunger <= CURRENT_HUNGER_MAX ? oldHunger : CURRENT_HUNGER_MAX;
    const monsters = Array.isArray(state.monsters)
        ? state.monsters.map((entry) => {
            if (!entry || typeof entry !== 'object')
                return entry;
            const monster = entry;
            const isCurrentRare = sourceSchema >= 4 && monster.rareVariant === true;
            const speed = isCurrentRare && ['slow', 'normal', 'fast'].includes(String(monster.actionSpeed))
                ? monster.actionSpeed
                : 'normal';
            const progress = speed === 'slow' && Number.isInteger(monster.actionProgress) && Number(monster.actionProgress) >= 0 && Number(monster.actionProgress) <= 1
                ? Number(monster.actionProgress)
                : 0;
            // v2.2/schema-v4 slow variants used a 1.3x attack bonus. Scale only those saved rare slow monsters to the v2.3 1.8x rule.
            const migratedSlowAttack = sourceSchema === 4 && isCurrentRare && speed === 'slow'
                ? Math.ceil((Number(monster.attack) || 0) * (1.8 / 1.3))
                : monster.attack;
            const isHunter = sourceSchema >= 12 && monster.hunterVariant === true;
            const migratedMonster = {
                ...monster,
                attack: migratedSlowAttack,
                actionSpeed: speed,
                actionProgress: progress,
                rareVariant: isCurrentRare,
                hunterVariant: isHunter,
            };
            if (isHunter) {
                migratedMonster.hunterLevel = Number.isInteger(monster.hunterLevel)
                    ? Math.max(1, Math.min(99, monster.hunterLevel))
                    : 1;
            }
            else {
                delete migratedMonster.hunterLevel;
            }
            return migratedMonster;
        })
        : state.monsters;
    // Repair legacy saves in which a chasing monster was allowed onto the stair tile.
    const safeMonsters = Array.isArray(monsters) ? [...monsters] : monsters;
    if (Array.isArray(safeMonsters) && state.dungeon && typeof state.dungeon === 'object') {
        const dungeon = state.dungeon;
        const stairs = dungeon.stairs;
        const playerPosition = player;
        if (stairs && Number.isInteger(stairs.x) && Number.isInteger(stairs.y)) {
            const key = (point) => `${point.x},${point.y}`;
            const stairKey = key(stairs);
            const occupied = new Set([key(playerPosition), ...safeMonsters.filter((m) => m && typeof m === 'object' && key(m) !== stairKey).map((m) => key(m))]);
            const tiles = dungeon.tiles;
            for (const raw of safeMonsters) {
                if (!raw || typeof raw !== 'object')
                    continue;
                const monster = raw;
                if (key(monster) !== stairKey)
                    continue;
                const candidates = [];
                for (let y = 1; y < Number(dungeon.height) - 1; y += 1) {
                    for (let x = 1; x < Number(dungeon.width) - 1; x += 1) {
                        const candidateKey = `${x},${y}`;
                        if (tiles?.[y]?.[x] !== 1 || occupied.has(candidateKey) || candidateKey === stairKey)
                            continue;
                        candidates.push({ x, y, distance: Math.abs(x - Number(stairs.x)) + Math.abs(y - Number(stairs.y)) });
                    }
                }
                candidates.sort((a, b) => a.distance - b.distance);
                const destination = candidates[0];
                if (destination) {
                    monster.x = destination.x;
                    monster.y = destination.y;
                    occupied.add(`${destination.x},${destination.y}`);
                }
                else
                    monster.hp = 0;
            }
        }
    }
    const inventory = Array.isArray(state.inventory)
        ? state.inventory.map((stack) => {
            if (!stack || typeof stack !== 'object')
                return stack;
            const entry = stack;
            return { ...entry, item: migrateItem(entry.item) };
        })
        : state.inventory;
    const groundItems = Array.isArray(state.groundItems)
        ? state.groundItems.map((ground) => {
            if (!ground || typeof ground !== 'object')
                return ground;
            const entry = ground;
            return { ...entry, item: migrateItem(entry.item) };
        })
        : state.groundItems;
    const shop = sourceSchema >= 9 && state.shop && typeof state.shop === 'object'
        ? (() => {
            const rawShop = state.shop;
            const goods = Array.isArray(rawShop.goods) ? rawShop.goods.map((good) => {
                if (!good || typeof good !== 'object')
                    return good;
                const entry = good;
                // Before v4.6, picked-up goods were stored as both sold and stolen.
                // Normalize them to the new unpaid state while keeping the debt/inventory intact.
                return { ...entry, sold: entry.stolen === true ? false : entry.sold, item: migrateItem(entry.item) };
            }) : [];
            const pending = goods.filter((good) => good && typeof good === 'object' && good.stolen === true && good.sold !== true);
            const savedSelection = typeof rawShop.selectedGoodId === 'string' && pending.some((good) => good.id === rawShop.selectedGoodId)
                ? rawShop.selectedGoodId
                : pending[0]?.id ?? null;
            return { ...rawShop, goods, selectedGoodId: savedSelection };
        })()
        : null;
    return {
        ...state,
        schemaVersion: 12,
        modeId: isDungeonModeId(state.modeId) ? state.modeId : 'beginner',
        player: { ...player, hunger },
        // v3.0.0 and older used a different decay cadence; start the new 4-action phase cleanly.
        // v3.1.0 saves preserve the accumulated phase across reloads.
        hungerDecayCounter: sourceSchema >= 8 && Number.isInteger(state.hungerDecayCounter) && Number(state.hungerDecayCounter) >= 0 && Number(state.hungerDecayCounter) <= 3
            ? Number(state.hungerDecayCounter)
            : 0,
        fedTurnCounter: Number.isInteger(state.fedTurnCounter) && Number(state.fedTurnCounter) >= 0 ? Number(state.fedTurnCounter) % 9 : 0,
        starvationTurnCounter: Number.isInteger(state.starvationTurnCounter) && Number(state.starvationTurnCounter) >= 0 ? Number(state.starvationTurnCounter) % 6 : 0,
        monsters: Array.isArray(safeMonsters) ? safeMonsters.filter((m) => m && typeof m === 'object' && Number(m.hp) > 0) : safeMonsters,
        inventory,
        groundItems,
        groundGold: sourceSchema >= 9 && Array.isArray(state.groundGold) ? state.groundGold : [],
        gold: sourceSchema >= 9 && Number.isInteger(state.gold) ? Math.max(0, Math.min(20_000_000, Number(state.gold))) : 0,
        shop,
    };
}
export class SaveManager {
    async save(state) {
        if (!validateGameState(state))
            throw new Error('不正なゲーム状態のため保存を中止しました。');
        const db = await openDatabase();
        const tx = db.transaction(SAVE_STORE, 'readwrite');
        tx.objectStore(SAVE_STORE).put({ id: 'current', version: 12, savedAt: Date.now(), state });
        await transactionDone(tx);
    }
    async load() {
        const db = await openDatabase();
        const tx = db.transaction(SAVE_STORE, 'readonly');
        const result = await requestResult(tx.objectStore(SAVE_STORE).get('current'));
        await transactionDone(tx);
        if (!result)
            return null;
        const migrated = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(Number(result.version)) ? migrateGameState(result.state) : null;
        if (!migrated || !validateGameState(migrated)) {
            await this.clear();
            throw new Error('セーブデータが破損しているか、未対応の形式です。新しい冒険を始めてください。');
        }
        if (result.version !== 12)
            await this.save(migrated);
        return migrated;
    }
    async hasSave() {
        const db = await openDatabase();
        const tx = db.transaction(SAVE_STORE, 'readonly');
        const result = await requestResult(tx.objectStore(SAVE_STORE).getKey('current'));
        await transactionDone(tx);
        return result !== undefined;
    }
    async clear() {
        const db = await openDatabase();
        const tx = db.transaction(SAVE_STORE, 'readwrite');
        tx.objectStore(SAVE_STORE).delete('current');
        await transactionDone(tx);
    }
    async saveSettings(settings) {
        const db = await openDatabase();
        const tx = db.transaction(SETTINGS_STORE, 'readwrite');
        tx.objectStore(SETTINGS_STORE).put({ id: SETTINGS_ID, ...settings });
        await transactionDone(tx);
    }
    async loadSettings() {
        const db = await openDatabase();
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const result = await requestResult(tx.objectStore(SETTINGS_STORE).get(SETTINGS_ID));
        await transactionDone(tx);
        if (!result)
            return { ...DEFAULT_AUDIO_SETTINGS };
        return {
            bgmVolume: clamp(result.bgmVolume, 0, 1, DEFAULT_AUDIO_SETTINGS.bgmVolume),
            sfxVolume: clamp(result.sfxVolume, 0, 1, DEFAULT_AUDIO_SETTINGS.sfxVolume),
            muteBgm: Boolean(result.muteBgm),
            muteSfx: Boolean(result.muteSfx),
        };
    }
}
function clamp(value, min, max, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
