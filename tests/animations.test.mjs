import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SceneAnimations} from '../animations.js';
import {boot} from './helpers.mjs';
function target(extra={}){
 const listeners=new Map();return {...extra,listeners,
 addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn)},
 removeEventListener(name,fn){listeners.get(name)?.delete(fn)},
 emit(name){for(const fn of listeners.get(name)||[])fn()}};
}
function element(){return {children:[],attrs:{},style:{properties:{},setProperty(k,v){this.properties[k]=v}},classList:{values:new Set(),add(k){this.values.add(k)},remove(k){this.values.delete(k)},contains(k){return this.values.has(k)}},setAttribute(k,v){this.attrs[k]=v},append(...nodes){for(const n of nodes)this.children.push(...(n.fragment?n.children:[n]))},replaceChildren(){this.children=[]}};}
let now=0,id=0;const tasks=new Map();
const schedule=(fn,delay)=>{tasks.set(++id,{fn,at:now+delay});return id},cancel=id=>tasks.delete(id);
function advance(ms){const end=now+ms;while(true){const next=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;tasks.delete(next[0]);now=next[1].at;next[1].fn()}now=end}
const box=element(),ecg=element(),body=element();
const doc=target({hidden:false,body,querySelector:s=>s==='#effects'?box:ecg,createElement:element,createDocumentFragment:()=>({...element(),fragment:true})});
const win=target({innerWidth:390,innerHeight:844}),motion=target({matches:false});
const controller=new SceneAnimations({document:doc,window:win,motion,clock:{now:()=>now},schedule,cancel});
controller.setScene('intro');controller.celebrate();assert.equal(box.children.length,0);
controller.setScene('detector');assert.match(ecg.attrs['aria-label'],/Движущийся/);
doc.hidden=true;doc.emit('visibilitychange');assert.ok(body.classList.contains('animations-paused'));
doc.hidden=false;doc.emit('visibilitychange');assert.ok(!body.classList.contains('animations-paused'));
controller.setScene('confirmation');controller.celebrate();assert.equal(box.children.length,48);assert.equal(tasks.size,1);
for(const spark of box.children){assert.equal(spark.className,'firework-spark');assert.ok(spark.style.properties['--dx']);assert.ok(spark.style.properties['--dy'])}
controller.celebrate();assert.equal(box.children.length,48);assert.equal(tasks.size,1,'No duplicate cleanup tasks');
advance(600);doc.hidden=true;doc.emit('visibilitychange');assert.equal(tasks.size,0);
advance(10000);assert.equal(box.children.length,48,'Hidden page must not consume the remaining celebration');
doc.hidden=false;doc.emit('visibilitychange');assert.equal(tasks.size,1);
advance(2599);assert.equal(box.children.length,48);advance(1);assert.equal(box.children.length,0);assert.equal(tasks.size,0);
controller.celebrate();win.emit('pagehide');assert.equal(tasks.size,0);win.emit('pageshow');assert.equal(tasks.size,1);
controller.setScene('safe');assert.equal(box.children.length,0);assert.equal(tasks.size,0);
controller.setScene('confirmation');controller.celebrate();motion.matches=true;motion.emit('change');
assert.equal(box.children.length,48);assert.equal(tasks.size,1);
controller.setScene('detector');assert.match(ecg.attrs['aria-label'],/Движущийся/);
controller.destroy();assert.equal(box.children.length,0);assert.equal(tasks.size,0);
for(const events of [doc,win,motion])for(const listeners of events.listeners.values())assert.equal(listeners.size,0);
// Integration: actual RSVP handler enters confirmation then starts one fresh effect.
const visitor=boot('?guest=katya',new Map(),null,{now:()=>now},{reducedMotion:false,setTimeout:schedule,clearTimeout:cancel});
visitor.run('invitation(false);flip()');assert.equal(visitor.get('#effects').children.length,48);
advance(1000);
visitor.get('#main').listeners.click({target:{closest:()=>({disabled:false,dataset:{action:'rsvp'}})}});
assert.equal(visitor.run('stage'),'confirmation');assert.equal(visitor.get('#effects').children.length,48);
assert.equal(tasks.size,1);assert.equal(JSON.parse(visitor.persist.get('op45:guest:katya')).rsvp,true);
visitor.run('confirmation()');assert.equal(visitor.get('#effects').children.length,48);assert.equal(tasks.size,1);
visitor.run('detector()');assert.equal(visitor.get('#effects').children.length,0);assert.equal(tasks.size,0);
assert.match(visitor.get('#main').innerHTML,/class="ecg"><div class="ecg-track"><svg/);
assert.match(visitor.get('.ecg').attributes['aria-label'],/Движущийся/);
visitor.run('report();detector()');assert.equal(visitor.run('animations.scene'),'detector');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.match(css,/\.ecg-track\{[^}]*width:200%[^}]*animation:pulse-line 6s/);
assert.doesNotMatch(css,/\.ecg svg\{[^}]*animation:/);
assert.match(css,/\.ecg\.answered \.ecg-track\{animation-duration:1.5s/);
assert.match(css,/\.animations-paused[^}]*animation-play-state:paused/);
assert.match(css,/#effects\{[^}]*pointer-events:none;z-index:0/);
assert.match(css,/main,footer\{position:relative;z-index:1/);
assert.match(css,/\.firework-spark\{[^}]*opacity:0[^}]*animation:firework-burst 1.2s/);
assert.doesNotMatch(css,/prefers-reduced-motion|celebration-still/);
assert.doesNotMatch(readFileSync(new URL('../animations.js',import.meta.url),'utf8'),/requestAnimationFrame|setInterval|canvas/);
for(const [width,height] of [[320,568],[375,667],[390,844],[400,909],[430,932],[1280,720],[1920,1080]]){
 const r=Math.min(56,width*.1,height*.07);
 for(const [x,y] of [[.12,.18],[.88,.20],[.12,.82],[.88,.80]])assert.ok(x*width-r>=0&&x*width+r<=width&&y*height-r>=0&&y*height+r<=height);
}
console.log('PASS: HTML ECG initialization/scene lifecycle, finite RSVP bursts, repeat replacement, visibility/bfcache pause-resume, timer/DOM/listener cleanup, motion-preference independence, unchanged RSVP storage, seven-viewport burst budgets. DOM/timers are mocked; rendered movement requires browser execution.');
