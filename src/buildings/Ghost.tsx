import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { BuildingModel } from "./Model";
import { IconBuilding } from "./IconBuilding";
import { defs } from "../data/definitions";
import type { WorldId } from "../types";
export function Ghost({
  type,
  world,
  valid,
  rotation,
}: {
  type: string;
  world: WorldId;
  valid: boolean;
  rotation: number;
}) {
  return <IconBuilding type={type} rotation={rotation} ghost={valid} fallback={<ModelGhost type={defs[type]?.modelType ?? type} world={world} valid={valid} rotation={rotation} />} />;
}

function ModelGhost({ type, world, valid, rotation }: { type: string; world: WorldId; valid: boolean; rotation: number }) {
  const ref = useRef<THREE.Group>(null!);
  useLayoutEffect(() => {
    const clones: THREE.Material[] = [];
    const originals: {
      mesh: THREE.Mesh;
      material: THREE.Material | THREE.Material[];
    }[] = [];
    ref.current.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        originals.push({ mesh: obj, material: obj.material });
        const material = new THREE.MeshBasicMaterial({
          color: valid ? "#91b97b" : "#c77c65",
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
        });
        obj.material = material;
        obj.raycast = () => {};
        clones.push(material);
      }
    });
    return () => {
      originals.forEach(({ mesh, material }) => (mesh.material = material));
      clones.forEach((m) => m.dispose());
    };
  }, [valid, type]);
  return (
    <group ref={ref} rotation={[0, (rotation * Math.PI) / 2, 0]}>
      <BuildingModel type={type} world={world} />
    </group>
  );
}
