import {frame,onStart,onFixedUpdate,onRender,onSuspend,setFixedRate} from 'starhermit:engine';
import * as input from 'starhermit:input';
import * as draw from 'starhermit:draw';
import {createImageBitmap} from 'starhermit:canvas';
import type {ImageBitmap} from 'starhermit:canvas';
import {loadClip,play} from 'starhermit:audio';
import type {AudioClip,Sound} from 'starhermit:audio';
import {storage} from 'starhermit:storage';
import {CHAPTERS,DETAILS,GHOST_BRIDGES,PROOF_PLATES,MARGINS,UPGRADES,AFTERWORD,createGame,stepGame,jump,cry,interact,canExit,pressPhase,clamp,liftPosition,bossPhase,bossVulnerable,contextAction,chapterReport,snapshot,restore,revive,keepTestimony,availableInk,buyUpgrade,cryCooldown,cryRange,bellPositions,hasUpgrade,chooseHeadline,seedsInBag,valveWindow,morningObjective} from './model.js';
import {C,S,W,H,viewport,rect,stroke,line,ellipse,ring,path,text,image,loadArt,grain,city,baby,gear,sprout} from './art.js';

type Mode='title'|'play'|'pause'|'help'|'archive'|'chapter'|'lost'|'won'|'journal'|'dialogue'|'workshop'|'compose';
type Hit={x:number;y:number;w:number;h:number;action:()=>void};
type Particle={x:number;y:number;vx:number;vy:number;life:number;max:number;glyph:string;red:boolean};
let mode:Mode='title',back:Mode='title',g=createGame(),clock=0,camera=0,ground=650,ready=false;
let hits:Hit[]=[],particles:Particle[]=[],toast='',toastTime=0,shake=0,cut=1;
let lastTouch=-10;
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
function controls(){input.setTouchControls(mode==='play'?[
  {kind:'button',action:'left',label:'←',anchor:'bottom-left',offset:[55,68],radius:35},
  {kind:'button',action:'right',label:'→',anchor:'bottom-left',offset:[137,68],radius:35},
  {kind:'button',action:'cry',label:'CRY',anchor:'bottom-right',offset:[148,68],radius:33},
  {kind:'button',action:'jump',label:'JUMP',anchor:'bottom-right',offset:[55,105],radius:42},
  {kind:'button',action:'interact',label:'USE',anchor:'bottom-right',offset:[56,31],radius:25}
]:null);}
function setMode(m:Mode){mode=m;controls();input.setCursor('default');}
function start(resume=false){
  g=resume&&saved?restore(snapshot(saved))!:createGame();camera=Math.max(0,g.x-W*.3);cut=1;particles=[];toast=CHAPTERS[g.chapter]!.intro;toastTime=6;
  setMode(g.chapter<3&&g.reports.some(p=>p.chapter===g.chapter)?'chapter':'play');startMusic();save();
}
function retry(){
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
function nextChapter(){g=createGame(g.chapter+1,g.letters,g.total,g.memories,g.talked,g.reports,g);camera=0;particles=[];cut=1;setMode('play');notify(CHAPTERS[g.chapter]!.intro,6);save();}
function openJournal(){back=mode;journalChapter=g.chapter===3?-1:g.chapter;selectedMemory=-1;journalPage=0;setMode('journal');}
function beginAfterword(){g=createGame(3,[0,1,2,3,4],record);camera=0;cut=1;particles=[];setMode('play');startMusic();notify(CHAPTERS[3]!.intro,6);save();}
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
  if(primary){rect(x+4,y+4,w,h,'#292c2830');rect(x,y,w,h,over?C.red:C.ink);text(label,x+w/2,y+(h-(small?16:19))/2-1,small?16:19,C.cream,'Mono','center',small?0:1);}
  else {if(over)rect(x,y,w,h,'#292c2810');stroke(x,y,w,h,C.ink);text(label,x+w/2,y+(h-(small?15:18))/2-1,small?15:18,C.ink,'Mono','center');}
  hits.push({x,y,w,h,action});
}
function link(label:string,x:number,y:number,w:number,action:()=>void){
  text(label,x,y,14,C.muted,'Mono');hits.push({x,y:y-8,w,h:34,action});
}
function paper(){
  rect(0,0,W,H,C.paper);image(grain,0,0,W,H);
  // The borders resemble a worn newspaper's plate registration.
  line(28,27,W-28,27,C.ink,1.4);line(28,31,W-28,31,C.ink,.5);
  text('THE DEPARTMENT OF UNWRITTEN FUTURES',40,43,11,C.muted,'Mono','start',1.5);
  text('VOL. 2012   /   NO. 001',W-40,43,11,C.muted,'Mono','end',1.1);
}
function sceneBack(menu=false){
  const base=menu?H-100:ground;
  // A muted red eclipse, like an over-inked sun on an old printing plate.
  const sunx=menu?W*.76:W*.72-camera*.04;
  const morning=g.chapter===3&&mode!=='title';
  ellipse(sunx,base-285,118,118,morning?'#b49a4b35':'#ad463717');ring(sunx,base-285,124,morning?'#b49a4b40':'#ad463728',.7);
  for(let i=0;i<8;i++)line(sunx-130,base-320+i*13,sunx+130,base-320+i*13,'#e7dfc94f',3);
  const offset=menu?W*.27:-((camera*.22)%1800);
  image(city,offset,base-435,1800,500,.68);
  if(!menu)image(city,offset+1800,base-435,1800,500,.68);
  // Engraved telegraph wires.
  path('M0 0 Q310 92 650 0 Q970 90 1280 0',0,base-260,'#00000000',1,'#53635550',1);
  for(let i=0;i<16;i++){
    const x=((i*181.7+clock*(4+i%3)-camera*.08)%(W+200))-100;
    const y=140+((i*67)%Math.max(100,base-220))+Math.sin(clock*.5+i)*10;
    text(['a','e','?','s','·','r'][i%6]!,x,y,12+i%4*3,'#5c66573d','Body','center');
  }
  for(let i=0;i<5;i++){
    const x=(i*217+clock*11-camera*.1)%(W+180)-90,y=base-330+i%3*23;
    path('M0 3 Q5 -3 10 3 Q15 -3 20 3',x,y,'#00000000',.6,'#4d5a5070',1.6);
  }
}
function title(){
  paper();sceneBack(true);
  const mobile=W<900,x=mobile?44:64,top=mobile?135:144;
  text('A MOST UNRELIABLE PROPHECY',x,top,13,C.red,'Mono','start',2);
  text('THE LAST',x,top+36,mobile?82:98,C.ink,'Display');
  text('EDITION',x,top+(mobile?122:137),mobile?88:108,C.ink,'Display');
  line(x,top+257,x+330,top+257,C.ink,2);
  text('The world has written you off.',x,top+281,24,C.ink,'Body');
  text('You have other plans.',x,top+317,24,C.ink,'Body');
  const by=top+377;
  button(saved?'CONTINUE THE STORY  →':'REWRITE THE FUTURE  →',x,by,320,58,()=>start(Boolean(saved)),true);
  if(saved)link('Begin a new edition',x+30,by+77,260,()=>start(false));
  else text('3 acts · 9 stories · a playable afterword',x,by+77,12,C.muted,'Mono');
  if(!saved&&record>0)link('Visit the first morning',x,by+111,300,beginAfterword);
  const heroX=mobile?W*.75:W*.75,heroY=mobile?H-166:H-145;
  baby(heroX,heroY,mobile?2.15:2.8,clock,.08,false,1,Math.sin(clock*.7)> .993);
  ellipse(heroX,heroY+22,96,8,'#292c2812');
  rect(heroX-112,heroY+34,224,29,C.paper);
  text('THE 2012 BABY',heroX,heroY+42,12,C.muted,'Mono','center',2);
  if(!mobile){line(W*.52,118,W*.52,H-138,'#77776950');text('“The last baby will be born in 2012.”',heroX,130,17,C.ink,'Body','center');text('A prediction. Not a prophecy.',heroX,162,12,C.red,'Mono','center');}
  footer();
}
function footer(){
  rect(0,H-87,W,87,C.paper);
  line(40,H-77,W-40,H-77,C.ink,1);line(40,H-73,W-40,H-73,C.ink,.5);
  link('HOW TO PLAY',44,H-50,150,()=>{back=mode;setMode('help');});
  link('THE CLIPPING',W<900?215:233,H-50,165,()=>{back=mode;setMode('archive');});
  link(mute?'SOUND OFF':'SOUND ON',W-164,H-50,130,toggleSound);
  if(W>900)text('BUILT WITH STARHERMIT',W/2+85,H-49,10,C.muted,'Mono','center',1);
}
function platform(x:number,y:number,w:number){
  const xx=x-camera,yy=ground-y;if(xx>W+50||xx+w< -50)return;
  rect(xx+5,yy+7,w,18,'#292c2826');rect(xx,yy,w,17,C.cream);line(xx,yy,xx+w,yy,C.ink,2);
  path('M0 0 L12 0 L12 12 Z',xx+w-12,yy+5,C.faint);
  for(let j=8;j<w-20;j+=19)line(xx+j,yy+8,xx+j+9,yy+8,'#77776970',1);
  line(xx,yy+18,xx+w-15,yy+18,C.ink,.7);
}
function hazardInk(x:number,w:number){
  const xx=x-camera;if(xx>W+60||xx+w< -60)return;
  ellipse(xx+w/2,ground+4,w/2,10,C.ink);
  for(let i=0;i<8;i++){const xx2=xx+i*w/7;ellipse(xx2,ground+Math.sin(clock*2+i*1.7)*2,w/12,5,C.ink);}
  for(let i=0;i<4;i++)ellipse(xx+w*(i+.5)/4,ground+3,4,1,'#e7dfc930');
}
function censor(e:{x:number;stun:number},i:number){
  const x=e.x-camera,y=ground-22;if(x< -80||x>W+80)return;
  const stunned=e.stun>0;
  for(const d of [-1,1]){
    line(x+d*23,y+6,x+d*38,y+14,C.ink,3);line(x+d*38,y+14,x+d*43,y+23,C.ink,2);
    line(x+d*15,y+10,x+d*19+Math.sin(clock*9+i)*3,y+24,C.ink,3);
  }
  gear(x-17,y+12,11,clock*(stunned?0:3));gear(x+17,y+12,11,-clock*(stunned?0:3));
  rect(x-29,y-15,58,32,C.ink);rect(x-23,y-23,46,12,C.cream);stroke(x-23,y-23,46,12,C.ink);
  text(stunned?'? ?':'CENSOR',x,y-22,stunned?12:7,C.ink,'Mono','center');
  for(let j=0;j<6;j++)rect(x-19+j*7,y+7,4,4,C.faint);
  ellipse(x-10,y-4,4,4,stunned?C.faint:C.red);ellipse(x+10,y-4,4,4,stunned?C.faint:C.red);
  if(stunned){text('z',x-15,y-48+Math.sin(clock*2)*4,15,C.red,'Body');text('?',x+16,y-57,19,C.red,'Body');}
}
function press(p:{x:number;phase:number}){
  const x=p.x-camera;if(x< -110||x>W+110)return;
  const phase=pressPhase(p,g.time),danger=phase>1.25&&phase<1.85,warning=phase>.6&&phase<1.25;
  const lowered=phase>1.25&&phase<2.15?1:0;
  line(x-52,ground-265,x-52,ground,C.ink,4);line(x+52,ground-265,x+52,ground,C.ink,4);
  rect(x-62,ground-272,124,15,C.ink);line(x,ground-263,x,ground-227+lowered*185,C.ink,12);
  rect(x-43,ground-229+lowered*185,86,33,C.ink);
  text('FACT',x,ground-224+lowered*185,16,C.cream,'Display','center');
  ellipse(x,ground-282,6,6,warning||danger?C.red:C.sage);
  if(warning){rect(x-40,ground-15,80,15,'#ad463740');text('!',x,ground-48,23,C.red,'Display','center');}
}
function barrier(x:number){
  const xx=x-camera;if(xx< -100||xx>W+100)return;
  const broken=g.broken.includes(x);
  if(broken){rect(xx-26,ground-8,52,8,C.faint);return;}
  rect(xx-28,ground-125,56,125,C.ink);
  for(let i=0;i<7;i++)line(xx-25,ground-116+i*17,xx+23,ground-123+i*17,'#f4ecd72a',1);
  text('!',xx,ground-106,36,C.cream,'Display','center');
  text('CRY',xx,ground-52,13,C.cream,'Mono','center');
  text('X / J',xx,ground-32,10,C.cream,'Mono','center');
}
function exitPress(){
  if(g.chapter===3)return;
  const c=CHAPTERS[g.chapter]!,x=c.length-150-camera;
  if(x< -170||x>W+170)return;
  const open=canExit(g),final=g.chapter===2;
  rect(x-80,ground-185,160,173,C.ink);rect(x-89,ground-200,178,23,C.ink);
  for(let i=0;i<7;i++)line(x-74,ground-169+i*20,x+74,ground-169+i*20,'#f4ecd719');
  gear(x-65,ground-15,35,clock*.4);gear(x+65,ground-15,35,-clock*.4);
  rect(x-57,ground-171,114,65,C.cream);text(final?'LAST':'NEXT',x,ground-159,28,C.ink,'Display','center');
  text(final?'EDITION':'EDITION',x,ground-128,10,C.red,'Mono','center',1.5);
  rect(x-54,ground-80,108,25,open?C.red:C.muted);text(final&&g.boss.active&&!g.boss.complete?'PROOF REQUIRED':open?'READY TO PRINT':'TYPE MISSING',x,ground-74,8,C.cream,'Mono','center');
  ellipse(x,ground-42,8,8,open?C.red:C.faint);
}
function citizenPortrait(x:number,feet:number,k=1,variant=0){
  ellipse(x,feet+3*k,21*k,4*k,'#292c2825');
  path('M-12 -60 L12 -60 L20 -13 L9 -12 L8 0 L-2 0 L-3 -19 L-6 0 L-16 0 L-12 -15 L-22 -13 Z',x,feet,variant===0?C.sage:C.ink,k);
  ellipse(x,feet-76*k,13*k,17*k,C.cream);path('M-14 -80 Q-14 -99 10 -93 L17 -78 L4 -84 Z',x,feet,C.ink,k);
  ellipse(x-4*k,feet-76*k,1.4*k,1.5*k,C.ink);ellipse(x+5*k,feet-76*k,1.4*k,1.5*k,C.ink);
  line(x-4*k,feet-66*k,x+4*k,feet-66*k,C.ink,k);
  rect(x-9*k,feet-53*k,18*k,32*k,C.cream);line(x-15*k,feet-49*k,x+13*k,feet-31*k,C.ink,3*k);
  rect(x+6*k,feet-40*k,16*k,20*k,C.paper);stroke(x+6*k,feet-40*k,16*k,20*k,C.ink,.7*k);
}
function detailWorld(){
  if(g.chapter===3){morningWorld();return;}
  const detail=DETAILS[g.chapter]!,person=detail.citizen,nx=person.x-camera;
  if(nx>-90&&nx<W+90){citizenPortrait(nx,ground,1,person.id);text(person.name.split(',')[0]!,nx,ground-123,11,C.ink,'Mono','center');text(g.talked.includes(person.id)?'TESTIMONY KEPT':'E  LISTEN',nx,ground-106,8,C.red,'Mono','center');}
  const station=detail.station,sx=station.x-camera;
  if(sx>-110&&sx<W+110){
    rect(sx-36,ground-83,72,77,C.ink);rect(sx-53,ground-99,106,40,C.cream);stroke(sx-53,ground-99,106,40,C.ink,1.3);
    text(g.revision?station.edited:station.original,sx,ground-90,14,g.revision?C.red:C.ink,'Display','center');
    gear(sx-17,ground-33,12,clock*.6);gear(sx+15,ground-33,12,-clock*.6);text('PROOFREADER',sx,ground-122,8,C.muted,'Mono','center');
  }
  for(const d of detail.drafts){const x=d.x-camera;if(x>W||x+d.w<0)continue;
    rect(x,ground-335,d.w,330,g.revision?'#6a7c6414':'#6a7c6408');
    for(let i=0;i<7;i++){const xx=x+15+i*d.w/8,yy=ground-((clock*90+i*47)%310);path('M-5 5 L0 0 L5 5 M0 0 L0 23',xx,yy,'#00000000',1,g.revision?'#6a7c6470':'#6a7c6420',1);}
    text(g.revision?'RISING DRAFT':'STILL AIR',x+d.w/2,ground-345,9,C.sage,'Mono','center');
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
    if(x< -60||x>W+60)continue;ring(x,y,20,'#6a7c6435');
    path('M-21 0 L-2 -9 L7 -3 L22 -16 L14 5 L2 10 L-1 3 L-13 9 Z',x,y,C.cream,1,C.sage,1.3);
    path('M-21 0 L2 2 L22 -16 M-2 -9 L2 10',x,y,'#00000000',1,C.sage,.7);
    if(Math.abs(g.x-scrap.x)<130)text('A STORY IN THE MARGIN',x,y-42,8,C.sage,'Mono','center');
  }
  for(const cx of [1035,2375]){const x=cx-camera;if(x< -30||x>W+30)continue;line(x,ground-55,x,ground,C.muted,1);path('M0 0 L29 0 L23 16 L0 16 Z',x,ground-55,g.checkpoint>=cx?C.sage:C.faint);text('¶',x+11,ground-55,13,C.cream,'Body','center');}
}
function morningWorld(){
  const a=g.afterword;
  for(const p of AFTERWORD.citizens){const x=p.x-camera;if(x< -90||x>W+90)continue;citizenPortrait(x,ground,1,p.id);text(p.name.split(',')[0]!,x,ground-120,11,C.sage,'Mono','center');}
  const nx=AFTERWORD.nursery-camera,open=a.restored.includes(0);
  if(nx>-170&&nx<W+170){
    rect(nx-90,ground-178,180,178,C.cream);stroke(nx-90,ground-178,180,178,C.sage,1.5);
    path('M-109 -178 L0 -245 L109 -178 Z',nx,ground,C.sage);
    text('NURSERY',nx,ground-156,19,C.ink,'Display','center');
    rect(nx-25,ground-78,50,78,open?'#c2ae6475':C.ink);stroke(nx-25,ground-78,50,78,C.ink,1);
    if(open){path('M-25 0 L-25 -78 L-48 -65 L-48 0 Z',nx,ground,C.sage);text('OPEN',nx,ground-115,11,C.sage,'Mono','center');}
    else{ellipse(nx,ground-39,4,4,C.paper);rect(nx-2,ground-39,4,10,C.paper);}
    for(const sign of [-1,1]){rect(nx+sign*57-12,ground-96,24,34,'#b49a4b30');stroke(nx+sign*57-12,ground-96,24,34,C.sage,1);line(nx+sign*57,ground-96,nx+sign*57,ground-62,C.sage,.8);}
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
    rect(gx-320,ground-202,610,202,flow?'#6a7c6417':'#7777690b');
    path('M-345 -202 L-40 -324 L315 -202',gx,ground,'#00000000',1,flow?'#6a7c6465':'#77776935',1.3);
    for(let i=0;i<6;i++)line(gx-320+i*122,ground-202,gx-320+i*122,ground,'#6a7c6445',1);
    line(gx-320,ground-202,gx+290,ground-202,'#6a7c6445',1);
    text(flow?'THE GREENHOUSE IS SHARING ITS SEEDS':'THE GREENHOUSE NEEDS WATER',gx-10,ground-339,10,C.sage,'Mono','center');
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
  rect(left,ground-330,1010,12,C.ink);line(left+12,ground-330,left+12,ground,C.ink,6);line(left+998,ground-330,left+998,ground,C.ink,6);
  text(g.boss.complete?'ANOTHER EDITION IS POSSIBLE':'NO FURTHER EDITIONS',left+505,ground-329,8,C.cream,'Mono','center',1);
  for(let i=0;i<3;i++){const p=PROOF_PLATES[i]!,x=p.x-camera,y=ground-p.y,done=g.boss.plates.includes(i),lit=bossVulnerable(g);
    if(lit&&!done)ring(x,y-40,102,'#ad463730',1);
    rect(x-25,y-65,50,65,C.ink);rect(x-20,y-59,40,37,done?C.sage:lit?C.red:C.muted);
    text(done?'✓':String(i+1),x,y-58,27,C.cream,'Display','center');
    text(done?'CORRECTED':lit?'CRY NOW':'PROOF PLATE',x,y-85,8,done?C.sage:lit?C.red:C.muted,'Mono','center');
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
    const p=bells[i]!,x=p.x-camera,y=ground-p.y,timer=g.echoTimers[i]!,color=solved?C.sage:timer>0?C.red:g.revision?C.ink:C.faint;
    if(x< -110||x>W+110)continue;
    ring(x,y-40,82,solved?'#6a7c6415':'#77776915',.7);
    path('M-18 -24 L-12 -30 L-12 -49 Q-12 -66 0 -66 Q12 -66 12 -49 L12 -30 L18 -24 Z',x,y,C.cream,1,color,1.8);
    ellipse(x,y-22,4,5,color);line(x,y-74,x,y-66,color,1.5);
    text(solved?'✓':String(i+1),x,y-52,16,color,'Display','center');
    text(solved?'ERRATA KEPT':timer>0?timer.toFixed(1)+'s':'MARGIN CHIME',x,y-113,8,color,'Mono','center');
    if(timer>0&&!solved)draw.strokeArc(x*S,(y-41)*S,29*S,-Math.PI/2,-Math.PI/2+Math.PI*2*timer/6.5,C.red,2*S);
  }
  for(const m of g.moths){
    const x=m.x-camera,y=ground-m.y;if(x< -100||x>W+100)continue;
    const c=m.stun>0?C.faint:m.alert>.8?C.red:C.ink,flap=m.stun>0?3:Math.sin(clock*13+m.id)*9;
    path('M-4 0 Q-18 -22 -40 -15 L-27 9 L-7 6 Z',x,y+flap,C.cream,1,c,1.2);
    path('M4 0 Q18 -22 40 -15 L27 9 L7 6 Z',x,y-flap,C.cream,1,c,1.2);
    for(const sign of [-1,1]){line(x+sign*9,y+flap,x+sign*26,y-5+flap,c,.6);}
    ellipse(x,y,6,12,c);line(x-3,y-10,x-11,y-20,c,1);line(x+3,y-10,x+11,y-20,c,1);
    text(m.stun>0?'?':m.alert>.8?'!':'…',x,y-39,13,c,'Body','center');
  }
  for(const t of g.sentries){
    const x=t.x-camera,y=ground-t.y;if(x< -120||x>W+120)continue;
    const c=t.stun>0?C.muted:C.ink;
    for(const sign of [-1,1]){line(x,y-20,x+sign*24,y,C.ink,3);line(x+sign*24,y,x+sign*31,y,C.ink,3);}
    rect(x-21,y-65,42,49,c);rect(x-15,y-57,30,17,C.cream);text('NO',x,y-56,11,C.red,'Display','center');
    line(x+t.direction*10,y-42,x+t.direction*37,y-42,c,9);ellipse(x,y-25,4,4,t.stun>0?C.faint:t.windup>0?C.red:C.sage);
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
  paper();sceneBack();
  text('THE '+c.word+' GAZETTE',W<900?W/2-20:W/2,89,W<900?20:37,'#4b554a4a','Display','center');
  text(c.deck,W/2,140,14,'#4b554a75','Body','center');
  rect(0,ground+8,W,H-ground,C.paper);line(0,ground+9,W,ground+9,C.ink,1.4);
  // Blocks of unreadably small type beneath the sidewalk are decoration only.
  for(let i=0;i<Math.ceil(W/180);i++){
    const x=i*190-(camera*.6%190);
    for(let j=0;j<5;j++)line(x,ground+27+j*9,x+148+(j%2)*18,ground+27+j*9,'#77776930',2);
  }
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
    text('✦',x,y-10,20,'#796e4d','Body','center');
  }
  for(const p of c.letters){if(g.letters.includes(p.id))continue;const x=p.x-camera,y=ground-p.y+Math.sin(clock*2)*4;
    if(x< -60||x>W+60)continue;
    ring(x,y,31,'#ad463730',1);rect(x-20,y-23,40,46,C.red);stroke(x-16,y-19,32,38,'#f4ecd770',.7);
    text('FIRST'[p.id]!,x,y-22,32,C.cream,'Display','center');
    line(x, y-42,x,y-34,C.red,.8);
  }
  finalPress();exitPress();
  // Caption plaques appear where they can be read without stopping movement.
  for(const m of c.memories){if(Math.abs(g.x-m.x)<185&&toastTime===0){
    const captionY=ground-350;
    rect(W/2-290,captionY-7,580,64,'#e7dfc9eb');
    draw.text(m.text,(W/2)*S,captionY*S,{size:16*S,color:C.ink,font:'Body',align:'center',maxWidth:540*S});
  }}
  const blink=g.invincible>0&&Math.floor(clock*12)%2===0;
  if(!blink)baby(px-camera,ground-py,.88,clock,Math.min(1,Math.abs(g.vx)/285),input.isDown('jump')&&g.vy<0&&!g.ground,g.facing,Math.sin(clock*1.2)>.997);
  if(g.chapter===3&&g.afterword.letterIssued&&!g.afterword.delivered){const x=px-camera+g.facing*23,y=ground-py-43;path('M-12 -9 L12 -9 L12 8 L-12 8 Z M-12 -9 L0 1 L12 -9',x,y,C.cream,1,C.sage,1);ellipse(x,y+3,2,2,C.red);}
  if(g.shield)ring(px-camera,ground-py-43,49,'#6a7c6465',1.5);
  if(g.pulse>0){const progress=1-g.pulse/.62;ring(px-camera,ground-py-43,15+progress*(cryRange(g)-15),'#ad4637'+Math.floor((1-progress)*180).toString(16).padStart(2,'0'),2);ring(px-camera,ground-py-43,10+progress*210,'#f4ecd780',1);}
  for(const p of particles){const x=p.x-camera,y=ground-p.y;if(x< -50||x>W+50)continue;text(p.glyph,x,y,14,p.red?C.red:C.ink,'Body');}
  hud();
  const action=contextAction(g);
  if(mode==='play'&&action.kind!=='none')button(action.label,W/2-200,ground+26,400,41,()=>use(),true,true);
  if(cut>0)rect(0,0,W,H,[.91,.875,.79,cut*.65]);
}
function hud(){
  if(g.chapter===3){morningHud();return;}
  const c=CHAPTERS[g.chapter]!;
  rect(28,34,W-56,43,'#e7dfc9f2');
  text(c.number+'  /  '+c.title.toUpperCase(),43,43,W<900?12:13,C.ink,'Mono','start',.6);
  text(String(g.total).padStart(4,'0')+'  INK FOUND',W-47,43,13,C.ink,'Mono','end',1);
  line(28,77,W-28,77,C.ink,1);
  const center=W/2;
  text('A SMALL CORRECTION',center,185,10,C.muted,'Mono','center',2);
  for(let i=0;i<5;i++){
    const x=center-106+i*47;
    rect(x,207,40,46,g.letters.includes(i)?C.red:'#ded6bf');stroke(x,207,40,46,g.letters.includes(i)?C.red:'#a6a38e',.7);
    text('FIRST'[i]!,x+20,209,30,g.letters.includes(i)?C.cream:'#aaa591','Display','center');
  }
  text('REPLACE “LAST” WITH “FIRST”',center,265,10,C.muted,'Mono','center',1.1);
  if(g.boss.active){
    const phase=bossPhase(g),status=g.boss.complete?'ALL PROOFS CORRECTED':bossVulnerable(g)?'RECOVERY — CRY AT A PROOF PLATE':phase<1.25?'STAMP INCOMING — MOVE':phase<1.8?'STAMP FALLING — GET CLEAR':'PRESS RESETTING — PREPARE';
    text(status,center,289,W<900?10:12,g.boss.complete?C.sage:C.red,'Mono','center');
    text(g.boss.plates.length+' / 3 PROOF PLATES',center,310,9,C.muted,'Mono','center',1);
  }else{
    const next=CHAPTERS[g.chapter]!.letters.find(p=>!g.letters.includes(p.id));
    const echoNear=!g.echoes.includes(g.chapter)&&bellPositions(g).some(p=>Math.abs(g.x-p.x)<190),timer=Math.max(...g.echoTimers);
    text(echoNear?(timer>0?'CARRY THE NOTE — '+timer.toFixed(1)+'s':g.revision?'CRY CLOSE TO BOTH MARGIN CHIMES':'THE CHIMES NEED A REVISED WORLD'):next?'NEXT TYPE: '+ 'FIRST'[next.id]+'  '+(next.x>g.x?'→':'←'):'ALL TYPE FOUND — FIND THE PRESS →',center,289,10,C.red,'Mono','center',.5);
  }
  for(let i=0;i<3;i++){ellipse(48+i*23,102,6,7,i<g.life?C.ink:'#b8b19c');if(i<g.life)ellipse(46+i*23,100,1.5,1.5,C.cream);}
  text('LITTLE LIFE',39,121,8,C.muted,'Mono','start',1);
  button('Ⅱ',W-80,90,39,36,()=>setMode('pause'),false,true);
  button('JOURNAL',W-181,90,90,36,openJournal,false,true);
  text(g.memories.length+' / 9 STORIES',W-42,143,10,C.sage,'Mono','end');
  button('UPGRADES',W-181,178,140,35,openWorkshop,false,true);
  text(availableInk(g)+' INK TO SPEND',W-42,222,9,C.muted,'Mono','end');
  const barWidth=82;
  stroke(40,154,barWidth,5,'#a6a38e',.5);rect(40,154,barWidth*(1-g.cry/cryCooldown(g)),5,g.cry>0?C.muted:C.red);
  text(g.cry>0?'CATCHING BREATH':'CRY READY',40,167,8,g.cry>0?C.muted:C.red,'Mono','start',.6);
  if(hasUpgrade(g,'coat'))text(g.shield?'COAT READY':'COAT STAINED',40,194,8,g.shield?C.sage:C.muted,'Mono');
  // Reading progress is also a map of letters in the current chapter.
  const trackY=H-36;line(44,trackY,W-44,trackY,'#a6a38e',1);
  for(const p of c.letters){const x=44+(W-88)*p.x/c.length;ellipse(x,trackY,3,3,g.letters.includes(p.id)?C.red:C.muted);}
  for(const p of DETAILS[g.chapter]!.scraps){const x=44+(W-88)*p.x/c.length;line(x-3,trackY-7,x,trackY-11,g.memories.includes(p.id)?C.sage:C.faint,2);line(x,trackY-11,x+3,trackY-7,g.memories.includes(p.id)?C.sage:C.faint,2);}
  ellipse(44+(W-88)*g.x/c.length,trackY,4,4,C.ink);
  if(W>900&&!input.touchControlsVisible()){
    text('A D  MOVE   SPACE  GLIDE   X  CRY / RETURN INK   E  USE   TAB  JOURNAL   B  UPGRADES',W/2,H-67,10,C.muted,'Mono','center');
  }
  if(toastTime>0){
    const tw=Math.min(W-90,780),ty=g.boss.active?Math.min(ground-280,355):Math.min(ground-330,327);
    rect((W-tw)/2,ty-10,tw,68,'#f4ecd7ed');line((W-tw)/2+15,ty-10,(W+tw)/2-15,ty-10,'#ad463780');
    draw.text(toast,(W/2)*S,ty*S,{size:16*S,color:C.ink,font:'Body',align:'center',maxWidth:(tw-36)*S});
  }
}
function morningHud(){
  const a=g.afterword;
  rect(28,34,W-56,43,'#e7dfc9f2');text('IV  /  THE FIRST MORNING',43,43,12,C.ink,'Mono');text(g.total+'  INK FOUND',W-43,43,12,C.ink,'Mono','end');line(28,77,W-28,77,C.ink,1);
  button('Ⅱ',W-80,90,39,36,()=>setMode('pause'),false,true);button('JOURNAL',W-181,90,90,36,openJournal,false,true);
  text('A CITY IS SOMETHING PEOPLE DO',W/2,185,10,C.sage,'Mono','center',1);
  for(let i=0;i<4;i++){const x=W/2-226+i*116,done=a.restored.includes(i);rect(x,207,106,46,done?C.sage:'#ded6bf');stroke(x,207,106,46,done?C.sage:C.faint,.8);text(done?'✓  '+AFTERWORD.tasks[i]:AFTERWORD.tasks[i]!,x+53,221,11,done?C.cream:C.ink,'Mono','center');}
  text(a.restored.length+' / 4 PLACES RESTORED',W/2,266,10,C.sage,'Mono','center',1);
  text(morningObjective(g),W/2,290,W<900?9:11,C.ink,'Mono','center');
  if(a.letterIssued&&!a.delivered)text(a.bestFlight>=350?'SKY POST READY  /  +150 ON DELIVERY':'SKY POST: '+Math.min(100,Math.round(a.bestFlight/350*100))+'% OF A LONG GLIDE',W/2,311,9,C.sage,'Mono','center');
  text(a.items.includes(0)&&!a.restored.includes(0)?'KEY IN YOUR POCKET':'A ROOM FOR TOMORROW',40,147,8,C.muted,'Mono');
  text('SEED PACKETS: '+seedsInBag(g),40,167,9,C.sage,'Mono');
  text(g.cry>0?'CATCHING BREATH':'VOICE READY',40,102,9,g.cry>0?C.muted:C.sage,'Mono');
  if(a.letterIssued&&!a.delivered)text('FIRST LETTER IN YOUR POCKET',W-43,147,8,C.red,'Mono','end');
  line(44,H-36,W-44,H-36,C.faint,1);for(let i=0;i<4;i++){const x=[380,1690,2740,4100][i]!;ellipse(44+(W-88)*x/4300,H-36,4,4,a.restored.includes(i)?C.sage:C.faint);}
  ellipse(44+(W-88)*g.x/4300,H-36,4,4,C.ink);
  if(W>900&&!input.touchControlsVisible())text('A D  MOVE   SPACE  GLIDE   X  SING TO THE WHEEL   E  RESTORE / TALK   B  UPGRADES',W/2,H-67,10,C.muted,'Mono','center');
  if(toastTime>0){const tw=Math.min(W-90,780),ty=Math.min(ground-330,340);rect((W-tw)/2,ty-10,tw,68,'#f4ecd7ed');draw.text(toast,W/2*S,ty*S,{size:16*S,color:C.ink,font:'Body',align:'center',maxWidth:(tw-36)*S});}
}
function panel(titleText:string,sub:string){
  rect(0,0,W,H,'#292c286b');const pw=Math.min(W-70,730),x=(W-pw)/2,y=Math.max(90,(H-525)/2);
  rect(x+8,y+8,pw,525,'#292c2840');rect(x,y,pw,525,C.cream);stroke(x,y,pw,525,C.ink,1.5);stroke(x+8,y+8,pw-16,509,'#b4af9c');
  text(sub,W/2,y+35,11,C.red,'Mono','center',2);text(titleText,W/2,y+73,40,C.ink,'Display','center');
  line(x+40,y+140,x+pw-40,y+140,C.ink,1);
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
    citizenPortrait(W/2,y+280,1.2,person.id);
    const lines=dialogueLines();
    draw.text(lines[dialoguePage]!,W/2*S,(y+303)*S,{size:18*S,color:C.ink,font:'Body',align:'center',maxWidth:570*S});
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
  draw.text(testimony?person.name:known?chosen!.title:selectedMemory<0?'A city is made of people.':'A page is still missing.',readX*S,readY*S,{size:25*S,color:C.ink,font:'Display',maxWidth:readW*S});
  if(!mobile||reading||H>=1050)draw.text(testimony?person.lines[journalPage]!:known?chosen!.body:selectedMemory<0?'Follow the folded cranes on the upper routes. Each recovered memory restores one life and keeps a small human story from being erased.':'Look above the ordinary route. A rising draft, an airborne cry, or a newly possible bridge can take you into the margins.',readX*S,(readY+76)*S,{size:18*S,color:C.muted,font:'Body',maxWidth:readW*S});
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
  for(let i=0;i<4;i++){const y=263+i*91,done=g.afterword.restored.includes(i);text((done?'✓  ':'○  ')+jobs[i]![0],50,y,20,done?C.sage:C.ink,'Display');draw.text(jobs[i]![1]!,50*S,(y+34)*S,{size:16*S,color:C.muted,font:'Body',maxWidth:(W-110)*S});line(50,y+74,W-50,y+74,'#b4af9c55');}
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
    draw.text(u.description,(x+20)*S,(y+57)*S,{size:(mobile?14:15)*S,color:C.muted,font:'Body',maxWidth:(cw-195)*S});
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
    for(let i=0;i<notes.length;i++){const n=notes[i]!,y=252+i*119;text(n[0]!,x,y,22,C.ink,'Display');draw.text(n[1]!,x*S,(y+38)*S,{size:(W<900?16:18)*S,color:C.muted,font:'Body',maxWidth:(right-x)*S});}
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
  for(const p of paras){draw.text(p,tx*S,yy*S,{size:(mobile?16:19)*S,color:C.muted,font:'Body',maxWidth:(W-tx-55)*S});yy+=mobile?133:113;}
  text('REFERENCE: THE IMAGE YOU SUPPLIED',45,260+ih+25,10,C.muted,'Mono','start',.5);
  button('←  BACK TO THE STORY',45,Math.max(710,H-100),310,52,()=>setMode(back),true);
}
function ending(){
  paper();sceneBack(true);
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
onRender(alpha=>{
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
  image(grain,0,0,W,H,.45);
  const p=input.pointer();let hover=false;
  if(p)hover=hits.some(h=>p.x/S>=h.x&&p.x/S<=h.x+h.w&&p.y/S>=h.y&&p.y/S<=h.y+h.h);
  input.setCursor(hover?'pointer':'default');
});
