// Canyon Courier — the world: one valley, one jet, and everything in it.
//
// The simulation is pure (no DOM, no clock): step it with a fixed dt and a
// control object and it advances deterministically from its seed, which is
// what lets the screenshot scenes and the autopilot reproduce a run exactly.
//
// Units are metres and seconds. The plane flies down +z; x is lateral
// (negative left), alt is height above sea level, and the ground under the
// valley floor sits at 0 except where the walls rise.

import { PLANE, WORLD } from './config.js';
import { makeRng, range } from './random.js';

export const EVENT_RING = 1;
export const EVENT_THREAD = 2;
export const EVENT_NEAR = 4;
export const EVENT_CRASH = 8;
export const EVENT_LEVEL = 16;
export const EVENT_OVER = 32;

export const KIND_RING = 'ring';
export const KIND_SPIRE = 'spire';
export const KIND_BALLOON = 'balloon';
export const KIND_CLOUD = 'cloud';
export const KIND_TREE = 'tree';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Height of the ground at (x, z): flat runway, flat valley, rising walls. */
export function groundHeight(x, z) {
  if (z < WORLD.runwayEnd && Math.abs(x) < WORLD.runwayHalf + 2) return 0;
  const ax = Math.abs(x);
  let h = 0;
  if (ax > WORLD.valleyHalf) {
    const over = ax - WORLD.valleyHalf;
    h = Math.min(WORLD.wallHeight, over * over * 0.045);
  }
  if (z >= WORLD.runwayEnd) {
    h += Math.max(0, Math.sin(z * 0.011) * 2.2 + Math.sin(z * 0.004 + 1.7) * 1.6);
  }
  return h;
}

export function createWorld(seed = 1) {
  const world = {
    seed,
    rng: makeRng(seed),
    state: null,

    reset(newSeed) {
      if (newSeed !== undefined) {
        world.seed = newSeed;
        world.rng = makeRng(newSeed);
      }
      const rng = world.rng;
      world.state = {
        status: 'ready', // ready | takeoff | flying | crashed | over
        time: 0,
        plane: {
          x: 0,
          alt: 0,
          z: 0,
          speed: 0,
          throttle: 0,
          bank: 0,
          pitch: 0,
          heading: 0,
          invuln: 0,
        },
        score: 0,
        rings: 0,
        streak: 0,
        bestStreak: 0,
        lives: 3,
        level: 1,
        distance: 0,
        objects: [],
        spawnIn: 240,
        treeIn: 12,
        crashTimer: 0,
        takeoffTimer: 0,
        flash: 0,
        message: '',
        messageUntil: 0,
      };
      // Pre-fill the view ahead so the first frame is already a valley.
      for (let z = 300; z < WORLD.viewDistance; z += 85) spawnBatch(world, z);
      for (let z = 60; z < WORLD.viewDistance; z += 34) spawnTree(world, z + rng() * 16);
      return world.state;
    },

    start() {
      const s = world.state;
      if (s.status !== 'ready') return;
      s.status = 'takeoff';
      s.takeoffTimer = 2.8;
      say(s, 'TAKE OFF!', 1.4);
    },

    step(dt, control) {
      const s = world.state;
      const p = s.plane;
      s.time += dt;
      if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 1.6);

      if (s.status === 'ready' || s.status === 'over') return 0;

      if (s.status === 'crashed') {
        s.crashTimer -= dt;
        if (s.crashTimer <= 0) {
          if (s.lives <= 0) {
            s.status = 'over';
            return EVENT_OVER;
          }
          // Respawn mid-valley at a safe height, briefly untouchable.
          p.x *= 0.25;
          p.alt = Math.max(46, groundHeight(p.x, p.z) + 42);
          p.speed = 38;
          p.throttle = 0.75;
          p.bank = 0;
          p.pitch = 0;
          p.invuln = 2.5;
          s.status = 'flying';
          say(s, 'BACK IN THE AIR', 1.2);
        }
        return 0;
      }

      let events = 0;
      const takingOff = s.status === 'takeoff';
      if (takingOff) {
        s.takeoffTimer -= dt;
        p.throttle = Math.min(0.85, p.throttle + dt * 0.5);
        const lift = p.speed > 31;
        control = { steer: 0, pitch: lift ? 0.55 : 0, throttleUp: false, throttleDown: false };
        if (s.takeoffTimer <= 0 && p.alt > 12) s.status = 'flying';
      }

      // Throttle and speed.
      if (control.throttleUp) p.throttle = Math.min(1, p.throttle + dt * 0.55);
      if (control.throttleDown) p.throttle = Math.max(0, p.throttle - dt * 0.7);
      const targetSpeed =
        PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed) + (s.level - 1) * 1.2;
      const accel = targetSpeed > p.speed ? 5.5 : 9;
      p.speed += Math.sign(targetSpeed - p.speed) * Math.min(Math.abs(targetSpeed - p.speed), accel * dt);

      // Bank and pitch ease toward the pilot's input.
      p.bank += clamp(clamp(control.steer, -1, 1) - p.bank, -dt * 3.2, dt * 3.2);
      p.pitch += clamp(clamp(control.pitch, -1, 1) - p.pitch, -dt * 2.6, dt * 2.6);

      // Motion: banked flight slides sideways; pitch trades speed for height.
      p.x += p.bank * p.speed * 0.62 * dt;
      p.heading = ((p.bank * 30) % 360 + 360) % 360;
      let vs = p.pitch * 13.5 * Math.min(1, p.speed / 40);
      if (p.speed < 21) vs -= (21 - p.speed) * 0.55; // the stall bites
      p.alt += vs * dt;
      if (p.alt > 132) p.alt = 132;
      const dz = p.speed * dt;
      p.z += dz;
      s.distance += dz;
      s.score += dz * 0.04;
      if (p.invuln > 0) p.invuln -= dt;

      // Spawning, measured in metres travelled.
      s.spawnIn -= dz;
      if (s.spawnIn <= 0) {
        spawnBatch(world, p.z + WORLD.viewDistance);
        const gap = Math.max(58, 100 - s.level * 4);
        s.spawnIn = gap * range(world.rng, 0.8, 1.25);
      }
      s.treeIn -= dz;
      if (s.treeIn <= 0) {
        spawnTree(world, p.z + WORLD.viewDistance);
        s.treeIn = range(world.rng, 22, 46);
      }
      s.objects = s.objects.filter((o) => o.z > p.z - 40);

      // Ground contact outside the takeoff roll is a crash.
      const gh = groundHeight(p.x, p.z);
      if (!takingOff && p.alt <= gh + 1.1) {
        events |= crash(world);
        return events;
      }
      if (takingOff && p.alt < 0) p.alt = 0;

      // Crossings: objects the nose just passed.
      for (const o of s.objects) {
        if (o.passed || o.z > p.z) continue;
        o.passed = true;
        const dx = p.x - o.x;
        if (o.kind === KIND_RING) {
          const dist = Math.hypot(dx, p.alt - o.y);
          if (dist < PLANE.ringRadius) {
            const threaded = dist < PLANE.threadRadius;
            const pts = threaded ? 150 + s.streak * 10 : 100;
            s.score += pts;
            s.rings += 1;
            s.streak += 1;
            if (s.streak > s.bestStreak) s.bestStreak = s.streak;
            events |= threaded ? EVENT_THREAD : EVENT_RING;
            say(s, threaded ? `THREADED +${pts}` : `RING +${pts}`, 1.3);
            if (s.rings % 5 === 0) {
              s.level += 1;
              events |= EVENT_LEVEL;
              say(s, `LEVEL ${s.level} — FASTER NOW`, 1.6);
            }
          } else {
            s.streak = 0;
          }
        } else if (o.kind === KIND_SPIRE) {
          if (Math.abs(dx) < 5 && p.alt < o.y + 2) {
            events |= crash(world);
          } else if (Math.abs(dx) >= 5 && Math.abs(dx) < 12 && p.alt < o.y + 16 && p.alt > o.y - 6) {
            s.score += 25;
            events |= EVENT_NEAR;
            say(s, 'NEAR MISS +25', 1.1);
          }
        } else if (o.kind === KIND_BALLOON) {
          const dist = Math.hypot(dx, p.alt - o.y);
          if (dist < o.r + 2.5) events |= crash(world);
        }
        if (s.status === 'crashed') break;
      }
      return events;
    },
  };
  world.reset(seed);
  return world;
}

