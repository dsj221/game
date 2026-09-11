import {defaultSchedule,onShift} from '../systems/workSchedule';
import {setWorkSchedule} from '../game/actions';
import type {Facility} from '../types/town';
export function WorkSchedule({id,facility,shop}:{id:string;facility:Facility;shop:boolean}){
 const s=facility.schedule||defaultSchedule(shop);
 const hours=Array.from({length:24},(_,hour)=>onShift(hour*60,{schedule:s})?1:0).reduce<number>((sum,h)=>sum+h,0);
 const time=(v:number)=>`${String(v).padStart(2,'0')}:00`;
 return <div className="recipe-card">
  <h3>员工排班 · 每日 {hours} 小时</h3>
  <div className="production-lines">
   <label>上班 <select aria-label="上班时间" value={s.start} onChange={e=>setWorkSchedule(id,{...s,start:Number(e.target.value)})}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{time(i)}</option>)}</select></label>
   <label>下班 <select aria-label="下班时间" value={s.end} onChange={e=>setWorkSchedule(id,{...s,end:Number(e.target.value)})}>{Array.from({length:25},(_,i)=><option key={i} value={i}>{time(i)}</option>)}</select></label>
  </div>
  <label><input type="checkbox" checked={s.lunch} onChange={e=>setWorkSchedule(id,{...s,lunch:e.target.checked})}/>12:00–13:00 午休</label>
  <p className="note">适用于本建筑全体员工。下班早于上班代表跨午夜；延长排班会增加工资支出。商店同步调整营业时间，到岗后才能服务。</p>
  <button onClick={()=>setWorkSchedule(id,undefined)}>恢复默认排班</button>
 </div>;
}
