// Canyon Courier — input: keyboard first, mouse as a gentle alternative.
// Arrow keys (or WASD) steer and pitch, Shift/Q work the throttle, Enter or
// Space starts, P pauses, M mutes. Moving the mouse steers toward the
// pointer while no key is held, for players who prefer it.

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function createInput(canvas) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, seen: false, lastMove: -100 };
  let startEdge = false;
  let pauseEdge = false;
  let muteEdge = false;

  window.addEventListener('keydown', (e) => {
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code) ||
      e.code === 'Space'
    ) {
      e.preventDefault();
    }
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Enter' || e.code === 'Space') startEdge = true;
    if (e.code === 'KeyP' || e.code === 'Escape') pauseEdge = true;
    if (e.code === 'KeyM') muteEdge = true;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointer.y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    pointer.seen = true;
    pointer.lastMove = performance.now() / 1000;
  });
  canvas.addEventListener('pointerdown', () => {
    startEdge = true;
  });

  return {
    /** The pilot's control for this instant, axes in [-1, 1]. */
    control(nowSeconds) {
      let steer = 0;
      let pitch = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) steer -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) steer += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) pitch += 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) pitch -= 1;
      if (steer === 0 && pitch === 0 && pointer.seen && nowSeconds - pointer.lastMove < 3) {
        steer = pointer.x;
        pitch = -pointer.y;
      }
      return {
        steer: clamp(steer, -1, 1),
        pitch: clamp(pitch, -1, 1),
        throttleUp: keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyE'),
        throttleDown: keys.has('KeyQ'),
      };
    },
    takeStart() {
      const v = startEdge;
      startEdge = false;
      return v;
    },
    takePause() {
      const v = pauseEdge;
      pauseEdge = false;
      return v;
    },
    takeMute() {
      const v = muteEdge;
      muteEdge = false;
      return v;
    },
  };
}
