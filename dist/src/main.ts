import { localizedDrawOptions as __l10nDrawOptions } from "./l10n/font.js";
import { withLanguageRender as __l10nRender } from "./l10n/menu.js";
// localization-runtime:attached
import { localizedFont as __l10nFont } from "./l10n/font.js";
// display-localization:attached
import { localizedText as __displayText } from "./l10n/text.js";
import {frame,onStart,onFixedUpdate,onRender,onSuspend,setFixedRate,strings} from 'starhermit:engine';
import * as input from 'starhermit:input';
import * as draw from 'starhermit:draw';
import {createImageBitmap} from 'starhermit:canvas';
import type {ImageBitmap} from 'starhermit:canvas';
import {loadClip,play} from 'starhermit:audio';
import type {AudioClip,Sound} from 'starhermit:audio';
import {storage} from 'starhermit:storage';
import {CHAPTERS,DETAILS,GHOST_BRIDGES,PROOF_PLATES,MARGINS,UPGRADES,AFTERWORD,createGame,stepGame,jump,cry,interact,canExit,pressPhase,clamp,liftPosition,bossPhase,bossVulnerable,contextAction,chapterReport,snapshot,restore,revive,keepTestimony,availableInk,buyUpgrade,cryCooldown,cryRange,bellPositions,hasUpgrade,chooseHeadline,seedsInBag,valveWindow,morningObjective} from './model.js';
import {createMotion,stepMotion,motionPose} from './animation.js';
import {C,S,W,H,viewport,rect,stroke,line,ellipse,ring,path,text,image,loadArt,grain,baby,gear,sprout,backdrop,street,ledge,light} from './art.js';

type Mode='title'|'play'|'pause'|'help'|'archive'|'chapter'|'lost'|'won'|'journal'|'dialogue'|'workshop'|'compose';
type Hit={x:number;y:number;w:number;h:number;action:()=>void};
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;glyph:string;red:boolean};
let mode:Mode='title',back:Mode='title',g=createGame(),clock=0,camera=0,ground=650,ready=false;
let hits:Hit[]=[],particles:Particle[]=[],toast='',toastTime=0,shake=0,cut=1;
let lastTouch=-10;
let heroMotion=createMotion();
let journalChapter=0,selectedMemory=-1,dialoguePage=0,journalPage=0;
let guidePage=0,shopPage=0,shopMessage='';
let mute=storage.getJson('muted')===true;
let record=Number(storage.getJson('record')??0);
let saved=readSave();
let clipping:ImageBitmap|null=null;
const clips:Record<string,AudioClip>={};let music:Sound|null=null;

function readSave(){return restore(storage.getJson('progress'));}
function save(){const data=snapshot(g);storage.setJson('progress',data);saved=restore(data);}
function sfx(name:string,gain=.35,pitch=1){if(!mute&&clips[name])play(clips[name]!,{gain,pitch,bus:'effects'});}
function startMusic(){if(!music&&clips.music&&!mute)music=play(clips.music,{loop:true,gain:.16,bus:'music'});}
function toggleSound(){mute=!mute;storage.setJson('muted',mute);if(mute){music?.stop();music=null;}else{startMusic();sfx('mote');}}
function touchLabel(value:string):string{return Array.from(__displayText(value)).slice(0,16).join('');}
function controls(){input.setTouchControls(mode==='play'?[
  {kind:'button',action:'left',label:'←',anchor:'bottom-left',offset:[55,68],radius:35},
  {kind:'button',action:'right',label:'→',anchor:'bottom-left',offset:[137,68],radius:35},
  {kind:'button',action:'cry',label:touchLabel('CRY'),anchor:'bottom-right',offset:[148,68],radius:33},
  {kind:'button',action:'jump',label:touchLabel('JUMP'),anchor:'bottom-right',offset:[55,105],radius:42},
  {kind:'button',action:'interact',label:touchLabel('USE'),anchor:'bottom-right',offset:[56,31],radius:25}
]:null);}
strings.onChange(controls);
function setMode(m:Mode){mode=m;controls();input.setCursor('default');}
function start(resume=false){
  heroMotion=createMotion();
  g=resume&&saved?restore(snapshot(saved))!:createGame();camera=Math.max(0,g.x-W*.3);cut=1;particles=[];toast=CHAPTERS[g.chapter]!.intro;toastTime=6;
  setMode(g.chapter<3&&g.reports.some(p=>p.chapter===g.chapter)?'chapter':'play');startMusic();save();
}
function retry(){
  heroMotion=createMotion();
  revive(g);camera=Math.max(0,g.x-W*.3);particles=[];cut=1;setMode('play');save();
}
function notify(t:string,seconds=3.8){toast=t;toastTime=seconds;}
function burst(x:number,y:number,count=16,red=false){
  for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=55+Math.random()*150;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,max:1,glyph:['a','?','!','e','·','r','s'][i%7]!,red});}
}
function use(){
  if(mode!=='play')return;
  const r=interact(g);
  if(r==='afterword_talk'){dialoguePage=0;setMode('dialogue');return;}
  if(r==='compose'){setMode('compose');return;}
  if(r==='water'){notify('Cry beside the wheel when the marked vane is green. Three aligned notes restore the water.',6);save();return;}
  if(r==='garden')notify('Something has begun to grow here.');
  if(r==='seeds_needed')notify('Gather seed packets from the greenhouse ledges after restoring the water.');
  if(r==='letter_needed')notify('Ada is waiting at the small press. The first letter needs its words.');
  if(r==='headline')notify(AFTERWORD.headlines[g.afterword.headline]!);
  if(r==='citizen'){dialoguePage=0;setMode('dialogue');save();return;}
  if(r==='station'){sfx('letter',.2,.7);notify(g.revision?DETAILS[g.chapter]!.station.hint:'Original wording restored.');save();return;}
  if(r==='boss'){notify(g.boss.complete?'The plates are ready. Print your correction.':'Dodge the red stamp. Cry beside a proof plate during RECOVERY.',6);save();return;}
  if(r==='locked')notify('The press needs every letter in this district. Look for the red type blocks.');
  if(r==='far')return;
  if(r==='chapter'){save();setMode('chapter');sfx('letter',.4);}
  if(r==='won'){
    record=Math.max(record,g.total);storage.setJson('record',record);save();setMode('won');sfx('letter',.5,.75);
  }
}
function nextChapter(){heroMotion=createMotion();g=createGame(g.chapter+1,g.letters,g.total,g.memories,g.talked,g.reports,g);camera=0;particles=[];cut=1;setMode('play');notify(CHAPTERS[g.chapter]!.intro,6);save();}
function openJournal(){back=mode;journalChapter=g.chapter===3?-1:g.chapter;selectedMemory=-1;journalPage=0;setMode('journal');}
function beginAfterword(){heroMotion=createMotion();g=createGame(3,[0,1,2,3,4],record);camera=0;cut=1;particles=[];setMode('play');startMusic();notify(CHAPTERS[3]!.intro,6);save();}
function writeHeadline(index:number){if(chooseHeadline(g,index)){setMode('play');notify('The first letter is ready. Carry it to the high postbox. A long glide earns the Sky Post bonus.',7);save();}}
function openWorkshop(){back=mode;shopMessage='';shopPage=0;setMode('workshop');}
function purchase(id:string){const result=buyUpgrade(g,id);shopMessage=result==='bought'?'A new note for this edition.':result==='poor'?'Keep exploring to gather more ink.':'That note is already written.';if(result==='bought'){sfx('letter',.3,1.2);save();}}

onStart(async()=>{
  setFixedRate(60);
  await loadArt();
  await Promise.all(['jump','cry','hurt','mote','letter','music'].map(async n=>{clips[n]=await loadClip('assets/'+n+'.wav');}));
  clipping=await createImageBitmap('assets/clipping.png');ready=true;controls();
});
input.onAction(e=>{
  if(!e.pressed||!ready)return;
  if(e.action==='pause'){
    if(mode==='play')setMode('pause');else if(mode==='pause')setMode('play');else if(mode==='help'||mode==='archive'||mode==='journal'||mode==='workshop')setMode(back);else if(mode==='dialogue'||mode==='compose')setMode('play');return;
  }
  if(e.action==='workshop'&&(mode==='play'||mode==='pause')){openWorkshop();return;}
  if(e.action==='workshop'&&mode==='workshop'){setMode(back);return;}
  if(e.action==='journal'&&(mode==='play'||mode==='pause')){openJournal();return;}
  if(e.action==='journal'&&mode==='journal'){setMode(back);return;}
  if(mode==='dialogue'&&e.action==='interact'){advanceDialogue();return;}
  if(mode==='title'&&(e.action==='interact'||e.action==='jump')){start(Boolean(saved));return;}
  if(mode==='chapter'&&e.action==='interact'){nextChapter();return;}
  if(mode==='lost'&&(e.action==='restart'||e.action==='interact')){retry();return;}
  if(mode==='pause'&&e.action==='interact'){setMode('play');return;}
  if(mode==='play'){
    if(e.action==='jump')jump(g);
    if(e.action==='cry')cry(g);
    if(e.action==='interact')use();
    if(e.action==='restart')retry();
  }
});
function click(x:number,y:number){for(let i=hits.length-1;i>=0;i--){const h=hits[i]!;if(x/S>=h.x&&x/S<=h.x+h.w&&y/S>=h.y&&y/S<=h.y+h.h){h.action();return;}}}
input.onPointerButton(e=>{if(e.pressed&&e.button===0&&clock-lastTouch>.7)click(e.x,e.y);});
input.onTouch(e=>{if(e.phase==='start'&&!e.control){lastTouch=clock;click(e.x,e.y);}});
onSuspend(()=>{if(mode==='play')setMode('pause');});

