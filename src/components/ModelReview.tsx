import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { BuildingModel } from '../buildings/Model';
import { playableDefinitions as definitions } from '../data/definitions';
import { getBuildingIcon } from '../data/buildingIcons';
import './modelReview.css';

export default function ModelReview(){
  const [type,setType]=useState('house'),[angle,setAngle]=useState(0),[message,setMessage]=useState('');
  const group=useRef<THREE.Group>(null);
  const definition=definitions.find(d=>d.id===type)!;
  async function download(){
    if(!group.current)return;
    try{
      const model=group.current.clone(true);model.rotation.set(0,0,0);model.updateMatrixWorld(true);
      const binary=await new GLTFExporter().parseAsync(model,{binary:true});
      const blob=new Blob([binary as ArrayBuffer],{type:'model/gltf-binary'}),url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download=`${type}.glb`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage(`${definition.name}模型已导出`);
    }catch{setMessage('模型导出失败，请重试');}
  }
  return <main className="model-review">
    <header><div><span>建筑原图 · 实体模型</span><h1>建筑对照室</h1></div><a href="/">返回小镇 →</a></header>
    <div className="model-review-controls"><label>查看建筑 <select value={type} onChange={e=>{setType(e.target.value);setAngle(0);setMessage('');}}>{definitions.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><button onClick={()=>setAngle(v=>v+1)}>旋转 90°</button><button onClick={()=>setAngle(0)}>原图方向</button><button onClick={download}>下载 GLB 模型</button></div>
    <div className="model-review-pair">
      <section><h2>原始图片</h2><div className="reference-art"><img src={getBuildingIcon(type,512)} alt={`${definition.name}原图`}/></div></section>
      <section><h2>3D 模型 <small>拖动查看侧面和背面</small></h2><div className="reference-model"><Canvas shadows orthographic camera={{position:[3,2.8,3],zoom:180}} dpr={[1,1.5]}>
        <ambientLight intensity={.75}/><hemisphereLight args={['#ffeed2','#665d40',.45]}/><directionalLight position={[-3,6,5]} intensity={2.5} castShadow shadow-mapSize={[2048,2048]} shadow-normalBias={.008}/>
        <Bounds key={type} fit clip observe margin={1.05}><group ref={group} rotation={[0,angle*Math.PI/2,0]}><BuildingModel type={type}/></group></Bounds>
        <OrbitControls makeDefault enablePan={false} minPolarAngle={.15} maxPolarAngle={Math.PI*.85}/>
      </Canvas></div></section>
    </div>
    <p className="model-review-note">{message||'右侧为实际游戏模型。背面结构根据正面延续；模型支持独立导出，在 Blender 等软件中继续编辑。'}</p>
  </main>;
}
