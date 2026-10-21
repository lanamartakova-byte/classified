import assert from 'node:assert/strict';
import {boot} from './helpers.mjs';
import {imageAssets} from '../assets.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
class ControlledLoader {
 constructor(){this.readyIds=new Set(['office']);this.warmed=[];this.requests=[];this.ensured=[];}
 ready(id){return this.readyIds.has(id)}
 url(id){return imageAssets[id][0]}
 warm(ids){this.warmed.push([...ids])}
 ensure(id){this.ensured.push(id);return Promise.resolve(this.url(id))}
 prepare(ids,urgent){return new Promise((resolve,reject)=>this.requests.push({ids:[...ids],urgent,resolve:()=>{ids.forEach(id=>this.readyIds.add(id));resolve()},reject}))}
}
const firstLoader=new ControlledLoader();
const first=boot('?guest=mama',new Map(),firstLoader);
assert.deepEqual(firstLoader.warmed,[[]]);assert.deepEqual(firstLoader.ensured,['office']);
first.run('detector()');assert.deepEqual(firstLoader.warmed.at(-1),['safeClosed']);
first.run('question=1;detector()');assert.deepEqual(firstLoader.warmed.at(-1),['safeClosed','safeOpen','front']);
first.run('report()');const report=first.get('#main').innerHTML;
first.run('safe()');assert.equal(first.get('#main').innerHTML,report);
assert.equal(first.get('#loading').hidden,false);
firstLoader.requests[0].resolve();await flush();
assert.equal(first.run('stage'),'safe');
assert.ok(first.get('#main').innerHTML.includes(imageAssets.safeClosed[0]));
assert.match(first.get('#main').innerHTML, /class="safe-open"[^>]* alt=/);
assert.match(first.get('#main').innerHTML, /class="emerging" alt=/);
first.run('keypad("4");keypad("5");keypad("enter")');
assert.equal(first.run('locked'),true);assert.equal(first.get('.safe-art').classList.contains('unlocked'),false);
assert.deepEqual(firstLoader.requests[1].ids,['safeOpen','front','back']);
firstLoader.requests[1].reject(new Error('Offline'));await flush();
assert.equal(first.run('stage'),'safe');assert.equal(first.get('#loading-retry').hidden,false);
assert.match(first.get('#loading-message').textContent,/Проверь соединение/);
first.get('#loading-retry').onclick();firstLoader.requests[2].resolve();await flush();
assert.equal(first.get('.safe-art').classList.contains('unlocked'),true);
assert.equal(first.get('.safe-open').src,imageAssets.safeOpen[0]);
assert.equal(first.get('.emerging').src,imageAssets.front[0]);
assert.equal(first.run('stage'),'invitation');
assert.ok(first.get('#main').innerHTML.includes(imageAssets.back[0]));
first.run('flip()');assert.equal(first.get('.card').classList.contains('flipped'),true);

const saved=new Map([['op45:guest:tamara',JSON.stringify({progress:'invitation',rsvp:true})]]);
const returningLoader=new ControlledLoader();
const returning=boot('?guest=tamara',saved,returningLoader);
assert.deepEqual(returningLoader.warmed,[['front','back']]);
assert.ok(returningLoader.warmed.flat().every(id=>!id.startsWith('safe')));
returning.run('invitation(true)');assert.equal(returning.run('stage'),'intro');
assert.equal(returning.calls.includes('celebration'),false);
returningLoader.requests[0].resolve();await flush();
assert.equal(returning.run('stage'),'intro'); // A new tap keeps audio activation valid on mobile.
assert.equal(returning.get('#loading-retry').textContent,'Открыть приглашение');
returning.get('#loading-retry').onclick();
assert.equal(returning.run('stage'),'invitation');assert.equal(returning.get('.card').classList.contains('flipped'),true);
assert.equal(returning.calls.includes('celebration'),true);
assert.match(returning.get('#main').innerHTML,/Тамара!/);
assert.match(returning.get('.final-controls').innerHTML,/Посмотреть подтверждение/);
assert.equal(JSON.parse(saved.get('op45:guest:tamara')).rsvp,true);
console.log('PASS: first/returning guest loading order, retained scene while loading, no early hidden image sources, safe readiness gate, offline retry, reveal sources, prepared flip, gesture-safe returning route and preserved RSVP.');
// Cached returning artwork preserves the original one-tap direct reveal.
const cachedLoader=new ControlledLoader();cachedLoader.readyIds.add('front');cachedLoader.readyIds.add('back');
const cached=boot('?guest=papa',new Map([['op45:guest:papa','{"progress":"invitation"}']]),cachedLoader);
cached.run('invitation(true)');
assert.equal(cached.run('stage'),'invitation');assert.equal(cachedLoader.requests.length,0);
assert.equal(cached.get('.card').classList.contains('flipped'),true);
assert.match(cached.get('#main').innerHTML,/Папочка!/);
console.log('PASS: cached returning route opens immediately without an extra loading tap.');
