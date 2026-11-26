// Canyon Courier — the drawing. Everything is procedural canvas work: a
// dawn sky over a river valley, the jet in chase view, and a lit instrument
// cluster. The world is projected with a simple pinhole model — an object's
// screen offset from centre grows with its size and shrinks with its
// distance — and painted far to near.

import { VIEW, WORLD } from './config.js';
import { groundHeight, KIND_BALLOON, KIND_CLOUD, KIND_RING, KIND_SPIRE, KIND_TREE } from './world.js';

const W = VIEW.width;
const H = VIEW.height;
const CX = W / 2;
const FOCAL = 470;
const SLICES = [2.5, 4, 6, 9, 13, 19, 27, 38, 52, 72, 100, 140, 195, 270, 380, 540, 780];

function horizon(state) {
  return 296 + state.plane.pitch * 30;
}

function project(state, x, y, z) {
  const p = state.plane;
  // On the title screen the camera sits a little behind and above the parked
  // jet, so the runway and the valley read properly instead of exploding
  // past the lens at ground level.
  const camAlt = state.status === 'ready' ? p.alt + 10 : p.alt;
  const camZ = state.status === 'ready' ? p.z - 16 : p.z;
  const dz = z - camZ;
  if (dz < 0.6) return null;
  const s = FOCAL / dz;
  return { x: CX + (x - p.x) * s, y: horizon(state) + (camAlt - y) * s, s };
}

function ridgeY(x, a, b, c) {
  return Math.sin(x * a) * 0.55 + Math.sin(x * b + 1.3) * 0.3 + Math.sin(x * c + 4.1) * 0.15;
}

export function render(ctx, view) {
  const { state, screen } = view;
  ctx.clearRect(0, 0, W, H);
  drawSky(ctx, state);
  drawGround(ctx, state);
  drawObjects(ctx, state);
  if (state.status !== 'crashed') drawPlane(ctx, state);
  else drawWreck(ctx, state);
  drawHud(ctx, view);
  if (screen === 'title') drawTitle(ctx, view);
  if (screen === 'over') drawOver(ctx, view);
  if (view.paused) drawCentred(ctx, 'PAUSED', H * 0.44, 44, '#ffffff');
  // A soft vignette to sit the scene in a cockpit frame.
  const vg = ctx.createRadialGradient(CX, H / 2, H * 0.42, CX, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(10,10,20,0)');
  vg.addColorStop(1, 'rgba(10,10,20,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,64,32,${(state.flash * 0.45).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawSky(ctx, state) {
  const hz = horizon(state);
  const sky = ctx.createLinearGradient(0, 0, 0, hz + 40);
  sky.addColorStop(0, '#274b73');
  sky.addColorStop(0.55, '#7fa8c9');
  sky.addColorStop(0.85, '#f2c184');
  sky.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, hz + 40);

  // Sun, low over the valley, drifting against the steering.
  const sunX = CX + 330 - state.plane.x * 0.35;
  const sunY = hz - 118;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
  glow.addColorStop(0, 'rgba(255,236,190,0.95)');
  glow.addColorStop(0.25, 'rgba(255,205,120,0.55)');
  glow.addColorStop(1, 'rgba(255,205,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
  ctx.fillStyle = '#ffedb8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();

  // Two mountain ridges, far and near, parallax against the plane's drift.
  drawRidge(ctx, state, hz + 6, 64, 0.011, 0.9, '#7186a3');
  drawRidge(ctx, state, hz + 10, 92, 0.017, 1.9, '#4c6076');

  // Slow decorative clouds high up.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 6; i += 1) {
    const cx = ((i * 263 + state.time * 5 - state.plane.x * 0.4) % (W + 260)) - 130;
    const cy = 36 + ((i * 53) % 120);
    const r = 16 + ((i * 29) % 22);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 2.1, r * 0.62, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.9, cy + 3, r * 1.3, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRidge(ctx, state, baseY, amp, freq, par, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-4, baseY + 4);
  for (let x = -4; x <= W + 4; x += 28) {
    const wx = (x + state.plane.x * par) * freq;
    ctx.lineTo(x, baseY - (ridgeY(wx, 1, 2.7, 6.1) * 0.5 + 0.5) * amp);
  }
  ctx.lineTo(W + 4, baseY + 4);
  ctx.closePath();
  ctx.fill();
}

function groundY(ctx, state, z) {
  const pr = project(state, state.plane.x, 0, z);
  return pr ? pr.y : horizon(state);
}

function drawGround(ctx, state) {
  const hz = horizon(state);
  const p = state.plane;
  const base = ctx.createLinearGradient(0, hz, 0, H);
  base.addColorStop(0, '#7a9a58');
  base.addColorStop(0.4, '#5d8148');
  base.addColorStop(1, '#3d5c31');
  ctx.fillStyle = base;
  ctx.fillRect(0, hz, W, H - hz);

  // Distance bands: alternating meadow shades rushing toward the viewer.
  for (let i = 0; i < SLICES.length - 1; i += 1) {
    const y0 = groundY(ctx, state, p.z + SLICES[i]);
    const y1 = groundY(ctx, state, p.z + SLICES[i + 1]);
    if (y0 > H + 60 || y1 < hz - 2) continue;
    const band = Math.floor((p.z + SLICES[i]) / 26) % 2 === 0;
    ctx.fillStyle = band ? 'rgba(255,255,230,0.055)' : 'rgba(20,40,16,0.06)';
    ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0) + 1.5);
  }

  // A pale dirt track down the valley floor, for the sense of speed.
  ctx.fillStyle = 'rgba(240,230,190,0.10)';
  ctx.beginPath();
  let started = false;
  for (let i = SLICES.length - 1; i >= 0; i -= 1) {
    const pr = project(state, -17, 0, p.z + SLICES[i]);
    if (!pr) continue;
    if (!started) {
      ctx.moveTo(pr.x, pr.y);
      started = true;
    } else ctx.lineTo(pr.x, pr.y);
  }
  for (let i = 0; i < SLICES.length; i += 1) {
    const pr = project(state, 17, 0, p.z + SLICES[i]);
    if (pr) ctx.lineTo(pr.x, pr.y);
  }
  ctx.closePath();
  ctx.fill();

  drawWall(ctx, state, -1);
  drawWall(ctx, state, 1);
  if (p.z < WORLD.runwayEnd + 80) drawRunway(ctx, state);
}

