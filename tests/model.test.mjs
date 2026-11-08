import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTERS,createGame,stepGame,jump,cry,hurt,interact,DETAILS,PROOF_PLATES,liftPosition,snapshot,restore,revive,bossVulnerable,keepTestimony} from '../game/src/model.js';
const idle={move:0,glide:false};
const step=(g,n,input=idle)=>{for(let i=0;i<n;i++)stepGame(g,1/60,input);};

test('buffered jump lands on a paper platform; ears extend a falling jump',()=>{
  const g=createGame();g.x=405;g.px=405;jump(g);step(g,42);assert.equal(g.y,72);assert.equal(g.ground,true);
  const normal=createGame(),glider=createGame();jump(normal);jump(glider);
  step(normal,43,{move:1,glide:false});step(glider,43,{move:1,glide:true});
  assert.ok(glider.y>normal.y+20);assert.ok(glider.vy>=-120);
});
test('all five letters can be collected by jumping from their approach platforms',()=>{
  for(let chapter=0;chapter<3;chapter++)for(const item of CHAPTERS[chapter].letters){
    const g=createGame(chapter);g.x=item.x-155;g.px=g.x;g.y=g.py=[72,90,80,75,75][item.id];
    jump(g);step(g,35,{move:1,glide:true});
    assert.ok(g.letters.includes(item.id),`reachable letter ${item.id}`);
  }
});
test('cry breaks a barrier, stuns the censor, and has a real cooldown',()=>{
  const g=createGame();g.x=1470;g.enemies[0].x=1450;
  assert.equal(cry(g),true);assert.ok(g.broken.includes(1590));assert.ok(g.enemies[0].stun>3);
  assert.equal(cry(g),false);assert.ok(g.events.some(e=>e.type==='break'));
  g.x=1300;step(g,160);assert.equal(cry(g),true);
});
test('damage preserves letters, respawns safely and cannot consume lives twice during invulnerability',()=>{
  const g=createGame(1,[0,1]);g.letters.push(2);g.checkpoint=1035;g.x=1500;
  hurt(g);assert.equal(g.life,2);assert.equal(g.x,1035);assert.ok(g.letters.includes(2));
  hurt(g);assert.equal(g.life,2);g.invincible=0;hurt(g);g.invincible=0;hurt(g);assert.equal(g.result,'lost');
});
test('presses reject missing letters, advance two chapters and finish only with FIRST',()=>{
  let g=createGame();g.x=3000;assert.equal(interact(g),'locked');
  g.letters=[0,1];assert.equal(interact(g),'chapter');
  g=createGame(1,g.letters,200);g.x=3250;assert.equal(interact(g),'locked');g.letters.push(2,3);assert.equal(interact(g),'chapter');
  g=createGame(2,g.letters,400);g.x=4000;assert.equal(interact(g),'locked');g.letters.push(4);assert.equal(interact(g),'boss');assert.notEqual(g.result,'won');g.boss.complete=true;assert.equal(interact(g),'chapter');
});
test('a mechanical press telegraphs before its dangerous window',()=>{
  const g=createGame(1);g.x=440;g.time=.8;step(g,1);assert.equal(g.life,3);
  g.time=1.4;step(g,1);assert.equal(g.life,2);
});

