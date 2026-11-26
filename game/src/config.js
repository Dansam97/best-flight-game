// Canyon Courier — shared numbers: the view, the simulation step and the
// shape of the valley. Everything else derives from these.

/** Logical canvas size; the page scales it to the window. */
export const VIEW = { width: 1280, height: 720 };

/** Fixed simulation step, in seconds: the world advances in these slices. */
export const STEP = 1 / 120;

export const WORLD = {
  /** Metres ahead of the plane that objects are spawned and kept. */
  viewDistance: 720,
  /** Half-width of the flat valley floor before the walls rise. */
  valleyHalf: 62,
  /** How high the valley walls climb at their steepest. */
  wallHeight: 95,
  /** The runway occupies z in [0, runwayEnd] at the start of a run. */
  runwayEnd: 430,
  /** Half-width of the runway strip. */
  runwayHalf: 11,
};

export const PLANE = {
  /** Speed at closed and fully open throttle, in metres per second. */
  minSpeed: 15,
  maxSpeed: 62,
  /** Radius of a target ring, in metres. */
  ringRadius: 9.5,
  /** Passing within this distance of a ring's centre counts as threaded. */
  threadRadius: 3.2,
};
