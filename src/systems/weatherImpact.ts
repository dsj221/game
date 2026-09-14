import type { TownState } from "../types/town.ts";
import type { Building, Tile } from "../types/index.ts";
import {
  climateStep,
  forecast,
  calendarEvents,
  agricultural,
} from "./climate.ts";
import { hydroGeneration } from "./hydrology.ts";
export type WeatherImpact = {
  day: number;
  minute: number;
  days: number;
  event: string;
  water: number;
  storageDays: number | null;
  powerNow: number;
  powerMin: number;
  risks: {
    id: string;
    x: number;
    z: number;
    kind: "缺水" | "受涝" | "发电下降";
    afterDays: number;
    value: number;
  }[];
};
/** Copy and advance the same finite-water/soil model used by the game. No production, RNG or live state is changed. */
export function estimateWeather(
  t: TownState,
  buildings: Building[],
  tiles: Tile[],
): WeatherImpact {
  const event = [
    ...calendarEvents(t.day).filter(
      (e) => e.startDay <= t.day && e.endDay >= t.day,
    ),
    ...forecast(t.day),
  ].find((e) => e.type === "drought" || e.type === "rain");
  const days = Math.min(14, event ? event.endDay - t.day + 1 : 2),
    sim = {
      ...t,
      climate: t.climate
        ? { ...t.climate, cells: t.climate.cells.map((c) => ({ ...c })) }
        : undefined,
      hydrology: t.hydrology
        ? {
            ...t.hydrology,
            reaches: t.hydrology.reaches.map((r) => ({ ...r })),
          }
        : undefined,
      eventHistory: [...t.eventHistory],
      events: [...t.events],
    };
  const storage = () =>
    (sim.hydrology?.reaches.reduce(
      (n, r) => n + Math.max(0, r.volume - 18),
      0,
    ) || 0) +
    (sim.climate?.cells.reduce((n, c) => n + (c.channelWater || 0), 0) || 0);
  const wheels = buildings.filter((b) => b.type === "watermill" && !b.paused),
    farms = buildings.filter(
      (b) => b.world === "overworld" && agricultural(b) && !b.paused,
    );
  const power = () =>
      wheels.reduce(
        (n, b) => n + hydroGeneration(b, sim.hydrology, buildings),
        0,
      ),
    powerById = new Map(
      wheels.map((b) => [b.id, hydroGeneration(b, sim.hydrology, buildings)]),
    );
  const result: WeatherImpact = {
    day: t.day,
    minute: t.minute,
    days,
    event: event?.title || "未来两天",
    water: storage(),
    storageDays: storage() <= 0.1 ? 0 : null,
    powerNow: power(),
    powerMin: power(),
    risks: [],
  };
  const known = new Set<string>();
  for (let tick = 0; tick <= days * 360; tick++) {
    if (tick) {
      sim.minute += 4;
      if (sim.minute >= 1440) {
        sim.day++;
        sim.minute -= 1440;
      }
      climateStep(sim, buildings, tiles);
    }
    const elapsed = tick / 360;
    if (storage() <= 0.1 && result.storageDays === null)
      result.storageDays = elapsed;
    result.powerMin = Math.min(result.powerMin, power());
    for (const b of farms) {
      const c = sim.climate?.cells.find((c) => c.x === b.x && c.z === b.z);
      if (!c) continue;
      const kind = c.water < 25 ? "缺水" : c.water > 75 ? "受涝" : null;
      if (kind && !known.has(b.id + kind)) {
        known.add(b.id + kind);
        result.risks.push({
          id: b.id,
          x: b.x,
          z: b.z,
          kind,
          afterDays: elapsed,
          value: c.water,
        });
      }
    }
    for (const b of wheels) {
      const start = powerById.get(b.id) || 0,
        current = hydroGeneration(b, sim.hydrology, buildings);
      if (start > 0 && current < start * 0.75 && !known.has(b.id)) {
        known.add(b.id);
        result.risks.push({
          id: b.id,
          x: b.x,
          z: b.z,
          kind: "发电下降",
          afterDays: elapsed,
          value: current,
        });
      }
    }
  }
  return result;
}
