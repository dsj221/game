import { useTownStore } from "../stores/useTownStore";
const colors = {
  mud: "#715039",
  cracks: "#b29361",
  stubble: "#c6a458",
  snow: "#e9edf0",
  ribbons: "#bd6470",
};
export function ClimateGround() {
  const cells = useTownStore((s) => s.climate?.cells),
    reaches = useTownStore((s) => s.hydrology?.reaches);
  const links = new Set(
    [...(cells?.filter((c) => c.canal) || []), ...(reaches || [])].map(
      (c) => `${c.x},${c.z}`,
    ),
  );
  return (
    <group>
      {cells?.map((c) => (
        <group key={`${c.x}:${c.z}`} position={[c.x, 0.13, c.z]}>
          {c.scar &&
            [0, 1, 2].map((i) => (
              <mesh
                key={i}
                rotation={[-Math.PI / 2, 0, i * 0.8]}
                position={[(i - 1) * 0.28, 0.003 * i, 0]}
              >
                <planeGeometry
                  args={[c.scar === "cracks" ? 0.035 : 0.2, 0.8]}
                />
                <meshStandardMaterial
                  color={colors[c.scar!]}
                  transparent
                  opacity={0.85}
                  depthWrite={false}
                />
              </mesh>
            ))}
          {c.canal && (
            <group name={`water-channel:${c.x},${c.z}`}>
              <mesh position={[0, 0.015, 0]}>
                <boxGeometry args={[0.24, 0.07, 0.24]} />
                <meshStandardMaterial color="#77756b" />
              </mesh>
              {[
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ]
                .filter(([dx, dz]) => links.has(`${c.x + dx},${c.z + dz}`))
                .map(([dx, dz]) => (
                  <group
                    key={`${dx},${dz}`}
                    position={[dx * 0.25, 0, dz * 0.25]}
                    rotation={[0, dx ? Math.PI / 2 : 0, 0]}
                  >
                    <mesh position={[0, 0.015, 0]}>
                      <boxGeometry args={[0.2, 0.07, 0.5]} />
                      <meshStandardMaterial color="#77756b" />
                    </mesh>
                    <mesh
                      position={[0, 0.055, 0]}
                      rotation={[-Math.PI / 2, 0, 0]}
                    >
                      <planeGeometry args={[0.13, 0.5]} />
                      <meshStandardMaterial
                        color={
                          (c.channelWater || 0) > 0.01 ? "#63aaa8" : "#b29361"
                        }
                      />
                    </mesh>
                  </group>
                ))}
              <mesh position={[0, 0.057, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.15, 0.15]} />
                <meshStandardMaterial
                  color={(c.channelWater || 0) > 0.01 ? "#63aaa8" : "#b29361"}
                />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
}
