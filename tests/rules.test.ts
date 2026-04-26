import { describe, expect, it } from "vitest";
import { enemyTargeting, nextMonsterGeneration } from "../src/game/rules";
import type { EnemyStatus, PlayerStatus } from "../src/game/types";

const basePlayer: PlayerStatus = {
  id: "p1",
  alive: true,
  hidden: false,
  hasKey: false,
  recentlyAttackedUntil: 0
};

const guard: EnemyStatus = { kind: "guard", alertedUntil: 0 };
const monster: EnemyStatus = { kind: "monster", alertedUntil: 0 };

describe("enemyTargeting", () => {
  it("ignores hidden players unless alerted", () => {
    expect(
      enemyTargeting(guard, { ...basePlayer, hidden: true }, 100, 1000)
    ).toMatchObject({
      canSee: false,
      canDamage: false,
      reason: "hidden"
    });

    expect(
      enemyTargeting({ ...guard, alertedUntil: 1200 }, { ...basePlayer, hidden: true }, 100, 1000)
    ).toMatchObject({
      canSee: true,
      canDamage: true,
      reason: "visible"
    });
  });

  it("makes monsters ignore the key carrier", () => {
    expect(
      enemyTargeting(monster, { ...basePlayer, hasKey: true }, 80, 1000)
    ).toMatchObject({
      canSee: false,
      canDamage: false,
      reason: "key-carrier"
    });
  });

  it("lets guards see but not damage the key carrier", () => {
    expect(enemyTargeting(guard, { ...basePlayer, hasKey: true }, 80, 1000)).toMatchObject({
      canSee: true,
      canDamage: false,
      reason: "key-carrier"
    });
  });

  it("does not target players outside sight range", () => {
    expect(enemyTargeting(guard, basePlayer, 400, 1000)).toMatchObject({
      canSee: false,
      canDamage: false,
      reason: "out-of-range"
    });
  });
});

describe("nextMonsterGeneration", () => {
  it("splits early generation monsters into two smaller offspring", () => {
    expect(nextMonsterGeneration(0)).toEqual([1, 1]);
    expect(nextMonsterGeneration(1)).toEqual([2, 2]);
  });

  it("stops splitting after the third generation", () => {
    expect(nextMonsterGeneration(2)).toEqual([]);
  });
});
