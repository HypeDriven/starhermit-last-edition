// Mechanical additions to the city's margins. No required route depends on an upgrade.
export const UPGRADES=[
  {id:'ears',name:'Silk Ear Seams',cost:250,label:'A slower, longer glide',description:'Descend 38% more slowly while gliding, with quicker steering in the air. Stay above the ink for longer.'},
  {id:'breath',name:'A Longer Breath',cost:300,label:'Find your voice sooner',description:'Your cry recovers in 1.8 seconds instead of 2.6. Airborne lift remains limited to one cry per flight.'},
  {id:'coat',name:'The Blotter Coat',cost:350,label:'One stain taken for you',description:'Absorb one damaging hit. The coat is renewed at each new checkpoint and when you enter a new district.'},
  {id:'voice',name:'A Louder Question',cost:400,label:'A question that carries',description:'Your cry reaches farther, stuns machines for longer, and returns redaction ink at greater speed.'}
];
export const MARGINS=[
  {
    title:'The Unfinished Chime',line:'Raise the draft. Carry one note to another.',
    bells:[{x:1200,y:80,lift:-1},{x:1470,y:225,lift:-1}],bridge:[1460,45,180],
    moths:[{id:0,x:2120,y:225,range:125,rate:1.1}],sentries:[]
  },
  {
    title:'The Delivery Paradox',line:'Set the lift in motion. Deliver the sound before it fades.',
    bells:[{x:75,y:110,lift:0},{x:1970,y:230,lift:-1}],bridge:[2200,65,200],
    moths:[{id:1,x:1425,y:225,range:125,rate:1.3}],
    sentries:[{id:0,x:2080,y:0},{id:1,x:2885,y:0}]
  },
  {
    title:'A Bridge of Ifs',line:'Make a possibility solid. Let it carry a second note.',
    bells:[{x:2410,y:75,lift:-1},{x:2800,y:230,lift:-1}],bridge:[2810,60,210],
    moths:[{id:2,x:2030,y:205,range:115,rate:1.2},{id:3,x:2760,y:255,range:100,rate:1.4}],
    sentries:[{id:2,x:1170,y:0},{id:3,x:3030,y:0}]
  },
  {title:'The First Morning',line:'A future needs people to make it.',bells:[],bridge:[0,0,0],moths:[],sentries:[]}
];
export function hasUpgrade(g,id){return g.upgrades.includes(id);}
export function availableInk(g){return Math.max(0,g.total-g.spent);}
export function cryCooldown(g){return hasUpgrade(g,'breath')?1.8:2.6;}
export function cryRange(g){return hasUpgrade(g,'voice')?365:285;}
export function stunDuration(g){return hasUpgrade(g,'voice')?4.4:3.2;}
export function buyUpgrade(g,id){
  const upgrade=UPGRADES.find(p=>p.id===id);
  if(!upgrade)return 'unknown';
  if(hasUpgrade(g,id))return 'owned';
  if(availableInk(g)<upgrade.cost)return 'poor';
  g.spent+=upgrade.cost;g.upgrades.push(id);if(id==='coat')g.shield=true;
  g.events.push({type:'upgrade'});return 'bought';
}
export function bellPositions(g){return MARGINS[g.chapter].bells.map(b=>{
  if(b.lift<0)return {x:b.x,y:b.y};
  const p=g.deliveryLifts[b.lift];return {x:p.x+(g.revision?Math.sin(g.time*p.speed)*p.range:0)+b.x,y:b.y};
});}
export function newCheckpoint(g){if(hasUpgrade(g,'coat'))g.shield=true;}
export function echoCry(g){
  if(g.echoes.includes(g.chapter))return;
  let touched=false;
  for(const [i,p] of bellPositions(g).entries())if(Math.hypot(g.x-p.x,g.y-p.y)<85){
    if(!g.revision){g.events.push({type:'echo_locked'});return;}
    g.echoTimers[i]=6.5;touched=true;g.events.push({type:'echo_note',x:p.x,y:p.y+42,id:i});
  }
  if(touched&&g.echoTimers.every(t=>t>0)){
    g.echoes.push(g.chapter);g.total+=150;g.events.push({type:'echo_complete',id:g.chapter});
  }
}
export function disrupt(g,reach){
  for(const m of g.moths)if(Math.hypot(g.x-m.x,g.y+40-m.y)<reach){m.stun=stunDuration(g);m.alert=0;}
  for(const t of g.sentries)if(Math.hypot(g.x-t.x,g.y+40-(t.y+48))<reach){t.stun=stunDuration(g);t.windup=0;t.cooldown=2;}
  for(const p of g.shots)if(!p.reflected&&Math.hypot(g.x-p.x,g.y+40-p.y)<reach){p.reflected=true;p.vx*=-(hasUpgrade(g,'voice')?1.65:1.25);p.life=3.2;g.events.push({type:'reflect',x:p.x,y:p.y});}
}
export function marginTick(g,dt,hurt){
  for(let i=0;i<g.echoTimers.length;i++)g.echoTimers[i]=Math.max(0,g.echoTimers[i]-dt);
  if(g.boss.active&&!g.boss.complete){g.shots=[];return;}
  for(const m of g.moths){
    m.stun=Math.max(0,m.stun-dt);
    if(m.stun>0){m.y=Math.max(m.homeY-65,m.y-55*dt);continue;}
    const awake=Math.abs(g.x-m.home)<410&&!g.ground&&g.y>28;
    m.alert=Math.max(0,Math.min(1,m.alert+(awake?dt*1.8:-dt*2)));
    const tx=awake&&m.alert>.8?g.x:m.home+Math.sin(g.time*m.rate)*m.range;
    const ty=awake&&m.alert>.8?g.y+65:m.homeY+Math.sin(g.time*m.rate*1.8)*29;
    m.x+=Math.max(-115*dt,Math.min(115*dt,tx-m.x));m.y+=Math.max(-75*dt,Math.min(75*dt,ty-m.y));
    if(m.alert>.8&&Math.abs(g.x-m.x)<28&&Math.abs(g.y+40-m.y)<29)hurt(g);
  }
  for(const t of g.sentries){
    t.stun=Math.max(0,t.stun-dt);t.cooldown=Math.max(0,t.cooldown-dt);
    if(t.stun>0)continue;
    if(t.windup>0){
      t.windup=Math.max(0,t.windup-dt);
      if(t.windup===0){g.shots.push({x:t.x+t.direction*24,y:t.y+47,vx:t.direction*245,life:3.2,owner:t.id,reflected:false});t.cooldown=2.8;g.events.push({type:'shot',x:t.x,y:t.y+47});}
    }else if(t.cooldown===0&&Math.abs(g.x-t.x)<530&&Math.abs(g.y-t.y)<160){t.direction=g.x>t.x?1:-1;t.windup=.85;g.events.push({type:'sentry_warning',x:t.x,y:t.y+47});}
  }
  for(const p of g.shots){
    const oldX=p.x;p.life-=dt;p.x+=p.vx*dt;
    if(g.barrierXs.some(x=>!g.broken.includes(x)&&Math.min(oldX,p.x)<=x+30&&Math.max(oldX,p.x)>=x-30&&p.y<128)){p.life=0;continue;}
    if(p.reflected){
      const owner=g.sentries.find(t=>t.id===p.owner);
      if(owner&&Math.min(oldX,p.x)<owner.x+24&&Math.max(oldX,p.x)>owner.x-24){
        owner.stun=4.5;owner.windup=0;owner.cooldown=2.8;p.life=0;
        if(!g.reflected.includes(owner.id)){g.reflected.push(owner.id);g.total+=25;g.events.push({type:'rebuttal',x:owner.x,y:owner.y+48});}
      }
    }else if(Math.min(oldX,p.x)<g.x+20&&Math.max(oldX,p.x)>g.x-20&&Math.abs(p.y-(g.y+40))<25){p.life=0;hurt(g);}
  }
  g.shots=g.shots.filter(p=>p.life>0);
}
