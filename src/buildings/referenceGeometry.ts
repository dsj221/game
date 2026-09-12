import * as THREE from 'three';
import type { Builder } from './modelGeometry.ts';
import { buildingIconKeys } from '../data/buildingIcons.ts';
import { pigments } from '../data/artDirection.ts';

type V=[number,number,number];
const wood=pigments.wood,goldWood=pigments.woodLight,darkWood=pigments.ink,iron='#505f70',stone=pigments.stone,mortar='#596369',leaf='#508621',cyan=pigments.water;
export const referenceKey=(type:string)=>buildingIconKeys[type]??type.replace(/^icon_/,'');

function blocks(b:Builder,w=.85,d=.75,y=.075){
  b.box([0,y/2,0],[w,y,d],mortar);
  for(const side of [-1,1])for(let i=0;i<5;i++)for(let row=0;row<2;row++){
    b.box([-w/2+(i+.5)*w/5,y*(.5+row),side*(d/2-.055)],[w/5-.006,y-.005,.12],(i+row)%2?stone:'#a0a5a4');
    b.box([side*(w/2-.055),y*(.5+row),-d/2+(i+.5)*d/5],[.12,y-.005,d/5-.006],(i+row)%2?'#788387':stone);
  }
}
function garden(b:Builder,x:number,z:number,s=.12,flower=false){
  for(let i=0;i<5;i++){const a=i*2.4;b.ball([x+Math.cos(a)*s*.5,.06+s*.45,z+Math.sin(a)*s*.5],[s*.36,s*.6,s*.3],i%2?'#73a52a':leaf);}
  if(flower){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;b.ball([x+Math.cos(a)*s*.23,.06+s,z+Math.sin(a)*s*.23],[s*.18,s*.1,s*.18],'#f4ebcd');}b.ball([x,.07+s,z],[s*.12,s*.1,s*.12],'#f0b52b');}
}
function greenery(b:Builder){for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a)*.42,z=Math.sin(a)*.38;if(z>.30&&Math.abs(x)<.20)continue;garden(b,x,z,.08+i%3*.018,i%4===0);}}
function plank(b:Builder,p:V,s:V,c=wood){
  b.box(p,s,c);
  if(s[0]>.15&&s[2]>.08)for(let i=0;i<3;i++)b.box([p[0],p[1]+s[1]/2+.001,p[2]+(i-1)*s[2]*.25],[s[0]*.7,.002,.003],i%2?'#b8742c':'#90501b');
}
function post(b:Builder,x:number,z:number,h=.75){
  b.box([x,h/2+.08,z],[.085,h,.085],wood);
  b.box([x,.08,z],[.14,.15,.14],stone);
  b.box([x+.043,h*.52,z],[.002,h*.7,.009],'#844618');
}
function lantern(b:Builder,x:number,y:number,z:number,s=1){
  b.box([x,y,z],[.115*s,.16*s,.115*s],'#ffae12',[0,0,0],true);
  for(const dx of [-1,1])for(const dz of [-1,1])b.box([x+dx*.06*s,y,z+dz*.06*s],[.018*s,.19*s,.018*s],darkWood);
  for(const dy of [-1,1])b.box([x,y+dy*.095*s,z],[.15*s,.028*s,.15*s],iron);
  b.beam([x,y+.11*s,z],[x,y+.22*s,z],.015*s,iron);
}
function chimney(b:Builder,x:number,z:number,y:number,h=.42){
  b.box([x,y+h/2,z],[.16,h,.17],mortar);
  const rows=Math.ceil(h/.085);
  for(let i=0;i<rows;i++)for(const side of [-1,1]){
    b.box([x,y+(i+.5)*h/rows,z+side*.078],[.17,h/rows-.006,.025],i%2?'#9ca2a5':'#879298');
    b.box([x+side*.078,y+(i+.5)*h/rows,z],[.025,h/rows-.006,.14],stone);
  }
  b.box([x,y+h+.005,z],[.19,.025,.2],stone);
  b.box([x,y+h+.019,z],[.12,.004,.13],'#25303a');
}
function hipRoof(b:Builder,y:number,w:number,d:number,c:string){
  const base=new THREE.Color(c);
  for(let row=0;row<4;row++){
    const t=row/4, sx=w*(1-t*.78),sz=d*(1-t*.78),yy=y+row*.09;
    // Four courses on all four faces; each tile has its own bevel and overlap.
    for(const side of [-1,1])for(let i=0;i<7-row;i++){
      const count=7-row,col=`#${base.clone().multiplyScalar(.9+(i%3)*.07).getHexString()}`;
      b.box([-sx/2+(i+.5)*sx/count,yy,side*sz/2],[sx/count-.003,.055,.19],col,[side*.42,0,0]);
      b.box([side*sx/2,yy,-sz/2+(i+.5)*sz/count],[.19,.055,sz/count-.003],col,[0,0,-side*.42]);
    }
  }
  b.box([0,y+.31,0],[w*.27,.1,d*.27],c);
}
function frameDoor(b:Builder,x:number,y:number,z:number,w=.24,h=.39){
  b.box([x,y+h/2,z],[w,h,.035],darkWood);
  for(let i=0;i<5;i++)b.box([x-w/2+(i+.5)*w/5,y+h/2,z+.026],[w/5-.003,h-.015,.025],i%2?wood:goldWood);
  for(const side of [-1,1])b.box([x+side*(w/2+.025),y+h/2,z+.015],[.05,h+.04,.07],wood);
  b.beam([x-w/2-.04,y+h,z+.035],[x,y+h+.08,z+.035],.06,goldWood);b.beam([x,y+h+.08,z+.035],[x+w/2+.04,y+h,z+.035],.06,goldWood);
  for(const yy of [.2,.75])b.box([x-w*.3,y+h*yy,z+.052],[w*.16,.026,.018],iron);
  b.ball([x+w*.3,y+h*.48,z+.058],[.019,.019,.014],iron);
  for(const yy of [.2,.75])for(const xx of [-.35,-.23])b.ball([x+w*xx,y+h*yy,z+.064],[.006,.006,.004],'#bdad80');
  b.box([x,y+.01,z+.055],[w+.035,.025,.09],'#c79959');
}
function window(b:Builder,x:number,y:number,z:number,side=false){
  b.box([x,y,z],side?[.025,.24,.21]:[.21,.24,.025],darkWood);
  b.box([x+(side?.018:0),y,z+(side?0:.018)],side?[.02,.19,.16]:[.16,.19,.02],'#ffc129',[0,0,0],true);
  b.box([x+(side?.034:0),y,z+(side?0:.034)],side?[.025,.024,.21]:[.21,.024,.025],wood);
  b.box([x+(side?.034:0),y,z+(side?0:.034)],side?[.025,.24,.024]:[.024,.24,.025],wood);
  for(const edge of [-1,1]){
    b.box([x+(side?.026:edge*.1),y,z+(side?edge*.10:.026)],side?[.034,.25,.027]:[.027,.25,.034],wood);
    b.box([x+(side?.026:0),y+edge*.12,z+(side?0:.026)],side?[.034,.028,.22]:[.22,.028,.034],wood);
  }
  // Projecting sill and individually slatted shutters, aligned to the wall face.
  const sign=side?(x<0?-1:1):(z<0?-1:1);
  const detail=(u:number,v:number,out:number,size:V,color:string)=>b.box(
    side?[x+sign*out,y+v,z+u]:[x+u,y+v,z+sign*out],
    side?[size[2],size[1],size[0]]:size,color);
  detail(0,-.145,.035,[.29,.045,.10],goldWood);
  for(const edge of [-1,1]){
    detail(edge*.145,0,.016,[.068,.235,.035],darkWood);
    for(let row=0;row<6;row++)detail(edge*.145,-.095+row*.038,.04,[.065,.029,.021],row%2?wood:goldWood);
    detail(edge*.145,-.065,.055,[.07,.013,.012],iron);
  }
}
function cottage(b:Builder,roof='#ffb51a'){
  blocks(b,.77,.68,.09);
  b.box([0,.40,0],[.66,.57,.57],'#eadbc2');
  const gable=new THREE.Shape();gable.moveTo(-.33,0);gable.lineTo(0,.245);gable.lineTo(.33,0);gable.closePath();
  b.add(new THREE.ExtrudeGeometry(gable,{depth:.57,bevelEnabled:false,steps:1}),[0,.685,-.285],[1,1,1],'#eadbc2');
  for(const x of [-.31,.31])for(const z of [-.285,.285])b.box([x,.43,z],[.105,.64,.105],wood);
  b.box([0,.69,.295],[.7,.08,.08],wood);b.box([0,.79,.295],[.085,.3,.075],wood);
  for(const side of [-1,1]){
    b.beam([side*.28,.70,.307],[side*.07,.91,.307],.035,darkWood);
    for(let i=0;i<3;i++)b.box([side*.319,.30+i*.11,.291],[.009,.055,.018],'#d3984c');
  }
  frameDoor(b,-.045,.12,.307);
  window(b,.337,.44,.025,true);window(b,0,.44,-.302);
  b.roof(.69,.93,.84,roof);chimney(b,.22,-.19,.85,.34);
  if(roof==='#ffb51a')for(let i=0;i<3;i++)b.add(new THREE.SphereGeometry(1,12,8),[.22+i*.032,1.22+i*.09,-.19-i*.026],[.065+i*.012,.073+i*.014,.068+i*.012],i%2?'#e5e4df':'#f1eee5');
  plank(b,[-.045,.105,.38],[.34,.06,.15],goldWood);
  b.box([-.045,.07,.43],[.40,.055,.16],'#929384');
  lantern(b,.265,.48,.37,.48);
  // Window herb box, rim and soil are geometry rather than a painted billboard.
  b.box([.385,.265,.025],[.12,.09,.27],wood);
  b.box([.385,.311,.025],[.10,.012,.24],'#503c25');
  for(const z of [-.085,.015,.11]){
    b.ball([.385,.345,z],[.035,.055,.035],'#608d35');
    b.ball([.405,.375,z],[.018,.015,.018],z<0?'#e4af54':'#ebd6af');
  }
  greenery(b);
}
function ring(b:Builder,r:number,y:number,h:number,color=stone,n=12){
  for(let i=0;i<n;i++){const a=i*Math.PI*2/n;b.box([Math.sin(a)*r,y,Math.cos(a)*r],[2*r*Math.tan(Math.PI/n)-.006,h,.11],i%3?color:'#a4aaa8',[0,a,0]);}
}
function water(b:Builder,r:number,y:number){b.cylinder([0,y,0],r,.025,'#08b9de');for(let i=0;i<3;i++){
  const g=new THREE.TorusGeometry(r*(.4+i*.21),.004,4,28);b.add(g,[0,y+.016,0],[1,1,1],'#91eeed',[-Math.PI/2,0,0]);
}}
function banner(b:Builder,x:number,y:number,z:number,color='#087f89'){
  b.box([x,y,z],[.17,.3,.018],color);b.box([x,y+.17,z],[.23,.025,.035],wood);
  b.add(new THREE.OctahedronGeometry(.045),[x,y,z+.02],[.65,1, .2],'#f0ead6');
}
function table(b:Builder,y=.4){for(const x of [-.32,.32])for(const z of [-.23,.23])post(b,x,z,y-.02);for(let i=0;i<5;i++)plank(b,[0,y,-.28+i*.14],[.85,.07,.13],i%2?wood:goldWood);}
function crate(b:Builder,x:number,y:number,z:number,s=.65){
  b.crate(x,y,z,s);
}
function kiln(b:Builder,bread=false){
  blocks(b,.86,.77,.07);
  if(bread){
    b.box([0,.36,0],[.65,.53,.57],mortar);
    for(const x of [-.27,.27])for(let row=0;row<5;row++)b.box([x,.13+row*.105,.295],[.12,.1,.1],row%2?stone:'#a4a9a4');
    for(let i=0;i<6;i++)plank(b,[-.4+i*.16,.67,0],[.152,.09,.78],i%2?wood:goldWood);
    chimney(b,.09,-.10,.70,.34);
    for(const z of [-.26,.26])post(b,.32,z,.56);
    for(let i=0;i<4;i++)b.box([.327,.35,-.21+i*.14],[.035,.5,.133],i%2?wood:goldWood);
    for(let i=0;i<3;i++){b.beam([.36,.15,-.15+i*.13],[.36,.53,-.15+i*.13],.022,wood);b.box([.36,.51,-.15+i*.13],[.035,.10,.08],iron);}
  }else{
    b.add(new THREE.SphereGeometry(.37,20,12,0,Math.PI*2,0,Math.PI/2),[0,.23,0],[1,1.05,1],'#d8a171');
    ring(b,.3,.19,.22,'#ad5233');chimney(b,0,-.05,.58,.17);
    for(let row=0;row<4;row++){const yy=.27+row*.073,r=Math.sqrt(Math.max(.001,.37*.37-(yy-.23)**2));ring(b,r,yy,.008,'#e4b788',20);}
  }
  b.box([0,.28,.315],[.28,.26,.04],'#3b2112');
  b.add(new THREE.SphereGeometry(.105,12,8),[0,.26,.34],[1,1.25,.1],'#ff9e05',[0,0,0],true);
  b.add(new THREE.ConeGeometry(.055,.17,8),[-.025,.26,.357],[1,1,.3],'#ffe96f',[0,0,0],true);
  for(let i=0;i<5;i++){const a=(i/4)*Math.PI;b.box([Math.cos(a)*.18,.32+Math.sin(a)*.17,.34],[.09,.13,.11],bread?stone:'#b9542e',[0,0,a-Math.PI/2]);}
  for(let i=0;i<5;i++){const x=-.32+(i%3)*.1,y=.09+Math.floor(i/3)*.09;b.cylinder([x,y,.39],.043,.18,wood,[Math.PI/2,0,0]);b.cylinder([x,y,.485],.034,.008,'#dba560',[Math.PI/2,0,0]);}
  crate(b,.34,0,.21,.20);garden(b,-.37,-.26,.1);
}

