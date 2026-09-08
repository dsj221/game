import { useEffect,useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box } from "../buildings/Model";
import type { Npc, Building } from "../types";
import { useNpcStore, useUIStore } from "../stores";
import { roadType } from "../systems/economy";
import { roadPath } from "./path";
export function Person({
  npc,
  buildings,
  speed,
}: {
  npc: Npc;
  buildings: Building[];
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const roads = useMemo(
    () => buildings.filter((b) => roadType(b.type)),
    [buildings],
  );
  const state = useRef({
    index: Math.floor(npc.phase) % Math.max(1, roads.length),
    path: [] as number[],
    pause: 0,
    elapsed: 0,
    started: false,
    returning: false,
  });
  useEffect(()=>{state.current.path=[];state.current.pause=0},[npc.destination,roads]);
  useFrame((_, dt) => {
    if (!ref.current || !roads.length) return;
    const s = state.current;
    s.index %= roads.length;
    if (!s.started) {
      ref.current.position.set(roads[s.index].x, 0, roads[s.index].z);
      s.started = true;
    }
    s.elapsed += dt * speed;
    const p = ref.current.position;
    if (s.pause > 0) {
      s.pause -= dt * speed;
      npcRuntime.set(npc.id, {
        status: npc.state||'整理货物',
        x: p.x,
        z: p.z,
      });
      return;
    }
    if (!s.path.length) {
      const work = buildings.find((b) => b.id === npc.workplace);
      const home = buildings.find((b) => b.id === npc.home) || work;
      const destination = buildings.find(b=>b.id===npc.destination)||home||work;
      let goal = s.index;
      if (destination) {
        let distance = Infinity;
        roads.forEach((r, i) => {
          const d =
            Math.abs(r.x - destination.x) + Math.abs(r.z - destination.z);
          if (d < distance) {
            distance = d;
            goal = i;
          }
        });
      }
      s.path = roadPath(roads, s.index, goal);
      if (!s.path.length) {
        if(goal===s.index&&npc.state&&!npc.state.includes('散步')){s.pause=.5;npcRuntime.set(npc.id,{status:npc.state,x:p.x,z:p.z});return;}
        const neighbor = roads
          .map((r, i) => ({ r, i }))
          .filter(
            ({ r }) =>
              Math.abs(r.x - roads[s.index].x) +
                Math.abs(r.z - roads[s.index].z) ===
              1,
          );
        if (neighbor.length)
          s.path = [neighbor[Math.floor(Math.random() * neighbor.length)].i];
        else {
          npcRuntime.set(npc.id, { status: "等待道路连接", x: p.x, z: p.z });
          return;
        }
      }
    }
    const target = roads[s.path[0] % roads.length],
      dx = target.x - p.x,
      dz = target.z - p.z,
      dist = Math.hypot(dx, dz);
    if (dist < 0.025) {
      s.index = s.path.shift()!;
      if (!s.path.length) {
        s.pause = 2 + (npc.phase % 2);
        s.returning = !s.returning;
      }
    } else {
      const delta = Math.min(dist, dt * speed * 0.7 * npc.efficiency);
      p.x += (dx / dist) * delta;
      p.z += (dz / dist) * delta;
      ref.current.rotation.y = Math.atan2(dx, dz);
      p.y = Math.sin(s.elapsed * 9) * 0.018;
    }
    npcRuntime.set(npc.id, {
      status: npc.state||'前往目的地',
      x: p.x,
      z: p.z,
    });
  });
  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        if (useUIStore.getState().placement) return;
        useNpcStore.setState({ selected: npc.id });
        useUIStore.setState({ panel: "npc", tab: "" });
      }}
    >
      <PersonModel kind={npc.modelType} variant={Math.floor(npc.phase)} />
    </group>
  );
}
export const npcRuntime = new Map<
  string,
  { status: string; x: number; z: number }
>();
export function PersonModel({
  kind = "villager",
  variant = 0,
}: {
  kind?: string;
  variant?: number;
}) {
  const c =
    kind === "copper"
      ? "#b98155"
      : kind === "iron"
        ? "#c5cec0"
        : ["#668795", "#b28564", "#83966e", "#8e7a8e"][variant % 4];
  return (
    <group>
      <Box p={[0, 0.41, 0]} s={[0.18, 0.23, 0.13]} c={c} />
      <Box
        p={[0, 0.63, 0]}
        s={[0.19, 0.19, 0.18]}
        c={kind === "villager" ? "#d6b294" : c}
      />
      <Box
        p={[0, 0.75, 0]}
        s={[0.23, 0.05, 0.22]}
        c={kind === "villager" ? "#8c7658" : "#668070"}
      />
      <Box p={[-0.12, 0.4, 0]} s={[0.06, 0.22, 0.08]} c={c} />
      <Box p={[0.12, 0.4, 0]} s={[0.06, 0.22, 0.08]} c={c} />
      <Box p={[-0.05, 0.19, 0]} s={[0.07, 0.2, 0.09]} c="#58665b" />
      <Box p={[0.05, 0.19, 0]} s={[0.07, 0.2, 0.09]} c="#58665b" />
      <Box p={[-0.05, 0.65, 0.1]} s={[0.025, 0.025, 0.015]} c="#32473c" />
      <Box p={[0.05, 0.65, 0.1]} s={[0.025, 0.025, 0.015]} c="#32473c" />
      {kind !== "villager" && (
        <Box p={[0, 0.37, 0.15]} s={[0.24, 0.2, 0.19]} c="#b09a70" />
      )}
    </group>
  );
}
