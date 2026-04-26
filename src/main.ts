import Phaser from "phaser";
import "./style.css";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { TitleScene } from "./scenes/TitleScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#101214",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 980 },
      debug: false
    }
  },
  scene: [BootScene, TitleScene, GameScene]
};

new Phaser.Game(config);
