import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {safeKeys,safeDisplay,safeGeometry,safeFit} from '../safe-controls.js';
import {boot} from './helpers.mjs';
assert.deepEqual(safeKeys.map(key=>key.label),['1','2','3','4','5','6','7','8','9','C','0','OK']);
const clock={time:0,now(){return this.time}};
const visitor=boot('?guest=katya',new Map(),null,clock);
const click=(dataset,advance=250)=>{
 clock.time+=advance;
 const button={dataset,disabled:false};
 visitor.get('#main').listeners.click({target:{closest:()=>button}});
};
const assertSingleStage=()=>assert.equal((visitor.get('#main').innerHTML.match(/<section\b/g)||[]).length,1);
assert.match(visitor.get('#main').innerHTML,/Катя!/);assertSingleStage();
click({action:'accept'});assert.equal(visitor.get('#main').dataset.stage,'detector');
for(let i=0;i<3;i++){assertSingleStage();click({answer:String(i%2)});click({action:'continue'});}
assert.equal(visitor.get('#main').dataset.stage,'report');click({action:'safe'});
assert.equal(visitor.get('#main').dataset.stage,'safe');assertSingleStage();
const markup=visitor.get('#main').innerHTML;
assert.equal((markup.match(/class="safe-key"/g)||[]).length,12);
assert.doesNotMatch(markup,/safe-wheel|keypad-zoom|keypad-inspector|data-key="delete"/);
assert.ok(markup.indexOf('class="safe-closed-frame"')<markup.indexOf('class="keypad"'));
assert.match(markup,/aria-label="Проверить код и открыть сейф"/);
assert.doesNotMatch(markup,/>Открыть<|>Стереть</);
for(const key of safeKeys){assert.ok(markup.includes(`data-key="${key.value}"`));assert.ok(markup.includes(`aria-label="${key.accessible}"`));}
for(const digit of '0123456789'){
 click({key:'clear'});click({key:digit});
 assert.equal(visitor.run('code'),digit);
 assert.equal(visitor.get('.code-display').textContent,`${digit} —`);
 assert.equal(visitor.get('#first-riddle').hidden,true);
 assert.equal(visitor.get('#second-riddle').hidden,false);
}
click({key:'clear'});assert.equal(visitor.get('.code-display').textContent,'— —');
assert.equal(visitor.get('#first-riddle').hidden,false);assert.equal(visitor.get('#second-riddle').hidden,true);
click({key:'4'});click({key:'4'},10);assert.equal(visitor.run('code'),'4'); // Double tap ignored.
click({key:'5'},10);assert.equal(visitor.get('.code-display').textContent,'4 5'); // Different quick key accepted.
click({key:'7'});assert.equal(visitor.run('code'),'45'); // Two-digit limit.
click({key:'delete'});assert.equal(visitor.run('code'),'4');
click({key:'delete'});assert.equal(visitor.run('code'),'');
click({key:'9'});click({key:'8'});click({key:'enter'});
assert.equal(visitor.run('stage'),'safe');assert.equal(visitor.run('locked'),false);
assert.equal(visitor.get('.safe-status').textContent,'');
assert.doesNotMatch(visitor.get('.safe-status').textContent,/45/);
assert.equal(visitor.get('.safe-art').classList.contains('unlocked'),false);
const keydown=(key,repeat=false)=>{clock.time+=250;let prevented=false;visitor.documentListeners.keydown({key,repeat,target:visitor.get('#main'),preventDefault(){prevented=true}});return prevented;};
assert.ok(keydown('4'));assert.ok(keydown('5',true));assert.equal(visitor.run('code'),'4');
assert.ok(keydown('Backspace'));assert.equal(visitor.run('code'),'');
assert.ok(keydown('9'));assert.ok(keydown('c'));assert.equal(visitor.run('code'),'');
assert.ok(keydown('4'));assert.ok(keydown('5'));
click({key:'enter'});
assert.equal(visitor.run('locked'),true);assert.equal(visitor.get('.safe-art').classList.contains('unlocked'),true);
assert.equal(visitor.run('stage'),'invitation');assertSingleStage();
click({action:'flip'});assert.equal(visitor.get('.card').classList.contains('flipped'),true);
click({action:'rsvp'});assert.equal(visitor.run('stage'),'confirmation');assert.match(visitor.get('#main').innerHTML,/Ура!/);assert.doesNotMatch(visitor.get('#main').innerHTML,/class="card-stage"/);
assert.equal(JSON.parse(visitor.persist.get('op45:guest:katya')).rsvp,true);
console.log('PASS: all twelve integrated keys, digit/display state, clear/delete, current riddle, two-digit limit, double-tap/repeat guards, OK error/success, opening state, one active stage, full navigation, flip and guest-specific RSVP.');

