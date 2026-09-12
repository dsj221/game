import { Html } from "@react-three/drei";
import type { SpatialReaction } from "../systems/spatialReactions";
import { Box } from "../buildings/Model";

function Beam({
  length,
  color,
  y = 0.9,
}: {
  length: number;
  color: string;
  y?: number;
}) {
  return <Box p={[0, y, 0]} s={[length * 0.78, 0.08, 0.11]} c={color} />;
}

function ReactionModel({
  reaction,
  active,
  night,
}: {
  reaction: SpatialReaction;
  active: boolean;
  night: number;
}) {
  const length = Math.max(1, reaction.length);
  const wood = active ? "#806448" : "#7b776c";
  switch (reaction.kind) {
    case "lanterns":
      return (
        <>
          <Beam length={length} color={wood} y={1.18} />
          <Box
            p={[-length * 0.38, 0.62, 0]}
            s={[0.055, 1.15, 0.055]}
            c={wood}
          />
          <Box p={[length * 0.38, 0.62, 0]} s={[0.055, 1.15, 0.055]} c={wood} />
          {[-0.28, 0, 0.28].map((offset) => (
            <Box
              key={offset}
              p={[offset * length, 0.98 - Math.abs(offset) * 0.18, 0]}
              s={[0.105, 0.15, 0.105]}
              c={active ? "#e7aa59" : "#887e6d"}
              glow={active ? night * 0.75 : 0}
            />
          ))}
        </>
      );
    case "hedge":
      return (
        <>
          {Array.from({ length: Math.max(2, length * 3) }, (_, i) => (
            <Box
              key={i}
              p={[
                (i / Math.max(1, length * 3 - 1) - 0.5) * length * 0.82,
                0.18 + (i % 2) * 0.025,
                0,
              ]}
              s={[0.26, 0.3, 0.2]}
              c={i % 2 ? "#6f9862" : "#789f68"}
            />
          ))}
          <Box p={[0, 0.31, 0]} s={[length * 0.72, 0.055, 0.08]} c="#d7b985" />
        </>
      );
    case "channel":
      return (
        <>
          <Box
            p={[0, 0.075, 0]}
            s={[length * 0.82, 0.055, 0.2]}
            c="#75a8a3"
            glow={active ? 0.08 : 0}
          />
          <Box
            p={[0, 0.11, -0.14]}
            s={[length * 0.86, 0.1, 0.07]}
            c="#b7a47d"
          />
          <Box p={[0, 0.11, 0.14]} s={[length * 0.86, 0.1, 0.07]} c="#b7a47d" />
        </>
      );
    case "loading":
      return (
        <>
          <Box p={[0, 0.09, 0]} s={[length * 0.8, 0.13, 0.42]} c="#9a7b55" />
          <Box
            p={[-Math.min(0.3, length * 0.2), 0.29, 0]}
            s={[0.3, 0.28, 0.3]}
            c="#b7905e"
          />
          <Box
            p={[Math.min(0.3, length * 0.2), 0.25, 0.02]}
            s={[0.24, 0.2, 0.24]}
            c="#a47d50"
          />
        </>
      );
    case "garden":
      return (
        <>
          <Beam length={length} color="#d8c59a" y={0.28} />
          {[-0.38, 0, 0.38].map((offset) => (
            <Box
              key={offset}
              p={[offset * length, 0.19, 0]}
              s={[0.055, 0.34, 0.07]}
              c="#c6ac79"
            />
          ))}
          <Box
            p={[0, 0.12, 0.16]}
            s={[Math.min(0.42, length * 0.3), 0.16, 0.24]}
            c="#779a62"
          />
        </>
      );
    case "stall":
      return (
        <>
          <Box p={[0, 0.34, 0]} s={[length * 0.68, 0.09, 0.32]} c="#aa7957" />
          <Box
            p={[0, 0.75, 0]}
            s={[length * 0.78, 0.08, 0.48]}
            c={active ? "#d8a56d" : "#9d9181"}
          />
          <Box p={[-length * 0.33, 0.5, 0]} s={[0.05, 0.72, 0.05]} c={wood} />
          <Box p={[length * 0.33, 0.5, 0]} s={[0.05, 0.72, 0.05]} c={wood} />
        </>
      );
    case "arcade":
      return (
        <>
          <Beam length={length} color="#9f7b55" y={0.92} />
          <Box
            p={[0, 1.03, 0]}
            s={[length * 0.82, 0.08, 0.42]}
            c={active ? "#b9654f" : "#8d8278"}
          />
          <Box p={[-length * 0.37, 0.48, 0]} s={[0.07, 0.9, 0.07]} c={wood} />
          <Box p={[length * 0.37, 0.48, 0]} s={[0.07, 0.9, 0.07]} c={wood} />
        </>
      );
  }
}

export function SpatialReactionLayer({
  reactions,
  selected,
  inactive,
  night,
}: {
  reactions: SpatialReaction[];
  selected: string | null;
  inactive: ReadonlySet<string>;
  night: number;
}) {
  return (
    <group name="spatial-reactions">
      {reactions.map((reaction) => {
        const highlighted =
          selected === reaction.buildingA || selected === reaction.buildingB;
        const active =
          !inactive.has(reaction.buildingA) &&
          !inactive.has(reaction.buildingB);
        return (
          <group
            key={`${reaction.buildingA}:${reaction.buildingB}`}
            position={[reaction.x, 0.05, reaction.z]}
            rotation={[0, reaction.along === "z" ? Math.PI / 2 : 0, 0]}
          >
            <ReactionModel reaction={reaction} active={active} night={night} />
            {highlighted && (
              <Html
                position={[0, 1.35, 0]}
                center
                style={{ pointerEvents: "none" }}
              >
                <span className="reaction-label">{reaction.name}</span>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
