import type { Building } from "../types";
export function roadPath(
  roads: Building[],
  start: number,
  goal: number,
): number[] {
  const queue = [start],
    previous = new Map<number, number>([[start, -1]]);
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    if (at === goal) {
      const path: number[] = [];
      let n = goal;
      while (n !== start) {
        path.unshift(n);
        n = previous.get(n)!;
      }
      return path;
    }
    for (let j = 0; j < roads.length; j++) {
      if (
        !previous.has(j) &&
        Math.abs(roads[at].x - roads[j].x) +
          Math.abs(roads[at].z - roads[j].z) ===
          1
      ) {
        previous.set(j, at);
        queue.push(j);
      }
    }
  }
  return [];
}
