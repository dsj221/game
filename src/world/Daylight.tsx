import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {worlds} from '../data/definitions';
import {daylight,lightBlend} from '../systems/daylight';
import type {WorldId} from '../types';

export function Daylight({world,hour,warm,dusk}:{world:WorldId;hour:number;warm:boolean;dusk:boolean}){
 const ambient=useRef<THREE.AmbientLight>(null!),sun=useRef<THREE.DirectionalLight>(null!),hemisphere=useRef<THREE.HemisphereLight>(null!);
 const target=useMemo(()=>{
  const day=daylight(hour,dusk),twilight=Math.sin(day*Math.PI);
  return {
   background:world==='overworld'?new THREE.Color('#293a34').lerp(new THREE.Color(warm?'#ece5d6':worlds[world].background),day):new THREE.Color(worlds[world].background),
   sun:new THREE.Color('#d8ae84').lerp(new THREE.Color('#fff3d8'),day).lerp(new THREE.Color('#efbe91'),twilight*.22),
   sky:new THREE.Color('#aebcca').lerp(new THREE.Color('#f4efdb'),day),
   ground:new THREE.Color('#536552').lerp(new THREE.Color('#7e8966'),day),
   ambient:THREE.MathUtils.lerp(.55,worlds[world].ambientLight*.65,day),
   intensity:THREE.MathUtils.lerp(.9,2.2,day),
   position:new THREE.Vector3(THREE.MathUtils.lerp(-6,8,day),THREE.MathUtils.lerp(5,15,day),8),
  };
 },[world,hour,warm,dusk]);
 // Keep initial JSX properties stable: React must not overwrite an in-flight fade.
 const initial=useRef(target);
 const background=useMemo(()=>initial.current.background.clone(),[]);
 useFrame((_,delta)=>{
  const alpha=lightBlend(delta);
  background.lerp(target.background,alpha);
  ambient.current.intensity=THREE.MathUtils.lerp(ambient.current.intensity,target.ambient,alpha);
  sun.current.intensity=THREE.MathUtils.lerp(sun.current.intensity,target.intensity,alpha);
  sun.current.color.lerp(target.sun,alpha);sun.current.position.lerp(target.position,alpha);
  hemisphere.current.color.lerp(target.sky,alpha);hemisphere.current.groundColor.lerp(target.ground,alpha);
 });
 return <>
  <primitive object={background} attach="background" />
  <ambientLight ref={ambient} intensity={initial.current.ambient}/>
  <hemisphereLight ref={hemisphere} args={[initial.current.sky,initial.current.ground,.65]}/>
  <directionalLight ref={sun} position={initial.current.position} color={initial.current.sun} intensity={initial.current.intensity} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-normalBias={.04}/>
 </>;
}
