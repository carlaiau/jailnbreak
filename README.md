# Jailbreak Platformer

A small Phaser platformer about breaking out of a procedurally generated jail. Find the key, reach the exit gate, and survive guards, monsters, ladders, lava rooms, crates, and shifting platform layouts.

## Run

```bash
npm install
npm run dev
```

The dev server runs on `http://127.0.0.1:5173` by default.

## Build And Test

```bash
npm test
npm run build
```

## Player Modes

The title screen lets you start in either mode:

- `1 Player`: starts with only P1.
- `2 Players`: starts with P1 and P2 together.

You can also add `?players=1` or `?players=2` to the URL. During play, press `1` or `2` to restart the current seed in that mode.

## Controls

Solo mode uses the P2 keyboard controls for the P1 character.

P1:

- Move: `A` / `D`
- Jump or climb up: `W`
- Climb down: `S`
- Hide beside crates: `E`
- Attack: `R`, randomly punches or kicks

P2:

- Move: `Left` / `Right`
- Jump or climb up: `Up`
- Climb down: `Down`
- Hide beside crates: `Shift`
- Attack: `.`, randomly punches or kicks

Mobile landscape:

- Touch controls appear automatically on coarse-pointer landscape devices.
- Add `?touchControls=1` to the URL to force them on during desktop testing.
- Each player pad reserves its side of the screen and uses a semi-circle pad for left/right movement and jump/climb up, plus hide and attack.

## Goal

Collect the key, then reach the exit gate. Enemies can damage the key carrier, so carrying the key is an objective state, not invincibility.