/** Authoring recipes follow the supplied icon, including deliberate shared artwork.
 * Hidden faces repeat the visible construction; no billboards or projected image planes. */
export function buildReference(key:string,b:Builder):boolean{
  switch(key){
    case 'orchard':{
      b.box([0,.03,0],[.92,.06,.87],'#866039');for(const z of [-.43,.43])b.fence(z);
      for(const x of [-.22,.22]){b.tree(x,0,.63);for(let i=0;i<7;i++){const a=i*2.4;b.ball([x+Math.cos(a)*.15,.5+Math.sin(i)*.07,Math.sin(a)*.15],[.035,.039,.035],'#d4421f');}}crate(b,.22,.03,.30,.17);break;
    }
    case 'tea_house':{
      buildReference('gazebo',b);b.cylinder([0,.40,.15],.09,.12,'#e6d5aa');b.cylinder([0,.465,.15],.065,.012,'#574827');b.beam([.075,.39,.15],[.12,.39,.15],.03,'#e6d5aa');break;
    }
    case 'library':{
      cottage(b,'#527e8d');b.box([0,.38,.41],[.48,.37,.13],wood);
      for(let row=0;row<2;row++)for(let i=0;i<8;i++)b.box([-.20+i*.055,.29+row*.16,.48],[.044,.125,.07],['#a33f36','#387a84','#cfa64e'][i%3]);break;
    }
    case 'pottery':{kiln(b);for(let i=0;i<3;i++)b.cylinder([-.25+i*.15,.16,-.28],.055,.22,'#bf7b51',[0,0,0],.036);break;}
    case 'thatched_cottage':cottage(b);break;
    case 'crate':crate(b,0,0,0,.78);break;
    case 'wood_fired_oven':kiln(b,true);break;
    case 'clay_kiln':kiln(b);break;
    case 'market_stall':{
      for(const x of [-.35,.35])for(const z of [-.28,.28])post(b,x,z,.70);
      for(let i=0;i<7;i++){const x=-.42+i*.14;b.box([x,.85,0],[.139,.055,.83],i%2?'#fff0d7':'#f03925',[.11,0,0]);b.box([x,.75,.416],[.139,.17,.045],i%2?'#fff0d7':'#e93220');}
      for(let i=0;i<7;i++)b.box([-.33+i*.11,.24,.3],[.105,.3,.075],i%2?goldWood:wood);
      for(const x of [-.37,.37])b.box([x,.25,0],[.065,.32,.66],wood);
      plank(b,[0,.40,.28],[.83,.055,.15]);
      for(let tray=0;tray<3;tray++)for(let i=0;i<12;i++)b.ball([-.25+tray*.25+(i%3-1)*.065,.46+Math.floor(i/6)*.045,-.11+Math.floor(i/3)%2*.16],[.045,.045,.045],['#d7300c','#efbe07','#50920c'][tray]);
      b.box([.24,.18,.43],[.19,.28,.025],goldWood,[-.22,0,0]);b.box([.24,.19,.45],[.145,.21,.012],'#28434b',[-.22,0,0]);for(let i=0;i<4;i++)b.box([.24,.13+i*.04,.479],[.09-i%2*.03,.009,.005],'#c9d9cf');break;
    }
    case 'workshop_stall':{
      for(const x of [-.33,.33])for(const z of [-.26,.26])post(b,x,z,.77);b.roof(.83,.91,.8,'#008a93');table(b,.42);
      b.cylinder([-.14,.52,0],.08,.15,'#c29a28');b.cylinder([.10,.5,.05],.065,.11,iron);b.box([.10,.59,.05],[.11,.07,.07],iron);
      lantern(b,-.4,.60,.28,.7);crate(b,-.28,0,.36,.2);b.box([.33,.10,.34],[.22,.12,.2],iron);break;
    }
    case 'vegetable_garden':case 'carrot_patch':{
      b.box([0,.035,0],[.91,.07,.85],'#704019');
      for(let row=0;row<3;row++)b.box([0,.07,-.24+row*.24],[.8,.035,.14],'#915a22');
      for(const z of [-.43,.43])b.fence(z);
      for(const x of [-.43,.43])for(const y of [.12,.29])b.box([x,y,0],[.045,.055,.87],wood);
      for(let row=0;row<3;row++)for(let col=0;col<4;col++){
        const x=-.29+col*.19,z=-.25+row*.24;
        for(let j=0;j<5;j++){const a=j*1.256;b.ball([x+Math.cos(a)*.035,.16,z+Math.sin(a)*.035],[.032,.05,.026],j%2?'#429514':'#207415');}
        if(key==='carrot_patch')b.cylinder([x,.135,z],.024,.13,'#ef7213',[0,0,.12],.035);
        else if(row!==2)for(const dx of [-.03,.03])b.ball([x+dx,.14,z+.025],[.03,.035,.03],'#d42b12');
        else b.ball([x,.15,z],[.065,.056,.06],'#69a617');
      }break;
    }
    case 'flower_planter':{
      for(let row=0;row<3;row++)for(const z of [-.24,.24])plank(b,[0,.06+row*.09,z],[.8,.082,.055]);for(const x of [-.39,.39])b.box([x,.15,0],[.05,.3,.5],wood);
      b.box([0,.22,0],[.7,.04,.44],'#613714');
      for(let i=0;i<10;i++){const x=-.28+i%4*.18,z=-.12+Math.floor(i/4)*.12,y=.36+(i%3)*.10;garden(b,x,z,.10);b.beam([x,.25,z],[x,y,z],.014,leaf);for(let j=0;j<6;j++){const a=j*Math.PI/3;b.ball([x+Math.cos(a)*.045,y,z+Math.sin(a)*.045],[.033,.019,.027],['#f5eee0','#dd4d54','#eeb615'][i%3]);}b.ball([x,y+.012,z],[.022,.018,.022],'#e9b325');}break;
    }
    case 'carpenter_workbench':{
      table(b,.46);plank(b,[0,.15,0],[.7,.055,.48]);b.box([.25,.46,.16],[.17,.2,.16],iron);b.beam([.17,.37,.23],[.38,.37,.23],.035,iron);
      b.box([-.13,.52,0],[.30,.02,.095],stone,[0,.2,0]);for(let i=0;i<9;i++)b.add(new THREE.ConeGeometry(.018,.03,3),[-.25+i*.03,.52,.065],[1,1,.3],stone,[0,0,Math.PI]);
      b.beam([-.2,.52,-.22],[0,.52,-.22],.038,wood);b.box([-.20,.55,-.22],[.075,.07,.17],iron);crate(b,.1,0,.1,.19);break;
    }
    case 'blacksmith_forge':{
      blocks(b,.86,.73);b.box([0,.35,0],[.62,.56,.56],mortar);
      for(let row=0;row<5;row++)for(const x of [-.25,.25])b.box([x,.13+row*.105,.28],[.12,.10,.12],stone);
      for(let i=0;i<5;i++)for(let j=0;j<4;j++)b.box([-.32+i*.16,.68,-.27+j*.18],[.153,.09,.173],iron);
      b.box([0,.31,.295],[.32,.34,.035],'#2f211c');b.ball([0,.28,.32],[.12,.15,.022],'#ed6410');b.add(new THREE.ConeGeometry(.065,.23,9),[0,.29,.35],[1,1,.3],'#ffcb16',[0,0,0],true);
      chimney(b,.20,-.15,.70,.42);
      b.box([-.23,.15,.40],[.20,.13,.15],iron);b.box([-.23,.25,.40],[.29,.065,.18],iron);b.box([-.23,.07,.40],[.24,.055,.19],iron);
      for(let i=0;i<3;i++){b.beam([.36,.08,-.15+i*.13],[.36,.5,-.15+i*.13],.025,wood);b.box([.36,.48,-.15+i*.13],[.07,.075,.08],iron);}break;
    }
    case 'steam_machine':{
      blocks(b,.85,.70);b.box([-.04,.40,0],[.53,.6,.48],iron);
      for(const x of [-.27,.19])for(const y of [.16,.38,.65])b.ball([x,y,.25],[.018,.018,.01],'#b7c1c2');
      b.cylinder([.31,.28,.02],.23,.09,'#c27b09',[0,0,Math.PI/2]);b.cylinder([.37,.28,.02],.155,.015,'#775022',[0,0,Math.PI/2]);b.cylinder([.40,.28,.02],.074,.07,'#d49419',[0,0,Math.PI/2]);
      b.cylinder([-.07,.53,.26],.11,.025,'#d4a145',[Math.PI/2,0,0]);b.cylinder([-.07,.53,.28],.08,.008,'#eee1c0',[Math.PI/2,0,0]);b.beam([-.07,.53,.29],[-.11,.58,.29],.01,iron);
      b.beam([-.24,.61,-.12],[-.24,.94,-.12],.09,'#bf640f');b.beam([-.24,.94,-.12],[.17,.94,-.12],.09,'#bf640f');b.beam([.17,.94,-.12],[.17,.71,-.12],.09,'#bf640f');
      for(const x of [-.24,.17])b.cylinder([x,.75,-.12],.071,.045,'#efa132');b.cylinder([.1,.84,.11],.055,.23,iron);break;
    }
    case 'greenhouse':{
      blocks(b,.82,.77);b.box([0,.39,0],[.71,.55,.64],'#53a7aa');
      for(const x of [-.34,.34])for(const z of [-.31,.31])post(b,x,z,.62);
      // Pale glass panes with inset silhouettes give thickness without hiding frames.
      for(const side of [-1,1])for(let i=0;i<4;i++){
        b.box([-.26+i*.175,.4,side*.329],[.158,.45,.016],'#a7d5cf');b.box([side*.367,.4,-.25+i*.17],[.016,.45,.152],'#93c8c3');
        b.ball([-.26+i*.175,.25,side*.34],[.045,.10,.007],leaf);b.box([-.26+i*.175,.42,side*.344],[.012,.46,.014],'#e9ecd5');
      }
      const slope=Math.atan2(.30,.39);for(const side of [-1,1]){
        b.box([side*.195,.83,0],[.492,.025,.75],'#a8ded8',[0,0,-side*slope]);
        for(let i=0;i<5;i++)b.beam([side*.4,.68,-.36+i*.18],[0,.99,-.36+i*.18],.025,'#f0e3c3');
      }for(const z of [-.37,.37]){b.beam([-.4,.68,z],[0,.99,z],.035,wood);b.beam([0,.99,z],[.4,.68,z],.035,wood);}greenery(b);break;
    }
    case 'signpost':{
      blocks(b,.3,.3);post(b,0,0,.85);
      for(let i=0;i<3;i++){const side=i%2?1:-1;b.box([side*.10,.42+i*.19,0],[.44,.12,.055],goldWood);b.add(new THREE.ConeGeometry(.085,.12,3),[side*.37,.42+i*.19,0],[1,1,.4],goldWood,[0,0,-side*Math.PI/2]);}
      lantern(b,.22,.30,.05,.55);greenery(b);break;
    }
    case 'arched_bridge':{
      for(let i=0;i<11;i++){const z=-.43+i*.086,y=.10+Math.sin(i/10*Math.PI)*.16;plank(b,[0,y,z],[.70,.065,.08]);for(const x of [-.33,.33]){if(i%5===0)post(b,x,z,y+.25);if(i<10)b.beam([x,y+.25,z],[x,.35+Math.sin((i+1)/10*Math.PI)*.16,z+.086],.055,goldWood);}}
      for(const z of [-.44,.44])for(const x of [-.34,.34])b.box([x,.075,z],[.17,.15,.19],stone);break;
    }
    case 'village_gate':{
      for(const x of [-.33,.33]){post(b,x,0,.75);for(let row=0;row<3;row++)b.box([x,.09+row*.1,0],[.19,.094,.21],stone);}
      frameDoor(b,0,.08,.04,.43,.53);b.roof(.76,.92,.51,'#008d96');chimney(b,.30,-.10,.86,.28);lantern(b,-.41,.56,.12,.65);banner(b,.44,.43,.05);greenery(b);break;
    }
    case 'magic_portal':{
      blocks(b,.90,.56);for(const x of [-.29,.29])for(let i=0;i<6;i++)b.box([x,.18+i*.14,0],[.19,.135,.25],i%2?'#68726c':'#828a7e');
      for(let i=0;i<5;i++){const a=i*Math.PI/4;b.box([Math.cos(a)*.29,.86+Math.sin(a)*.22,0],[.19,.16,.26],stone,[0,0,a-Math.PI/2]);}
      b.box([0,.56,0],[.41,.78,.03],'#9023ce',[0,0,0],true);
      for(let i=0;i<3;i++)b.add(new THREE.TorusGeometry(.1+i*.055,.006,5,40),[0,.57,.025],[1,1.6,1],i%2?'#d986ff':'#eeceff');
      greenery(b);break;
    }
    case 'shrine':{
      blocks(b,.75,.67);b.box([0,.37,0],[.49,.49,.43],'#b55721');for(const x of [-.25,.25])for(const z of [-.23,.23])post(b,x,z,.55);window(b,0,.40,.23);window(b,.26,.40,0,true);
      b.roof(.66,.88,.78,'#008f95');for(const x of [-.42,.42])b.box([x,.70,0],[.13,.14,.79],'#00838b');for(const x of [-.34,.34])lantern(b,x,.46,.27,.65);
      for(let i=0;i<3;i++)b.box([0,.04+i*.045,.41-i*.05],[.39,.045,.15],stone);greenery(b);break;
    }
    case 'water_tower':{
      for(const x of [-.25,.25])for(const z of [-.25,.25]){post(b,x,z,.55);b.box([x,.05,z],[.18,.1,.18],stone);}
      for(const z of [-.25,.25]){b.beam([-.25,.1,z],[.25,.55,z],.06);b.beam([.25,.1,z],[-.25,.55,z],.06);}
      b.cylinder([0,.79,0],.33,.53,'#138fca');for(let i=0;i<18;i++){const a=i*Math.PI/9;b.beam([Math.sin(a)*.335,.53,Math.cos(a)*.335],[Math.sin(a)*.335,1.05,Math.cos(a)*.335],.014,wood);}
      for(const y of [.57,1.02])ring(b,.33,y,.045,wood,18);water(b,.28,1.045);
      for(const x of [.25,.37])b.beam([x,.02,.40],[x,.87,.23],.027,wood);for(let i=0;i<8;i++)b.beam([.25,.07+i*.10,.39-i*.02],[.37,.07+i*.10,.39-i*.02],.023,wood);break;
    }
    case 'hay_shed':{
      for(const x of [-.33,.33])for(const z of [-.26,.26])post(b,x,z,.66);b.roof(.76,.95,.79,'#eab025');
      for(let i=0;i<5;i++){const x=-.23+i%3*.22,y=.17+Math.floor(i/3)*.25;b.box([x,y,0],[.21,.24,.39],'#e9ac1b');for(const z of [-.11,.11])b.box([x,y,z],[.217,.245,.015],'#a77715');}greenery(b);break;
    }
    case 'lantern_post':{
      blocks(b,.30,.30);post(b,-.09,0,.98);plank(b,[.11,.89,0],[.46,.085,.085]);b.box([.31,.87,0],[.1,.11,.1],iron);lantern(b,.30,.66,0);greenery(b);break;
    }
    case 'log_pile':{
      for(let i=0;i<3;i++){const x=-.26+i%2*.19,y=.10+Math.floor(i/2)*.17;b.cylinder([x,y,-.06],.09,.64,'#96511f',[Math.PI/2,0,0]);b.cylinder([x,y,.265],.078,.01,'#d9a35f',[Math.PI/2,0,0]);for(let r=1;r<4;r++)b.add(new THREE.TorusGeometry(r*.019,.002,3,16),[x,y,.272],[1,1,1],'#915421');}
      for(let i=0;i<8;i++)plank(b,[.14+(i%2)*.12,.035+Math.floor(i/2)*.07,-.03],[.115,.065,.56],i%2?goldWood:wood);
      b.cylinder([.25,.11,.36],.095,.22,wood);b.box([.25,.24,.36],[.09,.08,.04],iron,[0,0,-.4]);b.beam([.25,.24,.36],[.34,.37,.36],.024,wood);break;
    }
    case 'water_shrine_tower':{
      blocks(b,.63,.59);for(let row=0;row<7;row++)for(const x of [-.19,.19])b.box([x,.16+row*.12,0],[.36,.115,.43],row%2?stone:'#7c888d');
      hipRoof(b,.99,.72,.68,'#a35a23');banner(b,0,.64,.23);lantern(b,-.30,.79,0,.6);lantern(b,.30,.79,0,.6);
      b.box([.24,.40,.02],[.025,.72,.07],cyan);b.box([.29,.04,.02],[.27,.025,.25],cyan);greenery(b);break;
    }
    case 'gazebo':case 'market_pavilion':{
      blocks(b,.87,.79);for(const x of [-.31,.31])for(const z of [-.29,.29])post(b,x,z,.65);
      hipRoof(b,.81,.83,.80,key==='gazebo'?'#008b95':'#cf382b');
      if(key==='gazebo'){plank(b,[0,.26,0],[.52,.065,.48]);for(const x of [-.22,.22])b.box([x,.16,0],[.055,.27,.38]);}
      else{plank(b,[0,.32,.18],[.64,.08,.21]);for(const x of [-.21,0,.21])b.cylinder([x,.43,.16],.047,.13,['#1399aa','#d47f24','#bd4523'][Math.round((x+.21)/.21)]);banner(b,-.33,.65,.29);banner(b,.33,.65,.29);}
      for(const x of [-.28,.28])lantern(b,x,.62,-.28,.6);greenery(b);break;
    }
    case 'central_fountain':{
      blocks(b,.88,.85);ring(b,.37,.17,.22);water(b,.32,.17);
      b.cylinder([0,.38,0],.08,.42,stone);ring(b,.20,.49,.09);water(b,.16,.50);b.cylinder([0,.64,0],.05,.27,stone);ring(b,.1,.78,.07);water(b,.065,.79);
      for(let i=0;i<4;i++){const a=i*Math.PI/2;b.beam([Math.sin(a)*.19,.51,Math.cos(a)*.19],[Math.sin(a)*.24,.19,Math.cos(a)*.24],.018,cyan);}greenery(b);break;
    }
    case 'windmill':{
      blocks(b,.72,.65);b.box([0,.48,0],[.50,.68,.49],'#e7d7b8');for(const x of [-.24,.24])b.box([x,.46,.25],[.06,.68,.065],wood);frameDoor(b,0,.12,.27,.17,.32);b.roof(.82,.67,.62,'#a35122');greenery(b);break;
    }
    case 'tool_shop':{
      cottage(b,'#008a93');b.box([-.07,.49,.43],[.53,.045,.23],'#f2daaa',[.17,0,0]);banner(b,.43,.45,.03,'#915b1d');b.beam([.38,.45,.053],[.48,.52,.053],.025,'#efc45c');crate(b,.32,0,.34,.19);break;
    }
    case 'camp_tent':{
      // Sagging ridge tent, with an open triangular doorway and guy ropes.
      for(const side of [-1,1]){
        const points:number[]=[],indices:number[]=[];
        for(let j=0;j<=8;j++)for(let i=0;i<=8;i++){const t=i/8,z=-.33+j*.0825;points.push(side*(.025+t*.34),.17+(1-t)*.51-Math.sin(t*Math.PI)*.09-Math.sin(j/8*Math.PI)*.075,z);}
        for(let j=0;j<8;j++)for(let i=0;i<8;i++){const a=j*9+i;if(side>0)indices.push(a,a+9,a+1,a+1,a+9,a+10);else indices.push(a,a+1,a+9,a+1,a+10,a+9);}
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();b.add(g,[0,0,0],[1,1,1],'#e6c58d');
        for(const z of [-.33,.33]){b.beam([side*.025,.68,z],[side*.43,.025,z+.04],.018,wood);post(b,side*.34,z,.28);}
      }
      b.box([0,.03,0],[.72,.06,.67],wood);crate(b,.29,0,.39,.16);lantern(b,-.25,.16,.38,.65);b.cylinder([.39,.11,0],.08,.18,'#65757c',[Math.PI/2,0,0]);break;
    }
    case 'wooden_crane':{
      blocks(b,.83,.7);post(b,-.22,0,.89);plank(b,[.08,.89,0],[.78,.11,.12]);b.beam([-.22,.30,0],[.35,.84,0],.07,wood);b.box([.43,.88,0],[.10,.14,.16],iron);
      b.beam([.42,.85,0],[.42,.48,0],.019,iron);for(const z of [-.12,.12])b.beam([.42,.5,0],[.42,.31,z],.018,wood);
      b.box([.42,.23,0],[.27,.18,.29],stone);crate(b,-.16,.09,.20,.24);break;
    }
    case 'vine_pergola':{
      for(const x of [-.30,.30])for(const z of [-.29,.29]){post(b,x,z,.70);for(let i=0;i<7;i++){const a=i*2.4;garden(b,x+Math.cos(a)*.05,z+Math.sin(a)*.05,.06);b.ball([x+Math.cos(a)*.055,.18+i*.075,z+Math.sin(a)*.055],[.047,.06,.04],leaf);}}
      for(let i=0;i<5;i++)plank(b,[-.36+i*.18,.83,0],[.065,.055,.83]);for(const z of [-.29,.29])b.box([0,.79,z],[.85,.07,.075],wood);
      for(let i=0;i<10;i++){const x=-.32+i%5*.16,z=i<5?-.27:.27;garden(b,x,z,.08);b.ball([x,.86,z],[.1,.035,.1],'#609522');for(let j=0;j<6;j++)b.ball([x+(j%2)*.028,.73-Math.floor(j/2)*.036,z],[.025,.026,.025],'#7d32aa');}break;
    }
    case 'mine_entrance':{
      for(let i=0;i<9;i++){const a=i*Math.PI/8;b.ball([Math.cos(a)*.33,.14+Math.sin(a)*.58,-.07],[.16,.17,.2],i%2?'#929799':'#727e87');}
      b.box([0,.32,-.10],[.44,.57,.04],'#17232c');for(const x of [-.25,.25])post(b,x,.12,.60);b.box([0,.70,.12],[.64,.1,.14],wood);
      for(const x of [-.13,.13])b.box([x,.04,.24],[.022,.03,.57],iron);for(let i=0;i<5;i++)b.box([0,.03,-.02+i*.11],[.39,.035,.033],wood);
      b.box([0,.17,.23],[.25,.18,.22],iron);b.box([0,.26,.23],[.20,.008,.17],'#28363e');lantern(b,-.22,.45,.21,.6);crate(b,.36,0,.16,.16);greenery(b);break;
    }
    case 'birdhouse':{
      blocks(b,.28,.28);post(b,0,0,.64);b.box([0,.79,0],[.29,.30,.27],goldWood);b.roof(.94,.44,.39,'#008b98');b.cylinder([0,.82,.144],.045,.012,'#382517',[Math.PI/2,0,0]);plank(b,[0,.65,.08],[.4,.045,.38]);
      b.ball([.18,.75,.11],[.07,.06,.04],'#1689d2');b.ball([.17,.80,.11],[.045,.045,.038],'#36a5dc');b.ball([.15,.80,.145],[.02,.025,.012],'#f5e4c6');b.ball([.15,.805,.157],[.008,.01,.005],'#152d37');greenery(b);break;
    }
    case 'crystal_pool':{
      blocks(b,.89,.79);water(b,.30,.11);for(const z of [-.30,.30])for(let i=0;i<5;i++)b.box([-.32+i*.16,.16,z],[.154,.16,.11],stone);for(const x of [-.38,.38])b.box([x,.16,0],[.11,.16,.61],stone);
      for(const x of [-.31,.31]){b.box([x,.48,-.28],[.12,.54,.14],stone);b.box([x,.72,-.28],[.14,.035,.15],'#dcae3a');b.add(new THREE.OctahedronGeometry(.06),[x,.49,-.2],[.6,1.8,.2],cyan);}
      b.add(new THREE.OctahedronGeometry(.16),[0,.74,0],[.65,1.6,.65],cyan);b.beam([0,.12,0],[0,.51,0],.014,cyan);greenery(b);break;
    }
    case 'crystal_obelisk':{
      blocks(b,.66,.60);b.box([0,.20,0],[.44,.19,.4],stone);b.cylinder([0,.70,0],.23,.86,stone,[0,Math.PI/4,0],.16);
      b.add(new THREE.ConeGeometry(.225,.27,4),[0,1.26,0],[1,1,1],'#a0a7aa',[0,Math.PI/4,0]);b.add(new THREE.OctahedronGeometry(.105),[0,.74,.22],[.6,1.5,.22],cyan);
      for(const x of [-.27,.27])b.add(new THREE.OctahedronGeometry(.09),[x,.3,.12],[.6,1.6,.6],cyan);greenery(b);break;
    }
    default:return false;
  }
  return true;
}
