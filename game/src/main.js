// Canyon Courier — the bootstrap. It wires the world, the input, the sound
// and the drawing into a fixed-step loop, runs the title / play / game-over
// screens, and — when the page is opened with ?shot=start|play|end&seed=N —
// stages one deterministic screenshot scene instead of starting the loop.

import { STEP } from './config.js';
import {
  createWorld,
  EVENT_CRASH,
  EVENT_LEVEL,
  EVENT_OVER,
  EVENT_RING,
  EVENT_THREAD,
} from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

const world = createWorld(seed);
const input = createInput(canvas);
const audio = createAudio();

let screen = 'title'; // title | play | over
let best = 0;
let paused = false;

function announce() {
  const s = world.state;
  statusEl.textContent =
    screen === 'title'
      ? 'Canyon Courier. Press Enter to fly.'
      : screen === 'over'
        ? `Route over. Score ${Math.floor(s.score)}, rings ${s.rings}. Press Enter to fly again.`
        : `Score ${Math.floor(s.score)}, rings ${s.rings}, lives ${s.lives}.`;
}

function handleEvents(events) {
  if (events & EVENT_THREAD) audio.ring(true);
  else if (events & EVENT_RING) audio.ring(false);
  if (events & EVENT_LEVEL) audio.level();
  if (events & EVENT_CRASH) audio.crash();
}

if (shotName) {
  screen = stageShot(shotName, world);
  const draw = () => render(ctx, { state: world.state, screen, best: 0, paused: false, muted: true });
  draw();
  window.__shotReady = true;
  // Keep repainting the staged frame so a screenshot taken a moment later
  // still catches it exactly.
  setInterval(draw, 300);
  announce();
} else {
  let last = performance.now();
  let acc = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    const frame = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (input.takeMute()) audio.toggleMute();
    if (input.takePause() && screen === 'play') paused = !paused;
    if (input.takeStart()) {
      audio.ensure();
      if (screen !== 'play' || world.state.status === 'over') {
        world.reset((Math.random() * 1e9) | 0);
        world.start();
        screen = 'play';
        paused = false;
        announce();
      }
    }

    if (!paused) {
      acc += frame;
      const control =
        screen === 'play'
          ? input.control(now / 1000)
          : { steer: 0, pitch: 0, throttleUp: false, throttleDown: false };
      while (acc >= STEP) {
        const events = world.step(STEP, control);
        handleEvents(events);
        if (events & EVENT_OVER) {
          screen = 'over';
          announce();
        }
        acc -= STEP;
      }
    }

    if (world.state.score > best) best = world.state.score;
    audio.setEngine(world.state.plane.speed, world.state.plane.throttle, screen === 'play' && !paused);
    render(ctx, { state: world.state, screen, best, paused, muted: audio.muted });
  };
  requestAnimationFrame(loop);
}
