import { hydrologyStep, riverCells } from "./hydrology.ts";
import type { Building, Tile } from "../types/index.ts";
import type { TownState, TownEvent } from "../types/town.ts";
import { defs } from "../data/definitions.ts";
export const SEASON_DAYS = 14;
export const seasonAt = (day: number) =>
  Math.floor((Math.max(1, day) - 1) / SEASON_DAYS) % 4;
export const seasonDay = (day: number) =>
  ((Math.max(1, day) - 1) % SEASON_DAYS) + 1;
export const seasonNames = ["春", "夏", "秋", "冬"];
export type ClimateCell = {
  x: number;
  z: number;
  water: number;
  scar: "mud" | "cracks" | "stubble" | "snow" | "ribbons" | null;
  canal: boolean;
  channelWater?: number;
};
export type Climate = { day: number; cells: ClimateCell[] };
const plans = [
  {
    start: 5,
    end: 9,
    type: "rain",
    title: "春季暴雨",
    description: "积水使道路泥泞、农田受涝。修水渠排水；停雨后泥痕逐日恢复。",
  },
  {
    start: 4,
    end: 7,
    type: "festival",
    title: "夏日游客节",
    description:
      "游客消费 +30%；街巷留下庆典彩带。随后进入缺水期，请提前修渠蓄水。",
  },
  {
    start: 5,
    end: 11,
    type: "harvest",
    title: "秋收与外贸旺季",
    description: "农业收成 +40%，商业成交价格 +15%；收获后留下麦茬。",
  },
  {
    start: 4,
    end: 12,
    type: "flu",
    title: "冬季寒潮",
    description:
      "农业减产，居民每日取暖消耗木材；缺柴影响健康，安排诊所和室内服务值班。积雪在回暖后消退。",
  },
] as const;
export function calendarEvents(day: number) {
  const base = day - seasonDay(day),
    plan = plans[seasonAt(day)];
  const list: {
    start: number;
    end: number;
    type: TownEvent["type"];
    title: string;
    description: string;
    startDay: number;
    endDay: number;
  }[] = [{ ...plan, startDay: base + plan.start, endDay: base + plan.end }];
  if (seasonAt(day) === 1)
    list.push({
      start: 9,
      end: 13,
      type: "drought",
      title: "夏季缺水",
      description: "土地逐日干裂、农业减产。水井与有蓄水的水渠保护附近农田。",
      startDay: base + 9,
      endDay: base + 13,
    } as (typeof list)[number]);
  return list;
}
export function forecast(day: number) {
  return [day, day + 1, day + 2]
    .flatMap((d) => calendarEvents(d))
    .filter(
      (e, i, a) =>
        e.startDay > day &&
        e.startDay <= day + 2 &&
        a.findIndex((p) => p.startDay === e.startDay && p.type === e.type) ===
          i,
    );
}
export const agricultural = (b: Building) =>
  !!defs[b.type]?.town?.output &&
  !defs[b.type]?.town?.recipe &&
  !!(defs[b.type].town!.output!.food || defs[b.type].town!.output!.wheat);
