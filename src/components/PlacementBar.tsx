import {useState} from 'react';
import {RotateCw,ChevronDown,ChevronUp,X} from 'lucide-react';
import {useUIStore as U} from '../stores';
import {defs} from '../data/definitions';
import {quests} from '../data/town';
import {cancelBuild} from '../game/actions';
import {PlacementInfo} from './PlacementInfo';
import './placementBar.css';

export function PlacementBar(){
 const ui=U(),[expanded,setExpanded]=useState(false);
 const guide=quests.find(q=>q.id===ui.activeGuide);
 return <div className="placement-dock">
  {expanded&&<section className="placement-popover" id="placement-details" aria-label="放置详情">
   <header><b>位置影响</b><button aria-label="收起放置详情" onClick={()=>setExpanded(false)}><ChevronDown size={16}/></button></header>
   <PlacementInfo/>
   {guide&&<details className="placement-guide"><summary>任务指引 · {guide.title}</summary><p className="active-guide">{guide.hint}</p></details>}
   <small>预估会随位置变化 · R 旋转 · Esc 取消</small>
  </section>}
  <div className="placement-bar" role="toolbar" aria-label="建造操作">
   <div className="placement-caption"><b>{ui.moving?'移动':'建造'} · {defs[ui.placement||'']?.name}</b>{ui.hover?<PlacementInfo compact/>:<span className="placement-summary">移动指针选择位置</span>}</div>
   <button className="placement-rotate" onClick={()=>U.setState(s=>({rotation:(s.rotation+1)%4}))} aria-label="旋转建筑90度" title="旋转建筑（R）"><RotateCw size={16}/><span>{ui.rotation*90}°</span></button>
   <button onClick={()=>setExpanded(!expanded)} aria-expanded={expanded} aria-controls="placement-details">详情 {expanded?<ChevronDown size={14}/>:<ChevronUp size={14}/>}</button>
   <button onClick={cancelBuild} aria-label="取消建造" title="取消建造（Esc）"><X size={17}/></button>
  </div>
 </div>;
}
