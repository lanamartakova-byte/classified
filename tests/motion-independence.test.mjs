import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boot} from './helpers.mjs';
function scenario(matches){
 let now=0,next=0,queries=0;const tasks=new Map(),delays=[],trace=[];
 const timers={reducedMotion:matches,matchMedia(){queries++;return {matches,addEventListener(){throw Error('Must not subscribe to system motion changes')}}},
 setTimeout(fn,delay){delays.push(delay);tasks.set(++next,{fn,at:now+delay});return next},clearTimeout(id){tasks.delete(id)}};
 function advance(ms){const end=now+ms;while(true){const next=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;tasks.delete(next[0]);now=next[1].at;next[1].fn()}now=end}
 const app=boot('?guest=katya',new Map(),null,{now:()=>now},timers);
 const record=label=>trace.push({label,now,stage:app.run('stage'),html:app.get('#main').innerHTML,particles:app.get('#effects').children.map(p=>({className:p.className,style:p.style})),audio:[...app.calls]});
 app.run('detector()');record('detector');app.run('answer(0)');record('answer');
 app.run('safe();keypad("4");keypad("5")');advance(5000);
 assert.equal(app.run('locked'),false);record('code alone');
 app.run('keypad("enter")');record('open safe');advance(2999);
 assert.equal(app.run('stage'),'safe');record('visible pause');advance(1);
 assert.equal(app.run('stage'),'invitation');record('reveal at 3000');
 app.run('flip()');assert.equal(app.get('#effects').children.length,48);record('flip/fireworks');
 advance(999);
 assert.equal(app.get('.final-controls').innerHTML,'');advance(1);
 assert.match(app.get('.final-controls').innerHTML,/data-action="rsvp"/);record('controls at 1000');
 app.get('#main').listeners.click({target:{closest:()=>({disabled:false,dataset:{action:'rsvp'}})}});
 assert.equal(app.run('stage'),'confirmation');assert.equal(app.get('#effects').children.length,48);record('RSVP fireworks');
 advance(3199);assert.equal(app.get('#effects').children.length,48);advance(1);
 assert.equal(app.get('#effects').children.length,0);record('finite cleanup at 3200');
 assert.equal(queries,0,'Production must not query or observe motion preference');
 return JSON.parse(JSON.stringify({trace,delays,saved:[...app.persist]}));
}
assert.deepEqual(scenario(true),scenario(false),'Reduce and no-preference must have identical behavior and timing');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
for(const name of ['app.js','animations.js','styles.css'])assert.doesNotMatch(readFileSync(new URL('../'+name,import.meta.url),'utf8'),/prefers-reduced-motion|matchMedia|celebration-still|\breduced\b/);
for(const timing of ['animation:pulse-line 6s linear infinite','animation-duration:1.5s','animation:arrive .65s both','transition:opacity .8s','animation:emerge 2s .6s forwards','transition:transform 1.25s cubic-bezier(.2,.7,.2,1)','animation:firework-burst 1.2s ease-out both'])assert.ok(css.includes(timing),`Normal-motion timing changed: ${timing}`);
console.log('PASS: reduce/no-preference produce identical detector, safe pause/reveal, flip, fireworks, control delay, RSVP storage/audio snapshots; zero preference queries; normal CSS timings preserved. Rendering remains a separate browser check.');