onFixedUpdate(dt=>{
  clock+=dt;cut=Math.max(0,cut-dt*.8);shake=Math.max(0,shake-dt*8);
  if(mode!=='play')return;
  toastTime=Math.max(0,toastTime-dt);
  stepGame(g,dt,{move:input.value('right')-input.value('left'),glide:input.isDown('jump')});
  stepMotion(heroMotion,dt,{grounded:g.ground,vx:g.vx,vy:g.vy,distance:g.x-g.px,gliding:input.isDown('jump')&&g.vy<0&&!g.ground,cry:g.events.some(e=>e.type==='cry'),hurt:g.events.some(e=>e.type==='hurt')});
  for(const event of g.events){
    if(event.type==='jump')sfx('jump',.18);
    if(event.type==='cry'){sfx('cry',.3);shake=.35;burst(g.x,g.y+40,16);}
    if(event.type==='hurt'){sfx('hurt',.35);shake=1;notify('A little ink. A new draft. Your letters are safe.');burst(Number(event.x),Number(event.y),22,true);}
    if(event.type==='letter'){sfx('letter',.35,1+Number(event.id)*.08);burst(Number(event.x),Number(event.y),25,true);notify('Letter '+ 'FIRST'[Number(event.id)]+' recovered. One word closer to another future.');save();}
    if(event.type==='mote'){sfx('mote',.12,1+g.total%7*.04);burst(Number(event.x),Number(event.y),4);}
    if(event.type==='break'){sfx('hurt',.14,1.8);burst(Number(event.x),65,20);notify('CERTAINTY: temporarily out of order.');}
    if(event.type==='memory'){sfx('letter',.35,1.35);burst(Number(event.x),Number(event.y),24);const found=DETAILS.flatMap(d=>d.scraps).find(p=>p.id===event.id)!;notify('Memory recovered: '+found.title+'. A little life restored.');save();}
    if(event.type==='checkpoint'){notify('Margin marked. Progress saved at this checkpoint.',2.5);save();}
    if(event.type==='proof'){sfx('letter',.45,.8+Number(event.id)*.2);burst(Number(event.x),Number(event.y),30,true);notify('Proof plate corrected: '+g.boss.plates.length+' / 3.');save();}
    if(event.type==='boss_complete'){notify('The press has run out of certainty. Return to its console and print FIRST.',7);save();}
    if(event.type==='boss_slam'){sfx('hurt',.35,.6);shake=.8;burst(Number(event.x),0,18,true);}
    if(event.type==='echo_locked')notify('Edit the district’s rule before ringing its margin chimes.');
    if(event.type==='echo_note'){sfx('mote',.2,Number(event.id)?1.5:.8);burst(Number(event.x),Number(event.y),8);}
    if(event.type==='echo_complete'){sfx('letter',.4,.9);notify('Errata corrected: '+MARGINS[g.chapter]!.title+'. A paper shortcut unfolds. +150 ink.',6);save();}
    if(event.type==='reflect'){sfx('mote',.22,.6);burst(Number(event.x),Number(event.y),10,true);}
    if(event.type==='rebuttal'){sfx('letter',.25,1.6);notify('Returned to sender. Sentry silenced. +25 ink.');save();}
    if(event.type==='shield'){sfx('hurt',.2,1.6);burst(Number(event.x),Number(event.y),18);notify('The blotter coat took the stain. Renew it at the next checkpoint.');save();}
    if(event.type==='after_item'){sfx('mote',.23,1.2);burst(Number(event.x),Number(event.y),12);notify(Number(event.id)===0?'The nursery key is safe. Mara is waiting to the west.':'A seed packet for the shared garden.');save();}
    if(event.type==='restored'){sfx('letter',.3,.85+Number(event.id)*.1);notify(['The nursery door opens. A room for tomorrow. +100 ink.','Water returns to the greenhouse and the high drafts. +100 ink.','Three beds planted. A garden for everyone. +100 ink.','The first letter is on its way. +100 ink.'][Number(event.id)]!,6);save();}
    if(event.type==='valve'){sfx('mote',.3,.7+Number(event.id)*.2);notify('Waterwheel note '+event.id+' / 3.',2);save();}
    if(event.type==='valve_miss')notify('Listen for the green vane. The wheel will come around again.',2.5);
    if(event.type==='planted'){sfx('mote',.25,.8);burst(Number(event.x),20,10);notify('A seed bed planted. '+g.afterword.beds.length+' / 3.');save();}
    if(event.type==='sky_post'){sfx('letter',.25,1.5);notify('Sky Post earned. Deliver the letter to claim the +150 ink bonus.');save();}
  }
  g.events=[];
  if(g.result==='lost')setMode('lost');
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=115*dt;}
  particles=particles.filter(p=>p.life>0);
});

function button(label:string,x:number,y:number,w:number,h:number,action:()=>void,primary=false,small=false){
  const p=input.pointer();const over=p&&p.x/S>x&&p.x/S<x+w&&p.y/S>y&&p.y/S<y+h;
  if(primary){rect(x+3,y+4,w,h,'#07172250');rect(x,y,w,h,over?'#f1cf8e':C.gold);stroke(x+3,y+3,w-6,h-6,'#6f543333',.8);text(label,x+w/2,y+(h-(small?16:19))/2-1,small?16:17,C.ink,'Mono','center',small?0:1);}
  else {if(over)rect(x,y,w,h,'#292c2810');stroke(x,y,w,h,C.ink);text(label,x+w/2,y+(h-(small?15:18))/2-1,small?15:18,C.ink,'Mono','center');}
  hits.push({x,y,w,h,action});
}
function link(label:string,x:number,y:number,w:number,action:()=>void){
  text(label,x,y,14,C.muted,'Mono');hits.push({x,y:y-8,w,h:34,action});
}
function paper(){
 rect(0,0,W,H,'#d9cfb7');rect(16,14,W-32,H-28,C.paper);rect(25,22,W-50,H-44,'#eee6d2');image(grain,0,0,W,H,.65);
 line(38,37,W-38,37,'#a49b7e',.8);line(38,41,W-38,41,'#c2b699',.5);
 text('THE DEPARTMENT OF UNWRITTEN FUTURES',44,54,10,C.muted,'Mono','start',1.4);
 text('VOL. 2012  /  NO. 001',W-44,54,10,C.muted,'Mono','end',1);
 for(const sign of [-1,1]){const x=sign<0?32:W-32;line(x-5,26,x+5,26,'#8a816d',.7);line(x,21,x,31,'#8a816d',.7);}
}

function sceneBack(menu=false){
  backdrop(menu?0:g.chapter,camera,clock,menu?H-75:ground,menu);
}

function title(){
  const mobile=W<900;
  sceneBack(true);
  const tall=mobile&&H>1100,pw=tall?W:mobile?W*.7:W*.48,x=mobile?40:70,top=Math.max(100,H*.17);
  rect(0,0,pw,tall?top+500:H,'#10232beb');
  line(x,54,pw-38,54,'#d8b77c70');
  text('A PAPER CITY. AN UNWRITTEN FUTURE.',x,69,10,C.gold,'Mono','start',1.3);
  text('LAST',x,top,mobile?82:112,C.cream,'Display','start',2);
  text('EDITION',x,top+(mobile?92:119),mobile?76:100,C.cream,'Display');
  line(x,top+247,x+65,top+247,C.gold,2);
  text('They printed the end of your story.',x,top+274,mobile?18:21,'#d5d9cc','Body');
  text('You have other plans.',x,top+308,mobile?18:21,'#d5d9cc','Body');
  const by=top+372,bw=Math.min(340,pw-x-28);
  button(saved?'CONTINUE THE STORY  →':'REWRITE THE FUTURE  →',x,by,bw,56,()=>start(Boolean(saved)),true);
  if(saved){text('BEGIN A NEW EDITION',x,by+82,11,'#d8c9a8','Mono');hits.push({x,y:by+72,w:260,h:32,action:()=>start(false)});}
  else text('THREE ACTS · NINE STORIES · A NEW MORNING',x,by+82,mobile?8:10,'#d8c9a8','Mono');
  if(!saved&&record>0){text('VISIT THE FIRST MORNING',x,by+113,10,C.gold,'Mono');hits.push({x,y:by+105,w:280,h:30,action:beginAfterword});}
  const hx=tall?W*.56:mobile?W*.83:W*.75,hy=H-145;
  light(hx,hy-90,240,.9);
  baby(hx,hy,tall?4.1:mobile?2.25:3.25,clock,0,false,1);
  text('ONE SMALL VOICE CAN CHANGE THE HEADLINE.',hx,hy+26,tall?10:mobile?7:9,'#f0dfbc','Mono','center',.6);
  rect(0,H-72,W,72,'#0b1b26ed');line(40,H-72,W-40,H-72,'#d8b77c40');
  const footY=H-43;
  for(const [label,fx,action] of [['FIELD GUIDE',40,()=>{back=mode;setMode('help');}],['THE CLIPPING',mobile?195:225,()=>{back=mode;setMode('archive');}],[mute?'SOUND OFF':'SOUND ON',W-160,toggleSound]] as const){text(label,fx,footY,11,'#c9d2c6','Mono');hits.push({x:fx,y:footY-10,w:150,h:35,action});}
  if(!mobile)text('AN ADVENTURE IN PAPER & INK',W/2+60,footY,9,'#829a99','Mono','center',1);
}


function platform(x:number,y:number,w:number){
  const xx=x-camera,yy=ground-y;if(xx>W+50||xx+w< -50)return;
  ledge(xx,yy,w);
}

function hazardInk(x:number,w:number){
 const xx=x-camera;if(xx>W+60||xx+w< -60)return;
 rect(xx,ground,w,14,'#07121f');ellipse(xx+w/2,ground+4,w/2,7,'#080f1d');
 for(let i=0;i<10;i++){const xx2=xx+i*w/9,yy=ground+Math.sin(clock*2+i*1.7)*2;ellipse(xx2,yy,w/16,4,'#1f2034');line(xx2-5,yy,xx2+5,yy,'#bc645d80',1);}
 for(let i=0;i<4;i++){const bx=xx+((i*43+clock*8)%w),by=ground-((clock*12+i*17)%35);ellipse(bx,by,1.8,2.4,'#b6789955');}
 line(xx,ground,xx+w,ground,'#e08a7950',1);
}

function censor(e:{x:number;stun:number},i:number){
 const x=e.x-camera,y=ground-22;if(x< -80||x>W+80)return;
 const stunned=e.stun>0,phase=e.x/13+i,bob=stunned?2:Math.abs(Math.sin(phase))*1.5;
 ellipse(x,ground+2,36,4,'#06142170');
 for(const d of [-1,1]){
  const stride=stunned?0:Math.sin(phase+(d<0?Math.PI:0))*9,lift=stunned?-3:Math.max(0,Math.cos(phase+(d<0?Math.PI:0)))*6;
  const kneeX=x+d*35+stride*.35,kneeY=y+12+bob,footX=x+d*43+stride,footY=ground-lift;
  line(x+d*23,y+6+bob,kneeX,kneeY,C.ink,5);ellipse(kneeX,kneeY,4,4,'#b68d57');line(kneeX,kneeY,footX,footY,'#577276',3);line(footX-4,footY,footX+5,footY,'#b69a64',2);
  gear(x+d*18,y+15,11,stunned?0:e.x*d/11,'#8c7755');
 }
 path('M-30 7 L-30 -12 Q-30 -26 -16 -26 L16 -26 Q30 -26 30 -12 L30 7 Z',x,y+bob,'#334e56',1,'#a88b5a',1.4);
 rect(x-23,y-17+bob,46,17,'#10242f');line(x-20,y-18+bob,x+20,y-18+bob,'#e4c18080');
 for(const d of [-1,1]){if(!stunned)light(x+d*11,y-9+bob,20,.6);ellipse(x+d*11,y-9+bob,4,4,stunned?'#657a76':'#ea8766');ellipse(x+d*12,y-10+bob,1.3,1.3,'#ffe6b9');}
 rect(x-16,y+3+bob,32,4,'#142c35');for(let j=0;j<5;j++)line(x-13+j*6,y+3+bob,x-13+j*6,y+7+bob,'#a9ac8b',1);
 path('M-18 -27 L-15 -39 L15 -39 L18 -27 Z',x,y+bob,'#a8a283',1,'#273d44',1.4);rect(x-11,y-38+bob,22,9,C.cream);
 text(stunned?'? ?':'CENSOR',x,y-38+bob,6,C.ink,'Mono','center');
 if(stunned){text('z',x-15,y-55+Math.sin(clock*2)*4,15,C.gold,'Body');text('?',x+16,y-61,19,C.gold,'Body');}
}

