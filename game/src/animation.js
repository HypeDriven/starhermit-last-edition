// Cosmetic state only. It never changes physics, collisions, or campaign saves.
export function createMotion(){
 return {time:0,phase:0,speed:0,air:0,glide:0,land:0,cry:0,hurt:0,grounded:true,vy:0};
}
/** @param {ReturnType<typeof createMotion>} motion
 * @param {number} dt
 * @param {{grounded:boolean,vx:number,vy:number,distance:number,gliding:boolean,cry?:boolean,hurt?:boolean}} input */
export function stepMotion(motion,dt,input){
 const blend=1-Math.exp(-14*dt);
 motion.time+=dt;
 const travelSpeed=input.grounded?Math.min(Math.abs(input.vx),Math.abs(input.distance)/Math.max(dt,.0001)):Math.abs(input.vx);
 motion.speed+=(Math.min(1,travelSpeed/285)-motion.speed)*blend;
 // Travel drives the stride, so stopping against a wall doesn't slide the boots.
 if(input.grounded&&Math.abs(input.vx)>8)motion.phase+=Math.abs(input.distance)/21;
 motion.air+=((input.grounded?0:1)-motion.air)*blend;
 motion.glide+=((input.gliding&&!input.grounded?1:0)-motion.glide)*(1-Math.exp(-10*dt));
 motion.land=Math.max(0,motion.land-dt*5);
 if(!motion.grounded&&input.grounded)motion.land=1;
 motion.cry=input.cry?1:Math.max(0,motion.cry-dt*3.5);
 motion.hurt=input.hurt?1:Math.max(0,motion.hurt-dt*4.5);
 motion.grounded=input.grounded;motion.vy=input.vy;
}
/** @param {ReturnType<typeof createMotion>} m */
export function motionPose(m){
 const stride=Math.sin(m.phase),opposite=-stride,run=m.speed*(1-m.air),breath=Math.sin(m.time*2.4);
 const jump=m.vy>35,air=m.air,glide=m.glide;
 let armL=.55*stride*run+.035*breath,armR=.55*opposite*run-.035*breath;
 let legL=.72*stride*run,legR=.72*opposite*run;
 armL+=(jump?-.55:.35)*air;armR+=(jump?.9:-.3)*air;
 legL+=(jump?-.7:.22)*air;legR+=(jump?.45:-.35)*air;
 armL=armL*(1-glide)+1.15*glide;
 armR=armR*(1-glide)-1.25*glide;
 legL=legL*(1-glide)-.2*glide;legR=legR*(1-glide)+.3*glide;
 const cry=m.cry,hurt=m.hurt;
 armL=armL*(1-cry)+.75*cry;armR=armR*(1-cry)-.85*cry;
 return {
  action:hurt>0?'hurt':cry>0?'cry':!m.grounded?glide>.4?'glide':jump?'jump':'fall':m.land>.05?'land':m.speed>.08?'run':'idle',
  bob:Math.abs(Math.cos(m.phase))*2.4*run+.5*breath*(1-run),
  body:run*.09-air*.06+cry*.06-hurt*.2,
  head:Math.sin(m.time*1.4)*.018-run*.035-cry*.07,
  armL:armL-hurt*.5,armR:armR+hurt*.45,legL,legR,
  stretchX:1+m.land*.13-cry*.035,stretchY:1-m.land*.13+air*.025,
  scarf:Math.sin(m.time*8)*(.04+run*.08+glide*.1)-run*.22-glide*.3,
  glide,cry,blink:m.time%4.6>4.46&&cry<.1,
  liftL:Math.max(0,-Math.cos(m.phase)) * 2.3*run,
  liftR:Math.max(0,Math.cos(m.phase)) * 2.3*run
 };
}
export function idlePose(time=0){const m=createMotion();m.time=time;return motionPose(m);}
