import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGame, GameEngine } from '../assets/engine.js';
import { MODE_ORDER, getModeConfig, getBossStats } from '../assets/modes.js';

test('all normal floors in all five campaigns generate within calibrated encounter ranges', () => {
  for (const modeId of MODE_ORDER) {
    const mode = getModeConfig(modeId);
    for (const seed of [0x51212026, 0x71a2b3c4]) {
      const state = createNewGame(seed, modeId);
      const engine = new GameEngine(state);

      for (let floor = 1; floor < mode.floors; floor += 1) {
        assert.equal(state.floor, floor);
        const reducedOpening = floor <= 2 || modeId === 'tutorial';
        const minimumAllowed = Math.max(2, mode.minMonsters - (reducedOpening || floor === 3 ? 1 : 0));
        const maximumAllowed = mode.maxMonsters - (reducedOpening ? 1 : 0) + (floor === 3 && modeId !== 'tutorial' ? 1 : 0);
        assert.ok(state.monsters.length >= minimumAllowed && state.monsters.length <= maximumAllowed,
          `${modeId} floor ${floor}: ${state.monsters.length} monsters outside ${minimumAllowed}–${maximumAllowed}`);

        for (const monster of state.monsters) {
          assert.ok(monster.hp > 0 && monster.maxHp >= monster.hp, `${modeId} floor ${floor}: invalid HP`);
          assert.ok(monster.attack >= 1 && monster.defense >= 0, `${modeId} floor ${floor}: invalid combat stats`);
          const distance = Math.max(
            Math.abs(monster.x - state.dungeon.start.x),
            Math.abs(monster.y - state.dungeon.start.y),
          );
          if (floor <= 2) assert.ok(distance >= 4, `${modeId} floor ${floor}: spawn too close to entrance`);
        }

        state.player.x = state.dungeon.stairs.x;
        state.player.y = state.dungeon.stairs.y;
        assert.equal(engine.descend(), true, `${modeId} could not descend from floor ${floor}`);
      }

      assert.equal(state.floor, mode.floors);
      assert.equal(state.monsters.filter((monster) => monster.boss).length, 1);
      assert.equal(state.monsters.length, mode.bossFloorMonsters + 1);
      const boss = state.monsters.find((monster) => monster.boss);
      assert.equal(boss.bossBalanceVersion, 2);
      assert.deepEqual(
        { hp: boss.maxHp, attack: boss.attack, defense: boss.defense },
        getBossStats(modeId, boss.actionSpeed),
      );
    }
  }
});
