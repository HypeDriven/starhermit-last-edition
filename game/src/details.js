// Optional routes and human stories hidden in the margins of the headline.
export const DETAILS = [
  {
    citizen:{id:0,x:265,name:'Mara, the caretaker',role:'KEEPER OF THE EMPTY NURSERY',
      lines:['They boarded up the nursery after reading the headline. I kept the keys. A prediction does not get to lock a door.',
        'I folded the children’s unfinished stories into paper cranes. There are three in this district. Bring them back into the light.',
        'The proofreader beside the chimney can change STILL to RISING. Open the draft, spread your ears, and follow the paper.',
        'There are two chimes above the old ink channel. Carry one note to the other before it fades. I kept some silk for your ears; the marginalia can show you what it would change.']},
    station:{x:470,original:'STILL',edited:'RISING',hint:'A rising draft opens a path above the ink.'},
    drafts:[{x:795,w:200,power:950}],lifts:[],
    platforms:[[870,225,160],[1460,225,155],[2520,225,150]],
    scraps:[
      {id:0,x:945,y:277,title:'The Unfinished Lullaby',body:'Mara never wrote a final verse. A lullaby is a promise to meet again in the morning.'},
      {id:1,x:1525,y:277,title:'A Pair of Small Shoes',body:'Someone left room inside them for feet that had not yet grown. Hope sometimes looks like an ordinary purchase.'},
      {id:2,x:2590,y:277,title:'The Nursery Key',body:'The city sealed the door. Its caretaker kept making copies of the key.'}
    ]
  },
  {
    citizen:{id:1,x:270,name:'Ivo, the apprentice',role:'ASSISTANT TO THE CHIEF FORECASTER',
      lines:['They asked me to draw the future as a straight line. Every time I drew a branch, they sent it back.',
        'The factory’s proofreader changes FIXED to MOVING. The delivery lift still remembers how to travel.',
        'Listen to the presses. Red means prepare, the stamp means move, and the quiet afterward belongs to you.',
        'The redactors print NO at anyone who passes. A well-timed cry can return it as IF. One of the margin chimes rides the delivery lift. Its partner is waiting on the roof.']},
    station:{x:1060,original:'FIXED',edited:'MOVING',hint:'The delivery lift now travels across the ink.'},
    drafts:[],lifts:[{x:1535,y:110,w:155,range:185,speed:.7}],
    platforms:[[680,230,150],[1830,230,160],[2800,230,150]],
    scraps:[
      {id:3,x:740,y:282,title:'A Forecast with Branches',body:'Ivo’s rejected diagram contains seven different tomorrows. None of them is a dead end.'},
      {id:4,x:1905,y:282,title:'The Blank Column',body:'One worker left a column empty rather than invent a number. It was the most honest thing the factory printed.'},
      {id:5,x:2870,y:282,title:'A Letter Never Posted',body:'“I cannot promise what the world will be like. I can promise there will be someone waiting for you.”'}
    ]
  },
  {
    citizen:{id:2,x:270,name:'Ada, the typesetter',role:'LAST EMPLOYEE OF TOMORROW’S PRESS',
      lines:['A headline has very little room for a person. That never stopped the editors from trying to fit everyone into one.',
        'Change CERTAIN to POSSIBLE. Bridges that the newspaper forgot will become solid beneath your feet.',
        'At the final press, wait for the stamp to fall. During its quiet interval, cry beside each of the three proof plates. Then print your correction.',
        'Two more chimes wait before the final ink channel. A possible world can carry their echo. If every margin opens, the next edition can leave room for more than a single future.']},
    station:{x:1800,original:'CERTAIN',edited:'POSSIBLE',hint:'The possible bridges are now solid paper.'},
    drafts:[],lifts:[],
    platforms:[[625,225,155],[1320,235,155],[2660,230,155]],
    scraps:[
      {id:6,x:700,y:277,title:'The Typesetter’s Name',body:'Ada set other people’s words for forty years. This is the first page on which she put her own name.'},
      {id:7,x:1390,y:287,title:'A Drawing of Wings',body:'The newspaper called the ears a defect. In the margin, someone drew air beneath them.'},
      {id:8,x:2730,y:282,title:'Tomorrow, Unnumbered',body:'A date was never written on this page. There was no need to decide how far the story could go.'}
    ]
  },
  {
    citizen:{id:0,x:245,name:'Mara, the caretaker',role:'THE FIRST MORNING',lines:[]},
    station:{x:1690,original:'DRY',edited:'FLOWING',hint:'The greenhouse and the high drafts have water again.'},
    drafts:[{x:3430,w:205,power:950},{x:3770,w:120,power:950}],lifts:[],platforms:[],scraps:[]
  }
];
export const GHOST_BRIDGES=[[2110,120,260],[2790,130,240]];
export const PROOF_PLATES=[{x:3270,y:0},{x:3530,y:55},{x:3820,y:110}];
