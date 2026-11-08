// Deterministic, engine-independent rules. Distances are in paper pixels; y is up.
import {DETAILS,GHOST_BRIDGES,PROOF_PLATES} from './details.js';
import {MARGINS,UPGRADES,hasUpgrade,cryCooldown,cryRange,stunDuration,bellPositions,echoCry,disrupt,marginTick,newCheckpoint} from './margins.js';
import {AFTERWORD,createAfterword,afterwordCry,afterwordTick,afterwordContext,afterwordInteract,restoreAfterword} from './afterword.js';
export {DETAILS,GHOST_BRIDGES,PROOF_PLATES};
export {MARGINS,UPGRADES,hasUpgrade,cryCooldown,cryRange,bellPositions};
export {availableInk,buyUpgrade} from './margins.js';
export {AFTERWORD,chooseHeadline,seedsInBag,valveWindow,morningObjective} from './afterword.js';
export const CHAPTERS = [
  { title:'The Empty Nursery',number:'I',deck:'A city stopped making room for tomorrow.',word:'NURSERY',length:3150,
    intro:'They printed that you would be the last. Nobody thought to ask you.',correction:'An empty cradle is not an empty future.',
    platforms:[[380,72,180],[570,145,175],[1030,80,200],[1250,155,180],[1690,90,190],[1920,155,190],[2400,85,180],[2630,145,160]],
    letters:[{x:640,y:193,id:0},{x:2000,y:202,id:1}],ink:[[820,150],[1470,145],[2180,150]],
    enemies:[{x:1140,range:105,speed:1.25},{x:2540,range:120,speed:1.5}],presses:[],barriers:[1590],
    memories:[{x:300,text:'One small voice. An inconvenient amount of possibility.'},{x:1480,text:'CRY in the air for a second lift. Hold JUMP to glide.'},{x:2640,text:'The future has not consented to this headline.'}] },
  { title:'The Forecast Factory',number:'II',deck:'Certainty is manufactured here. In very large quantities.',word:'FACTORY',length:3370,
    intro:'The machines turn assumptions into facts. The facts turn back into machines.',correction:'A forecast is a question dressed as an answer.',
    platforms:[[340,75,170],[560,150,180],[1010,80,190],[1240,155,180],[1730,80,180],[1940,150,180],[2470,75,170],[2690,150,170]],
    letters:[{x:1300,y:203,id:2},{x:2760,y:198,id:3}],ink:[[790,135],[1470,150],[2230,140]],
    enemies:[{x:1090,range:135,speed:1.5},{x:2530,range:110,speed:1.7}],
    presses:[{x:440,phase:0},{x:1810,phase:1.5},{x:3010,phase:2.4}],barriers:[1610],
    memories:[{x:260,text:'Speak to the apprentice. The straight line was never the whole story.'},{x:1600,text:'CRY near a censor. Even certainty needs a moment to recover.'},{x:3000,text:'Please keep all doubts outside the machinery.'}] },
  { title:"Tomorrow's Press",number:'III',deck:'The end of the world is going to print. Unless you edit it.',word:'TOMORROW',length:4120,
    intro:'One edition left. Five stolen letters. A very small editor.',correction:'There is no last page. Only the next one.',
    platforms:[[300,70,170],[510,145,175],[980,80,180],[1190,155,170],[1670,80,180],[1890,150,180],[2360,75,160],[2570,150,180],[3470,55,130],[3750,110,150]],
    letters:[{x:2630,y:202,id:4}],ink:[[740,155],[1440,145],[2160,140],[2830,145]],
    enemies:[{x:1040,range:100,speed:1.7},{x:2440,range:100,speed:1.7}],presses:[{x:1760,phase:.7}],barriers:[1570],
    memories:[{x:260,text:'They called your ears a warning. You made them wings.'},{x:1550,text:'The world becomes smaller when everyone believes it is finished.'},{x:3130,text:'The last press has three proof plates. Wait. Listen. Raise your voice.'}] },
  {title:'The First Morning',number:'IV',deck:'A future is something people have to make.',word:'DAWN',length:4300,
    intro:'The headline is corrected. Now there is a door to open, water to restore, and a garden to plant.',correction:'The next page belongs to everyone.',
    platforms:[[600,60,170],[800,125,170],[1000,190,180],[2100,60,180],[2310,125,170],[2520,190,180],[3380,70,180],[3580,140,170],[3780,210,170],[3990,270,200]],
    letters:[],ink:[],enemies:[],presses:[],barriers:[],
    memories:[{x:950,text:'A key opens a door. A headline only describes one.'},{x:2250,text:'The greenhouse can share its seeds once the water is flowing.'},{x:3500,text:'Carry a long glide with the first letter for a Sky Post bonus.'}] }
];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/** @param {{upgrades?:string[],spent?:number,echoes?:number[],reflected?:number[],shield?:boolean}} progress */
export function createGame(chapter=0,letters=[],total=0,memories=[],talked=[],reports=[],progress={}){
  const c=CHAPTERS[chapter];
  /** @type {Array<{type:string,x?:number,y?:number,id?:number}>} */const events=[];
  /** @type {number[]} */const broken=[];
  /** @type {number[]} */const plates=[];
  /** @type {Array<{x:number,y:number,vx:number,life:number,owner:number,reflected:boolean}>} */const shots=[];
  const motes=[];
  for(let i=0;i<(chapter===3?0:20);i++){const x=240+i*138,p=c.platforms.find(p=>x>p[0]&&x<p[0]+p[2]);motes.push({x,y:(p?p[1]:0)+60+(i%3)*11,got:false});}
  return {chapter,x:120,y:0,px:120,py:0,vx:0,vy:0,ground:true,coyote:.12,buffer:0,facing:1,
    time:0,life:3,invincible:0,cry:0,pulse:0,checkpoint:120,letters:letters.slice(),memories:memories.slice(),talked:talked.slice(),reports:reports.slice(),
    motes,total,enemies:c.enemies.map(e=>({...e,home:e.x,stun:0})),broken,events,result:null,jumps:0,
    revision:false,damage:0,glided:0,airCried:false,checkpointY:0,boss:{active:false,time:0,targetX:3270,plates,complete:false},
    upgrades:(progress.upgrades??[]).slice(),spent:progress.spent??0,echoes:(progress.echoes??[]).slice(),reflected:(progress.reflected??[]).slice(),
    shield:(progress.upgrades??[]).includes('coat'),echoTimers:[0,0],shots,deliveryLifts:DETAILS[chapter].lifts,barrierXs:c.barriers,
    moths:MARGINS[chapter].moths.map(m=>({...m,home:m.x,homeY:m.y,stun:0,alert:0})),
    sentries:MARGINS[chapter].sentries.map(t=>({...t,stun:0,windup:0,cooldown:1.4,direction:-1})),afterword:createAfterword()};
}
export function pressPhase(p,t){return (t+p.phase)%3.8;}
export function bossPhase(g){return g.boss.time%6;}
export function bossVulnerable(g){const t=bossPhase(g);return g.boss.active&&!g.boss.complete&&t>=1.8&&t<4.7;}
export function jump(g){g.buffer=.16;}
export function liftPosition(g,p){return {x:p.x+(g.revision?Math.sin(g.time*p.speed)*p.range:0),y:p.y};}
export function surfaces(g){
  const list=[...CHAPTERS[g.chapter].platforms,...DETAILS[g.chapter].platforms];
  for(const p of DETAILS[g.chapter].lifts){const pos=liftPosition(g,p);list.push([pos.x,pos.y,p.w]);}
  if(g.chapter===2&&g.revision)list.push(...GHOST_BRIDGES);
  if(g.echoes.includes(g.chapter))list.push(MARGINS[g.chapter].bridge);
  return list;
}
export function cry(g){
  if(g.cry>0||g.result)return false;
  g.cry=cryCooldown(g);g.pulse=.62;g.invincible=Math.max(g.invincible,.5);
  const reach=cryRange(g);
  // A cry gives one extra lift per flight; landing resets it.
  if(!g.ground&&!g.airCried){g.vy=Math.max(g.vy,390);g.airCried=true;g.events.push({type:'aircry'});}
  for(const e of g.enemies)if(Math.abs(e.x-g.x)<reach)e.stun=stunDuration(g);
  for(const x of CHAPTERS[g.chapter].barriers)if(Math.abs(x-g.x)<reach&&!g.broken.includes(x)){g.broken.push(x);g.events.push({type:'break',x,y:60});}
  echoCry(g);disrupt(g,reach);
  if(g.chapter===3)afterwordCry(g);
  if(bossVulnerable(g)){
    for(let i=0;i<PROOF_PLATES.length;i++){const p=PROOF_PLATES[i];
      if(!g.boss.plates.includes(i)&&Math.abs(g.x-p.x)<115&&Math.abs(g.y-p.y)<95){
        g.boss.plates.push(i);g.total+=100;g.events.push({type:'proof',x:p.x,y:p.y+60,id:i});
      }
    }
    if(g.boss.plates.length===3){g.boss.complete=true;g.events.push({type:'boss_complete'});}
  }
  g.events.push({type:'cry',x:g.x,y:g.y+40});return true;
}
export function hurt(g){
  if(g.invincible>0||g.result)return;
  if(g.shield){g.shield=false;g.invincible=1.1;g.shots.length=0;g.events.push({type:'shield',x:g.x,y:g.y+40});return;}
  g.life--;g.damage++;g.events.push({type:'hurt',x:g.x,y:g.y+35});
  g.shots.length=0;g.echoTimers=[0,0];
  if(g.life<=0){g.result='lost';return;}
  g.x=g.px=g.checkpoint;g.y=g.py=g.checkpointY;g.vx=g.vy=0;g.invincible=2.2;g.ground=true;g.airCried=false;
}
export function revive(g){g.life=3;g.result=null;g.x=g.px=g.checkpoint;g.y=g.py=g.checkpointY;g.vx=g.vy=0;g.invincible=2.2;g.cry=0;g.ground=true;g.airCried=false;g.events=[];g.shots=[];g.echoTimers=[0,0];}
function bossTick(g,dt){
  if(!g.boss.active||g.boss.complete)return;
  const prev=bossPhase(g);g.boss.time+=dt;const phase=bossPhase(g);
  if(phase<prev){g.boss.targetX=clamp(g.x,3140,4040);g.events.push({type:'boss_warning'});}
  if(prev<1.25&&phase>=1.25)g.events.push({type:'boss_slam',x:g.boss.targetX,y:0});
  if(phase>=1.25&&phase<1.5&&Math.abs(g.x-g.boss.targetX)<62&&g.y<88)hurt(g);
}
export function stepGame(g,dt,input){
  if(g.result)return;
  const c=CHAPTERS[g.chapter],detail=DETAILS[g.chapter];g.px=g.x;g.py=g.y;
  // Carry a rider with the delivery lift before applying their own velocity.
  if(g.ground)for(const p of detail.lifts){const old=liftPosition(g,p);if(Math.abs(g.y-old.y)<1&&g.x>=old.x-14&&g.x<=old.x+p.w+14){
    const next=p.x+(g.revision?Math.sin((g.time+dt)*p.speed)*p.range:0);g.x+=next-old.x;
  }}
  g.time+=dt;g.invincible=Math.max(0,g.invincible-dt);g.cry=Math.max(0,g.cry-dt);g.pulse=Math.max(0,g.pulse-dt);
  g.buffer=Math.max(0,g.buffer-dt);g.coyote=g.ground?.12:Math.max(0,g.coyote-dt);
  const target=clamp(input.move,-1,1)*(hasUpgrade(g,'ears')&&!g.ground?320:285);
  g.vx+=(target-g.vx)*Math.min(1,dt*(g.ground?16:7));if(Math.abs(input.move)>.1)g.facing=input.move>0?1:-1;
  if(g.buffer>0&&g.coyote>0){g.vy=635;g.ground=false;g.coyote=g.buffer=0;g.jumps++;g.events.push({type:'jump'});}
  const glide=input.glide&&g.vy<0&&!g.ground;
  g.vy-=(glide?310:1680)*dt;if(glide){g.vy=Math.max(hasUpgrade(g,'ears')?-75:-120,g.vy);g.glided+=Math.abs(g.vx)*dt;}
  if(g.revision&&input.glide&&!g.ground)for(const draft of detail.drafts)if(g.x>=draft.x&&g.x<=draft.x+draft.w&&g.y<340){g.vy=Math.max(g.vy,Math.min(290,g.vy+draft.power*dt));}
  g.x=clamp(g.x+g.vx*dt,g.boss.active&&!g.boss.complete?3110:28,c.length-25);g.y+=g.vy*dt;g.ground=false;
  if(g.vy<=0)for(const [x,y,w] of surfaces(g))if(g.x+14>x&&g.x-14<x+w&&g.py>=y-.5&&g.y<=y){g.y=y;g.vy=0;g.ground=true;break;}
  if(g.y<=0){g.y=0;g.vy=0;g.ground=true;}if(g.ground)g.airCried=false;
  for(const x of c.barriers)if(!g.broken.includes(x)&&Math.abs(g.x-x)<35&&g.y<128){g.x=g.px;g.vx=0;}
  for(const [x,w] of c.ink)if(g.x>x+5&&g.x<x+w-5&&g.y<9){hurt(g);break;}
  for(const e of g.enemies){e.stun=Math.max(0,e.stun-dt);if(e.stun<=0)e.x=e.home+Math.sin(g.time*e.speed)*e.range;if(e.stun<=0&&Math.abs(e.x-g.x)<36&&g.y<50)hurt(g);}
  for(const p of c.presses){const ph=pressPhase(p,g.time);if(ph>1.25&&ph<1.85&&Math.abs(g.x-p.x)<44&&g.y<195)hurt(g);}
  bossTick(g,dt);
  marginTick(g,dt,hurt);
  if(g.chapter===3)afterwordTick(g,dt,input);
  if(g.result)return;
  for(const p of c.letters)if(!g.letters.includes(p.id)&&Math.abs(g.x-p.x)<38&&Math.abs(g.y+40-p.y)<55){g.letters.push(p.id);g.total+=100;g.events.push({type:'letter',x:p.x,y:p.y,id:p.id});}
  for(const p of g.motes)if(!p.got&&Math.abs(g.x-p.x)<30&&Math.abs(g.y+40-p.y)<45){p.got=true;g.total+=10;g.events.push({type:'mote',x:p.x,y:p.y});}
  for(const p of detail.scraps)if(!g.memories.includes(p.id)&&Math.abs(g.x-p.x)<35&&Math.abs(g.y+40-p.y)<48){
    g.memories.push(p.id);g.total+=75;g.life=Math.min(3,g.life+1);g.events.push({type:'memory',x:p.x,y:p.y,id:p.id});
  }
  for(const x of g.chapter===3?[1000,2340,3260]:[1000,2340])if(g.x>x&&g.x<x+130&&g.y===0&&g.checkpoint<x){g.checkpoint=x+35;g.checkpointY=0;newCheckpoint(g);g.events.push({type:'checkpoint',x:g.checkpoint});}
}
export function canExit(g){return g.chapter===3?g.afterword.complete:CHAPTERS[g.chapter].letters.every(p=>g.letters.includes(p.id));}
export function contextAction(g){
  if(g.chapter===3)return afterwordContext(g);
  const d=DETAILS[g.chapter];
  if(Math.abs(g.x-d.citizen.x)<90&&g.y<85)return {kind:'citizen',label:'E  LISTEN TO '+d.citizen.name.split(',')[0].toUpperCase()};
  if(Math.abs(g.x-d.station.x)<85&&g.y<100)return {kind:'station',label:'E  '+(g.revision?'RESTORE '+d.station.original:'PRINT '+d.station.edited)};
  if(g.x>CHAPTERS[g.chapter].length-260)return {kind:'exit',label:g.chapter===2?(g.boss.complete?'E  PRINT THE CORRECTION':g.boss.active?'CORRECT THE THREE PROOF PLATES':'E  CHALLENGE THE PRESS'):'E  NEXT EDITION'};
  return {kind:'none',label:''};
}
export function chapterReport(g){
  const memories=DETAILS[g.chapter].scraps.filter(p=>g.memories.includes(p.id)).length;
  const ink=g.motes.filter(p=>p.got).length;
  return {chapter:g.chapter,seconds:Math.round(g.time),damage:g.damage,memories,ink,echo:g.echoes.includes(g.chapter),
    medals:[g.damage===0,ink>=12,memories===3],bonus:(Number(g.damage===0)+Number(ink>=12)+Number(memories===3))*75};
}
function finish(g){
  if(!g.reports.some(p=>p.chapter===g.chapter)){const report=chapterReport(g);g.total+=report.bonus;g.reports.push(report);}
  g.result='chapter';return g.result;
}
export function interact(g){
  if(g.chapter===3)return afterwordInteract(g);
  const action=contextAction(g);
  if(action.kind==='citizen')return 'citizen';
  if(action.kind==='station'){g.revision=!g.revision;g.events.push({type:'revision'});return 'station';}
  if(action.kind!=='exit')return 'far';
  if(!canExit(g)){g.events.push({type:'locked'});return 'locked';}
  if(g.chapter===2){
    if(!g.boss.active){g.boss.active=true;g.boss.targetX=clamp(g.x,3140,4040);g.checkpoint=3140;g.checkpointY=0;g.shots=[];newCheckpoint(g);g.events.push({type:'boss_start'});return 'boss';}
    if(!g.boss.complete)return 'boss';
  }
  return finish(g);
}
export function keepTestimony(g){const id=DETAILS[g.chapter].citizen.id;if(!g.talked.includes(id)){g.talked.push(id);g.events.push({type:'testimony',id});}}
// Versioned snapshots preserve collectibles and scores without duplicate rewards on reload.
export function snapshot(g){return {schema:4,chapter:g.chapter,x:g.checkpoint,y:g.checkpointY,letters:g.letters,memories:g.memories,talked:g.talked,total:g.total,
  motes:g.motes.map(p=>p.got),broken:g.broken,revision:g.revision,damage:g.damage,time:g.time,reports:g.reports,
  upgrades:g.upgrades,spent:g.spent,echoes:g.echoes,reflected:g.reflected,shield:g.shield,afterword:g.afterword,
  boss:{active:g.boss.active,plates:g.boss.plates,complete:g.boss.complete}};}
