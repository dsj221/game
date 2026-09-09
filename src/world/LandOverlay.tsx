import { Html } from "@react-three/drei";
import { useUIStore as U, useWorldStore as W } from "../stores";
import { landRegions } from "../systems/land";
export function LandOverlay() {
  const w = W(),
    placement = U((s) => s.placement);
  if (placement !== "expand" || w.current !== "overworld") return null;
  return (
    <group>
      {landRegions(w.tiles.overworld)
        .filter((r) => r.tiles.length)
        .map((r) => (
          <group key={r.id}>
            {r.tiles.map((p) => (
              <mesh
                key={`${p.x},${p.z}`}
                position={[p.x * 3, 0.04, p.z * 3]}
                rotation={[-Math.PI / 2, 0, 0]}
                raycast={() => {}}
              >
                <planeGeometry args={[2.8, 2.8]} />
                <meshBasicMaterial
                  color="#bdb796"
                  transparent
                  opacity={0.2}
                  depthWrite={false}
                />
              </mesh>
            ))}
            <Html
              position={[(r.x1 + r.x2) * 1.5, 0.3, (r.z1 + r.z2) * 1.5]}
              center
              style={{ pointerEvents: "none" }}
            >
              <span className="land-label">
                {r.name} · {r.cost} 金币
                <br />
                人口 {r.population} · Lv.{r.level}
              </span>
            </Html>
          </group>
        ))}
    </group>
  );
}
