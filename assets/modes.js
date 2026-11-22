export const DUNGEON_MODES = {
    tutorial: {
        id: 'tutorial', name: 'はじまりの坑道', subtitle: 'チュートリアル · 地下5階',
        description: '移動・戦闘・アイテム・装備・満腹度の基本を学ぶ短い探索。',
        floors: 5, difficultyScale: 0.92, maxMonsterTier: 2, minMonsters: 3, maxMonsters: 5, bossFloorMonsters: 0, bossSize: 1, bossVisualScale: 0.50, bossSupportRareChance: 0, bossFormChance: 0,
        rareMonsterChance: 0, floorLootChance: 0.62, equipmentWeight: 0.19, foodWeight: 0.40, potionWeight: 0.41,
        enemyDropEquipment: 0.016, enemyDropPotion: 0.039, enemyDropFood: 0.037, enemyDropGold: 0.19, shopChance: 0.05, enemyDropValuable: 0.005,
        bossName: '坑道の守り手・岩喰い', bossHp: 42, bossAttack: 6, bossDefense: 1, bossExp: 78, bossAreaAttackChance: 0, bossNovaAttackChance: 0, bossEnrageThreshold: 0, bossEnrageAttackMultiplier: 1,
        bgmTrack: 'beginner', palette: { floor: ['#34463d', '#3a4d42', '#384a3f'], wall: ['#1c2b28', '#34453d', '#46594b', '#26372f'] },
    },
    beginner: {
        id: 'beginner', name: '苔むす古坑', subtitle: '初級 · 地下10階',
        description: '基本を身につけた冒険者向け。装備を整えて魔物の王に挑もう。',
        floors: 10, difficultyScale: 1.00, maxMonsterTier: 3, minMonsters: 4, maxMonsters: 7, bossFloorMonsters: 3, bossSize: 2, bossVisualScale: 0.78, bossSupportRareChance: 0.025, bossFormChance: 0,
        rareMonsterChance: 0.085, floorLootChance: 0.60, equipmentWeight: 0.18, foodWeight: 0.39, potionWeight: 0.43,
        enemyDropEquipment: 0.016, enemyDropPotion: 0.034, enemyDropFood: 0.028, enemyDropGold: 0.22, shopChance: 0.07, enemyDropValuable: 0.006,
        bossName: '古坑の守護王', bossHp: 160, bossAttack: 14, bossDefense: 4, bossExp: 180, bossAreaAttackChance: 0.12, bossNovaAttackChance: 0, bossEnrageThreshold: 0, bossEnrageAttackMultiplier: 1,
        bgmTrack: 'intermediate', palette: { floor: ['#293b3b', '#2d403e', '#2a3d3c'], wall: ['#17272b', '#34484a', '#3c5151', '#203235'] },
    },
    intermediate: {
        id: 'intermediate', name: '蒼晶の地下聖堂', subtitle: '中級 · 地下15階',
        description: '結晶の回廊に強敵が潜む。耐久と食料の管理が重要になる。',
        floors: 15, difficultyScale: 1.14, maxMonsterTier: 4, minMonsters: 5, maxMonsters: 8, bossFloorMonsters: 5, bossSize: 2, bossVisualScale: 1.00, bossSupportRareChance: 0.03, bossFormChance: 0.40,
        rareMonsterChance: 0.095, floorLootChance: 0.58, equipmentWeight: 0.18, foodWeight: 0.37, potionWeight: 0.45,
        enemyDropEquipment: 0.017, enemyDropPotion: 0.033, enemyDropFood: 0.026, enemyDropGold: 0.23, shopChance: 0.08, enemyDropValuable: 0.0065,
        bossName: '蒼晶竜アズラグ', bossHp: 316, bossAttack: 25, bossDefense: 8, bossExp: 300, bossAreaAttackChance: 0.38, bossNovaAttackChance: 0, bossEnrageThreshold: 0, bossEnrageAttackMultiplier: 1,
        bgmTrack: 'advanced', palette: { floor: ['#263d49', '#2a4350', '#29414d'], wall: ['#142833', '#2a4655', '#3a5c6b', '#1d3542'] },
    },
    advanced: {
        id: 'advanced', name: '灰燼の魔窟', subtitle: '上級 · 地下25階',
        description: '灼熱の灰に覆われた深層。希少個体と消耗戦を覚悟せよ。',
        floors: 25, difficultyScale: 1.28, maxMonsterTier: 5, minMonsters: 5, maxMonsters: 9, bossFloorMonsters: 6, bossSize: 3, bossVisualScale: 1.50, bossSupportRareChance: 0.035, bossFormChance: 0.50,
        rareMonsterChance: 0.105, floorLootChance: 0.56, equipmentWeight: 0.19, foodWeight: 0.35, potionWeight: 0.46,
        enemyDropEquipment: 0.018, enemyDropPotion: 0.032, enemyDropFood: 0.024, enemyDropGold: 0.24, shopChance: 0.09, enemyDropValuable: 0.007,
        bossName: '灰燼公ヴァルグ', bossHp: 430, bossAttack: 33, bossDefense: 10, bossExp: 520, bossAreaAttackChance: 0.42, bossNovaAttackChance: 0.12, bossEnrageThreshold: 0.40, bossEnrageAttackMultiplier: 1.15,
        bgmTrack: 'expert', palette: { floor: ['#453633', '#4b3933', '#42332f'], wall: ['#271b1a', '#50342e', '#70483b', '#392523'] },
    },
    expert: {
        id: 'expert', name: '星喰らいの深淵', subtitle: '最上級 · 地下30階',
        description: '星の光すら届かない最深層。万全の装備と判断力が試される。',
        floors: 30, difficultyScale: 1.35, maxMonsterTier: 6, minMonsters: 6, maxMonsters: 10, bossFloorMonsters: 7, bossSize: 4, bossVisualScale: 2.00, bossSupportRareChance: 0.04, bossFormChance: 0.60,
        rareMonsterChance: 0.115, floorLootChance: 0.54, equipmentWeight: 0.20, foodWeight: 0.34, potionWeight: 0.46,
        enemyDropEquipment: 0.019, enemyDropPotion: 0.030, enemyDropFood: 0.023, enemyDropGold: 0.25, shopChance: 0.10, enemyDropValuable: 0.0075,
        bossName: '星喰らいゼル＝ノヴァ', bossHp: 560, bossAttack: 42, bossDefense: 12, bossExp: 760, bossAreaAttackChance: 0.45, bossNovaAttackChance: 0.20, bossEnrageThreshold: 0.45, bossEnrageAttackMultiplier: 1.22,
        bgmTrack: 'tutorial', palette: { floor: ['#302d49', '#353151', '#2d2a45'], wall: ['#171629', '#302d4d', '#49416e', '#211f39'] },
    },
};
export const MODE_ORDER = ['tutorial', 'beginner', 'intermediate', 'advanced', 'expert'];
export function getModeConfig(modeId) {
    return DUNGEON_MODES[modeId] ?? DUNGEON_MODES.beginner;
}

