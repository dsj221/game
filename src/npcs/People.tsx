import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box } from "../buildings/Model";
import type { Npc, Building } from "../types";
import { useNpcStore, useUIStore, useWorldStore } from "../stores";
import { navigationGrid, entrances, findRoute, type Point } from "./navigation";
import { useTownStore } from "../stores/useTownStore";
import { seasons, seasonIndex, pigments } from "../data/artDirection";
import { moveVisual } from "./visualTravel";
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
  const tiles = useWorldStore((s) => s.tiles[npc.world]);
  const grid = useMemo(
    () => navigationGrid(tiles, buildings),
    [tiles, buildings],
  );
  const path = useRef<Point[] | null>(null);
  const initialized = useRef(false);
  const seenStep = useRef(npc.movementStep || 0);
  const seenPosition = useRef<Point | undefined>(
    npc.position ? { ...npc.position } : undefined,
  );
  const steps = useRef<Point[]>([]);
  useEffect(() => {
    if (npc.position) {
      if (!initialized.current) {
        ref.current.position.set(npc.position.x, 0, npc.position.z);
        initialized.current = true;
      }
      return;
    }
    const home = buildings.find((b) => b.id === npc.home);
    const destination = buildings.find((b) => b.id === npc.destination) || home;
    if (!destination) return;
    const saved = npcRuntime.get(npc.id);
    const first = saved
      ? { x: Math.round(saved.x), z: Math.round(saved.z) }
      : home
        ? entrances(home, grid)[0]
        : entrances(destination, grid)[0];
    if (!first || !grid.has(`${first.x},${first.z}`)) {
      path.current = null;
      return;
    }
    if (!initialized.current) {
      ref.current.position.set(first.x, 0, first.z);
      initialized.current = true;
    }
    const route = findRoute(first, entrances(destination, grid), grid);
    path.current = route ? [first, ...route] : null;
  }, [npc.destination, npc.home, grid, buildings]);
  useEffect(
    () => () => {
      npcRuntime.delete(npc.id);
    },
    [npc.id],
  );
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (npc.position) {
      const p = ref.current.position;
      const recent =
        npc.movementTrail?.filter((point) => point.step > seenStep.current) ||
        [];
      if (recent.length) {
        steps.current.push(...recent.map(({ x, z }) => ({ x, z })));
        seenStep.current = npc.movementStep || 0;
      } else if (
        seenPosition.current &&
        (seenPosition.current.x !== npc.position.x ||
          seenPosition.current.z !== npc.position.z)
      ) {
        const last = steps.current.at(-1) || seenPosition.current;
        const route = findRoute(last, [npc.position], grid);
        if (route) steps.current.push(...route);
      }
      seenPosition.current = { ...npc.position };
      const heading = moveVisual(p, steps.current, dt, speed, grid);
      if (heading !== undefined) {
        const angle = Math.atan2(
          Math.sin(heading - ref.current.rotation.y),
          Math.cos(heading - ref.current.rotation.y),
        );
        ref.current.rotation.y +=
          angle * (1 - Math.exp(-Math.min(dt, 0.05) * 12 * Math.max(1, speed)));
      }
      ref.current.visible = true;
      npcRuntime.set(npc.id, {
        x: p.x,
        z: p.z,
        status: steps.current.length ? "正在前往目的地" : npc.state || "已到达",
      });
      return;
    }
    const p = ref.current.position,
      target = path.current?.[0];
    ref.current.visible = true;
    if (target && speed > 0) {
      const dx = target.x - p.x,
        dz = target.z - p.z,
        distance = Math.hypot(dx, dz);
      const weight = grid.get(`${target.x},${target.z}`) || 2.5;
      const move = Math.min(distance, (dt * speed * 2) / weight);
      if (distance < 0.02) path.current!.shift();
      else {
        p.x += (dx / distance) * move;
        p.z += (dz / distance) * move;
        ref.current.rotation.y = Math.atan2(dx, dz);
      }
    }
    npcRuntime.set(npc.id, {
      status:
        path.current === null
          ? "道路受阻"
          : target
            ? "正在前往目的地"
            : npc.state || "已到达",
      x: p.x,
      z: p.z,
    });
  });
  return (
    <group
      ref={ref}
      name={`citizen:${npc.id}`}
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
  const season = useTownStore((s) => seasonIndex(s.day));
  const c =
    kind === "copper"
      ? "#b98155"
      : kind === "iron"
        ? "#c5cec0"
        : seasons[season].coat[Math.abs(variant) % 4];
  return (
    <group>
      {kind === "villager" && season === 3 && (
        <Box p={[0, 0.52, 0.035]} s={[0.23, 0.07, 0.19]} c={pigments.brick} />
      )}
      {kind === "villager" && season === 1 && (
        <Box p={[0, 0.745, 0]} s={[0.34, 0.025, 0.31]} c={pigments.woodLight} />
      )}
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
