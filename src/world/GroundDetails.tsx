import { RIVER_X } from '../systems/hydrology';
import { useEffect, useMemo } from 'react';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder } from '../buildings/modelGeometry';
import { buildingCells } from '../data/footprints';
import { isRoad } from '../data/roads';
import { pigments, seasons, seasonIndex } from '../data/artDirection';
import { sceneryLayout, sceneryNoise } from './sceneryLayout';
import { useTownStore } from '../stores/useTownStore';
import type { Building, Tile } from '../types';

export function GroundDetails({ tiles, buildings }: { tiles: Tile[]; buildings: Building[] }) {
  const season = useTownStore(s => seasonIndex(s.day));
  const geometry = useMemo(() => {
    const builder = new Builder();
    const cells = tiles.flatMap(t => Array.from({length:9}, (_, i) => ({x:t.x*3+i%3-1,z:t.z*3+Math.floor(i/3)-1})));
    const land = new Set(cells.map(p => `${p.x},${p.z}`));
    const occupied = new Set(buildings.flatMap(b => buildingCells(b).map(p => `${p.x},${p.z}`)));
    const roads = buildings.filter(b => isRoad(b.type));
    for (const {x,z} of cells) {
      if(x === RIVER_X) continue;
      // Exposed borders reveal a sloped turf lip and layered ochre earth.
      for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        if (!land.has(`${x+dx},${z+dz}`)) {
          builder.box([x+dx*.44,-.04,z+dz*.44],dx?[.16,.22,1]:[1,.22,.16],seasons[season].ground[1],[dz*.28,0,-dx*.28]);
          builder.box([x+dx*.46,-.31,z+dz*.46],dx?[.09,.085,.98]:[.98,.085,.09],pigments.woodLight);
        }
      }
      if (occupied.has(`${x},${z}`)) continue;
      const besideRoad = roads.some(b => Math.abs(b.x-x)+Math.abs(b.z-z)===1);
      if (besideRoad || sceneryNoise(x,z,91) < .25) {
        const color = season === 3 ? '#c3bda5' : '#b9a06a';
        builder.ball([x,.039,z],[.23+sceneryNoise(x,z,11)*.13,.008,.16],color);
      }
      if (besideRoad) for(let i=0;i<3;i++) {
        const px=x+(i-1)*.21,pz=z+.29;
        builder.beam([px,.04,pz],[px+.04,.16,pz+.01],.018,seasons[season].foliage);
      }
    }
    for (const b of buildings.filter(b=>['farm','orchard','icon_carrot_patch'].includes(b.type))) {
      for (const cell of buildingCells(b)) for(const [dx,dz] of [[1,0],[0,1]]) {
        builder.box([cell.x+dx*.46,.08,cell.z+dz*.46],dx?[.08,.09,.9]:[.9,.09,.08],pigments.soil);
      }
    }
    for(const {x,z} of sceneryLayout(tiles, buildings).lakes) {
      for(let i=0;i<10;i++) {
        const angle=i*Math.PI/5;
        builder.ball([x+Math.cos(angle)*.43,.065,z+Math.sin(angle)*.39],[.10,.045,.075],i%2?pigments.stone:'#c4b28b');
      }
    }
    if (!builder.solid.length) return null;
    const merged=mergeGeometries(builder.solid)!;
    builder.solid.forEach(g=>g.dispose());
    return merged;
  }, [tiles, buildings, season]);
  useEffect(()=>()=>geometry?.dispose(),[geometry]);
  return geometry ? <mesh name="painted-ground-details" geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={1}/></mesh> : null;
}
