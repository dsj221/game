export type WorldId = "overworld" | "nether" | "end";
export type Resource = "wood" | "stone" | "iron" | "redstone" | "food";
export type Bag = Record<Resource, number>;
export interface BuildingDefinition {
  id: string;
  name: string;
  category: string;
  world: WorldId | "all";
  description: string;
  size: [number, number];
  cost: number;
  upgradeCost: number;
  maxLevel: number;
  incomePerSecond: number;
  energyCost: number;
  power: number;
  production: Partial<Bag>;
  modelType: string;
  unlockRequirements?: string;
  population?: number;
  materials?: Partial<Bag>;
}
export interface Building {
  id: string;
  type: string;
  world: WorldId;
  x: number;
  z: number;
  rotation: number;
  level: number;
  born: number;
}
export interface Tile {
  x: number;
  z: number;
  born: number;
}
export interface Npc {
  id: string;
  name: string;
  profession: string;
  level: number;
  efficiency: number;
  world: WorldId;
  modelType: string;
  workplace: string;
  phase: number;
}
export interface WorldDefinition {
  id: WorldId;
  name: string;
  background: string;
  tileColor: string;
  earth: string;
  accent: string;
  ambientLight: number;
}
export type Panel =
  "shop" | "village" | "industry" | "book" | "detail" | "npc" | "studio" | null;
