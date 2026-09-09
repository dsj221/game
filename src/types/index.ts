export type WorldId = "overworld" | "nether" | "end";
export type Resource = "wood" | "stone" | "iron" | "redstone" | "food" | "wheat" | "flour" | "bread" | "furniture";
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
  town?: { category:'住宅'|'生产'|'商业'|'公共'|'道路'|'装饰'|'进阶'; jobs:number; wage:number; upkeep:number; unlock:number; cycle?:number; recipe?:Partial<Bag>; output?:Partial<Bag>; sells?:Resource; price?:number; wholesale?:number; happiness?:number; health?:number; environment?:number; rent?:number; capacity?:number };
  influenceRadius?: number;
}
export interface Building {
  footprint?: [number, number];
  id: string;
  type: string;
  world: WorldId;
  x: number;
  z: number;
  rotation: number;
  level: number;
  born: number;
  paused?:boolean;
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
  age?:number;
  family?:string;
  home?:string;
  income?:number;
  wallet?:number;
  happiness?:number;
  health?:number;
  needs?:{food:number;fun:number;shopping:number};
  state?:string;
  destination?:string;
  likes?:string[];
  recent?:string;
  lastPurchase?:number;
  position?:{x:number;z:number};
  travelTarget?:string;
  route?:{x:number;z:number}[];
  arrivedAt?:string;
  travelProgress?:number;
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
  "shop" | "village" | "industry" | "book" | "detail" | "npc" | "studio" | "quests" | "daily" | null;