function press(p:{x:number;phase:number}){
 const x=p.x-camera;if(x< -110||x>W+110)return;
 const phase=pressPhase(p,g.time),danger=phase>1.25&&phase<1.85,warning=phase>.6&&phase<1.25;
 const lowered=phase>1.25&&phase<2.15?1:0;
 ellipse(x,ground+4,77,8,'#07172255');
 for(const sign of [-1,1]){rect(x+sign*52-9,ground-267,18,267,'#203b46');rect(x+sign*52-6,ground-267,4,267,'#6f887d');rect(x+sign*52-15,ground-15,30,15,'#293d43');ellipse(x+sign*52,ground-245,4,4,'#e0b675');}
 path('M-72 -256 L-72 -278 Q0 -313 72 -278 L72 -256 Z',x,ground,'#29434b',1,'#a88c5b',1.3);
 gear(x,ground-282,18,clock*.8,'#b69560');
 rect(x-5,ground-256,10,31+lowered*180,'#b8b5a0');rect(x-3,ground-256,3,31+lowered*180,'#f0dfb9');
 const sy=ground-231+lowered*180;rect(x-45,sy,90,35,'#172e39');rect(x-45,sy,90,5,'#ab8852');stroke(x-40,sy+9,80,20,'#859185',1);
 text('FACT',x,sy+9,16,C.cream,'Display','center');
 light(x+58,ground-283,25,warning||danger?1:.3);ellipse(x+58,ground-283,5,5,warning||danger?'#ee8c66':'#8eb49a');
 if(warning||danger){rect(x-42,ground-8,84,8,'#d5674580');for(let i=0;i<5;i++)line(x-35+i*16,ground-7,x-29+i*16,ground-1,C.gold,2);if(warning)text('!',x,ground-53,25,C.gold,'Display','center');}
}

function barrier(x:number){
 const xx=x-camera;if(xx< -100||xx>W+100)return;
 if(g.broken.includes(x)){for(let i=0;i<4;i++){rect(xx-30+i*17,ground-5-i%2*4,19,8,'#6b6d63');line(xx-28+i*17,ground-4-i%2*4,xx-15+i*17,ground-4-i%2*4,'#dcc8a0');}return;}
 ellipse(xx,ground+2,38,5,'#07172260');
 for(let i=0;i<6;i++){const bx=xx-29+(i%2)*4,by=ground-22-i*19;rect(bx,by,54,20,i%2?'#403b3c':'#334850');rect(bx,by,5,20,i%2?'#9d5945':'#a28a57');line(bx+8,by+4,bx+48,by+4,'#d9caaa70');line(bx+8,by+8,bx+45,by+8,'#c2b49750');rect(bx+10,by+10,33,5,'#18252e');}
 path('M-32 -65 L32 -65 L32 -31 L-32 -31 Z',xx,ground,C.red,1,'#e3a46e',1);
 text('X  CRY',xx,ground-55,11,C.cream,'Mono','center');light(xx,ground-49,42,.35);
}

function exitPress(){
 if(g.chapter===3)return;
 const c=CHAPTERS[g.chapter]!,x=c.length-150-camera;if(x< -170||x>W+170)return;
 const open=canExit(g),final=g.chapter===2;
 ellipse(x,ground+4,108,8,'#07172265');
 rect(x-82,ground-182,164,165,'#29434b');rect(x+59,ground-182,23,165,'#172e39');
 path('M-95 -180 L-95 -199 L-82 -213 L82 -213 L95 -199 L95 -180 Z',x,ground,'#223943',1,'#b49661',1.5);
 for(const sign of [-1,1]){rect(x+sign*72-4,ground-177,8,150,'#9e8659');rect(x+sign*72-2,ground-177,2,150,'#e0bc79');gear(x+sign*67,ground-20,31,clock*sign*.4,'#ac8b56');}
 rect(x-55,ground-170,110,68,'#e5d2a4');stroke(x-49,ground-164,98,56,'#927b50',1);text(final?'LAST':'NEXT',x,ground-158,28,C.ink,'Display','center');text('EDITION',x,ground-126,9,C.red,'Mono','center',1.6);
 rect(x-49,ground-86,98,27,'#112833');text(final&&g.boss.active&&!g.boss.complete?'PROOF REQUIRED':open?'E  PRINT':'TYPE MISSING',x,ground-77,9,open?C.gold:'#a8b0a2','Mono','center');
 for(let i=0;i<5;i++)rect(x-38+i*17,ground-46,9,10,'#667d77');
 ellipse(x,ground-21,7,7,open?'#f1bc70':'#64786d');if(open)light(x,ground-42,100,.7);
 text('THE DISTRICT PRESS',x,ground-244,10,C.cream,'Mono','center',.5);
}

function citizenPortrait(x:number,feet:number,k=1,variant=0,talking=false){
 const coat=['#59867e','#bd935a','#8d6b74'][variant%3]!,t=clock+variant*1.7;
 const breath=Math.sin(t*2)*1.1,near=talking||Math.abs(g.x-camera-x)<150;
 const sway=Math.sin(t*.9)*.025,look=talking?Math.sin(t*.8)*2:near?Math.sign(g.x-camera-x)*2:Math.sin(t*.45)*1.5;
 const gesture=talking?Math.sin(t*4.8)*.22-.5:near?Math.sin(t*2)*.1-.15:Math.sin(t*1.4)*.055;
 const blink=t%5.1>4.95;
 ellipse(x,feet+2*k,21*k,4*k,'#07172255');
 // Stable feet; breathing and weight shifts happen above the hips.
 path('M-12 -24 L-4 -24 L-5 -3 L-15 -3 L-17 0 L-1 0 L2 -24 L9 -24 L10 -3 L19 -1 L19 2 L6 2 L0 -16 Z',x,feet,C.ink,k);
 const torsoY=feet-breath*k;
 function limb(d:string,ox:number,oy:number,fill:string,angle:number,strokeCol?:string){
  const options:draw.PathOptions={fill,scale:k*S,rotation:angle,origin:{x:ox*S,y:oy*S}};
  if(strokeCol){options.stroke=strokeCol;options.lineWidth=1;}
  draw.path(d,ox*S,oy*S,options);
 }
 const freeX=x+12*k,freeY=torsoY-58*k;
 limb('M0 0 Q12 4 14 19 L14 30 L7 31 L5 17 L-4 8 Z',freeX,freeY,coat,gesture,'#243e46');
 const handX=freeX+(10*Math.cos(gesture)-31*Math.sin(gesture))*k,handY=freeY+(10*Math.sin(gesture)+31*Math.cos(gesture))*k;
 ellipse(handX,handY,4*k,5*k,'#e4be8e',gesture);
 limb('M-13 -64 Q0 -70 13 -64 L23 -20 Q1 -11 -22 -20 Z',x,torsoY,coat,sway,'#17323d');
 path('M10 -61 L23 -20 L12 -18 L2 -61 Z',x,torsoY,'#102b363e',k);
 path('M-9 -65 L0 -52 L9 -65 L8 -27 L-8 -27 Z',x,torsoY,'#ead8ac',k);
 for(let i=0;i<3;i++)ellipse(x+2*k,torsoY+(-48+i*8)*k,1.2*k,1.2*k,'#8b6a3b');
 const hx=x+look*k,hy=torsoY+(talking?Math.sin(t*5)*1.4:Math.sin(t*1.2)*.5)*k;
 ellipse(hx,hy-79*k,14*k,18*k,'#e4be8e');ellipse(hx+4*k,hy-78*k,10*k,15*k,'#f2d5aa');
 path(variant===0?'M-15 -77 Q-22 -107 0 -105 Q20 -103 17 -78 L8 -91 Q-2 -83 -15 -77 Z':'M-16 -82 L-19 -90 L-9 -94 Q1 -108 14 -95 L19 -89 L19 -83 Z',hx,hy,'#31434a',k);
 if(variant===0)limb('M0 0 Q-14 24 -4 31 L3 8 Z',hx-15*k,hy-83*k,'#c2c4b0',Math.sin(t*2)*.045);
 ellipse(hx-3*k,hy-79*k,1.5*k,(blink?.35:2)*k,C.ink);ellipse(hx+7*k,hy-79*k,1.5*k,(blink?.35:2)*k,C.ink);
 if(talking)ellipse(hx+3*k,hy-69*k,2.5*k,(1+Math.abs(Math.sin(t*9))*2)*k,'#84503c');
 else line(hx,hy-69*k,hx+6*k,hy-69*k,'#a16a52',.8*k);
 const hold=Math.sin(t*1.4)*.035;
 limb('M0 0 Q-9 15 1 21 L21 23 L22 17 L4 12 L7 3 Z',x-13*k,torsoY-56*k,coat,hold);
 const bookX=x+6*k,bookY=torsoY-46*k;
 rect(bookX,bookY,18*k,23*k,'#e8d9b5');stroke(bookX,bookY,18*k,23*k,'#876c4d',.7*k);
 for(let i=0;i<3;i++)line(bookX+3*k,bookY+(6+i*4)*k,bookX+14*k,bookY+(6+i*4)*k,'#8c806340',.7*k);
}

