import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildReference, referenceKey } from './referenceGeometry.ts';
import {roadStyles} from '../data/roads.ts';
import {detailedTree,detailedCrate} from './naturalDetails.ts';

type V = [number, number, number];
const timber = "#a86b2d",
  trim = "#65401e",
  stone = "#858e91",
  cream = "#eadbbd";
export const modelKinds = [
  "house",
  "orchard","tea_house","library","pottery",
  "residence",
  "apartment",
  "shop",
  "breadshop",
  "cafe",
  "market",
  "clock",
  "studio",
  "mine",
  "furnace",
  "slime",
  "drill",
  "generator",
  "windmill",
  "farm",
  "lumber",
  "carpenter",
  "bakery",
  "portal",
  "endportal",
  "core",
  "tree",
  "netherplant",
  "lamp",
  "torch",
  "road",
  "bridge",
  "warehouse",
  "obsidian",
  "park",
  "clinic",
  "school",
  "flowerbed",
  "bench",
  "stone_well",
  "workshop_stall",
  "clay_kiln",
  "greenhouse",
  "signpost",
  "village_gate",
  "shrine",
  "water_tower",
  "carrot_patch",
  "hay_shed",
  "water_shrine_tower",
  "gazebo",
  "central_fountain",
  "tool_shop",
  "camp_tent",
  "birdhouse",
  "crystal_pool",
  "scenery_lake",
  "scenery_grass",
] as const;
const aliases: Record<string, string> = {
  crate: "warehouse",
  market_stall: "shop",
  thatched_cottage: "house",
  vegetable_garden: "farm",
  flower_planter: "flowerbed",
  carpenter_workbench: "carpenter",
  blacksmith_forge: "furnace",
  steam_machine: "generator",
  arched_bridge: "bridge",
  magic_portal: "portal",
  lantern_post: "lamp",
  log_pile: "lumber",
  wood_fired_oven: "bakery",
  wooden_crane: "drill",
  vine_pergola: "park",
  mine_entrance: "mine",
  market_pavilion: "market",
  crystal_obelisk: "core",
};
export function resolveModel(type: string) {
  const key = type.replace(/^icon_/, "");
  return aliases[key] ?? key;
}

