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
  return world === "overworld" ? <group>{[-3.8,-2.8,-1.8,1.8,2.8,3.8].map((x,i)=><group key={x}><Box p={[x,0.13,4.3]} s={[0.07,0.26,0.07]} c="#819365"/><Box p={[x,0.29,4.3]} s={[0.13,0.09,0.13]} c={i%2?"#cfac83":"#b9bf85"}/></group>)}</group> : null;
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