export function climateStep(
  t: TownState,
  buildings: Building[],
  tiles?: Tile[],
) {
  const old = t.climate;
  const cells = (old?.cells || []).map((c) => ({ ...c }));
  for (const b of buildings.filter(
    (b) =>
      b.world === "overworld" &&
      (agricultural(b) ||
        defs[b.type]?.town?.category === "道路" ||
        defs[b.type]?.town?.sells),
  ))
    if (!cells.some((c) => c.x === b.x && c.z === b.z))
      cells.push({ x: b.x, z: b.z, water: 50, scar: null, canal: false });
  const active = calendarEvents(t.day).filter(
    (e) => t.day >= e.startDay && t.day <= e.endDay,
  );
  t.events = active.map((e) => ({
    id: `calendar-${e.startDay}-${e.type}`,
    type: e.type as TownEvent["type"],
    title: e.title,
    description: e.description,
    duration: (e.endDay - e.startDay + 1) * 360,
    remaining: (e.endDay - t.day + 1) * 360 - t.minute / 4,
  }));
  if (old?.day !== t.day) {
    for (const c of cells) {
      const waterSource = buildings.some(
        (b) =>
          b.world === "overworld" &&
          b.type === "icon_stone_well" &&
          !b.paused &&
          Math.hypot(b.x - c.x, b.z - c.z) <= 3,
      );
      const rain = active.some((e) => e.type === "rain"),
        dry = active.some((e) => String(e.type) === "drought");
      c.water = Math.max(
        0,
        Math.min(
          100,
          c.water +
            (rain
              ? c.canal
                ? 5
                : 24
              : dry
                ? c.canal
                  ? -8
                  : -22
                : c.water > 50
                  ? -10
                  : 5),
        ),
      );
      if (waterSource && !tiles) c.water = Math.max(45, c.water);
      if (c.canal && rain) c.water = Math.min(70, c.water);
      if (c.water > 75) c.scar = "mud";
      else if (c.water < 25) c.scar = "cracks";
      else if (
        active.some((e) => e.type === "harvest") &&
        buildings.some(
          (b) =>
            b.world === "overworld" &&
            b.x === c.x &&
            b.z === c.z &&
            agricultural(b),
        )
      )
        c.scar = "stubble";
      else if (active.some((e) => e.type === "festival")) c.scar = "ribbons";
      else if (seasonAt(t.day) === 3) c.scar = "snow";
      else if (c.scar === "mud" || c.scar === "cracks" || c.scar === "snow")
        c.scar = null;
    }
    for (const e of active)
      if (e.startDay === t.day)
        t.eventHistory = [...t.eventHistory.slice(-19), e.type];
  }
  if (tiles)
    t.hydrology = hydrologyStep(
      t.hydrology,
      tiles,
      cells,
      active.some((e) => e.type === "rain"),
      active.some((e) => e.type === "drought"),
      buildings,
    );
  t.climate = { day: t.day, cells };
}
export function climateEfficiency(
  t: TownState,
  b: Building,
  buildings: Building[],
) {
  if (b.world !== "overworld") return 1;
  const cells = t.climate?.cells || [],
    c = cells.find((c) => c.x === b.x && c.z === b.z);
  let factor = 1;
  if (agricultural(b))
    factor *= seasonAt(t.day) === 2 ? 1.4 : seasonAt(t.day) === 3 ? 0.45 : 1;
  if (agricultural(b) && c)
    factor *= c.water < 25 ? 0.45 : c.water > 75 ? 0.65 : 1;
  const muddyRoad = buildings.some(
    (r) =>
      r.world === b.world &&
      defs[r.type]?.town?.category === "道路" &&
      Math.hypot(r.x - b.x, r.z - b.z) <= 2 &&
      cells.some((c) => c.x === r.x && c.z === r.z && c.water > 75),
  );
  return factor * (muddyRoad && !t.logistics ? 0.75 : 1);
}
export function canalProject(
  t: TownState,
  wood: number,
  stone: number,
  x: number,
  z: number,
  tiles?: Tile[],
) {
  const cell = t.climate?.cells.find((c) => c.x === x && c.z === z);
  if (
    cell?.canal ||
    wood < 5 ||
    stone < 5 ||
    !Number.isInteger(x) ||
    !Number.isInteger(z)
  )
    return null;
  if (tiles && riverCells(tiles).some((r) => r.x === x && r.z === z))
    return null;
  if (
    !cell &&
    (!tiles?.some(
      (t) => Math.abs(t.x * 3 - x) <= 1 && Math.abs(t.z * 3 - z) <= 1,
    ) ||
      riverCells(tiles).some((r) => r.x === x && r.z === z))
  )
    return null;
  const source = cell
    ? t.climate!.cells
    : [
        ...(t.climate?.cells || []),
        { x, z, water: 50, scar: null, canal: false },
      ];
  return {
    ...t,
    climate: {
      day: t.climate?.day ?? t.day,
      cells: source.map((c) =>
        c.x === x && c.z === z
          ? { ...c, canal: true, channelWater: 0, water: Math.min(70, c.water) }
          : c,
      ),
    },
  };
}
