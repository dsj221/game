import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BuildingModel } from "../buildings/Model";
import type { WorldId } from "../types";
export function ModelPreview({
  type,
  world,
}: {
  type: string;
  world: WorldId;
}) {
  return (
    <Canvas
      orthographic
      camera={{ position: [3, 2.8, 3], zoom: 68 }}
      dpr={1}
      frameloop="demand"
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 5, 2]} intensity={2} />
      <group position={[0, -0.6, 0]}>
        <BuildingModel type={type} world={world} active={false} />
      </group>
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
