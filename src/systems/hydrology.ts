import { buildingCells } from "../data/footprints.ts";
import type { Building, Tile } from "../types/index.ts";
import type { ClimateCell } from "./climate.ts";
export const RIVER_X = -6;
export const waterKey = (x: number, z: number) => `${x},${z}`;
export const riverCells = (tiles: Tile[]) =>
  tiles
    .filter((t) => Math.abs(t.x * 3 - RIVER_X) <= 1)
    .flatMap((t) => [-1, 0, 1].map((d) => ({ x: RIVER_X, z: t.z * 3 + d })))
    .sort((a, b) => a.z - b.z);
export type RiverReach = { x: number; z: number; volume: number; flow: number };
export type Hydrology = {
  reaches: RiverReach[];
  damZ: number | null;
  gate: number;
  inflow: number;
  outflow: number;
  evaporation: number;
  irrigation: number;
};
export const riverLevel = (r: RiverReach) => r.volume / 100;
/** Finite-volume transport in map order. Flow is computed from the old state,
 * so a unit of water cannot pass through several reaches in a single tick. */
export function hydrologyStep(
  previous: Hydrology | undefined,
  tiles: Tile[],
  cells: ClimateCell[],
  rain: boolean,
  dry: boolean,
  buildings: Building[] = [],
): Hydrology {
  const old = new Map(previous?.reaches.map((r) => [waterKey(r.x, r.z), r]));
  const reaches = riverCells(tiles).map((p) => ({
    ...p,
    volume: old.get(waterKey(p.x, p.z))?.volume ?? (previous ? 0 : 50),
    flow: 0,
  }));
  const h: Hydrology = {
    reaches,
    damZ: previous?.damZ ?? null,
    gate: previous?.gate ?? 1,
    inflow: 0,
    outflow: 0,
    evaporation: 0,
    irrigation: 0,
  };
  const deltas = reaches.map(() => 0);
  for (let i = 0; i < reaches.length; i++) {
    const r = reaches[i],
      hasUp = i > 0 && reaches[i - 1].z === r.z - 1;
    if (!hasUp) {
      const input = dry ? 0.015 : rain ? 1.1 : 0.5;
      deltas[i] += input;
      h.inflow += input;
    }
    const capacity = r.z === h.damZ ? 300 : 100;
    const release = Math.min(
      r.volume,
      Math.max(0, r.volume - capacity) +
        r.volume * 0.01 * (r.z === h.damZ ? h.gate : 1),
    );
    r.flow = release;
    deltas[i] -= release;
    if (reaches[i + 1]?.z === r.z + 1) deltas[i + 1] += release;
    else h.outflow += release;
    const evaporated = Math.min(r.volume - release, dry ? 0.018 : 0.003);
    deltas[i] -= evaporated;
    h.evaporation += evaporated;
  }
  reaches.forEach((r, i) => {
    r.volume = Math.max(0, r.volume + deltas[i]);
  });
  // Orthogonally connected buried channels share a finite water store.
  const channels = new Map(
    cells.filter((c) => c.canal).map((c) => [waterKey(c.x, c.z), c]),
  );
  const rivers = new Map(reaches.map((r) => [waterKey(r.x, r.z), r]));
  const visited = new Set<string>();
  for (const [key, first] of channels) {
    if (visited.has(key)) continue;
    const group = [first],
      sources = new Set<RiverReach>();
    visited.add(key);
    for (let i = 0; i < group.length; i++)
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const k = waterKey(group[i].x + dx, group[i].z + dz),
          c = channels.get(k),
          r = rivers.get(k);
        if (c && !visited.has(k)) {
          visited.add(k);
          group.push(c);
        }
        if (r) sources.add(r);
      }
    let stored = group.reduce((sum, c) => sum + (c.channelWater ?? 0), 0);
    const intakeLimit = Math.max(
      0,
      Math.min(group.length * 0.06, group.length * 10 - stored),
    );
    let remaining = intakeLimit;
    for (const r of sources) {
      const draw = Math.min(remaining, Math.max(0, r.volume - 18));
      r.volume -= draw;
      stored += draw;
      remaining -= draw;
    }
    for (const c of group) {
      c.channelWater = Math.min(10, stored / group.length);
      const used = Math.min(
        c.channelWater,
        0.015,
        Math.max(0, (65 - c.water) / 6),
      );
      c.channelWater -= used;
      c.water = Math.min(100, c.water + used * 6);
      h.irrigation += used;
    }
  }
  // Wells draw finite water from nearby river-fed groundwater, not an unlimited buff.
  for (const c of cells) {
    const well = buildings.find(
      (b) =>
        b.type === "icon_stone_well" &&
        b.world === "overworld" &&
        !b.paused &&
        Math.hypot(b.x - c.x, b.z - c.z) <= 3,
    );
    const source =
      well &&
      reaches.find(
        (r) => r.volume > 18 && Math.hypot(r.x - well.x, r.z - well.z) <= 4,
      );
    if (source) {
      const used = Math.min(
        0.015,
        source.volume - 18,
        Math.max(0, (65 - c.water) / 6),
      );
      source.volume -= used;
      c.water += used * 6;
      h.irrigation += used;
    }
  }
  // High river levels flood adjacent banks; water recedes through the existing soil model.
  for (const c of cells) {
    const r = reaches.find(
      (r) => Math.abs(r.x - c.x) + Math.abs(r.z - c.z) <= 1,
    );
    if (r && r.volume > 90) {
      const absorbed = Math.min(0.08 / 6, (100 - c.water) / 6, r.volume - 90);
      r.volume -= absorbed;
      c.water = Math.min(100, c.water + absorbed * 6);
      h.irrigation += absorbed;
      if (c.water > 75) c.scar = "mud";
    }
  }
  return h;
}
export function wheelReach(b: Building, h?: Hydrology) {
  if (b.world !== "overworld" || b.type !== "watermill") return undefined;
  return (
    h?.reaches.find((r) => r.x === b.x && r.z === b.z) ??
    h?.reaches.find((r) => Math.abs(r.x - b.x) + Math.abs(r.z - b.z) <= 1)
  );
}
export function hydroGeneration(
  b: Building,
  h?: Hydrology,
  buildings: Building[] = [b],
) {
  const r = wheelReach(b, h);
  if (!r || b.paused || r.volume < 18 || r.flow <= 0) return 0;
  const peers = buildings.filter((p) => !p.paused && wheelReach(p, h) === r);
  const capacity = peers.reduce((n, p) => n + p.level, 0);
  const reachPower = r.flow * 48 * Math.min(1.5, riverLevel(r));
  return Math.min(12 * b.level, (reachPower * b.level) / Math.max(1, capacity));
}
export function buildDam(
  h: Hydrology | undefined,
  wood: number,
  stone: number,
): Hydrology | null {
  if (!h?.reaches.length || h.damZ !== null || wood < 20 || stone < 30)
    return null;
  return { ...h, damZ: h.reaches[Math.floor(h.reaches.length / 2)].z, gate: 1 };
}
export function setGate(h: Hydrology, value: number): Hydrology {
  if (h.damZ === null || !Number.isFinite(value)) return h;
  return {
    ...h,
    gate: Math.max(0, Math.min(1, value)),
    reaches: h.reaches.map((r) => (r.z === h.damZ ? { ...r, flow: 0 } : r)),
  };
}
export function waterSiteReason(
  type: string,
  x: number,
  z: number,
  tiles: Tile[],
  footprint: [number, number] = [1, 1],
  rotation = 0,
) {
  const river = riverCells(tiles);
  const occupied = buildingCells({ x, z, footprint, rotation });
  if (
    type === "watermill" &&
    !river.some((r) => Math.abs(r.x - x) + Math.abs(r.z - z) <= 1)
  )
    return "水轮机需紧邻河道或建在河道上";
  if (
    type !== "bridge" &&
    type !== "watermill" &&
    river.some((r) => occupied.some((c) => c.x === r.x && c.z === r.z))
  )
    return "河道保留行水空间，请使用木栈桥跨越";
  return null;
}
