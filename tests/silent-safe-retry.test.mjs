import assert from 'node:assert/strict';
import {boot} from './helpers.mjs';
function fixture(){
 let time=1000,reloads=0;const timers=[];
 const app=boot('?guest=katya',new Map(),null,{now:()=>time},{location:{reload(){reloads++}},setTimeout(fn,delay){timers.push({fn,delay});return timers.length},clearTimeout(){}});
 app.run('safe()');const main=app.get('#main');let html=main.innerHTML,writes=0;
 Object.defineProperty(main,'innerHTML',{get:()=>html,set:value=>{writes++;html=value}});
 const click=(value,elapsed=1)=>{time+=elapsed;main.listeners.click({target:{closest:()=>({disabled:false,dataset:{key:value}})}})};
 const cleared=()=>{assert.equal(app.run('code'),'');assert.equal(app.get('.code-display').textContent,'— —');assert.equal(app.get('.safe-status').textContent,'');assert.equal(app.run('locked'),false);assert.equal(app.run('loadingJob'),null);assert.equal(app.run('stage'),'safe');assert.equal(writes,0);assert.equal(reloads,0);assert.equal(timers.length,0)};
 return {app,click,cleared,timers};
}
const {app,click,cleared,timers}=fixture();
click('1');click('2');click('enter');cleared();
assert.deepEqual(app.calls,['key','key','key'],'Keep existing button sounds, with no error sound');
click('4');click('5');assert.equal(app.run('locked'),false);click('enter');
assert.equal(app.run('locked'),true);assert.ok(app.get('.safe-art').classList.contains('unlocked'));
assert.equal(timers.length,1);assert.equal(timers[0].delay,3000);
timers[0].fn();assert.equal(app.run('stage'),'invitation');
const repeat=fixture();
for(const wrong of ['12','98','10','42','00']){
 for(const digit of wrong){
  // The existing repeated-identical-key guard is deliberately retained.
  repeat.click(digit,wrong==='00'?250:1);
 }
 repeat.click('enter');repeat.cleared();
}
repeat.click('1');repeat.click('clear');repeat.cleared();
repeat.click('4');repeat.click('5');repeat.click('8');assert.equal(repeat.app.run('code'),'45','Two-digit limit unchanged');
repeat.click('enter');assert.equal(repeat.app.run('locked'),true);assert.equal(repeat.timers[0].delay,3000);
const first=fixture();first.click('4');first.click('5');first.click('enter');assert.equal(first.app.run('locked'),true);assert.equal(first.timers.length,1);
console.log('PASS: exact 12 → one OK → silent clear → immediate 45 → one OK → opening; repeated wrong attempts, C, rapid distinct input, two-digit limit, first-try success, no extra sounds/reset/reload and preserved 3000ms reveal. Simulated DOM/events only.');
