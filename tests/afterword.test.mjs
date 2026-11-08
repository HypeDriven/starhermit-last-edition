import test from 'node:test';
import assert from 'node:assert/strict';
import {AFTERWORD,createGame,stepGame,cry,jump,interact,chooseHeadline,valveWindow,seedsInBag,snapshot,restore,buyUpgrade} from '../game/src/model.js';
const idle={move:0,glide:false};
const step=(g,n,input=idle)=>{for(let i=0;i<n;i++)stepGame(g,1/60,input);};
function preparedMorning(){
  const g=createGame(3,[0,1,2,3,4],1000);g.afterword.items=[0,1,2,3];g.afterword.restored=[0,1,2];g.afterword.beds=[0,1,2];g.afterword.pumpOpen=true;g.afterword.charges=3;g.revision=true;return g;
}

test('the corrected press opens a fourth chapter while preserving the edition',()=>{
  const g=createGame(2,[0,1,2,3,4],1200,[0,3,8],[0,1,2]);buyUpgrade(g,'ears');g.x=4000;g.boss.active=true;g.boss.complete=true;
  assert.equal(interact(g),'chapter');
  const morning=createGame(3,g.letters,g.total,g.memories,g.talked,g.reports,g);
  assert.deepEqual(morning.upgrades,['ears']);assert.deepEqual(morning.memories,[0,3,8]);assert.equal(morning.spent,250);assert.equal(morning.moths.length,0);assert.equal(morning.sentries.length,0);assert.equal(morning.motes.length,0);
});
test('a nursery needs its real key and pays its restoration reward only once',()=>{
  const g=createGame(3);g.x=AFTERWORD.nursery;assert.equal(interact(g),'afterword_talk');assert.equal(g.total,0);
  const key=AFTERWORD.items[0];g.x=key.x;g.y=g.py=190;step(g,1);assert.deepEqual(g.afterword.items,[0]);
  g.x=AFTERWORD.nursery;g.y=g.py=0;assert.equal(interact(g),'restored');assert.equal(g.total,100);
  assert.equal(interact(g),'afterword_talk');assert.equal(g.total,100);
});
test('greenhouse seeds stay unavailable until the water returns',()=>{
  const g=createGame(3),p=AFTERWORD.items[1];g.x=p.x;g.y=g.py=p.y-40;step(g,1);assert.equal(seedsInBag(g),0);
  g.afterword.restored.push(1);g.y=g.py=p.y-40;step(g,1);assert.equal(seedsInBag(g),1);step(g,1);assert.equal(seedsInBag(g),1);
});
test('three aligned cries restore the waterwheel with the original cooldown',()=>{
  const g=createGame(3);g.x=AFTERWORD.pump;assert.equal(interact(g),'water');cry(g);assert.equal(g.afterword.charges,0);
  for(let i=0;i<1200&&!g.afterword.restored.includes(1);i++){
    if(g.cry===0&&valveWindow(g))cry(g);step(g,1);
  }
  assert.equal(g.afterword.charges,3);assert.ok(g.afterword.restored.includes(1));assert.equal(g.revision,true);assert.equal(g.total,100);
  g.cry=0;cry(g);assert.equal(g.total,100);
});
test('planting consumes distinct seed packets and restores a garden once',()=>{
  const g=createGame(3);g.afterword.items=[1,2,3];g.afterword.restored=[1];
  for(const x of AFTERWORD.beds){g.x=x;g.y=0;assert.equal(interact(g),'planted');}
  assert.equal(seedsInBag(g),0);assert.equal(g.total,100);assert.ok(g.afterword.restored.includes(2));
  assert.equal(interact(g),'garden');assert.equal(g.total,100);
  const empty=createGame(3);empty.x=AFTERWORD.beds[0];assert.equal(interact(empty),'seeds_needed');assert.deepEqual(empty.afterword.beds,[]);
});
test('the first letter needs a restored city and its words can be revised before posting',()=>{
  const empty=createGame(3);assert.equal(chooseHeadline(empty,0),false);
  const g=preparedMorning();g.x=AFTERWORD.desk;assert.equal(interact(g),'compose');
  assert.equal(chooseHeadline(g,-1),false);assert.equal(chooseHeadline(g,3),false);assert.equal(chooseHeadline(g,1),true);assert.equal(g.afterword.letterIssued,true);
  assert.equal(interact(g),'compose');assert.equal(chooseHeadline(g,2),true);assert.equal(g.afterword.headline,2);
});
test('the rooftop delivery needs the letter and the correct elevation',()=>{
  const g=preparedMorning();g.x=AFTERWORD.postbox.x;g.y=AFTERWORD.postbox.y;assert.equal(interact(g),'letter_needed');
  chooseHeadline(g,0);g.y=0;assert.equal(interact(g),'far');g.y=270;
  assert.equal(interact(g),'won');assert.equal(g.afterword.complete,true);assert.equal(g.total,1100);assert.equal(chooseHeadline(g,1),false);
  g.result=null;assert.equal(interact(g),'won');assert.equal(g.total,1100);
});
test('Sky Post counts a carried glide, rejects wall pushing, and awards only on delivery',()=>{
  const g=preparedMorning();chooseHeadline(g,1);g.x=g.px=4275;g.y=g.py=500;g.ground=false;g.vx=285;g.vy=-120;
  step(g,30,{move:1,glide:true});assert.equal(g.afterword.bestFlight,0);
  g.x=g.px=3500;g.y=g.py=500;step(g,85,{move:1,glide:true});assert.ok(g.afterword.bestFlight>=350);assert.equal(g.total,1000);
  g.x=4100;g.y=270;assert.equal(interact(g),'won');assert.equal(g.total,1250);assert.equal(g.afterword.courierBonus,true);
  g.result=null;interact(g);assert.equal(g.total,1250);
});
function jumpTo(g,x,y){
  jump(g);let glide=true;
  for(let i=0;i<240;i++){
    const dx=x-g.x;if(Math.abs(dx)<20&&g.y>y+8)glide=false;
    stepGame(g,1/60,{move:Math.abs(dx)>8?Math.sign(dx):0,glide});
    if(i>5&&g.ground&&g.y>=y-1&&Math.abs(x-g.x)<30)return;
  }
  assert.fail(`unreachable ledge ${x},${y}; at ${Math.round(g.x)},${Math.round(g.y)}`);
}
test('key and greenhouse routes can be climbed with base movement',()=>{
  const g=createGame(3);g.x=700;g.y=g.py=60;jumpTo(g,870,125);jumpTo(g,1090,190);assert.ok(g.afterword.items.includes(0));
  g.x=2180;g.y=g.py=60;g.afterword.restored.push(1);step(g,1);jumpTo(g,2390,125);jumpTo(g,2600,190);assert.equal(seedsInBag(g),3);
});
test('the rooftop postbox is reachable without a purchased upgrade',()=>{
  const g=preparedMorning();chooseHeadline(g,0);g.x=3490;g.y=g.py=70;
  jumpTo(g,3640,140);jumpTo(g,3850,210);jumpTo(g,4100,270);assert.equal(interact(g),'won');assert.equal(g.upgrades.length,0);
});
test('the high drafts and an airborne cry can earn Sky Post with base abilities',()=>{
  const g=preparedMorning();chooseHeadline(g,0);g.x=3490;g.y=g.py=70;jump(g);
  for(let i=0;i<200;i++){if(i===45)cry(g);step(g,1,{move:1,glide:true});}
  assert.ok(g.afterword.bestFlight>=350);assert.equal(g.upgrades.length,0);
});
test('restoration, inventory, headline and completion survive a resumed city',()=>{
  const g=preparedMorning();chooseHeadline(g,2);g.afterword.heard=[0,1,2];g.x=4100;g.y=270;interact(g);
  const loaded=restore(JSON.parse(JSON.stringify(snapshot(g))));assert.ok(loaded);assert.equal(loaded.chapter,3);assert.equal(loaded.afterword.complete,true);assert.equal(loaded.afterword.headline,2);assert.equal(loaded.revision,true);assert.equal(loaded.total,1100);
  loaded.x=4100;loaded.y=270;assert.equal(interact(loaded),'won');assert.equal(loaded.total,1100);
});
test('older editions migrate without granting restoration or inventing a future chapter',()=>{
  const old=snapshot(createGame(2,[0,1,2,3,4],900));old.schema=3;delete old.afterword;
  const loaded=restore(old);assert.equal(loaded.total,900);assert.deepEqual(loaded.afterword.restored,[]);
  old.chapter=3;assert.equal(restore(old),null);
  const broken=snapshot(createGame(3));broken.afterword={items:[],beds:[0,1,2],restored:[0,2,3],headline:0,letterIssued:true,delivered:true};
  const clean=restore(broken);assert.equal(clean.afterword.complete,false);assert.equal(clean.afterword.letterIssued,false);assert.equal(seedsInBag(clean),0);
});
