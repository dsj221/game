import * as THREE from 'three';
import type {Builder} from './modelGeometry.ts';
type V=[number,number,number];

function leafGeometry(){
 const ring:V[]=[[0,0,-.06],[-.023,0,-.037],[-.034,0,-.012],[-.031,0,.020],[-.017,-.003,.046],[0,-.008,.065],[.017,-.003,.046],[.031,0,.020],[.034,0,-.012],[.023,0,-.037]];
 const vertices:number[]=[];
 for(let i=0;i<ring.length;i++)vertices.push(0,.008,0,...ring[i],...ring[(i+1)%ring.length],0,-.003,0,...ring[(i+1)%ring.length],...ring[i]);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}
// Closed, pointed leaves: visible from below and preserved in GLB exports.
const leaf=leafGeometry();
export function detailedTree(b:Builder,x:number,z:number,scale:number,red:boolean){
 const p=(v:V):V=>[x+v[0]*scale,v[1]*scale,z+v[2]*scale];
 const branch=(points:V[],radii:number[])=>{
  const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...p(v)))),segments=12,sides=12,frames=curve.computeFrenetFrames(segments,false),vertices:number[]=[],indices:number[]=[];
  for(let row=0;row<=segments;row++){
   const t=row/segments,center=curve.getPointAt(t),u=t*(radii.length-1),i=Math.min(radii.length-2,Math.floor(u)),radius=THREE.MathUtils.lerp(radii[i],radii[i+1],u-i)*scale;
   for(let side=0;side<=sides;side++){
    const a=side/sides*Math.PI*2,rr=radius*(1+.08*Math.sin(a*5+t*4));
    const v=center.clone().addScaledVector(frames.normals[row],Math.cos(a)*rr).addScaledVector(frames.binormals[row],Math.sin(a)*rr);vertices.push(v.x,v.y,v.z);
    if(row<segments&&side<sides){const k=row*(sides+1)+side;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
   }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
  b.add(g,[0,0,0],[1,1,1],'#926332');
  const stripes=scale<.8?3:6;
  for(let stripe=0;stripe<stripes;stripe++){
   const path:THREE.Vector3[]=[];
   for(let row=0;row<=segments;row++){
    const t=row/segments,u=t*(radii.length-1),i=Math.min(radii.length-2,Math.floor(u)),a=stripe*Math.PI*2/stripes+.08*Math.sin(t*5),radius=THREE.MathUtils.lerp(radii[i],radii[i+1],u-i)*scale*(1+.08*Math.sin(a*5+t*4));
    path.push(curve.getPointAt(t).addScaledVector(frames.normals[row],Math.cos(a)*radius).addScaledVector(frames.binormals[row],Math.sin(a)*radius));
   }
   b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),12,.0035*scale,3,false),[0,0,0],[1,1,1],stripe%2?'#ad8145':'#705027');
  }
 };
 branch([[0,.07,0],[-.035,.28,.015],[.035,.52,0],[-.025,.79,-.015],[.04,1.08,0]],[.12,.095,.075,.047,.012]);
 for(let i=0;i<7;i++){
  const a=i*Math.PI*2/7;
  branch([[Math.cos(a)*.27,.025,Math.sin(a)*.25],[Math.cos(a)*.14,.07,Math.sin(a)*.12],[0,.23,0]],[.018,.044,.065]);
 }
 const crowns:V[]=[[-.27,.73,.12],[.26,.75,.14],[-.22,.83,-.19],[.23,.84,-.20],[0,.88,.25],[-.16,1.02,.02],[.16,1.03,.02],[0,1.03,-.19],[0,1.19,0]];
 crowns.forEach((center,k)=>{
  branch([[.015,.39,0],[center[0]*.68,center[1]-.22,center[2]*.7],center],[.052,.03,.012]);
  b.ball(p(center),[.18*scale,.14*scale,.18*scale],red?'#873e46':'#405e26');
  const leafCount=scale<.8?56:92;
  for(let i=0;i<leafCount;i++){
   const yy=1-2*(i+.5)/leafCount,a=i*2.399963+k*.7,rad=Math.sqrt(1-yy*yy);
   const v:V=[center[0]+Math.cos(a)*rad*.19,center[1]+yy*.15,center[2]+Math.sin(a)*rad*.19];
   const palette=red?['#9e4d4c','#c47556','#d9916c','#ae5d55']:['#537a28','#648932','#80a23b','#97ad43','#466d29'];
   const color=palette[(i+k+(yy>.3?2:0))%palette.length];
   const size=scale*(.85+(i%4)*.12);
   b.add(leaf.clone(),p(v),[size,size,size],color,[Math.acos(yy)*.8,a,.20*Math.sin(i)]);
  }
 });
 // Bark knot and moss tufts around roots; keep the trunk visible.
 b.add(new THREE.TorusGeometry(.025,.006,4,12),p([-.03,.30,.095]),[scale,scale,scale],'#bd8d4c');
 for(let i=0;i<20;i++){
  const a=i*2.4,r=.11+(i%3)*.035;
  b.add(leaf.clone(),p([Math.cos(a)*r,.025,Math.sin(a)*r]),[scale*.55,scale*.55,scale*.55],red?'#af7451':'#6d8734',[0,a,.25]);
 }
}

