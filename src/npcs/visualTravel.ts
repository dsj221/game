import type { Point } from "./navigation.ts";

/** Consume frame time along queued grid edges while preserving every corner. */
export function moveVisual(
  position: Point,
  queue: Point[],
  dt: number,
  speed: number,
  grid: Map<string, number>,
) {
  let time = Math.min(Math.max(0, dt), 0.05) * Math.max(0, speed);
  let heading: number | undefined;
  while (queue.length && time > 0) {
    const next = queue[0];
    const dx = next.x - position.x;
    const dz = next.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1e-6) {
      queue.shift();
      continue;
    }
    const velocity = 1.1 / Math.max(1, grid.get(`${next.x},${next.z}`) || 1);
    const move = Math.min(distance, time * velocity);
    position.x += (dx / distance) * move;
    position.z += (dz / distance) * move;
    heading = Math.atan2(dx, dz);
    time -= move / velocity;
    if (move >= distance) queue.shift();
  }
  return heading;
}
