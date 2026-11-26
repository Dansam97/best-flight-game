// The screenshot scenes behind ?shot=start|play|end. Each stages the real
// game from a fresh world and flies it forward with an autopilot, so a frame
// is what a short game really looks like — and the same seed always stages
// the same frame. The play pilot aims for the next ring and gives spires a
// wide berth; the end pilot is a show-off who dives at the rocks, which is
// how the route ends for the third screenshot.

import { STEP } from './config.js';
import { groundHeight, KIND_BALLOON, KIND_RING, KIND_SPIRE } from './world.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function nextOfKind(state, kind) {
  let best = null;
  for (const o of state.objects) {
    if (o.kind === kind && !o.passed && (best === null || o.z < best.z)) best = o;
  }
  return best;
}

/** A careful pilot: chase the next ring, refuse the rocks. */
function carefulPilot(state) {
  const p = state.plane;
  let steer = 0;
  let pitch = 0;
  const ring = nextOfKind(state, KIND_RING);
  if (ring) {
    steer = clamp((ring.x - p.x) / 16, -1, 1);
    pitch = clamp((ring.y - p.alt) / 14, -1, 1);
  }
  for (const o of state.objects) {
    if (o.passed) continue;
    const dz = o.z - p.z;
    if (dz < 0 || dz > 130) continue;
    const dx = o.x - p.x;
    if (o.kind === KIND_SPIRE && Math.abs(dx) < 15) {
      steer = dx > 0 ? -1 : 1;
      if (p.alt < o.y + 12) pitch = 1;
    }
    if (o.kind === KIND_BALLOON && Math.abs(dx) < 10 && Math.abs(o.y - p.alt) < 10) {
      steer = dx > 0 ? -0.8 : 0.8;
    }
  }
  if (p.alt < groundHeight(p.x, p.z + 30) + 20) pitch = 1;
  return { steer, pitch, throttleUp: p.throttle < 0.82, throttleDown: p.throttle > 0.92 };
}

/** A reckless pilot: the rocks are the destination. */
function recklessPilot(state) {
  const p = state.plane;
  const spire = nextOfKind(state, KIND_SPIRE);
  let steer = 0;
  let pitch = -0.4;
  if (spire) {
    steer = clamp((spire.x - p.x) / 10, -1, 1);
    pitch = clamp((spire.y - 6 - p.alt) / 12, -1, 1);
  } else if (p.alt > 26) {
    pitch = -1;
  }
  return { steer, pitch, throttleUp: true, throttleDown: false };
}

function run(world, seconds, pilot, stopAtOver) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, pilot(world.state));
    if (stopAtOver && world.state.status === 'over') break;
  }
}

/**
 * Stage the named scene (start, play or end; anything else is start) on a
 * freshly reset world and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset(world.seed);
  if (name === 'play') {
    world.start();
    run(world, 17, carefulPilot, false);
    return world.state.status === 'over' ? 'over' : 'play';
  }
  if (name === 'end') {
    world.start();
    run(world, 420, recklessPilot, true);
    return world.state.status === 'over' ? 'over' : 'play';
  }
  // Start: idle on the runway while the valley breathes for a few seconds.
  run(world, 3, () => ({ steer: 0, pitch: 0, throttleUp: false, throttleDown: false }), false);
  return 'title';
}
