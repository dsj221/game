import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
export function Atmosphere({
  weather,
  world,
  speed,
}: {
  weather: string[];
  world: string;
  speed: number;
}) {
  return (
    <>
      {weather.includes("rain") && (
        <WeatherParticles weather={["rain"]} world={world} speed={speed} />
      )}{" "}
      {weather.includes("snow") && (
        <WeatherParticles weather={["snow"]} world={world} speed={speed} />
      )}{" "}
      {(weather.includes("fireflies") || world !== "overworld") && (
        <WeatherParticles weather={["fireflies"]} world={world} speed={speed} />
      )}
    </>
  );
}
function WeatherParticles({
  weather,
  world,
  speed,
}: {
  weather: string[];
  world: string;
  speed: number;
}) {
  const points = useRef<THREE.Points>(null!);
  const rain = weather.includes("rain"),
    snow = weather.includes("snow");
  const active =
    rain || snow || weather.includes("fireflies") || world !== "overworld";
  const positions = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 180 * 3 }, (_, i) =>
          i % 3 === 1 ? Math.random() * 12 : (Math.random() - 0.5) * 24,
        ),
      ),
    [],
  );
  useFrame((_, dt) => {
    if (!points.current || speed === 0) return;
    const a = points.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] -= dt * (rain ? 8 : snow ? 0.65 : 0.1) * speed;
      if (a[i + 1] < -0.4) a[i + 1] = 12;
      a[i] += Math.sin(i + performance.now() / 2000) * dt * 0.06;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });
  return active ? (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={
          rain
            ? "#93b3b9"
            : snow
              ? "#ffffff"
              : world === "nether"
                ? "#eea176"
                : "#e4dab1"
        }
        size={rain ? 0.055 : snow ? 0.08 : 0.045}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  ) : null;
}
export function Meteor({
  enabled,
  speed,
}: {
  enabled: boolean;
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * speed) % 14;
    ref.current.visible = enabled && t < 1.7;
    ref.current.position.set(12 - t * 12, 10 - t * 3, -8);
  });
  return (
    <group ref={ref} rotation={[0, 0, -0.35]}>
      <mesh>
        <boxGeometry args={[2, 0.025, 0.025]} />
        <meshBasicMaterial color="#ede1d7" />
      </mesh>
    </group>
  );
}
