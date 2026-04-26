import Phaser from "phaser";
import { generateLevel, getAllPlatforms } from "../game/generator";
import { enemyTargeting, nextMonsterGeneration } from "../game/rules";
import type {
  EnemyKind,
  GeneratedLevel,
  Platform,
  PlayerCount,
  Room,
  PlayerId,
  PlayerStatus,
  SpawnPoint
} from "../game/types";

type ControlSet = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  attack: Phaser.Input.Keyboard.Key;
  hide: Phaser.Input.Keyboard.Key;
};

type AttackMove = {
  animation: "punch" | "kick";
  range: number;
  damage: number;
  knockback: number;
};

type PlayerActor = {
  id: PlayerId;
  sprite: Phaser.Physics.Arcade.Sprite;
  boxOverlay: Phaser.GameObjects.Image;
  controls: ControlSet;
  status: PlayerStatus;
  facing: 1 | -1;
  health: number;
  spawn: SpawnPoint;
  climbing: boolean;
  activeLadder?: LadderZone;
  damageCooldownUntil: number;
  attackCooldownUntil: number;
  animationLockUntil: number;
};

type EnemyActor = {
  id: string;
  kind: EnemyKind;
  packId?: string;
  packIndex: number;
  generation: number;
  sprite: Phaser.Physics.Arcade.Sprite;
  health: number;
  direction: 1 | -1;
  speed: number;
  patrolStart: number;
  patrolEnd: number;
  alertedUntil: number;
  attackCooldownUntil: number;
};

type LadderZone = {
  x: number;
  topY: number;
  bottomY: number;
  width: number;
};

const PLAYER_SPEED = 185;
const HIDDEN_SPEED = 105;
const JUMP_SPEED = -580;
const CLIMB_SPEED = 145;
const DAMAGE_COOLDOWN = 900;
const ATTACK_COOLDOWN = 330;
const ATTACK_MOVES: AttackMove[] = [
  { animation: "punch", range: 38, damage: 1, knockback: 150 },
  { animation: "kick", range: 52, damage: 2, knockback: 270 }
];

export class GameScene extends Phaser.Scene {
  private level!: GeneratedLevel;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private lavaZones!: Phaser.Physics.Arcade.StaticGroup;
  private ladderZones: LadderZone[] = [];
  private crates!: Phaser.GameObjects.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private players: PlayerActor[] = [];
  private enemyActors: EnemyActor[] = [];
  private keySprite?: Phaser.Physics.Arcade.Sprite;
  private gateSprite!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  private hud!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private won = false;
  private playerCount: PlayerCount = 2;

  constructor() {
    super("GameScene");
  }

  create(data?: { playerCount?: PlayerCount }): void {
    const seedParam = new URLSearchParams(window.location.search).get("seed");
    const playerCountParam = new URLSearchParams(window.location.search).get("players");
    const seed = seedParam ? Number(seedParam) : Date.now() % 1000000;
    this.playerCount = data?.playerCount ?? (playerCountParam === "1" ? 1 : 2);
    this.level = generateLevel({ seed: Number.isFinite(seed) ? seed : 1984, roomCount: 5 });
    this.won = false;
    this.enemyActors = [];
    this.players = [];

    this.physics.world.setBounds(0, 0, this.level.rooms.length * this.level.roomWidth, this.level.roomHeight);
    this.cameras.main.setBounds(
      0,
      0,
      this.level.rooms.length * this.level.roomWidth,
      this.level.roomHeight
    );
    this.createBackground();
    this.createPlatforms();
    this.createLadders();
    this.createLavaZones();
    this.createCrates();
    this.createPlayers();
    this.createCollectibles();
    this.createEnemies();
    this.createHud();
    this.wireCollisions();

    this.input.keyboard?.on("keydown-ONE", () => this.switchPlayerCount(1));
    this.input.keyboard?.on("keydown-TWO", () => this.switchPlayerCount(2));
  }

  update(time: number): void {
    for (const player of this.players) {
      this.updatePlayer(player, time);
    }

    for (const enemy of [...this.enemyActors]) {
      this.updateEnemy(enemy, time);
    }

    this.updateCamera();
    this.updateHud();
  }

  private createBackground(): void {
    this.addWallBaseTiles();

    for (const room of this.level.rooms) {
      this.addRoomNumberGraffiti(room);
      this.addRoomWindows(room);
      this.addRoomDecor(room);
      if (room.index < this.level.rooms.length - 1) {
        this.add
          .rectangle(room.x + room.width - 10, this.level.roomHeight - 84, 20, 96, 0x06090b, 0.88)
          .setDepth(-8);
      }
      if (room.floorKind === "lava") {
        this.add
          .rectangle(room.x + room.width / 2, this.level.roomHeight - 21, room.width, 42, 0x421713, 0.7)
          .setDepth(-7);
      }
    }
  }

