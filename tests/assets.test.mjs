import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {ImageLoader, imageAssets, sceneImages} from '../assets.js';
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b}); return {promise,resolve,reject}; };
function harness(options={}) {
  const requests=[];
  const loader=new ImageLoader({timeout:1000,...options,createImage:()=>{
    const image={naturalWidth:1024,naturalHeight:1536,decoded:deferred(),decode(){return this.decoded.promise},removeAttribute(){this.removed=true}};
    Object.defineProperty(image,'src',{set(url){image.url=url;requests.push(image)}});
    return image;
  }});
  const succeed=async image=>{image.onload();image.decoded.resolve();await flush()};
  return {loader,requests,succeed};
}
for(const [id,urls] of Object.entries(imageAssets)) {
  assert.match(urls[0].split('?')[0], /^assets\/images\/.+\.webp$/);
  assert.match(urls[1].split('?')[0], /^assets\/images\/.+\.png$/);
  for(const url of urls) { assert.ok(existsSync(new URL('../'+url.split('?')[0],import.meta.url))); assert.equal(new URL(url,'https://example.test/classified/').pathname, '/classified/'+url.split('?')[0]); }
}
assert.deepEqual(sceneImages('intro'),[]);
assert.deepEqual(sceneImages('intro',{returning:true}),['front','back']);
assert.deepEqual(sceneImages('detector',{question:0}),['safeClosed']);
assert.ok(!sceneImages('detector',{question:1}).includes('back'));
assert.ok(sceneImages('report').includes('back'));
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
assert.ok(html.includes(`href="${imageAssets.office[0]}" type="image/webp" fetchpriority="high"`));
assert.ok(css.includes(imageAssets.office[0]));
assert.ok(!html.includes('safe_closed.webp'));

// Decode completion, deduplication, concurrency and urgent queue promotion.
{
 const h=harness();
 const office=h.loader.ensure('office');
 assert.strictEqual(h.loader.ensure('office'),office);
 const front=h.loader.ensure('front');
 const back=h.loader.ensure('back');
 const safe=h.loader.ensure('safeClosed',true);
 assert.equal(h.requests.length,2);
 h.requests[0].onload();await flush();
 assert.equal(h.loader.ready('office'),false);
 assert.equal(h.requests.length,2);
 h.requests[0].decoded.resolve();await flush();
 assert.equal(h.loader.ready('office'),true);
 assert.equal(h.requests[2].url,imageAssets.safeClosed[0]);
 await h.succeed(h.requests[1]);
 assert.equal(h.requests[3].url,imageAssets.back[0]);
 await h.succeed(h.requests[2]);await h.succeed(h.requests[3]);
 await Promise.all([office,front,back,safe]);
 const n=h.requests.length;await h.loader.ensure('front');assert.equal(h.requests.length,n);
}
// Failed WebP and failed decode use the original PNG without flattening.
for(const failure of ['network','decode']) {
 const h=harness();const pending=h.loader.ensure('front');
 if(failure==='network')h.requests[0].onerror();
 else {h.requests[0].onload();h.requests[0].decoded.reject(new Error('Decode failed'));}
 await flush();assert.equal(h.requests[1].url,imageAssets.front[1]);
 await h.succeed(h.requests[1]);
 assert.equal(await pending,imageAssets.front[1]);assert.equal(h.loader.url('front'),imageAssets.front[1]);
}
// Both formats failing must clear the cache so an explicit retry can recover.
{
 const h=harness();const pending=h.loader.ensure('back');
 const rejection=assert.rejects(pending,/Image unavailable/);
 h.requests[0].onerror();await flush();h.requests[1].onerror();await rejection;await flush();
 assert.equal(h.loader.ready('back'),false);assert.equal(h.loader.entries.has('back'),false);
 const retry=h.loader.ensure('back');await h.succeed(h.requests[2]);await retry;assert.equal(h.loader.ready('back'),true);
}
// Stalled network/decode cannot leave a transition pending forever.
{
 const h=harness({timeout:10});
 await assert.rejects(h.loader.ensure('safeOpen'),/timed out/);
 assert.equal(h.requests.length,2);assert.ok(h.requests.every(image=>image.removed));
}
console.log('PASS: optimized/fallback paths, /classified/ resolution, first-screen priority, scene plans, decode gating, deduplication, two-request limit, urgent promotion, PNG fallback, decode failure, timeout and retry recovery.');
