export const RARE_VALUABLE_DROP_CHANCES = Object.freeze({ hunter: 0.16, otherRare: 0.055 });
export const RARE_GOLD_DROP_CHANCE_MULTIPLIER = 1.75;
export const RARE_GOLD_AMOUNT_MULTIPLIER = 1.75;

export function getRegularMonsterDepthScale() {
    // The blanket expert-floor 26+ reduction was removed in v5.1.7.
    return 1;
}

export const FOOD_HUNGER_MULTIPLIER = 1.25;
export const POTION_HP_MULTIPLIER = 1.75;

export function getItemRecovery(item) {
    const rawHeal = Number.isFinite(item?.heal) ? Math.max(0, item.heal) : 0;
    const rawHunger = Number.isFinite(item?.hungerRestore) ? Math.max(0, item.hungerRestore) : 0;
    if (item?.kind === 'food') return { heal: 0, hungerRestore: Math.round(rawHunger * FOOD_HUNGER_MULTIPLIER) };
    if (item?.kind === 'potion') return { heal: Math.round(rawHeal * POTION_HP_MULTIPLIER), hungerRestore: rawHunger };
    return { heal: rawHeal, hungerRestore: rawHunger };
}
export function itemDescription(item) {
    if (item?.kind === 'food') return `満腹度を${getItemRecovery(item).hungerRestore}回復`;
    if (item?.kind === 'potion') {
        const recovery = getItemRecovery(item);
        return `HPを${recovery.heal}・満腹度を${recovery.hungerRestore}回復`;
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