  private addRoomNumberGraffiti(room: Room): void {
    const x = room.x + 250 + this.seededInt(room.index, 500, Math.max(1, room.width - 500));
    const y = 150 + this.seededInt(room.index, 501, 210);
    const rotation = Phaser.Math.DegToRad(this.seededInt(room.index, 502, 23) - 11);
    const label = String(room.index + 1).padStart(2, "0");
    const paint = 0x6f7d79;

    this.add
      .text(x, y, label, {
        fontFamily: "Impact, ui-monospace, monospace",
        fontSize: "76px",
        fontStyle: "900",
        color: "#6f7d79",
        stroke: "#0a1214",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setRotation(rotation)
      .setAlpha(0.34)
      .setDepth(-17);

    for (let i = 0; i < 9; i += 1) {
      const dotX = x + this.seededInt(room.index, 520 + i, 120) - 60;
      const dotY = y + this.seededInt(room.index, 540 + i, 92) - 46;
      this.add
        .circle(dotX, dotY, 1 + this.seededInt(room.index, 560 + i, 3), paint, 0.16)
        .setDepth(-17);
    }
  }

  private addWallBaseTiles(): void {
    const tileSize = 128;
    const worldWidth = this.level.rooms.length * this.level.roomWidth;
    const columns = Math.ceil(worldWidth / tileSize);
    const rows = Math.ceil(this.level.roomHeight / tileSize);
    const tints = [0xffffff, 0xeaf6f1, 0xe9f0ff, 0xdff2ec];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const roomIndex = Math.min(this.level.rooms.length - 1, Math.floor((column * tileSize) / this.level.roomWidth));
        const salt = 300 + column * 37 + row * 71;
        const useVariant = this.seededInt(roomIndex, salt + 4, 100) < 34;
        const wallTile = useVariant
          ? this.add.image(
              column * tileSize,
              row * tileSize,
              "bg-wall-variants",
              this.seededInt(roomIndex, salt + 5, 8)
            )
          : this.add.image(column * tileSize, row * tileSize, "bg-wall-tile");

        wallTile
          .setOrigin(0)
          .setDepth(-40)
          .setAlpha(0.95 + this.seededInt(roomIndex, salt, 6) / 100)
          .setTint(tints[this.seededInt(roomIndex, salt + 1, tints.length)]);

        wallTile.setFlipX(this.seededInt(roomIndex, salt + 2, 2) === 0);
        wallTile.setFlipY(this.seededInt(roomIndex, salt + 3, 4) === 0);
      }
    }
  }

  private addRoomWindows(room: Room): void {
    const windowCount = room.index % 2 === 0 ? 4 : 2;
    const windowScale = 0.72;
    const beamScale = 0.7;

    for (let i = 0; i < windowCount; i += 1) {
      const x =
        room.x +
        room.width * ((i + 1) / (windowCount + 1)) +
        this.seededInt(room.index, 100 + i, 34) -
        17;
      const y = 50 + this.seededInt(room.index, 120 + i, 34);

      this.add
        .image(x, y + 96, "bg-window-light-beam")
        .setScale(beamScale)
        .setAlpha(0.42)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(-28);
      this.add.image(x, y, "bg-barred-window").setScale(windowScale).setDepth(-18);
    }
  }

  private addRoomDecor(room: Room): void {
    const ventX = room.x + 180 + this.seededInt(room.index, 180, room.width - 360);
    const ventY = 250 + this.seededInt(room.index, 181, 180);
    this.add.image(ventX, ventY, "bg-wall-vent").setAlpha(0.82).setDepth(-16);

    const pipeScale = 0.55;
    const pipeBaseX = room.x + 28 + this.seededInt(room.index, 230, 48);
    const pipeBaseY = this.level.roomHeight - 72;
    this.add
      .image(pipeBaseX, pipeBaseY, "bg-pipe-set", 0)
      .setScale(pipeScale)
      .setAlpha(0.68)
      .setDepth(-24);
    this.add
      .image(pipeBaseX, pipeBaseY - 34, "bg-pipe-set", 4)
      .setScale(pipeScale)
      .setAlpha(0.58)
      .setDepth(-24);

    if (room.index % 3 === 1) {
      const sideY = this.level.roomHeight - 92;
      this.add
        .image(room.x + room.width - 78, sideY, "bg-pipe-set", 1)
        .setScale(pipeScale)
        .setAlpha(0.56)
        .setDepth(-24);
      this.add
        .image(room.x + room.width - 42, sideY, "bg-pipe-set", 2)
        .setScale(pipeScale)
        .setAlpha(0.56)
        .setDepth(-24);
    }
  }

  private seededInt(roomIndex: number, salt: number, maxExclusive: number): number {
    const value = Math.sin((this.level.seed + 1) * 12.9898 + roomIndex * 78.233 + salt * 37.719);
    return Math.floor((value - Math.floor(value)) * maxExclusive);
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    for (const platform of getAllPlatforms(this.level)) {
      const body = this.platforms
        .create(platform.x + platform.width / 2, platform.y + platform.height / 2, "tile")
        .setDisplaySize(platform.width, platform.height)
        .setVisible(false)
        .refreshBody();
      body.setData("platformId", platform.id);

      this.renderPlatformArt(platform);
      const room = this.getRoomForX(platform.x + platform.width * 0.5);
      if (room) {
        this.addPlatformFoliage(platform, room);
      }
    }
  }