function drawWall(ctx, state, side) {
  const p = state.plane;
  const crestX = side * (WORLD.valleyHalf + 18);
  const footX = side * WORLD.valleyHalf;
  // The wall is a slope between its foot at the valley floor and its crest,
  // drawn as one quad per distance slice with alternating rock shades, so
  // the face reads as strata rushing past instead of a flat slab.
  for (let i = SLICES.length - 2; i >= 0; i -= 1) {
    const zA = p.z + SLICES[i];
    const zB = p.z + SLICES[i + 1];
    const cA = project(state, crestX, groundHeight(crestX, zA), zA);
    const cB = project(state, crestX, groundHeight(crestX, zB), zB);
    const fA = project(state, footX, groundHeight(footX, zA), zA);
    const fB = project(state, footX, groundHeight(footX, zB), zB);
    if (!cA || !cB || !fA || !fB) continue;
    const band = Math.floor(zA / 30) % 2 === 0;
    ctx.fillStyle = side < 0 ? (band ? '#6e543c' : '#63492f') : band ? '#654e36' : '#5a432c';
    ctx.beginPath();
    ctx.moveTo(cB.x, cB.y);
    ctx.lineTo(cA.x, cA.y);
    ctx.lineTo(fA.x, fA.y);
    ctx.lineTo(fB.x, fB.y);
    ctx.closePath();
    ctx.fill();
  }
  // A lighter rock line along the wall's crest.
  ctx.strokeStyle = 'rgba(230,210,180,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let first = true;
  for (let i = SLICES.length - 1; i >= 0; i -= 1) {
    const z = p.z + SLICES[i];
    const pr = project(state, crestX, groundHeight(crestX, z), z);
    if (!pr) continue;
    if (first) {
      ctx.moveTo(pr.x, pr.y);
      first = false;
    } else ctx.lineTo(pr.x, pr.y);
  }
  ctx.stroke();
}