// Test the coordinate geometry, without claiming rendered-browser validation.
const bounds=c=>({left:c.x-c.width/2,right:c.x+c.width/2,top:c.y-c.height/2,bottom:c.y+c.height/2});
const overlaps=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
const controls=safeKeys;
for(let i=0;i<controls.length;i++){
 const box=bounds(controls[i]);assert.ok(box.left>=0&&box.right<=100&&box.top>=0&&box.bottom<=100);
 for(let j=i+1;j<controls.length;j++)assert.equal(overlaps(box,bounds(controls[j])),false);
 assert.equal(overlaps(box,bounds(safeDisplay)),false);
}
for(const [width,height] of [[320,568],[375,667],[390,844],[400,909],[430,932]]){
 // Explicitly a conservative formula estimate, not a rendered measurement.
 const fit=safeFit(width-16,height-140,72);
 const keyWidth=fit.width*154/safeGeometry.width;
 console.log(`${width}×${height}: estimated key diameter ${keyWidth.toFixed(1)}px; actual browser measurement pending.`);
}
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.ok(css.includes('height:100dvh'));
assert.match(css,/html\{[^}]*height:100%[^}]*overflow:hidden[^}]*overscroll-behavior:none/);
assert.ok(css.includes('grid-template-rows:auto minmax(0,1fr) auto'));
assert.ok(css.includes('container-type:size'));
assert.ok(css.includes('pointer-events:none'));
assert.ok(css.includes('text-transform:uppercase'));
console.log('PASS: non-overlapping image-relative keys/display, viewport geometry budgets, dynamic viewport and safe-slot sizing rules. Browser scroll/visibility/alignment/readability still require visual checks.');

// Keep the opening timer pending so animation guards are exercised in the safe scene.
const pending=[],openingClock={time:0,now(){return this.time}};
const opening=boot('?guest=nina',new Map(),null,openingClock,{setTimeout(fn,delay){pending.push({fn,delay});return pending.length},clearTimeout(){}});
opening.run('safe();keypad("4");keypad("5")');
assert.equal(opening.run('locked'),false);assert.equal(pending.length,0,'Digit entry must not schedule opening');
const press=value=>{openingClock.time+=250;opening.get('#main').listeners.click({target:{closest:()=>({dataset:{key:value},disabled:false})}})};
press('enter');
assert.equal(opening.run('stage'),'safe');assert.equal(opening.run('locked'),true);
assert.equal(pending.length,1);assert.equal(pending[0].delay,3000);
const calls=opening.calls.length;
for(const value of ['enter','enter','1','clear','delete'])press(value);
assert.equal(pending.length,1,'Repeated OK must not schedule duplicate reveals');
assert.equal(opening.calls.length,calls,'Opening must block further input and sounds');
assert.equal(opening.run('code'),'45');
pending.shift().fn();assert.equal(opening.run('stage'),'invitation');
// Enter confirms regardless of focus; preventDefault blocks an additional native click.
const keyboard=boot();keyboard.run('safe();keypad("4");keypad("5")');
let prevented=false;keyboard.documentListeners.keydown({key:'Enter',target:{closest:()=>({})},preventDefault(){prevented=true}});
assert.ok(prevented);assert.equal(keyboard.run('locked'),true);
console.log('PASS: pending opening blocks repeated OK/digits/C/delete without duplicate timers or sound; focused-keyboard Enter confirms; invitation follows the existing opening delay.');
