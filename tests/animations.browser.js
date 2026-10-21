const sizes=[[320,568],[375,667],[390,844],[400,909],[430,932],[1280,720],[1920,1080]];
const output=document.querySelector('#results');
const check=(ok,message)=>{if(!ok)throw Error(message)};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(test,label){for(let n=0;n<600;n++){if(test())return;await sleep(100)}throw Error(`Timed out: ${label}`)}
function bounds(doc,win){
 check(doc.scrollingElement.scrollWidth<=win.innerWidth+1,'Horizontal document overflow');
 check(doc.scrollingElement.scrollHeight<=win.innerHeight+1,'Vertical document overflow');
 for(const element of doc.querySelectorAll('.ecg,.confirmation,.confirmation-scene button')){
  const box=element.getBoundingClientRect();
  check(box.width>0&&box.height>0&&box.left>=0&&box.right<=win.innerWidth+1&&box.top>=0&&box.bottom<=win.innerHeight+1,`Clipped ${element.className}`);
 }
}
async function inspect(label){
 if(!document.querySelector('#inspect').checked)return;
 const next=document.querySelector('#next');next.hidden=false;next.textContent=`Continue after reviewing ${label}`;
 await new Promise(resolve=>next.onclick=()=>{next.hidden=true;next.onclick=null;resolve()});
}
function point(path){const p=path.getPointAtLength(80);return new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM())}
async function run(width,height){
 const guest=`__animation_${width}x${height}`,key=`op45:guest:${guest}`;
 const previous=localStorage.getItem(key);localStorage.removeItem(key);
 const holder=document.createElement('div');holder.className='viewport';
 const frame=document.createElement('iframe');frame.title=`Animations ${width}×${height}`;
 frame.width=width;frame.height=height;frame.style.width=`${width}px`;frame.style.height=`${height}px`;
 holder.append(frame);document.querySelector('#viewports').append(holder);
 let passed=false;
 try{
  frame.src=`../index.html?guest=${guest}&animation-check=${Date.now()}`;
  await waitFor(()=>frame.contentDocument?.querySelector('[data-action="accept"]'),'intro');
  const doc=frame.contentDocument,win=frame.contentWindow;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const click=selector=>{const button=doc.querySelector(selector);check(button,`Missing ${selector}`);button.click()};
  click('[data-action="accept"]');await waitFor(()=>doc.querySelector('.ecg-track'),'ECG');
  // Let scene-arrival translation finish before sampling the waveform itself.
  holder.scrollIntoView({block:'start'});
  await sleep(750);bounds(doc,win);
  const path=doc.querySelector('.ecg path'),track=doc.querySelector('.ecg-track');
  const start=point(path);await sleep(350);const end=point(path);
  if(reduced){check(Math.abs(start.x-end.x)<.5,'ECG moved under reduced motion');check(doc.querySelector('.ecg').getAttribute('aria-label').includes('отключено'),'Missing static ECG description')}
  else{
   check(Math.abs(start.x-end.x)>2,'ECG screen position is frozen');
   const animation=track.getAnimations().find(a=>a.animationName==='pulse-line');check(animation,'No ECG animation');
   const time=animation.currentTime;
   // Exercise the real page lifecycle listener without pretending this is a physical background switch.
   win.dispatchEvent(new win.Event('pagehide'));await sleep(250);
   check(Math.abs(animation.currentTime-time)<50,'ECG failed to pause');
   win.dispatchEvent(new win.Event('pageshow'));await sleep(250);
   check(animation.currentTime>time+100,'ECG failed to resume');
   check(track.getAnimations().filter(a=>a.animationName==='pulse-line').length===1,'Duplicate ECG timelines');
  }
  output.textContent+=`  ${width}×${height}: ECG ${reduced?'static alternative':'screen x '+start.x.toFixed(1)+' → '+end.x.toFixed(1)}.\n`;
  await inspect(`${width}×${height} detector`);
  for(let question=0;question<3;question++){
   click('[data-answer="0"]');check(doc.querySelector('.ecg.answered'),'Answer color state lost');
   click('[data-action="continue"]');
  }
  check(!doc.querySelector('.ecg-track'),'ECG survived leaving detector');
  click('[data-action="safe"]');await waitFor(()=>doc.querySelector('[data-key="4"]'),'safe');
  click('[data-key="4"]');click('[data-key="5"]');click('[data-key="enter"]');
  await waitFor(()=>doc.querySelector('.card-front'),'invitation');click('.card-front');
  await waitFor(()=>doc.querySelector('[data-action="rsvp"]'),'RSVP');click('[data-action="rsvp"]');
  check(doc.querySelector('main').dataset.stage==='confirmation','RSVP did not enter confirmation');
  bounds(doc,win);
  const effects=doc.querySelector('#effects');
  check(win.getComputedStyle(effects).pointerEvents==='none','Effects intercept input');
  check(Number(win.getComputedStyle(effects).zIndex)<Number(win.getComputedStyle(doc.querySelector('main')).zIndex),'Fireworks above foreground message');
  if(reduced){check(effects.classList.contains('celebration-still')&&!effects.children.length,'Missing reduced-motion still treatment')}
  else{
   check(effects.querySelectorAll('.firework-spark').length===48,'Wrong burst count / duplicate generation');
   const spark=effects.querySelector('.firework-spark');
   await sleep(180);const first=spark.getBoundingClientRect(),opacity=Number(win.getComputedStyle(spark).opacity);
   await sleep(350);const second=spark.getBoundingClientRect();
   check(opacity>.1,'Fireworks remain invisible');
   check(Math.abs(first.x-second.x)+Math.abs(first.y-second.y)>2,'Firework particle is frozen');
   check(second.left>=0&&second.right<=width&&second.top>=0&&second.bottom<=height,'Particle clipped');
   for(const control of doc.querySelectorAll('.confirmation-scene button')){
    const rect=control.getBoundingClientRect();
    check(doc.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('button')===control,'Effects block confirmation controls');
   }
   await waitFor(()=>!effects.children.length,'fireworks cleanup');
  }
  output.textContent+=`  ${width}×${height}: RSVP ${reduced?'still treatment':'particle motion, opacity, cleanup'} passed.\n`;
  await inspect(`${width}×${height} confirmation (return below to replay)`);
  // A second confirmation must create a new finite generation, not stack old nodes.
  click('[data-action="direct"]');await waitFor(()=>doc.querySelector('[data-action="confirmation"]'),'saved invitation');
  click('[data-action="confirmation"]');check(effects.children.length===(reduced?0:48),'Repeated confirmation duplicates or loses effects');
  if(!reduced)await waitFor(()=>!effects.children.length,'second cleanup');
  bounds(doc,win);passed=true;
  output.textContent+=`PASS ${width}×${height}: current preference=${reduced?'reduce':'no-preference'}; repeated confirmation and layout bounds.\n`;
 }finally{
  if(previous===null)localStorage.removeItem(key);else localStorage.setItem(key,previous);
  if(passed)holder.remove();
 }
}
document.querySelector('#run').onclick=async()=>{
 const button=document.querySelector('#run');button.disabled=true;output.textContent='Running actual application movement samples…\n';document.querySelector('#viewports').replaceChildren();
 const previous=localStorage.getItem('op45:sound');localStorage.setItem('op45:sound','off');
 try{for(const [width,height]of sizes){try{await run(width,height)}catch(error){output.textContent+=`FAIL ${width}×${height}: ${error.message}\n`}}}
 finally{if(previous===null)localStorage.removeItem('op45:sound');else localStorage.setItem('op45:sound',previous);button.disabled=false}
};
