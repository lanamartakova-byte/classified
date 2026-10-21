import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
function rules(selector){
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
 return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(match=>match[1].trim()===selector).map(match=>match[2]);
}
// This regression failed in the broken layout: an old 260px grid column
// survived a later display:grid override and consumed the image's mobile width.
assert.equal(rules('.safe-layout').length,1,'Safe slot must have one authoritative layout definition');
assert.doesNotMatch(rules('.safe-layout')[0],/grid-template-columns|height:100%/);
assert.match(rules('.safe-layout')[0],/display:flex/);
assert.match(rules('.safe-layout')[0],/flex:1 1 0/);
assert.match(rules('.safe-layout')[0],/min-height:0/);
assert.match(rules('.safe-layout')[0],/justify-content:center/);
assert.equal(rules('.safe-art').length,1);
assert.equal(rules('.safe-controls').length,1);
assert.equal(rules('.safe-controls .keypad').length,1);
assert.equal(rules('.safe-controls .code-display').length,1);
assert.equal(rules('.safe-controls .safe-key').length,1);
assert.equal(rules('.safe-art.unlocked .safe-controls').length,1);
assert.equal(rules('.safe-art.unlocked .safe-key,.safe-art.unlocked .code-display').length,1);
assert.equal(rules('.safe-closed-frame').length,1);
assert.match(rules('.scene')[0],/display:flex/);
assert.match(rules('.safe-scene')[0],/justify-content:flex-start/);
assert.match(rules('.safe-closed-frame')[0],/position:absolute/);
assert.match(rules('.safe-controls')[0],/width:100%;height:100%/);
assert.doesNotMatch(css,/grid-template-columns:1fr 260px/);
assert.ok(rules('body').some(rule=>rule.includes('position:fixed')&&rule.includes('height:100dvh')));
const browserTest=readFileSync(new URL('./safe-layout.browser.js',import.meta.url),'utf8');
for(const size of ['320,568','375,667','390,844','400,909','430,932'])assert.ok(browserTest.includes(size));
console.log('PASS: obsolete grid column removed; one authoritative safe slot/art/frame/control definition; bounded flex sizing, centered closed safe and viewport-locked body. Rendered tests are provided separately and are not claimed as executed.');
