import { create } from "zustand";
import type { Bag, Building, Npc, Panel, Tile, WorldId } from "../types";
import {settlementBuildings,settlementNpcs,settlementTiles} from '../data/settlement';
import {emptyBag} from '../data/town';
const buildings = settlementBuildings();
export const useResourceStore = create<{
  currency: number;
  energy: number;
  maxEnergy: number;
  bag: Bag;
  income: number;
  generation: number;
  consumption: number;
}>(() => ({
  currency: 1000,
  energy: 480,
  maxEnergy: 480,
  bag: {...emptyBag(),wood:30,food:20},
  income: 0,
  generation: 0,
  consumption: 0,
}));
export const useWorldStore = create<{
  current: WorldId;
  tiles: Record<WorldId, Tile[]>;
  visited: WorldId[];
  interior: boolean;
}>(() => ({
  current: "overworld",
  tiles: settlementTiles(),
  visited: ["overworld"],
  interior: false,
}));
export const useBuildingStore = create<{
  buildings: Building[];
  selected: string | null;
  offline: string[];
  connected: string[];
}>(() => ({ buildings, selected: null, offline: [], connected: [] }));
export const useNpcStore = create<{ npcs: Npc[]; selected: string | null }>(
  () => ({ npcs: settlementNpcs(buildings), selected: null }),
);
export const useUIStore = create<{
  panel: Panel;
  tab: string;
  modal: "settings" | "help" | null;
  placement: string | null;
  moving: string | null;
  rotation: number;
  hover: [number, number] | null;
  expand: [number, number] | null;
  toast: string;
  collecting: boolean;
  cameraReset: number;
  category:string;
}>(() => ({
  panel: null,
  tab: "",
  modal: null,
  placement: null,
  moving: null,
  rotation: 0,
  hover: null,
  expand: null,
  toast: "",
  collecting: false,
  cameraReset: 0,
  category:'住宅',
}));
export const useSettingsStore = create<{
  sound: boolean;
  weather: string[];
  cycle: boolean;
  speed: number;
  hour: number;
  sky: string;
  border: boolean;
  effects: boolean;
  volume: number;
}>(() => ({
  sound: false,
  weather: ["lanterns"],
  cycle: true,
  speed: 1,
  hour: 7,
  sky: "natural",
  border: true,
  effects: true,
  volume: 0.12,
}));
export const useGameStore = create<{
  resonance: number;
  achievements: string[];
  ticks: number;
  collected: number;
  built: number;
  program: string;
  camera: string;
  viewers: number;
  studioIncome: number;
  gifts: number;
  equipment: number;
  decor: number;
  orders: number;
  totalEarned: number;
  lastSaved: number;
  floating: { id: number; value: number }[];
}>(() => ({
  resonance: 0,
  achievements: [],
  ticks: 0,
  collected: 0,
  built: 0,
  program: "田园时光",
  camera: "演播室现场",
  viewers: 320,
  studioIncome: 0,
  gifts: 0,
  equipment: 1,
  decor: 0,
  orders: 0,
  totalEarned: 0,
  lastSaved: 0,
  floating: [],
}));
