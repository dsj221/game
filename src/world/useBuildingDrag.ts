import { useEffect, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls } from "three-stdlib";
import type { Building } from "../types";
import { useUIStore as U, useBuildingStore as B } from "../stores";
import { buildAt, cancelBuild, notify } from "../game/actions";

let suppressClickUntil = 0;
export const dragSuppressesClick = () => Date.now() < suppressClickUntil;

export function useBuildingDrag(b: Building) {
  const { camera, gl, controls } = useThree();
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);
  return (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0 || U.getState().placement) return;
    event.stopPropagation();
    cleanup.current();
    const orbit = controls as OrbitControls | null;
    if (orbit) orbit.enabled = false;
    U.setState({ draggingBuilding: true });
    const start = [event.clientX, event.clientY];
    const pointerId = event.pointerId;
    let active = false;
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.045);
    const hit = new THREE.Vector3();
    const point = (e: {clientX:number; clientY:number}) => {
      const rect = gl.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1, -(e.clientY-rect.top)/rect.height*2+1), camera);
      return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
    };
    const origin = point(event);
    const timer = setTimeout(() => {
      active = true;
      suppressClickUntil = Date.now() + 1000;
      B.setState({ selected: b.id });
      U.setState({ placement:b.type, moving:b.id, rotation:b.rotation, panel:null, hover:[b.x,b.z] });
      notify("拖动建筑，松手放置 · R 旋转 · Esc 取消");
    }, 500);
    const stop = () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", abort);
      window.removeEventListener("blur", abort);
      window.removeEventListener("keydown", key);
      if (orbit) orbit.enabled = true;
      U.setState({ draggingBuilding:false });
      cleanup.current = () => {};
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (!active) {
        if (Math.hypot(e.clientX-start[0], e.clientY-start[1]) > 8) stop();
        return;
      }
      if (U.getState().moving !== b.id) { stop(); return; }
      const p = point(e);
      if (p && origin) U.setState({ hover:[b.x+Math.round(p.x-origin.x), b.z+Math.round(p.z-origin.z)] });
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (active && U.getState().moving === b.id) {
        move(e);
        const rect = gl.domElement.getBoundingClientRect();
        const hover = U.getState().hover;
        if (hover && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) buildAt(...hover);
        // Invalid drops leave the original building untouched and exit dragging.
        if (U.getState().moving === b.id) cancelBuild();
        suppressClickUntil = Date.now() + 400;
      }
      stop();
    };
    const abort = () => { if (active) { cancelBuild(); suppressClickUntil = Date.now()+400; } stop(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") abort(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", abort);
    window.addEventListener("blur", abort);
    window.addEventListener("keydown", key);
    cleanup.current = stop;
  };
}
