import * as draw from 'starhermit:draw';
import {OffscreenCanvas, FontFace, fonts, createImageBitmap} from 'starhermit:canvas';
import type {ImageBitmap} from 'starhermit:canvas';
import type {ColorLike} from 'starhermit:engine';

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
export function text(t:string,x:number,y:number,size=20,color:ColorLike=C.ink,font='Body',align:'start'|'center'|'end'='start',spacing=0){draw.text(t,x*S,y*S,{size:size*S,color,font,align,letterSpacing:spacing*S});}
export function image(im:OffscreenCanvas|ImageBitmap,x:number,y:number,w:number,h:number,alpha=1){draw.image(im,x*S,y*S,w*S,h*S,{tint:[1,1,1,alpha]});}
export let grain:OffscreenCanvas,city:OffscreenCanvas;
let glow:OffscreenCanvas,edge:OffscreenCanvas,terrain:OffscreenCanvas;
let hero:ImageBitmap,heroLeft:ImageBitmap;
const paintings:ImageBitmap[]=[];
let seed=811;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
export async function loadArt(){
 const faces=[new FontFace('Display','assets/display.ttf'),new FontFace('Body','assets/body.ttf'),new FontFace('Mono','assets/mono.ttf')];
 for(const face of faces)fonts.add(face);await Promise.all(faces.map(f=>f.load()));
 await Promise.all(['nursery','factory','press','morning'].map(async(n,i)=>{paintings[i]=await createImageBitmap('assets/remaster/'+n+'.png');}));
 [hero,heroLeft]=await Promise.all(['hero-cutout','hero-left'].map(n=>createImageBitmap('assets/remaster/'+n+'.png')));
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
// The hand-painted cutout is animated with a breathing bob, stride and trailing paper scarf.
export function baby(x:number,feet:number,k=1,time=0,run=0,glide=false,face=1,blink=false){
 const bounce=Math.sin(time*(run>.1?12:2.2))*(run> .1?2.3:1.1),y=feet-bounce*k;
 ellipse(x,feet+2*k,24*k,4*k,'#07172255');
 const tail=face>0?-1:1,wave=Math.sin(time*7)*5;
 if(run>.1||glide){
  path(`M0 0 Q${tail*20} ${-3+wave} ${tail*36} ${3+wave} L${tail*32} ${8+wave} Q${tail*20} 4 0 5 Z`,x,y-61*k,'#9b4529',k);
  path(`M0 0 Q${tail*20} ${-3+wave} ${tail*36} ${3+wave} L${tail*33} ${5+wave} Q${tail*20} 0 0 2 Z`,x,y-61*k,'#d1874a80',k);
 }
 if(glide){
  light(x,y-62*k,72*k,.4);
  path('M-16 -65 Q-50 -102 -82 -90 L-68 -62 L-36 -47 Z',x,y,C.cream,k,'#c09356',1);
  path('M16 -65 Q50 -102 82 -90 L68 -62 L36 -47 Z',x,y,C.cream,k,'#c09356',1);
  for(const sign of [-1,1]){line(x+sign*24*k,y-66*k,x+sign*75*k,y-85*k,'#a8875870',k);line(x+sign*30*k,y-60*k,x+sign*64*k,y-68*k,'#a8875850',.8*k);}
 }
 image(face<0?heroLeft:hero,x-30.25*k,y-107*k,60.5*k,110*k);
 if(blink)ellipse(x+face*9*k,y-70*k,4*k,.8*k,'#443e32');
 if(run>.3){for(let i=0;i<2;i++)ellipse(x-face*(18+i*10)*k,feet+1*k,(3-i)*k,1.5*k,'#ffe2b342');}
}
export function gear(x:number,y:number,r:number,rot:number,color=C.ink){
 const pts:[number,number][]=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2+rot,rr=r*(i%4<2?1:.83);pts.push([(x+Math.cos(a)*rr)*S,(y+Math.sin(a)*rr)*S]);}
 draw.polygon(pts,color);ring(x,y,r*.73,'#d9b677',Math.max(1,r*.08));ellipse(x,y,r*.46,r*.46,'#172d37');
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2+rot;line(x+Math.cos(a)*r*.18,y+Math.sin(a)*r*.18,x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65,color,Math.max(2,r*.13));}
 ellipse(x,y,r*.21,r*.21,'#d6ac6a');ellipse(x-r*.05,y-r*.05,r*.07,r*.07,'#fae3aa');
}
export function sprout(x:number,y:number,k:number){line(x,y,x-2*k,y-34*k,C.sage,2*k);path('M0 -18 Q-25 -38 -21 -19 Q-14 -9 0 -18 M-1 -27 Q22 -46 22 -28 Q15 -16 -1 -27',x,y,C.sage,k);line(x-17*k,y-22*k,x-3*k,y-18*k,'#a7b88e',.6*k);}
