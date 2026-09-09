import { useMemo } from "react";
import {
  useUIStore as U,
  useWorldStore as W,
  useBuildingStore as B,
  useNpcStore as N,
} from "../stores";
import { defs } from "../data/definitions";
import {
  buildingDistance,
  influenceFor,
  happinessFactors,
  influenceRules,
} from "../systems/buildingInfluence";
import { selectBuilding } from "../game/actions";
import { useTownStore as T } from "../stores/useTownStore";
export function InfluenceOverlay() {
  const ui = U(),
    w = W(),
    buildings = B((s) => s.buildings),
    npcs = N((s) => s.npcs),
    facilities = T((s) => s.facilities);
  const local = useMemo(
    () => buildings.filter((b) => b.world === w.current),
    [buildings, w.current],
  );
  const cells = useMemo(
    () =>
      w.tiles[w.current].flatMap((t) =>
        Array.from({ length: 9 }, (_, i) => ({
          x: t.x * 3 + (i % 3) - 1,
          z: t.z * 3 + Math.floor(i / 3) - 1,
        })),
      ),
    [w.tiles, w.current],
  );
  const preview =
    ui.placement && ui.placement !== "expand" && ui.hover
      ? {
          id: ui.moving || "preview",
          type: ui.placement,
          world: w.current,
          x: ui.hover[0],
          z: ui.hover[1],
          rotation: ui.rotation,
          footprint: ui.moving
            ? local.find((b) => b.id === ui.moving)?.footprint ||
              ([1, 1] as [number, number])
            : defs[ui.placement].size,
          level: 1,
          born: 0,
        }
      : null;
  if (ui.mapMode === "none" && !preview) return null;
  return (
    <group>
      {cells.map((p) => {
        const probe = {
          ...p,
          id: "probe",
          type: "house",
          world: w.current,
          level: 1,
          rotation: 0,
          born: 0,
        };
        let score = 50;
        const home = local.find(
          (b) =>
            defs[b.type].town?.capacity && buildingDistance(b, probe) === 0,
        );
        if (preview) {
          if (
            buildingDistance(preview, probe) >
            (influenceRules[preview.type]?.radius || 3)
          )
            return null;
          score = influenceRules[preview.type]?.noise ? 20 : 85;
        } else {
          const inf = influenceFor(home || probe, local, defs),
            people = home ? npcs.filter((n) => n.home === home.id) : [];
          if (ui.mapMode === "happiness" && !people.length) return null;
          score =
            ui.mapMode === "happiness"
              ? people.reduce((s, n) => s + (n.happiness || 0), 0) /
                people.length
              : ui.mapMode === "commerce"
                ? inf.commerce
                  ? 90
                  : 20
                : inf.road
                  ? 90
                  : 20;
          if (ui.mapMode === "health") score = inf.health ? 90 : 20;
          if (ui.mapMode === "environment") score = 55 + inf.happiness * 4;
          if (ui.mapMode === "value")
            score =
              40 +
              inf.happiness * 3 +
              (inf.road ? 10 : 0) +
              (inf.commerce ? 15 : 0) +
              (inf.health ? 10 : 0);
          if (ui.mapMode === "jobs")
            score = people.length
              ? (100 * people.filter((n) => n.workplace).length) / people.length
              : local.some(
                    (b) =>
                      !b.paused &&
                      (defs[b.type].town?.jobs || 0) > 0 &&
                      buildingDistance(b, probe) <= 5,
                  )
                ? 80
                : 20;
          if (ui.mapMode === "food")
            score = local.some(
              (b) =>
                !b.paused &&
                ["food", "bread"].includes(defs[b.type].town?.sells || "") &&
                (facilities[b.id]?.stock || 0) > 0 &&
                buildingDistance(b, probe) <=
                  (influenceRules[b.type]?.radius || 5),
            )
              ? 90
              : 20;
        }
        return (
          <mesh
            key={`${p.x},${p.z}`}
            position={[p.x, 0.19, p.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => {
              if (home && !preview) {
                e.stopPropagation();
                selectBuilding(home.id);
              }
            }}
            raycast={preview ? () => {} : undefined}
          >
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial
              color={
                score >= 70 ? "#85a977" : score >= 45 ? "#d5bb70" : "#bd7663"
              }
              transparent
              opacity={preview?.type === "park" ? 0.32 : 0.25}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
