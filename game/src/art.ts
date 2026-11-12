import { localizedDrawOptions as __l10nDrawOptions } from "./l10n/font.js";
// localization-runtime:attached
import { localizedFont as __l10nFont } from "./l10n/font.js";
// display-localization:attached
import { localizedText as __displayText } from "./l10n/text.js";
import * as draw from 'starhermit:draw';
import {OffscreenCanvas, FontFace, fonts, createImageBitmap, Path2D} from 'starhermit:canvas';
import type {ImageBitmap} from 'starhermit:canvas';
import type {ColorLike} from 'starhermit:engine';
import {idlePose} from './animation.js';

export type CharacterPose=ReturnType<typeof idlePose>;
type RigPart={image:OffscreenCanvas;x:number;y:number;w:number;h:number;px:number;py:number};
type Rig=Record<string,RigPart>;
const heroRigs:Rig[]=[];

// The print shop's palette: ivory, midnight ink, oxidised copper and vermilion.
export const C={paper:'#e9e1cd',cream:'#fff3d9',ink:'#172a32',faint:'#b2a78e',red:'#bd533d',muted:'#6c756e',sage:'#427e79',gold:'#e9b969',night:'#101f2b'};
export let S=1,W=1280,H=800;
export function viewport(w:number,h:number){S=w/h<1?w/720:Math.min(w/1280,h/800);W=w/S;H=h/S;}
export function rect(x:number,y:number,w:number,h:number,c:ColorLike){draw.rect(x*S,y*S,w*S,h*S,c);}
export function stroke(x:number,y:number,w:number,h:number,c:ColorLike=C.ink,lw=1){draw.strokeRect(x*S,y*S,w*S,h*S,c,lw*S);}
export function line(x:number,y:number,x2:number,y2:number,c:ColorLike=C.ink,lw=1){draw.line(x*S,y*S,x2*S,y2*S,c,lw*S);}
export function ellipse(x:number,y:number,rx:number,ry:number,c:ColorLike,rotation=0){draw.ellipse(x*S,y*S,rx*S,ry*S,c,{rotation});}
export function ring(x:number,y:number,r:number,c:ColorLike,lw=1){draw.strokeCircle(x*S,y*S,r*S,c,lw*S);}
export function path(d:string,x:number,y:number,fill:ColorLike,scale=1,strokeCol?:ColorLike,lw=1){const o:draw.PathOptions={fill,scale:scale*S};if(strokeCol){o.stroke=strokeCol;o.lineWidth=lw;}draw.path(d,x*S,y*S,o);}
export function text(t:string,x:number,y:number,size=20,color:ColorLike=C.ink,font='Body',align:'start'|'center'|'end'='start',spacing=0){draw.text(__displayText(t),x*S,y*S,__l10nDrawOptions({size:size*S,color,font: __l10nFont(font),align,letterSpacing:spacing*S}));}
export function image(im:OffscreenCanvas|ImageBitmap,x:number,y:number,w:number,h:number,alpha=1){draw.image(im,x*S,y*S,w*S,h*S,{tint:[1,1,1,alpha]});}
export let grain:OffscreenCanvas,city:OffscreenCanvas;
let glow:OffscreenCanvas,edge:OffscreenCanvas,terrain:OffscreenCanvas;
let hero:ImageBitmap;
const paintings:ImageBitmap[]=[];
let seed=811;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
export async function loadArt(){
 const faces=[new FontFace('Display','assets/display.ttf'),new FontFace('Body','assets/body.ttf'),new FontFace('Mono','assets/mono.ttf')];
 for(const face of faces)fonts.add(face);await Promise.all(faces.map(f=>f.load()));
 await Promise.all(['nursery','factory','press','morning'].map(async(n,i)=>{paintings[i]=await createImageBitmap('assets/remaster/'+n+'.png');}));
 hero=await createImageBitmap('assets/remaster/hero-cutout.png');
 buildHeroRig();
 grain=new OffscreenCanvas(640,400);const g=grain.getContext('2d');
 for(let i=0;i<4800;i++){g.fillStyle=i%2?'#101c2510':'#fff8e910';g.fillRect(rand()*640,rand()*400,rand()*1.2+.3,.6);}
 glow=new OffscreenCanvas(256,256);const l=glow.getContext('2d'),lg=l.createRadialGradient(128,128,0,128,128,128);lg.addColorStop(0,'#ffd89060');lg.addColorStop(.22,'#edb76028');lg.addColorStop(1,'#e5a44900');l.fillStyle=lg;l.fillRect(0,0,256,256);
 edge=new OffscreenCanvas(640,400);const e=edge.getContext('2d'),eg=e.createRadialGradient(320,185,90,320,185,365);eg.addColorStop(0,'#07172200');eg.addColorStop(1,'#07172290');e.fillStyle=eg;e.fillRect(0,0,640,400);
 terrain=new OffscreenCanvas(1024,150);const t=terrain.getContext('2d'),tg=t.createLinearGradient(0,0,0,150);tg.addColorStop(0,'#2b3d43');tg.addColorStop(.3,'#192e38');tg.addColorStop(1,'#0c1b26');t.fillStyle=tg;t.fillRect(0,0,1024,150);
 for(let row=0;row<5;row++)for(let x=-80;x<1100;x+=88){const xx=x+(row%2)*44,y=row*29;t.strokeStyle='#b8c0a010';t.strokeRect(xx+2,y+3,84,25);t.fillStyle='#030d171c';t.fillRect(xx+3,y+26,83,2);}
 for(let i=0;i<750;i++){t.fillStyle=i%2?'#f8d6a014':'#06132130';t.fillRect(rand()*1024,rand()*150,1+rand()*4,1);}
 // A separate foreground silhouette gives the paintings a second parallax plane.
 city=new OffscreenCanvas(1800,340);const c=city.getContext('2d');
 for(let x=-30;x<1800;){const w=64+rand()*100,h=40+rand()*145,base=340;c.fillStyle='#16303bdd';c.fillRect(x,base-h,w,h);c.beginPath();c.moveTo(x-8,base-h);c.lineTo(x+w*.5,base-h-30);c.lineTo(x+w+8,base-h);c.closePath();c.fill();
 c.fillStyle='#0d212c';c.fillRect(x+w-12,base-h,12,h);c.fillStyle='#b5b29b35';c.fillRect(x-5,base-h, w+10,2);
 for(let yy=base-h+20;yy<base-12;yy+=26)for(let xx=x+13;xx<x+w-16;xx+=25){if(rand()>.5){c.fillStyle='#e7b97765';c.fillRect(xx,yy,8,13);c.fillStyle='#102b36';c.fillRect(xx+3,yy,2,13);}}
 x+=w+24+rand()*35;}
}
export function light(x:number,y:number,r=80,alpha=1){image(glow,x-r,y-r,r*2,r*2,alpha);}
export function backdrop(chapter:number,camera:number,clock:number,base:number,menu=false){
 rect(0,0,W,H,C.night);
 const pw=Math.max(W+520,H*1.9),ph=pw*864/1536,offset=menu?-160:-70-camera*.075;
 image(paintings[chapter]!,offset,base-ph+95,pw,ph);
 const near=-((camera*.28)%1800)-100;
 image(city,near,base-245,1800,340,chapter===3?.35:.65);image(city,near+1800,base-245,1800,340,chapter===3?.35:.65);
 // Dust catches the light. Paper fragments move more slowly than the player.
 for(let i=0;i<32;i++){const x=((i*173.43+clock*(3+i%4)-camera*.14)%(W+160)+W+160)%(W+160)-80,y=100+(i*71.31)%(Math.max(200,base-100))+Math.sin(clock*.4+i)*14;ellipse(x,y,i%5===0?2:1,i%5===0?1:1,i%3?'#ffe4b742':'#fff8e96a');}
 for(let i=0;i<5;i++){const x=((i*307+clock*9-camera*.18)%(W+180)+W+180)%(W+180)-90,y=base-240-(i%3)*84;path('M-10 0 L0 -4 L11 -11 L5 2 L-1 5 Z',x,y,'#fff1ce58',.7);}
 image(edge,0,0,W,H,.8);
}
export function street(camera:number,base:number,clock:number){
 const offset=-(camera%1024);for(let x=offset;x<W;x+=1024)image(terrain,x,base+8,1024,Math.max(150,H-base));
 rect(0,base+1,W,9,'#152832');rect(0,base+1,W,3,'#d7c49c');line(0,base+5,W,base+5,'#b7935b',1);
 // Paving stones and a softly lit kerb define the walkable surface.
 for(let x=-(camera%74);x<W;x+=74){line(x,base+1,x-5,base+9,'#0c1c2a',1);line(x+5,base+12,x+66,base+12,'#f5d39b16');}
 for(let i=0;i<5;i++){const x=i*510+200-camera;if(x< -120||x>W+120)continue;line(x,base,x,base-150,'#102632',4);path('M0 -148 Q0 -175 29 -175 L37 -164',x,base,'#00000000',1,'#172b34',3);light(x+36,base-157,75,.9);rect(x+29,base-170,14,22,'#ffe2a2');stroke(x+27,base-172,18,26,'#263c40',2);path('M24 -173 L36 -183 L48 -173 Z',x,base,'#172b34');line(x+36,base-170,x+36,base-148,'#9e7f4a',1);}
 void clock;
}
export function ledge(x:number,y:number,w:number){
 rect(x+4,y+8,w,24,'#08172165');rect(x,y,w,23,'#3b5053');rect(x,y,w,5,'#f3d9a8');line(x,y,x+w,y,'#fff3cc',1.5);rect(x,y+5,w,3,'#c28e50');
 rect(x+4,y+10,w-8,10,'#c0b59a');for(let j=0;j<3;j++)line(x+7,y+12+j*3,x+w-9,y+12+j*3,'#766d5965',.65);
 rect(x+2,y+22,w-4,4,'#152d37');path('M0 0 L14 0 L0 14 Z',x+w-14,y+7,'#f9e8bd');
 for(let j=12;j<w-12;j+=45){ellipse(x+j,y+6,1.7,1.3,'#674f36');}
}
// Cut the painted figure into overlapping joints once. All animation is rendered
// from these small textures; no full-frame canvas work happens while playing.
function buildHeroRig(){
 const armL='M128 357 L178 370 L187 400 L154 464 L130 487 L119 509 L76 522 L39 509 L43 468 L73 428 L81 402 L106 377 Z';
 const armR='M311 386 L350 402 L374 437 L399 469 L422 481 L422 505 L400 507 L377 493 L357 475 L329 463 L309 430 Z';
 const scarf='M138 330 L173 349 L111 422 L59 482 L45 534 L25 553 L0 513 L33 459 L88 392 Z';
 const right:Rig={};
 function part(name:string,x:number,y:number,w:number,h:number,px:number,py:number,mask?:string){
  const canvas=new OffscreenCanvas(w,h),c=canvas.getContext('2d');
  c.translate(-x,-y);if(mask)c.clip(new Path2D(mask));c.drawImage(hero,0,0);
  right[name]={image:canvas,x,y,w,h,px,py};return c;
 }
 part('head',0,0,422,334,222,324);
 part('legL',126,638,119,130,183,642);
 part('legR',245,638,130,130,282,642);
 part('armL',38,356,150,168,161,383,armL);
 part('armR',308,385,114,124,332,413,armR);
 part('scarf',0,328,176,227,145,349,scarf);
 const body=part('body',0,315,422,335,218,607,'M125 315 L326 315 L329 370 L310 390 L310 421 L337 458 L352 623 Q250 670 111 625 L133 548 L108 528 L107 480 L146 456 L174 402 L143 367 L125 355 Z');
 body.globalCompositeOperation='destination-out';body.fillStyle='#000';
 for(const mask of [armL,armR,scarf])body.fill(new Path2D(mask));
 for(const name of ['blink','cry']){
  const base=right.head!,canvas=new OffscreenCanvas(base.w,base.h),c=canvas.getContext('2d');c.drawImage(base.image,0,0);
  if(name==='blink'){
   c.fillStyle='#edc28f';c.beginPath();c.ellipse(235,229,25,24,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(319,222,18,20,0,0,Math.PI*2);c.fill();
   c.strokeStyle='#563b28';c.lineWidth=3;c.beginPath();c.moveTo(216,229);c.quadraticCurveTo(236,241,255,228);c.moveTo(305,222);c.quadraticCurveTo(320,232,333,219);c.stroke();
  }else{
   c.fillStyle='#e8b27a';c.beginPath();c.ellipse(285,285,19,13,0,0,Math.PI*2);c.fill();c.fillStyle='#572f25';c.beginPath();c.ellipse(285,286,10,13,0,0,Math.PI*2);c.fill();c.fillStyle='#ca8065';c.beginPath();c.ellipse(285,293,6,3,0,0,Math.PI*2);c.fill();
  }
  right[name]={...base,image:canvas};
 }
 const left:Rig={};
 for(const [name,p] of Object.entries(right)){
  const canvas=new OffscreenCanvas(p.w,p.h),c=canvas.getContext('2d');c.translate(p.w,0);c.scale(-1,1);c.drawImage(p.image,0,0);
  left[name]={...p,image:canvas,x:422-p.x-p.w,px:422-p.px};
 }
 heroRigs[0]=right;heroRigs[1]=left;
}

export function baby(x:number,feet:number,k=1,time=0,run=0,glide=false,face=1,blink=false,animated?:CharacterPose){
 const pose=animated??idlePose(time);
 if(!animated&&glide){pose.glide=1;pose.armL=1.15;pose.armR=-1.25;pose.legL=-.2;pose.legR=.3;}
 const rig=heroRigs[face<0?1:0]!,unit=110/768*k;
 const wings=animated?pose.glide:glide?1:0,rootX=face<0?204:218,rootY=607;
 const bob=pose.bob*k,originX=x+(rootX-211)*unit*pose.stretchX,originY=feet+(rootY-748)*unit*pose.stretchY-bob;
 const lean=pose.body*face,cs=Math.cos(lean),sn=Math.sin(lean);
 ellipse(x,feet+2*k,24*k,4*k,'#07172255');
 function bone(name:string,angle=0,raise=0,parent=true){
  const p=rig[name]!,sx=unit*pose.stretchX,sy=unit*pose.stretchY;
  const dx=(p.px-rootX)*sx,dy=(p.py-rootY)*sy;
  const px=originX+(parent?dx*cs-dy*sn:dx),py=originY+(parent?dx*sn+dy*cs:dy)-raise*k;
  draw.image(p.image,(px+(p.x-p.px)*sx)*S,(py+(p.y-p.py)*sy)*S,p.w*sx*S,p.h*sy*S,{rotation:(parent?lean:0)+angle*face,origin:{x:px*S,y:py*S}});
 }
 bone('scarf',pose.scarf);
 if(wings>.01){
  const flap=Math.sin(time*5)*4*wings;
  light(x,feet-62*k,72*k,.3*wings);
  path(`M-16 0 Q-50 ${-37+flap} -82 ${-25+flap} L-68 3 L-36 18 Z`,x,feet-65*k,C.cream,k*wings,'#c09356',1);
  path(`M16 0 Q50 ${-37-flap} 82 ${-25-flap} L68 3 L36 18 Z`,x,feet-65*k,C.cream,k*wings,'#c09356',1);
  for(const sign of [-1,1])line(x+sign*24*k*wings,feet-65*k-k*wings,x+sign*75*k*wings,feet-65*k+(-20+sign*flap)*k*wings,'#a8875870',k);
 }
 bone('armR',pose.armR);
 bone('legR',pose.legR,pose.liftR,false);bone('legL',pose.legL,pose.liftL,false);
 bone('body');bone('armL',pose.armL);
 bone(pose.cry>.15?'cry':pose.blink||blink?'blink':'head',pose.head);
 if(run>.3&&pose.action==='run')for(let i=0;i<2;i++)ellipse(x-face*(18+i*10)*k,feet+1*k,(3-i)*k,1.5*k,'#ffe2b342');
}
export function gear(x:number,y:number,r:number,rot:number,color=C.ink){
 const pts:[number,number][]=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2+rot,rr=r*(i%4<2?1:.83);pts.push([(x+Math.cos(a)*rr)*S,(y+Math.sin(a)*rr)*S]);}
 draw.polygon(pts,color);ring(x,y,r*.73,'#d9b677',Math.max(1,r*.08));ellipse(x,y,r*.46,r*.46,'#172d37');
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2+rot;line(x+Math.cos(a)*r*.18,y+Math.sin(a)*r*.18,x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65,color,Math.max(2,r*.13));}
 ellipse(x,y,r*.21,r*.21,'#d6ac6a');ellipse(x-r*.05,y-r*.05,r*.07,r*.07,'#fae3aa');
}
export function sprout(x:number,y:number,k:number){line(x,y,x-2*k,y-34*k,C.sage,2*k);path('M0 -18 Q-25 -38 -21 -19 Q-14 -9 0 -18 M-1 -27 Q22 -46 22 -28 Q15 -16 -1 -27',x,y,C.sage,k);line(x-17*k,y-22*k,x-3*k,y-18*k,'#a7b88e',.6*k);}
