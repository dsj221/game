import { useTownStore as T } from "../stores/useTownStore";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import * as THREE from "three";
import {
  useBuildingStore as B,
  useWorldStore as W,
  useSettingsStore as S,
  useUIStore as U,
  useNpcStore as N,
  useGameStore as G,
  useResourceStore as R,
} from "../stores";
import { worlds, defs } from "../data/definitions";
import { rotatedFootprint } from "../data/footprints";
import { sceneryNoise } from "./sceneryLayout";
import { useBuildingDrag, dragSuppressesClick } from "./useBuildingDrag";
import { canPlace, edgeTiles, roadType } from "../systems/economy";
import { buildAt, selectBuilding } from "../game/actions";
import { BuildingModel, Box } from "../buildings/Model";
import { IconBuilding, preloadBuildingAssets } from "../buildings/IconBuilding";
import { Person } from "../npcs/People";
import { Atmosphere, Meteor } from "./Atmosphere";
import { Studio } from "./Studio";
import { Scenery, Smoke } from "./Details";
import { Ghost } from "../buildings/Ghost";
import { InfluenceOverlay } from './InfluenceOverlay';
import {LandOverlay} from './LandOverlay';
import {placementReport} from '../systems/placement';
import type { Building, Tile, WorldId } from "../types";
let lastBuildingClick: { id: string; time: number } | null = null;
const popOut = (t: number) =>
  1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
