import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.createRect("tile", 32, 32, 0x4b5357, 0x252b2f);
    this.createRect("platform-edge", 32, 8, 0x8c7b64, 0x473c32);
    this.createLava();
    this.createPlayer("player-p1", 0x48c7c7, 0xf4ead5);
    this.createPlayer("player-p2", 0xffca4f, 0xf4ead5);
    this.createGuard();
    this.createMonster("monster-0", 0x9b59d0, 34, 18, 6, 2);
    this.createMonster("monster-1", 0x46b17b, 26, 14, 5, 1);
    this.createMonster("monster-2", 0xde5f5f, 18, 10, 4, 1);
    this.createCrate();
    this.createKey();
    this.createGate();
    this.createSpark();
    this.scene.start("GameScene");
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
