import { useTownStore } from "../stores/useTownStore";
export function RiverWater() {
  const h = useTownStore((s) => s.hydrology);
  return (
    <group name="seasonal-river">
      {h?.reaches.map((r) => {
        const level = r.volume / 100,
          height = -0.075 + Math.min(1.5, level) * 0.18;
        return (
          <group key={r.z} position={[r.x, 0, r.z]}>
            <mesh position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.98, 1]} />
              <meshStandardMaterial color="#93744d" />
            </mesh>
            {level > 0.025 && (
              <mesh
                name={`river-water:${r.z}`}
                position={[0, height, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[level > 0.9 ? 1.2 : 0.84, 1]} />
                <meshStandardMaterial
                  color={level > 0.9 ? "#739ba4" : "#68aaa9"}
                  transparent
                  opacity={0.85}
                  roughness={0.25}
                />
              </mesh>
            )}
            {[-0.49, 0.49].map((x) => (
              <mesh key={x} position={[x, -0.005, 0]}>
                <boxGeometry args={[0.07, 0.17, 1]} />
                <meshStandardMaterial color="#b8a383" />
              </mesh>
            ))}
            {h.damZ === r.z && (
              <group name="river-sluice">
                <mesh position={[0, 0.16, 0.4]}>
                  <boxGeometry args={[1.1, 0.16, 0.15]} />
                  <meshStandardMaterial color="#737d75" />
                </mesh>
                <mesh position={[0, 0.05 + h.gate * 0.3, 0.4]}>
                  <boxGeometry args={[0.76, 0.36, 0.065]} />
                  <meshStandardMaterial color="#92683f" />
                </mesh>
                {[-0.45, 0.45].map((x) => (
                  <mesh key={x} position={[x, 0.2, 0.4]}>
                    <boxGeometry args={[0.12, 0.65, 0.2]} />
                    <meshStandardMaterial color="#737d75" />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}