function detailWorld(){
  if(g.chapter===3){morningWorld();return;}
  const detail=DETAILS[g.chapter]!,person=detail.citizen,nx=person.x-camera;
  if(nx>-90&&nx<W+90){citizenPortrait(nx,ground,1,person.id);text(person.name.split(',')[0]!,nx,ground-123,11,C.cream,'Mono','center');text(g.talked.includes(person.id)?'TESTIMONY KEPT':'E  LISTEN',nx,ground-106,8,C.gold,'Mono','center');}
  const station=detail.station,sx=station.x-camera;
  if(sx>-110&&sx<W+110){
    ellipse(sx,ground+2,52,5,'#07172260');
    rect(sx-36,ground-81,72,75,'#2a4650');rect(sx+22,ground-81,14,75,'#19343f');
    for(const sign of [-1,1]){rect(sx+sign*34-3,ground-82,6,80,'#a3895c');ellipse(sx+sign*34,ground-69,2,2,C.gold);}
    path('M-56 -94 L-49 -111 L49 -111 L56 -94 L53 -61 L-53 -61 Z',sx,ground,'#a28b61',1,'#ead2a0',1);
    rect(sx-47,ground-103,94,34,'#eee0ba');stroke(sx-43,ground-99,86,26,'#a48c62',.7);
    text(g.revision?station.edited:station.original,sx,ground-96,14,g.revision?C.red:C.ink,'Display','center');
    gear(sx-17,ground-33,15,clock*.6,'#be9b60');gear(sx+15,ground-33,15,-clock*.6,'#8eaa9a');
    if(g.revision)light(sx,ground-86,66,.5);
    text('PROOFREADER',sx,ground-135,8,C.cream,'Mono','center',.6);
  }
  for(const d of detail.drafts){const x=d.x-camera;if(x>W||x+d.w<0)continue;
    rect(x,ground-335,d.w,330,g.revision?'#6a7c6414':'#6a7c6408');
    for(let i=0;i<7;i++){const xx=x+15+i*d.w/8,yy=ground-((clock*90+i*47)%310);path('M-5 5 L0 0 L5 5 M0 0 L0 23',xx,yy,'#00000000',1,g.revision?'#d6e3b080':'#d6e3b030',1);}
    text(g.revision?'RISING DRAFT':'STILL AIR',x+d.w/2,ground-345,9,'#decb9e','Mono','center');
  }
  for(const p of detail.lifts){const pos=liftPosition(g,p);platform(pos.x,pos.y,p.w);const x=pos.x-camera;
    if(x>W+100||x+p.w< -100)continue;
    line(x+15,ground-pos.y,x+15,ground-pos.y-118,C.muted,1);line(x+p.w-15,ground-pos.y,x+p.w-15,ground-pos.y-118,C.muted,1);
    text(g.revision?'DELIVERY IN MOTION':'DELIVERY ON HOLD',x+p.w/2,ground-pos.y-39,8,C.red,'Mono','center');
  }
  if(g.chapter===2)for(const [x,y,w] of GHOST_BRIDGES){
    if(g.revision){platform(x!,y!,w!);text('POSSIBLE',x!+w!/2-camera,ground-y!-24,9,C.sage,'Mono','center');}
    else for(let i=0;i<w!;i+=17)line(x!+i-camera,ground-y!,x!+i+8-camera,ground-y!,'#6a7c6448',1);
  }
  for(const scrap of detail.scraps){if(g.memories.includes(scrap.id))continue;const x=scrap.x-camera,y=ground-scrap.y+Math.sin(clock*1.7+scrap.id)*4;
    if(x< -60||x>W+60)continue;light(x,y,42,.7);ring(x,y,20,'#f1d89a50');
    path('M-21 0 L-2 -9 L7 -3 L22 -16 L14 5 L2 10 L-1 3 L-13 9 Z',x,y,C.cream,1,C.sage,1.3);
    path('M-21 0 L2 2 L22 -16 M-2 -9 L2 10',x,y,'#00000000',1,C.sage,.7);
    if(Math.abs(g.x-scrap.x)<130)text('A STORY IN THE MARGIN',x,y-42,8,C.cream,'Mono','center');
  }
  for(const cx of [1035,2375]){const x=cx-camera;if(x< -30||x>W+30)continue;line(x,ground-55,x,ground,C.muted,1);path('M0 0 L29 0 L23 16 L0 16 Z',x,ground-55,g.checkpoint>=cx?C.sage:C.faint);text('¶',x+11,ground-55,13,C.cream,'Body','center');}
}
function morningWorld(){
  const a=g.afterword;
  for(const p of AFTERWORD.citizens){const x=p.x-camera;if(x< -90||x>W+90)continue;citizenPortrait(x,ground,1,p.id);text(p.name.split(',')[0]!,x,ground-120,11,C.cream,'Mono','center');}
  const nx=AFTERWORD.nursery-camera,open=a.restored.includes(0);
  if(nx>-170&&nx<W+170){
    rect(nx-90,ground-178,180,178,'#e1d0a6');rect(nx-84,ground-170,168,164,'#eddfbb');rect(nx+67,ground-171,18,170,'#ab98765c');rect(nx-85,ground-11,170,11,'#b5a17d');stroke(nx-90,ground-178,180,178,'#718c7b',1.5);image(grain,nx-89,ground-177,178,176,.6);
    path('M-109 -178 L0 -245 L109 -178 Z',nx,ground,'#2c555c',1,'#99a496',1);
    for(let i=0;i<4;i++){const yy=ground-187-i*13,hw=92-i*22;line(nx-hw,yy,nx+hw,yy,'#c1c4a640',1);}
    rect(nx-93,ground-178,186,6,'#b49861');
    for(let i=0;i<9;i++){const yy=ground-166+i*18;line(nx-84,yy,nx+65,yy,'#a6977250',.7);line(nx-84,yy+1,nx+65,yy+1,'#fff1d050',.7);}
    for(const sign of [-1,1]){rect(nx+sign*86-3,ground-170,6,163,'#87977b');line(nx+sign*86,ground-169,nx+sign*86,ground-10,'#c7c6a2',1.2);}
    rect(nx-61,ground-155,122,29,'#f9eac6');stroke(nx-61,ground-155,122,29,'#a78c59',.7);text('NURSERY',nx,ground-150,17,C.ink,'Display','center');
    path('M-30 0 L-30 -69 Q-30 -93 0 -93 Q30 -93 30 -69 L30 0 Z',nx,ground,'#8f9478');path('M-25 0 L-25 -69 Q-25 -87 0 -87 Q25 -87 25 -69 L25 0 Z',nx,ground,'#1a3540');
    rect(nx-25,ground-78,50,78,open?'#c2ae6475':C.ink);stroke(nx-25,ground-78,50,78,C.ink,1);
    if(open){path('M-25 0 L-25 -78 L-48 -65 L-48 0 Z',nx,ground,C.sage);text('OPEN',nx,ground-115,11,C.sage,'Mono','center');}
    else{ellipse(nx,ground-39,4,4,C.paper);rect(nx-2,ground-39,4,10,C.paper);}
    for(const sign of [-1,1]){const xx=nx+sign*57;if(open)light(xx,ground-79,56,.7);rect(xx-15,ground-99,30,40,'#71816e');rect(xx-12,ground-96,24,34,open?'#f4cc7e':'#728f8b');rect(xx-10,ground-94,7,28,'#e9dbac3c');line(xx,ground-96,xx,ground-62,'#d0bf91',1.6);line(xx-12,ground-80,xx+12,ground-80,'#d0bf91',1.6);rect(xx-18,ground-61,36,4,'#a89a74');line(xx-16,ground-60,xx+16,ground-60,'#e7d5a8',1);}
  }
  const wx=AFTERWORD.pump-camera,flow=a.restored.includes(1),phase=(g.time%4.2)/4.2*Math.PI*2;
  if(wx>-130&&wx<W+130){
    line(wx-69,ground,wx-49,ground-93,C.ink,4);line(wx+69,ground,wx+49,ground-93,C.ink,4);
    gear(wx,ground-64,60,flow?clock*.8:phase,C.sage);
    if(a.pumpOpen&&!flow){const start=[.8,2.5,1.5][Math.min(2,a.charges)]!;draw.strokeArc(wx*S,(ground-64)*S,69*S,start/4.2*Math.PI*2,(start+.9)/4.2*Math.PI*2,C.sage,4*S);line(wx,ground-64,wx+Math.cos(phase)*66,ground-64+Math.sin(phase)*66,valveWindow(g)?C.red:C.ink,3);}
    for(let i=0;i<3;i++)ellipse(wx-24+i*24,ground-158,5,5,i<a.charges?C.sage:C.faint);
    text(flow?'THE WATER RETURNS':!a.pumpOpen?'E  OPEN THE HOUSING':valveWindow(g)?'VANE ALIGNED — CRY':'LISTEN TO THE WHEEL',wx,ground-191,9,flow?C.sage:C.ink,'Mono','center');
  }
  const gx=2400-camera;
  if(gx>-350&&gx<W+350){
    rect(gx-320,ground-202,610,202,flow?'#5d948b38':'#263c442b');
    for(let i=0;i<5;i++){const xx=gx-313+i*122;path('M0 0 L100 0 L100 194 L0 194 Z',xx,ground-198,'#a8d3c117',1,'#d0d4b22a',.8);path('M4 4 L17 4 L17 185 L4 185 Z',xx,ground-198,'#f4eccb19');}
    rect(gx-325,ground-10,620,10,'#8b8662');
    path('M-345 -202 L-40 -324 L315 -202',gx,ground,'#00000000',1,flow?'#6a7c6465':'#77776935',1.3);
    for(let i=0;i<6;i++)line(gx-320+i*122,ground-202,gx-320+i*122,ground,'#6a7c6445',1);
    line(gx-320,ground-202,gx+290,ground-202,'#6a7c6445',1);
    text(flow?'THE GREENHOUSE IS SHARING ITS SEEDS':'THE GREENHOUSE NEEDS WATER',gx-10,ground-339,10,C.cream,'Mono','center');
  }
  for(let i=0;i<AFTERWORD.beds.length;i++){const x=AFTERWORD.beds[i]!-camera;if(x< -70||x>W+70)continue;
    rect(x-45,ground-7,90,14,C.ink);line(x-46,ground-8,x+46,ground-8,C.sage,2);
    if(a.beds.includes(i)){for(let j=-1;j<=1;j++){sprout(x+j*22,ground-8,.75+(i%2)*.2);const fy=ground-40-(i%2)*9;for(let p=0;p<5;p++)ellipse(x+j*22+Math.cos(p*1.256+clock*.05)*5,fy+Math.sin(p*1.256+clock*.05)*5,4,3,i===1?C.cream:'#bf8d55');ellipse(x+j*22,fy,2,2,C.ink);}}
    else{text('SEED BED '+(i+1),x,ground-45,9,C.sage,'Mono','center');line(x-44,ground-33,x-44,ground-9,C.sage,1);}
  }
  for(const p of AFTERWORD.items){if(a.items.includes(p.id))continue;const x=p.x-camera,y=ground-p.y+Math.sin(clock*1.5+p.id)*3;if(x< -80||x>W+80)continue;
    if(p.id===0){ring(x-9,y,8,'#aa874a',2);line(x-1,y,x+20,y,'#aa874a',3);line(x+12,y,x+12,y+7,'#aa874a',3);line(x+20,y,x+20,y+7,'#aa874a',3);text('THE NURSERY KEY',x,y-30,8,C.muted,'Mono','center');}
    else{rect(x-13,y-17,26,34,flow?C.cream:'#d0cbb8');stroke(x-13,y-17,26,34,flow?C.sage:C.faint,1);sprout(x,y+11,.4);if(!flow)text('WATER FIRST',x,y-40,8,C.muted,'Mono','center');}
  }
  const dx=AFTERWORD.desk-camera;
  if(dx>-100&&dx<W+100){rect(dx-43,ground-64,86,64,C.ink);rect(dx-50,ground-77,100,14,C.ink);rect(dx-33,ground-103,66,43,C.cream);stroke(dx-33,ground-103,66,43,C.ink,1);text(a.letterIssued?'FIRST':'A BLANK PAGE',dx,ground-91,a.letterIssued?19:8,C.red,'Display','center');text('ADA’S SMALL PRESS',dx,ground-130,9,C.sage,'Mono','center');}
  const px=AFTERWORD.postbox.x-camera,py=ground-AFTERWORD.postbox.y;
  if(px>-80&&px<W+80){rect(px-23,py-79,46,79,a.complete?C.sage:C.red);ellipse(px,py-79,23,12,a.complete?C.sage:C.red);rect(px-15,py-62,30,5,C.ink);path('M-13 -48 L13 -48 L13 -31 L-13 -31 Z M-13 -48 L0 -38 L13 -48',px,py,C.cream,1,C.ink,.6);text(a.complete?'THE LETTER IS AWAY':'THE ROOFTOP POST',px,py-116,9,C.sage,'Mono','center');}
  if(flow){
    for(const d of DETAILS[3]!.drafts){const x=d.x-camera;if(x>W||x+d.w<0)continue;for(let i=0;i<5;i++){const xx=x+15+i*d.w/6,yy=ground-(clock*85+i*67)%320;path('M-5 5 L0 0 L5 5 M0 0 L0 23',xx,yy,'#00000000',1,'#6a7c6460',1);}}
    path('M0 0 Q180 28 360 0 Q560 -22 760 0 Q950 23 1280 0',0,ground+24,'#00000000',1,'#718b8d80',2);
  }
  for(let i=0;i<a.restored.length*2;i++){const x=((clock*23+i*177)%(W+180))-90,y=ground+47+Math.sin(clock+i)*3;path('M-18 -5 L18 -5 L10 4 L-8 4 Z M-4 -6 L-4 -25 L12 -6 Z',x,y,C.cream,1,C.sage,.7);}
}
function finalPress(){
  if(g.chapter!==2)return;
  const left=3110-camera;if(left>W+100||left+1030< -100)return;
  rect(left-10,ground-344,1030,30,'#1c3541');line(left-10,ground-344,left+1020,ground-344,'#b7965e',2);line(left,ground-314,left+1010,ground-314,'#8b794e',1);
  for(const x of [left+12,left+998]){rect(x-14,ground-330,28,330,'#243e49');rect(x-11,ground-330,5,330,'#b0935b');rect(x+6,ground-330,6,330,'#0d2632');rect(x-25,ground-17,50,17,'#364c50');gear(x,ground-300,23,clock*.35,'#a98a55');}
  for(let i=0;i<12;i++){const x=left+65+i*79;ellipse(x,ground-329,2,2,'#c4a774');}
  text(g.boss.complete?'ANOTHER EDITION IS POSSIBLE':'NO FURTHER EDITIONS',left+505,ground-329,8,C.cream,'Mono','center',1);
  for(let i=0;i<3;i++){const p=PROOF_PLATES[i]!,x=p.x-camera,y=ground-p.y,done=g.boss.plates.includes(i),lit=bossVulnerable(g);
    if(lit&&!done){light(x,y-40,100,.8);ring(x,y-40,102,'#efb86b60',1);}
    rect(x-29,y-68,58,68,'#b0925a');rect(x-25,y-64,50,64,'#1c3641');rect(x-20,y-59,40,37,done?C.sage:lit?C.red:'#70827a');line(x-20,y-17,x+20,y-17,'#c2b385',2);
    text(done?'✓':String(i+1),x,y-58,27,C.cream,'Display','center');
    text(done?'CORRECTED':lit?'CRY NOW':'PROOF PLATE',x,y-85,8,done?'#b5d7b5':lit?C.gold:'#d5c9a7','Mono','center');
  }
  if(!g.boss.active||g.boss.complete)return;
  const t=bossPhase(g),x=g.boss.targetX-camera,warning=t<1.25,slam=t>=1.25&&t<1.8;
  if(warning||slam){
    rect(x-62,ground-310,124,310,slam?'#ad463740':'#ad463714');line(x-62,ground+3,x+62,ground+3,C.red,3);
    if(warning){text('!',x,ground-175,40,C.red,'Display','center');text('MOVE OR JUMP',x,ground-121,9,C.red,'Mono','center');}
  }
  const stampY=ground-(slam?80:303);rect(x-57,stampY,114,57,C.ink);text('LAST',x,stampY+7,30,C.cream,'Display','center');line(x,ground-325,x,stampY,C.ink,10);
}
function marginWorld(){
  const margin=MARGINS[g.chapter]!,solved=g.echoes.includes(g.chapter);
  if(solved){const [x,y,w]=margin.bridge;platform(x!,y!,w!);text('A CORRECTED MARGIN',x!+w!/2-camera,ground-y!-22,8,C.sage,'Mono','center');}
  const bells=bellPositions(g);
  for(let i=0;i<bells.length;i++){
    const p=bells[i]!,x=p.x-camera,y=ground-p.y,timer=g.echoTimers[i]!,color=solved?'#92c6ae':timer>0?C.gold:g.revision?'#e4c98f':'#8b9a91';
    if(x< -110||x>W+110)continue;
    if(g.revision)light(x,y-44,60,timer>0?.85:.3);ring(x,y-40,82,solved?'#b8ddbb18':'#ecd4a418',.7);
    path('M-18 -24 L-12 -30 L-12 -49 Q-12 -66 0 -66 Q12 -66 12 -49 L12 -30 L18 -24 Z',x,y,'#a7804b',1,color,1.8);
    path('M-8 -48 Q-8 -60 -2 -60 L-2 -31 L-8 -31 Z',x,y,'#efce8e70');line(x-13,y-28,x+13,y-28,'#f6d49a',1.5);
    ellipse(x,y-22,4,5,color);line(x,y-74,x,y-66,color,1.5);
    text(solved?'✓':String(i+1),x,y-52,16,color,'Display','center');
    text(solved?'ERRATA KEPT':timer>0?timer.toFixed(1)+'s':'MARGIN CHIME',x,y-113,8,color,'Mono','center');
    if(timer>0&&!solved)draw.strokeArc(x*S,(y-41)*S,29*S,-Math.PI/2,-Math.PI/2+Math.PI*2*timer/6.5,C.red,2*S);
  }
  for(const m of g.moths){
    const x=m.x-camera,y=ground-m.y;if(x< -100||x>W+100)continue;
    const c=m.stun>0?C.faint:m.alert>.8?C.red:C.ink,flap=m.stun>0?.85:Math.sin(clock*13+m.id)*.55;
    for(const sign of [-1,1]){
      const hinge=x+sign*4,angle=sign*flap;
      draw.path(sign<0?'M-4 0 Q-18 -22 -40 -15 L-27 9 L-7 6 Z':'M4 0 Q18 -22 40 -15 L27 9 L7 6 Z',x*S,y*S,{fill:C.cream,stroke:c,lineWidth:1.2,scale:S,rotation:angle,origin:{x:hinge*S,y:y*S}});
      const cs=Math.cos(angle),sn=Math.sin(angle),vx=sign*22,vy=-5;
      line(hinge+sign*5*cs,y+sign*5*sn,hinge+vx*cs-vy*sn,y+vx*sn+vy*cs,c,.6);
    }
    ellipse(x,y,6,12,c);line(x-3,y-10,x-11,y-20,c,1);line(x+3,y-10,x+11,y-20,c,1);
    text(m.stun>0?'?':m.alert>.8?'!':'…',x,y-39,13,c,'Body','center');
  }
  for(const t of g.sentries){
    const x=t.x-camera,recoil=t.stun>0?Math.sin(clock*7)*1.5:t.windup>0?-Math.sin(clock*22)*1.2:t.cooldown>2?-t.direction*3:0,y=ground-t.y+(t.stun>0?4:Math.sin(clock*2+t.id)*.8);if(x< -120||x>W+120)continue;
    const c=t.stun>0?C.muted:C.ink;
    for(const sign of [-1,1]){line(x,y-20,x+sign*24,y,C.ink,3);line(x+sign*24,y,x+sign*31,y,C.ink,3);}
    rect(x-21,y-65,42,49,c);rect(x-15,y-57,30,17,C.cream);text('NO',x,y-56,11,C.red,'Display','center');
    line(x+t.direction*10+recoil,y-42,x+t.direction*37+recoil,y-42+(t.windup>0?Math.sin(clock*15):0),c,9);ellipse(x,y-25,4,4,t.stun>0?C.faint:t.windup>0?C.red:C.sage);
    text(t.stun>0?'SILENCED':'REDACTOR',x,y-85,8,t.stun>0?C.muted:C.red,'Mono','center');
    if(t.windup>0&&t.stun===0){
      for(let d=42;d<380;d+=24)line(x+t.direction*d,y-47,x+t.direction*(d+9),y-47,'#ad463750',1);
      text('!',x+t.direction*53,y-57,20,C.red,'Display','center');
    }
  }
  for(const p of g.shots){const x=p.x-camera,y=ground-p.y;if(x< -50||x>W+50)continue;
    rect(x-15,y-9,30,18,p.reflected?C.sage:C.red);text(p.reflected?'IF':'NO',x,y-8,11,C.cream,'Mono','center');
    line(x-Math.sign(p.vx)*28,y,x-Math.sign(p.vx)*20,y,p.reflected?C.sage:C.red,2);
  }
}
function world(alpha:number){
  ground=H-(W<900?210:136);
  const c=CHAPTERS[g.chapter]!;
  const px=g.px+(g.x-g.px)*alpha,py=g.py+(g.y-g.py)*alpha;
  const target=clamp(px-W*.3,0,c.length-W+90);camera+=(target-camera)*.11;
  const shx=shake*Math.sin(clock*67)*4;
  camera+=shx;
  sceneBack();street(camera,ground,clock);
  for(const p of c.platforms)platform(p[0]!,p[1]!,p[2]!);
  for(const p of DETAILS[g.chapter]!.platforms)platform(p[0]!,p[1]!,p[2]!);
  detailWorld();
  marginWorld();
  for(const p of c.ink)hazardInk(p[0]!,p[1]!);
  for(const p of c.presses)press(p);
  for(const x of c.barriers)barrier(x);
  for(const e of g.enemies)censor(e,1);
  for(const m of g.motes){if(m.got||m.x-camera< -20||m.x-camera>W+20)continue;
    const x=m.x-camera,y=ground-m.y+Math.sin(clock*2+m.x)*4;
    light(x,y,22,.65);text('✦',x,y-10,18,C.gold,'Body','center');
  }
  for(const p of c.letters){if(g.letters.includes(p.id))continue;const x=p.x-camera,y=ground-p.y+Math.sin(clock*2)*4;
    if(x< -60||x>W+60)continue;
    light(x,y,65,.8);ring(x,y,31,'#e8b96960',1);rect(x-20,y-23,40,46,C.red);stroke(x-16,y-19,32,38,'#f4ecd770',.7);
    text('FIRST'[p.id]!,x,y-22,32,C.cream,'Display','center');
    line(x, y-42,x,y-34,C.red,.8);
  }
  finalPress();exitPress();
  // Caption plaques appear where they can be read without stopping movement.
  for(const m of c.memories){if(Math.abs(g.x-m.x)<185&&toastTime===0){
    const captionY=g.boss.active?148:110;
    rect(W/2-290,captionY-7,580,64,'#e7dfc9eb');
    draw.text(__displayText(m.text),(W/2)*S,captionY*S,__l10nDrawOptions({size:16*S,color:C.ink,font:__l10nFont('Body'),align:'center',maxWidth:540*S}));
  }}
  const blink=g.invincible>0&&Math.floor(clock*12)%2===0;
  if(!blink)baby(px-camera,ground-py,.88,heroMotion.time,Math.min(1,Math.abs(g.vx)/285),input.isDown('jump')&&g.vy<0&&!g.ground,g.facing,false,motionPose(heroMotion));
  if(g.chapter===3&&g.afterword.letterIssued&&!g.afterword.delivered){const x=px-camera+g.facing*23,y=ground-py-43;path('M-12 -9 L12 -9 L12 8 L-12 8 Z M-12 -9 L0 1 L12 -9',x,y,C.cream,1,C.sage,1);ellipse(x,y+3,2,2,C.red);}
  if(g.shield)ring(px-camera,ground-py-43,49,'#6a7c6465',1.5);
  if(g.pulse>0){const progress=1-g.pulse/.62;ring(px-camera,ground-py-43,15+progress*(cryRange(g)-15),'#ad4637'+Math.floor((1-progress)*180).toString(16).padStart(2,'0'),2);ring(px-camera,ground-py-43,10+progress*210,'#f4ecd780',1);}
  for(const p of particles){const x=p.x-camera,y=ground-p.y;if(x< -50||x>W+50)continue;text(p.glyph,x,y,14,p.red?C.red:C.ink,'Body');}
  hud();
  const action=contextAction(g);
  if(mode==='play'&&action.kind!=='none')button(action.label,W/2-200,ground+26,400,41,()=>use(),true,true);
  if(cut>0)rect(0,0,W,H,[.06,.12,.17,cut*.8]);
}
function hud(){
 if(g.chapter===3){morningHud();return;}
 const c=CHAPTERS[g.chapter]!,mobile=W<900;
 rect(0,0,W,91,'#0b1c27f5');line(24,90,W-24,90,'#d3af6e70');
 text('LAST EDITION',27,18,10,C.gold,'Mono','start',1.8);
 text(mobile?c.number+'  /  '+['NURSERY','FACTORY','PRESS'][g.chapter]:c.number+'  /  '+c.title,27,40,mobile?20:21,C.cream,'Display');
 for(let i=0;i<3;i++){path('M0 3 C-10 -5 -7 -12 0 -7 C7 -12 10 -5 0 3 Z',33+i*22,76,i<g.life?'#ce6c50':'#51656a',.7);}
 const breath=1-g.cry/cryCooldown(g);rect(114,72,70,3,'#3c535b');rect(114,72,70*breath,3,g.cry>0?'#79918f':C.gold);text(g.cry>0?'BREATH':'X  CRY',114,78,8,'#b9c5ba','Mono');
 const center=mobile?W*.51:W*.48;
 for(let i=0;i<5;i++){const x=center-80+i*34,got=g.letters.includes(i);rect(x,20,27,33,got?C.red:'#203641');stroke(x,20,27,33,got?'#e2946c':'#577073',.7);text('FIRST'[i]!,x+13.5,21,22,got?C.cream:'#82938b','Display','center');}
 const next=c.letters.find(p=>!g.letters.includes(p.id));
 text(next?'FIND '+ 'FIRST'[next.id]+'  '+(next.x>g.x?'→':'←'):'FIND THE PRESS →',center,64,8,C.gold,'Mono','center',.6);
 text(String(g.total).padStart(4,'0')+' INK',W-28,17,11,C.cream,'Mono','end');
 const by=45;
 hudButton('JOURNAL',W-239,by,91,openJournal);hudButton('NOTES',W-140,by,69,openWorkshop);hudButton('Ⅱ',W-63,by,36,()=>setMode('pause'));
 text(g.memories.length+'/9 STORIES',W-28,77,8,'#a8bcb1','Mono','end');
 if(hasUpgrade(g,'coat'))text(g.shield?'COAT READY':'COAT STAINED',210,71,8,'#b4c6a9','Mono');
 const trackY=H-24;
 rect(0,H-51,W,51,'#0a1a25ed');line(30,trackY,W-30,trackY,'#4b666a',1);
 for(const p of c.letters){const x=30+(W-60)*p.x/c.length;ellipse(x,trackY,3,3,g.letters.includes(p.id)?C.gold:'#65817d');}
 ellipse(30+(W-60)*g.x/c.length,trackY,4,4,C.cream);
 if(!mobile&&!input.touchControlsVisible())text('A D  MOVE    SPACE  JUMP / GLIDE    X  CRY    E  USE    TAB  JOURNAL    B  NOTES',W/2,H-44,8,'#9fb4ac','Mono','center',.4);
 if(g.boss.active){const phase=bossPhase(g),status=g.boss.complete?'ALL PROOFS CORRECTED':bossVulnerable(g)?'RECOVERY — CRY AT A PROOF PLATE':phase<1.25?'STAMP INCOMING — MOVE':phase<1.8?'STAMP FALLING — GET CLEAR':'PRESS RESETTING — PREPARE';statusPlaque(status+'  ·  '+g.boss.plates.length+'/3',106);}
 else {const timer=Math.max(...g.echoTimers);if(timer>0)statusPlaque('CARRY THE NOTE — '+timer.toFixed(1)+'s',106);}
 showToast();
}
function hudButton(label:string,x:number,y:number,w:number,action:()=>void){
 const h=W<900?32:26,p=input.pointer(),over=p&&p.x/S>=x&&p.x/S<=x+w&&p.y/S>=y&&p.y/S<=y+h;
 rect(x,y,w,h,over?'#406065':'#243c46');stroke(x,y,w,h,'#82968b50',.7);text(label,x+w/2,y+7,W<900?12:9,C.cream,'Mono','center');hits.push({x,y,w,h,action});
}
function statusPlaque(label:string,y:number){const w=Math.min(W-60,680);rect((W-w)/2,y,w,30,'#112b36ed');line((W-w)/2,y,(W+w)/2,y,'#d7aa68');text(label,W/2,y+9,9,C.gold,'Mono','center',.5);}
function showToast(){
 if(toastTime<=0)return;
 const tw=Math.min(W-80,690),ty=g.boss.active?148:110;
 rect((W-tw)/2+3,ty+3,tw,55,'#07131e60');rect((W-tw)/2,ty,tw,55,'#f5e8cedf');rect((W-tw)/2,ty,3,55,C.red);
 draw.text(__displayText(toast),W/2*S,(ty+13)*S,__l10nDrawOptions({size:14*S,color:C.ink,font:__l10nFont('Body'),align:'center',maxWidth:(tw-40)*S}));
}

