import type { Building, Tile, Npc, WorldId } from "../types";
let sequence = 0;
export const uid = () =>
  `${Date.now().toString(36)}-${++sequence}-${Math.random().toString(36).slice(2, 6)}`;
export function initialTiles(): Record<WorldId, Tile[]> {
  return {
    overworld: Array.from({ length: 20 }, (_, i) => ({
      x: (i % 5) - 2,
      z: Math.floor(i / 5) - 2,
      born: 0,
    })),
    nether: Array.from({ length: 6 }, (_, i) => ({
      x: (i % 3) - 1,
      z: Math.floor(i / 3) - 1,
      born: 0,
    })),
    end: Array.from({ length: 5 }, (_, i) => ({
      x: [0, -1, 1, 0, 0][i],
      z: [0, 0, 0, -1, 1][i],
      born: 0,
    })),
  };
}
export function initialBuildings() {
  const out: Building[] = [];
  const add = (world: WorldId, type: string, x: number, z: number) =>
    out.push({ id: uid(), world, type, x, z, level: 1, rotation: 0, born: 0 });
  const main: [string, number, number][] = [
    ["house", -5, -5],
    ["house", -3, -5],
    ["house", -1, -5],
    ["house", -5, -2],
    ["house", -3, -2],
    ["house", -1, -2],
    ["shop", 1, -5],
    ["shop", 3, -5],
    ["shop", 5, -5],
    ["market", 1, -2],
    ["clock", 3, -2],
    ["studio", 5, -2],
    ["mine", -5, 1],
    ["furnace", -3, 1],
    ["furnace", -1, 1],
    ["slime", 1, 1],
    ["drill", 3, 1],
    ["warehouse", 5, 1],
    ["windmill", -5, 3],
    ["farm", -3, 3],
    ["lumber", -1, 3],
    ["portal", 1, 3],
    ["endportal", 3, 3],
    ["generator", 5, 3],
    ["tree", -6, -5],
    ["tree", -6, -2],
    ["tree", 6, 0],
    ["tree", 6, -6],
    ["tree", -6, 3],
    ["lamp", -4, -3],
    ["lamp", 2, -3],
    ["lamp", 4, 0],
    ["lamp", -4, 0],
  ];
  main.forEach(([t, x, z]) => add("overworld", t, x, z));
  for (let x = -6; x <= 6; x++)
    for (const z of [-4, -1, 2]) add("overworld", "road", x, z);
  for (let z = -6; z <= 3; z++)
    if (![-4, -1, 2].includes(z)) add("overworld", "road", 0, z);
  [
    ["furnace", -3, -2],
    ["drill", -1, -2],
    ["generator", 1, -2],
    ["portal", 3, -2],
    ["market", 1, 1],
    ["slime", -1, 1],
    ["furnace", -3, 1],
    ["netherplant", 3, 1],
    ["netherplant", -4, 0],
    ["torch", 2, 0],
    ["warehouse", 0, 1],
  ].forEach((a) =>
    add("nether", a[0] as string, a[1] as number, a[2] as number),
  );
  for (let x = -4; x <= 4; x++) add("nether", "road", x, -1);
  [
    ["core", 0, 0],
    ["obsidian", -3, 0],
    ["obsidian", 3, 0],
    ["endportal", 0, -3],
    ["tree", -1, -1],
    ["tree", 0, 4],
    ["market", 0, 3],
    ["lamp", -1, 1],
    ["warehouse", -1, 0],
  ].forEach((a) => add("end", a[0] as string, a[1] as number, a[2] as number));
  for (let z = -3; z <= 3; z++) add("end", "road", 1, z);
  return out;
}
export function initialNpcs(buildings: Building[]): Npc[] {
  return Array.from({ length: 11 }, (_, i) => {
    const world: WorldId = i < 7 ? "overworld" : i < 9 ? "nether" : "end";
    return {
      id: uid(),
      name: [
        "阿禾",
        "小满",
        "林木",
        "阿石",
        "铜豆",
        "小铜",
        "铁山",
        "赤岩",
        "余烬",
        "星野",
        "小紫",
      ][i],
      profession: i === 6 ? "铁傀儡" : i === 4 || i === 5 ? "铜傀儡" : "村民",
      level: i === 4 ? 4 : 1,
      efficiency: i === 4 ? 1.15 : 1,
      world,
      modelType: i === 6 ? "iron" : i === 4 || i === 5 ? "copper" : "villager",
      workplace:
        buildings.filter((b) => b.world === world && b.type !== "road")[i % 5]
          ?.id || "",
      phase: i * 1.7,
    };
  });
}
