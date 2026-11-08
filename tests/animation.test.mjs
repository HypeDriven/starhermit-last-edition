import test from 'node:test';
import assert from 'node:assert/strict';
import {createMotion,stepMotion,motionPose} from '../game/src/animation.js';
const standing={grounded:true,vx:0,vy:0,distance:0,gliding:false};
const tick=(m,input,n=1)=>{for(let i=0;i<n;i++)stepMotion(m,1/60,{...standing,...input});};

test('walking advances the feet with distance and stops at a wall',()=>{
 const m=createMotion();tick(m,{vx:285,distance:4.75},20);
 const first=motionPose(m);assert.equal(first.action,'run');assert.ok(first.legL*first.legR<0);
 tick(m,{vx:285,distance:4.75},8);assert.notEqual(motionPose(m).legL,first.legL);
 const phase=m.phase;tick(m,{vx:285,distance:0},30);assert.equal(m.phase,phase);assert.equal(motionPose(m).action,'idle');
 tick(m,{},60);assert.equal(motionPose(m).action,'idle');
});
test('jump, fall and glide have distinct limb poses and wing transitions',()=>{
 const m=createMotion();tick(m,{grounded:false,vy:400},15);const jump=motionPose(m);
 assert.equal(jump.action,'jump');tick(m,{grounded:false,vy:-200},15);const fall=motionPose(m);
 assert.equal(fall.action,'fall');assert.notEqual(jump.legL,fall.legL);
 tick(m,{grounded:false,vy:-100,gliding:true});assert.ok(m.glide>0&&m.glide<1);
 tick(m,{grounded:false,vy:-100,gliding:true},30);const glide=motionPose(m);
 assert.equal(glide.action,'glide');assert.ok(glide.armL>.9&&glide.armR<-.9);
});
test('landing compresses once and settles back to standing',()=>{
 const m=createMotion();tick(m,{grounded:false,vy:-300},20);tick(m,{});
 assert.equal(motionPose(m).action,'land');assert.ok(motionPose(m).stretchY<.9);
 tick(m,{},30);assert.equal(m.land,0);assert.ok(Math.abs(motionPose(m).stretchY-1)<.001);
});
test('cry and hurt poses take priority and release without changing gameplay',()=>{
 const m=createMotion(),input={...standing,cry:true};stepMotion(m,1/60,input);
 assert.equal(motionPose(m).action,'cry');assert.equal(input.cry,true);
 tick(m,{hurt:true});assert.equal(motionPose(m).action,'hurt');tick(m,{},60);
 assert.equal(motionPose(m).action,'idle');
});