  private renderPlatformArt(platform: Platform): void {
    if (platform.height >= 32) {
      this.renderFloorArt(platform);
      return;
    }

    this.renderFloatingPlatformArt(platform);
  }

  private addPlatformFoliage(platform: Platform, room: Room): void {
    const isFloor = platform.height >= 32;
    const platformIndex = Math.max(0, room.platforms.findIndex((candidate) => candidate.id === platform.id));
    const baseCount = isFloor
      ? 4 + this.seededInt(room.index, 700 + platformIndex, 4)
      : 1 + this.seededInt(room.index, 700 + platformIndex, 3);
    const count = room.floorKind === "lava" ? Math.max(1, baseCount - 1) : baseCount;
    const foliageFrames = [0, 1, 2, 4, 5, 7];
    const floorFrames = [0, 2, 4, 5, 7];

    for (let i = 0; i < count; i += 1) {
      const salt = 720 + platformIndex * 31 + i * 9;
      const frame = isFloor
        ? floorFrames[this.seededInt(room.index, salt, floorFrames.length)]
        : foliageFrames[this.seededInt(room.index, salt, foliageFrames.length)];
      const span = Math.max(1, platform.width - 72);
      const x = platform.x + 36 + this.seededInt(room.index, salt + 1, span);
      const scale = 0.43 + this.seededInt(room.index, salt + 2, 16) / 100;
      const foliage = this.add
        .image(x, frame === 1 ? platform.y - 6 : platform.y + 5, "decor-foliage", frame)
        .setScale(scale)
        .setAlpha(0.82 + this.seededInt(room.index, salt + 3, 14) / 100)
        .setFlipX(this.seededInt(room.index, salt + 4, 2) === 0)
        .setDepth(frame === 1 ? 0.95 : 1.55);

      if (frame === 1) {
        foliage.setOrigin(0.5, 0);
      } else {
        foliage.setOrigin(0.5, 1);
      }
    }
  }

  private renderFloorArt(platform: Platform): void {
    const y = platform.y - 4;
    const pieceWidth = 64;
    const pieceHeight = 48;
    const sourceScale = 0.25;
    const middleWidth = Math.max(pieceWidth, platform.width - pieceWidth * 2);

    this.add
      .image(platform.x, y, "floor-edge-left")
      .setOrigin(0, 0)
      .setDisplaySize(pieceWidth, pieceHeight)
      .setDepth(1);
    this.add
      .tileSprite(platform.x + pieceWidth, y, middleWidth, pieceHeight, "floor-edge-middle")
      .setOrigin(0, 0)
      .setTileScale(sourceScale, sourceScale)
      .setDepth(1);
    this.add
      .image(platform.x + platform.width - pieceWidth, y, "floor-edge-right")
      .setOrigin(0, 0)
      .setDisplaySize(pieceWidth, pieceHeight)
      .setDepth(1);
  }

  private renderFloatingPlatformArt(platform: Platform): void {
    const y = platform.y - 8;
    const pieceWidth = 128;

    if (platform.width < pieceWidth * 2) {
      this.add
        .tileSprite(platform.x, y, platform.width, 48, "platform-middle")
        .setOrigin(0, 0)
        .setDepth(1);
      return;
    }

    const middleWidth = platform.width - pieceWidth * 2;
    this.add.image(platform.x, y, "platform-left").setOrigin(0, 0).setDepth(1);
    if (middleWidth > 0) {
      this.add
        .tileSprite(platform.x + pieceWidth, y, middleWidth, 48, "platform-middle")
        .setOrigin(0, 0)
        .setDepth(1);
    }
    this.add
      .image(platform.x + platform.width - pieceWidth, y, "platform-right")
      .setOrigin(0, 0)
      .setDepth(1);
  }

  private createLadders(): void {
    this.ladderZones = [];

    for (const room of this.level.rooms) {
      const platforms = [...room.platforms].sort((a, b) => b.y - a.y);
      const ladderPairs = platforms
        .slice(0, -1)
        .map((lower, index) => ({ lower, upper: platforms[index + 1] }))
        .filter(({ lower, upper }) => lower.y - upper.y >= 80)
        .slice(0, 2);

      for (const { lower, upper } of ladderPairs) {
        const overlapStart = Math.max(lower.x + 42, upper.x + 42);
        const overlapEnd = Math.min(lower.x + lower.width - 42, upper.x + upper.width - 42);
        const fallbackX = upper.x + upper.width * 0.5;
        const ladderX = overlapStart < overlapEnd ? (overlapStart + overlapEnd) * 0.5 : fallbackX;
        this.renderLadder(ladderX, upper.y + 16, lower.y + 3);
      }
    }
  }

