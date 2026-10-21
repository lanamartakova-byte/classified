import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../audio.js',import.meta.url),'utf8').replace('export class','class')+'\nglobalThis.Controller=AudioController;';
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
function fixture({muted=false,fetchFailure=false,decodeFailure=false,suspended=false,resumeFailure=false,unsupported=false,webkit=false,startFailure=false}={}){
 const listeners={},players=[],contexts=[],sources=[],requests=[],buffer={original:'button_click.wav'};
 let now=1000,decodeCount=0,resolveFetch;
 class Context{
  constructor(options){this.options=options;this.state='suspended';this.destination={};this.resumes=0;contexts.push(this)}
  createGain(){this.gain={gain:{value:0},connect(){}};return this.gain}
  resume(){this.resumes++;if(resumeFailure)return Promise.reject(Error('Restricted'));if(!suspended)this.state='running';return Promise.resolve()}
  suspend(){this.state='suspended';return Promise.resolve()}
  decodeAudioData(bytes,ok,fail){decodeCount++;assert.equal(bytes,'unchanged WAV bytes');if(decodeFailure)fail(Error('Decode failed'));else ok(buffer)}
  createBufferSource(){const s={connect(g){this.gain=g},disconnect(){this.disconnected=true},start(when){assert.equal(when,0);if(startFailure)throw Error('Start failed');this.started=true},stop(){this.stopped=true}};sources.push(s);return s}
 }
 const doc={hidden:false,addEventListener(name,fn,options){listeners[name]={fn,options}}};
 const ctx=vm.createContext({...(unsupported?{}:webkit?{webkitAudioContext:Context}:{AudioContext:Context}),fetch(url,options){requests.push({url,options});return new Promise((resolve,reject)=>{resolveFetch=()=>fetchFailure?reject(Error('Offline')):resolve({ok:true,arrayBuffer:()=>Promise.resolve('unchanged WAV bytes')})})},Audio:class{constructor(src){this.src=src;this.currentTime=0;this.paused=true;this.plays=0;players.push(this)}addEventListener(){}play(){this.plays++;this.paused=false;return Promise.resolve()}pause(){this.paused=true}},document:doc,performance:{now:()=>now},requestAnimationFrame(){return 1},cancelAnimationFrame(){},console});
 vm.runInContext(source,ctx);
 const store=new Map(muted?[['op45:sound','off']]:[]),controller=new ctx.Controller({get:k=>store.get(k),set:(k,v)=>store.set(k,v)});
 return {controller,doc,listeners,players,contexts,sources,requests,buffer,get decodeCount(){return decodeCount},advance(){now+=200},load:async()=>{resolveFetch();await flush()},gesture(name='pointerdown',trusted=true){listeners[name].fn({isTrusted:trusted,target:{closest:()=>({})}})}};
}
const f=fixture();assert.equal(f.requests.length,0);assert.equal(f.contexts.length,0);
f.gesture('click',false);assert.equal(f.contexts.length,0,'Synthetic click must not unlock');
f.gesture();assert.equal(f.contexts.length,1);assert.equal(f.contexts[0].options.latencyHint,'interactive');assert.equal(f.contexts[0].resumes,1);
assert.equal(f.sources.length,0,'Priming must be silent');assert.equal(f.requests[0].url,'assets/audio/button_click.wav');
f.gesture('touchend');f.gesture('click');assert.equal(f.requests.length,1);assert.equal(f.contexts.length,1);
f.controller.sfx();assert.equal(f.players.length,1,'Cold tap falls back immediately');assert.equal(f.players[0].plays,1);
await f.load();assert.equal(f.decodeCount,1);assert.equal(f.players[0].plays,1,'Decode completion must never replay a cold click');assert.equal(f.sources.length,0);
f.advance();f.controller.sfx();assert.equal(f.sources.length,1);assert.ok(f.sources[0].started,'Ready click starts synchronously');assert.equal(f.sources[0].buffer,f.buffer);assert.equal(f.sources[0].gain.gain.value,.25);assert.equal(f.players[0].plays,1,'No dual-path playback');assert.ok(f.players[0].paused);
f.controller.sfx();assert.equal(f.sources.length,1,'Preserve 100ms duplicate guard');
f.advance();f.controller.sfx();assert.ok(f.sources[0].stopped);assert.ok(f.sources[0].disconnected);assert.equal(f.decodeCount,1);assert.equal(f.sources.length,2);
f.sources[1].onended();assert.ok(f.sources[1].disconnected);assert.equal(f.controller.clickSource,null);
f.advance();f.controller.sfx();f.advance();f.controller.sfx('key');assert.ok(f.sources[2].stopped);assert.equal(f.players.at(-1).src,'assets/audio/safe_key_click.wav');assert.equal(f.players.at(-1).volume,.35);
f.advance();f.controller.sfx('transition');assert.equal(f.players.at(-1).src,'assets/audio/transition_click.wav');assert.equal(f.players.at(-1).volume,.28);
f.advance();f.controller.sfx();f.controller.toggle();assert.ok(f.sources.at(-1).stopped);assert.equal(f.contexts[0].gain.gain.value,0);assert.equal(f.contexts[0].state,'suspended');
const count=f.sources.length;f.gesture();f.advance();f.controller.sfx();assert.equal(f.sources.length,count);
f.controller.toggle();assert.equal(f.contexts[0].gain.gain.value,.25);f.advance();f.controller.sfx();assert.equal(f.sources.length,count+1);
f.doc.hidden=true;f.listeners.visibilitychange.fn();assert.ok(f.sources.at(-1).stopped);assert.equal(f.contexts[0].state,'suspended');
f.doc.hidden=false;f.gesture('click');assert.equal(f.contexts[0].state,'running');assert.equal(f.requests.length,1);
for(const options of [{fetchFailure:true},{decodeFailure:true},{suspended:true},{resumeFailure:true}]){
 const x=fixture(options);x.gesture();await x.load();x.controller.sfx();assert.equal(x.players[0].plays,1);assert.equal(x.sources.length,0);await flush();assert.equal(x.players[0].plays,1);
}
const old=fixture({unsupported:true});old.gesture();old.controller.sfx();assert.equal(old.players[0].plays,1);assert.equal(old.requests.length,0);
const prefixed=fixture({webkit:true});prefixed.gesture();await prefixed.load();prefixed.controller.sfx();assert.equal(prefixed.sources.length,1);
const muted=fixture({muted:true});muted.gesture();assert.equal(muted.contexts.length,0);assert.equal(muted.requests.length,0);
console.log('PASS: trusted-gesture priming, one decode/cache/context, synchronous buffered click at original .25 gain, no duplicate/cold replay, preserved interruption/debounce, mute/visibility recovery, HTML fallback on unsupported/suspended/resume/fetch/decode failures and WebKit constructor alias. Physical output latency is unmeasured.');

const broken=fixture({startFailure:true});broken.gesture();await broken.load();broken.controller.sfx();assert.equal(broken.players[0].plays,1);assert.ok(broken.sources[0].stopped);
const hiddenLoad=fixture();hiddenLoad.gesture();hiddenLoad.doc.hidden=true;hiddenLoad.listeners.visibilitychange.fn();await hiddenLoad.load();assert.equal(hiddenLoad.sources.length,0);hiddenLoad.doc.hidden=false;hiddenLoad.gesture();hiddenLoad.controller.sfx();assert.equal(hiddenLoad.sources.length,1);