function morningHud(){
 const a=g.afterword;
 rect(0,0,W,91,'#102c33f5');line(24,90,W-24,90,'#d3af6e70');
 text('LAST EDITION',27,18,10,C.gold,'Mono','start',1.5);text('IV  /  The First Morning',27,40,W<900?16:21,C.cream,'Display');
 text(a.restored.length+' / 4 RESTORED',27,72,8,'#b9cfb5','Mono');
 const center=W*.49;
 for(let i=0;i<4;i++){const x=center-150+i*77,done=a.restored.includes(i);text((done?'✓ ':'○ ')+AFTERWORD.tasks[i],x,26,9,done?C.gold:'#b1c2b4','Mono');}
 text('SEEDS '+seedsInBag(g)+(a.letterIssued&&!a.delivered?'  /  LETTER IN POCKET':''),center,64,8,'#d5d3b5','Mono','center');
 text(g.total+' INK',W-28,17,11,C.cream,'Mono','end');hudButton('JOURNAL',W-165,45,91,openJournal);hudButton('Ⅱ',W-63,45,36,()=>setMode('pause'));
 rect(0,H-51,W,51,'#102b32ef');text(morningObjective(g),W/2,H-40,10,C.cream,'Mono','center');
 if(a.letterIssued&&!a.delivered)text(a.bestFlight>=350?'SKY POST READY':'SKY POST '+Math.min(100,Math.round(a.bestFlight/350*100))+'%',W-28,73,8,C.gold,'Mono','end');
 showToast();
}