test('an airborne cry supplies one extra lift per flight and resets on landing',()=>{
  const g=createGame();jump(g);step(g,22);const before=g.vy;assert.equal(cry(g),true);assert.ok(g.vy>before);assert.equal(g.airCried,true);
  g.cry=0;g.vy=-70;cry(g);assert.equal(g.vy,-70);step(g,120);assert.equal(g.airCried,false);
});
test('each proofreader toggles an actual world rule without spending score',()=>{
  for(let chapter=0;chapter<3;chapter++){const g=createGame(chapter);g.x=DETAILS[chapter].station.x;assert.equal(interact(g),'station');assert.equal(g.revision,true);assert.equal(g.total,0);assert.equal(interact(g),'station');assert.equal(g.revision,false);}
  const a=createGame(),b=createGame();a.x=b.x=850;a.y=b.y=100;a.vy=b.vy=-90;a.ground=b.ground=false;b.revision=true;
  step(a,25,{move:0,glide:true});step(b,25,{move:0,glide:true});assert.ok(b.y>a.y+25);
  const possible=createGame(2),certain=createGame(2);
  for(const g of [possible,certain]){g.x=2200;g.y=g.py=132;g.ground=false;g.invincible=10;}
  possible.revision=true;step(possible,12);step(certain,12);assert.equal(possible.y,120);assert.ok(certain.y<110);
});
test('the moving delivery lift carries a rider rather than sliding out beneath them',()=>{
  const g=createGame(1),p=DETAILS[1].lifts[0];g.revision=true;g.broken=[1610];g.invincible=10;g.x=p.x+50;g.y=g.py=p.y;g.ground=true;
  step(g,30);const lift=liftPosition(g,p);assert.ok(g.x>p.x+80);assert.ok(Math.abs(g.x-(lift.x+50))<2);assert.equal(g.y,p.y);
});
test('a memory restores one life and can never award points twice',()=>{
  const g=createGame(),p=DETAILS[0].scraps[0];g.x=p.x;g.y=g.py=p.y-40;g.life=1;g.ground=false;g.invincible=10;
  step(g,1);assert.ok(g.memories.includes(p.id));assert.equal(g.life,2);const score=g.total;step(g,1);assert.equal(g.total,score);
});
test('chapter challenges award stamps once, with an honest damage counter',()=>{
  const g=createGame();g.letters=[0,1];g.x=3000;g.memories=[0,1,2];g.motes.slice(0,12).forEach(p=>p.got=true);
  interact(g);assert.deepEqual(g.reports[0].medals,[true,true,true]);assert.equal(g.total,225);interact(g);assert.equal(g.total,225);
  const damaged=createGame();hurt(damaged);revive(damaged);damaged.x=3000;damaged.letters=[0,1];interact(damaged);assert.equal(damaged.reports[0].medals[0],false);
});
test('the final press needs three distinct nearby plates during recovery',()=>{
  const g=createGame(2,[0,1,2,3,4]);g.x=4000;assert.equal(interact(g),'boss');assert.equal(bossVulnerable(g),false);
  g.x=PROOF_PLATES[0].x;cry(g);assert.equal(g.boss.plates.length,0);
  for(let i=0;i<3;i++){g.cry=0;g.boss.time=2.5;g.x=PROOF_PLATES[i].x;g.y=PROOF_PLATES[i].y;cry(g);assert.equal(g.boss.plates.length,i+1);}
  assert.equal(g.boss.complete,true);g.x=4000;assert.equal(interact(g),'chapter');
});
test('the final stamp is telegraphed, dangerous on the floor, and jumpable',()=>{
  const floor=createGame(2,[0,1,2,3,4]),air=createGame(2,[0,1,2,3,4]);
  for(const g of [floor,air]){g.x=4000;interact(g);g.x=g.boss.targetX;g.boss.time=.98;}
  jump(air);step(floor,31);step(air,31);assert.equal(floor.life,2);assert.equal(air.life,3);
});
test('new saves preserve pickups, proof plates and challenge rewards without score farming',()=>{
  const g=createGame(2,[0,1,2,3,4],900,[0,3,8],[0,1]);g.x=4000;interact(g);g.motes[0].got=true;g.boss.plates=[0,2];g.revision=true;
  const loaded=restore(JSON.parse(JSON.stringify(snapshot(g))));assert.ok(loaded);assert.equal(loaded.x,3140);assert.equal(loaded.total,900);assert.equal(loaded.motes[0].got,true);assert.deepEqual(loaded.boss.plates,[0,2]);assert.deepEqual(loaded.memories,[0,3,8]);
  const legacy=restore({chapter:1,letters:[0,1],total:230});assert.ok(legacy);assert.equal(legacy.total,230);assert.equal(legacy.x,120);
  assert.equal(restore({chapter:9,letters:[],total:0}),null);assert.equal(restore({chapter:0,letters:[],total:NaN}),null);
});

test('all nine upper-route memories are reachable from real approach platforms',()=>{
  const g=createGame();g.x=720;g.y=g.py=145;g.revision=true;g.invincible=99;jump(g);
  for(let i=0;i<70;i++)stepGame(g,1/60,{move:g.x<945?1:0,glide:true});assert.ok(g.memories.includes(0));
  const approaches=[[0,1370,155,1],[0,2735,145,-1],[1,585,150,1],[1,2060,150,-1],[1,2715,150,1],[2,545,145,1],[2,1235,155,1],[2,2575,150,1]];
  for(let id=1;id<9;id++){
    const [chapter,x,y,move]=approaches[id-1],g=createGame(chapter);g.x=x;g.y=g.py=y;g.invincible=99;
    assert.ok(CHAPTERS[chapter].platforms.some(([px,py,w])=>x>=px&&x<=px+w&&y===py),'approach is a real ledge');
    jump(g);step(g,42,{move,glide:true});assert.ok(g.memories.includes(id),`reachable memory ${id}`);
  }
});
test('testimony is recorded only after listening, survives saves, and cannot duplicate',()=>{
  const g=createGame();g.x=265;assert.equal(interact(g),'citizen');assert.equal(g.talked.length,0);
  keepTestimony(g);keepTestimony(g);assert.deepEqual(g.talked,[0]);assert.deepEqual(restore(snapshot(g)).talked,[0]);
});
