import { describe, expect, it } from "vitest";
import { generateLevel } from "../src/game/generator";

describe("generateLevel", () => {
  it("creates a deterministic room chain with reachable key and exit", () => {
    const first = generateLevel({ seed: 12345, roomCount: 5 });
    const second = generateLevel({ seed: 12345, roomCount: 5 });

    expect(first).toEqual(second);
    expect(first.rooms).toHaveLength(5);
    expect(first.rooms[0].spawnPoint.x).toBeLessThan(first.rooms[0].x + 160);
    expect(first.rooms[0].floorKind).toBe("solid");
    expect(first.rooms[4].floorKind).toBe("solid");
    expect(first.key.roomId).toBe(first.rooms[2].id);
    expect(first.exitGate.roomId).toBe(first.rooms[4].id);
    expect(first.exitGate.isOpen).toBe(false);
  });

  it("adds lava platform rooms without full-width floors", () => {
    const level = generateLevel({ seed: 12345, roomCount: 5 });
    const lavaRooms = level.rooms.filter((room) => room.floorKind === "lava");

    expect(lavaRooms.length).toBeGreaterThan(0);

    for (const room of lavaRooms) {
      expect(room.platforms.every((platform) => platform.width < room.width * 0.5)).toBe(true);
      expect(room.spawnPoint.y).toBeLessThan(room.height - 72);
    }
  });

  it("varies platform positions across seeds", () => {
    const first = generateLevel({ seed: 1001, roomCount: 5 });
    const second = generateLevel({ seed: 2002, roomCount: 5 });
    const firstLayout = first.rooms.flatMap((room) =>
      room.platforms.map((platform) => `${platform.id}:${Math.round(platform.x - room.x)},${platform.y}`)
    );
    const secondLayout = second.rooms.flatMap((room) =>
      room.platforms.map((platform) => `${platform.id}:${Math.round(platform.x - room.x)},${platform.y}`)
    );

    expect(firstLayout).not.toEqual(secondLayout);
  });

  it("keeps platforms within jumpable vertical spacing and room bounds", () => {
    const level = generateLevel({ seed: 8821, roomCount: 6 });

    for (const room of level.rooms) {
      for (const platform of room.platforms) {
        expect(platform.x).toBeGreaterThanOrEqual(room.x);
        expect(platform.x + platform.width).toBeLessThanOrEqual(room.x + room.width);
        expect(platform.y).toBeGreaterThan(80);
        expect(platform.y).toBeLessThanOrEqual(room.height);
        expect(platform.patrolStart).toBeGreaterThanOrEqual(platform.x);
        expect(platform.patrolEnd).toBeLessThanOrEqual(platform.x + platform.width);
      }

      for (let i = 1; i < room.platforms.length; i += 1) {
        const previous = room.platforms[i - 1];
        const current = room.platforms[i];
        expect(previous.y - current.y).toBeLessThanOrEqual(150);
      }
    }
  });

  it("places enemy patrol lanes on their own platform so enemies do not need to jump", () => {
    const level = generateLevel({ seed: 77, roomCount: 5 });

    for (const room of level.rooms) {
      for (const enemy of room.enemySpawns) {
        const platform = room.platforms.find((candidate) => candidate.id === enemy.platformId);
        expect(platform).toBeDefined();
        expect(enemy.x).toBeGreaterThanOrEqual(platform!.patrolStart);
        expect(enemy.x).toBeLessThanOrEqual(platform!.patrolEnd);
        expect(enemy.y).toBe(platform!.y - (enemy.kind === "guard" ? 35 : 34));
      }
    }
  });
});
