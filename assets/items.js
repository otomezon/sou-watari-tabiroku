import { getModeConfig } from "./modes.js";
// Equipment is deliberately broad in quality and durability so replacement loot
// matters throughout a run. Healing items remain stackable.
const TEMPLATES = [
    // Weapons
    { id: 'rusty-sword', name: '錆びた剣', kind: 'weapon', attack: 2, durability: 42, description: '攻撃力 +2', minFloor: 1 },
    { id: 'wooden-club', name: '樫のこん棒', kind: 'weapon', attack: 3, durability: 58, description: '攻撃力 +3', minFloor: 1 },
    { id: 'iron-sword', name: '鉄の剣', kind: 'weapon', attack: 4, durability: 68, description: '攻撃力 +4', minFloor: 3 },
    { id: 'battle-axe', name: 'バトルアクス', kind: 'weapon', attack: 5, durability: 54, description: '攻撃力 +5', minFloor: 4 },
    { id: 'knight-sword', name: '騎士の剣', kind: 'weapon', attack: 6, durability: 82, description: '攻撃力 +6', minFloor: 6 },
    { id: 'ice-brand', name: '氷刃の剣', kind: 'weapon', attack: 7, durability: 76, description: '攻撃力 +7', minFloor: 7 },
    { id: 'dragon-slayer', name: '竜殺し', kind: 'weapon', attack: 9, durability: 96, description: '攻撃力 +9', minFloor: 9 },
    { id: 'demon-edge', name: '魔断ちの大剣', kind: 'weapon', attack: 11, durability: 110, description: '攻撃力 +11', minFloor: 10 },
    // Shields
    { id: 'wood-shield', name: '木の盾', kind: 'shield', defense: 1, durability: 48, description: '防御力 +1', minFloor: 1 },
    { id: 'leather-buckler', name: '革の小盾', kind: 'shield', defense: 2, durability: 62, description: '防御力 +2', minFloor: 2 },
    { id: 'iron-shield', name: '鉄の盾', kind: 'shield', defense: 3, durability: 78, description: '防御力 +3', minFloor: 4 },
    { id: 'tower-shield', name: 'タワーシールド', kind: 'shield', defense: 4, durability: 92, description: '防御力 +4', minFloor: 5 },
    { id: 'aegis-shield', name: '守護の盾', kind: 'shield', defense: 5, durability: 108, description: '防御力 +5', minFloor: 7 },
    { id: 'dragon-shield', name: '竜鱗の盾', kind: 'shield', defense: 7, durability: 125, description: '防御力 +7', minFloor: 9 },
    // Armor
    { id: 'leather-armor', name: '革の鎧', kind: 'armor', defense: 1, durability: 55, description: '防御力 +1', minFloor: 1 },
    { id: 'chain-armor', name: '鎖かたびら', kind: 'armor', defense: 2, durability: 70, description: '防御力 +2', minFloor: 3 },
    { id: 'scale-armor', name: 'うろこの鎧', kind: 'armor', defense: 3, durability: 82, description: '防御力 +3', minFloor: 4 },
    { id: 'plate-armor', name: '鋼の鎧', kind: 'armor', defense: 4, durability: 96, description: '防御力 +4', minFloor: 7 },
    { id: 'royal-armor', name: '王国騎士の鎧', kind: 'armor', defense: 6, durability: 118, description: '防御力 +6', minFloor: 8 },
    { id: 'dragon-mail', name: '竜鱗の鎧', kind: 'armor', defense: 8, durability: 140, description: '防御力 +8', minFloor: 10 },
    // Healing items
    { id: 'potion', name: '薬草', kind: 'potion', heal: 8, hungerRestore: 3, description: 'HPを8・満腹度を3回復', minFloor: 1 },
    { id: 'healing-potion', name: '回復薬', kind: 'potion', heal: 15, hungerRestore: 3, description: 'HPを15・満腹度を3回復', minFloor: 1 },
    { id: 'greater-potion', name: '上級回復薬', kind: 'potion', heal: 25, hungerRestore: 4, description: 'HPを25・満腹度を4回復', minFloor: 4 },
    { id: 'royal-potion', name: '王家の秘薬', kind: 'potion', heal: 40, hungerRestore: 5, description: 'HPを40・満腹度を5回復', minFloor: 7 },
    { id: 'elixir', name: '生命の秘薬', kind: 'potion', heal: 65, hungerRestore: 6, description: 'HPを65・満腹度を6回復', minFloor: 9 },
    // Food restores a substantial amount of satiety and is stackable.
    { id: 'bread', name: 'パン', kind: 'food', hungerRestore: 26, description: '満腹度を26回復', minFloor: 1 },
    { id: 'hard-bread', name: '堅焼きパン', kind: 'food', hungerRestore: 38, description: '満腹度を38回復', minFloor: 2 },
    { id: 'dried-meat', name: '干し肉', kind: 'food', hungerRestore: 26, description: '満腹度を26回復', minFloor: 3 },
    { id: 'big-bread', name: '大きなパン', kind: 'food', hungerRestore: 54, description: '満腹度を54回復', minFloor: 5 },
    { id: 'adventurer-ration', name: '冒険者の保存食', kind: 'food', hungerRestore: 46, description: '満腹度を46回復', minFloor: 7 },
    // New common equipment and consumables for longer campaigns.
    { id: 'steel-claymore', name: '鋼の大剣', kind: 'weapon', attack: 8, durability: 90, description: '攻撃力 +8', minFloor: 11 },
    { id: 'moonlit-sabre', name: '月影のサーベル', kind: 'weapon', attack: 10, durability: 102, description: '攻撃力 +10', minFloor: 16 },
    { id: 'meteor-hammer', name: '隕鉄の鎚', kind: 'weapon', attack: 13, durability: 118, description: '攻撃力 +13', minFloor: 22 },
    { id: 'worldbreaker', name: '断界剣', kind: 'weapon', attack: 16, durability: 132, description: '攻撃力 +16', minFloor: 28 },
    { id: 'knight-aegis', name: '騎士団の大盾', kind: 'shield', defense: 6, durability: 122, description: '防御力 +6', minFloor: 12 },
    { id: 'moon-shield', name: '月輪の盾', kind: 'shield', defense: 8, durability: 136, description: '防御力 +8', minFloor: 18 },
    { id: 'star-wall', name: '星壁の盾', kind: 'shield', defense: 10, durability: 150, description: '防御力 +10', minFloor: 26 },
    { id: 'rune-mail', name: 'ルーンメイル', kind: 'armor', defense: 7, durability: 132, description: '防御力 +7', minFloor: 12 },
    { id: 'moon-plate', name: '月鋼の重鎧', kind: 'armor', defense: 9, durability: 148, description: '防御力 +9', minFloor: 19 },
    { id: 'astral-armor', name: '星辰の鎧', kind: 'armor', defense: 12, durability: 168, description: '防御力 +12', minFloor: 27 },
    // Additional healing items and rations.
    { id: 'greater-elixir', name: '大回復の秘薬', kind: 'potion', heal: 85, hungerRestore: 6, description: 'HPを85・満腹度を6回復', minFloor: 14 },
    { id: 'ancient-elixir', name: '古代の霊薬', kind: 'potion', heal: 110, hungerRestore: 8, description: 'HPを110・満腹度を8回復', minFloor: 24 },
    { id: 'honey-herb', name: '蜜漬け薬草', kind: 'potion', heal: 12, hungerRestore: 10, description: 'HPを12・満腹度を10回復', minFloor: 2 },
    { id: 'spring-tonic', name: '泉の滋養薬', kind: 'potion', heal: 32, hungerRestore: 14, description: 'HPを32・満腹度を14回復', minFloor: 10 },
    { id: 'apple', name: '赤いリンゴ', kind: 'food', hungerRestore: 32, description: '満腹度を32回復', minFloor: 1 },
    { id: 'smoked-fish', name: '燻製魚', kind: 'food', hungerRestore: 42, description: '満腹度を42回復', minFloor: 4 },
    { id: 'nut-cake', name: '木の実ケーキ', kind: 'food', hungerRestore: 48, description: '満腹度を48回復', minFloor: 8 },
    { id: 'herb-stew', name: '薬草シチュー', kind: 'food', hungerRestore: 58, description: '満腹度を58回復', minFloor: 12 },
    { id: 'dragon-jerky', name: '竜肉の干し物', kind: 'food', hungerRestore: 70, description: '満腹度を70回復', minFloor: 20 },
    { id: 'starlight-biscuit', name: '星明かりのビスケット', kind: 'food', hungerRestore: 82, description: '満腹度を82回復', minFloor: 27 },
    // Expanded armory and provisions for the 5 campaigns.
    { id: 'scout-dagger', name: '斥候の短剣', kind: 'weapon', attack: 3, durability: 76, description: '攻撃力 +3', minFloor: 1 },
    { id: 'war-pick', name: '戦鉱ピック', kind: 'weapon', attack: 7, durability: 84, description: '攻撃力 +7', minFloor: 8 },
    { id: 'rune-spear', name: 'ルーンスピア', kind: 'weapon', attack: 9, durability: 100, description: '攻撃力 +9', minFloor: 13 },
    { id: 'sunken-trident', name: '沈没神殿の三叉槍', kind: 'weapon', attack: 12, durability: 116, description: '攻撃力 +12', minFloor: 18 },
    { id: 'eclipse-greatsword', name: '蝕の大剣', kind: 'weapon', attack: 17, durability: 142, description: '攻撃力 +17', minFloor: 25 },
    { id: 'bronze-buckler', name: '青銅の小盾', kind: 'shield', defense: 2, durability: 68, description: '防御力 +2', minFloor: 1 },
    { id: 'mirror-shield', name: '鏡面の盾', kind: 'shield', defense: 5, durability: 112, description: '防御力 +5', minFloor: 9 },
    { id: 'rune-tower', name: '紋章の大盾', kind: 'shield', defense: 9, durability: 144, description: '防御力 +9', minFloor: 21 },
    { id: 'scale-vest', name: '竜鱗の胸当て', kind: 'armor', defense: 3, durability: 90, description: '防御力 +3', minFloor: 5 },
    { id: 'warden-mail', name: '番人の鎧', kind: 'armor', defense: 8, durability: 140, description: '防御力 +8', minFloor: 15 },
    { id: 'eclipse-plate', name: '蝕光の全身鎧', kind: 'armor', defense: 14, durability: 180, description: '防御力 +14', minFloor: 29 },
    { id: 'minor-elixir', name: '小瓶の霊薬', kind: 'potion', heal: 10, hungerRestore: 3, description: 'HPを10・満腹度を3回復', minFloor: 1 },
    { id: 'deepwell-potion', name: '深泉の回復薬', kind: 'potion', heal: 52, hungerRestore: 6, description: 'HPを52・満腹度を6回復', minFloor: 12 },
    { id: 'phoenix-tear', name: '不死鳥の涙', kind: 'potion', heal: 95, hungerRestore: 8, description: 'HPを95・満腹度を8回復', minFloor: 20 },
    { id: 'moon-salve', name: '月光軟膏', kind: 'potion', heal: 28, hungerRestore: 5, description: 'HPを28・満腹度を5回復', minFloor: 6 },
    { id: 'sunfruit', name: '陽だまりの果実', kind: 'food', hungerRestore: 35, description: '満腹度を35回復', minFloor: 1 },
    { id: 'cave-cheese', name: '洞窟熟成チーズ', kind: 'food', hungerRestore: 44, description: '満腹度を44回復', minFloor: 3 },
    { id: 'smoked-rabbit', name: '燻製ウサギ肉', kind: 'food', hungerRestore: 52, description: '満腹度を52回復', minFloor: 7 },
    { id: 'crystal-pear', name: '晶梨', kind: 'food', hungerRestore: 60, description: '満腹度を60回復', minFloor: 11 },
    { id: 'ash-bun', name: '灰焼きパン', kind: 'food', hungerRestore: 66, description: '満腹度を66回復', minFloor: 16 },
    { id: 'dragon-stew', name: '竜肉の煮込み', kind: 'food', hungerRestore: 78, description: '満腹度を78回復', minFloor: 22 },
    { id: 'star-fruit', name: '星紡ぎの果実', kind: 'food', hungerRestore: 90, description: '満腹度を90回復', minFloor: 28 },
    { id: 'tunnel-kit-ration', name: '坑道携行食', kind: 'food', hungerRestore: 30, description: '満腹度を30回復', minFloor: 1, modeId: 'tutorial' },
    { id: 'sanctuary-wafer', name: '聖堂の晶菓', kind: 'food', hungerRestore: 62, description: '満腹度を62回復', minFloor: 8, modeId: 'intermediate' },
    { id: 'void-tonic', name: '虚空の秘薬', kind: 'potion', heal: 125, hungerRestore: 8, description: 'HPを125・満腹度を8回復', minFloor: 26, modeId: 'expert' },
    // Rare valuables exist only to be sold; they cannot be equipped or consumed.
    { id: 'amber-fragment', name: '琥珀の欠片', kind: 'valuable', sellValue: 180, description: '古い樹脂に魔力が封じられた換金品', minFloor: 1 },
    { id: 'silver-reliquary', name: '銀細工の聖櫃', kind: 'valuable', sellValue: 420, description: '精巧な銀細工。店で高く売れる', minFloor: 4 },
    { id: 'moonstone', name: '月長石', kind: 'valuable', sellValue: 850, description: '青白く輝く希少な宝石', minFloor: 9 },
    { id: 'dragon-pearl', name: '竜珠', kind: 'valuable', sellValue: 1650, description: '竜の魔力を宿す高価な宝珠', minFloor: 16 },
    { id: 'astral-core', name: '星晶核', kind: 'valuable', sellValue: 3200, description: '星の力を凝縮した極めて希少な結晶', minFloor: 25 },
    // Dungeon-specific relic equipment. These only appear in their named campaign.
    { id: 'trainee-sword', name: '見習いの剣', kind: 'weapon', attack: 3, durability: 72, description: '攻撃力 +3', minFloor: 1, modeId: 'tutorial' },
    { id: 'trainee-shield', name: '見習いの木盾', kind: 'shield', defense: 2, durability: 74, description: '防御力 +2', minFloor: 1, modeId: 'tutorial' },
    { id: 'moss-cutter', name: '苔刈りの剣', kind: 'weapon', attack: 6, durability: 88, description: '攻撃力 +6', minFloor: 5, modeId: 'beginner' },
    { id: 'moss-guard', name: '苔紋の盾', kind: 'shield', defense: 4, durability: 106, description: '防御力 +4', minFloor: 6, modeId: 'beginner' },
    { id: 'azure-saber', name: '蒼晶の細剣', kind: 'weapon', attack: 9, durability: 106, description: '攻撃力 +9', minFloor: 8, modeId: 'intermediate' },
    { id: 'crystal-aegis', name: '結晶の大盾', kind: 'shield', defense: 7, durability: 132, description: '防御力 +7', minFloor: 10, modeId: 'intermediate' },
    { id: 'ashen-cleaver', name: '灰燼の断頭斧', kind: 'weapon', attack: 13, durability: 116, description: '攻撃力 +13', minFloor: 15, modeId: 'advanced' },
    { id: 'cinder-plate', name: '熾火の重鎧', kind: 'armor', defense: 10, durability: 154, description: '防御力 +10', minFloor: 17, modeId: 'advanced' },
    { id: 'star-forged-blade', name: '星鍛の剣', kind: 'weapon', attack: 18, durability: 145, description: '攻撃力 +18', minFloor: 23, modeId: 'expert' },
    { id: 'void-wall', name: '虚空の障壁盾', kind: 'shield', defense: 13, durability: 180, description: '防御力 +13', minFloor: 25, modeId: 'expert' },
];
let nextUid = 1;
function rollEnhancement(floor, random, quality = 'normal') {
    // Early floors are intentionally modest. The +3 to +5 outcomes unlock gradually
    // so better enhancement values become a reward for reaching deeper layers.
    const normalWeights = floor <= 3
        ? [78, 17, 5]
        : floor <= 6
            ? [60, 22, 12, 5, 1]
            : floor <= 10
                ? [45, 22, 17, 11, 4, 1]
                : floor <= 18
                    ? [34, 19, 19, 16, 8, 4]
                    : [25, 15, 20, 20, 13, 7];
    const premiumWeights = floor <= 3
        ? [68, 22, 8, 2]
        : floor <= 6
            ? [54, 22, 14, 7, 3]
            : floor <= 10
                ? [40, 22, 18, 13, 6, 1]
                : floor <= 18
                    ? [30, 19, 20, 17, 10, 4]
                    : [22, 15, 20, 20, 15, 8];
    const weights = quality === 'premium' ? premiumWeights : normalWeights;
    const roll = random.next() * 100;
    let cumulative = 0;
    for (let enhancement = 0; enhancement < weights.length; enhancement += 1) {
        cumulative += weights[enhancement];
        if (roll < cumulative)
            return enhancement;
    }
    return 0;
}
/** Premium drops may preview a little future gear, but never skip the early progression. */
function getItemSelectionFloor(floor, modeId, quality) {
    if (quality === 'normal')
        return floor;
    const lookAhead = floor >= 12 ? 3 : floor >= 6 ? 2 : floor >= 3 ? 1 : 0;
    return Math.min(getModeConfig(modeId).floors, floor + lookAhead);
}
/** Floor caches are scarcer; their absolute equipment chance stays close to v2.2. */
export function createFloorLoot(floor, random, modeId) {
    const roll = random.next();
    const mode = getModeConfig(modeId);
    if (roll < mode.equipmentWeight)
        return createItem(floor, random, random.pick(['weapon', 'shield', 'armor']), modeId);
    if (roll < mode.equipmentWeight + mode.foodWeight)
        return createItem(floor, random, 'food', modeId);
    return createItem(floor, random, 'potion', modeId);
}
export function createItem(floor, random, kind, modeId = 'beginner', quality = 'normal') {
    const selectionFloor = getItemSelectionFloor(floor, modeId, quality);
    const candidates = TEMPLATES.filter((item) => item.minFloor <= selectionFloor && (!item.modeId || item.modeId === modeId) && (!kind || item.kind === kind));
    const template = random.pick(candidates);
    const baseStat = template.attack ?? template.defense ?? 0;
    const enhancement = template.kind === 'weapon' || template.kind === 'shield' || template.kind === 'armor' ? rollEnhancement(floor, random, quality) : 0;
    // Better equipment is built to last longer: base stat and enhancement both add durability.
    const baseDurability = template.durability ?? 0;
    const maxDurability = baseDurability > 0 ? Math.min(600, baseDurability + baseStat * 7 + enhancement * 12) : 0;
    const durabilityVariance = maxDurability ? random.int(-Math.max(2, Math.floor(maxDurability * 0.08)), 0) : 0;
    const durability = maxDurability ? Math.max(1, maxDurability + durabilityVariance) : 0;
    const statLabel = template.kind === 'weapon' ? '攻撃力' : '防御力';
    const description = template.kind === 'potion' || template.kind === 'food' || template.kind === 'valuable'
        ? template.description
        : `${statLabel} +${baseStat + enhancement}（基本 ${baseStat}${enhancement ? ` +強化 ${enhancement}` : ''}）`;
    return {
        uid: `i-${Date.now().toString(36)}-${nextUid++}-${random.int(100, 999)}`,
        templateId: template.id,
        name: template.name,
        kind: template.kind,
        attack: template.attack ?? 0,
        defense: template.defense ?? 0,
        heal: template.heal ?? 0,
        hungerRestore: template.hungerRestore ?? 0,
        sellValue: template.sellValue,
        enhancement,
        durability: maxDurability > 0 ? durability : undefined,
        maxDurability: maxDurability > 0 ? maxDurability : undefined,
        description,
    };
}
export function itemEnhancement(item) {
    return item.enhancement ?? 0;
}
export function itemDurability(item) {
    return item.durability ?? item.maxDurability ?? 100;
}
export function itemMaxDurability(item) {
    return item.maxDurability ?? item.durability ?? 100;
}
export function itemDisplayName(item) {
    return `${item.name}${itemEnhancement(item) > 0 ? ` +${itemEnhancement(item)}` : ''}`;
}
export function itemIcon(kind) {
    switch (kind) {
        case 'weapon': return '⚔';
        case 'shield': return '⬟';
        case 'armor': return '◈';
        case 'potion': return '⚗';
        case 'food': return '🍞';
        case 'valuable': return '💎';
    }
}
export function itemKindLabel(kind) {
    switch (kind) {
        case 'weapon': return '武器';
        case 'shield': return '盾';
        case 'armor': return '防具';
        case 'potion': return '回復アイテム';
        case 'food': return '食料';
        case 'valuable': return '換金アイテム';
    }
}