export function getBossStats(modeId, form = 'normal') {
    const mode = getModeConfig(modeId);
    const effectiveForm = mode.bossFormChance > 0 ? form : 'normal';
    const hpMultiplier = effectiveForm === 'slow' ? 1.08 : effectiveForm === 'fast' ? 0.94 : 1;
    const attackMultiplier = effectiveForm === 'slow' ? 1.25 : effectiveForm === 'fast' ? 0.65 : 1;
    return {
        hp: Math.max(1, Math.round(mode.bossHp * hpMultiplier)),
        attack: Math.max(1, Math.ceil(mode.bossAttack * attackMultiplier)),
        defense: Math.max(0, mode.bossDefense),
        bossSize: mode.bossSize ?? 2,
        bossVisualScale: mode.bossVisualScale ?? 1,
        bossVisualStyle: mode.id,
        bossAreaAttackChance: mode.bossAreaAttackChance ?? 0,
        bossNovaAttackChance: mode.bossNovaAttackChance ?? 0,
        bossEnrageThreshold: mode.bossEnrageThreshold ?? 0,
        bossEnrageAttackMultiplier: mode.bossEnrageAttackMultiplier ?? 1,
        bossSupportRareChance: mode.bossSupportRareChance ?? 0,
    };
}
export function isDungeonModeId(value) {
    return typeof value === 'string' && MODE_ORDER.includes(value);
}
