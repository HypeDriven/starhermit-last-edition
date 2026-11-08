import * as draw from 'starhermit:draw';
import {OffscreenCanvas, FontFace, fonts} from 'starhermit:canvas';
import type {ColorLike} from 'starhermit:engine';

export const C={paper:'#e7dfc9',cream:'#f4ecd7',ink:'#292c28',faint:'#b4af9c',red:'#ad4637',muted:'#777769',sage:'#6a7c64'};
export let S=1, W=1280, H=800;
export function viewport(w:number,h:number){S=w/h<1? w/720:Math.min(w/1280,h/800);W=w/S;H=h/S;}
export function rect(x:number,y:number,w:number,h:number,color:ColorLike){draw.rect(x*S,y*S,w*S,h*S,color);}
export function stroke(x:number,y:number,w:number,h:number,col:ColorLike=C.ink,lw=1){draw.strokeRect(x*S,y*S,w*S,h*S,col,lw*S);}
export function line(x:number,y:number,x2:number,y2:number,c:ColorLike=C.ink,lw=1){draw.line(x*S,y*S,x2*S,y2*S,c,lw*S);}
export function ellipse(x:number,y:number,rx:number,ry:number,c:ColorLike,rotation=0){draw.ellipse(x*S,y*S,rx*S,ry*S,c,{rotation});}
export function ring(x:number,y:number,r:number,col:ColorLike,lw=1){draw.strokeCircle(x*S,y*S,r*S,col,lw*S);}
export function path(d:string,x:number,y:number,fill:ColorLike,scale=1,strokeCol?:ColorLike,lw=1){
  const o:draw.PathOptions={fill,scale:scale*S};if(strokeCol){o.stroke=strokeCol;o.lineWidth=lw;}
  draw.path(d,x*S,y*S,o);
}
export function text(t:string,x:number,y:number,size=20,color:ColorLike=C.ink,font='Body',align:'start'|'center'|'end'='start',spacing=0){draw.text(t,x*S,y*S,{size:size*S,color,font,align,letterSpacing:spacing*S});}
export function image(im:OffscreenCanvas,x:number,y:number,w:number,h:number,alpha=1){draw.image(im,x*S,y*S,w*S,h*S,{tint:[1,1,1,alpha]});}
export let grain:OffscreenCanvas, city:OffscreenCanvas;
let seed=811;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
export async function loadArt(){
  const faces=[new FontFace('Display','assets/display.ttf'),new FontFace('Body','assets/body.ttf'),new FontFace('Mono','assets/mono.ttf')];
  for(const face of faces)fonts.add(face);
  await Promise.all(faces.map(f=>f.load()));
  grain=new OffscreenCanvas(640,400);const g=grain.getContext('2d');
  for(let i=0;i<3200;i++){g.fillStyle=i%2?'#4a40300a':'#fff8e91a';g.fillRect(rand()*640,rand()*400,rand()*1.6+.25,rand()*1.2+.25);}
  for(let i=0;i<24;i++){const x=rand()*640;g.strokeStyle='#4a403003';g.beginPath();g.moveTo(x,0);g.lineTo(x+rand()*9-4.5,400);g.stroke();}
  city=new OffscreenCanvas(1800,500);const c=city.getContext('2d');
  // An original engraved skyline, baked once and reused by the GPU.
  for(let layer=0;layer<3;layer++){
    let x=-30;c.fillStyle=['#b5b19e','#909583','#616c5f'][layer]!;
    while(x<1800){
      const w=42+rand()*78,h=50+rand()*190+layer*20,base=410+layer*35;
      c.fillRect(x,base-h,w,h+50);
      c.beginPath();c.moveTo(x-6,base-h);c.lineTo(x+w*.5,base-h-22-rand()*35);c.lineTo(x+w+6,base-h);c.closePath();c.fill();
      if(rand()>.55){c.fillRect(x+w*.7,base-h-58,7,45);c.fillRect(x+w*.7-3,base-h-59,13,4);}
      c.fillStyle=['#d2ccb6','#c6c0a8','#a5ac91'][layer]!;
      for(let wy=base-h+20;wy<base-5;wy+=22)for(let wx=x+10;wx<x+w-8;wx+=19){if(rand()>.16){c.fillRect(wx,wy,5,10);c.fillRect(wx+2,wy,1,10);}}
      c.strokeStyle='#e7dfc927';c.lineWidth=.65;
      for(let k=0;k<9;k++){const xx=x+rand()*w;c.beginPath();c.moveTo(xx,base-h+8);c.lineTo(xx,base);c.stroke();}
      c.fillStyle=['#b5b19e','#909583','#616c5f'][layer]!;x+=w+6+rand()*17;
    }
  }
  // Observatory at the heart of the city.
  c.fillStyle='#4d5a50';c.fillRect(1040,110,98,370);c.beginPath();c.arc(1089,110,58,Math.PI,0);c.fill();
  c.fillRect(1086,11,6,47);c.fillRect(1080,26,18,3);c.strokeStyle='#c5c5a7';c.lineWidth=2;
  c.beginPath();c.arc(1089,164,27,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(1089,144);c.lineTo(1089,166);c.lineTo(1100,171);c.stroke();
  for(let y=221;y<470;y+=38)for(let x=1053;x<1130;x+=23){c.fillStyle='#b4b89b';c.fillRect(x,y,8,19);}
}

// Same vulnerable silhouette as the clipping; an expressive, original ink character.
export function baby(x:number,feet:number,k=1,time=0,run=0,glide=false,face=1,blink=false){
  const bounce=Math.abs(Math.sin(time*10))*run*2;
  const y=feet-bounce*k;
  ellipse(x,feet+2*k,27*k,5*k,'#292c2828');
  // Long ink arms, duck feet, high waisted shorts.
  path('M-14 -43 Q-25 -29 -21 -11 L-17 -8 Q-14 -10 -17 -14 L-15 -31 Z',x,y,C.ink,k);
  path('M14 -43 Q25 -29 21 -11 L17 -8 Q14 -10 17 -14 L15 -31 Z',x,y,C.ink,k);
  path('M-13 -37 Q0 -30 13 -37 L11 -19 L4 -18 L4 -4 L13 -3 Q16 1 11 2 L-1 2 L-3 -21 L-7 -4 L-2 -2 L-2 2 L-17 2 Q-20 -1 -14 -4 L-14 -18 Z',x,y,C.ink,k);
  path('M-14 -45 Q0 -52 14 -45 L13 -30 Q0 -24 -13 -30 Z',x,y,C.cream,k,C.ink,1.4);
  path('M-11 -33 Q0 -29 11 -33',x,y,C.ink,k);
  // Ears spread into gliding wings.
  if(glide){
    path('M-20 -67 Q-38 -86 -61 -75 L-50 -60 L-35 -54 L-20 -56 Z',x,y,C.cream,k,C.ink,1.9);
    path('M20 -67 Q38 -86 61 -75 L50 -60 L35 -54 L20 -56 Z',x,y,C.cream,k,C.ink,1.9);
    path('M-25 -63 L-53 -72 L-39 -59 Z M25 -63 L53 -72 L39 -59 Z',x,y,C.ink,k);
  }else{
    path('M-21 -67 Q-34 -66 -42 -79 Q-46 -67 -36 -53 L-21 -52 Z',x,y,C.cream,k,C.ink,1.9);
    path('M21 -67 Q34 -66 42 -79 Q46 -67 36 -53 L21 -52 Z',x,y,C.cream,k,C.ink,1.9);
    path('M-25 -60 L-37 -71 L-31 -57 Z M25 -60 L37 -71 L31 -57 Z',x,y,C.ink,k);
  }
  path('M0 -105 C-31 -105 -34 -84 -27 -65 Q-22 -47 0 -42 Q22 -47 27 -65 C34 -84 31 -105 0 -105 Z',x,y,C.cream,k,C.ink,2);
  path('M14 -102 Q35 -90 26 -65 L12 -46 Q30 -49 32 -72 Q35 -95 14 -102 Z',x,y,'#77776945',k);
  const eyeY=y-69*k;
  for(const sign of [-1,1]){
    ellipse(x+sign*11*k,eyeY,8.5*k,(blink?1.7:11)*k,C.ink);
    if(!blink){ellipse(x+sign*11*k,eyeY-.5*k,6.7*k,8.8*k,C.cream);ellipse(x+(sign*11+face*1.7)*k,eyeY+.6*k,3.7*k,5.4*k,C.ink);ellipse(x+(sign*11+face*1.7-1)*k,eyeY-1.3*k,1.2*k,1.5*k,C.cream);}
  }
  ellipse(x-2*k,y-54*k,1*k,1.4*k,C.ink);ellipse(x+2*k,y-54*k,1*k,1.4*k,C.ink);
  path('M-5 -49 Q0 -46 5 -49 Q0 -41 -5 -49Z',x,y,C.ink,k);
  // Fine woodcut marks.
  for(let i=0;i<5;i++)line(x+(-20+i*2)*k,y+(-90-i*1.1)*k,x+(-23+i*2)*k,y+(-85-i*1.1)*k,'#77776955',.6*k);
}

export function gear(x:number,y:number,r:number,rot:number,color=C.ink){
  const pts:[number,number][]=[];
  for(let i=0;i<40;i++){const a=i/40*Math.PI*2+rot,rr=r*(i%4<2?1:.78);pts.push([(x+Math.cos(a)*rr)*S,(y+Math.sin(a)*rr)*S]);}
  draw.polygon(pts,color);ellipse(x,y,r*.45,r*.45,C.paper);ellipse(x,y,r*.2,r*.2,color);
}
export function sprout(x:number,y:number,k:number){line(x,y,x-2*k,y-34*k,C.sage,2*k);path('M0 -18 Q-25 -38 -21 -19 Q-14 -9 0 -18 M-1 -27 Q22 -46 22 -28 Q15 -16 -1 -27',x,y,C.sage,k);}
