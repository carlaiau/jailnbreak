import { SeededRandom } from "./random";
import type { EnemySpawn, FloorKind, GeneratedLevel, Platform, Room, SpawnPoint } from "./types";

const ROOM_WIDTH = 960;
const ROOM_HEIGHT = 540;
const FLOOR_HEIGHT = 36;
const PLAYER_START_Y = ROOM_HEIGHT - FLOOR_HEIGHT - 48;

export interface GenerateOptions {
  seed: number;
  roomCount?: number;
}

export function generateLevel({ seed, roomCount = 5 }: GenerateOptions): GeneratedLevel {
  const rng = new SeededRandom(seed);
  const rooms: Room[] = [];
  const lavaRooms = chooseLavaRooms(rng, roomCount);

  for (let index = 0; index < roomCount; index += 1) {
    const roomX = index * ROOM_WIDTH;
    const roomId = `room-${index}`;
    const floorKind: FloorKind = lavaRooms.has(index) ? "lava" : "solid";
    const platforms = buildPlatforms(rng, roomId, roomX, index, floorKind);
    const spawnPlatform = platforms[0];
    const upperPlatform = platforms[platforms.length - 1];
    const spawnPoint = buildSpawnPoint(roomId, index, roomX, spawnPlatform, floorKind);
    const crates = [
      {
        id: `crate-${index}-0`,
        x: clamp(spawnPlatform.x + spawnPlatform.width * 0.62 + rng.integer(-18, 22), roomX + 48, roomX + ROOM_WIDTH - 48),
        y: spawnPlatform.y - 32,
        roomId
      },
      {
        id: `crate-${index}-1`,
        x: clamp(platforms[1].x + platforms[1].width * 0.55 + rng.integer(-28, 28), roomX + 48, roomX + ROOM_WIDTH - 48),
        y: platforms[1].y - 32,
        roomId
      }
    ];

    const enemySpawns = buildEnemies(rng, roomId, index, platforms);
    rooms.push({
      id: roomId,
      index,
      x: roomX,
      y: 0,
      width: ROOM_WIDTH,
      height: ROOM_HEIGHT,
      floorKind,
      platforms,
      crates,
      enemySpawns,
      spawnPoint
    });

    if (index === roomCount - 1) {
      crates.push({
        id: `crate-${index}-exit`,
        x: roomX + 740,
        y: upperPlatform.y - 32,
        roomId
      });
    }
  }

  const keyRoom = rooms[Math.max(1, Math.floor(roomCount / 2))];
  const keyPlatform = keyRoom.platforms[2];
  const finalRoom = rooms[rooms.length - 1];
  const exitPlatform = finalRoom.platforms[finalRoom.platforms.length - 1];

  return {
    seed,
    roomWidth: ROOM_WIDTH,
    roomHeight: ROOM_HEIGHT,
    rooms,
    key: {
      id: "freedom-key",
      x: keyPlatform.x + keyPlatform.width * 0.5,
      y: keyPlatform.y - 34,
      roomId: keyRoom.id
    },
    exitGate: {
      id: "exit-gate",
      x: exitPlatform.x + exitPlatform.width - 58,
      y: exitPlatform.y - 78,
      roomId: finalRoom.id,
      isOpen: false
    },
    playerSpawns: {
      p1: { ...rooms[0].spawnPoint, id: "p1-start" },
      p2: { ...rooms[0].spawnPoint, id: "p2-start", x: rooms[0].spawnPoint.x + 44 }
    }
  };
}

function chooseLavaRooms(rng: SeededRandom, roomCount: number): Set<number> {
  const lavaRooms = new Set<number>();
  const candidates = Array.from({ length: Math.max(0, roomCount - 2) }, (_, index) => index + 1);

  for (const index of candidates) {
    if (rng.next() < 0.45) {
      lavaRooms.add(index);
    }
  }

  if (candidates.length > 0 && lavaRooms.size === 0) {
    lavaRooms.add(candidates[Math.floor(candidates.length / 2)]);
  }

  return lavaRooms;
}

