import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Box } from "../buildings/Model";
import { useSettingsStore } from "../stores";
export function Scenery({ world }: { world: string }) {
  const s = useSettingsStore();
  const pond = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (pond.current)
      pond.current.position.y =
        0.06 + Math.sin(clock.elapsedTime * s.speed) * 0.012;
  });
  const points = useMemo(
    () =>
      Array.from(
        { length: 34 },
        (_, i) =>
          [(i % 17) * 0.72 - 6, 0.13, i < 17 ? -6.55 : 3.8] as [
            number,
            number,
            number,
          ],
      ),
    [],
  );
  return world === "overworld" ? (
    <group>
      <mesh
        ref={pond}
        position={[5.9, 0.065, -3.05]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[1.5, 0.7]} />
        <meshStandardMaterial
          color="#8ebbb8"
          roughness={0.25}
          metalness={0.12}
        />
      </mesh>
      <Box p={[6, 0.09, -3.48]} s={[1.6, 0.14, 0.12]} c="#b5bba1" />
      <Box p={[6, 0.09, -2.62]} s={[1.6, 0.14, 0.12]} c="#b5bba1" />
      {[-5.5, -4.5, -3.5, -2.5].map((x) => (
        <group key={x}>
          <Box p={[x, 0.2, 3.7]} s={[0.05, 0.4, 0.05]} c="#bdac83" />
          <Box p={[x + 0.5, 0.27, 3.7]} s={[1, 0.055, 0.05]} c="#cbb992" />
        </group>
      ))}
      {[-5, -3, -1, 1, 3].map((x, i) => (
        <group key={x}>
          <Box p={[x + 0.48, 0.12, -4.6]} s={[0.18, 0.24, 0.18]} c="#b39c72" />
          <Box
            p={[x + 0.48, 0.29, -4.6]}
            s={[0.2, 0.12, 0.2]}
            c={i % 2 ? "#c48f79" : "#b5b16e"}
          />
          <Box p={[x + 0.48, 0.2, -5.4]} s={[0.05, 0.4, 0.05]} c="#9a896b" />
          <Box p={[x + 0.48, 0.41, -5.4]} s={[0.16, 0.12, 0.12]} c="#7d9072" />
        </group>
      ))}
      {points.map(([x, y, z], i) => (
        <Box
          key={i}
          p={[x, y, z]}
          s={[0.045, 0.13, 0.07]}
          c={i % 3 ? "#92a36a" : "#b6bc80"}
        />
      ))}
      {s.weather.includes("station") && (
        <group position={[-6, 0, -6]}>
          <Box p={[0, 0.6, 0]} s={[0.06, 1.2, 0.06]} c="#627968" />
          <Box p={[0, 1.25, 0]} s={[0.55, 0.08, 0.12]} c="#eee6cb" />
          <Box p={[0.2, 1.4, 0]} s={[0.06, 0.3, 0.06]} c="#83957b" />
        </group>
      )}
    </group>
  ) : null;
}
export function Smoke({
  positions,
  speed,
}: {
  positions: [number, number][];
  speed: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const time = useRef(0);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, dt) => {
    time.current += dt * speed;
    positions.forEach(([x, z], i) => {
      for (let j = 0; j < 3; j++) {
        const t = (time.current * 0.35 + j / 3 + i * 0.1) % 1;
        const size = 0.08 + t * 0.16;
        m.compose(
          new THREE.Vector3(x - 0.27 + t * 0.2, 1.3 + t * 1.2, z - 0.18),
          new THREE.Quaternion(),
          new THREE.Vector3(size, size, size),
        );
        ref.current.setMatrixAt(i * 3 + j, m);
      }
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, positions.length * 3]}
      frustumCulled={false}
    >
      <boxGeometry />
      <meshStandardMaterial
        color="#c5c6b7"
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