function Instances({
  items,
  color,
  size,
}: {
  items: [number, number, number][];
  color: string;
  size: [number, number, number];
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const m = new THREE.Matrix4();
    items.forEach((p, i) => {
      m.makeTranslation(...p);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
    </instancedMesh>
  );
}
function SurfaceTiles({ items, base, accents }: { items: [number, number, number][]; base: string; accents: string[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useEffect(() => {
    const matrix = new THREE.Matrix4();
    const colors = accents.map(c => new THREE.Color(c));
    items.forEach((p, i) => {
      matrix.makeTranslation(...p);
      ref.current.setMatrixAt(i, matrix);
      ref.current.setColorAt(i, colors[Math.min(colors.length-1,Math.floor(sceneryNoise(p[0],p[2],53)*colors.length))]);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.instanceColor!.needsUpdate = true;
  }, [items, accents]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow>
    <boxGeometry args={[0.99, 0.15, 0.99]} />
    <meshStandardMaterial color="#ffffff" roughness={0.92} />
  </instancedMesh>;
}
function Terrain({ tiles, world }: { tiles: Tile[]; world: WorldId }) {
  const d = worlds[world];
  const old = useMemo(
    () => tiles.filter((t) => !t.born || Date.now() - t.born > 1000),
    [tiles],
  );
  const cells = useMemo(
    () =>
      old.flatMap((t) =>
        Array.from(
          { length: 9 },
          (_, i) =>
            [t.x * 3 + (i % 3) - 1, -0.04, t.z * 3 + Math.floor(i / 3) - 1] as [
              number,
              number,
              number,
            ],
        ),
      ),
    [old],
  );
  const soil = useMemo(
    () => old.map((t) => [t.x * 3, -0.52, t.z * 3] as [number, number, number]),
    [old],
  );
  return (
    <>
      <SurfaceTiles items={cells} base={d.tileColor} accents={world === "overworld" ? ["#8ba969", "#8fac6c", "#88a566", "#93ad70"] : [d.tileColor, d.tileColor]} />
      <Instances items={soil} color={d.earth} size={[2.98, 0.84, 2.98]} />
      {tiles
        .filter((t) => !old.includes(t))
        .map((t) => (
          <RisingTile key={`${t.x},${t.z}`} tile={t} world={world} />
        ))}
    </>
  );
}
function RisingTile({ tile, world }: { tile: Tile; world: WorldId }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    ref.current.position.y =
      -2 * (1 - Math.min(1, (Date.now() - tile.born) / 600)) ** 2;
  });
  return (
    <group ref={ref} position={[tile.x * 3, 0, tile.z * 3]}>
      <Box p={[0, -0.52, 0]} s={[2.98, 0.84, 2.98]} c={worlds[world].earth} />
      <Box
        p={[0, -0.04, 0]}
        s={[2.98, 0.15, 2.98]}
        c={worlds[world].tileColor}
      />
    </group>
  );
}
function RoadSurface({ items, world }: { items: [number, number, number][]; world: WorldId }) {
  const colors = world === "overworld" ? ["#d7c59d", "#cdb88d", "#e0d0aa"] : world === "nether" ? ["#a97867", "#936254"] : ["#aaa4b7", "#c0b6c5"];
  return <group>
    {items.map((p, i) => <group key={`${p[0]}:${p[2]}`} position={p}>
      <mesh receiveShadow>
        <boxGeometry args={[0.94, 0.075, 0.94]} />
        <meshStandardMaterial color={colors[i % colors.length]} roughness={0.9} emissive={world === "overworld" ? "#806f45" : "#000000"} emissiveIntensity={world === "overworld" ? 0.12 : 0} />
      </mesh>
      {[0, 1, 2].flatMap(row => [0, 1, 2].map(col => (
        <mesh key={`${row}:${col}`} position={[(col - 1) * 0.3, 0.047, (row - 1) * 0.3]} receiveShadow>
          <boxGeometry args={[0.275, 0.03, 0.275]} />
          <meshStandardMaterial color={colors[(i + row + col) % colors.length]} roughness={0.95} />
        </mesh>
      )))}
    </group>)}
  </group>;
}
function BuildingView({
  b,
  night,
  active,
  selected,
}: {
  b: Building;
  night: boolean;
  active: boolean;
  selected: boolean;
}) {
  const [hover, setHover] = useState(false);
  const startDrag = useBuildingDrag(b);
  const [width, depth] = rotatedFootprint(b.footprint,b.rotation);
  const singleClick = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (singleClick.current) clearTimeout(singleClick.current);
    },
    [],
  );
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    ref.current.position.y = 0;
    const base = (width + depth) / 2;
    const age = b.born ? (Date.now() - b.born) / 550 : 1;
    ref.current.scale.setScalar(age < 1 ? base * popOut(age) : base);
    if (b.type === "tree" || b.type === "netherplant" || b.type === "farm")
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + b.x) * 0.018;
    if (b.type === "core")
      ref.current.position.y = Math.sin(clock.elapsedTime) * 0.07;
  });
  return (
    <group position={[b.x+(width-1)/2, 0, b.z+(depth-1)/2]}>
      <group
        ref={ref}
        scale={(width+depth)/2}
        rotation={[0, (b.rotation * Math.PI) / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!U.getState().placement) setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onPointerDown={startDrag}
        onClick={(e) => {
          e.stopPropagation();
          if (dragSuppressesClick()) return;
          if (e.delta > 5) return;
          if (e.nativeEvent.detail > 1) return;
          if (U.getState().placement) buildAt(b.x, b.z);
          else {
            lastBuildingClick = { id: b.id, time: Date.now() };
            if (singleClick.current) clearTimeout(singleClick.current);
            singleClick.current = setTimeout(() => selectBuilding(b.id), 240);
          }
        }}
      >
        <IconBuilding type={b.type} rotation={b.rotation} night={night} fallback={<BuildingModel
          type={defs[b.type].modelType}
          world={b.world}
          variant={Math.abs(b.x + b.z)}
          night={night}
          active={active}
        />} />
      </group>
      {(selected || hover) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[width,depth,1]} position={[0, 0.055, 0]}>
          <ringGeometry args={[0.69, 0.73, 4, 1, Math.PI/4]} />
          <meshBasicMaterial
            color={selected ? "#d2e7a7" : "#f5f1c9"}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {hover && !U.getState().placement && (
        <Html position={[0, (width+depth)*.7+.5, 0]} center style={{ pointerEvents: "none" }}>
          <div className="world-tooltip">
            {defs[b.type].name}
            <small>等级 {b.level} · 点击查看 · 长按拖动</small>
          </div>
        </Html>
      )}
    </group>
  );
}
function Camera({ interior, world }: { interior: boolean; world: WorldId }) {
  const ref = useRef<OrbitImpl>(null!);
  const { camera, size, gl } = useThree();
  useEffect(() => {
    const doubleClick = (e: MouseEvent) => {
      if (
        U.getState().placement ||
        !lastBuildingClick ||
        Date.now() - lastBuildingClick.time > 1500
      )
        return;
      e.stopImmediatePropagation();
      selectBuilding(lastBuildingClick.id, true);
    };
    gl.domElement.addEventListener("dblclick", doubleClick, true);
    return () =>
      gl.domElement.removeEventListener("dblclick", doubleClick, true);
  }, [gl]);
  const reset = U((s) => s.cameraReset);
  const focus=U(s=>s.cameraFocus);
  useEffect(()=>{if(!focus||!ref.current)return;const delta=new THREE.Vector3(focus.x,0,focus.z).sub(ref.current.target);camera.position.add(delta);ref.current.target.set(focus.x,0,focus.z);ref.current.update();},[focus,camera]);
  const dragging = U(s => s.draggingBuilding);
  const [shift, setShift] = useState(false);
  const phase = useRef(0);
  const base = useRef(35);
  useEffect(() => {
    base.current = Math.min(
      size.width / (interior ? 14 : 18),
      size.height / (interior ? 12 : 16),
    );
  }, [size.width, size.height, interior]);
  useEffect(() => {
    phase.current = 0;
    camera.position.set(
      interior ? 9 : 22,
      interior ? 9 : 24,
      interior ? 11 : 22,
    );
    ref.current?.target.set(0, 0, 0);
    (camera as THREE.OrthographicCamera).zoom = base.current * 0.84;
    camera.updateProjectionMatrix();
  }, [world, interior, reset, camera]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
        if (e.key === "Shift") setShift(true);
      },
      up = () => setShift(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", up);
    const context = (e: Event) => e.preventDefault();
    gl.domElement.addEventListener("contextmenu", context);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", up);
      gl.domElement.removeEventListener("contextmenu", context);
    };
  }, [gl]);
  useFrame((_, dt) => {
    if (phase.current < 0.5) {
      phase.current += dt;
      (camera as THREE.OrthographicCamera).zoom = THREE.MathUtils.lerp(
        (camera as THREE.OrthographicCamera).zoom,
        base.current,
        Math.min(1, dt * 9),
      );
      if (phase.current >= 0.5)
        (camera as THREE.OrthographicCamera).zoom = base.current;
      camera.updateProjectionMatrix();
    }
    if (ref.current) {
      const target = ref.current.target;
      const old = target.clone();
      target.x = THREE.MathUtils.clamp(target.x, -6, 6);
      target.z = THREE.MathUtils.clamp(target.z, -7, 6);
      target.y = 0;
      camera.position.add(target.clone().sub(old));
    }
  });
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={!dragging}
      onStart={() => { phase.current = 1; }}
      enableDamping
      dampingFactor={0.09}
      minZoom={14}
      maxZoom={110}
      maxPolarAngle={Math.PI / 2.25}
      minPolarAngle={0.25}
      mouseButtons={{
        LEFT: shift ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
    />
  );
}
function Scene() {
  const { current, tiles, interior } = W(),
    { buildings, selected, offline } = B(),
    { npcs } = N();
  const settings = S(),
    ui = U(),
    floats = G((s) => s.floating),
    pulses = T((s) => s.pulses),
    rainEvent = T(s => s.events.some(e => e.type === "rain"));
  const local = useMemo(
    () => buildings.filter((b) => b.world === current),
    [buildings, current],
  );
  const roads = useMemo(
    () =>
      local
        .filter((b) => b.type === "road")
        .map((b) => [b.x, 0.04, b.z] as [number, number, number]),
    [local],
  );
  const night =
    settings.hour < 6 ||
    settings.hour > 19 ||
    settings.weather.includes("dusk");
  const d = worlds[current];
  const bg =
    current === "overworld"
      ? night
        ? "#293a34"
        : settings.sky === "warm"
          ? "#ece5d6"
          : d.background
      : d.background;
  const hover = ui.hover;
  const footprint: [number,number] = ui.moving ? (local.find(b=>b.id===ui.moving)?.footprint ?? [1,1]) : (defs[ui.placement ?? ""]?.size ?? [1,1]);
  const [previewWidth,previewDepth]=rotatedFootprint(footprint,ui.rotation);
  const valid =
    hover &&
    (ui.placement && ui.placement !== 'expand' ? !placementReport({id:ui.moving||'preview',type:ui.placement,x:hover[0],z:hover[1],world:current,rotation:ui.rotation,level:1,born:0,footprint},local,tiles[current],npcs,R.getState().bag,R.getState().currency,T.getState().level,!!ui.moving).reasons.length : false);
  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (U.getState().draggingBuilding) return;
    if (!ui.placement) return;
    const x = Math.round(e.point.x),
      z = Math.round(e.point.z);
    if (hover?.[0] !== x || hover?.[1] !== z) U.setState({ hover: [x, z] });
  };
  return (
    <>
      <color attach="background" args={[bg]} />
      <ambientLight intensity={night ? 0.55 : d.ambientLight} />
      <hemisphereLight args={["#f4efdb", "#7e8966", 0.65]} />
      <directionalLight
        position={[night ? -6 : 8, night ? 5 : 15, 8]}
        color={night ? "#d8ae84" : "#fff3d8"}
        intensity={night ? 0.9 : 2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-normalBias={0.04}
      />
      <Camera interior={interior} world={current} />
      <Diagnostics />
      {interior ? (
        <Studio />
      ) : (
        <>
          <Terrain tiles={tiles[current]} world={current} />
          <InfluenceOverlay />
          <LandOverlay />
          <Scenery world={current} tiles={tiles[current]} buildings={local} />
          <Smoke
            positions={local
              .filter(
                (b) =>
                  ["furnace", "generator"].includes(b.type) &&
                  !offline.includes(b.id),
              )
              .map((b) => [b.x, b.z])}
            speed={settings.speed}
          />
          <RoadSurface items={roads} world={current} />
          {local
            .filter((b) => b.type !== "road")
            .map((b) => (
              <BuildingView
                key={b.id}
                b={b}
                night={
                  b.type === "lamp"
                    ? night && settings.weather.includes("lanterns")
                    : night
                }
                active={!b.paused && !offline.includes(b.id)}
                selected={selected === b.id}
              />
            ))}
          {npcs
            .filter((n) => n.world === current)
            .map((n) => (
              <Person
                key={n.id}
                npc={n}
                buildings={local}
                speed={settings.speed}
              />
            ))}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.045, 0]}
            onPointerMove={handleMove}
            onClick={(e) => {
              if (dragSuppressesClick()) return;
              if (e.delta < 5 && ui.placement && ui.placement !== "expand")
                buildAt(Math.round(e.point.x), Math.round(e.point.z));
            }}
          >
            <planeGeometry args={[70, 70]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {ui.placement === "expand" &&
            edgeTiles(tiles[current]).map(([x, z]) => (
              <mesh
                key={`${x},${z}`}
                position={[x * 3, 0.075, z * 3]}
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.delta < 5) buildAt(x, z);
                }}
              >
                <planeGeometry args={[2.88, 2.88]} />
                <meshBasicMaterial
                  color={
                    ui.expand?.some(([a,b]) => a === x && b === z)
                      ? "#78a65a"
                      : "#d7c784"
                  }
                  transparent
                  opacity={ui.expand?.some(([a,b]) => a === x && b === z) ? 0.85 : 0.45}
                />
              </mesh>
            ))}
          {ui.placement && ui.placement !== "expand" && hover && (
            <group position={[hover[0]+(previewWidth-1)/2, 0.12, hover[1]+(previewDepth-1)/2]}>
              <mesh>
                <boxGeometry args={[previewWidth-0.05, 0.2, previewDepth-0.05]} />
                <meshBasicMaterial
                  color={valid ? "#7daf73" : "#c96959"}
                  transparent
                  opacity={0.6}
                />
              </mesh>
              <group position={[0,-.12,0]} scale={(previewWidth+previewDepth)/2}><Ghost
                key={ui.placement}
                type={ui.placement}
                world={current}
                valid={!!valid}
                rotation={ui.rotation}
              /></group>
            </group>
          )}
          {pulses.map(p => { const b = local.find(b => b.id === p.building); return b ? <Html key={p.id} position={[b.x,1.8,b.z]} center style={{pointerEvents:"none"}}><span className={`float-production ${p.text.startsWith("-") ? "cost" : ""}`}>{p.text}</span></Html> : null; })}
          {floats.map(
            (f) =>
              Date.now() - f.id < 1700 && (
                <Html
                  key={f.id}
                  position={
                    local.find((b) => b.type === "mine")
                      ? [
                          local.find((b) => b.type === "mine")!.x,
                          1.5,
                          local.find((b) => b.type === "mine")!.z,
                        ]
                      : [0, 1.5, 0]
                  }
                  center
                >
                  <span className="float-income">{f.value ? `+${f.value}` : "+1 木材"}</span>
                </Html>
              ),
          )}
          {current === "end" && <Dragon />}
          <Atmosphere
            weather={rainEvent ? [...settings.weather, "rain"] : settings.weather}
            world={current}
            speed={settings.speed}
          />
          <Meteor
            enabled={settings.weather.includes("meteors")}
            speed={settings.speed}
          />
          {current === "nether" && (
            <Box
              p={[0, -0.99, -1.5]}
              s={[9.3, 0.06, 6.3]}
              c="#c7784d"
              glow={0.6}
            />
          )}
        </>
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.3, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>
    </>
  );
}
function Dragon() {
  const r = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    r.current.position.y = 4 + Math.sin(clock.elapsedTime * 0.6) * 0.2;
    r.current.rotation.y = clock.elapsedTime * 0.08;
  });
  return (
    <group ref={r} position={[0, 4, -1]} scale={0.65}>
      <Box s={[0.65, 0.55, 1.8]} c="#414052" />
      <Box p={[0, 0.2, 0.95]} s={[0.5, 0.45, 0.7]} c="#494357" />
      <Box p={[-1, 0.1, 0]} s={[1.6, 0.08, 0.9]} c="#565064" rotation={0.3} />
      <Box p={[1, 0.1, 0]} s={[1.6, 0.08, 0.9]} c="#565064" rotation={-0.3} />
      <Box p={[0, 0, -1.3]} s={[0.18, 0.18, 1.2]} c="#414052" />
      <Box p={[0.25, 0.3, 1.1]} s={[0.03, 0.08, 0.15]} c="#c4a0dd" glow={0.7} />
    </group>
  );
}
export default function World() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const current = W.getState().current;
    void preloadBuildingAssets([...B.getState().buildings.filter(b => b.world === current).map(b => b.type), "scenery_lake", "scenery_grass"])
      .then(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);
  if (!ready) return <div className="world-loading" role="status">正在准备小镇素材…</div>;
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [22, 24, 22], zoom: 35, near: 0.1, far: 250 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Scene />
    </Canvas>
  );
}
function Diagnostics() {
  const { camera, gl } = useThree();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { worldDiagnostics: unknown };
    w.worldDiagnostics = {
      picked: () => lastBuildingClick,
      state: () => ({
        town: T.getState(),
        r: R.getState(),
        w: W.getState(),
        b: B.getState(),
        g: G.getState(),
        n: N.getState(),
        ui: U.getState(),
        settings: S.getState(),
      }),
      project: (x: number, y: number, z: number) => {
        const p = new THREE.Vector3(x, y, z).project(camera),
          r = gl.domElement.getBoundingClientRect();
        return {
          x: r.left + ((p.x + 1) * r.width) / 2,
          y: r.top + ((1 - p.y) * r.height) / 2,
        };
      },
      camera: () => ({
        position: camera.position.toArray(),
        zoom: (camera as THREE.OrthographicCamera).zoom,
      }),
      stats: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      }),
    };
  }, [camera, gl]);
  return null;
}
