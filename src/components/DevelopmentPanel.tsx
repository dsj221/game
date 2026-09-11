import {useState} from 'react';
import {useTownStore as T} from '../stores/useTownStore';
import {useResourceStore as R,useBuildingStore as B} from '../stores';
import {civicProjects,dailyCommissions,initialDevelopment,developmentBonuses} from '../systems/development';
import {defs,resourceNames} from '../data/definitions';
import {developTown,beginBuild,selectBuilding,unlocked} from '../game/actions';
import type {Bag,Resource} from '../types';
import './development.css';
export function DevelopmentPanel({onMarket}:{onMarket:()=>void}){
 const t=T(),r=R(),buildings=B(s=>s.buildings),d=t.development||initialDevelopment();
 const [tab,setTab]=useState('每日委托'),[allowFood,setAllowFood]=useState(false);
 const delivered=d.boardDay===t.day?d.delivered:[];
 const guide=(id:string)=>{const b=buildings.find(b=>b.type===id&&b.world==='overworld');if(b)selectBuilding(b.id);else if(unlocked(id))beginBuild(id);else onMarket();};
 const supply=(resource:string)=>{const producers=Object.values(defs).filter(def=>def.town?.output?.[resource as Resource]);const existing=buildings.find(b=>producers.some(p=>p.id===b.type));if(existing)selectBuilding(existing.id);else{const available=producers.find(p=>p.world==='all'&&unlocked(p.id));if(available)beginBuild(available.id);else onMarket();}};
 const needs=(goods:Partial<Bag>)=><div className="dev-goods">{Object.entries(goods).map(([key,amount])=><button key={key} className={r.bag[key as Resource]<amount?'missing':''} onClick={()=>supply(key)} title="查看生产设施，尚未解锁时前往集市"><span>{resourceNames[key as Resource]}</span><b>{Math.floor(r.bag[key as Resource])} / {amount}</b></button>)}</div>;
 const enough=(goods:Partial<Bag>)=>Object.entries(goods).every(([key,amount])=>r.bag[key as Resource]>=amount);
 return <section className="development" aria-label="城镇发展">
  <header className="dev-intro"><span className="eyebrow">LET YOUR TOWN BE REMEMBERED</span><h2>让远方也知道这里。</h2><p>邻里的信任，从一份准时送达的心意开始。</p><div className="dev-summary"><span><b>{d.reputation}</b> 小镇口碑</span><span><b>{d.total}</b> 已送达</span><span><b>{d.projects.length} / 5</b> 公共工程</span></div>{d.projects.includes('fair')&&<p>荣誉称号 · 远方也知道的小镇</p>}</header>
  <div className="dev-tabs">{['每日委托','公共工程','经营方针'].map(v=><button key={v} onClick={()=>setTab(v)} aria-pressed={tab===v}>{v}</button>)}</div>
  {tab==='每日委托'?<>
   <p className="note">第 {t.day} 天 · 已交付 {delivered.length}/3。每天零点换新，不收押金、未完成不扣罚。等级越高，委托种类越丰富。</p>
   <label className="dev-reserve"><input type="checkbox" checked={allowFood} onChange={e=>setAllowFood(e.target.checked)}/>允许使用居民口粮（默认保留每人2份食物/面包）</label>
   {dailyCommissions(t.day,t.level).map(order=>{const done=delivered.includes(order.id),foodRisk=!allowFood&&((order.goods.food||0)+(order.goods.bread||0)>0)&&r.bag.food+r.bag.bread-(order.goods.food||0)-(order.goods.bread||0)<t.metrics.population*2;return <article className={`dev-card ${done?'complete':''}`} key={order.id}><span className="eyebrow">来自 {order.client} 的信</span><h3>{order.title}</h3><p>{order.story}</p>{needs(order.goods)}<div className="dev-reward">{Math.round(order.coins*developmentBonuses(d).reward)} 金币 · 口碑 +{order.reputation}</div><button className="primary wide" disabled={done||delivered.length>=3||!enough(order.goods)||foodRisk} onClick={()=>developTown('order',order.id,allowFood)}>{done?'已送达 · 谢谢你':foodRisk?'请先留足居民口粮':!enough(order.goods)?'备货中 · 点击上方物资查看来源':'交付委托'}</button></article>;})}
  </>:tab==='公共工程'?<><p className="note">五章永久目标，按顺序完成。工程是对现有设施的城镇级改造，不额外占地；提交后立即竣工，不会重复收费。</p>{civicProjects.map((p,i)=>{const done=d.projects.includes(p.id),previous=i===0||d.projects.includes(civicProjects[i-1].id),facility=buildings.some(b=>b.type===p.building&&b.world==='overworld'&&!b.paused),ready=previous&&t.level>=p.level&&d.reputation>=p.rep&&facility&&enough(p.cost)&&r.currency>=p.coins;return <article className={`dev-card ${done?'complete':''}`} key={p.id}><span className="eyebrow">第 {i+1} 章 · Lv.{p.level}</span><h3>{p.title}</h3><p className="dev-reward">{p.effect}</p>{!done&&<><div className="dev-conditions"><span>{t.level>=p.level?'✓':'○'} 小镇 Lv.{p.level}</span><span>{d.reputation>=p.rep?'✓':'○'} 口碑 {d.reputation}/{p.rep}</span><span>{previous?'✓':'○'} 前置工程</span></div><button className="secondary wide" onClick={()=>guide(p.building)}>{facility?'✓ 已开放':'○ 需要'} {defs[p.building].name} · 前往查看</button>{needs(p.cost)}<p>建设拨款 {p.coins} 金币 · 当前 {Math.floor(r.currency)}</p></>}<button className="primary wide" disabled={done||!ready} onClick={()=>developTown('project',p.id)}>{done?'已竣工 · 奖励永久生效':ready?'投入材料并完成工程':'筹备中 · 完成上方条件'}</button></article>;})}</>:<><p className="note">Lv.2解锁，每个游戏日可调整一次。没有唯一正确答案：根据库存、工资与居民状态选择。</p>{[
   {id:'balanced',name:'从容经营',text:'生产、工资与幸福保持基础水平，适合起步与恢复。'},
   {id:'industry',name:'集中生产',text:'生产效率 +15%，所有员工工资 +20%。赶订单时提速，也要留心成本。'},
   {id:'leisure',name:'慢享生活',text:'居民幸福目标 +4，生产效率 −10%。给紧张的生活留一点余地。'},
  ].map(p=><article className="dev-card" key={p.id}><h3>{p.name}</h3><p>{p.text}</p><button className="secondary wide" disabled={d.policy===p.id||t.level<2||d.policyDay===t.day} onClick={()=>developTown('policy',p.id)}>{d.policy===p.id?'当前方针':t.level<2?'Lv.2 解锁':d.policyDay===t.day?'明天可调整':'采用这一方针'}</button></article>)}</>}
 </section>;
}