export function restore(data){
  if(!data||typeof data!=='object'||Array.isArray(data))return null;
  const chapter=data.chapter;if(!Number.isInteger(chapter)||chapter<0||chapter>=4||(chapter===3&&data.schema!==4)||!Number.isFinite(data.total)||data.total<0)return null;
  const ids=(v,max)=>Array.isArray(v)?[...new Set(v.filter(x=>Number.isInteger(x)&&x>=0&&x<max))]:[];
  if(!Array.isArray(data.letters))return null;
  const g=createGame(chapter,ids(data.letters,5),data.total,ids(data.memories,9),ids(data.talked,3));
  if(data.schema!==2&&data.schema!==3&&data.schema!==4)return g;
  if(data.schema===3||data.schema===4){
    g.upgrades=Array.isArray(data.upgrades)?[...new Set(data.upgrades.filter(id=>UPGRADES.some(p=>p.id===id)))]:[];
    const minimumSpent=g.upgrades.reduce((sum,id)=>sum+UPGRADES.find(p=>p.id===id).cost,0);
    g.spent=Number.isFinite(data.spent)&&data.spent>=minimumSpent?Math.min(g.total,data.spent):minimumSpent;
    g.echoes=ids(data.echoes,3);g.reflected=ids(data.reflected,4);g.shield=g.upgrades.includes('coat')&&data.shield===true;
  }
  if(data.schema===4)g.afterword=restoreAfterword(data.afterword);
  if(Number.isFinite(data.x)){g.x=g.px=g.checkpoint=clamp(data.x,28,CHAPTERS[chapter].length-25);}
  g.y=g.py=g.checkpointY=0;g.revision=chapter===3?g.afterword.restored.includes(1):data.revision===true;
  if(Array.isArray(data.motes))g.motes.forEach((p,i)=>p.got=data.motes[i]===true);
  g.broken=Array.isArray(data.broken)?data.broken.filter(x=>CHAPTERS[chapter].barriers.includes(x)):[];
  g.damage=Number.isInteger(data.damage)&&data.damage>=0?data.damage:0;g.time=Number.isFinite(data.time)&&data.time>=0?data.time:0;
  g.reports=Array.isArray(data.reports)?data.reports.filter(p=>p&&Number.isInteger(p.chapter)&&p.chapter>=0&&p.chapter<=chapter&&Array.isArray(p.medals)&&p.medals.length===3&&p.medals.every(v=>typeof v==='boolean')):[];
  if(chapter===2&&data.boss&&data.boss.active===true){g.boss.active=true;g.boss.plates=ids(data.boss.plates,3);g.boss.complete=g.boss.plates.length===3;g.x=g.px=g.checkpoint=3140;}
  return g;
}
