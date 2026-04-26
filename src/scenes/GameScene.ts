import Phaser from "phaser";
import { generateLevel, getAllPlatforms } from "../game/generator";
import { enemyTargeting, nextMonsterGeneration } from "../game/rules";
import type {
  EnemyKind,
  GeneratedLevel,
  Room,
  PlayerId,
  PlayerStatus,
  SpawnPoint
} from "../game/types";

type ControlSet = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  punch: Phaser.Input.Keyboard.Key;
  kick: Phaser.Input.Keyboard.Key;
  hide: Phaser.Input.Keyboard.Key;
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
  damageCooldownUntil: number;
  attackCooldownUntil: number;
};

type EnemyActor = {
  id: string;
  kind: EnemyKind;
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

const PLAYER_SPEED = 185;
const HIDDEN_SPEED = 105;
const JUMP_SPEED = -580;
const DAMAGE_COOLDOWN = 900;
const ATTACK_COOLDOWN = 330;

export class GameScene extends Phaser.Scene {
  private level!: GeneratedLevel;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private lavaZones!: Phaser.Physics.Arcade.StaticGroup;
  private crates!: Phaser.GameObjects.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private players: PlayerActor[] = [];
  private enemyActors: EnemyActor[] = [];
  private keySprite?: Phaser.Physics.Arcade.Sprite;
  private gateSprite!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  private hud!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private won = false;

  constructor() {
    super("GameScene");
  }

  create(): void {
    const seedParam = new URLSearchParams(window.location.search).get("seed");
    const seed = seedParam ? Number(seedParam) : Date.now() % 1000000;
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
    this.createLavaZones();
    this.createCrates();
    this.createPlayers();
    this.createCollectibles();
    this.createEnemies();
    this.createHud();
    this.wireCollisions();

    this.input.keyboard?.on("keydown-ONE", () => {
      this.scene.restart();
    });
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
    const g = this.add.graphics();
    g.fillStyle(0x11161a, 1);
    g.fillRect(0, 0, this.level.rooms.length * this.level.roomWidth, this.level.roomHeight);

    for (const room of this.level.rooms) {
      g.fillStyle(room.index % 2 === 0 ? 0x171e23 : 0x1b2226, 1);
      g.fillRect(room.x, 0, room.width, room.height);
      g.lineStyle(2, 0x384148, 1);
      g.strokeRect(room.x + 12, 22, room.width - 24, room.height - 40);
      g.lineStyle(3, 0x30383e, 1);
      for (let x = room.x + 100; x < room.x + room.width - 80; x += 120) {
        g.lineBetween(x, 64, x, 124);
        g.lineBetween(x + 24, 64, x + 24, 124);
        g.strokeRect(x - 8, 58, 44, 72);
      }
      if (room.index < this.level.rooms.length - 1) {
        g.fillStyle(0x0b0e11, 1);
        g.fillRect(room.x + room.width - 10, this.level.roomHeight - 132, 20, 96);
      }
      if (room.floorKind === "lava") {
        g.fillStyle(0x421713, 1);
        g.fillRect(room.x, this.level.roomHeight - 42, room.width, 42);
      }
    }
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    for (const platform of getAllPlatforms(this.level)) {
      const body = this.platforms
        .create(platform.x + platform.width / 2, platform.y + platform.height / 2, "tile")
        .setDisplaySize(platform.width, platform.height)
        .refreshBody();
      body.setData("platformId", platform.id);

      this.add
        .image(platform.x + platform.width / 2, platform.y + 5, "platform-edge")
        .setDisplaySize(platform.width, 10)
        .setDepth(1);
    }
  }

  private createLavaZones(): void {
    this.lavaZones = this.physics.add.staticGroup();

    for (const room of this.level.rooms) {
      if (room.floorKind !== "lava") {
        continue;
      }

      const lava = this.lavaZones
        .create(room.x + room.width / 2, this.level.roomHeight - 15, "lava")
        .setDisplaySize(room.width, 30)
        .setDepth(2)
        .refreshBody();
      lava.setData("roomId", room.id);
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
      punch: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      kick: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T),
      hide: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    });

    const p2 = this.createPlayer("p2", "player-p2", this.level.playerSpawns.p2, {
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      punch: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD),
      kick: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH),
      hide: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
    });

    this.players.push(p1, p2);
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
    sprite.body?.setSize(22, 38).setOffset(5, 8);

    const boxOverlay = this.add.image(spawn.x, spawn.y, "crate").setDepth(9).setVisible(false);
    boxOverlay.setAlpha(0.9);

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
      damageCooldownUntil: 0,
      attackCooldownUntil: 0
    };
  }

  private createCollectibles(): void {
    this.keySprite = this.physics.add.sprite(this.level.key.x, this.level.key.y, "key");
    (this.keySprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.keySprite.setDepth(6);

    this.gateSprite = this.physics.add.staticSprite(
      this.level.exitGate.x,
      this.level.exitGate.y,
      "gate"
    );
    this.gateSprite.setDepth(5);
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
    sprite.body?.setSize(config.kind === "guard" ? 24 : 24, config.kind === "guard" ? 36 : 24);
    this.enemies.add(sprite);

    const scale = config.kind === "monster" ? 1 - config.generation * 0.16 : 1;
    sprite.setScale(scale);

    this.enemyActors.push({
      id: config.id,
      kind: config.kind,
      generation: config.generation,
      sprite,
      health: config.kind === "guard" ? 3 : 2,
      direction: Math.random() > 0.5 ? 1 : -1,
      speed: config.kind === "guard" ? 74 : 58 + config.generation * 14,
      patrolStart: config.patrolStart,
      patrolEnd: config.patrolEnd,
      alertedUntil: 0,
      attackCooldownUntil: 0
    });
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
    const left = player.controls.left.isDown;
    const right = player.controls.right.isDown;

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

    if (Phaser.Input.Keyboard.JustDown(player.controls.up) && body.blocked.down) {
      player.sprite.setVelocityY(JUMP_SPEED);
    }

    if (Phaser.Input.Keyboard.JustDown(player.controls.hide)) {
      this.toggleHide(player);
    }

    if (Phaser.Input.Keyboard.JustDown(player.controls.punch)) {
      this.attack(player, 38, 1, 150, time);
    }

    if (Phaser.Input.Keyboard.JustDown(player.controls.kick)) {
      this.attack(player, 52, 2, 270, time);
    }

    player.sprite.setFlipX(player.facing === -1);
    player.sprite.setAlpha(player.damageCooldownUntil > time ? 0.62 : 1);
    player.boxOverlay
      .setPosition(player.sprite.x, player.sprite.y + 3)
      .setVisible(player.status.hidden)
      .setFlipX(player.facing === -1);
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

  private attack(
    player: PlayerActor,
    range: number,
    damage: number,
    knockback: number,
    time: number
  ): void {
    if (player.status.hidden || time < player.attackCooldownUntil) {
      return;
    }

    player.attackCooldownUntil = time + ATTACK_COOLDOWN;
    player.status.recentlyAttackedUntil = time + 700;
    this.spawnSpark(player.sprite.x + player.facing * 30, player.sprite.y - 4);

    for (const enemy of [...this.enemyActors]) {
      const dx = enemy.sprite.x - player.sprite.x;
      const dy = Math.abs(enemy.sprite.y - player.sprite.y);
      if (Math.sign(dx) === player.facing && Math.abs(dx) <= range && dy <= 42) {
        enemy.health -= damage;
        enemy.alertedUntil = time + 1600;
        enemy.sprite.setVelocityX(player.facing * knockback);
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
      const direction = target.sprite.x >= enemy.sprite.x ? 1 : -1;
      enemy.direction = direction;
      const nextX = enemy.sprite.x + direction * 3;
      if (nextX >= enemy.patrolStart && nextX <= enemy.patrolEnd) {
        enemy.sprite.setVelocityX(direction * enemy.speed * 1.25);
      } else {
        enemy.sprite.setVelocityX(0);
      }
    } else {
      if (enemy.sprite.x <= enemy.patrolStart) {
        enemy.direction = 1;
      } else if (enemy.sprite.x >= enemy.patrolEnd) {
        enemy.direction = -1;
      }
      enemy.sprite.setVelocityX(enemy.direction * enemy.speed);
    }

    enemy.sprite.setFlipX(enemy.direction === -1);
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
    if (restoreHealth) {
      player.health = 3;
    }
    player.status.hidden = false;
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
    this.gateSprite.setTint(0xffdd55);
    this.statusText.setText("FREEDOM");
    this.physics.pause();
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
    const spark = this.add.image(x, y, "spark").setDepth(20);
    this.tweens.add({
      targets: spark,
      scale: 2.4,
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
      `SEED ${this.level.seed}`,
      `KEY ${keyHolder}   ENEMIES ${enemyCount}`,
      ...playerLines
    ]);
  }
}
