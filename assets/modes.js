export const DUNGEON_MODES = {
    tutorial: {
        id: 'tutorial', name: 'はじまりの坑道', subtitle: 'チュートリアル · 地下5階',
        description: '移動・戦闘・アイテム・装備・満腹度の基本を学ぶ短い探索。',
        floors: 5, difficultyScale: 0.92, maxMonsterTier: 2, minMonsters: 3, maxMonsters: 5, bossFloorMonsters: 1,
        floorLootChance: 0.62, equipmentWeight: 0.17, foodWeight: 0.40, potionWeight: 0.43,
        enemyDropEquipment: 0.012, enemyDropPotion: 0.040, enemyDropFood: 0.035, enemyDropGold: 0.30, shopChance: 0.05, enemyDropValuable: 0.003,
        bossName: '坑道の守り手・岩喰い', bossHp: 82, bossAttack: 10, bossDefense: 2, bossExp: 78,
        bgmTrack: 'beginner', palette: { floor: ['#34463d', '#3a4d42', '#384a3f'], wall: ['#1c2b28', '#34453d', '#46594b', '#26372f'] },
    },
    beginner: {
        id: 'beginner', name: '苔むす古坑', subtitle: '初級 · 地下10階',
        description: '基本を身につけた冒険者向け。装備を整えて魔物の王に挑もう。',
        floors: 10, difficultyScale: 1.00, maxMonsterTier: 3, minMonsters: 4, maxMonsters: 7, bossFloorMonsters: 1,
        floorLootChance: 0.60, equipmentWeight: 0.16, foodWeight: 0.39, potionWeight: 0.45,
        enemyDropEquipment: 0.013, enemyDropPotion: 0.035, enemyDropFood: 0.025, enemyDropGold: 0.35, shopChance: 0.07, enemyDropValuable: 0.004,
        bossName: '古坑の守護王', bossHp: 170, bossAttack: 16, bossDefense: 4, bossExp: 180,
        bgmTrack: 'intermediate', palette: { floor: ['#293b3b', '#2d403e', '#2a3d3c'], wall: ['#17272b', '#34484a', '#3c5151', '#203235'] },
    },
    intermediate: {
        id: 'intermediate', name: '蒼晶の地下聖堂', subtitle: '中級 · 地下15階',
        description: '結晶の回廊に強敵が潜む。耐久と食料の管理が重要になる。',
        floors: 15, difficultyScale: 1.14, maxMonsterTier: 4, minMonsters: 5, maxMonsters: 8, bossFloorMonsters: 2,
        floorLootChance: 0.58, equipmentWeight: 0.16, foodWeight: 0.37, potionWeight: 0.47,
        enemyDropEquipment: 0.014, enemyDropPotion: 0.034, enemyDropFood: 0.022, enemyDropGold: 0.40, shopChance: 0.08, enemyDropValuable: 0.006,
        bossName: '蒼晶竜アズラグ', bossHp: 275, bossAttack: 22, bossDefense: 6, bossExp: 300,
        bgmTrack: 'advanced', palette: { floor: ['#263d49', '#2a4350', '#29414d'], wall: ['#142833', '#2a4655', '#3a5c6b', '#1d3542'] },
    },
    advanced: {
        id: 'advanced', name: '灰燼の魔窟', subtitle: '上級 · 地下25階',
        description: '灼熱の灰に覆われた深層。希少個体と消耗戦を覚悟せよ。',
        floors: 25, difficultyScale: 1.28, maxMonsterTier: 5, minMonsters: 5, maxMonsters: 9, bossFloorMonsters: 2,
        floorLootChance: 0.56, equipmentWeight: 0.17, foodWeight: 0.35, potionWeight: 0.48,
        enemyDropEquipment: 0.015, enemyDropPotion: 0.032, enemyDropFood: 0.020, enemyDropGold: 0.45, shopChance: 0.09, enemyDropValuable: 0.008,
        bossName: '灰燼公ヴァルグ', bossHp: 450, bossAttack: 30, bossDefense: 9, bossExp: 520,
        bgmTrack: 'expert', palette: { floor: ['#453633', '#4b3933', '#42332f'], wall: ['#271b1a', '#50342e', '#70483b', '#392523'] },
    },
    expert: {
        id: 'expert', name: '星喰らいの深淵', subtitle: '最上級 · 地下30階',
        description: '星の光すら届かない最深層。万全の装備と判断力が試される。',
        floors: 30, difficultyScale: 1.42, maxMonsterTier: 6, minMonsters: 6, maxMonsters: 10, bossFloorMonsters: 3,
        floorLootChance: 0.54, equipmentWeight: 0.18, foodWeight: 0.34, potionWeight: 0.48,
        enemyDropEquipment: 0.016, enemyDropPotion: 0.030, enemyDropFood: 0.018, enemyDropGold: 0.50, shopChance: 0.10, enemyDropValuable: 0.010,
        bossName: '星喰らいゼル＝ノヴァ', bossHp: 640, bossAttack: 38, bossDefense: 12, bossExp: 760,
        bgmTrack: 'tutorial', palette: { floor: ['#302d49', '#353151', '#2d2a45'], wall: ['#171629', '#302d4d', '#49416e', '#211f39'] },
    },
};
export const MODE_ORDER = ['tutorial', 'beginner', 'intermediate', 'advanced', 'expert'];
export function getModeConfig(modeId) {
    return DUNGEON_MODES[modeId] ?? DUNGEON_MODES.beginner;
}
export function isDungeonModeId(value) {
    return typeof value === 'string' && MODE_ORDER.includes(value);
}
