export const roadStyles:Record<string,{name:string;color:string;cost:number;weight:number}>={
 road:{name:'石砖道路',color:'#d2bd93',cost:35,weight:1/1.3},
 dirt_path:{name:'乡间土路',color:'#b29160',cost:12,weight:1.2},
 cobble_road:{name:'卵石小径',color:'#919993',cost:45,weight:1/1.3},
 brick_road:{name:'红砖街道',color:'#b77959',cost:60,weight:1/1.3},
 boardwalk:{name:'木板步道',color:'#b58b51',cost:40,weight:1},
};
export const isRoad=(type:string)=>type==='bridge'||!!roadStyles[type];
