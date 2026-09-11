import {isPlayableBuilding} from '../data/playable.ts';
import type {Building,Npc,Tile,WorldId} from '../types/index.ts';
import type {TownState} from '../types/town.ts';
export function migrateMainWorld(d:{buildings:Building[];npcs:Npc[];world:{current:WorldId;visited:WorldId[];tiles:Record<WorldId,Tile[]>};town:TownState;game:{program:string;achievements:string[]}}){
 d.buildings=d.buildings.filter(isPlayableBuilding);
 const ids=new Set(d.buildings.map(b=>b.id));
 d.npcs=d.npcs.filter(n=>n.world==='overworld');
 for(const n of d.npcs){
  if(!ids.has(n.workplace))n.workplace='';
  if(n.destination&&!ids.has(n.destination)){n.destination=undefined;n.travelTarget=undefined;n.arrivedAt=undefined;n.route=undefined;}
 }
 d.world.current='overworld';d.world.visited=['overworld'];d.world.tiles.nether=[];d.world.tiles.end=[];
 d.town.facilities=Object.fromEntries(Object.entries(d.town.facilities).filter(([id])=>ids.has(id)));
 d.game.achievements=d.game.achievements.filter(id=>!['nether','end','worlds'].includes(id));
 if(d.game.program==='异界奇遇')d.game.program='田园时光';
 return d;
}
