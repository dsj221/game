import {simulateTown} from '../src/game/TownSimulation.ts';
import {initialTown,emptyBag} from '../src/data/town.ts';
import {settlementBuildings,makeCitizen} from '../src/data/settlement.ts';
const buildings=settlementBuildings();for(let i=0;i<150;i++)buildings.push({id:'b'+i,type:['house','farm','shop','lumber','windmill','bakery'][i%6],world:'overworld',x:i%20,z:Math.floor(i/20),level:3,rotation:0,born:0});
let s={town:initialTown(),buildings,npcs:Array.from({length:500},(_,i)=>makeCitizen('p'+i,i)),bag:{...emptyBag(),food:2000,wood:300},currency:10000,tick:0,weather:[]};const begin=performance.now();for(let i=0;i<30;i++)s=simulateTown(s);console.log('500 居民 / 167 建筑 / 30 Tick：',Math.round((performance.now()-begin)/30),'ms/Tick');
