import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {safeGeometry,safeFit,safeKeys,safeDisplay} from '../safe-controls.js';
import {imageAssets} from '../assets.js';
for (const id of ['safeClosed', 'safeOpen']) {
  const paths=imageAssets[id].map(url=>{
    const parsed=new URL(url,'https://example.test/classified/');
    const path=new URL('../'+url.split('?')[0],import.meta.url);
    assert.equal(parsed.searchParams.get('v'),createHash('sha256').update(readFileSync(path)).digest('hex').slice(0,12));
    assert.ok(parsed.pathname.startsWith('/classified/assets/images/'));
    return fileURLToPath(path);
  });
  const rgba=path=>execFileSync('ffmpeg',['-v','error','-i',path,'-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:10*1024*1024});
  const converted=rgba(paths[0]),original=rgba(paths[1]);
  assert.equal(original.length,1046*1504*4);
  assert.ok(converted.equals(original),`${id}: RGBA pixels and alpha must remain identical`);
  let transparent=0,partial=0;
  for(let i=3;i<original.length;i+=4){if(original[i]===0)transparent++;else if(original[i]<255)partial++;}
  assert.ok(transparent>0&&partial>0);
}
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.ok(css.includes('aspect-ratio:1351/1755'));
// Uniform open-image scale and matching upper-left cabinet reference anchors.
const {closed,open}=safeGeometry;
assert.ok(Math.abs(open.width/open.height-1046/1504)<1e-10);
assert.ok(Math.abs((closed.x+60)-(open.x+65*1.16))<1);
assert.ok(Math.abs((closed.y+55)-(open.y+125*1.16))<1);
for(const [width,height] of [[320,568],[375,667],[390,844],[400,909],[430,932]]){
 const fit=safeFit(width-16,height-140,72),scale=fit.width/safeGeometry.width;
 for(const frame of [closed,open]){
  assert.ok(frame.x>=0&&frame.y>=0);
  assert.ok(frame.x+frame.width<=safeGeometry.width+.01);
  assert.ok(frame.y+frame.height<=safeGeometry.height+.01);
 }
 assert.ok(72+fit.marginTop+safeGeometry.height*scale<=height-140+.01);
 assert.ok(Math.abs(fit.marginTop+(closed.y+21)*scale-20)<.01);
}
// Source-coordinate checks keep every circle safely within its original gold rim.
const columns=[340,520,702],rows=[482,658,835,1012];
safeKeys.forEach((key,i)=>{
 assert.ok(Math.abs(key.x/100*1046-columns[i%3])<.001);
 assert.ok(Math.abs(key.y/100*1504-rows[Math.floor(i/3)])<.001);
 assert.ok(Math.abs(key.width/100*1046-154)<.001);
});
assert.ok(Math.abs(safeDisplay.x/100*1046-520.5)<.001);
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
assert.match(index,/href="styles\.css\?v=motion-v7"/);
assert.match(index,/src="app\.js\?v=motion-v7"/);
assert.match(app,/from '\.\/assets\.js\?v=keypad-v6'/);
console.log('PASS: fresh content-versioned WebP/PNG URLs, exact RGBA equality, transparency, 1046×1504 dimensions, cabinet alignment and reserved door space at 320/375/390/400/430px, and versioned module/CSS references. Geometry checks are not browser rendering tests.');