  private renderLadder(x: number, topY: number, bottomY: number): void {
    const height = Math.max(64, bottomY - topY);
    this.ladderZones.push({ x, topY, bottomY, width: 48 });

    this.add
      .tileSprite(x, topY, 48, height, "ladder-shadow")
      .setOrigin(0.5, 0)
      .setAlpha(0.5)
      .setDepth(0.45);
    this.add.image(x, topY, "ladder-top").setOrigin(0.5, 0).setDepth(0.65);

    const middleY = topY + 48;
    const middleHeight = Math.max(0, height - 96);
    if (middleHeight > 0) {
      this.add
        .tileSprite(x, middleY, 48, middleHeight, "ladder-middle")
        .setOrigin(0.5, 0)
        .setDepth(0.65);
    }

    this.add.image(x, bottomY - 64, "ladder-bottom").setOrigin(0.5, 0).setDepth(0.65);
  }

  private createLavaZones(): void {
    this.lavaZones = this.physics.add.staticGroup();

    for (const room of this.level.rooms) {
      if (room.floorKind !== "lava") {
        continue;
      }

      const lava = this.lavaZones
        .create(room.x + room.width / 2, this.level.roomHeight - 15, "tile")
        .setDisplaySize(room.width, 30)
        .setVisible(false)
        .refreshBody();
      lava.setData("roomId", room.id);

      this.add
        .tileSprite(room.x, this.level.roomHeight - 96, room.width, 96, "lava-glow")
        .setOrigin(0, 0)
        .setAlpha(0.72)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(0);
      this.add
        .tileSprite(room.x, this.level.roomHeight - 32, room.width, 32, "lava-tile")
        .setOrigin(0, 0)
        .setDepth(2);
    }
  }

  private createCrates(): void {
    this.crates = this.add.group();
    for (const room of this.level.rooms) {
      for (const crate of room.crates) {
        const sprite = this.add.image(crate.x, crate.y, "crate").setDepth(3);
        sprite.setData("crateId", crate.id);
        this.crates.add(sprite);
      }
    }
  }

  private createPlayers(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is required");
    }

    const p1 = this.createPlayer("p1", "player-p1", this.level.playerSpawns.p1, {
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      attack: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      hide: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    });

    this.players.push(p1);

    if (this.playerCount === 2) {
      const p2 = this.createPlayer("p2", "player-p2", this.level.playerSpawns.p2, {
        left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        attack: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD),
        hide: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
      });

