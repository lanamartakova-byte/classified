import {safeKeys,safeDisplay,safeGeometry as geometry,safeFit} from '../safe-controls.js?v=keypad-v6';
import {imageAssets} from '../assets.js?v=keypad-v6';
const sizes=[[320,568],[375,667],[390,844],[400,909],[430,932]];
const check=(condition,message)=>{if(!condition)throw new Error(message)};
const near=(actual,expected,label,tolerance=1.5)=>check(Math.abs(actual-expected)<=tolerance,`${label}: ${actual.toFixed(2)} vs ${expected.toFixed(2)}`);
const waitFor=async(test,label,timeout=60000)=>{
 const start=performance.now();
 while(performance.now()-start<timeout){if(test())return;await new Promise(resolve=>setTimeout(resolve,100));}
 throw new Error(`Timed out: ${label}`);
};
const center=rect=>({x:rect.left+rect.width/2,y:rect.top+rect.height/2});
const visible=(rect,width,height,label)=>check(rect.width>0&&rect.height>0&&rect.left>=-1&&rect.top>=-1&&rect.right<=width+1&&rect.bottom<=height+1,`${label} outside viewport`);
const overlap=(a,b)=>a.left<b.right-.5&&b.left<a.right-.5&&a.top<b.bottom-.5&&b.top<a.bottom-.5;
function noScroll(doc,win){
 check(doc.scrollingElement.scrollHeight<=win.innerHeight+1,'Document has vertical overflow');
 check(doc.scrollingElement.scrollWidth<=win.innerWidth+1,'Document has horizontal overflow');
 check(doc.body.getBoundingClientRect().height<=win.innerHeight+1,'Body exceeds viewport height');
}
async function inspectScene(doc,win,width,height,label,resize=true){
 await new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));
 noScroll(doc,win);
 check(doc.querySelectorAll('main>.scene').length===1,`${label}: multiple active scenes`);
 const scene=doc.querySelector('main>.scene');
 visible(scene.getBoundingClientRect(),width,height,`${label} scene`);
 check(scene.getBoundingClientRect().width>=width*.85,`${label}: narrow scene column`);
 const panel=doc.querySelector('.panel');
 if(panel){
  const box=panel.getBoundingClientRect();visible(box,width,height,`${label}: both panel borders`);
  check(box.left>=8&&box.right<=width-8,`${label}: panel side margins`);
  check(panel.scrollWidth<=panel.clientWidth+1,`${label}: panel intrinsic overflow`);
  for(const child of panel.querySelectorAll('h2,.answers,.answer,.ecg,.verdict')){
   const rect=child.getBoundingClientRect();
   check(rect.left>=box.left&&rect.right<=box.right,`${label}: panel child width`);
  }
 }
 if(doc.querySelector('.final-scene'))invitationGeometry(doc,win,width,height,label);
 if(doc.querySelector('.safe-art')&&!doc.querySelector('.unlocked'))safeGeometry(doc,win,width,height);
 const walker=doc.createTreeWalker(doc.body,win.NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode,element=node.parentElement;
  if(!node.textContent.trim()||element.closest('[hidden],[aria-hidden="true"]')||win.getComputedStyle(element).visibility==='hidden')continue;
  const range=doc.createRange();range.selectNodeContents(node);
  for(const rect of range.getClientRects()){
   if(!rect.width||!rect.height)continue;
   visible(rect,width,height,`${label}: text ${node.textContent.trim().slice(0,35)}`);
   for(let parent=element;parent&&parent!==doc.body;parent=parent.parentElement){
    const style=win.getComputedStyle(parent),box=parent.getBoundingClientRect();
    if(/hidden|clip|auto|scroll/.test(style.overflowX))check(rect.left>=box.left-2&&rect.right<=box.right+2,`${label}: horizontally clipped text`);
    if(/hidden|clip|auto|scroll/.test(style.overflowY))check(rect.top>=box.top-2&&rect.bottom<=box.bottom+2,`${label}: vertically clipped text`);
   }
  }
 }
 for(const button of doc.querySelectorAll('button:not(:disabled)')){
  if(button.closest('[hidden],[aria-hidden="true"]'))continue;
  const rect=button.getBoundingClientRect();if(rect.width&&rect.height)visible(rect,width,height,`${label}: button`);
 }
 document.querySelector('#results').textContent+=`  ${width}×${height}: ${label} geometry/text checks passed.\n`;
 if(resize){
  for(const [w,h] of [[430,932],[320,568],[width,height]]){
   win.frameElement.style.width=`${w}px`;win.frameElement.style.height=`${h}px`;
   await inspectScene(doc,win,w,h,`${label} / live resize`,false);
  }
 }
 if(resize&&document.querySelector('#inspect').checked){
  const next=document.querySelector('#next');next.hidden=false;next.textContent=`Continue after reviewing ${width}×${height}: ${label}`;
  await new Promise(resolve=>next.onclick=()=>{next.onclick=null;next.hidden=true;resolve()});
 }
}
function invitationGeometry(doc,win,width,height,label){
 const scene=doc.querySelector('.final-scene').getBoundingClientRect();
 const slot=doc.querySelector('.card-viewport').getBoundingClientRect();
 const card=doc.querySelector('.card-stage').getBoundingClientRect();
 check(slot.width>=scene.width*.98,`${label}: artwork slot narrowed`);
 near(card.width,Math.min(slot.width,(slot.height-doc.querySelector('.invitation-actions').offsetHeight-18)/(1.5-24/1024),600),`${label}: artwork maximum fitting size`,2);
 near(center(card).x,width/2,`${label}: centered artwork`);
 near(card.width/card.height,2/3,`${label}: artwork ratio`,.001);
 visible(card,width,height,`${label}: complete artwork`);
 check(card.width>=Math.min(width*.8,slot.height*.65),`${label}: artwork too small`);
 const actions=doc.querySelector('.invitation-actions').getBoundingClientRect();
 check(actions.width>=scene.width*.98,`${label}: footer narrowed`);
 visible(actions,width,height,`${label}: footer`);
 const bottomInset=doc.querySelector('.card.flipped')?16:24;
 const actionElement=doc.querySelector('.final-controls:not([hidden]) button')||doc.querySelector('.tap-label');
 const actionTop=actionElement.getBoundingClientRect().top;
 const gap=(actionElement.matches('button')?actionTop:actions.top)-(card.bottom-card.height*bottomInset/1536);
 check(gap>=14&&gap<=21,`${label}: visible invitation/action gap ${gap.toFixed(1)}px`);
 if(doc.querySelector('.card.flipped')){
  const paper=doc.querySelector('.card-copy').getBoundingClientRect();
  for(const element of doc.querySelectorAll('.card-copy p,.card-title,.event')){
   const rect=element.getBoundingClientRect();
   check(rect.left>=paper.left-2&&rect.right<=paper.right+2&&rect.top>=paper.top-2&&rect.bottom<=paper.bottom+2,`${label}: invitation text outside paper area`);
   check(element.scrollHeight<=element.clientHeight+2&&element.scrollWidth<=element.clientWidth+2,`${label}: invitation text overflow`);
  }
  check(parseFloat(win.getComputedStyle(doc.querySelector('.card-message')).fontSize)>=12,`${label}: message font too small`);
 }
 return card;
}
function confirmationGeometry(doc,win,width,height){
 check(doc.querySelector('main').dataset.stage==='confirmation','RSVP did not navigate to its own scene');
 check(!doc.querySelector('main img,.card-stage,[data-action="rsvp"]'),'Large artwork or extra RSVP step remains on confirmation');
 const element=doc.querySelector('.confirmation'),rect=element.getBoundingClientRect();
 visible(rect,width,height,'Confirmation message');
 near(center(rect).x,width/2,'Confirmation centered');
 check(rect.width>=Math.min(width*.75,320),'Confirmation collapsed into narrow column');
 check(element.scrollHeight<=element.clientHeight+2&&element.scrollWidth<=element.clientWidth+2,'Confirmation clipped');
 check(element.querySelectorAll(':scope>span').length===2,'Configured confirmation was not split into two phrases');
 check(element.getBoundingClientRect().height/parseFloat(win.getComputedStyle(element).lineHeight)<=3.5,'Confirmation wraps into too many lines');
 check(doc.querySelector('.local-note').textContent==='Подтверждение сохранено только на этом устройстве.','Storage message missing');
}
function safeGeometry(doc,win,width,height){
 const image=doc.querySelector('.safe-closed').getBoundingClientRect();
 const art=doc.querySelector('.safe-art').getBoundingClientRect();
 const slot=doc.querySelector('.safe-layout').getBoundingClientRect();
 const message=doc.querySelector('.safe-messages').offsetHeight;
 near(art.width,safeFit(slot.width,slot.height,message).width,'Maximum fitting safe',2);
 const bounds={left:image.left,right:image.left+image.width*1024/1046,top:image.top+image.height*21/1504,bottom:image.bottom,width:image.width*1024/1046,height:image.height*1483/1504};
 visible(bounds,width,height,'Nontransparent safe artwork');
 const riddle=doc.querySelector('.hint:not([hidden])').getBoundingClientRect();
 const gap=bounds.top-riddle.bottom;
 check(gap>=15&&gap<=25,`Riddle/visible-safe gap ${gap.toFixed(1)}px`);
 const key=doc.querySelector('.safe-key').getBoundingClientRect();
 document.querySelector('#results').textContent+=`  MEASURED ${width}×${height}: visible safe ${bounds.width.toFixed(1)}×${bounds.height.toFixed(1)}, original key ${key.width.toFixed(1)}×${key.height.toFixed(1)} CSS px; riddle gap ${gap.toFixed(1)}px.\n`;
}
async function runViewport(width,height){
 const guest=`__safe_layout_${width}x${height}`;
 const storageKey=`op45:guest:${encodeURIComponent(guest)}`;
 const previous=localStorage.getItem(storageKey);localStorage.removeItem(storageKey);
 const holder=document.createElement('div');holder.className='viewport';
 const frame=document.createElement('iframe');frame.width=width;frame.height=height;frame.style.width=`${width}px`;frame.style.height=`${height}px`;frame.title=`${width} × ${height}`;
 holder.append(frame);document.querySelector('#viewports').append(holder);
 frame.src=`../index.html?guest=${encodeURIComponent(guest)}&layout-check=${Date.now()}`;
 let passed=false;
 try{
  await waitFor(()=>frame.contentDocument?.querySelector('[data-action="accept"]'),'intro');
  const doc=frame.contentDocument,win=frame.contentWindow;
  const style=doc.createElement('style');style.textContent='*,*::before,*::after{animation:none!important;transition:none!important}';doc.head.append(style);
  await inspectScene(doc,win,width,height,'Introduction');
  doc.querySelector('[data-action="accept"]').click();
  for(let i=0;i<3;i++){
   await waitFor(()=>doc.querySelector('[data-answer="0"]'),`question ${i+1}`);
   await inspectScene(doc,win,width,height,`Detector question ${i+1}`);doc.querySelector('[data-answer="0"]').click();
   await inspectScene(doc,win,width,height,`Detector verdict ${i+1}`);
   doc.querySelector('[data-action="continue"]').click();
  }
  await inspectScene(doc,win,width,height,'Security report');
  doc.querySelector('[data-action="safe"]').click();
  await waitFor(()=>doc.querySelectorAll('.safe-key').length===12,'integrated safe');
  await new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));
  await inspectScene(doc,win,width,height,'Safe puzzle');
  near(win.innerWidth,width,'viewport width',.1);near(win.innerHeight,height,'viewport height',.1);
  noScroll(doc,win);
  const image=doc.querySelector('.safe-closed'),imageRect=image.getBoundingClientRect();
  const slot=doc.querySelector('.safe-layout').getBoundingClientRect(),art=doc.querySelector('.safe-art').getBoundingClientRect();
  check(image.complete&&image.naturalWidth===1046&&image.naturalHeight===1504,'Approved safe image is not ready');
  visible(imageRect,width,height,'Closed safe');
  check(imageRect.width>=Math.min(width*.70,(slot.height-106)*.65),`Safe too small: ${imageRect.width.toFixed(1)}px`);
  near(center(imageRect).x,width/2,'Closed safe centered horizontally');
  safeGeometry(doc,win,width,height);
  near(imageRect.width/imageRect.height,1046/1504,'Safe aspect ratio',.001);
  check(image.currentSrc.endsWith(imageAssets.safeClosed[0]),'New optimized closed WebP not loaded');

  const riddle=doc.querySelector('#first-riddle').getBoundingClientRect();
  visible(riddle,width,height,'Riddle');
  visible(doc.querySelector('.safe-scene h2').getBoundingClientRect(),width,height,'Title');
  const rects=[];
  const aligned=(element,control,label,interactive=true)=>{
   const rect=element.getBoundingClientRect(),point=center(rect);
   near(point.x,imageRect.left+imageRect.width*control.x/100,`${label} center x`);
   near(point.y,imageRect.top+imageRect.height*control.y/100,`${label} center y`);
   near(rect.width,imageRect.width*control.width/100,`${label} width`);
   near(rect.height,imageRect.height*control.height/100,`${label} height`);
   visible(rect,width,height,label);
   if(interactive){check(doc.elementFromPoint(point.x,point.y)?.closest('button')===element,`${label} blocked by another layer`);rects.push(rect);}
  };
  safeKeys.forEach(key=>aligned(doc.querySelector(`[data-key="${key.value}"]`),key,`Key ${key.label}`));
  aligned(doc.querySelector('.code-display'),safeDisplay,'Code display',false);
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++)check(!overlap(rects[i],rects[j]),`Hit zones ${i}/${j} overlap`);
  const key=value=>doc.querySelector(`[data-key="${value}"]`).click();
  check(doc.querySelectorAll('.safe-key').length===12,'Exactly 12 integrated controls required');
  check(!doc.querySelector('dialog,.keypad-zoom,.safe-wheel,[data-key="delete"]'),'Obsolete controls remain');
  key('1');key('2');
  check(!doc.querySelector('.unlocked'),'Code entry auto-opened safe');
  await inspectScene(doc,win,width,height,'Integrated OK guidance');
  key('enter');check(!doc.querySelector('.safe-art.unlocked'),'Wrong code opened safe');
  check(doc.querySelector('.safe-status').textContent==='','Wrong code must clear without a message');
  const originalSafe=doc.querySelector('.safe-art');
  for(const wrong of ['98','12','98']){
   for(const digit of wrong){
    const button=doc.querySelector(`[data-key="${digit}"]`);
    button.dispatchEvent(new win.Event('touchend',{bubbles:true}));button.click();
   }
   check(doc.querySelector('.code-display').textContent===wrong.split('').join(' '),'Immediate wrong-code retry dropped input');
   key('enter');
   check(doc.querySelector('.code-display').textContent==='— —','Wrong attempt failed to clear');
   check(doc.querySelector('.safe-art')===originalSafe&&frame.contentDocument===doc,'Wrong attempt reset the scene/page');
   check(!doc.querySelector('.safe-controls button:disabled'),'Wrong attempt locked keypad');
  }
  for(const digit of '0123456789'){
   key('clear');key(digit);check(doc.querySelector('.code-display').textContent===`${digit} —`,'Digit/display mismatch');
  }
  doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Backspace',bubbles:true,cancelable:true}));
  check(doc.querySelector('.code-display').textContent==='— —','Keyboard Backspace failed');
  key('1');key('2');key('enter');
  check(doc.querySelector('.code-display').textContent==='— —'&&doc.querySelector('.safe-status').textContent==='','One OK must clear 12 silently');
  check(doc.querySelector('.safe-art')===originalSafe,'Rejected OK reset scene');
  key('4');key('5');
  check(!doc.querySelector('.unlocked'),'45 auto-opened safe');
  const ok=doc.querySelector('[data-key="enter"]');ok.click();ok.click();
  await waitFor(()=>doc.querySelector('.safe-art.unlocked'),'safe opening');
  check(doc.querySelector('.safe-open').src.endsWith(imageAssets.safeOpen[0]),'Opening uses stale artwork');
  check(doc.querySelector('.safe-open').complete,'Open safe not decoded');
  const openRect=doc.querySelector('.safe-open').getBoundingClientRect();
  const closedRect=doc.querySelector('.safe-closed').getBoundingClientRect();
  visible(openRect,width,height,'Open safe canvas');
  near(closedRect.left+closedRect.width*60/1046,openRect.left+openRect.width*65/1046,'Cabinet left anchor',2);
  near(closedRect.top+closedRect.height*55/1504,openRect.top+openRect.height*125/1504,'Cabinet top anchor',2);
  near(openRect.width/openRect.height,1046/1504,'Open aspect ratio',.001);
  // Do not pause the opening's existing timer; inspect other stages interactively.
  noScroll(doc,win);
  await waitFor(()=>doc.querySelector('.card-front'),'invitation');
  invitationGeometry(doc,win,width,height,'Invitation front');
  await inspectScene(doc,win,width,height,'Invitation front');
  doc.querySelector('.card-front').click();
  await waitFor(()=>!doc.querySelector('.final-controls').hidden,'celebration and RSVP');
  invitationGeometry(doc,win,width,height,'Invitation back / celebration');
  await inspectScene(doc,win,width,height,'Invitation back / celebration');
  doc.querySelector('[data-action="rsvp"]').click();
  confirmationGeometry(doc,win,width,height);
  await inspectScene(doc,win,width,height,'RSVP confirmation');
  doc.querySelector('[data-action="direct"]').click();
  await waitFor(()=>doc.querySelector('[data-action="confirmation"]'),'saved RSVP invitation return');
  check(!doc.querySelector('[data-action="rsvp"]'),'Returning guest was asked to RSVP twice');
  invitationGeometry(doc,win,width,height,'Saved invitation');
  doc.querySelector('[data-action="confirmation"]').click();
  confirmationGeometry(doc,win,width,height);
  passed=true;
  return `PASS ${width}×${height}: safe ${imageRect.width.toFixed(1)}×${imageRect.height.toFixed(1)}px; no scroll; centered; all controls aligned, visible, unobstructed and non-overlapping; all scenes through confirmation checked; artwork fills its slot; text widths/clipping and wrong/correct integrated OK actions checked.`;
 }finally{
  if(previous===null)localStorage.removeItem(storageKey);else localStorage.setItem(storageKey,previous);
  if(passed)holder.remove();
 }
}
document.querySelector('#run').onclick=async()=>{
 const button=document.querySelector('#run'),results=document.querySelector('#results');button.disabled=true;results.textContent='Running actual browser checks for every scene…\n';document.querySelector('#viewports').replaceChildren();
 const previousSound=localStorage.getItem('op45:sound');localStorage.setItem('op45:sound','off');
 try{for(const [width,height]of sizes){try{results.textContent+=await runViewport(width,height)+'\n';}catch(error){results.textContent+=`FAIL ${width}×${height}: ${error.message}\n`;}}}
 finally{if(previousSound===null)localStorage.removeItem('op45:sound');else localStorage.setItem('op45:sound',previousSound);button.disabled=false;}
};