function say(s, text, seconds) {
  s.message = text;
  s.messageUntil = s.time + seconds;
}

function crash(world) {
  const s = world.state;
  if (s.plane.invuln > 0) return 0;
  s.lives -= 1;
  s.flash = 0.6;
  s.status = 'crashed';
  s.crashTimer = 1.35;
  s.streak = 0;
  say(s, s.lives > 0 ? `CRASHED — ${s.lives} LEFT` : 'CRASHED', 1.3);
  return EVENT_CRASH;
}

function spawnBatch(world, z) {
  const rng = world.rng;
  const s = world.state;
  const roll = rng();
  if (roll < 0.46) {
    s.objects.push({
      kind: KIND_RING,
      z,
      x: range(rng, -52, 52),
      y: range(rng, 20, 88),
      r: PLANE.ringRadius,
      passed: false,
    });
  } else if (roll < 0.72) {
    s.objects.push({ kind: KIND_SPIRE, z, x: range(rng, -72, 72), y: range(rng, 26, 82), passed: false });
  } else if (roll < 0.87) {
    s.objects.push({
      kind: KIND_BALLOON,
      z,
      x: range(rng, -58, 58),
      y: range(rng, 26, 92),
      r: 6.5,
      passed: false,
    });
  }
  if (rng() < 0.7) {
    s.objects.push({
      kind: KIND_CLOUD,
      z: z + range(rng, -40, 40),
      x: range(rng, -110, 110),
      y: range(rng, 55, 120),
      s: range(rng, 14, 30),
      passed: true,
    });
  }
}

function spawnTree(world, z) {
  const rng = world.rng;
  const side = rng() < 0.5 ? -1 : 1;
  const x = side * range(rng, 15, 58);
  world.state.objects.push({
    kind: KIND_TREE,
    z,
    x,
    y: groundHeight(x, z),
    s: range(rng, 3, 6.5),
    passed: true,
  });
}