      this.players.push(p2);
    }
  }

  private createPlayer(
    id: PlayerId,
    texture: string,
    spawn: SpawnPoint,
    controls: ControlSet
  ): PlayerActor {
    const sprite = this.physics.add.sprite(spawn.x, spawn.y, texture);
    sprite.setCollideWorldBounds(true);
    sprite.setDragX(950);
    sprite.setMaxVelocity(260, 620);
    sprite.setDepth(8);
    sprite.body?.setSize(24, 44).setOffset(20, 15);
    sprite.play(`${texture}-idle`);

    const boxOverlay = this.add
      .image(spawn.x, spawn.y, `crate-worn-${id}`)
      .setDepth(9)
      .setVisible(false);
    boxOverlay.setAlpha(0.95);

    return {
      id,
      sprite,
      boxOverlay,
      controls,
      status: {
        id,
        alive: true,
        hidden: false,
        hasKey: false,
        recentlyAttackedUntil: 0
      },
      facing: 1,
      health: 3,
      spawn,
      climbing: false,
      damageCooldownUntil: 0,
      attackCooldownUntil: 0,
      animationLockUntil: 0
    };
  }

  private createCollectibles(): void {
    this.keySprite = this.physics.add.sprite(this.level.key.x, this.level.key.y, "key");
    (this.keySprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.keySprite.setDepth(6);
    this.keySprite.setScale(0.72);

    this.gateSprite = this.physics.add.staticSprite(
      this.level.exitGate.x,
      this.level.exitGate.y,
      "gate"
    );
    this.gateSprite.setDepth(5);
    this.gateSprite.body?.setSize(62, 96).setOffset(17, 28);
    this.gateSprite.refreshBody();
  }

  private createEnemies(): void {
    this.enemies = this.physics.add.group();
    const platforms = new Map(getAllPlatforms(this.level).map((platform) => [platform.id, platform]));

    for (const room of this.level.rooms) {
      for (const spawn of room.enemySpawns) {
        const platform = platforms.get(spawn.platformId);
        if (!platform) {
          continue;
        }
        this.addEnemy({
          id: spawn.id,
          kind: spawn.kind,
          packId: spawn.packId,
          generation: spawn.generation ?? 0,
          x: spawn.x,
          y: spawn.y,
          patrolStart: platform.patrolStart,
          patrolEnd: platform.patrolEnd
        });
      }
    }
  }

  private addEnemy(config: {
    id: string;
    kind: EnemyKind;
    packId?: string;
    generation: number;
    x: number;
    y: number;
    patrolStart: number;
    patrolEnd: number;
  }): void {
    const texture =
      config.kind === "guard" ? "guard" : (`monster-${Math.min(config.generation, 2)}` as const);
    const sprite = this.physics.add.sprite(config.x, config.y, texture);
    sprite.setDepth(7);
    sprite.setCollideWorldBounds(false);
    sprite.setBounce(0);
    if (config.kind === "guard") {
      sprite.body?.setSize(24, 44).setOffset(20, 14);
      sprite.play("guard-walk");
    } else {
      sprite.body?.setSize(34, 30).setOffset(15, 22);
      sprite.play(`${texture}-walk`);
    }
    this.enemies.add(sprite);

    const scale = config.kind === "monster" ? 1 - config.generation * 0.16 : 1;
    sprite.setScale(scale);

    const packMate = config.packId
      ? this.enemyActors.find((enemy) => enemy.packId === config.packId)
      : undefined;

    this.enemyActors.push({
      id: config.id,
      kind: config.kind,
      packId: config.packId,
      packIndex: this.getPackIndex(config.id),
      generation: config.generation,
      sprite,
      health: config.kind === "guard" ? 3 : 2,
      direction: packMate?.direction ?? (Math.random() > 0.5 ? 1 : -1),
      speed: config.kind === "guard" ? 74 : 58 + config.generation * 14,
      patrolStart: config.patrolStart,
      patrolEnd: config.patrolEnd,
      alertedUntil: 0,
      attackCooldownUntil: 0
    });
  }

  private getPackIndex(id: string): number {
    const match = id.match(/-(\d+)$/);
    return match ? Number(match[1]) : 0;
  }

  private createHud(): void {
    this.hud = this.add
      .text(16, 12, "", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "15px",
        color: "#f8edd0",
        backgroundColor: "#171b1fcc",
        padding: { x: 8, y: 6 }
      })
      .setScrollFactor(0)
      .setDepth(50);

    this.statusText = this.add
      .text(480, 48, "", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "20px",
        color: "#ffe07a",
        align: "center"
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(51);
  }

  private wireCollisions(): void {
    for (const player of this.players) {
      this.physics.add.collider(player.sprite, this.platforms);
      if (this.keySprite) {
        this.physics.add.overlap(player.sprite, this.keySprite, () => this.collectKey(player));
      }
      this.physics.add.overlap(player.sprite, this.gateSprite, () => this.tryExit(player));
      this.physics.add.overlap(player.sprite, this.lavaZones, () => {
        this.lavaTouchesPlayer(player, this.time.now);
      });
      this.physics.add.overlap(player.sprite, this.enemies, (_player, enemyObject) => {
        const enemy = this.enemyActors.find((actor) => actor.sprite === enemyObject);
        if (enemy) {
          this.enemyTouchesPlayer(enemy, player, this.time.now);
        }
      });
    }

    this.physics.add.collider(this.enemies, this.platforms);
  }

  private updatePlayer(player: PlayerActor, time: number): void {
    const body = player.sprite.body as Phaser.Physics.Arcade.Body;
    this.updatePlayerRoomSpawn(player);
    const speed = player.status.hidden ? HIDDEN_SPEED : PLAYER_SPEED;
    const ladder = this.getPlayerLadder(player);
    const left = player.controls.left.isDown;
    const right = player.controls.right.isDown;
    const up = player.controls.up.isDown;
    const down = player.controls.down.isDown;
    const climbing = this.updatePlayerLadderMovement(player, ladder, up, down, left, right);

    if (left === right) {
      player.sprite.setAccelerationX(0);
      player.sprite.setVelocityX(0);
    } else if (left) {
      player.sprite.setVelocityX(-speed);
      player.facing = -1;
    } else if (right) {
      player.sprite.setVelocityX(speed);
      player.facing = 1;
    }

    if (Phaser.Input.Keyboard.JustDown(player.controls.up) && body.blocked.down && !climbing && !ladder) {
      player.sprite.setVelocityY(JUMP_SPEED);
    }

    if (Phaser.Input.Keyboard.JustDown(player.controls.hide)) {
      this.toggleHide(player);
    }

    if (Phaser.Input.Keyboard.JustDown(player.controls.attack)) {
      this.attack(player, time);
    }

    player.sprite.setFlipX(player.facing === -1);
    player.sprite.setAlpha(player.damageCooldownUntil > time ? 0.62 : 1);
    this.updatePlayerAnimation(player, body, time);
    player.boxOverlay
      .setPosition(player.sprite.x, player.sprite.y + 3)
      .setVisible(player.status.hidden)
      .setFlipX(player.facing === -1);

    this.checkVoidFall(player, time);
  }

  private updatePlayerLadderMovement(
    player: PlayerActor,
    ladder: LadderZone | undefined,
    up: boolean,
    down: boolean,
    left: boolean,
    right: boolean
  ): boolean {
    const body = player.sprite.body as Phaser.Physics.Arcade.Body;
    const wantsClimb = Boolean(ladder && (up || down || (player.climbing && left === right)));

    if (!wantsClimb || !ladder) {
      if (player.climbing) {
        player.climbing = false;
        player.activeLadder = undefined;
        body.setAllowGravity(true);
        body.checkCollision.up = true;
        body.checkCollision.down = true;
      }
      return false;
    }

    player.climbing = true;
    player.activeLadder = ladder;
    player.status.hidden = false;
    body.setAllowGravity(false);
    body.checkCollision.up = false;
    body.checkCollision.down = false;

    const centeredX = Phaser.Math.Linear(player.sprite.x, ladder.x, 0.18);
    player.sprite.setX(centeredX);

    if (up === down) {
      player.sprite.setVelocityY(0);
    } else {
      player.sprite.setVelocityY(up ? -CLIMB_SPEED : CLIMB_SPEED);
    }

    return true;
  }

  private getPlayerLadder(player: PlayerActor): LadderZone | undefined {
    const activeLadder = player.activeLadder;
    if (activeLadder && this.isPlayerOnLadder(player, activeLadder, 36)) {
      return activeLadder;
    }

    return this.ladderZones.find((ladder) => this.isPlayerOnLadder(player, ladder, 24));
  }

  private isPlayerOnLadder(player: PlayerActor, ladder: LadderZone, padding: number): boolean {
    return (
      Math.abs(player.sprite.x - ladder.x) <= ladder.width * 0.5 + 12 &&
      player.sprite.y >= ladder.topY - padding &&
      player.sprite.y <= ladder.bottomY + padding
    );
  }

  private checkVoidFall(player: PlayerActor, time: number): void {
    if (player.sprite.y <= this.level.roomHeight - 30) {
      return;
    }

    if (time >= player.damageCooldownUntil) {
      player.health -= 1;
      player.damageCooldownUntil = time + DAMAGE_COOLDOWN;
    }
    this.respawnPlayer(player, player.health <= 0);
  }

  private updatePlayerAnimation(
    player: PlayerActor,
    body: Phaser.Physics.Arcade.Body,
    time: number
  ): void {
    if (time < player.animationLockUntil) {
      return;
    }

    const texture = player.sprite.texture.key;
    if (player.damageCooldownUntil > time && player.health <= 1) {
      player.sprite.play(`${texture}-hurt`, true);
    } else if (player.climbing) {
      player.sprite.play(`${texture}-idle`, true);
    } else if (!body.blocked.down) {
      player.sprite.play(`${texture}-jump`, true);
    } else if (Math.abs(body.velocity.x) > 8) {
      player.sprite.play(`${texture}-run`, true);
    } else {
      player.sprite.play(`${texture}-idle`, true);
    }
  }

  private toggleHide(player: PlayerActor): void {
    if (player.status.hidden) {
      player.status.hidden = false;
      return;
    }

    const nearestCrate = this.crates
      .getChildren()
      .find((crate) => {
        const image = crate as Phaser.GameObjects.Image;
        return Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, image.x, image.y) < 58;
      });

    if (nearestCrate) {
      player.status.hidden = true;
    }
  }

  private attack(player: PlayerActor, time: number): void {
    if (player.status.hidden || time < player.attackCooldownUntil) {
      return;
    }

    const move = ATTACK_MOVES[Phaser.Math.Between(0, ATTACK_MOVES.length - 1)];
    player.attackCooldownUntil = time + ATTACK_COOLDOWN;
    player.animationLockUntil = time + 260;
    player.status.recentlyAttackedUntil = time + 700;
    player.sprite.play(`${player.sprite.texture.key}-${move.animation}`, true);
    this.spawnSpark(player.sprite.x + player.facing * 30, player.sprite.y - 4);

    for (const enemy of [...this.enemyActors]) {
      const dx = enemy.sprite.x - player.sprite.x;
      const dy = Math.abs(enemy.sprite.y - player.sprite.y);
      if (Math.sign(dx) === player.facing && Math.abs(dx) <= move.range && dy <= 42) {
        enemy.health -= move.damage;
        enemy.alertedUntil = time + 1600;
        enemy.sprite.setVelocityX(player.facing * move.knockback);
        enemy.sprite.setTintFill(0xffffff);
        this.time.delayedCall(70, () => enemy.sprite.clearTint());
        if (enemy.health <= 0) {
          this.killEnemy(enemy);
        }
      }
    }
  }

  private updateEnemy(enemy: EnemyActor, time: number): void {
    if (!enemy.sprite.active) {
      return;
    }

    const target = this.findTarget(enemy, time);
    if (target) {
      const targetX = this.getEnemyTargetX(enemy, target.sprite.x);
      const direction = targetX >= enemy.sprite.x ? 1 : -1;
      enemy.direction = direction;
      this.syncGuardPackDirection(enemy, direction);
      const nextX = enemy.sprite.x + direction * 3;
      if (nextX >= enemy.patrolStart && nextX <= enemy.patrolEnd) {
        const correction = Phaser.Math.Clamp((targetX - enemy.sprite.x) * 2.5, -70, 70);
        enemy.sprite.setVelocityX(direction * enemy.speed * 1.15 + correction);
      } else {
        enemy.sprite.setVelocityX(0);
      }
    } else {
      this.updateEnemyPatrol(enemy);
    }

    enemy.sprite.setFlipX(enemy.direction === -1);
    const currentAnimation = enemy.sprite.anims.currentAnim?.key;
    if (!currentAnimation?.endsWith("attack") || !enemy.sprite.anims.isPlaying) {
      enemy.sprite.play(
        enemy.kind === "guard" ? "guard-walk" : `${enemy.sprite.texture.key}-walk`,
        true
      );
    }
  }

  private updateEnemyPatrol(enemy: EnemyActor): void {
    if (enemy.kind !== "guard" || !enemy.packId) {
      if (enemy.sprite.x <= enemy.patrolStart) {
        enemy.direction = 1;
      } else if (enemy.sprite.x >= enemy.patrolEnd) {
        enemy.direction = -1;
      }
      enemy.sprite.setVelocityX(enemy.direction * enemy.speed);
      return;
    }

    const members = this.getGuardPackMembers(enemy);
    const minX = Math.min(...members.map((member) => member.sprite.x));
    const maxX = Math.max(...members.map((member) => member.sprite.x));
    if (minX <= enemy.patrolStart) {
      this.syncGuardPackDirection(enemy, 1);
    } else if (maxX >= enemy.patrolEnd) {
      this.syncGuardPackDirection(enemy, -1);
    }

    const desiredX = this.getGuardFormationX(enemy);
    const correction = Phaser.Math.Clamp((desiredX - enemy.sprite.x) * 2, -45, 45);
    enemy.sprite.setVelocityX(enemy.direction * enemy.speed + correction);
  }

  private getEnemyTargetX(enemy: EnemyActor, targetX: number): number {
    if (enemy.kind !== "guard" || !enemy.packId) {
      return targetX;
    }

    return targetX + this.getGuardFormationOffset(enemy);
  }

  private getGuardFormationX(enemy: EnemyActor): number {
    const members = this.getGuardPackMembers(enemy);
    const averageX = members.reduce((sum, member) => sum + member.sprite.x, 0) / members.length;
    const averageOffset =
      members.reduce((sum, member) => sum + this.getGuardFormationOffset(member), 0) / members.length;
    const anchorX = averageX - averageOffset;

    return anchorX + this.getGuardFormationOffset(enemy);
  }

  private getGuardFormationOffset(enemy: EnemyActor): number {
    const members = this.getGuardPackMembers(enemy);
    const sorted = [...members].sort((a, b) => a.packIndex - b.packIndex);
    const slot = sorted.findIndex((member) => member === enemy);
    const center = (sorted.length - 1) / 2;

    return (slot - center) * 46;
  }

  private getGuardPackMembers(enemy: EnemyActor): EnemyActor[] {
    if (!enemy.packId) {
      return [enemy];
    }

    return this.enemyActors.filter(
      (member) => member.kind === "guard" && member.packId === enemy.packId && member.sprite.active
    );
  }

  private syncGuardPackDirection(enemy: EnemyActor, direction: 1 | -1): void {
    if (enemy.kind !== "guard" || !enemy.packId) {
      enemy.direction = direction;
      return;
    }

    for (const member of this.getGuardPackMembers(enemy)) {
      member.direction = direction;
    }
  }

  private findTarget(enemy: EnemyActor, time: number): PlayerActor | undefined {
    let best: PlayerActor | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const player of this.players) {
      const distance = Phaser.Math.Distance.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        player.sprite.x,
        player.sprite.y
      );
      const decision = enemyTargeting(
        { kind: enemy.kind, alertedUntil: enemy.alertedUntil },
        player.status,
        distance,
        time
      );

      if (decision.canSee && distance < bestDistance) {
        best = player;
        bestDistance = distance;
      }
    }

    return best;
  }

  private enemyTouchesPlayer(enemy: EnemyActor, player: PlayerActor, time: number): void {
    const distance = Phaser.Math.Distance.Between(
      enemy.sprite.x,
      enemy.sprite.y,
      player.sprite.x,
      player.sprite.y
    );
    const decision = enemyTargeting(
      { kind: enemy.kind, alertedUntil: enemy.alertedUntil },
      player.status,
      distance,
      time,
      80
    );

    if (!decision.canDamage || time < player.damageCooldownUntil || time < enemy.attackCooldownUntil) {
      return;
    }

    enemy.attackCooldownUntil = time + 650;
    enemy.sprite.play(
      enemy.kind === "guard" ? "guard-attack" : `${enemy.sprite.texture.key}-attack`,
      true
    );
    this.damagePlayer(player, time);
  }

  private damagePlayer(player: PlayerActor, time: number): void {
    player.health -= 1;
    player.damageCooldownUntil = time + DAMAGE_COOLDOWN;
    player.status.hidden = false;
    player.sprite.setVelocity(-player.facing * 180, -220);

    if (player.health <= 0) {
      this.respawnPlayer(player, true);
    }
  }

  private lavaTouchesPlayer(player: PlayerActor, time: number): void {
    if (time < player.damageCooldownUntil) {
      return;
    }

    player.health -= 1;
    player.damageCooldownUntil = time + DAMAGE_COOLDOWN;
    player.status.hidden = false;
    this.respawnPlayer(player, player.health <= 0);
  }

  private respawnPlayer(player: PlayerActor, restoreHealth: boolean): void {
    const body = player.sprite.body as Phaser.Physics.Arcade.Body;
    if (restoreHealth) {
      player.health = 3;
    }
    player.status.hidden = false;
    player.climbing = false;
    player.activeLadder = undefined;
    body.setAllowGravity(true);
    body.checkCollision.up = true;
    body.checkCollision.down = true;
    player.sprite.setPosition(player.spawn.x, player.spawn.y);
    player.sprite.setVelocity(0, 0);
    player.damageCooldownUntil = this.time.now + 1200;
  }

  private updatePlayerRoomSpawn(player: PlayerActor): void {
    const room = this.getRoomForX(player.sprite.x);
    if (!room || player.spawn.roomId === room.id) {
      return;
    }

    const offset = player.id === "p2" ? 44 : 0;
    player.spawn = {
      ...room.spawnPoint,
      id: `${player.id}-${room.id}-spawn`,
      x: room.spawnPoint.x + offset
    };
  }

  private getRoomForX(x: number): Room | undefined {
    const roomIndex = Phaser.Math.Clamp(Math.floor(x / this.level.roomWidth), 0, this.level.rooms.length - 1);
    return this.level.rooms[roomIndex];
  }

  private collectKey(player: PlayerActor): void {
    if (!this.keySprite?.active) {
      return;
    }

    player.status.hasKey = true;
    this.level.key.collectedBy = player.id;
    this.keySprite.disableBody(true, true);
    this.statusText.setText(`${player.id.toUpperCase()} HAS THE KEY`);
    this.time.delayedCall(1800, () => this.statusText.setText(""));
  }

  private tryExit(player: PlayerActor): void {
    if (this.won || !player.status.hasKey) {
      return;
    }

    this.won = true;
    this.level.exitGate.isOpen = true;
    this.gateSprite.setTexture("gate-open");
    this.statusText.setText("FREEDOM");
    this.physics.pause();
  }

  private switchPlayerCount(playerCount: PlayerCount): void {
    if (playerCount === this.playerCount) {
      this.scene.restart({ playerCount });
      return;
    }

    this.playerCount = playerCount;
    const url = new URL(window.location.href);
    url.searchParams.set("players", String(playerCount));
    window.history.replaceState({}, "", url);
    this.scene.restart({ playerCount });
  }

  private killEnemy(enemy: EnemyActor): void {
    this.enemyActors = this.enemyActors.filter((candidate) => candidate !== enemy);
    enemy.sprite.disableBody(true, true);

    if (enemy.kind !== "monster") {
      return;
    }

    for (const generation of nextMonsterGeneration(enemy.generation)) {
      this.addEnemy({
        id: `${enemy.id}-${generation}-${Math.random().toString(16).slice(2, 6)}`,
        kind: "monster",
        generation,
        x: enemy.sprite.x + Phaser.Math.Between(-16, 16),
        y: enemy.sprite.y - 8,
        patrolStart: enemy.patrolStart,
        patrolEnd: enemy.patrolEnd
      });
    }
  }

  private spawnSpark(x: number, y: number): void {
    const spark = this.add.image(x, y, "spark").setScale(0.35).setDepth(20);
    this.tweens.add({
      targets: spark,
      scale: 0.85,
      alpha: 0,
      duration: 140,
      onComplete: () => spark.destroy()
    });
  }

  private updateCamera(): void {
    const activePlayers = this.players.filter((player) => player.status.alive);
    const centerX =
      activePlayers.reduce((sum, player) => sum + player.sprite.x, 0) / Math.max(activePlayers.length, 1);
    const centerY =
      activePlayers.reduce((sum, player) => sum + player.sprite.y, 0) / Math.max(activePlayers.length, 1);

    this.cameras.main.centerOn(
      Phaser.Math.Clamp(centerX, 480, this.level.rooms.length * this.level.roomWidth - 480),
      Phaser.Math.Clamp(centerY, 270, this.level.roomHeight - 270)
    );
  }

  private updateHud(): void {
    const keyHolder = this.level.key.collectedBy ? this.level.key.collectedBy.toUpperCase() : "NONE";
    const enemyCount = this.enemyActors.filter((enemy) => enemy.sprite.active).length;
    const playerLines = this.players.map((player) => {
      const box = player.status.hidden ? "BOXED" : "OPEN";
      const key = player.status.hasKey ? "KEY" : "NO KEY";
      return `${player.id.toUpperCase()} HP ${player.health} ${box} ${key}`;
    });
    this.hud.setText([
      `SEED ${this.level.seed}   ${this.playerCount}P MODE`,
      `KEY ${keyHolder}   ENEMIES ${enemyCount}`,
      ...playerLines
    ]);
  }
}
