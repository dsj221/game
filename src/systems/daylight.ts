const smoothstep=(start:number,end:number,value:number)=>{
 const t=Math.max(0,Math.min(1,(value-start)/(end-start)));
 return t*t*(3-2*t);
};
/** Continuous at midnight, including a full morning/evening transition. */
export function daylight(hour:number,dusk=false){
 const h=((hour%24)+24)%24;
 const day=smoothstep(4.5,8,h)*(1-smoothstep(17,20.5,h));
 return dusk?Math.min(day,.25):day;
}
export const nightfall=(hour:number,dusk=false)=>1-daylight(hour,dusk);
export const lightBlend=(delta:number)=>1-Math.exp(-Math.min(Math.max(delta,0),.1)*2.5);
