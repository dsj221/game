import {useState} from 'react';
import {useTownStore as T} from '../stores/useTownStore';
import {townLevels} from '../data/town';
import {definitions} from '../data/definitions';
import {promoteTown} from '../game/actions';
export function TownProgress(){
 const t=T(),next=townLevels[t.level];if(!next)return <div className="promotion-card">Lv.5 梦想之城 · 继续照顾每位邻居的日常。</div>;
 const sales=t.ledger.sales+t.reports.reduce((s,r)=>s+r.sales,0),happy=next.level>=3?70:45;
 return <div className="promotion-card"><b>下一站 · Lv.{next.level} {next.name}</b><p>人口 {t.metrics.population}/{next.population} · 幸福 {Math.round(t.metrics.happiness)}/{happy} · 近期营业额 {Math.round(sales)}/{next.earned}</p><small>解锁：{definitions.filter(d=>d.town?.unlock===next.level).map(d=>d.name).slice(0,5).join('、')||'新的发展阶段'}</small><button className="primary" disabled={!t.upgradeReady} onClick={promoteTown}>{t.upgradeReady?'确认小镇升级':'继续完成晋级条件'}</button></div>;
}
export function TownPromotion(){
 const t=T(),[dismissed,setDismissed]=useState(0),next=townLevels[t.level];
 if(!t.upgradeReady||!next||dismissed===next.level)return null;
 return <div className="promotion-backdrop"><section className="promotion-dialog" role="dialog" aria-modal="true" aria-label="小镇可以升级了"><span className="eyebrow">A NEW CHAPTER</span><h2>小镇可以升级了！</h2><p>邻居们一起把日子过得更好了，准备迎接{next.name}。</p><TownProgress/><button className="text-button" onClick={()=>setDismissed(next.level)}>稍后再说（邻里愿望中可继续升级）</button></section></div>;
}
