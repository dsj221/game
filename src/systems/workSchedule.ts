import type {Facility} from '../types/town.ts';
export type WorkSchedule={start:number;end:number;lunch:boolean};
export const defaultSchedule=(shop=false):WorkSchedule=>({start:8,end:shop?22:18,lunch:!shop});
export function validSchedule(s:WorkSchedule){return !!s&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.start<24&&s.end>=0&&s.end<=24&&s.start!==s.end&&typeof s.lunch==='boolean';}
export function onShift(minute:number,facility?:Pick<Facility,'schedule'>,shop=false){
 const s=facility?.schedule||defaultSchedule(shop),hour=minute/60;
 return (s.start<s.end?hour>=s.start&&hour<s.end:hour>=s.start||hour<s.end)&&!(s.lunch&&hour>=12&&hour<13);
}
