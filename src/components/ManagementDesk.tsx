import {useState} from 'react';
import {useTownStore as T} from '../stores/useTownStore';
import {useBuildingStore as B,useResourceStore as R,useWorldStore as W} from '../stores';
import {townAdvice} from '../systems/townAdvice';
import {defs,resourceNames} from '../data/definitions';
import {beginBuild,panel,selectBuilding,unlocked} from '../game/actions';
import type {Resource} from '../types';
import './managementDesk.css';

export function ManagementDesk({onNavigate}:{onNavigate:(tab:string)=>void}){
 const t=T(),buildings=B(s=>s.buildings),[all,setAll]=useState(false),advice=townAdvice(t,buildings);
 return <section className="management-desk" aria-label="经营诊断"><h3>小镇经营诊断 <small>{advice.length} 项待关注</small></h3>
 <p>根据当前经营状态整理，每项建议都可继续查看。</p>
 {advice.length===0?<div className="desk-clear">暂未发现食品短缺、缺工、缺料或连续亏损。可以继续完成邻里愿望。</div>:(all?advice:advice.slice(0,4)).map(a=><button key={a.id} className={`desk-advice priority-${a.priority}`} onClick={()=>a.building?selectBuilding(a.building):a.target==='village'?onNavigate(a.id==='housing'?'居民':'供需'):panel(a.target)}><span><b>{a.title}</b><small>{a.detail}</small></span><span aria-hidden="true">→</span></button>)}
 {advice.length>4&&<button className="text-button" onClick={()=>setAll(v=>!v)}>{all?'收起':'查看全部问题'}</button>}
 </section>;
}
const chains=[{name:'面包产业链',types:['farm','windmill','bakery','breadshop']},{name:'家具产业链',types:['lumber','carpenter','market']}];
export function LiveChains(){
 const t=T(),buildings=B(s=>s.buildings),bag=R(s=>s.bag);
 return <section className="live-chains" aria-label="实时产业链"><p className="note">主世界产业链 · 点击已有设施直接定位；尚未建设的环节可进入建造。</p>{chains.map(chain=><div key={chain.name}><h3>{chain.name}</h3><div className="live-chain">{chain.types.map(type=>{
  const owned=buildings.filter(b=>b.world==='overworld'&&b.type===type);
  const problem=owned.find(b=>!b.paused&&['缺少原料','员工不足','等待补货'].includes(t.facilities[b.id]?.status));
  const target=problem??owned.find(b=>!b.paused)??owned[0],config=defs[type].town!;
  const locked=t.level<config.unlock;
  const status=target?(target.paused?'暂停营业':t.facilities[target.id]?.status??'等待更新'):(locked?`Lv.${config.unlock} 解锁`:'尚未建设');
  const resources=Object.keys(config.output??(config.sells?{[config.sells]:1}:{})) as Resource[];
  return <button key={type} disabled={!target&&locked} onClick={()=>{if(target)selectBuilding(target.id);else{W.setState({current:'overworld',interior:false});if(unlocked(type))beginBuild(type);}}}><b>{defs[type].name}{owned.length>1?` ×${owned.length}`:''}</b><span className={problem?'chain-warning':''}>{status}</span><small>{resources.map(r=>`${resourceNames[r]} ${Math.floor(bag[r])}`).join(' · ')}（仓库）</small><small>{target?'查看设施 →':'前往建造 →'}</small></button>;
 })}</div></div>)}</section>;
}
