import Phaser from "phaser";
import type { PlayerCount } from "../game/types";

type ModeButton = {
  playerCount: PlayerCount;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  hint: Phaser.GameObjects.Text;
};

export class TitleScene extends Phaser.Scene {
  private selectedPlayerCount: PlayerCount = 2;
  private modeButtons: ModeButton[] = [];

  constructor() {
    super("TitleScene");
  }

  create(): void {
    this.selectedPlayerCount = this.getInitialPlayerCount();
    this.modeButtons = [];

    this.createBackdrop();
    this.createCharacters();
    this.createTitleText();
    this.createInstructions();
    this.createModeButtons();
    this.createKeyboardControls();
    this.refreshModeButtons();
  }

  private getInitialPlayerCount(): PlayerCount {
    const playerCountParam = new URLSearchParams(window.location.search).get("players");
    return playerCountParam === "1" ? 1 : 2;
  }

  private createBackdrop(): void {
    const { width, height } = this.scale;

    this.add.tileSprite(0, 0, width, height, "bg-wall-tile").setOrigin(0).setDepth(-40);

    for (let y = 0; y < height; y += 128) {
      for (let x = 0; x < width; x += 128) {
        if ((x / 128 + y / 128) % 3 === 0) {
          this.add
            .image(x, y, "bg-wall-variants", ((x + y) / 128) % 8)
            .setOrigin(0)
            .setAlpha(0.42)
            .setDepth(-39);
        }
      }
    }

    this.add.rectangle(width / 2, height / 2, width, height, 0x071015, 0.48).setDepth(-30);
    this.add.rectangle(width / 2, 0, width, 180, 0x020507, 0.4).setOrigin(0.5, 0).setDepth(-29);

    this.add.image(138, 112, "bg-barred-window").setScale(0.72).setAlpha(0.84).setDepth(-18);
    this.add
      .image(138, 202, "bg-window-light-beam")
      .setScale(0.66)
      .setAlpha(0.26)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-28);
    this.add.image(778, 122, "bg-wall-vent").setScale(0.85).setAlpha(0.75).setDepth(-18);

