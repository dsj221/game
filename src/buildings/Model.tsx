import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldId } from "../types";
import { useSettingsStore } from "../stores";
const cube = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, glow = 0) {
  const k = color + glow;
  if (!materials.has(k))
    materials.set(
      k,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        emissive: color,
        emissiveIntensity: glow,
      }),
    );
  return materials.get(k)!;
}
export function Box({
  p = [0, 0, 0],
  s = [1, 1, 1],
  c = "#f0e8d4",
  glow = 0,
  rotation = 0,
}: {
  p?: [number, number, number];
  s?: [number, number, number];
  c?: string;
  glow?: number;
  rotation?: number;
}) {
  return (
    <mesh
      geometry={cube}
      material={mat(c, glow)}
      position={p}
      scale={s}
      rotation={[0, rotation, 0]}
      castShadow
      receiveShadow
    />
  );
}
function Rotor({ kind, active = true }: { kind: string; active?: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }, dt) => {
    const speed = useSettingsStore.getState().speed;
    if (!active || !speed) return;
    if (kind === "wind") ref.current.rotation.z += dt * 0.55 * speed;
    else ref.current.position.y = 0.75 + Math.sin(clock.elapsedTime * 3) * 0.1;
  });
  return kind === "wind" ? (
    <group position={[0, 1.55, 0.43]} ref={ref}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
          <Box p={[0, 0.4, 0]} s={[0.13, 0.82, 0.055]} c="#e7d6ab" />
          <Box p={[0.12, 0.53, 0]} s={[0.18, 0.43, 0.04]} c="#f4eddb" />
        </group>
      ))}
      <Box s={[0.17, 0.17, 0.14]} c="#5b6454" />
    </group>
  ) : (
    <group ref={ref}>
      <Box s={[0.5, 0.22, 0.5]} c={kind === "slime" ? "#83b885" : "#a6afb0"} />
      <Box p={[0, 0.18, 0]} s={[0.14, 0.25, 0.14]} c="#434e4e" />
    </group>
  );
}
export const BuildingModel = memo(function BuildingModel({
  type,
  world = "overworld",
  variant = 0,
  night = false,
  active = true,
}: {
  type: string;
  world?: WorldId;
  variant?: number;
  night?: boolean;
  active?: boolean;
}) {
  const dark = world === "nether",
    alien = world === "end";
  const roof = dark
    ? "#573b43"
    : alien
      ? "#8e79a8"
      : ["#697d69", "#b57b60", "#728581", "#a29271"][variant % 4];
  const wall = dark ? "#aa7363" : alien ? "#e5dcc2" : "#eee3ca";
  const wood = dark ? "#56383c" : "#8b7052";
  const light = active ? (night ? "#ffcb79" : "#b4c9b4") : "#414c47";
  const glow = night && active ? 1.1 : 0;
  if (type === "road" || type === "bridge")
    return (
      <Box
        p={[0, 0.035, 0]}
        s={[0.97, 0.07, 0.97]}
        c={type === "bridge" ? "#a4906c" : "#c5c7b5"}
      />
    );
  if (type === "tree")
    return (
      <group>
        <Box p={[0, 0.35, 0]} s={[0.12, 0.65, 0.12]} c={wood} />
        <Box
          p={[0, 0.85, 0]}
          s={[0.6, 0.65, 0.57]}
          c={dark ? "#b56c67" : alien ? "#ab92c0" : "#608a58"}
        />
        <Box
          p={[0.06, 1.2, 0]}
          s={[0.42, 0.25, 0.43]}
          c={dark ? "#d58875" : alien ? "#c4add8" : "#7ba46c"}
        />
        <Box
          p={[-0.23, 0.72, 0.12]}
          s={[0.3, 0.32, 0.35]}
          c={dark ? "#99504f" : alien ? "#9982b8" : "#52764f"}
        />
      </group>
    );
  if (type === "lamp" || type === "torch")
    return (
      <group>
        <Box p={[0, 0.44, 0]} s={[0.06, 0.85, 0.06]} c="#4b5d52" />
        <Box
          p={[0, 0.89, 0]}
          s={[0.19, 0.22, 0.19]}
          c={type === "torch" ? "#ee8f6e" : light}
          glow={glow}
        />
        <Box p={[0, 1.02, 0]} s={[0.27, 0.06, 0.27]} c="#4e6656" />
        <Box p={[0, 0.07, 0]} s={[0.19, 0.14, 0.19]} c="#8a8d79" />
      </group>
    );
  if (type === "farm")
    return (
      <group>
        <Box p={[0, 0.04, 0]} s={[0.93, 0.08, 0.93]} c="#89704e" />
        {Array.from({ length: 12 }, (_, i) => (
          <group
            key={i}
            position={[
              (i % 4) * 0.21 - 0.32,
              0,
              Math.floor(i / 4) * 0.28 - 0.27,
            ]}
          >
            <Box p={[0, 0.2, 0]} s={[0.035, 0.34, 0.035]} c="#8f9a54" />
            <Box p={[0, 0.34, 0]} s={[0.075, 0.18, 0.06]} c="#d4b96d" />
          </group>
        ))}
        <Box p={[0, 0.11, 0.48]} s={[1, 0.07, 0.06]} c={wood} />
      </group>
    );
  if (type === "portal" || type === "endportal")
    return (
      <group>
        <Box p={[-0.34, 0.65, 0]} s={[0.19, 1.3, 0.28]} c="#4b4656" />
        <Box p={[0.34, 0.65, 0]} s={[0.19, 1.3, 0.28]} c="#4b4656" />
        <Box p={[0, 1.25, 0]} s={[0.85, 0.18, 0.28]} c="#4b4656" />
        <Box
          p={[0, 0.62, 0]}
          s={[0.5, 1.1, 0.08]}
          c={type === "portal" ? "#ae6aa0" : "#898bcb"}
          glow={0.8}
        />
        <Box p={[0, 0.07, 0.13]} s={[0.95, 0.14, 0.65]} c="#797584" />
        <mesh position={[0, 0.68, 0.08]}>
          <planeGeometry args={[0.36, 0.88]} />
          <meshBasicMaterial color="#d3ace0" transparent opacity={0.35} />
        </mesh>
      </group>
    );
  if (type === "core")
    return (
      <group>
        <Box p={[0, 0.14, 0]} s={[0.8, 0.28, 0.8]} c="#686079" />
        <mesh position={[0, 1.1, 0]}>
          <octahedronGeometry args={[0.43]} />
          <meshStandardMaterial
            color="#c0a0df"
            emissive="#b18acb"
            emissiveIntensity={0.65}
          />
        </mesh>
        <Box p={[0, 0.48, 0]} s={[0.3, 0.4, 0.3]} c="#90899d" />
      </group>
    );
  if (type === "obsidian")
    return (
      <group>
        <Box p={[0, 1, 0]} s={[0.5, 2, 0.5]} c="#424052" />
        <Box p={[0, 2.04, 0]} s={[0.62, 0.12, 0.62]} c="#8c7da0" />
        <Box p={[0, 2.22, 0]} s={[0.2, 0.26, 0.2]} c="#d0b2e8" glow={0.5} />
      </group>
    );
  if (type === "mine")
    return (
      <group>
        <Box p={[0, 0.2, 0]} s={[0.9, 0.4, 0.8]} c="#8f9389" />
        <Box p={[-0.2, 0.45, -0.13]} s={[0.4, 0.36, 0.42]} c="#a8a99c" />
        <Box p={[0.24, 0.48, -0.22]} s={[0.3, 0.52, 0.4]} c="#737e75" />
        <Box p={[0, 0.16, 0.43]} s={[0.6, 0.1, 0.65]} c={wood} />
        <Box p={[-0.23, 0.24, 0.42]} s={[0.04, 0.08, 0.7]} c="#495852" />
        <Box p={[0.23, 0.24, 0.42]} s={[0.04, 0.08, 0.7]} c="#495852" />
        <Box p={[0, 0.35, 0.43]} s={[0.34, 0.22, 0.3]} c="#5f6c6b" />
        <Box p={[0.2, 0.55, 0.12]} s={[0.1, 0.1, 0.1]} c="#b9b6a1" />
      </group>
    );
  if (["furnace", "slime", "drill", "generator"].includes(type))
    return (
      <group>
        <Box p={[0, 0.08, 0]} s={[0.94, 0.16, 0.88]} c="#9b9e8e" />
        <Box
          p={[0, 0.4, 0]}
          s={[0.62, 0.6, 0.58]}
          c={type === "slime" ? "#78917b" : "#6e7c77"}
        />
        <Box
          p={[0, 0.35, 0.3]}
          s={[0.37, 0.28, 0.035]}
          c={active ? "#df9761" : "#3b4945"}
          glow={active ? 0.45 : 0}
        />
        <Box p={[-0.27, 0.88, -0.18]} s={[0.17, 0.64, 0.2]} c="#68716b" />
        <Box p={[-0.27, 1.23, -0.18]} s={[0.23, 0.08, 0.25]} c="#47564d" />
        <Box p={[0.35, 0.35, -0.1]} s={[0.15, 0.12, 0.6]} c="#ac9773" />
        {(type === "slime" || type === "drill") && (
          <Rotor kind={type} active={active} />
        )}
        <Box
          p={[0.36, 0.25, 0.36]}
          s={[0.18, 0.3, 0.15]}
          c={active ? "#b76451" : "#66564e"}
          glow={active ? 0.2 : 0}
        />
      </group>
    );
  if (type === "clock")
    return (
      <group>
        <Box p={[0, 0.8, 0]} s={[0.6, 1.6, 0.6]} c={wall} />
        <Box p={[0, 1.5, 0.31]} s={[0.4, 0.4, 0.03]} c="#f7f0d6" />
        <Box p={[0, 1.55, 0.34]} s={[0.035, 0.16, 0.02]} c="#475d4e" />
        <Box p={[0.05, 1.48, 0.34]} s={[0.13, 0.035, 0.02]} c="#475d4e" />
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            p={[0, 1.85 + i * 0.12, 0]}
            s={[0.85 - i * 0.22, 0.13, 0.85 - i * 0.22]}
            c={roof}
          />
        ))}
        <Box p={[0, 0.2, 0.31]} s={[0.2, 0.4, 0.02]} c={wood} />
      </group>
    );
  if (type === "market" || type === "shop")
    return (
      <group>
        <Box p={[0, 0.32, -0.15]} s={[0.8, 0.64, 0.58]} c={wall} />
        <Box p={[0, 0.72, -0.14]} s={[0.95, 0.17, 0.76]} c={roof} />
        <Box p={[0, 0.51, 0.27]} s={[0.92, 0.08, 0.45]} c="#ece1ba" />
        {[-1, 0, 1].map((i) => (
          <Box
            key={i}
            p={[i * 0.3, 0.56, 0.28]}
            s={[0.14, 0.06, 0.47]}
            c={roof}
          />
        ))}
        <Box p={[-0.4, 0.25, 0.43]} s={[0.045, 0.5, 0.045]} c={wood} />
        <Box p={[0.4, 0.25, 0.43]} s={[0.045, 0.5, 0.045]} c={wood} />
        <Box p={[0, 0.16, 0.4]} s={[0.7, 0.24, 0.18]} c={wood} />
        {[-1, 0, 1].map((i) => (
          <Box
            key={i}
            p={[i * 0.21, 0.32, 0.4]}
            s={[0.14, 0.12, 0.13]}
            c={["#bc7c59", "#9ca463", "#d6b46e"][i + 1]}
          />
        ))}
      </group>
    );
  return (
    <group>
      <Box p={[0, 0.07, 0]} s={[0.93, 0.14, 0.88]} c="#b6b49c" />
      <Box p={[0, 0.47, 0]} s={[0.73, 0.8, 0.67]} c={wall} />
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          p={[0, 0.9 + i * 0.105, 0]}
          s={[0.98 - i * 0.2, 0.12, 0.85]}
          c={roof}
        />
      ))}
      <Box p={[0, 0.28, 0.345]} s={[0.19, 0.46, 0.025]} c={wood} />
      <Box
        p={[-0.24, 0.59, 0.345]}
        s={[0.17, 0.22, 0.025]}
        c={light}
        glow={glow}
      />
      <Box
        p={[0.24, 0.59, 0.345]}
        s={[0.17, 0.22, 0.025]}
        c={light}
        glow={glow}
      />
      <Box
        p={[0.374, 0.59, 0.02]}
        s={[0.025, 0.22, 0.23]}
        c={light}
        glow={glow}
      />
      <Box p={[0.25, 1.12, -0.17]} s={[0.13, 0.45, 0.15]} c="#b59e83" />
      <Box p={[-0.42, 0.14, 0.34]} s={[0.2, 0.25, 0.24]} c={wood} />
      {type === "windmill" && <Rotor kind="wind" />}
      {type === "studio" && (
        <>
          <Box p={[0, 0.87, 0.47]} s={[0.7, 0.19, 0.07]} c="#456c57" />
          <Box p={[0.33, 1.42, 0]} s={[0.055, 0.5, 0.055]} c="#55655a" />
          <Box p={[0.33, 1.6, 0]} s={[0.26, 0.08, 0.08]} c="#899987" />
          <Box
            p={[0.23, 0.86, 0.51]}
            s={[0.07, 0.07, 0.02]}
            c="#e8a385"
            glow={0.4}
          />
        </>
      )}
      {type === "lumber" && (
        <Box p={[0.48, 0.2, 0]} s={[0.24, 0.28, 0.72]} c="#ba9565" />
      )}
      {type === "warehouse" && (
        <Box p={[0, 0.4, 0.35]} s={[0.48, 0.56, 0.02]} c="#7a8b7a" />
      )}
    </group>
  );
});
