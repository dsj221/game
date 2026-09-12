import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Box } from "../buildings/Model";
import { useTownStore as T } from "../stores/useTownStore";
import { useBuildingStore as B, useSettingsStore as S } from "../stores";
import type { WorldId } from "../types";
import { outsideTotal, type Hauler } from "../systems/logistics";
function Carrier({ h }: { h: Hauler }) {
  const ref = useRef<THREE.Group>(null!);
  const initialPosition = useRef<[number, number, number]>([
    h.position.x,
    0.12,
    h.position.z,
  ]);
  useFrame((_, dt) => {
    const target = new THREE.Vector3(h.position.x, 0.12, h.position.z);
    if (ref.current.position.distanceTo(target) > 8)
      ref.current.position.copy(target);
    const dx = target.x - ref.current.position.x,
      dz = target.z - ref.current.position.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.015)
      ref.current.rotation.y = Math.atan2(dx, dz);
    ref.current.position.lerp(
      target,
      1 - Math.exp(-dt * 7 * Math.max(1, S.getState().speed)),
    );
  });
  return (
    <group
      ref={ref}
      position={initialPosition.current}
      name={`freight-hauler:${h.id}`}
    >
      <Box
        p={[0, 0.16, 0]}
        s={[0.14, 0.26, 0.12]}
        c={h.cart ? "#557b83" : "#ad7846"}
      />
      <Box p={[0, 0.34, 0]} s={[0.13, 0.13, 0.13]} c="#dbb68a" />
      <Box p={[0, 0.42, 0]} s={[0.2, 0.035, 0.18]} c="#baa174" />
      {[-0.04, 0.04].map((x) => (
        <Box key={x} p={[x, 0.025, 0]} s={[0.045, 0.1, 0.06]} c="#504b3b" />
      ))}
      {h.cart ? (
        <group position={[0, 0, -0.3]}>
          <Box p={[0, 0.11, 0]} s={[0.3, 0.09, 0.34]} c="#8b603c" />
          {[-0.17, 0.17].map((x) => (
            <mesh
              key={x}
              position={[x, 0.09, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.09, 0.09, 0.035, 10]} />
              <meshStandardMaterial color="#4f5045" />
            </mesh>
          ))}
          <Box p={[0, 0.18, 0.2]} s={[0.035, 0.035, 0.25]} c="#8b603c" />
          {h.loaded && (
            <Box p={[0, 0.23, 0]} s={[0.25, 0.18, 0.24]} c="#c69455" />
          )}
        </group>
      ) : (
        h.loaded && (
          <Box p={[0, 0.2, 0.15]} s={[0.19, 0.19, 0.17]} c="#c69455" />
        )
      )}
    </group>
  );
}
export function FreightLayer({ world }: { world: WorldId }) {
  const l = T((s) => s.logistics),
    buildings = B((s) => s.buildings);
  if (!l) return null;
  return (
    <group name="visible-freight">
      {l.haulers
        .filter(
          (h) =>
            l.stores[h.home]?.world === world && (h.destination || h.loaded),
        )
        .map((h) => (
          <Carrier key={h.id} h={h} />
        ))}
      {Object.values(l.stores)
        .filter((s) => s.world === world && outsideTotal(s) > 0.05)
        .map((s) => {
          const b = buildings.find((b) => b.id === s.id),
            width = b?.footprint?.[0] || 1,
            count = Math.min(8, Math.ceil(outsideTotal(s) / 4));
          return (
            <group
              key={s.id}
              name={`cargo-pile:${s.id}`}
              position={[s.x + width - 0.35, 0.11, s.z + 0.3]}
            >
              {Array.from({ length: count }, (_, i) => (
                <group
                  key={i}
                  position={[
                    (i % 2) * 0.24,
                    Math.floor(i / 4) * 0.22,
                    Math.floor((i % 4) / 2) * 0.24,
                  ]}
                >
                  <Box
                    p={[0, 0.1, 0]}
                    s={[0.21, 0.2, 0.21]}
                    c={i % 2 ? "#b7854d" : "#cea368"}
                  />
                  <Box p={[0, 0.1, 0.108]} s={[0.03, 0.2, 0.015]} c="#7d5d3f" />
                </group>
              ))}
              <Html
                position={[0.12, 0.5, 0.05]}
                center
                style={{ pointerEvents: "none" }}
              >
                <span className="cargo-label">
                  堆货 {outsideTotal(s).toFixed(0)}
                </span>
              </Html>
            </group>
          );
        })}
    </group>
  );
}
