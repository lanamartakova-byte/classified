import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boot} from './helpers.mjs';
const app=boot('?guest=timur');
app.run('safe()');
// Exercise the actual ResizeObserver callback with measured-slot test doubles.
let callback,disconnected=0;
app.run('globalThis.ResizeObserver=class{constructor(fn){globalThis.fitCallback=fn}observe(){}disconnect(){}}');
const safe={style:{}},message={offsetHeight:72};
const slot={clientWidth:304,clientHeight:418,querySelector:s=>s==='.safe-art'?safe:s==='.safe-messages'?message:null};
app.get('#main').querySelector=()=>slot;
app.run('fitComposition()');
for(const [width,height] of [[304,418],[414,782],[359,517],[374,694],[384,759],[304,418]]){
 slot.clientWidth=width;slot.clientHeight=height;app.run('fitCallback()');
 const w=parseFloat(safe.style.width),top=parseFloat(safe.style.marginTop);
 assert.ok(w<=width);
 assert.ok(message.offsetHeight+top+w*1755/1351<=height+.001);
 assert.ok(Math.abs(top+w*121/1351-20)<.001,'Visible artwork gap');

}
const card={style:{}},actions={offsetHeight:48,style:{}};
slot.querySelector=s=>s==='.card-stage'?card:s==='.invitation-actions'?actions:null;
for(const [width,height] of [[304,418],[414,782],[304,418]]){
 slot.clientWidth=width;slot.clientHeight=height;app.run('fitCallback()');
 const w=parseFloat(card.style.width),gap=parseFloat(actions.style.marginTop);
 assert.ok(w<=width&&1.5*w+gap+48<=height+.001);
 assert.ok(Math.abs(gap+w*24/1024-18)<.001);
}
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.match(css,/\.ecg svg\{position:absolute/,'Animated SVG must not contribute doubled intrinsic width');
assert.match(css,/\.answer\{min-width:0;width:100%/);
assert.doesNotMatch(css,/wheel|inspector|keypad-zoom/);
const browser=readFileSync(new URL('./safe-layout.browser.js',import.meta.url),'utf8');
for(const marker of ['both panel borders','Nontransparent safe artwork','Riddle/visible-safe gap','visible invitation/action gap','live resize','MEASURED','Integrated OK'])assert.ok(browser.includes(marker));
console.log('PASS: actual fitting callback handles narrow/wide resize, transparent bounds, opening canvas and card/action grouping. Rendered measurements are pending browser execution.');