function buildPlatforms(
  rng: SeededRandom,
  roomId: string,
  roomX: number,
  index: number,
  floorKind: FloorKind
): Platform[] {
  if (floorKind === "lava") {
    return buildLavaRoomPlatforms(rng, roomId, roomX, index);
  }

  const floor: Platform = {
    id: `${roomId}-floor`,
    x: roomX,
    y: ROOM_HEIGHT - FLOOR_HEIGHT,
    width: ROOM_WIDTH,
    height: FLOOR_HEIGHT,
    patrolStart: roomX + 80,
    patrolEnd: roomX + ROOM_WIDTH - 100
  };

  const lowX = roomX + 165 + rng.integer(-55, 75);
  const midX = roomX + 455 + rng.integer(-85, 65);
  const highX = roomX + 665 + rng.integer(-80, 45);
  const middleY = 390 - rng.integer(0, 36);
  const highY = 272 - rng.integer(0, 32);
  const topY = 166 - rng.integer(0, 30);
  const lowWidth = 250 + rng.integer(0, 95);
  const midWidth = 230 + rng.integer(0, 85);
  const highWidth = 190 + rng.integer(0, 70);
  const lowActualX = clamp(lowX, roomX + 90, roomX + ROOM_WIDTH - lowWidth - 90);
  const midActualX = clamp(midX, roomX + 260, roomX + ROOM_WIDTH - midWidth - 80);
  const highActualX = clamp(highX, roomX + 560, roomX + ROOM_WIDTH - highWidth - 48);

  return [
    floor,
    {
      id: `${roomId}-low`,
      x: lowActualX,
      y: middleY,
      width: lowWidth,
      height: 24,
      patrolStart: lowActualX + 30,
      patrolEnd: lowActualX + lowWidth - 30
    },
    {
      id: `${roomId}-mid`,
      x: midActualX,
      y: highY,
      width: midWidth,
      height: 24,
      patrolStart: midActualX + 30,
      patrolEnd: midActualX + midWidth - 30
    },
    {
      id: `${roomId}-high-${index}`,
      x: highActualX,
      y: topY,
      width: highWidth,
      height: 24,
      patrolStart: highActualX + 28,
      patrolEnd: highActualX + highWidth - 28
    }
  ];
}

function buildLavaRoomPlatforms(
  rng: SeededRandom,
  roomId: string,
  roomX: number,
  index: number
): Platform[] {
  const leftWidth = 165 + rng.integer(0, 45);
  const rightWidth = 160 + rng.integer(0, 55);
  const midWidth = 205 + rng.integer(0, 70);
  const highWidth = 180 + rng.integer(0, 70);
  const upperWidth = 160 + rng.integer(0, 55);
  const leftY = 460 - rng.integer(0, 18);
  const rightY = 454 - rng.integer(0, 20);
  const midY = 360 - rng.integer(0, 34);
  const highY = 260 - rng.integer(0, 35);
  const upperY = 168 - rng.integer(0, 22);
  const leftX = roomX + 24 + rng.integer(0, 42);
  const midX = roomX + 265 + rng.integer(-55, 65);
  const highX = roomX + 505 + rng.integer(-55, 70);
  const upperX = roomX + 680 + rng.integer(-40, 50);
  const rightX = roomX + ROOM_WIDTH - rightWidth - 22 - rng.integer(0, 36);

  return [
    platform(`${roomId}-lava-left-${index}`, leftX, leftY, leftWidth),
    platform(`${roomId}-lava-right-${index}`, rightX, rightY, rightWidth),
    platform(`${roomId}-lava-mid-${index}`, clamp(midX, roomX + 190, roomX + 475), midY, midWidth),
    platform(`${roomId}-lava-high-${index}`, clamp(highX, roomX + 430, roomX + 700), highY, highWidth),
    platform(`${roomId}-lava-upper-${index}`, clamp(upperX, roomX + 620, roomX + ROOM_WIDTH - upperWidth - 42), upperY, upperWidth)
  ];
}

function platform(id: string, x: number, y: number, width: number): Platform {
  return {
    id,
    x,
    y,
    width,
    height: 24,
    patrolStart: x + 28,
    patrolEnd: x + width - 28
  };
}

function buildSpawnPoint(
  roomId: string,
  index: number,
  roomX: number,
  spawnPlatform: Platform,
  floorKind: FloorKind
): SpawnPoint {
  if (floorKind === "lava") {
    return {
      id: `spawn-${index}`,
      x: spawnPlatform.x + 44,
      y: spawnPlatform.y - 48,
      roomId
    };
  }

  return {
    id: `spawn-${index}`,
    x: roomX + 88,
    y: PLAYER_START_Y,
    roomId
  };
}

function buildEnemies(
  rng: SeededRandom,
  roomId: string,
  roomIndex: number,
  platforms: Platform[]
): EnemySpawn[] {
  const enemies: EnemySpawn[] = [];
  const guardPlatform = roomIndex === 0 ? platforms[1] : platforms[roomIndex % 2 === 0 ? 0 : 1];
  const packSize = roomIndex === 0 ? 1 : rng.integer(2, 3);
  const packId = `${roomId}-guards`;

  for (let i = 0; i < packSize; i += 1) {
    enemies.push({
      id: `${packId}-${i}`,
      kind: "guard",
      roomId,
      platformId: guardPlatform.id,
      packId,
      x: roomIndex === 0 ? guardPlatform.patrolEnd - i * 38 : guardPlatform.patrolStart + i * 38,
      y: guardPlatform.y - 35
    });
  }

  if (roomIndex > 0) {
    const monsterPlatform = platforms[2];
    enemies.push({
      id: `${roomId}-monster-0`,
      kind: "monster",
      roomId,
      platformId: monsterPlatform.id,
      generation: 0,
      x: monsterPlatform.patrolStart + rng.integer(0, 80),
      y: monsterPlatform.y - 34
    });
  }

  return enemies;
}

export function getAllPlatforms(level: GeneratedLevel): Platform[] {
  return level.rooms.flatMap((room) => room.platforms);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