export function detailedCrate(b:Builder,x:number,y:number,z:number,s:number){
 const wood=['#af6d2b','#bd7b32','#c7893d','#b87830'],metal='#536574';
 const box=(p:V,size:V,color:string)=>b.box([x+p[0]*s,y+p[1]*s,z+p[2]*s],size.map(n=>n*s) as V,color);
 box([0,.5,0],[.94,.94,.94],'#5f3a1d');
 // Separate front, back, side and lid boards, with real recessed joints.
 for(let i=0;i<5;i++){
  const u=-.4+i*.2;
  for(const side of [-1,1]){
   box([u,.5,side*.475],[.19,.94,.055],wood[i%4]);
   box([side*.475,.5,u],[.055,.94,.19],wood[(i+1)%4]);
   for(let j=0;j<2;j++){
    box([u-.055+j*.08,.45+j*.10,side*.505],[.007,.48-j*.1,.004],j?'#d39952':'#986024');
    box([side*.505,.45+j*.10,u-.055+j*.08],[.004,.48-j*.1,.007],j?'#d39952':'#986024');
   }
  }
  box([u,.985,0],[.19,.05,.94],wood[(i+2)%4]);
  for(let j=0;j<2;j++)box([u-.05+j*.085,1.013,0],[.007,.004,.62-j*.15],j?'#dca057':'#986024');
 }
 for(const side of [-1,1]){
  for(const h of [.09,.91]){
   box([0,h,side*.515],[1.04,.16,.105],'#c68a41');
   box([side*.515,h,0],[.105,.16,1.04],'#c68a41');
  }
  for(const u of [-.43,.43]){
   box([u,.5,side*.52],[.14,1,.105],'#c68a41');
   box([side*.52,.5,u],[.105,1,.14],'#b98038');
  }
  b.beam([x-.34*s,y+.18*s,z+side*.515*s],[x+.34*s,y+.82*s,z+side*.515*s],.125*s,'#c0873d');
  b.beam([x+side*.515*s,y+.18*s,z-.34*s],[x+side*.515*s,y+.82*s,z+.34*s],.125*s,'#b98038');
 }
 // L-shaped steel caps wrap every corner, not just the camera-facing surface.
 for(const sx of [-1,1])for(const sz of [-1,1])for(const top of [false,true]){
  const h=top?.91:.09;
  box([sx*.44,h,sz*.577],[.22,.22,.04],metal);
  box([sx*.577,h,sz*.44],[.04,.22,.22],metal);
  box([sx*.44,top?1.022:-.015,sz*.44],[.22,.035,.22],metal);
  b.ball([x+sx*.44*s,y+h*s,z+sz*.606*s],[.027*s,.027*s,.014*s],'#b6c0c3');
  b.ball([x+sx*.606*s,y+h*s,z+sz*.44*s],[.014*s,.027*s,.027*s],'#b6c0c3');
  if(top)b.ball([x+sx*.44*s,y+1.055*s,z+sz*.44*s],[.025*s,.012*s,.025*s],'#b6c0c3');
 }
}
