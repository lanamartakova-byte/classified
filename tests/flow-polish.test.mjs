import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boot} from './helpers.mjs';
import {event} from '../config.js';
function scheduler(){
 let now=0,next=0;const tasks=new Map();
 return {clock:{now:()=>now},setTimeout(fn,delay=0){const id=++next;tasks.set(id,{at:now+delay,fn});return id},clearTimeout(id){tasks.delete(id)},advance(ms){
  const end=now+ms;
  while(true){const due=[...tasks].filter(([,task])=>task.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;tasks.delete(due[0]);now=due[1].at;due[1].fn();}
  now=end;
 },get pending(){return tasks.size}};
}
const timers=scheduler();
const visitor=boot('?guest=katya',new Map(),null,timers.clock,timers);
visitor.run('safe()');
const art=visitor.get('.safe-art');
visitor.run('keypad("4");keypad("5")');
timers.advance(5000);assert.equal(visitor.run('locked'),false);assert.equal(visitor.run('stage'),'safe');
visitor.run('keypad("enter")');assert.equal(visitor.run('locked'),true);assert.equal(art.classList.contains('unlocked'),true);
timers.advance(3000);assert.equal(visitor.run('stage'),'invitation');
visitor.run('flip()');timers.advance(1000);
assert.match(visitor.get('.final-controls').innerHTML,/data-action="rsvp"/);assert.doesNotMatch(visitor.get('.final-controls').innerHTML,/Ура!|confirmation/);
const starts=visitor.calls.filter(call=>call==='celebration').length;
const click=action=>visitor.get('#main').listeners.click({target:{closest:()=>({disabled:false,dataset:{action}})}});
click('rsvp');
assert.equal(visitor.run('stage'),'confirmation');assert.equal(visitor.get('#main').dataset.stage,'confirmation');
const html=visitor.get('#main').innerHTML;
assert.match(html,/<span>Ура! Буду ждать тебя!<\/span> <span>До встречи 15 ноября!<\/span>/);
assert.match(html,/Подтверждение сохранено только на этом устройстве/);
assert.doesNotMatch(html,/<img|card-stage|card-front|data-action="rsvp"/);
assert.equal(visitor.calls.filter(call=>call==='celebration').length,starts,'Confirmation must not restart background audio');
const record=JSON.parse(visitor.persist.get('op45:guest:katya'));assert.equal(record.rsvp,true);assert.equal(record.progress,'invitation');
assert.equal(html.includes(event.confirmation.split('До встречи')[0].trim()),true);
// The lightweight fixture does not parse replacement HTML; model the fresh card element.
visitor.elements.delete('.card');click('direct');timers.advance(1000);assert.equal(visitor.run('stage'),'invitation');assert.match(visitor.get('.final-controls').innerHTML,/Посмотреть подтверждение/);assert.doesNotMatch(visitor.get('.final-controls').innerHTML,/data-action="rsvp"/);
click('confirmation');assert.equal(visitor.run('stage'),'confirmation');assert.equal(JSON.parse(visitor.persist.get('op45:guest:katya')).rsvp,true);
const returning=boot('?guest=katya',visitor.persist);assert.match(returning.get('#main').innerHTML,/Посмотреть приглашение/);returning.run('invitation(true)');assert.match(returning.get('#main').innerHTML,/Катя!/);assert.match(returning.get('.final-controls').innerHTML,/Посмотреть подтверждение/);
const other=boot('?guest=nina',visitor.persist);assert.doesNotMatch(other.get('#main').innerHTML,/Посмотреть приглашение/);
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.doesNotMatch(css,/prefers-reduced-motion|animation:none!important/);
console.log('PASS: integrated OK required after two digits, separate confirmation without art, one RSVP action, split configured message, audio continuity, returning access and guest-isolated persistence.');
