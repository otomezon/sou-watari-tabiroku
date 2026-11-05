import { itemDurability, itemMaxDurability, itemEnhancement } from "./items.js";
function roundPrice(value) {
    return Math.max(5, Math.round(value / 5) * 5);
}
/** Buy prices scale gently with depth and gear quality. */
export function getShopBuyPrice(item, floor) {
    const depth = Math.max(0, floor - 1) * 3;
    if (item.kind === 'valuable')
        return roundPrice((item.sellValue ?? 10) * 1.7 + depth);
    if (item.kind === 'weapon')
        return roundPrice(65 + item.attack * 38 + itemEnhancement(item) * 42 + depth);
    if (item.kind === 'shield' || item.kind === 'armor')
        return roundPrice(60 + item.defense * 42 + itemEnhancement(item) * 38 + depth);
    if (item.kind === 'potion')
        return roundPrice(40 + item.heal * 1.7 + (item.hungerRestore ?? 0) * 1.2 + depth);
    return roundPrice(24 + (item.hungerRestore ?? 0) * 1.1 + depth);
}
/** Shopkeepers buy at a reduced value; broken equipment is worth very little. */
export function getShopSellPrice(item, floor) {
    if (item.kind === 'valuable')
        return roundPrice((item.sellValue ?? 10) * 0.9 + Math.max(0, floor - 1) * 2);
    const condition = item.kind === 'weapon' || item.kind === 'shield' || item.kind === 'armor'
        ? 0.25 + 0.75 * (itemDurability(item) / Math.max(1, itemMaxDurability(item)))
        : 1;
    const rate = item.kind === 'food' || item.kind === 'potion' ? 0.38 : 0.46;
    return Math.max(5, roundPrice(getShopBuyPrice(item, floor) * rate * condition));
}
export function remainingShopGoods(goods) {
    return goods.filter((good) => !good.sold && !good.stolen);
}
/** Picked-up items stay in the shop ledger until they are paid for. */
export function unpaidShopGoods(goods) {
    return goods.filter((good) => good.stolen && !good.sold);
}
