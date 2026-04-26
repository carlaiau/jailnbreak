import type { EnemyStatus, PlayerStatus, TargetingDecision } from "./types";

export function enemyTargeting(
  enemy: EnemyStatus,
  player: PlayerStatus,
  distance: number,
  now: number,
  sightRange = 250
): TargetingDecision {
  if (!player.alive || distance > sightRange) {
    return { canSee: false, canDamage: false, reason: "out-of-range" };
  }

  if (player.hasKey && enemy.kind === "monster") {
    return { canSee: false, canDamage: false, reason: "key-carrier" };
  }

  if (player.hidden && now > enemy.alertedUntil && now > player.recentlyAttackedUntil) {
    return { canSee: false, canDamage: false, reason: "hidden" };
  }

  if (player.hasKey) {
    return { canSee: true, canDamage: false, reason: "key-carrier" };
  }

  return { canSee: true, canDamage: true, reason: "visible" };
}

export function nextMonsterGeneration(currentGeneration: number): number[] {
  if (currentGeneration >= 2) {
    return [];
  }

  return [currentGeneration + 1, currentGeneration + 1];
}
