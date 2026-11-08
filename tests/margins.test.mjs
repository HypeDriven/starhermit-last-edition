import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,jump,cry,hurt,revive,restore,snapshot,buyUpgrade,availableInk,cryCooldown,cryRange,bellPositions,liftPosition,MARGINS} from '../game/src/model.js';
const idle={move:0,glide:false};
const step=(g,n,input=idle)=>{for(let i=0;i<n;i++)stepGame(g,1/60,input);};

test('upgrade purchases spend available ink once while preserving earned score',()=>{
  const g=createGame(0,[],500);
  assert.equal(buyUpgrade(g,'missing'),'unknown');assert.equal(buyUpgrade(g,'ears'),'bought');
  assert.equal(g.total,500);assert.equal(g.spent,250);assert.equal(availableInk(g),250);
  assert.equal(buyUpgrade(g,'ears'),'owned');assert.equal(buyUpgrade(g,'voice'),'poor');assert.equal(g.spent,250);
});
test('a longer breath changes the real cry cooldown',()=>{
  const g=createGame(0,[],500);buyUpgrade(g,'breath');cry(g);assert.equal(cryCooldown(g),1.8);assert.equal(g.cry,1.8);
  step(g,109);assert.equal(cry(g),true);
});
test('silk ear seams slow descent and improve airborne steering',()=>{
  const normal=createGame(),silk=createGame(0,[],500);buyUpgrade(silk,'ears');
  for(const g of [normal,silk]){g.x=200;g.y=g.py=300;g.ground=false;g.vy=-200;}
  step(normal,30,{move:1,glide:true});step(silk,30,{move:1,glide:true});
  assert.equal(normal.vy,-120);assert.equal(silk.vy,-75);assert.ok(silk.y>normal.y+20);assert.ok(silk.x>normal.x);
});
test('a louder question has a wider reach and a longer stun',()=>{
  const g=createGame(0,[],500);g.x=1500;g.enemies[0].x=1840;buyUpgrade(g,'voice');cry(g);
  assert.equal(cryRange(g),365);assert.ok(g.enemies[0].stun>4.3);
  const plain=createGame();plain.x=1500;plain.enemies[0].x=1840;cry(plain);assert.equal(plain.enemies[0].stun,0);
});
test('a blotter coat absorbs once and renews only at a new checkpoint',()=>{
  const g=createGame(0,[],500);buyUpgrade(g,'coat');hurt(g);
  assert.equal(g.life,3);assert.equal(g.damage,0);assert.equal(g.shield,false);
  g.invincible=0;hurt(g);assert.equal(g.life,2);revive(g);assert.equal(g.shield,false);
  g.x=1005;step(g,1);assert.equal(g.checkpoint,1035);assert.equal(g.shield,true);
  g.invincible=0;hurt(g);g.x=1010;step(g,1);assert.equal(g.shield,false);
});
test('purchases and a stained coat survive saves and district transitions',()=>{
  const g=createGame(0,[0],1000);buyUpgrade(g,'coat');buyUpgrade(g,'breath');hurt(g);
  const loaded=restore(JSON.parse(JSON.stringify(snapshot(g))));assert.ok(loaded);assert.equal(loaded.spent,650);assert.equal(loaded.shield,false);assert.deepEqual(loaded.upgrades,['coat','breath']);
  const next=createGame(1,g.letters,g.total,g.memories,g.talked,g.reports,g);
  assert.equal(next.shield,true);assert.equal(next.spent,650);assert.equal(cryCooldown(next),1.8);
});
test('version two saves retain their progress and gain an empty upgrade ledger',()=>{
  const g=createGame(1,[0,1],650,[0,2],[0]);g.revision=true;g.checkpoint=1035;
  const data=snapshot(g);data.schema=2;delete data.upgrades;delete data.spent;delete data.echoes;delete data.reflected;delete data.shield;
  const loaded=restore(data);assert.equal(loaded.total,650);assert.equal(loaded.x,1035);assert.equal(loaded.revision,true);assert.deepEqual(loaded.memories,[0,2]);assert.deepEqual(loaded.upgrades,[]);assert.equal(availableInk(loaded),650);
});
test('chimes require a revised rule and both notes before the first fades',()=>{
  const g=createGame();g.invincible=99;let p=bellPositions(g)[0];g.x=p.x;g.y=p.y;
  cry(g);assert.deepEqual(g.echoTimers,[0,0]);g.cry=0;g.revision=true;cry(g);assert.equal(g.echoTimers[0],6.5);
  g.x=1100;g.y=0;step(g,400);p=bellPositions(g)[1];g.x=p.x;g.y=p.y;g.cry=0;cry(g);assert.equal(g.echoes.length,0);
  p=bellPositions(g)[0];g.x=p.x;g.y=p.y;g.cry=0;const before=g.total;cry(g);assert.deepEqual(g.echoes,[0]);assert.equal(g.total-before,150);
  g.cry=0;cry(g);assert.equal(g.total-before,150);
});
test('the factory chime rides the moving lift',()=>{
  const g=createGame(1);g.revision=true;g.time=2;const bell=bellPositions(g)[0],lift=liftPosition(g,g.deliveryLifts[0]);
  assert.equal(bell.x,lift.x+75);assert.equal(bell.y,lift.y);
  g.x=bell.x;g.y=bell.y;cry(g);assert.equal(g.echoTimers[0],6.5);
});
function jumpTo(g,x,y){
  jump(g);
  for(let i=0;i<120;i++){
    const dx=x-g.x;stepGame(g,1/60,{move:Math.abs(dx)>8?Math.sign(dx):0,glide:true});
    if(i>5&&g.ground&&g.y>=y-1&&Math.abs(dx)<30)return;
  }
  assert.fail(`did not reach ledge ${x},${y}; at ${Math.round(g.x)},${Math.round(g.y)}`);
}
test('all three timed chime routes can be traversed with base abilities',()=>{
  const starts=[[1200,80],[1610,110],[2410,75]],routes=[[[1340,155],[1500,225]],[[1800,80],[2010,150],[1905,230]],[[2640,150],[2730,230]]];
  for(let chapter=0;chapter<3;chapter++){
    const g=createGame(chapter);g.invincible=99;g.revision=true;[g.x,g.y]=starts[chapter];g.py=g.y;cry(g);
    for(const [x,y] of routes[chapter])jumpTo(g,x,y);
    while(g.cry>0)step(g,1);assert.ok(g.echoTimers[0]>0,'first note still ringing');cry(g);assert.ok(g.echoes.includes(chapter),`solved district ${chapter}`);
  }
});
test('a solved chime unfolds a permanent, saved shortcut and resets fading notes on damage',()=>{
  const g=createGame();g.revision=true;
  for(const p of bellPositions(g)){g.x=p.x;g.y=p.y;g.cry=0;cry(g);}
  const loaded=restore(snapshot(g));assert.deepEqual(loaded.echoes,[0]);const p=MARGINS[0].bridge;loaded.x=p[0]+40;loaded.y=loaded.py=p[1]+10;loaded.ground=false;loaded.invincible=99;step(loaded,12);assert.equal(loaded.y,p[1]);
  const fresh=createGame();fresh.echoTimers=[5,4];hurt(fresh);assert.deepEqual(fresh.echoTimers,[0,0]);
});
test('redaction sentries telegraph a shot before firing',()=>{
  const g=createGame(1);g.x=1700;g.invincible=99;g.sentries[0].cooldown=0;g.sentries[1].cooldown=99;
  step(g,1);assert.ok(g.sentries[0].windup>.8);assert.equal(g.shots.length,0);
  step(g,40);assert.equal(g.shots.length,0);step(g,15);assert.equal(g.shots.length,1);assert.ok(g.shots[0].vx<0);
});
test('a timed cry returns ink to its source, silences it, and rewards only once',()=>{
  const g=createGame(1);g.x=1850;g.invincible=99;
  const shot=()=>({x:1950,y:47,vx:-245,life:.1,owner:0,reflected:false});
  g.shots.push(shot());cry(g);assert.ok(g.shots[0].vx>0);assert.ok(g.shots[0].life>3);
  step(g,40);assert.ok(g.sentries[0].stun>3);assert.deepEqual(g.reflected,[0]);assert.equal(g.total,25);
  g.shots.push(shot());g.cry=0;cry(g);step(g,40);assert.equal(g.total,25);assert.deepEqual(restore(snapshot(g)).reflected,[0]);
});
test('ink projectiles hit the floor route and pass underneath a high jump',()=>{
  const low=createGame(1),high=createGame(1);
  for(const g of [low,high]){g.x=2000;g.shots.push({x:2015,y:47,vx:-245,life:2,owner:0,reflected:false});}
  high.y=high.py=120;high.ground=false;step(low,4);step(high,4);assert.equal(low.life,2);assert.equal(high.life,3);
});
test('rumour moths notice airborne players and can be interrupted by a cry',()=>{
  const g=createGame();g.x=2050;g.y=g.py=290;g.ground=false;g.invincible=99;step(g,60,{move:0,glide:true});
  assert.ok(g.moths[0].alert>.8);cry(g);assert.ok(g.moths[0].stun>3);
  const quiet=createGame();quiet.x=2050;step(quiet,60);assert.equal(quiet.moths[0].alert,0);
});