function panel(titleText:string,sub:string){
 rect(0,0,W,H,'#071722b8');const pw=Math.min(W-70,730),x=(W-pw)/2,y=Math.max(90,(H-525)/2);
 rect(x+9,y+12,pw,525,'#030b1360');rect(x,y,pw,525,C.paper);rect(x+7,y+7,pw-14,511,C.cream);stroke(x,y,pw,525,'#b69b68',1.2);stroke(x+12,y+12,pw-24,501,'#b5a48170',.7);
 rect(W/2-25,y,50,4,C.red);text(sub,W/2,y+35,10,C.red,'Mono','center',2);text(titleText,W/2,y+73,38,C.ink,'Display','center');
 line(x+40,y+140,x+pw-40,y+140,'#b69b68',.8);ellipse(W/2,y+140,3,3,C.red);
 return {x,y,pw};
}

function modal(){
  if(mode==='pause'){
    const {y}=panel('The presses can wait.','INTERMISSION');
    text(g.memories.length+' / 9 memories  ·  '+g.talked.length+' / 3 testimonies',W/2,y+170,17,C.muted,'Body','center');
    button('CONTINUE THE STORY',W/2-175,y+228,350,54,()=>setMode('play'),true);
    button('FIELD JOURNAL',W/2-175,y+303,165,47,openJournal,false,true);
    button('HOW TO PLAY',W/2+10,y+303,165,47,()=>{back='pause';setMode('help');},false,true);
    button('UPGRADES',W/2-175,y+372,130,44,openWorkshop,false,true);
    button('RETRY',W/2-30,y+372,95,44,retry,false,true);
    button(mute?'MUTED':'SOUND',W/2+80,y+372,95,44,toggleSound,false,true);
    link('Return to the front page',W/2-125,y+456,290,()=>{save();setMode('title');});
  }
  if(mode==='lost'){
    const {y}=panel('Not the final word.','EDITION WITHDRAWN');
    baby(W/2,y+281,1,clock,0,false,1,true);
    text('Every good story survives a rough draft.',W/2,y+305,19,C.ink,'Body','center');
    text('Your letters, stories and proof plates are safe.',W/2,y+342,12,C.muted,'Mono','center');
    button('RETURN TO CHECKPOINT  →',W/2-200,y+397,400,54,retry,true);
    link('Return to the front page',W/2-127,y+474,280,()=>setMode('title'));
  }
  if(mode==='chapter'){
    const c=CHAPTERS[g.chapter]!,n=CHAPTERS[g.chapter+1]!;const {y}=panel('A correction is issued.','CORRECTION NO. '+c.number);
    text('“'+c.correction+'”',W/2,y+180,22,C.ink,'Body','center');
    const report=chapterReport(g);
    text('STORIES '+report.memories+'/3  ·  INK '+report.ink+'/20  ·  '+report.seconds+'s',W/2,y+241,13,C.muted,'Mono','center');
    text(report.medals.map((v,i)=>v?['UNBLOTTED','WELL READ','ALL STORIES'][i]:'—').join('  /  '),W/2,y+276,11,C.sage,'Mono','center');
    text('MARGIN CHALLENGES: +'+report.bonus+' INK',W/2,y+308,10,C.red,'Mono','center');
    text(g.chapter===2?'THE PRESS IS QUIET. THE CITY IS STILL WAITING.':'NEXT: '+n.title.toUpperCase(),W/2,y+355,12,C.ink,'Mono','center',1);
    button('TURN THE PAGE  →',W/2-185,y+403,370,55,nextChapter,true);
  }
  if(mode==='dialogue'){
    const person=g.chapter===3?AFTERWORD.citizens[g.afterword.speaker]!:DETAILS[g.chapter]!.citizen,{y}=panel(person.name,person.role);
    citizenPortrait(W/2,y+280,1.2,person.id,true);
    const lines=dialogueLines();
    draw.text(__displayText(lines[dialoguePage]!),W/2*S,(y+303)*S,__l10nDrawOptions({size:18*S,color:C.ink,font:__l10nFont('Body'),align:'center',maxWidth:570*S}));
    text((g.chapter===3?'CONVERSATION ':'TESTIMONY ')+(dialoguePage+1)+' / '+lines.length,W/2,y+422,9,C.red,'Mono','center',1);
    button(dialoguePage===lines.length-1?'KEEP THESE WORDS  →':'E  LISTEN  →',W/2-175,y+452,350,46,advanceDialogue,true,true);
  }
}
function dialogueLines(){
  if(g.chapter===3){const id=g.afterword.speaker,p=AFTERWORD.citizens[id]!;
    if(id===2&&g.afterword.delivered)return ['“'+AFTERWORD.headlines[g.afterword.headline]+'.” The words are on their way.','The next edition will need other voices. I have left room on the page for them.'];
    if(g.afterword.restored.includes(id))return [
      ['The door is open. That is a small thing to say after all that happened. It is a very large thing to do.','I will leave a light in the window. Someone may need to find us before they have learned the city’s name.'],
      ['Look at the wheel. An honest machine: it turns because water moves through it, not because someone announced that it must.','I think my next forecast will include a garden. The people can decide what to plant.'],
      ['The garden has begun. Now tell me what you want the first letter to say.','There is room on the page for more than a warning. Take the words to the rooftop postbox when you are ready.']
    ][id]!;
    return p.lines;
  }
  const d=DETAILS[g.chapter]!,thanks=['All three cranes, safe. I will put them back above the cradles. We can open the nursery again.','You found the missing pages. Perhaps tomorrow we can print a forecast with room for doubt.','Every missing story returned. A city of names will outlast a headline.'];return d.scraps.every(p=>g.memories.includes(p.id))?[...d.citizen.lines,thanks[g.chapter]!]:d.citizen.lines;
}
function advanceDialogue(){if(dialoguePage<dialogueLines().length-1)dialoguePage++;else{if(g.chapter===3){if(!g.afterword.heard.includes(g.afterword.speaker))g.afterword.heard.push(g.afterword.speaker);}else keepTestimony(g);setMode('play');notify(g.chapter===3?'The morning conversation stays in the city.':'Testimony kept in the field journal.');save();}}
function journal(){
  if(journalChapter===-1){morningJournal();return;}
  paper();const mobile=W<900,detail=DETAILS[journalChapter]!,person=detail.citizen,pw=W-100;
  text('THE FIELD JOURNAL',50,98,12,C.red,'Mono','start',2);
  if(g.chapter===3)button('FIRST MORNING',W-245,89,195,35,()=>journalChapter=-1,false,true);
  text('Stories in the margins.',50,135,mobile?42:54,C.ink,'Display');
  text(g.memories.length+' / 9 MEMORIES   ·   '+g.talked.length+' / 3 TESTIMONIES',50,205,12,C.sage,'Mono');
  const tabWidth=(pw-20)/3;
  for(let i=0;i<3;i++)button(CHAPTERS[i]!.number+'  '+(mobile?['NURSERY','FACTORY','PRESS'][i]:CHAPTERS[i]!.title.toUpperCase()),50+i*(tabWidth+10),240,tabWidth,39,()=>{journalChapter=i;selectedMemory=-1;},journalChapter===i,true);
  const reading=mobile&&selectedMemory!==-1;
  const listW=mobile?pw:pw*.43,readX=mobile?58:W*.5,readY=mobile?(reading?310:517):310,readW=mobile?W-116:W*.5-68;
  if(!reading)for(let i=0;i<3;i++){
    const p=detail.scraps[i]!,found=g.memories.includes(p.id),yy=308+i*65;
    button(found?p.title:'A folded memory — undiscovered',50,yy,listW,53,()=>{selectedMemory=p.id;},selectedMemory===p.id,true);
    text(found?'✓':'?',50+listW-20,yy+17,13,selectedMemory===p.id?C.cream:C.sage,'Mono','end');
  }
  const chosen=detail.scraps.find(p=>p.id===selectedMemory),known=chosen&&g.memories.includes(chosen.id),testimony=selectedMemory===-2&&g.talked.includes(person.id);
  draw.text(__displayText(testimony?person.name:known?chosen!.title:selectedMemory<0?'A city is made of people.':'A page is still missing.'),readX*S,readY*S,__l10nDrawOptions({size:25*S,color:C.ink,font:__l10nFont('Display'),maxWidth:readW*S}));
  if(!mobile||reading||H>=1050)draw.text(__displayText(testimony?person.lines[journalPage]!:known?chosen!.body:selectedMemory<0?'Follow the folded cranes on the upper routes. Each recovered memory restores one life and keeps a small human story from being erased.':'Look above the ordinary route. A rising draft, an airborne cry, or a newly possible bridge can take you into the margins.'),readX*S,(readY+76)*S,__l10nDrawOptions({size:18*S,color:C.muted,font:__l10nFont('Body'),maxWidth:readW*S}));
  if(testimony)button('NEXT PAGE  '+(journalPage+1)+' / '+person.lines.length,readX,readY+220,220,33,()=>{journalPage=(journalPage+1)%person.lines.length;},false,true);
  if(reading)button('← MEMORIES',W-218,readY+220,160,33,()=>{selectedMemory=-1;},false,true);
  text(g.echoes.includes(journalChapter)?'ERRATA CORRECTED · SHORTCUT OPEN':'ERRATA: TWO CHIMES / ONE FADING NOTE',50,mobile?H-247:520,10,g.echoes.includes(journalChapter)?C.sage:C.muted,'Mono');
  if(g.talked.includes(person.id))button('READ TESTIMONY: '+person.name,50,H-217,Math.min(pw,490),34,()=>{selectedMemory=-2;journalPage=0;},false,true);
  else text('TESTIMONY MISSING: '+person.name,50,H-194,12,C.muted,'Mono');
  const report=g.reports.find(p=>p.chapter===journalChapter)??(journalChapter===g.chapter?chapterReport(g):null);
  const names=['UNBLOTTED','WELL READ','ALL STORIES'];
  for(let i=0;i<3;i++){const x=50+i*(pw/3),earned=report?.medals[i];
    text((earned?'✓  ':'○  ')+names[i],x,H-156,12,earned?C.sage:C.muted,'Mono');
    text(['No damage','Collect 12 ink motes','Find all 3 memories'][i]!,x,H-131,10,C.muted,'Mono');
  }
  button('←  BACK TO THE STORY',50,H-85,310,50,()=>setMode(back),true);
  text('CHALLENGE STAMPS AWARD 75 INK EACH',W-50,H-63,9,C.muted,'Mono','end');
}
function morningJournal(){
  paper();text('THE AFTERWORD',50,98,12,C.sage,'Mono','start',2);text('A city to wake.',50,135,W<900?48:58,C.ink,'Display');
  text(g.afterword.restored.length+' / 4 RESTORATIONS  ·  '+g.afterword.heard.length+' / 3 MORNING CONVERSATIONS',50,209,W<900?10:12,C.sage,'Mono');
  const jobs=[['THE NURSERY','Find the key on the old roof and return to Mara’s door.'],['THE WATERWHEEL','Open the housing and sing three notes when the marked vane turns green.'],['THE GARDEN','Collect three seed packets from the watered greenhouse and plant the three beds.'],['THE FIRST LETTER','Choose the words with Ada, then carry the letter to the high postbox.']];
  for(let i=0;i<4;i++){const y=263+i*91,done=g.afterword.restored.includes(i);text((done?'✓  ':'○  ')+jobs[i]![0],50,y,20,done?C.sage:C.ink,'Display');draw.text(__displayText(jobs[i]![1]!),50*S,(y+34)*S,__l10nDrawOptions({size:16*S,color:C.muted,font:__l10nFont('Body'),maxWidth:(W-110)*S}));line(50,y+74,W-50,y+74,'#b4af9c55');}
  button('READ THE STORY ARCHIVE',50,H-153,350,40,()=>{journalChapter=0;selectedMemory=-1;},false,true);
  button('←  BACK TO THE CITY',50,H-85,310,50,()=>setMode(back),true);
}
function composePage(){
  paper();text('ADA’S SMALL PRESS',50,98,12,C.red,'Mono','start',2);text('Words for the morning.',50,138,W<900?42:57,C.ink,'Display');
  text('Choose what the first new letter carries into the world.',50,220,W<900?16:21,C.muted,'Body');
  const descriptions=['A beginning is something we can make together.','Leave room for people who have not arrived yet.','Keep the people who were lost inside the headline.'];
  for(let i=0;i<3;i++){const y=285+i*119;button(AFTERWORD.headlines[i]!,50,y,W-100,64,()=>writeHeadline(i),g.afterword.headline===i);text(descriptions[i]!,66,y+80,W<900?14:17,C.muted,'Body');}
  button('←  RETURN TO THE CITY',50,H-85,330,50,()=>setMode('play'),false,true);
}
function workshop(){
  paper();const mobile=W<900;
  text('MARGINALIA',50,98,12,C.red,'Mono','start',2);
  text('A few useful notes.',50,135,mobile?43:58,C.ink,'Display');
  text(availableInk(g)+' INK AVAILABLE  /  '+g.total+' FOUND',50,208,14,C.sage,'Mono');
  if(mobile){button('EAR & BREATH',50,247,280,35,()=>shopPage=0,shopPage===0,true);button('COAT & VOICE',W-330,247,280,35,()=>shopPage=1,shopPage===1,true);}
  const shown=mobile?UPGRADES.slice(shopPage*2,shopPage*2+2):UPGRADES;
  for(let i=0;i<shown.length;i++){
    const u=shown[i]!,owned=hasUpgrade(g,u.id),col=mobile?0:i%2,row=mobile?i:Math.floor(i/2),cw=mobile?W-100:(W-130)/2;
    const cardHeight=mobile&&H<900?150:169;
    const x=50+col*(cw+30),y=(mobile?308:273)+row*(cardHeight+22);
    rect(x,y,cw,cardHeight,C.cream);stroke(x,y,cw,cardHeight,owned?C.sage:C.faint,1);
    text(u.name,x+20,y+17,mobile?23:25,C.ink,'Display');
    draw.text(__displayText(u.description),(x+20)*S,(y+57)*S,__l10nDrawOptions({size:(mobile?14:15)*S,color:C.muted,font:__l10nFont('Body'),maxWidth:(cw-195)*S}));
    button(owned?'WRITTEN':String(u.cost)+' INK',x+cw-155,y+65,135,43,()=>purchase(u.id),!owned&&availableInk(g)>=u.cost,true);
    text(owned?'KEPT FOR THIS EDITION':u.label,x+20,y+cardHeight-25,9,owned?C.sage:C.muted,'Mono');
  }
  text(shopMessage||'Spend earned ink. Your total score keeps every drop you found.',50,H-143,12,shopMessage?C.red:C.muted,'Mono');
  button('←  BACK TO THE STORY',50,H-85,310,50,()=>setMode(back),true);
  text('NOTES LAST FOR THE WHOLE EDITION',W-50,H-62,9,C.muted,'Mono','end');
}
function howTo(){
  paper();const x=Math.max(46,(W-950)/2),right=W<900?W-45:x+950;
  text('A FIELD GUIDE FOR SMALL EDITORS',x,98,12,C.red,'Mono','start',1.5);
  text(guidePage?'Listen before you leap.':'Outgrow the headline.',x,137,W<900?42:58,C.ink,'Display');
  button(guidePage?'CONTROLS':'FIELD NOTES',right-195,195,195,27,()=>guidePage=1-guidePage,false,true);
  line(x,223,right,223,C.ink,1.5);
  if(guidePage){
    const notes=[['RUMOUR MOTHS','They notice a long flight before they pursue it. Land to break their interest, or cry while their paper wings are still within reach.'],['REDACTION SENTRIES','A red aiming line comes before the ink. Jump over the word NO, or cry near it to send IF back to the machine that fired it.'],['THE MARGIN CHIMES','Edit the district’s rule, then cry close to each of its two chimes within 6.5 seconds. The second note unfolds a shortcut and awards 150 ink.']];
    for(let i=0;i<notes.length;i++){const n=notes[i]!,y=252+i*119;text(n[0]!,x,y,22,C.ink,'Display');draw.text(__displayText(n[1]!),x*S,(y+38)*S,__l10nDrawOptions({size:(W<900?16:18)*S,color:C.muted,font:__l10nFont('Body'),maxWidth:(right-x)*S}));}
    text('B opens marginalia. Spend ink to shape this edition’s abilities.',x,655,W<900?11:13,C.red,'Mono');
    button('←  BACK TO THE STORY',x,Math.max(710,H-100),310,52,()=>setMode(back),true);return;
  }
  const rows=[['01','EXPLORE','A / D  or  ← / →','Red type advances the story. Folded cranes preserve memories.'],['02','JUMP & GLIDE','SPACE  /  W  /  ↑','Hold while falling. Rising drafts carry your open ears upward.'],['03','RAISE YOUR VOICE','X  /  J','Stun censors, break barriers, or gain one extra lift per flight.'],['04','MAKE A CORRECTION','E  /  ENTER','Talk, edit world rules, and operate the presses.']];
  for(let i=0;i<rows.length;i++){
    const r=rows[i]!,y=247+i*90;
    text(r[0]!,x,y,13,C.red,'Mono');text(r[1]!,x+52,y,18,C.ink,'Display');
    text(r[2]!,right,y,13,C.red,'Mono','end');text(r[3]!,x+52,y+37,W<900?14:17,C.muted,'Body');
    line(x,y+80,right,y+80,'#b4af9c70');
  }
  text('Avoid ink pools and falling presses. Three lives per chapter.',x,640,13,C.muted,'Mono');
  text('TAB / N: journal.  B: upgrades.  P: pause.  R: retry.',x,669,13,C.muted,'Mono');
  button('←  BACK TO THE STORY',x,Math.max(710,H-100),310,52,()=>setMode(back),true);
}
function archive(){
  paper();const mobile=W<900;
  text('FROM THE ARCHIVE',45,100,12,C.red,'Mono','start',2);
  text('Yesterday’s tomorrow.',45,140,mobile?43:57,C.ink,'Display');
  line(45,224,W-45,224,C.ink,1.5);
  const iw=mobile?230:330,ih=iw*1536/1450;
  if(clipping)draw.image(clipping,45*S,260*S,iw*S,ih*S);
  const tx=mobile?310:425;
  text('A PREDICTION IS',tx,264,mobile?21:30,C.ink,'Display');
  text('NOT A PROPHECY.',tx,305,mobile?21:30,C.red,'Display');
  const paras=[
    'A newspaper clipping imagines the last child born in 2012: enormous head, bat-like ears, a future reduced to a caricature.',
    'This game turns that drawing into someone with a future. The traits presented as warnings become the tools of his escape.',
    'Its world is fiction. The clipping’s social and biological claims are the bad assumptions our little editor is here to undo.'
  ];
  let yy=370;
  for(const p of paras){draw.text(__displayText(p),tx*S,yy*S,__l10nDrawOptions({size:(mobile?16:19)*S,color:C.muted,font:__l10nFont('Body'),maxWidth:(W-tx-55)*S}));yy+=mobile?133:113;}
  text('REFERENCE: THE IMAGE YOU SUPPLIED',45,260+ih+25,10,C.muted,'Mono','start',.5);
  button('←  BACK TO THE STORY',45,Math.max(710,H-100),310,52,()=>setMode(back),true);
}
function ending(){
  backdrop(3,camera,clock,H-75,true);
  rect(30,78,W-60,H-95,'#f3e8cfe8');stroke(39,87,W-78,H-113,'#a8926155',1);
  const mobile=W<900;
  text('THE FIRST MORNING',W/2,116,12,C.sage,'Mono','center',2);
  text('FIRST BABY',W/2,166,mobile?68:85,C.ink,'Display','center');
  const complete=g.memories.length===9&&g.talked.length===3;
  const unwritten=complete&&g.echoes.length===3;
  text(unwritten?'OF THE UNWRITTEN EDITION':complete?'OF A CITY THAT REMEMBERS':'OF A FUTURE STILL UNWRITTEN',W/2,267,mobile?20:27,C.red,'Display','center');
  line(W*.17,326,W*.83,326,C.ink,1.4);
  text(AFTERWORD.headlines[g.afterword.headline]??'WE BEGIN AGAIN',W/2,358,mobile?28:35,C.sage,'Display','center');
  text('A door opened. Water returned. Something began to grow.',W/2,410,mobile?18:24,C.ink,'Body','center');
  text(unwritten?'Every story, every voice, every margin. The next page belongs to everyone.':complete?'Every story kept. Every voice heard. The nursery opens again.':g.memories.length+' of 9 stories kept. There are still people to remember.',W/2,448,mobile?12:16,complete?C.sage:C.muted,'Body','center');
  const fy=H-172;baby(W/2,fy,1.3,clock,0,true);
  for(let i=0;i<9;i++)sprout(W/2-200+i*50,fy+8,.6+(i%3)*.3);
  text(g.total+' INK  /  '+g.reports.reduce((n,p)=>n+p.medals.filter(Boolean).length,0)+' CHALLENGE STAMPS'+(g.afterword.courierBonus?'  /  SKY POST':''),W/2,fy+23,11,C.ink,'Mono','center');
  button('WALK THE CITY  →',W/2-200,H-105,400,49,()=>{g.result=null;setMode('play');save();},true);
  link('Print a new edition',W/2-90,H-36,220,()=>start(false));
}
onRender(__l10nRender(alpha=>{
  if(!ready)return;
  const f=frame();if(f.width===0||f.height===0)return;viewport(f.width,f.height);hits=[];
  if(mode==='title')title();
  else if(mode==='help')howTo();
  else if(mode==='archive')archive();
  else if(mode==='journal')journal();
  else if(mode==='workshop')workshop();
  else if(mode==='compose')composePage();
  else if(mode==='won')ending();
  else {world(alpha);if(mode!=='play'){hits=[];modal();}}
  image(grain,0,0,W,H,.22);
  const p=input.pointer();let hover=false;
  if(p)hover=hits.some(h=>p.x/S>=h.x&&p.x/S<=h.x+h.w&&p.y/S>=h.y&&p.y/S<=h.y+h.h);
  input.setCursor(hover?'pointer':'default');
}));

// localization-runtime:menu
import { installLanguageMenu as __installLanguageMenu } from "./l10n/menu.js";
__installLanguageMenu(true);
