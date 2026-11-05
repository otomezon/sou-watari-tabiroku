/**
 * Derive a stable display-only enemy level from the enemy's final combat stats.
 * Values are evaluated after campaign/floor and rare-form stat modifiers.
 */
export const ENEMY_LEVEL_SCALE = Object.freeze({
    hp: 1,
    attack: 6,
    defense: 4,
    pointsPerLevel: 36,
});

function finiteNonNegative(value) {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getEnemyLevel(monster) {
    const hp = finiteNonNegative(
        Number.isFinite(monster?.maxHp) ? monster.maxHp : monster?.hp,
    );
    const attack = finiteNonNegative(monster?.attack);
    const defense = finiteNonNegative(monster?.defense);
    const power = hp + attack * ENEMY_LEVEL_SCALE.attack + defense * ENEMY_LEVEL_SCALE.defense;
    return Math.max(1, Math.round(power / ENEMY_LEVEL_SCALE.pointsPerLevel));
}
