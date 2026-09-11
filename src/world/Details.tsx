import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSettingsStore } from "../stores";
import type { Building, Tile } from "../types";
import { sceneryLayout, sceneryNoise as noise } from "./sceneryLayout";
import { BuildingModel } from "../buildings/Model";
import {nightfall} from '../systems/daylight';


export function Scenery({ world, tiles, buildings }: { world: string; tiles: Tile[]; buildings: Building[] }) {
  const speed = useSettingsStore(s => s.speed);
  const night = useSettingsStore(s=>nightfall(s.hour,s.weather.includes('dusk')));
  const water = useRef<THREE.Group>(null!);
  const waterTime = useRef(0);
  useFrame((_, dt) => {
    waterTime.current += dt * speed;
    if (water.current) water.current.position.y = Math.sin(waterTime.current * .45) * .008;
  });
  const scenery = useMemo(() => {
    return sceneryLayout(tiles, buildings);
  }, [tiles, buildings]);
  if (world !== "overworld") return null;
  return <group>
    <group ref={water}>
      {scenery.lakes.map(({x,z})=><group key={`lake-${x}-${z}`} position={[x,.055,z]}>
        <BuildingModel type="scenery_lake" night={night} />
      </group>)}
    </group>
    {scenery.grass.map(({x,z})=>{return <group key={`grass-${x}-${z}`} position={[x+(noise(x,z,41)-.5)*.4,.08,z+(noise(x,z,43)-.5)*.4]} rotation={[0,noise(x,z,29)*Math.PI,0]}>
      <BuildingModel type="scenery_grass" night={night} />
    </group>;})}
  </group>;
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
