export type EnemyKind = "guard" | "monster";
export type PlayerId = "p1" | "p2";
export type FloorKind = "solid" | "lava";

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  patrolStart: number;
  patrolEnd: number;
}

export interface SpawnPoint {
  id: string;
  x: number;
  y: number;
  roomId: string;
}

export interface EnemySpawn {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  roomId: string;
  platformId: string;
  packId?: string;
  generation?: number;
}

export interface Crate {
  id: string;
  x: number;
  y: number;
  roomId: string;
}

export interface Key {
  id: string;
  x: number;
  y: number;
  roomId: string;
  collectedBy?: PlayerId;
}

export interface ExitGate {
  id: string;
  x: number;
  y: number;
  roomId: string;
  isOpen: boolean;
}

export interface Room {
  id: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  floorKind: FloorKind;
  platforms: Platform[];
  crates: Crate[];
  enemySpawns: EnemySpawn[];
  spawnPoint: SpawnPoint;
}

export interface GeneratedLevel {
  seed: number;
  roomWidth: number;
  roomHeight: number;
  rooms: Room[];
  key: Key;
  exitGate: ExitGate;
  playerSpawns: Record<PlayerId, SpawnPoint>;
}

export interface PlayerStatus {
  id: PlayerId;
  hidden: boolean;
  hasKey: boolean;
  alive: boolean;
  recentlyAttackedUntil: number;
}

export interface EnemyStatus {
  kind: EnemyKind;
  alertedUntil: number;
}

export interface TargetingDecision {
  canSee: boolean;
  canDamage: boolean;
  reason: "visible" | "hidden" | "key-carrier" | "out-of-range";
}
