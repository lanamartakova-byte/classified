import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {boot} from './helpers.mjs';
const audioSource=readFileSync(new URL('../audio.js',import.meta.url),'utf8').replace('export class','class')+'\nglobalThis.Controller=AudioController;';
function scenario(failure){
 let now=1000,next=0,fault=false,reloads=0,mediaFailures=0;
 const pending=new Map(),listeners=new Map();
 const clock={now:()=>now};
 function fail(kind){if(fault&&failure===kind){mediaFailures++;throw Error(`Injected ${kind} media error`)}}
 class Media {
  constructor(src){fail('create');this.src=src;this._time=0;this._volume=0}
  addEventListener(){}
  pause(){fail('pause')}
  get currentTime(){return this._time}set currentTime(v){fail('seek');this._time=v}
  get volume(){return this._volume}set volume(v){fail('volume');this._volume=v}
  play(){fail('play');return failure==='reject'&&fault?Promise.reject(Error('Playback blocked')):Promise.resolve()}
 }
 const doc={hidden:false,addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)}};
 const ctx=vm.createContext({Audio:Media,document:doc,performance:clock,console,requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
 vm.runInContext(audioSource,ctx);
 const app=boot('?guest=katya',new Map(),null,clock,{AudioController:ctx.Controller,location:{reload(){reloads++}},
 setTimeout(fn,delay){pending.set(++next,{fn,delay});return next},clearTimeout(id){pending.delete(id)}});
 app.run('safe()');
 const main=app.get('#main');let markup=main.innerHTML,writes=0;
 Object.defineProperty(main,'innerHTML',{get:()=>markup,set:v=>{writes++;markup=v},configurable:true});
 const saved=app.persist.get('op45:guest:katya');
 function press(value,elapsed=150,touch=false){
  now+=elapsed;
  const button={disabled:false,dataset:{key:value}},event={isTrusted:true,target:{closest:()=>button}};
  // Production touch/pointer listeners warm audio only. Gameplay receives one click.
  if(touch)for(const type of ['pointerdown','touchend'])for(const fn of listeners.get(type)||[])fn(event);
  for(const fn of listeners.get('click')||[])fn(event);
  main.listeners.click(event);
 }
 press('1');press('2');
 fault=true;
 if(failure==='create')app.run('delete audio.players.key');
 assert.doesNotThrow(()=>press('enter'),`${failure}: effect failure must not abort wrong-code reset`);
 assert.equal(app.run('code'),'');assert.match(app.get('.safe-status').textContent,/Код не подошёл/);
 assert.equal(app.get('.code-display').textContent,'— —');assert.equal(app.get('#first-riddle').hidden,false);
 assert.equal(app.run('locked'),false);assert.equal(app.run('loadingJob'),null);assert.equal(app.run('stage'),'safe');
 assert.equal(pending.size,0,'Wrong code must schedule no reset/reveal timer');
 // Same timestamp: input can resume immediately, without waiting for audio or a timeout.
 press('9',0,true);press('8',0,true);assert.equal(app.run('code'),'98');
 for(let attempt=0;attempt<4;attempt++){
  press('enter');assert.equal(app.run('code'),'');
  press('1',0,true);press('2',0,true);assert.equal(app.run('code'),'12');
 }
 press('enter');assert.equal(app.run('code'),'');
 assert.equal(writes,0,'Wrong attempts must not rerender/reset the safe');
 assert.equal(app.persist.get('op45:guest:katya'),saved,'Wrong attempts must not reset saved progress');
 assert.equal(reloads,0);assert.equal(pending.size,0);
 // Duplicate click after touch cannot add the same digit twice; distinct quick taps still work.
 press('4',0,true);press('4',10);assert.equal(app.run('code'),'4');
 press('5',1,true);assert.equal(app.run('code'),'45');assert.equal(app.run('locked'),false);
 press('enter');assert.equal(app.run('locked'),true);assert.ok(app.get('.safe-art').classList.contains('unlocked'));
 assert.equal(writes,0);assert.equal(pending.size,1);
 const opening=[...pending.values()][0];assert.equal(opening.delay,3000);
 press('enter',1,true);press('7',1,true);assert.equal(pending.size,1);assert.equal(app.run('code'),'45');
 now+=3000;pending.clear();fault=false;opening.fn();assert.equal(app.run('stage'),'invitation');
 assert.equal(reloads,0);assert.equal(writes,1);
 if(!['none','reject'].includes(failure))assert.ok(mediaFailures>0,'Fault must actually be exercised');
}
for(const mode of ['none','pause','seek','volume','play','create','reject'])scenario(mode);
// No second gameplay listener is registered for touch/pointer events.
const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8');
assert.doesNotMatch(appSource,/addEventListener\(['"](?:touchstart|touchend|pointerdown|pointerup)['"]/);
console.log('PASS: real audio-controller failure injection; immediate retry and repeated wrong codes, rapid touch/click and correct 45/OK, unchanged 3000ms opening, no reset/reload or wrong-code timers, prior iPhone audio path preserved. Android device behavior is unverified.');
