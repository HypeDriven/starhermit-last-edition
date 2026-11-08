// The First Morning: a playable, peaceful answer to the corrected headline.
export const AFTERWORD={
  tasks:['NURSERY','WATER','GARDEN','LETTER'],
  headlines:['WE BEGIN AGAIN','ROOM FOR TOMORROW','A CITY OF NAMES'],
  items:[{id:0,x:1090,y:234,name:'The nursery key'},{id:1,x:2190,y:104,name:'A packet of seeds'},{id:2,x:2390,y:169,name:'A packet of seeds'},{id:3,x:2600,y:234,name:'A packet of seeds'}],
  beds:[2520,2740,2960],nursery:380,pump:1690,desk:3300,postbox:{x:4100,y:270},
  citizens:[
    {id:0,x:245,name:'Mara, the caretaker',role:'THE DOOR CAN OPEN AGAIN',lines:[
      'The headline has changed. The hinges have not. We will still have to open the door ourselves.',
      'The nursery key is on the old roof, beyond three paper ledges. Bring it back and I will let the morning in.',
      'I have kept the cradles clean. There is a difference between waiting for the world to end and making room for it to continue.'
    ]},
    {id:1,x:1530,name:'Ivo, the apprentice',role:'A FORECAST THAT CAN BE REPAIRED',lines:[
      'I used to draw the future as a machine. This one actually needs repairing.',
      'Open the waterwheel housing. When the marked vane turns green, give it a cry. Three aligned notes will bring the water back.',
      'Once it flows, the greenhouse can share its seeds. A prediction cannot grow anything. Water can.'
    ]},
    {id:2,x:3110,name:'Ada, the typesetter',role:'THE FIRST LETTER OF THE NEW EDITION',lines:[
      'For once, the page is blank because we have not lived it yet.',
      'Open the nursery, restore the water, and plant the garden. Then meet me at the small press to choose the first words we send out.',
      'The postbox is on the high roof to the east. The new drafts will carry a letter as easily as they carry a pair of impossible ears.'
    ]}
  ]
};
export function createAfterword(){
  /** @type {number[]} */const items=[];
  /** @type {number[]} */const restored=[];
  /** @type {number[]} */const beds=[];
  /** @type {number[]} */const heard=[];
  return {items,restored,beds,heard,pumpOpen:false,charges:0,headline:-1,letterIssued:false,delivered:false,complete:false,
    speaker:0,flight:0,bestFlight:0,skyNotified:false,courierBonus:false};
}
export function seedsInBag(g){return g.afterword.items.filter(id=>id>0).length-g.afterword.beds.length;}
export function valveWindow(g){const phase=g.time%4.2,start=[.8,2.5,1.5][Math.min(2,g.afterword.charges)];return phase>=start&&phase<start+.9;}
function restoreTask(g,id){
  if(g.afterword.restored.includes(id))return false;
  g.afterword.restored.push(id);g.total+=100;g.life=3;g.events.push({type:'restored',id});return true;
}
export function afterwordCry(g){
  const a=g.afterword;
  if(!a.pumpOpen||a.restored.includes(1)||Math.abs(g.x-AFTERWORD.pump)>115||g.y>95)return;
  if(!valveWindow(g)){g.events.push({type:'valve_miss'});return;}
  a.charges++;g.events.push({type:'valve',id:a.charges});
  if(a.charges===3){restoreTask(g,1);g.revision=true;}
}
export function afterwordTick(g,dt,input){
  const a=g.afterword;
  for(const p of AFTERWORD.items){
    if(a.items.includes(p.id)||(p.id>0&&!a.restored.includes(1)))continue;
    if(Math.abs(g.x-p.x)<32&&Math.abs(g.y+40-p.y)<48){a.items.push(p.id);g.events.push({type:'after_item',x:p.x,y:p.y,id:p.id});}
  }
  if(a.letterIssued&&!a.delivered){
    if(!g.ground&&input.glide&&g.vy<0){a.flight+=Math.abs(g.x-g.px);a.bestFlight=Math.max(a.bestFlight,a.flight);}else if(g.ground)a.flight=0;
    if(a.bestFlight>=350&&!a.skyNotified){a.skyNotified=true;g.events.push({type:'sky_post'});}
  }
}
export function afterwordContext(g){
  const a=g.afterword,near=(x,y=0)=>Math.abs(g.x-x)<70&&Math.abs(g.y-y)<75;
  if(near(AFTERWORD.nursery))return {kind:'nursery',label:a.restored.includes(0)?'E  VISIT THE OPEN NURSERY':a.items.includes(0)?'E  OPEN THE NURSERY':'E  ASK ABOUT THE KEY'};
  if(near(AFTERWORD.pump))return {kind:'pump',label:a.restored.includes(1)?'E  LISTEN TO THE WATER':a.pumpOpen?'CRY WHEN THE VANE IS GREEN':'E  OPEN THE WATERWHEEL'};
  for(let i=0;i<AFTERWORD.beds.length;i++)if(near(AFTERWORD.beds[i]))return {kind:'bed',label:a.beds.includes(i)?'E  WATCH THE GARDEN':seedsInBag(g)>0?'E  PLANT A PACKET OF SEEDS':'FIND SEEDS IN THE WATERED GREENHOUSE'};
  if(near(AFTERWORD.desk))return {kind:'desk',label:a.delivered?'E  READ THE NEW HEADLINE':a.letterIssued?'E  REVISE THE LETTER':a.restored.length>=3?'E  WRITE THE FIRST LETTER':'E  PLAN THE FIRST LETTER'};
  if(near(AFTERWORD.postbox.x,AFTERWORD.postbox.y))return {kind:'postbox',label:a.complete?'E  READ THE FIRST EDITION':a.letterIssued?'E  POST THE FIRST LETTER':'A LETTER IS STILL WAITING TO BE WRITTEN'};
  for(const p of AFTERWORD.citizens)if(Math.abs(g.x-p.x)<55&&g.y<85)return {kind:'after_person',label:'E  LISTEN TO '+p.name.split(',')[0].toUpperCase()};
  return {kind:'none',label:''};
}
export function chooseHeadline(g,index){
  const a=g.afterword;
  if(g.chapter!==3||!Number.isInteger(index)||index<0||index>=AFTERWORD.headlines.length)return false;
  if(![0,1,2].every(id=>a.restored.includes(id))||a.delivered)return false;
  a.headline=index;a.letterIssued=true;a.flight=0;g.events.push({type:'letter_written'});return true;
}
export function afterwordInteract(g){
  const a=g.afterword,action=afterwordContext(g);
  if(action.kind==='nursery'){
    a.speaker=0;if(a.items.includes(0)&&!a.restored.includes(0)){restoreTask(g,0);return 'restored';}return 'afterword_talk';
  }
  if(action.kind==='pump'){
    a.speaker=1;if(a.restored.includes(1))return 'afterword_talk';
    a.pumpOpen=true;return 'water';
  }
  if(action.kind==='bed'){
    const i=AFTERWORD.beds.findIndex(x=>Math.abs(g.x-x)<70);
    if(a.beds.includes(i))return 'garden';if(seedsInBag(g)===0)return 'seeds_needed';
    a.beds.push(i);g.events.push({type:'planted',x:AFTERWORD.beds[i],id:i});
    if(a.beds.length===3)restoreTask(g,2);return 'planted';
  }
  if(action.kind==='desk'){
    a.speaker=2;
    if([0,1,2].every(id=>a.restored.includes(id))&&!a.delivered)return 'compose';
    return a.letterIssued?'headline':'afterword_talk';
  }
  if(action.kind==='after_person'){
    a.speaker=AFTERWORD.citizens.find(p=>Math.abs(g.x-p.x)<55).id;return 'afterword_talk';
  }
  if(action.kind==='postbox'){
    if(a.complete){g.result='won';return 'won';}
    if(!a.letterIssued)return 'letter_needed';
    a.delivered=true;restoreTask(g,3);a.complete=true;
    if(a.bestFlight>=350&&!a.courierBonus){a.courierBonus=true;g.total+=150;g.events.push({type:'courier_bonus'});}
    g.result='won';return 'won';
  }
  return 'far';
}
export function restoreAfterword(data){
  const a=createAfterword();if(!data||typeof data!=='object')return a;
  const ids=(value,max)=>Array.isArray(value)?[...new Set(value.filter(id=>Number.isInteger(id)&&id>=0&&id<max))]:[];
  a.items=ids(data.items,4);a.heard=ids(data.heard,3);a.beds=ids(data.beds,3).slice(0,a.items.filter(id=>id>0).length);
  a.restored=ids(data.restored,4);if(!a.items.includes(0))a.restored=a.restored.filter(id=>id!==0);
  a.pumpOpen=data.pumpOpen===true;a.charges=Number.isInteger(data.charges)?Math.max(0,Math.min(3,data.charges)):0;
  if(a.restored.includes(1)){a.pumpOpen=true;a.charges=3;}
  if(a.beds.length<3)a.restored=a.restored.filter(id=>id!==2);
  a.headline=Number.isInteger(data.headline)&&data.headline>=0&&data.headline<3?data.headline:-1;
  a.letterIssued=data.letterIssued===true&&a.headline>=0&&[0,1,2].every(id=>a.restored.includes(id));
  a.delivered=data.delivered===true&&a.letterIssued;
  if(!a.delivered)a.restored=a.restored.filter(id=>id!==3);
  a.complete=a.delivered&&a.restored.length===4;a.courierBonus=a.complete&&data.courierBonus===true;
  a.bestFlight=Number.isFinite(data.bestFlight)&&data.bestFlight>=0?Math.min(data.bestFlight,10000):0;
  a.skyNotified=a.bestFlight>=350;a.speaker=Number.isInteger(data.speaker)?Math.max(0,Math.min(2,data.speaker)):0;
  return a;
}
export function morningObjective(g){
  const a=g.afterword;
  if(a.complete)return 'THE CITY IS OPEN. THERE IS ROOM TO STAY.';
  if(!a.restored.includes(0))return a.items.includes(0)?'BRING THE KEY BACK TO MARA’S NURSERY ←':'FIND THE NURSERY KEY ON THE OLD ROOF →';
  if(!a.restored.includes(1))return !a.pumpOpen?'OPEN IVO’S WATERWHEEL HOUSING →':valveWindow(g)?'VANE ALIGNED — CRY AT THE WATERWHEEL':'WAIT FOR THE GREEN VANE  /  '+a.charges+' OF 3 NOTES';
  if(!a.restored.includes(2))return 'GATHER THE GREENHOUSE SEEDS. PLANT THE THREE BEDS.';
  if(!a.letterIssued)return 'MEET ADA AT THE SMALL PRESS. CHOOSE THE FIRST WORDS →';
  return 'CARRY THE FIRST LETTER TO THE ROOFTOP POSTBOX →';
}
