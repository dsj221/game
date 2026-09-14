import { Html } from "@react-three/drei";
import { useUIStore as U, useBuildingStore as B } from "../stores";
import type { WorldId } from "../types";
import { locateFreight } from "../components/ChainDiagnosis";
export function WeatherRiskLayer({ world }: { world: WorldId }) {
  const impact = U((s) => s.weatherImpact),
    show = U((s) => s.weatherRiskOverlay),
    buildings = B((s) => s.buildings);
  if (!show || world !== "overworld" || !impact) return null;
  return (
    <group name="weather-risk-overlay">
      {impact.risks
        .filter((r) => buildings.some((b) => b.id === r.id))
        .map((r) => (
          <group key={r.id + r.kind} position={[r.x, 0.2, r.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.42, 0.53, 24]} />
              <meshBasicMaterial
                color={r.kind === "受涝" ? "#559fed" : "#ed774c"}
                depthTest={false}
              />
            </mesh>
            <Html position={[0, 1.1, 0]} center>
              <button
                className="cargo-label"
                onClick={() => {
                  const b = buildings.find((b) => b.id === r.id);
                  if (b) locateFreight(b);
                }}
              >
                {r.kind} · {r.afterDays.toFixed(1)} 天
              </button>
            </Html>
          </group>
        ))}
    </group>
  );
}
