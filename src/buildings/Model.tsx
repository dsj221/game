import { memo, useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldId } from "../types";
import { useSettingsStore } from "../stores";
import { getModelGeometry,getRoadGeometry } from "./modelGeometry";
import {lightBlend} from '../systems/daylight';

const cube = new THREE.BoxGeometry();
const materials = new Map<string, THREE.MeshStandardMaterial>();
function material(color: string, glow = 0, vertexColors = false) {
  const key = `${color}:${glow}:${vertexColors}`;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        vertexColors,
        roughness: 0.88,
        emissive: glow ? "#ffffff" : "#000000",
        emissiveIntensity: glow,
      }),
    );
  return materials.get(key)!;
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
      material={material(c, glow)}
      position={p}
      scale={s}
      rotation={[0, rotation, 0]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
function WindSails({ active }: { active: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (active)
      ref.current.rotation.z += dt * 0.55 * useSettingsStore.getState().speed;
  });
  return (
    <group ref={ref} position={[0, 0.88, 0.37]}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
          <Box p={[0, 0.24, 0]} s={[0.035, 0.49, 0.035]} c="#6e5135" />
          <Box p={[0.075, 0.31, 0]} s={[0.13, 0.27, 0.025]} c="#e4d5ae" />
          {[0.21, 0.29, 0.37, 0.44].map((y) => (
            <Box
              key={y}
              p={[0.075, y, 0.017]}
              s={[0.14, 0.014, 0.015]}
              c="#ac8b59"
            />
          ))}
        </group>
      ))}
      <Box s={[0.1, 0.1, 0.09]} c="#69513a" />
    </group>
  );
}
function BuildingGlow({geometry,color,glow}:{geometry:THREE.BufferGeometry;color:string;glow:number}){
 const surface=useMemo(()=>material(color,0,true).clone(),[color]);
 useEffect(()=>()=>surface.dispose(),[surface]);
 useFrame((_,delta)=>{surface.emissive.set('#ffffff');surface.emissiveIntensity=THREE.MathUtils.lerp(surface.emissiveIntensity,glow,lightBlend(delta));});
 return <mesh geometry={geometry} material={surface} castShadow dispose={null}/>;
}
export const BuildingModel = memo(function BuildingModel({
  type,
  world = "overworld",
  night = false,
  active = true,
  roadMask,
}: {
  type: string;
  world?: WorldId;
  variant?: number;
  night?: boolean | number;
  active?: boolean;
  roadMask?:number;
}) {
  const geometry = roadMask===undefined?getModelGeometry(type):getRoadGeometry(type,roadMask);
  const tint =
    world === "nether" ? "#e3b0a3" : world === "end" ? "#c8bce3" : "#ffffff";
  return (
    <group name={`building-model:${type}`} dispose={null}>
      <mesh
        geometry={geometry.solid}
        material={material(tint, 0, true)}
        castShadow
        receiveShadow
      />
      {geometry.lights && (
        <BuildingGlow geometry={geometry.lights} color={active?tint:'#6c7770'} glow={active?Number(night)*.65:0}/>
      )}
      {geometry.kind === "windmill" && <WindSails active={active} />}
    </group>
  );
});
