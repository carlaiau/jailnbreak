import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    const backgroundBase = "/assets/jailbreak/background";
    const platformBase = "/assets/jailbreak/platforms";
    const characterBase = "/assets/jailbreak/characters";
    const ladderBase = "/assets/jailbreak/ladders";
    const objectBase = "/assets/jailbreak/objects";
    const newAssetBase = "/assets/jailbreak/new";

    this.load.image("bg-wall-tile", `${backgroundBase}/wall-brick-tile.png`);
    this.load.spritesheet("bg-wall-variants", `${backgroundBase}/wall-brick-variants.png`, {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.image("bg-barred-window", `${backgroundBase}/barred-window.png`);
    this.load.image("bg-window-light-beam", `${backgroundBase}/window-light-beam.png`);
    this.load.spritesheet("bg-pipe-set", `${backgroundBase}/pipe-set.png`, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.image("bg-wall-vent", `${backgroundBase}/wall-vent.png`);

    this.load.image("platform-left", `${platformBase}/platform-left.png`);
    this.load.image("platform-middle", `${platformBase}/platform-middle.png`);
    this.load.image("platform-right", `${platformBase}/platform-right.png`);
    this.load.image("floor-edge-left", `${platformBase}/floor-edge-left.png`);
    this.load.image("floor-edge-middle", `${platformBase}/floor-edge-middle.png`);
    this.load.image("floor-edge-right", `${platformBase}/floor-edge-right.png`);
    this.load.image("floor-tile", `${platformBase}/floor-tile.png`);
    this.load.image("lava-tile", `${platformBase}/lava-tile.png`);
    this.load.image("lava-glow", `${platformBase}/lava-glow.png`);
    this.load.spritesheet("decor-foliage", `${newAssetBase}/foliage-platforms-runtime.png`, {
      frameWidth: 128,
      frameHeight: 96
    });

    this.load.image("ladder-top", `${ladderBase}/ladder-top.png`);
    this.load.image("ladder-middle", `${ladderBase}/ladder-middle.png`);
    this.load.image("ladder-bottom", `${ladderBase}/ladder-bottom.png`);
    this.load.image("ladder-shadow", `${ladderBase}/ladder-shadow.png`);

    this.load.image("crate", `${objectBase}/crate.png`);
    this.load.image("crate-worn-p1", `${objectBase}/crate-worn-p1.png`);
    this.load.image("crate-worn-p2", `${objectBase}/crate-worn-p2.png`);
    this.load.image("key", `${objectBase}/key.png`);
    this.load.image("gate", `${objectBase}/exit-gate-closed.png`);
    this.load.image("gate-open", `${objectBase}/exit-gate-open.png`);
    this.load.image("spark", `${objectBase}/hit-spark.png`);

    this.load.spritesheet("player-p1", `${characterBase}/player-p1.png`, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet("player-p2", `${characterBase}/player-p2.png`, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet("guard", `${characterBase}/guard.png`, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet("monster-0", `${characterBase}/monster-large.png`, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet("monster-1", `${characterBase}/monster-medium.png`, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet("monster-2", `${characterBase}/monster-small.png`, {
      frameWidth: 64,
      frameHeight: 64
    });
  }

  create(): void {
    this.createRect("tile", 32, 32, 0x4b5357, 0x252b2f);
    this.createCharacterAnimations();
    this.scene.start("TitleScene");
  }

  private createCharacterAnimations(): void {
    for (const key of ["player-p1", "player-p2"]) {
      this.anims.create({
        key: `${key}-idle`,
        frames: this.anims.generateFrameNumbers(key, { frames: [0, 1, 2, 3] }),
        frameRate: 4,
        repeat: -1
      });
      this.anims.create({
        key: `${key}-run`,
        frames: this.anims.generateFrameNumbers(key, { frames: [12, 13, 14, 15, 16, 17, 18, 19] }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: `${key}-jump`,
        frames: this.anims.generateFrameNumbers(key, { frames: [8, 9, 10, 11] }),
        frameRate: 8,
        repeat: -1
      });
      this.anims.create({
        key: `${key}-kick`,
        frames: this.anims.generateFrameNumbers(key, { frames: [20, 21, 22, 23] }),
        frameRate: 12,
        repeat: 0
      });
      this.anims.create({
        key: `${key}-punch`,
        frames: this.anims.generateFrameNumbers(key, { frames: [24, 25, 26, 27] }),
        frameRate: 12,
        repeat: 0
      });
      this.anims.create({
        key: `${key}-hurt`,
        frames: this.anims.generateFrameNumbers(key, { frames: [28, 29, 30, 31] }),
        frameRate: 7,
        repeat: -1
      });
    }

    this.anims.create({
      key: "guard-walk",
      frames: this.anims.generateFrameNumbers("guard", { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "guard-attack",
      frames: this.anims.generateFrameNumbers("guard", { frames: [12, 13, 14, 15] }),
      frameRate: 10,
      repeat: 0
    });

    for (const key of ["monster-0", "monster-1", "monster-2"]) {
      this.anims.create({
        key: `${key}-walk`,
        frames: this.anims.generateFrameNumbers(key, { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
        frameRate: 7,
        repeat: -1
      });
      this.anims.create({
        key: `${key}-attack`,
        frames: this.anims.generateFrameNumbers(key, { frames: [8, 9, 10, 11] }),
        frameRate: 10,
        repeat: 0
      });
    }
  }

  private createRect(key: string, width: number, height: number, fill: number, stroke: number): void {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRect(0, 0, width, height);
    g.lineStyle(2, stroke, 1);
    g.strokeRect(1, 1, width - 2, height - 2);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  private createLava(): void {
    const g = this.add.graphics();
    g.fillStyle(0xb9362e, 1);
    g.fillRect(0, 0, 64, 30);
    g.fillStyle(0xff7a2a, 1);
    for (let x = 0; x < 64; x += 16) {
      g.fillTriangle(x, 0, x + 8, 10, x + 16, 0);
    }
    g.fillStyle(0xffd166, 1);
    g.fillRect(6, 18, 18, 3);
    g.fillRect(36, 13, 22, 3);
    g.generateTexture("lava", 64, 30);
    g.destroy();
  }

  private createPlayer(key: string, suit: number, skin: number): void {
    const g = this.add.graphics();
    g.fillStyle(suit, 1);
    g.fillRect(8, 14, 16, 20);
    g.fillStyle(skin, 1);
    g.fillRect(10, 5, 12, 10);
    g.fillStyle(0x1b1d20, 1);
    g.fillRect(12, 8, 3, 2);
    g.fillRect(18, 8, 3, 2);
    g.fillStyle(0x2e3438, 1);
    g.fillRect(5, 18, 5, 13);
    g.fillRect(22, 18, 5, 13);
    g.fillStyle(0x202326, 1);
    g.fillRect(9, 34, 6, 10);
    g.fillRect(18, 34, 6, 10);
    g.generateTexture(key, 32, 46);
    g.destroy();
  }

  private createGuard(): void {
    const g = this.add.graphics();
    g.fillStyle(0x27313c, 1);
    g.fillRect(7, 14, 20, 20);
    g.fillStyle(0xa6b6c2, 1);
    g.fillRect(8, 6, 18, 8);
    g.fillStyle(0xe2c39a, 1);
    g.fillRect(10, 12, 14, 8);
    g.fillStyle(0x111418, 1);
    g.fillRect(12, 15, 3, 2);
    g.fillRect(20, 15, 3, 2);
    g.fillStyle(0x0f151b, 1);
    g.fillRect(5, 34, 8, 8);
    g.fillRect(20, 34, 8, 8);
    g.fillStyle(0xc54848, 1);
    g.fillRect(14, 21, 6, 6);
    g.generateTexture("guard", 34, 44);
    g.destroy();
  }

  private createMonster(
    key: string,
    color: number,
    width: number,
    height: number,
    arms: number,
    eyes: number
  ): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    for (let i = 0; i < arms; i += 1) {
      const y = 8 + (i % 3) * 6;
      const left = i % 2 === 0;
      g.fillRect(left ? 0 : width - 6, y, 11, 4);
    }
    g.fillRoundedRect(5, 4, width - 10, height + 12, 6);
    g.fillStyle(0xf7f0c8, 1);
    if (eyes === 1) {
      g.fillCircle(width / 2, 12, 4);
      g.fillStyle(0x141414, 1);
      g.fillCircle(width / 2, 12, 1.5);
    } else {
      g.fillCircle(width / 2 - 5, 12, 3.5);
      g.fillCircle(width / 2 + 5, 12, 3.5);
      g.fillStyle(0x141414, 1);
      g.fillCircle(width / 2 - 5, 12, 1.25);
      g.fillCircle(width / 2 + 5, 12, 1.25);
    }
    g.generateTexture(key, width, height + 18);
    g.destroy();
  }

  private createCrate(): void {
    const g = this.add.graphics();
    g.fillStyle(0x9a714b, 1);
    g.fillRect(0, 0, 36, 36);
    g.lineStyle(3, 0x513828, 1);
    g.strokeRect(2, 2, 32, 32);
    g.lineBetween(4, 4, 32, 32);
    g.lineBetween(32, 4, 4, 32);
    g.generateTexture("crate", 36, 36);
    g.destroy();
  }

  private createKey(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffdd55, 1);
    g.fillCircle(8, 9, 6);
    g.fillStyle(0x101214, 1);
    g.fillCircle(8, 9, 3);
    g.fillStyle(0xffdd55, 1);
    g.fillRect(13, 7, 18, 5);
    g.fillRect(24, 11, 4, 7);
    g.fillRect(30, 11, 4, 5);
    g.generateTexture("key", 36, 22);
    g.destroy();
  }

  private createGate(): void {
    const g = this.add.graphics();
    g.fillStyle(0x283038, 1);
    g.fillRect(0, 0, 58, 86);
    g.lineStyle(4, 0x9eb1bb, 1);
    for (let x = 8; x <= 48; x += 10) {
      g.lineBetween(x, 4, x, 82);
    }
    g.strokeRect(2, 2, 54, 82);
    g.fillStyle(0xffdd55, 1);
    g.fillCircle(46, 44, 4);
    g.generateTexture("gate", 58, 86);
    g.destroy();
  }

  private createSpark(): void {
    const g = this.add.graphics();
    g.fillStyle(0xfff2a3, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark", 8, 8);
    g.destroy();
  }
}