    this.add.tileSprite(0, height - 48, width, 48, "floor-edge-middle")
      .setOrigin(0, 0)
      .setTileScale(0.25, 0.25)
      .setDepth(1);
    this.add.rectangle(width / 2, height - 14, width, 28, 0x151d20, 1).setDepth(0.8);
  }

  private createCharacters(): void {
    const floorY = this.scale.height - 88;
    const p1 = this.add.sprite(742, floorY, "player-p1").setScale(1.08).setDepth(8);
    const p2 = this.add.sprite(796, floorY, "player-p2").setScale(1.08).setDepth(8);
    const guard = this.add.sprite(868, floorY, "guard").setScale(1.08).setDepth(7);
    p1.play("player-p1-idle");
    p2.play("player-p2-idle");
    guard.play("guard-walk");
    guard.setFlipX(true);

    this.add.image(688, floorY - 6, "key").setScale(0.68).setDepth(7);
    this.add.image(925, floorY - 42, "gate").setScale(0.68).setDepth(5);
  }

  private createTitleText(): void {
    this.add
      .text(56, 52, "JAILBREAK", {
        fontFamily: "Impact, ui-monospace, monospace",
        fontSize: "76px",
        color: "#f8edd0",
        stroke: "#070b0d",
        strokeThickness: 8
      })
      .setDepth(10);

    this.add
      .text(62, 126, "Get the key. Reach the gate. Do not trust the quiet floors.", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "18px",
        color: "#b9c7c4"
      })
      .setDepth(10);
  }

  private createInstructions(): void {
    const instructionStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "ui-monospace, monospace",
      fontSize: "16px",
      color: "#f4e8cc",
      lineSpacing: 8
    };
    const instructionLines = this.shouldShowMobileInstructions()
      ? [
          "Mobile landscape: semi-circle pad moves left/right and jump/climb up.",
          "Buttons: J Jump  H Hide  A Attack",
          "Hide beside crates, climb ladders, fight guards and monsters only when you have to."
        ]
      : [
          "1P solo: Arrows move/climb  Shift hide  . attack",
          "2P: P1 A/D/W/S/E/R  P2 Arrows/Shift/.",
          "Hide beside crates, climb ladders, fight guards and monsters only when you have to.",
          "In game: press 1 or 2 to restart in that player mode."
        ];

    this.add
      .text(64, 188, instructionLines, instructionStyle)
      .setDepth(10);
  }

  private shouldShowMobileInstructions(): boolean {
    const touchControlsParam = new URLSearchParams(window.location.search).get("touchControls");
    if (touchControlsParam === "1") {
      return true;
    }
    if (touchControlsParam === "0") {
      return false;
    }

    const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    return coarsePointer || this.sys.game.device.input.touch;
  }

  private createModeButtons(): void {
    const mobileInstructions = this.shouldShowMobileInstructions();

    this.add
      .text(64, 328, "START", {
        fontFamily: "ui-monospace, monospace",
        fontSize: "15px",
        color: "#7f918d"
      })
      .setDepth(10);

    this.createModeButton(
      64,
      360,
      288,
      76,
      1,
      "1 PLAYER",
      mobileInstructions ? "Tap to start" : "Press 1"
    );
    this.createModeButton(
      376,
      360,
      288,
      76,
      2,
      "2 PLAYERS",
      mobileInstructions ? "Tap to start" : "Press 2"
    );

    this.add
      .text(
        64,
        456,
        mobileInstructions
          ? "Tap a mode to start."
          : "Enter or Space starts the selected mode. Left/Right changes selection.",
        {
          fontFamily: "ui-monospace, monospace",
          fontSize: "14px",
          color: "#9baaa6"
        }
      )
      .setDepth(10);
  }

  private createModeButton(
    x: number,
    y: number,
    width: number,
    height: number,
    playerCount: PlayerCount,
    label: string,
    hint: string
  ): void {
    const background = this.add
      .rectangle(x, y, width, height, 0x1b292d, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x596b66, 1)
      .setDepth(10);
    const text = this.add
      .text(x + 22, y + 15, label, {
        fontFamily: "ui-monospace, monospace",
        fontSize: "25px",
        color: "#f8edd0"
      })
      .setDepth(11);
    const hintText = this.add
      .text(x + 24, y + 48, hint, {
        fontFamily: "ui-monospace, monospace",
        fontSize: "14px",
        color: "#9fb0ac"
      })
      .setDepth(11);

    const hitArea = this.add.zone(x, y, width, height).setOrigin(0, 0).setDepth(12);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on("pointerover", () => {
      this.selectedPlayerCount = playerCount;
      this.refreshModeButtons();
    });
    hitArea.on("pointerdown", () => this.startGame(playerCount));

    this.modeButtons.push({ playerCount, background, label: text, hint: hintText });
  }

  private createKeyboardControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.on("keydown-ONE", () => this.startGame(1));
    keyboard.on("keydown-TWO", () => this.startGame(2));
    keyboard.on("keydown-LEFT", () => this.selectMode(1));
    keyboard.on("keydown-RIGHT", () => this.selectMode(2));
    keyboard.on("keydown-A", () => this.selectMode(1));
    keyboard.on("keydown-D", () => this.selectMode(2));
    keyboard.on("keydown-ENTER", () => this.startGame(this.selectedPlayerCount));
    keyboard.on("keydown-SPACE", () => this.startGame(this.selectedPlayerCount));
  }

  private selectMode(playerCount: PlayerCount): void {
    this.selectedPlayerCount = playerCount;
    this.refreshModeButtons();
  }

  private refreshModeButtons(): void {
    for (const button of this.modeButtons) {
      const selected = button.playerCount === this.selectedPlayerCount;
      button.background
        .setFillStyle(selected ? 0x34524d : 0x1b292d, selected ? 1 : 0.94)
        .setStrokeStyle(selected ? 3 : 2, selected ? 0xf8d66d : 0x596b66, 1);
      button.label.setColor(selected ? "#fff3bf" : "#f8edd0");
      button.hint.setColor(selected ? "#f8d66d" : "#9fb0ac");
    }
  }

  private startGame(playerCount: PlayerCount): void {
    const url = new URL(window.location.href);
    url.searchParams.set("players", String(playerCount));
    window.history.replaceState({}, "", url);
    this.scene.start("GameScene", { playerCount });
  }
}
