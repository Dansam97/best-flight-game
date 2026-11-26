# best-flight-game

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Dansam97/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Dansam97/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Canyon Courier** — a complete arcade flight game in the browser. Take off from the valley runway at dawn and fly a little jet down a river canyon in chase view: thread the golden target rings (dead centre pays a streak bonus), skim rock spires for near-miss points, dodge the balloons, and don't meet the terrain. Three lives, rising levels, and a full instrument cluster — compass strip, artificial horizon, altitude and speed tapes and a throttle gauge — all drawn live on canvas. Controls: arrow keys or WASD to steer and pitch (the mouse steers too), Shift/Q for throttle, P pauses, M mutes. Sound is a small WebAudio synth: an engine that follows your airspeed, chimes for rings, a thump for the crashes you'd rather avoid. Everything is plain static files — no build step, no network, no dependencies — and the world is a fixed-step deterministic simulation, so a seed always flies the same valley.

## Run it

```sh
node serve.ts            # then open http://localhost:8080 in a desktop browser
node main.ts             # the hand-in: copies game/ + screenshots/ to /output and writes dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=p62m1pd8&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