// One vertex-coloured mesh for the body and one for lit parts. Geometry is cached
// and shared by every instance; hundreds of decorative pieces need no extra draws.
export class Builder {
  solid: THREE.BufferGeometry[] = [];
  lights: THREE.BufferGeometry[] = [];
  add(
    g: THREE.BufferGeometry,
    p: V,
    s: V,
    color: string,
    rotation: V = [0, 0, 0],
    lit = false,
  ) {
    const mesh = g.index ? g.toNonIndexed() : g;
    if (mesh !== g) g.dispose();
    mesh.deleteAttribute("uv");
    mesh.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...p),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        new THREE.Vector3(...s),
      ),
    );
    const c = new THREE.Color(color),
      colors = new Float32Array(mesh.getAttribute("position").count * 3);
    mesh.computeBoundingBox();
    const bounds=mesh.boundingBox!,positions=mesh.getAttribute('position');
    const height=Math.max(.001,bounds.max.y-bounds.min.y);
    for (let i = 0; i < colors.length; i += 3) {
      const vertex=i/3,y=(positions.getY(vertex)-bounds.min.y)/height;
      // Continuous, deterministic paint shading: shared edges receive identical
      // colours, while recessed lower edges stay warm rather than plastic-white.
      const shade=lit?1:.86+.14*y;
      colors[i] = c.r*shade;
      colors[i + 1] = c.g*shade;
      colors[i + 2] = c.b*shade;
    }
    mesh.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    (lit ? this.lights : this.solid).push(mesh);
  }
  box(p: V, s: V, c = timber, r: V = [0, 0, 0], lit = false) {
    // Small bevels catch the light like the painted edges in the original icons.
    const radius = Math.min(...s) * .22;
    // Sub-pixel ribs do not benefit from a 3D bevel; keep their geometry cheap.
    this.add(Math.min(...s)<.008?new THREE.BoxGeometry(...s):new RoundedBoxGeometry(...s, 1, radius), p, [1,1,1], c, r, lit);
  }
  cylinder(
    p: V,
    radius: number,
    height: number,
    c = timber,
    rotation: V = [0, 0, 0],
    top = radius,
  ) {
    this.add(
      new THREE.CylinderGeometry(top, radius, height, 10),
      p,
      [1, 1, 1],
      c,
      rotation,
    );
  }
  ball(p: V, s: V, c: string) {
    this.add(new THREE.IcosahedronGeometry(1, 1), p, s, c);
  }
  beam(a: V, b: V, width = 0.045, c = timber) {
    const va = new THREE.Vector3(...a),
      vb = new THREE.Vector3(...b),
      direction = vb.clone().sub(va);
    const g = new THREE.BoxGeometry(width, direction.length(), width);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      ),
    );
    this.add(g, va.add(vb).multiplyScalar(0.5).toArray() as V, [1, 1, 1], c);
  }
  roof(y: number, w = 0.94, d = 0.88, c = "#c69c4e") {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(0, 0.34);
    shape.lineTo(w / 2, 0);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: false,
      steps: 1,
    });
    this.add(g, [0, y, -d / 2], [1, 1, 1], c);
    for (const z of [-d / 2, d / 2]) {
      this.beam([-w / 2, y, z], [0, y + 0.34, z], 0.045, trim);
      this.beam([0, y + 0.34, z], [w / 2, y, z], 0.045, trim);
    }
    const slope=Math.atan2(.34,w/2), length=Math.hypot(w/2,.34);
    const base=new THREE.Color(c==='#c69c4e'?'#ffb719':c);
    for(const side of [-1,1])for(let row=0;row<5;row++)for(let col=0;col<9;col++){
      const t=(row+.5)/5,z=-d/2+(col+.5)*d/9;
      const tint=base.clone().multiplyScalar(.89+((row*3+col*7)%7)*.025);
      const center:V=[side*t*w/2,y+.34*(1-t)+.035+(4-row)*.009,z];
      this.box(center,[length/5+.025,.048,d/9-.004],`#${tint.getHexString()}`,[0,0,-side*slope]);
      // Fine raised ribs make individual overlapping shingles readable up close.
      this.box([center[0]+side*.010,center[1]+.025,center[2]],[length/5*.70,.005,.005],`#${tint.clone().multiplyScalar(1.10).getHexString()}`,[0,0,-side*slope]);
    }
    for(let i=0;i<9;i++)this.box([0,y+.405,-d/2+(i+.5)*d/9],[.12,.065,d/9-.004],`#${base.clone().multiplyScalar(1.06).getHexString()}`);
  }
  window(x: number, y: number, z: number, side = false) {
    this.box(
      [x, y, z],
      side ? [0.018, 0.19, 0.18] : [0.18, 0.19, 0.018],
      "#f4c878",
      [0, 0, 0],
      true,
    );
    this.box(
      [x, y, z + 0.012],
      side ? [0.025, 0.018, 0.2] : [0.2, 0.018, 0.025],
      cream,
    );
    this.box(
      [x, y, z + 0.012],
      side ? [0.025, 0.21, 0.018] : [0.018, 0.21, 0.025],
      cream,
    );
  }
  cottage(floors = 1, roof = "#c69c4e", width = 0.76) {
    this.box([0, 0.055, 0], [0.94, 0.11, 0.88], stone);
    for(let row=0;row<2;row++)for(let i=0;i<5;i++)for(const side of [-1,1]){
      const tint=(i+row)%2?'#929a99':'#747f82';
      this.box([-.36+i*.18,.065+row*.085,side*.352],[.173,.08,.10],tint);
      this.box([side*.39,.065+row*.085,-.28+i*.14],[.1,.08,.134],tint);
    }
    this.box([0, 0.12 + floors * 0.3, 0], [width, floors * 0.6, 0.67], cream);
    for (const x of [-width / 2, width / 2])
      for (const z of [-0.34, 0.34])
        this.box(
          [x, 0.12 + floors * 0.3, z],
          [0.085, floors * 0.6, 0.085],
          timber,
        );
    for (let i = 0; i < floors; i++) {
      for (const x of [-0.23, 0.23]) this.window(x, 0.48 + i * 0.6, 0.342);
      this.window(width / 2 + 0.008, 0.48 + i * 0.6, 0, true);
      this.window(-width / 2 - 0.008, 0.48 + i * 0.6, 0, true);
      this.window(0.18, 0.48 + i * 0.6, -0.345);
      this.box([0, 0.14 + i * 0.6, 0], [width + 0.02, 0.035, 0.7], timber);
    }
    this.box([0, 0.3, 0.35], [0.17, 0.36, 0.035], timber);
    for(const x of [-.105,.105])this.box([x,.32,.375],[.045,.4,.045],trim);
    this.beam([-.12,.52,.375],[0,.58,.375],.055,timber);
    this.beam([0,.58,.375],[.12,.52,.375],.055,timber);
    for(const x of [-.052,0,.052])this.box([x,.3,.373],[.004,.32,.004],'#744721');
    for(const y of [.22,.41])this.box([-.066,y,.382],[.035,.018,.013],'#535e60');
    this.ball([0.05, 0.3, 0.378], [0.018, 0.018, 0.018], "#dbb25b");
    this.box([0, 0.08, 0.42], [0.28, 0.08, 0.13], stone);
    this.roof(0.14 + floors * 0.6, 0.95, 0.85, roof);
    this.box([0.23, 0.4 + floors * 0.6, -0.2], [0.13, 0.5, 0.14], stone);
    this.box([0.23, 0.66 + floors * 0.6, -0.2], [0.17, 0.055, 0.18], trim);
    for(let row=0;row<5;row++){
      this.box([.23,.2+floors*.6+row*.085,-.2],[.147,.008,.157],'#59646a');
      this.box([.23+(row%2?.025:-.025),.24+floors*.6+row*.085,-.275],[.008,.075,.008],'#59646a');
    }
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const x=side*.4,z=-.28+i*.18;
      this.ball([x,.14,z],[.065,.09,.07],i%2?'#66913b':'#79a33e');
      if(i===3)this.ball([x,.22,z],[.038,.04,.038],'#c4524b');
    }
  }
  fence(z: number) {
    for (const x of [-0.43, 0, 0.43])
      this.box([x, 0.2, z], [0.07, 0.4, 0.07]);
    for (const y of [0.12, 0.29]) this.box([0, y, z], [0.91, 0.055, 0.045]);
  }
  tree(x = 0, z = 0, scale = 1, red = false) {
    detailedTree(this,x,z,scale,red);
  }
  crate(x: number, y: number, z: number, s = 0.24) {
    detailedCrate(this,x,y,z,s);
  }
}

