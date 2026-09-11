import type {Building} from '../types/index.ts';
import type {Facility} from '../types/town.ts';

export interface BroadcastState {viewers:number;equipment:number;decor:number;program:string;camera:string;gifts:number}
// Income is paid by the outside audience, not minted by idle, unstaffed scenery.
export function broadcastStep(buildings:Building[], facilities:Record<string,Facility>, state:BroadcastState, working:boolean, tick:number) {
  const studios = buildings.filter(b=>b.type==='studio' && !b.paused && working && facilities[b.id]?.efficiency>0 && facilities[b.id]?.status==='开放中');
  if (!studios.length) return {viewers:state.viewers,income:0,gifts:state.gifts,revenues:[] as {id:string;amount:number}[]};
  const capacity=500+state.equipment*250+state.decor*50+(state.camera==='演播室现场'?0:250);
  const matched = studios.some(b=>state.program==='田园时光'?b.world==='overworld':state.program==='异界奇遇'?b.world!=='overworld':false);
  const viewers=Math.min(capacity,state.viewers+(matched?2:1));
  const revenues=studios.map(b=>({id:b.id,amount:viewers/1000*b.level*Math.min(1,facilities[b.id].efficiency)*(1+(state.equipment-1)*0.1)*(state.program==='工厂实录'?1.1:1)}));
  return {viewers,income:revenues.reduce((sum,r)=>sum+r.amount,0),gifts:state.gifts+(tick%15===0?1:0),revenues};
}
