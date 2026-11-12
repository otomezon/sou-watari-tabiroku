import { itemDurability, itemMaxDurability, itemEnhancement } from "./items.js";
function roundPrice(value) {
    return Math.max(5, Math.round(value / 5) * 5);
}
/** Base prices keep resale values stable even when premium gear costs more to buy. */
function getBaseShopBuyPrice(item, floor) {
    const depth = Math.max(0, floor - 1) * 3;
    if (item.kind === 'valuable')
        return roundPrice((item.sellValue ?? 10) * 1.7 + depth);
    if (item.kind === 'weapon')
        return roundPrice(65 + item.attack * 38 + itemEnhancement(item) * 42 + depth);
    if (item.kind === 'shield' || item.kind === 'armor')
        return roundPrice(60 + item.defense * 42 + itemEnhancement(item) * 38 + depth);
    if (item.kind === 'potion') {
        const heal = Math.max(0, item.heal ?? 0);
        const healRate = heal >= 100 ? 2.8 : heal >= 80 ? 2.6 : heal >= 50 ? 2.3 : heal >= 25 ? 2.0 : 1.7;
        return roundPrice(40 + heal * healRate + (item.hungerRestore ?? 0) * 1.5 + depth);
    }
    if (item.kind === 'food') {
        const hunger = Math.max(0, item.hungerRestore ?? 0);
        const hungerRate = hunger >= 85 ? 1.55 : hunger >= 65 ? 1.40 : hunger >= 45 ? 1.25 : 1.1;
        return roundPrice(24 + hunger * hungerRate + depth);
    }
    return roundPrice(24 + (item.hungerRestore ?? 0) * 1.1 + depth);
}
function getEquipmentPriceMultiplier(item) {
    const power = (item.kind === 'weapon' ? item.attack : item.defense) + itemEnhancement(item);
    if (power >= 16) return 1.40;
    if (power >= 12) return 1.25;
    if (power >= 8) return 1.12;
    return 1;
}
/** Stronger equipment costs more; basic gear and consumables keep their former prices. */
export function getShopBuyPrice(item, floor) {
    const basePrice = getBaseShopBuyPrice(item, floor);
    if (item.kind !== 'weapon' && item.kind !== 'shield' && item.kind !== 'armor')
        return basePrice;
    return roundPrice(basePrice * getEquipmentPriceMultiplier(item));
}
/** Shopkeepers buy at a reduced value; broken equipment is worth very little. */
export function getShopSellPrice(item, floor) {
    if (item.kind === 'valuable') {
        const valueRate = floor >= 20 ? 0.78 : floor >= 10 ? 0.84 : 0.9;
        return roundPrice((item.sellValue ?? 10) * valueRate + Math.max(0, floor - 1) * 2);
    }
    const condition = item.kind === 'weapon' || item.kind === 'shield' || item.kind === 'armor'
        ? 0.25 + 0.75 * (itemDurability(item) / Math.max(1, itemMaxDurability(item)))
        : 1;
    const rate = item.kind === 'food' || item.kind === 'potion' ? 0.38 : 0.46;
    return Math.max(5, roundPrice(getBaseShopBuyPrice(item, floor) * rate * condition));
}
export function remainingShopGoods(goods) {
    return goods.filter((good) => !good.sold && !good.stolen);
}
/** Picked-up items stay in the shop ledger until they are paid for. */
export function unpaidShopGoods(goods) {
    return goods.filter((good) => good.stolen && !good.sold);
}