export type ModelGeometry = {
  solid: THREE.BufferGeometry;
  lights: THREE.BufferGeometry | null;
  kind: string;
};
const cache = new Map<string, ModelGeometry>();
export function getRoadGeometry(type:string,mask=5):ModelGeometry{
  const key=`road:${type}:${mask}`;const old=cache.get(key);if(old)return old;
  const b=new Builder(),color=roadStyles[type]?.color??'#bca978';
  const cells:[[number,number],[number,number]][]=[[[0,0],[.55,.55]]];
  const arms=[[0,-.36],[.36,0],[0,.36],[-.36,0]];
  arms.forEach(([x,z],i)=>{if(mask&(1<<i))cells.push([[x,z],i%2?[.22,.55]:[.55,.22]]);});
  for(const [[x,z],[w,d]] of cells){b.box([x,.045,z],[w,.065,d],color);if(type==='boardwalk'){const count=Math.ceil(d/.085);for(let j=0;j<count;j++)b.box([x,.085,z-d/2+(j+.5)*d/count],[w-.008,.025,d/count-.008],j%2?'#bc965f':'#a87e43');}}
  for(let ix=-4;ix<=4;ix++)for(let iz=-4;iz<=4;iz++){
    const x=ix*.1,z=iz*.1;if(!cells.some(([p,s])=>Math.abs(x-p[0])<s[0]/2-.025&&Math.abs(z-p[1])<s[1]/2-.025))continue;
    if(type==='dirt_path'||type==='boardwalk')continue;
    b.box([x,.083,z],[.09,.017,.09],type==='brick_road'?(ix%2?'#bf825f':'#a9684e'):type==='cobble_road'?((ix+iz)%2?'#a3aaa0':'#7f8882'):color);
  }
  const solid=mergeGeometries(b.solid)!;b.solid.forEach(g=>g.dispose());solid.computeBoundingBox();solid.computeBoundingSphere();const result={solid,lights:null,kind:type};cache.set(key,result);return result;
}
export function getModelGeometry(type: string): ModelGeometry {
  if(roadStyles[type])return getRoadGeometry(type);
  const kind = resolveModel(type);
  const key = referenceKey(type);
  const cached = cache.get(key);
  if (cached) return cached;
  if (!(modelKinds as readonly string[]).includes(kind))
    throw new Error(`Missing 3D building model: ${type}`);
  const b = new Builder();
  if (!buildReference(key, b)) switch (kind) {
    case "house":
    case "residence":
    case "apartment":
    case "clinic":
    case "school":
    case "studio":
    case "tool_shop":
      b.cottage(
        kind === "apartment" ? 3 : kind === "residence" ? 2 : 1,
        kind === "clinic"
          ? "#739a91"
          : kind === "school"
            ? "#a26b50"
            : kind === "studio"
              ? "#697d91"
              : "#c69c4e",
      );
      if (kind === "clinic") {
        b.box([0, 0.92, 0.45], [0.09, 0.3, 0.055], "#bd6455");
        b.box([0, 0.92, 0.45], [0.27, 0.085, 0.055], "#bd6455");
      }
      if (kind === "school") {
        b.box([0, 0.64, 0.4], [0.37, 0.16, 0.07], trim);
        b.box([0, 0.65, 0.445], [0.23, 0.025, 0.012], cream);
        b.beam([-0.35, 0.8, -0.2], [-0.35, 1.5, -0.2], 0.025);
        b.box([-0.23, 1.41, -0.2], [0.24, 0.13, 0.025], "#87a883");
      }
      if (kind === "studio") {
        b.cylinder([0.28, 1.3, 0], 0.13, 0.06, stone, [0, 0, 0.6]);
        b.beam([0.28, 1.1, 0], [0.28, 1.5, 0], 0.025);
        b.box([0, 0.67, 0.39], [0.4, 0.13, 0.055], "#597c70");
      }
      if (kind === "tool_shop") {
        for (let i = 0; i < 3; i++) {
          b.beam([-0.2 + i * 0.2, 0.4, 0.4], [-0.2 + i * 0.2, 0.7, 0.4], 0.03);
          b.box([-0.2 + i * 0.2, 0.68, 0.4], [0.13, 0.06, 0.07], stone);
        }
      }
      break;
    case "shop":
    case "breadshop":
    case "market":
    case "cafe":
    case "workshop_stall": {
      const red =
        kind === "cafe"
          ? "#688d79"
          : kind === "breadshop"
            ? "#b78a49"
            : "#e3452e";
      for (const x of [-0.4, 0.4])
        for (const z of [-0.32, 0.32])
          b.box([x, 0.43, z], [0.075, 0.86, 0.075]);
      for(let i=0;i<7;i++)b.box([-.42+i*.14,.73,.435],[.137,.15,.045],i%2?'#f4e7cf':red);
      for(let i=0;i<8;i++)b.box([-.38+i*.108,.29,.393],[.102,.32,.025],i%2?'#a66c30':'#ba7d36');
      b.box([.25,.21,.46],[.2,.3,.04],timber,[-.17,0,0]);
      b.box([.25,.22,.49],[.16,.24,.014],'#344d50',[-.17,0,0]);
      for(let i=0;i<3;i++)b.box([.25,.16+i*.05,.52],[.10-i*.016,.009,.007],'#d7d8ba');
      for (let i = 0; i < 7; i++)
        b.box(
          [-0.42 + i * 0.14, 0.84, 0],
          [0.14, 0.065, 0.86],
          i % 2 ? cream : red,
          [0.12, 0, 0],
        );
      b.box([0, 0.3, 0.23], [0.87, 0.34, 0.31]);
      b.box([0, 0.49, 0.23], [0.93, 0.055, 0.37], "#ba935e");
      for (let i = 0; i < 4; i++) {
        for(let j=0;j<6;j++)b.ball([-.3+i*.2+(j%3-1)*.045,.65+Math.floor(j/3)*.04,.23+(j%2-.5)*.06],[.037,.038,.037],kind==='breadshop'?'#d6a13f':['#e24820','#619f24','#efbd1c','#7b9e29'][i]);
        b.crate(-0.3 + i * 0.2, 0.52, 0.23, 0.17);
        b.ball(
          [-0.3 + i * 0.2, 0.71, 0.23],
          [0.075, 0.06, 0.065],
          kind === "breadshop"
            ? "#d4a15a"
            : ["#d94322", "#69a72b", "#e7b21e", "#83ad35"][i],
        );
      }
      b.crate(0.28, 0, -0.2, 0.3);
      if (kind === "market") {
        b.roof(0.9, 1, 0.95, "#73875d");
        b.box([0, 1.29, 0], [0.09, 0.2, 0.09], timber);
      }
      if (kind === "cafe") {
        b.cylinder([-0.27, 0.27, -0.2], 0.17, 0.05);
        b.cylinder([-0.27, 0.13, -0.2], 0.035, 0.25);
        b.cylinder([-0.27, 0.33, -0.2], 0.04, 0.06, cream);
      }
      if (kind === "workshop_stall") {
        b.box([0, 0.62, 0.25], [0.3, 0.08, 0.13], stone);
        b.beam([-0.3, 0.55, -0.25], [0.3, 0.8, -0.25], 0.07);
      }
      break;
    }
    case "farm":
    case "carrot_patch":
    case "flowerbed":
      b.box([0, 0.045, 0], [0.94, 0.09, 0.94], "#745537");
      for (let row = 0; row < 4; row++) {
        b.box([0, 0.09, -0.33 + row * 0.22], [0.85, 0.06, 0.12], "#957148");
        for (let col = 0; col < 4; col++) {
          const x = -0.32 + col * 0.21,
            z = -0.33 + row * 0.22;
          if (kind === "flowerbed") {
            b.beam([x, 0.1, z], [x, 0.29, z], 0.019, "#729254");
            b.ball(
              [x, 0.3, z],
              [0.07, 0.055, 0.07],
              ["#dd957d", "#debd64", "#b69abb"][(row + col) % 3],
            );
          } else {
            for(let leaf=0;leaf<5;leaf++){
              const a=leaf*Math.PI*2/5;
              b.ball([x+Math.cos(a)*.045,.16,z+Math.sin(a)*.045],[.045,.045,.035],leaf%2?'#4d9027':'#74ac35');
            }
            b.ball(
              [x, 0.17, z],
              [0.07, 0.07, 0.075],
              kind === "carrot_patch" ? "#d28a43" : "#7b9f4b",
            );
            b.beam([x, 0.14, z], [x + 0.03, 0.31, z + 0.02], 0.025, "#8cac53");
            b.beam([x, 0.18, z], [x - 0.06, 0.26, z], 0.027, "#547d42");
          }
        }
      }
      b.fence(-0.46);
      if (kind !== "flowerbed") b.fence(0.46);
      break;
    case "lumber":
    case "carpenter":
    case "hay_shed":
      if (kind === "lumber") {
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 3 - row; col++) {
            const x = -0.28 + col * 0.26 + row * 0.13,
              y = 0.13 + row * 0.22;
            b.cylinder([x, y, 0], 0.12, 0.82, timber, [Math.PI / 2, 0, 0]);
            b.cylinder([x, y, 0.417], 0.095, 0.012, "#d4b47d", [
              Math.PI / 2,
              0,
              0,
            ]);
          }
        b.box([0.34, 0.07, 0.12], [0.15, 0.14, 0.65], "#c99958");
      } else {
        for (const x of [-0.36, 0.36])
          for (const z of [-0.28, 0.28])
            b.box([x, 0.23, z], [0.065, 0.46, 0.065]);
        b.box([0, 0.48, 0], [0.9, 0.1, 0.72], "#b28a55");
        if (kind === "carpenter") {
          b.box([0, 0.57, 0.05], [0.5, 0.08, 0.18], cream);
          b.box([0.28, 0.6, -0.2], [0.17, 0.16, 0.12], stone);
          b.beam([-0.3, 0.59, 0.2], [-0.12, 0.59, 0.2], 0.045, stone);
          b.crate(-0.2, 0, 0.1, 0.27);
        } else {
          for (const x of [-0.35, 0.35])
            b.box([x, 0.66, 0], [0.045, 1.32, 0.045]);
          b.roof(1.15);
          for (let i = 0; i < 3; i++)
            b.box([-0.27 + i * 0.27, 0.69, 0], [0.24, 0.32, 0.44], "#c7ab59");
        }
      }
      break;
    case "warehouse":
      b.crate(0, 0, 0, 0.72);
      b.crate(0.27, 0, 0.32, 0.23);
      b.box([0, 0.76, 0], [0.8, 0.07, 0.8], trim);
      break;
    case "bakery":
    case "furnace":
    case "clay_kiln":
      b.box([0, 0.08, 0], [0.92, 0.16, 0.85], stone);
      b.cylinder(
        [0, 0.38, 0],
        0.35,
        0.57,
        kind === "furnace" ? stone : "#b68660",
        [0, 0, 0],
        0.28,
      );
      b.ball(
        [0, 0.67, 0],
        [0.3, 0.19, 0.3],
        kind === "furnace" ? "#7b8179" : "#ba8d67",
      );
      b.box([0, 0.34, 0.31], [0.3, 0.24, 0.08], trim);
      b.box([0, 0.3, 0.36], [0.2, 0.09, 0.012], "#ed9746", [0, 0, 0], true);
      b.box([0.19, 0.94, -0.16], [0.15, 0.65, 0.16], stone);
      b.box([0.19, 1.28, -0.16], [0.2, 0.07, 0.21], trim);
      b.box([0, 0.19, 0.4], [0.46, 0.07, 0.15], stone);
      for (let i = 0; i < 3; i++)
        b.cylinder([-0.34, 0.12 + i * 0.1, -0.06], 0.045, 0.4, timber, [
          Math.PI / 2,
          0,
          0,
        ]);
      if (kind === "bakery")
        for (let i = 0; i < 3; i++)
          b.ball(
            [-0.15 + i * 0.15, 0.27, 0.43],
            [0.055, 0.035, 0.065],
            "#d8ae67",
          );
      if (kind === "furnace") {
        b.box([0.34, 0.3, 0.27], [0.2, 0.13, 0.23], "#535c59");
        b.box([0.34, 0.19, 0.27], [0.1, 0.2, 0.13], trim);
      }
      if (kind === "clay_kiln")
        b.cylinder([0.34, 0.18, 0.29], 0.09, 0.24, "#c19772", [0, 0, 0], 0.07);
      break;
    case "windmill":
      b.cylinder([0, 0.52, 0], 0.36, 1.04, cream, [0, 0, 0], 0.25);
      b.roof(1.04, 0.72, 0.7, "#aa7655");
      b.box([0, 0.22, 0.35], [0.16, 0.4, 0.035], timber);
      b.window(0.16, 0.67, 0.28);
      break;
    case "generator":
    case "slime":
      b.box([0, 0.08, 0], [0.95, 0.16, 0.85], stone);
      b.cylinder(
        [-0.14, 0.48, 0],
        0.24,
        0.72,
        kind === "slime" ? "#85a678" : "#71877d",
      );
      for (const y of [0.2, 0.65]) b.cylinder([-0.14, y, 0], 0.25, 0.06, trim);
      b.box([0.22, 0.35, 0.08], [0.28, 0.44, 0.48], "#94754e");
      b.box([0.24, 0.42, 0.33], [0.14, 0.16, 0.03], "#db9553", [0, 0, 0], true);
      b.cylinder([0.27, 0.94, -0.23], 0.065, 0.88, stone);
      b.cylinder([0.27, 1.39, -0.23], 0.1, 0.05, trim);
      b.beam([-0.14, 0.83, 0], [0.27, 0.83, -0.23], 0.075, stone);
      break;
    case "drill":
      b.box([0, 0.07, 0], [0.9, 0.14, 0.86], stone);
      for (const x of [-0.3, 0.3]) {
        b.beam([x, 0.1, -0.25], [x, 1.3, -0.25], 0.085);
        b.beam([x, 0.1, 0.28], [x, 1.05, -0.25], 0.065);
      }
      b.box([0, 1.27, 0.04], [0.78, 0.09, 0.84]);
      b.beam([0, 1.23, 0.36], [0, 0.54, 0.36], 0.019, trim);
      b.cylinder([0, 0.43, 0.36], 0.12, 0.35, stone, [0, 0, 0], 0.04);
      b.crate(0.23, 0.14, -0.05, 0.27);
      break;
    case "mine":
      for (const x of [-0.32, 0, 0.32])
        b.ball(
          [x, 0.33, -0.14],
          [0.27, 0.42 + (0.1 - Math.abs(x) * 0.2), 0.33],
          stone,
        );
      b.box([0, 0.27, 0.18], [0.42, 0.49, 0.03], "#333c35");
      for (const x of [-0.26, 0.26])
        b.box([x, 0.28, 0.23], [0.085, 0.56, 0.12]);
      b.box([0, 0.57, 0.23], [0.64, 0.095, 0.13]);
      for (const x of [-0.16, 0.16])
        b.box([x, 0.07, 0.24], [0.025, 0.035, 0.49], "#535e59");
      for (let i = 0; i < 4; i++)
        b.box([0, 0.045, i * 0.13], [0.43, 0.04, 0.04]);
      b.box([0, 0.2, 0.33], [0.25, 0.18, 0.21], "#6f7d78");
      break;
    case "tree":
    case "netherplant":
      b.tree(0, 0, 1, kind === "netherplant");
      break;
    case "bench":
      b.box([0, 0.27, 0], [0.87, 0.075, 0.3], "#b89562");
      b.box([0, 0.47, -0.12], [0.87, 0.26, 0.045], "#b89562");
      for (const x of [-0.3, 0.3]) {
        b.box([x, 0.13, 0], [0.065, 0.26, 0.28], trim);
        b.box([x, 0.37, 0], [0.04, 0.05, 0.32], trim);
      }
      break;
    case "lamp":
    case "torch":
    case "birdhouse":
    case "signpost":
      b.box([0, 0.035, 0], [0.24, 0.07, 0.24], stone);
      b.box([0, 0.48, 0], [0.055, 0.95, 0.055], trim);
      if (kind === "signpost") {
        b.box([0.06, 0.84, 0], [0.48, 0.16, 0.07], "#bd9964");
        b.box([-0.04, 0.62, 0.02], [0.4, 0.13, 0.06], "#af854f");
      } else if (kind === "birdhouse") {
        b.box([0, 0.87, 0], [0.29, 0.3, 0.27], cream);
        b.cylinder([0, 0.9, 0.14], 0.055, 0.015, trim, [Math.PI / 2, 0, 0]);
        b.roof(1.02, 0.39, 0.37);
        b.box([0, 0.76, 0.19], [0.04, 0.035, 0.19]);
      } else {
        b.box(
          [0, 0.99, 0],
          [0.2, 0.26, 0.2],
          kind === "torch" ? "#ed9860" : "#f2ce80",
          [0, 0, 0],
          true,
        );
        for (const x of [-0.11, 0.11])
          for (const z of [-0.11, 0.11])
            b.box([x, 1, z], [0.023, 0.28, 0.023], trim);
        b.roof(1.14, 0.3, 0.3, "#5f7868");
      }
      break;
    case "road":
      b.box([0, 0.028, 0], [0.98, 0.056, 0.98], "#b9b69a");
      break;
    case "bridge":
      for (let i = 0; i < 9; i++) {
        const z = -0.42 + i * 0.105,
          y = 0.08 + Math.sin((i / 8) * Math.PI) * 0.13;
        b.box([0, y, z], [0.88, 0.07, 0.095], "#b19562");
        for (const x of [-0.4, 0.4]) {
          if (i % 2 === 0) b.box([x, y + 0.17, z], [0.035, 0.36, 0.035], trim);
          if (i < 8)
            b.beam(
              [x, y + 0.33, z],
              [x, 0.41 + Math.sin(((i + 1) / 8) * Math.PI) * 0.13, z + 0.105],
              0.025,
            );
        }
      }
      break;
    case "park":
    case "gazebo":
    case "village_gate":
    case "shrine":
      b.box(
        [0, 0.025, 0],
        [0.96, 0.05, 0.94],
        kind === "park" ? "#90a56c" : stone,
      );
      for (const x of [-0.36, 0.36])
        for (const z of kind === "village_gate" ? [0] : [-0.34, 0.34])
          b.box(
            [x, 0.5, z],
            [0.065, 1, 0.065],
            kind === "shrine" ? "#a65f45" : timber,
          );
      if (kind === "park") {
        for (let i = 0; i < 6; i++) {
          b.box([-0.44 + i * 0.175, 1, 0], [0.055, 0.06, 0.9]);
          b.ball(
            [-0.4 + i * 0.16, 1.05, -0.25],
            [0.14, 0.065, 0.16],
            "#70904f",
          );
        }
        b.box([0, 0.24, -0.27], [0.6, 0.07, 0.2]);
        b.tree(0.25, 0.24, 0.4);
      } else {
        b.roof(
          1,
          1,
          kind === "village_gate" ? 0.35 : 1,
          kind === "shrine" ? "#9c584b" : "#789074",
        );
        if (kind === "shrine") b.box([0, 0.3, 0], [0.4, 0.55, 0.35], cream);
      }
      break;
    case "stone_well":
    case "central_fountain":
    case "crystal_pool":
    case "scenery_lake":
      b.cylinder([0, 0.05, 0], 0.46, 0.1, stone);
      b.cylinder([0, 0.11, 0], 0.37, 0.06, "#639d9e");
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        if (kind === "scenery_lake")
          b.ball(
            [Math.cos(a) * 0.41, 0.08, Math.sin(a) * 0.41],
            [0.08 + (i % 3) * 0.015, 0.07, 0.09],
            i % 2 ? stone : "#a8ad89",
          );
        else
          b.box(
            [
              Math.cos(a) * 0.41,
              kind === "stone_well" ? 0.22 : 0.13,
              Math.sin(a) * 0.41,
            ],
            [0.2, kind === "stone_well" ? 0.38 : 0.17, 0.12],
            i % 2 ? stone : "#adb19f",
            [0, -a + Math.PI / 2, 0],
          );
      }
      if (kind === "stone_well") {
        for (const x of [-0.34, 0.34]) b.box([x, 0.7, 0], [0.06, 1.15, 0.06]);
        b.roof(1.14, 0.9, 0.73);
        b.beam([-0.36, 0.85, 0], [0.36, 0.85, 0], 0.055);
        b.beam([0, 0.85, 0], [0, 0.35, 0], 0.014, trim);
      }
      if (kind === "central_fountain") {
        b.cylinder([0, 0.35, 0], 0.07, 0.5, stone);
        b.cylinder([0, 0.58, 0], 0.23, 0.09, cream);
        b.cylinder([0, 0.7, 0], 0.022, 0.25, "#9ed0cd");
      }
      if (kind === "crystal_pool") {
        for (let i = 0; i < 3; i++)
          b.add(
            new THREE.OctahedronGeometry(1),
            [-0.2 + i * 0.2, 0.3 + (i % 2) * 0.2, -0.12],
            [0.1, 0.32, 0.1],
            "#a992c7",
          );
      }
      break;
    case "water_tower":
    case "water_shrine_tower":
      for (const x of [-0.27, 0.27])
        for (const z of [-0.27, 0.27]) b.box([x, 0.47, z], [0.07, 0.94, 0.07]);
      for (const z of [-0.27, 0.27]) {
        b.beam([-0.27, 0.08, z], [0.27, 0.85, z], 0.045);
        b.beam([0.27, 0.08, z], [-0.27, 0.85, z], 0.045);
      }
      b.cylinder(
        [0, 1.03, 0],
        0.37,
        0.51,
        kind === "water_tower" ? "#aa8656" : "#94b7b1",
      );
      for (const y of [0.85, 1.21]) b.cylinder([0, y, 0], 0.38, 0.04, trim);
      b.cylinder([0, 1.33, 0], 0.41, 0.18, "#698879", [0, 0, 0], 0);
      b.beam([0.39, 0.24, 0], [0.39, 1.1, 0], 0.055, stone);
      break;
    case "greenhouse":
      b.box([0, 0.045, 0], [0.95, 0.09, 0.93], stone);
      b.box([0, 0.42, 0], [0.81, 0.7, 0.77], "#abd0bf");
      b.roof(0.77, 0.94, 0.94, "#94bbaa");
      for (const x of [-0.42, 0, 0.42]) {
        for (const z of [-0.4, 0.4])
          b.box([x, 0.42, z], [0.035, 0.74, 0.035], cream);
        b.beam([x, 0.78, -0.42], [x, 0.78, 0.42], 0.03, cream);
      }
      for (const z of [-0.42, 0, 0.42]) {
        b.beam([-0.43, 0.79, z], [0, 1.1, z], 0.035, cream);
        b.beam([0, 1.1, z], [0.43, 0.79, z], 0.035, cream);
      }
      b.box([0, 0.28, 0.42], [0.21, 0.47, 0.025], "#719683");
      break;
    case "camp_tent":
      b.roof(0.04, 0.95, 0.9, "#b3a47c");
      b.box([0, 0.03, 0], [0.96, 0.06, 0.94], trim);
      b.add(
        new THREE.ConeGeometry(0.22, 0.28, 3),
        [0, 0.15, 0.458],
        [1, 1, 0.03],
        "#574c3c",
      );
      for (const x of [-0.45, 0.45]) {
        b.beam([0, 0.39, 0.45], [x, 0.015, 0.48], 0.014, cream);
      }
      break;
    case "portal":
    case "endportal":
      b.box([0, 0.06, 0], [0.96, 0.12, 0.55], stone);
      for (const x of [-0.34, 0.34])
        for (let i = 0; i < 5; i++)
          b.box(
            [x, 0.19 + i * 0.19, 0],
            [0.2, 0.18, 0.27],
            i % 2 ? "#666077" : "#524a62",
          );
      b.box([0, 1.1, 0], [0.87, 0.2, 0.29], "#524a62");
      b.box(
        [0, 0.59, 0],
        [0.48, 0.93, 0.08],
        kind === "portal" ? "#b57aad" : "#81a7bd",
        [0, 0, 0],
        true,
      );
      break;
    case "core":
    case "obsidian":
      b.box([0, 0.07, 0], [0.75, 0.14, 0.75], stone);
      b.cylinder([0, 0.26, 0], 0.23, 0.32, "#776b87");
      b.add(
        new THREE.OctahedronGeometry(1),
        [0, kind === "core" ? 0.92 : 1.03, 0],
        [0.29, kind === "core" ? 0.53 : 0.75, 0.29],
        kind === "core" ? "#bca4d8" : "#5a536e",
      );
      for (const x of [-0.31, 0.31])
        b.add(
          new THREE.OctahedronGeometry(1),
          [x, 0.25, 0.17],
          [0.08, 0.2, 0.08],
          "#c4a6e0",
        );
      break;
    case "clock":
      b.box([0, 0.06, 0], [0.8, 0.12, 0.76], stone);
      b.box([0, 0.8, 0], [0.55, 1.5, 0.55], cream);
      b.roof(1.56, 0.81, 0.79, "#73896e");
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        b.cylinder(
          [Math.sin(a) * 0.285, 1.23, Math.cos(a) * 0.285],
          0.18,
          0.035,
          "#f3e5b9",
          [Math.PI / 2, 0, -a],
        );
      }
      b.box([0, 1.28, 0.313], [0.018, 0.14, 0.015], trim);
      b.box([0.05, 1.23, 0.313], [0.11, 0.018, 0.015], trim);
      b.box([0, 0.25, 0.28], [0.17, 0.43, 0.025], timber);
      break;
    case "scenery_grass":
      for (let i = 0; i < 5; i++)
        b.beam(
          [0, 0, 0],
          [(i - 2) * 0.035, 0.12 + (i % 2) * 0.06, ((i % 3) - 1) * 0.05],
          0.02,
          "#819957",
        );
      break;
  }
  const solid = mergeGeometries(b.solid)!;
  const lights = b.lights.length ? mergeGeometries(b.lights) : null;
  for (const part of [...b.solid, ...b.lights]) part.dispose();
  // Fit every authored model into one local grid cell without distorting proportions.
  solid.computeBoundingBox();
  const bounds = solid.boundingBox!.clone();
  if (lights) {
    lights.computeBoundingBox();
    bounds.union(lights.boundingBox!);
  }
  const size = bounds.getSize(new THREE.Vector3());
  const factor = 0.94 / Math.max(size.x, size.z, 0.94);
  const center = bounds.getCenter(new THREE.Vector3());
  for (const geometry of [solid, lights])
    if (geometry) {
      geometry.translate(-center.x, -bounds.min.y, -center.z);
      geometry.scale(factor, factor, factor);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
  const result = { solid, lights, kind };
  cache.set(key, result);
  return result;
}
