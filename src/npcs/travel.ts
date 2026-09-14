import type { Npc, Building, Tile } from "../types/index.ts";
import { navigationGrid, entrances, findRoute } from "./navigation.ts";
export function advanceTravel(
  n: Npc,
  destination: Building | undefined,
  buildings: Building[],
  tiles: Tile[],
) {
  if (!destination) {
    n.arrivedAt = undefined;
    return;
  }
  const grid = navigationGrid(tiles, buildings),
    home = buildings.find((b) => b.id === n.home);
  n.position ??= home
    ? entrances(home, grid)[0]
    : entrances(destination, grid)[0];
  if (!n.position) {
    n.arrivedAt = undefined;
    return;
  }
  const goal = entrances(destination, grid);
  const endpoint = n.route?.at(-1) || n.position;
  if (
    n.travelTarget !== destination.id ||
    !n.route ||
    !goal.some((p) => p.x === endpoint.x && p.z === endpoint.z) ||
    n.route.some((p) => !grid.has(`${p.x},${p.z}`))
  ) {
    n.travelTarget = destination.id;
    n.route = findRoute(n.position, goal, grid) || undefined;
    n.arrivedAt = undefined;
  }
  if (!n.route) {
    n.state = "道路受阻";
    return;
  }
  // One grid edge per fixed simulation tick; no per-frame decisions.
  if (n.route.length) {
    n.arrivedAt = undefined;
    n.travelProgress = (n.travelProgress || 0) + 1;
    const next = n.route[0],
      cost = grid.get(`${next.x},${next.z}`) || 2.5;
    if (n.travelProgress >= cost) {
      n.position = n.route.shift()!;
      n.movementStep = (n.movementStep || 0) + 1;
      n.movementTrail = [
        ...(n.movementTrail || []).slice(-15),
        { ...n.position, step: n.movementStep },
      ];
      n.travelProgress -= cost;
    }
  }
  if (
    !n.route.length &&
    goal.some((p) => p.x === n.position!.x && p.z === n.position!.z)
  )
    n.arrivedAt = destination.id;
}
