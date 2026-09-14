import { computeProduction } from "../src/systems/economy.ts";
import { tradeGoods } from "../src/systems/marketTrade.ts";
import fs from "node:fs";
import { simulateTown } from "../src/game/TownSimulation.ts";
import { initialTown, emptyBag } from "../src/data/town.ts";
import { makeCitizen } from "../src/data/settlement.ts";
import { defs } from "../src/data/definitions.ts";
import {
  stockTotal,
  outsideTotal,
  prepareLogistics,
  setTransport,
  setStockRule,
  spendableBag,
} from "../src/systems/logistics.ts";
const B = (id, type, x, z) => ({
  id,
  type,
  x,
  z,
  world: "overworld",
  rotation: 0,
  level: 1,
  born: 0,
});
function fixture(scale) {
  const buildings = [];
  let npcs = [];
  const types = [
    "warehouse",
    "farm",
    "farm",
    "farm",
    "lumber",
    "windmill",
    "bakery",
    "carpenter",
    "mine",
    "icon_workshop_stall",
    "breadshop",
    "icon_tool_shop",
    "market",
    "clinic",
    "park",
    "apartment",
    "apartment",
    "apartment",
  ];
  for (let d = 0; d < scale; d++) {
    const offset = d * 12;
    const sites = types.map((type, i) =>
      B(`${d}-${type}-${i}`, type, offset + (i % 9), Math.floor(i / 9) * 2 - 1),
    );
    const bread = sites.find((b) => b.type === "breadshop"),
      carpenter = sites.find((b) => b.type === "carpenter");
    [bread.x, carpenter.x] = [carpenter.x, bread.x];
    [bread.z, carpenter.z] = [carpenter.z, bread.z];
    buildings.push(...sites);
    for (let x = offset; x < offset + 12; x++)
      buildings.push(B("road" + x, "road", x, 0));
    const homes = sites.filter((b) => b.type === "apartment"),
      jobs = sites.flatMap((b) => Array(defs[b.type]?.town?.jobs || 0).fill(b));
    for (let i = 0; i < 24; i++) {
      const h = homes[Math.floor(i / 8)],
        j = jobs[i];
      npcs.push({
        ...makeCitizen(`n${d}-${i}`, i, h.id),
        workplace: j?.id || "",
        position: { x: h.x, z: 0 },
        arrivedAt: h.id,
      });
    }
  }
  const tiles = {
    overworld: Array.from({ length: scale * 4 + 3 }, (_, i) => i - 2).flatMap(
      (x) => [-1, 0, 1].map((z) => ({ x, z, born: 0 })),
    ),
    nether: [],
    end: [],
  };
  for (const b of buildings.filter((b) => b.type === "warehouse")) b.level = 3;
  const town = initialTown();
  town.minute = 0;
  town.level = 4;
  const bag = {
    ...emptyBag(),
    food: 60 * scale,
    wood: 40 * scale,
    wheat: 20 * scale,
    flour: 10 * scale,
    bread: 20 * scale,
    tools: 8 * scale,
  };
  prepareLogistics(town, buildings, bag, tiles);
  for (const b of buildings.filter(
    (b) => b.type === "warehouse" || b.type === "market",
  )) {
    Object.assign(
      town,
      setTransport(town, b.id, {
        porters: 2,
        carts: 2,
        schedule: { start: 0, end: 24, lunch: false },
      }),
    );
  }
  for (const b of buildings.filter(
    (b) => b.type === "warehouse" || b.type === "market",
  ))
    for (const r of Object.keys(emptyBag())) {
      const targets =
        b.type === "market"
          ? { furniture: 20, food: 8 }
          : {
              wheat: 50,
              wood: 50,
              stone: 30,
              iron: 20,
              food: 50,
              bread: 20,
              flour: 20,
              tools: 10,
              furniture: 10,
            };
      Object.assign(
        town,
        setStockRule(town, b.id, r, {
          allowed: !!targets[r],
          minimum: 0,
          target: targets[r] || 0,
        }),
      );
    }
  return {
    town,
    buildings,
    npcs,
    bag,
    currency: 15000 * scale,
    tick: 0,
    weather: [],
    tiles,
  };
}
const days = Number(process.env.ANNUAL_DAYS || 112);
const scales = process.argv.slice(2).map(Number);
for (const scale of scales.length ? scales : [1, 2]) {
  let s = fixture(scale),
    energy = 480,
    rows = [],
    maxWait = 0;
  const waits = new Map();
  let exports = 0;
  let nonFinite = false,
    maxHunger = 0;
  const hungerTicks = new Map();
  let starvation = 0,
    samples = 0,
    minPopulation = s.npcs.length;
  const started = Date.now();
  for (let i = 0; i < days * 360; i++) {
    const day = s.town.day;
    const power = computeProduction(
      s.buildings,
      [],
      energy,
      480,
      s.town.hydrology,
    );
    energy = power.energy;
    s = simulateTown({ ...s, offline: power.offline });
    if (s.tick % 90 === 0) {
      for (const [r, target] of Object.entries({
        wheat: 20 * scale,
        stone: 10 * scale,
        wood: 30 * scale,
        furniture: 10 * scale,
        tools: 8 * scale,
      })) {
        while (spendableBag(s.town, s.bag)[r] >= target + 10) {
          const result = tradeGoods(
            s.town,
            s.bag,
            s.currency,
            r,
            false,
            s.tick,
          );
          if (!result) break;
          exports += result.currency - s.currency;
          Object.assign(s, result);
        }
      }
    }
    samples += s.npcs.length;
    starvation += s.npcs.filter((n) => n.needs.food > 90).length;
    minPopulation = Math.min(minPopulation, s.npcs.length);
    for (const n of s.npcs) {
      const age = n.needs.food > 90 ? (hungerTicks.get(n.id) || 0) + 1 : 0;
      hungerTicks.set(n.id, age);
      maxHunger = Math.max(maxHunger, age);
    }
    nonFinite ||=
      !Number.isFinite(s.currency) ||
      Object.values(s.bag).some((v) => !Number.isFinite(v) || v < -1e-8);
    for (const h of s.town.logistics.haulers) {
      const key = JSON.stringify([
          h.position,
          h.source,
          h.destination,
          h.loaded,
          h.amount,
        ]),
        old = waits.get(h.id);
      const age = h.destination && old?.key === key ? old.age + 1 : 0;
      waits.set(h.id, { key, age });
      maxWait = Math.max(maxWait, age);
    }
    if (s.town.day !== day) {
      const r = s.town.reports[0];
      rows.push({
        day,
        population: s.npcs.length,
        currency: s.currency,
        profit: r.profit,
        produced: r.produced,
        consumed: r.consumed,
        inventory:
          Object.values(s.town.logistics.stores).reduce(
            (n, s) => n + stockTotal(s),
            0,
          ) +
          s.town.logistics.haulers.reduce(
            (n, h) => n + (h.loaded ? h.amount : 0),
            0,
          ),
        outside: Object.values(s.town.logistics.stores).reduce(
          (n, s) => n + outsideTotal(s),
          0,
        ),
        delivered: s.town.logistics.delivered,
        statuses: Object.fromEntries(
          s.buildings
            .filter((b) => defs[b.type]?.town?.output)
            .map((b) => [b.id, s.town.facilities[b.id]?.status]),
        ),
      });
      if (day % 14 === 0)
        console.log(
          JSON.stringify({
            scale,
            day,
            pop: s.npcs.length,
            currency: Math.round(s.currency),
            produced: r.produced,
            elapsed: Math.round((Date.now() - started) / 1000),
          }),
        );
    }
  }
  const gaps = Object.fromEntries(
    ["bread", "furniture", "tools"].map((r) => {
      let run = 0,
        max = 0;
      for (const row of rows) {
        run = (row.produced[r] || 0) > 0 ? 0 : run + 1;
        max = Math.max(max, run);
      }
      return [r, max];
    }),
  );
  const result = {
    nonFinite,
    maxHungerTicks: maxHunger,
    productionGaps: gaps,
    exports,
    finalStocks: s.town.logistics.stores,
    finalNpcs: s.npcs.map((n) => ({
      id: n.id,
      food: n.needs.food,
      job: n.workplace,
      position: n.position,
      arrived: n.arrivedAt,
    })),
    scale,
    days,
    elapsedSeconds: (Date.now() - started) / 1000,
    minPopulation,
    starvationRate: starvation / samples,
    maxWaitTicks: maxWait,
    rows,
  };
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync(
    `test-results/annual-balance-${scale}.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      scale,
      days,
      minPopulation,
      starvationRate: result.starvationRate,
      maxWaitTicks: maxWait,
      exports,
      elapsedSeconds: result.elapsedSeconds,
    }),
  );
}