function drawRunway(ctx, state) {
  const p = state.plane;
  const zNear = Math.max(0, p.z - 46);
  const zFar = WORLD.runwayEnd;
  // Clamp the near corners to just ahead of the nose so the strip still
  // renders during the takeoff roll, when its near end is under the jet.
  const ahead = (z) => Math.max(z, p.z + 1.2);
  const corners = [
    project(state, -WORLD.runwayHalf, 0, ahead(zFar)),
    project(state, WORLD.runwayHalf, 0, ahead(zFar)),
    project(state, WORLD.runwayHalf, 0, ahead(zNear)),
    project(state, -WORLD.runwayHalf, 0, ahead(zNear)),
  ];
  if (corners.every(Boolean)) {
    ctx.fillStyle = '#494a52';
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fill();
    // Centreline dashes.
    ctx.fillStyle = '#e8e4da';
    for (let z = 14; z < zFar - 8; z += 30) {
      if (z < zNear) continue;
      const a = project(state, -0.7, 0, z);
      const b = project(state, 0.7, 0, z + 13);
      if (a && b) ctx.fillRect(a.x, a.y, b.x - a.x, Math.max(1.5, b.y - a.y));
    }
    // Edge lights.
    for (let z = 6; z < zFar; z += 30) {
      for (const sx of [-WORLD.runwayHalf, WORLD.runwayHalf]) {
        const pr = project(state, sx, 0.4, z);
        if (!pr) continue;
        ctx.fillStyle = '#ffd97a';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, Math.max(1.2, pr.s * 0.55), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawObjects(ctx, state) {
  const sorted = [...state.objects].sort((a, b) => b.z - a.z);
  // The next ring ahead is the target; it gets the golden glow.
  let target = null;
  for (const o of state.objects) {
    if (o.kind === KIND_RING && !o.passed && (target === null || o.z < target.z)) target = o;
  }
  for (const o of sorted) {
    const dz = o.z - state.plane.z;
    if (dz < 0.6 || dz > WORLD.viewDistance) continue;
    if (o.kind === KIND_TREE) drawTree(ctx, state, o);
    else if (o.kind === KIND_SPIRE) drawSpire(ctx, state, o);
    else if (o.kind === KIND_BALLOON) drawBalloon(ctx, state, o);
    else if (o.kind === KIND_CLOUD) drawCloud(ctx, state, o);
    else if (o.kind === KIND_RING) drawRing(ctx, state, o, o === target);
  }
  // A small guide chevron over the target ring while it is still far off.
  if (target && target.z - state.plane.z > 130) {
    const pr = project(state, target.x, target.y, target.z);
    if (pr) {
      ctx.fillStyle = 'rgba(255,207,77,0.9)';
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y - 26);
      ctx.lineTo(pr.x - 8, pr.y - 38);
      ctx.lineTo(pr.x + 8, pr.y - 38);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawTree(ctx, state, o) {
  const pr = project(state, o.x, o.y, o.z);
  if (!pr) return;
  const h = o.s * pr.s;
  ctx.fillStyle = '#4a3826';
  ctx.fillRect(pr.x - pr.s * 0.12, pr.y - h * 0.3, pr.s * 0.24, h * 0.3);
  ctx.fillStyle = '#2f5d33';
  for (let i = 0; i < 3; i += 1) {
    const w = h * (0.62 - i * 0.15);
    const y = pr.y - h * (0.22 + i * 0.26);
    ctx.beginPath();
    ctx.moveTo(pr.x - w / 2, y);
    ctx.lineTo(pr.x + w / 2, y);
    ctx.lineTo(pr.x, y - h * 0.34);
    ctx.closePath();
    ctx.fill();
  }
}

function drawSpire(ctx, state, o) {
  const baseL = project(state, o.x - 6, groundHeight(o.x - 6, o.z), o.z);
  const baseR = project(state, o.x + 6, groundHeight(o.x + 6, o.z), o.z);
  const apex = project(state, o.x, o.y, o.z);
  if (!baseL || !baseR || !apex) return;
  const grad = ctx.createLinearGradient(baseL.x, 0, baseR.x, 0);
  grad.addColorStop(0, '#7a6753');
  grad.addColorStop(0.5, '#96836a');
  grad.addColorStop(1, '#5d4c3a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(baseL.x, baseL.y);
  ctx.lineTo(apex.x, apex.y);
  ctx.lineTo(baseR.x, baseR.y);
  ctx.closePath();
  ctx.fill();
  if (o.y > 58) {
    ctx.fillStyle = 'rgba(245,248,252,0.9)';
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(apex.x - apex.s * 1.1, apex.y + apex.s * 2.6);
    ctx.lineTo(apex.x + apex.s * 1.1, apex.y + apex.s * 2.6);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBalloon(ctx, state, o) {
  const pr = project(state, o.x, o.y, o.z);
  if (!pr) return;
  const r = o.r * pr.s;
  if (r < 1.5) return;
  const grad = ctx.createRadialGradient(pr.x - r * 0.3, pr.y - r * 0.35, r * 0.15, pr.x, pr.y, r);
  grad.addColorStop(0, '#ffb3c2');
  grad.addColorStop(0.6, '#e5484d');
  grad.addColorStop(1, '#a52a30');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,40,30,0.65)';
  ctx.lineWidth = Math.max(1, pr.s * 0.16);
  ctx.beginPath();
  ctx.moveTo(pr.x - r * 0.45, pr.y + r * 0.8);
  ctx.lineTo(pr.x - r * 0.16, pr.y + r * 1.35);
  ctx.moveTo(pr.x + r * 0.45, pr.y + r * 0.8);
  ctx.lineTo(pr.x + r * 0.16, pr.y + r * 1.35);
  ctx.stroke();
  ctx.fillStyle = '#6e4a2f';
  ctx.fillRect(pr.x - r * 0.2, pr.y + r * 1.3, r * 0.4, r * 0.3);
}

function drawCloud(ctx, state, o) {
  const pr = project(state, o.x, o.y, o.z);
  if (!pr) return;
  const r = o.s * pr.s;
  if (r < 2) return;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.ellipse(pr.x, pr.y, r * 1.9, r * 0.55, 0, 0, Math.PI * 2);
  ctx.ellipse(pr.x - r * 0.8, pr.y + r * 0.12, r * 1.1, r * 0.42, 0, 0, Math.PI * 2);
  ctx.ellipse(pr.x + r * 0.85, pr.y + r * 0.1, r * 1.2, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRing(ctx, state, o, isTarget) {
  const pr = project(state, o.x, o.y, o.z);
  if (!pr) return;
  const r = o.r * pr.s;
  if (r < 2) return;
  ctx.save();
  if (isTarget) {
    ctx.shadowColor = 'rgba(255,190,60,0.95)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#ffcf4d';
  } else {
    ctx.strokeStyle = '#4fe3c1';
  }
  ctx.lineWidth = Math.max(2, pr.s * 0.55);
  ctx.beginPath();
  ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = isTarget ? 'rgba(255,207,77,0.10)' : 'rgba(79,227,193,0.07)';
  ctx.beginPath();
  ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlane(ctx, state) {
  const p = state.plane;
  // Ground shadow first, while the transform is clean.
  const sh = project(state, p.x, groundHeight(p.x, p.z) + 0.4, p.z + 4);
  if (sh && state.status !== 'ready') {
    const hgt = Math.max(0, p.alt - groundHeight(p.x, p.z));
    ctx.fillStyle = `rgba(20,30,16,${Math.max(0.05, 0.3 - hgt * 0.003)})`;
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, Math.max(6, 120 - hgt * 0.9), Math.max(2, 26 - hgt * 0.2), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const px = CX - p.bank * 18;
  const py = 488 - p.pitch * 16 + (state.status === 'flying' ? Math.sin(state.time * 2.1) * 2 : 0);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(p.bank * 0.55);
  if (p.invuln > 0 && Math.floor(state.time * 9) % 2 === 0) ctx.globalAlpha = 0.45;

  // Afterburner glow, sized by throttle.
  const flick = 0.85 + Math.sin(state.time * 41) * 0.15;
  const glowR = (7 + p.throttle * 13) * flick;
  const glow = ctx.createRadialGradient(0, 30, 1, 0, 30, glowR * 2.1);
  glow.addColorStop(0, 'rgba(255,244,200,0.95)');
  glow.addColorStop(0.4, 'rgba(255,150,50,0.75)');
  glow.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 30 + glowR * 0.5, glowR * 0.8, glowR * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main wing, swept.
  ctx.fillStyle = '#9fb2c8';
  ctx.beginPath();
  ctx.moveTo(-88, 12);
  ctx.lineTo(-22, -3);
  ctx.lineTo(22, -3);
  ctx.lineTo(88, 12);
  ctx.lineTo(70, 22);
  ctx.lineTo(-70, 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(40,55,75,0.35)';
  ctx.fillRect(-88, 12, 176, 3);

  // Fuselage, seen from behind and slightly above.
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, '#77879c');
  body.addColorStop(0.5, '#d7e0ec');
  body.addColorStop(1, '#77879c');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spine stripe and canopy.
  ctx.fillStyle = '#e8563f';
  ctx.fillRect(-2.5, -34, 5, 44);
  ctx.fillStyle = '#a8dcf2';
  ctx.beginPath();
  ctx.ellipse(0, -14, 8.5, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-3, -19, 3, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tailplane and twin fins.
  ctx.fillStyle = '#8fa3ba';
  ctx.beginPath();
  ctx.moveTo(-36, 26);
  ctx.lineTo(36, 26);
  ctx.lineTo(27, 36);
  ctx.lineTo(-27, 36);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7d92ab';
  for (const fx of [-13, 13]) {
    ctx.beginPath();
    ctx.moveTo(fx - 4, 30);
    ctx.lineTo(fx - 4, 4);
    ctx.lineTo(fx + 4, 4);
    ctx.lineTo(fx + 4, 30);
    ctx.closePath();
    ctx.fill();
  }

  // Navigation lights: red left, green right, white strobe on the tail.
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(-88, 13, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#37e08b';
  ctx.beginPath();
  ctx.arc(88, 13, 3.4, 0, Math.PI * 2);
  ctx.fill();
  if ((state.time * 1.4) % 1 < 0.07) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 34, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWreck(ctx, state) {
  const t = 1.35 - state.crashTimer; // seconds since the crash
  const px = CX;
  const py = 500;
  if (t < 0.55) {
    const r = 26 + t * 150;
    const grad = ctx.createRadialGradient(px, py, 2, px, py, r);
    grad.addColorStop(0, 'rgba(255,240,190,0.95)');
    grad.addColorStop(0.5, 'rgba(255,130,40,0.8)');
    grad.addColorStop(1, 'rgba(200,50,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(40,40,46,0.75)';
  for (let i = 0; i < 5; i += 1) {
    const sx = px + Math.sin(i * 2.4) * (18 + t * 26);
    const sy = py - 12 - t * (26 + i * 7);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 15 + t * 15 + i * 2, 10 + t * 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, view) {
  const { state } = view;
  const p = state.plane;
  ctx.save();
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  // Score block, top left.
  ctx.fillStyle = 'rgba(8,14,24,0.55)';
  roundRect(ctx, 18, 16, 208, 96, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd97a';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(String(Math.floor(state.score)).padStart(6, '0'), 32, 42);
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3f5';
  ctx.fillText(`RINGS ${state.rings}   LEVEL ${state.level}`, 32, 70);
  ctx.fillText(`STREAK ${state.streak}`, 32, 92);
  // Lives as little jets.
  for (let i = 0; i < state.lives; i += 1) {
    ctx.fillStyle = '#ffcf4d';
    ctx.beginPath();
    const lx = 246 + i * 24;
    ctx.moveTo(lx, 26);
    ctx.lineTo(lx + 15, 33);
    ctx.lineTo(lx, 40);
    ctx.lineTo(lx + 4, 33);
    ctx.closePath();
    ctx.fill();
  }

  drawCompass(ctx, p.heading);
  drawArtificialHorizon(ctx, state);
  drawTapes(ctx, state);

  if (view.muted) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('SOUND OFF (M)', W - 128, H - 18);
  }

  // Centre announcements.
  if (state.message && state.time < state.messageUntil) {
    const left = state.messageUntil - state.time;
    ctx.globalAlpha = Math.min(1, left * 2.4);
    drawCentred(ctx, state.message, 168, 40, '#ffe9a8');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCompass(ctx, heading) {
  const w = 380;
  const x0 = CX - w / 2;
  ctx.fillStyle = 'rgba(8,14,24,0.55)';
  roundRect(ctx, x0, 16, w, 40, 10);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 + 6, 18, w - 12, 36);
  ctx.clip();
  ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 5) {
    const hdg = ((Math.round((heading + d) / 5) * 5) % 360 + 360) % 360;
    const x = CX + d * 4.4;
    const cardinal = hdg % 90 === 0;
    ctx.fillStyle = cardinal ? '#ffd97a' : 'rgba(230,240,250,0.6)';
    ctx.fillRect(x - 1, cardinal ? 24 : 30, 2, cardinal ? 12 : 7);
    if (cardinal) {
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText('NESW'[hdg / 90], x, 48);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffcf4d';
  ctx.beginPath();
  ctx.moveTo(CX, 58);
  ctx.lineTo(CX - 6, 66);
  ctx.lineTo(CX + 6, 66);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'left';
}

function drawArtificialHorizon(ctx, state) {
  const p = state.plane;
  const cx = 86;
  const cy = H - 92;
  const r = 56;
  ctx.save();
  ctx.fillStyle = 'rgba(8,14,24,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-p.bank * 0.55);
  ctx.translate(0, p.pitch * 22);
  ctx.fillStyle = '#3f7fbf';
  ctx.fillRect(-r - 12, -r - 40, (r + 12) * 2, r + 40);
  ctx.fillStyle = '#8a6a44';
  ctx.fillRect(-r - 12, 0, (r + 12) * 2, r + 40);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r - 12, 0);
  ctx.lineTo(r + 12, 0);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  for (const off of [-22, 22]) {
    ctx.beginPath();
    ctx.moveTo(-13, off);
    ctx.lineTo(13, off);
    ctx.stroke();
  }
  ctx.restore();
  // Fixed aircraft symbol over the gauge.
  ctx.strokeStyle = '#ffcf4d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy);
  ctx.lineTo(cx - 8, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx + 8, cy);
  ctx.lineTo(cx + 26, cy);
  ctx.stroke();
  ctx.fillStyle = '#ffcf4d';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawTapes(ctx, state) {
  const p = state.plane;
  const altFt = Math.round(p.alt * 3.281);
  const spdKt = Math.round(p.speed * 1.944);
  ctx.fillStyle = 'rgba(8,14,24,0.55)';
  roundRect(ctx, W - 196, H - 164, 178, 148, 10);
  ctx.fill();
  ctx.fillStyle = '#9fd8ef';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('ALTITUDE', W - 182, H - 140);
  ctx.fillText('SPEED', W - 182, H - 84);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 25px system-ui, sans-serif';
  ctx.fillText(`${altFt} ft`, W - 182, H - 114);
  ctx.fillText(`${spdKt} kt`, W - 182, H - 58);
  // Throttle bar along the bottom of the box.
  ctx.fillStyle = '#9fd8ef';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('THR', W - 182, H - 36);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(W - 182, H - 27, 150, 8);
  ctx.fillStyle = '#ffcf4d';
  ctx.fillRect(W - 182, H - 27, 150 * p.throttle, 8);
}

function drawCentred(ctx, text, y, size, colour) {
  ctx.save();
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = colour;
  ctx.fillText(text, CX, y);
  ctx.restore();
}

function drawTitle(ctx, view) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(6,10,20,0.52)');
  grad.addColorStop(0.45, 'rgba(6,10,20,0.08)');
  grad.addColorStop(1, 'rgba(6,10,20,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawCentred(ctx, 'CANYON COURIER', 120, 74, '#ffe9a8');
  drawCentred(ctx, 'Thread the golden rings. Mind the spires. Bring her home.', 168, 22, '#eaf4ff');
  ctx.save();
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d7e6f5';
  ctx.fillText('← →  steer        ↑ ↓  climb and dive        SHIFT / Q  throttle', CX, H - 148);
  ctx.fillText('Mouse steers too —  P pauses, M mutes', CX, H - 118);
  ctx.restore();
  if (view.best > 0) drawCentred(ctx, `BEST ${Math.floor(view.best)}`, H - 84, 20, '#ffd97a');
  if (Math.floor(view.state.time * 1.6) % 2 === 0) {
    drawCentred(ctx, 'PRESS ENTER TO FLY', H - 48, 26, '#ffffff');
  }
}

function drawOver(ctx, view) {
  const s = view.state;
  ctx.fillStyle = 'rgba(6,10,20,0.62)';
  ctx.fillRect(0, 0, W, H);
  drawCentred(ctx, 'ROUTE OVER', 190, 62, '#ffb199');
  ctx.save();
  ctx.font = '600 23px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf4ff';
  const lines = [
    `SCORE  ${Math.floor(s.score)}`,
    `RINGS  ${s.rings}      BEST STREAK  ${s.bestStreak}`,
    `DISTANCE  ${(s.distance / 1000).toFixed(1)} km      LEVEL  ${s.level}`,
    `BEST  ${Math.floor(Math.max(view.best, s.score))}`,
  ];
  lines.forEach((line, i) => ctx.fillText(line, CX, 268 + i * 38));
  ctx.restore();
  if (Math.floor(s.time * 1.6) % 2 === 0) drawCentred(ctx, 'PRESS ENTER TO FLY AGAIN', H - 60, 25, '#ffffff');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
