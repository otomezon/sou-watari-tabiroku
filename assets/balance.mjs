export const RARE_VALUABLE_DROP_CHANCES = Object.freeze({ hunter: 0.12, otherRare: 0.04 });
export const RARE_GOLD_DROP_CHANCE_MULTIPLIER = 1.5;
export const RARE_GOLD_AMOUNT_MULTIPLIER = 1.5;
export const NORMAL_GOLD_AMOUNT_MULTIPLIER = 0.72;

/** Smoothly ease only the final expert floors; all other campaigns keep their authored curve. */
export function getRegularMonsterDepthScale(modeId, floor) {
    if (modeId !== 'expert' || !Number.isFinite(floor) || floor <= 20) return 1;
    const progress = Math.min(1, Math.max(0, (floor - 20) / 10));
    return 1 - progress * 0.06;
}

/**
 * Level targets are calculated from the real EXP curve, average generated
 * monster counts/EXP by tier, and a 90% normal-monster defeat rate. This models
 * deliberate, near-clear exploration rather than rushing past most encounters.
 * It is a balance target, not a cap; rare encounters and skipped floors vary.
 */
export const EXPECTED_MONSTER_KILL_RATE = 0.90;
export const EXPECTED_PLAYER_LEVELS = Object.freeze({
    tutorial: Object.freeze([1, 2, 3, 4, 5]),
    beginner: Object.freeze([1, 2, 4, 5, 6, 7, 8, 9, 10, 11]),
    intermediate: Object.freeze([1, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 19]),
    advanced: Object.freeze([1, 3, 4, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 26, 27, 28, 30, 31]),
    expert: Object.freeze([1, 3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 33, 34, 36, 37, 39, 41]),
});

export function getExpectedPlayerLevel(modeId, floor) {
    const levels = EXPECTED_PLAYER_LEVELS[modeId] ?? EXPECTED_PLAYER_LEVELS.beginner;
    const numericFloor = Number.isFinite(floor) ? Math.floor(floor) : 1;
    const index = Math.min(levels.length - 1, Math.max(0, numericFloor - 1));
    return levels[index] ?? 1;
}

export function getMonsterLevelForFloor(modeId, floor, levelOffset = 0) {
    const offset = Number.isFinite(levelOffset) ? Math.round(levelOffset) : 0;
    return Math.max(1, Math.min(99, getExpectedPlayerLevel(modeId, floor) + offset));
}

/** Keep tier-adjacent monsters distinct without allowing one tier roll to spike combat. */
export function getMonsterLevelStatMultiplier(monsterLevel, expectedPlayerLevel) {
    const delta = Math.max(-4, Math.min(4, monsterLevel - expectedPlayerLevel));
    return Math.max(0.85, Math.min(1.15, 1 + delta * 0.045));
}

/** Spread the expert sixth-tier introduction across floors 25–29. */
export function getMonsterTierProgress(modeId, floor, totalFloors) {
    const denominator = Math.max(1, totalFloors - 2);
    const progress = Math.min(1, Math.max(0, (floor - 1) / denominator));
    return modeId === 'expert' ? Math.pow(progress, 1.15) : progress;
}

/** Small, campaign-wide pressure ramp applied to every ordinary floor. */
const FLOOR_STAT_BONUS = Object.freeze({
    tutorial: 0.02,
    beginner: 0.025,
    intermediate: 0.035,
    advanced: 0.045,
    expert: 0.05,
});

export function getFloorStatAdjustment(modeId, floor, totalFloors) {
    const maxBonus = FLOOR_STAT_BONUS[modeId] ?? FLOOR_STAT_BONUS.beginner;
    const denominator = Math.max(1, totalFloors - 2);
    const progress = Number.isFinite(floor)
        ? Math.min(1, Math.max(0, (floor - 1) / denominator))
        : 0;
    return 1 + maxBonus * progress;
}

/** Upper-tier monsters enter at 94% strength and reach full stats during the hand-off. */
export function getMonsterTierEntryMultiplier(tierBlend) {
    if (!tierBlend || tierBlend.upperTierIndex === tierBlend.lowerTierIndex) return 1;
    const chance = Number.isFinite(tierBlend.upperChance)
        ? Math.min(1, Math.max(0, tierBlend.upperChance))
        : 0;
    return 0.94 + chance * 0.06;
}

export function canSpawnRareMonster(modeId) {
    return modeId !== 'tutorial';
}

export function canSpawnMagicEater(modeId) {
    return modeId !== 'tutorial' && modeId !== 'beginner';
}

/** Preserve rare-form identity while taking the sharpest late-game spikes down slightly. */
export function getRareHunterStatScale(modeId, floor) {
    if (modeId === 'expert' && Number.isFinite(floor) && floor >= 26) {
        return { hp: 1.55, attack: 1.15, defense: 4 };
    }
    return { hp: 1.70, attack: 1.25, defense: 6 };
}

export function getSlowVariantAttackMultiplier(modeId, floor) {
    return modeId === 'expert' && Number.isFinite(floor) && floor >= 26 ? 1.9 : 2.3;
}

export function getRareValuableDropChances(modeId) {
    // Preserve the original early-campaign reward loop; economy tuning starts at intermediate.
    return modeId === 'tutorial' || modeId === 'beginner'
        ? { hunter: 0.16, otherRare: 0.055 }
        : RARE_VALUABLE_DROP_CHANCES;
}

export function getGoldDropChance(baseChance, rareVariant = false, modeId = 'expert') {
    const rareMultiplier = modeId === 'tutorial' || modeId === 'beginner'
        ? 1.75
        : RARE_GOLD_DROP_CHANCE_MULTIPLIER;
    return rareVariant ? Math.min(0.60, baseChance * rareMultiplier) : baseChance;
}

export function getGoldDropAmount(randomBase, rareVariant = false, modeId = 'expert') {
    const earlyCampaign = modeId === 'tutorial' || modeId === 'beginner';
    const multiplier = earlyCampaign
        ? (rareVariant ? 1.75 : 0.85)
        : (rareVariant ? RARE_GOLD_AMOUNT_MULTIPLIER : NORMAL_GOLD_AMOUNT_MULTIPLIER);
    return Math.round(randomBase * multiplier);
}

export const FOOD_HUNGER_MULTIPLIER = 1.25;
export const POTION_HP_MULTIPLIER = 1.75;

/** Potion template values are fixed amounts scaled by the original 1.75 multiplier. */
export function getItemRecovery(item, _maxHp = 100) {
    const rawHeal = Number.isFinite(item?.heal) ? Math.max(0, item.heal) : 0;
    const rawHunger = Number.isFinite(item?.hungerRestore) ? Math.max(0, item.hungerRestore) : 0;
    if (item?.kind === 'food') {
        return { heal: 0, hungerRestore: Math.round(rawHunger * FOOD_HUNGER_MULTIPLIER) };
    }
    if (item?.kind === 'potion') {
        return { heal: Math.round(rawHeal * POTION_HP_MULTIPLIER), hungerRestore: rawHunger };
    }
    return { heal: rawHeal, hungerRestore: rawHunger };
}
export function itemDescription(item) {
    if (item?.kind === 'food') return `満腹度を${getItemRecovery(item).hungerRestore}回復`;
    if (item?.kind === 'potion') {
        const recovery = getItemRecovery(item);
        return `HPを${recovery.heal}回復・満腹度を${recovery.hungerRestore}回復`;
    }
    return typeof item?.description === 'string' ? item.description : '';
}
export function getMonsterTierBlend(progress, maxTier) {
    const tierCount = Number.isFinite(maxTier) ? Math.max(1, Math.floor(maxTier)) : 1;
    const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
    const position = p * (tierCount - 1);
    const lowerTierIndex = Math.floor(position);
    const upperTierIndex = Math.min(tierCount - 1, lowerTierIndex + 1);
    const fraction = upperTierIndex === lowerTierIndex ? 0 : position - lowerTierIndex;
    const upperChance = fraction * fraction * (3 - 2 * fraction);
    return { lowerTierIndex, upperTierIndex, upperChance };
}
