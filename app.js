import {SceneAnimations} from './animations.js?v=full-motion-v8';
import {guests, defaultGreeting, event} from './config.js';
import {AudioController} from './audio.js';
import {ImageLoader, sceneImages} from './assets.js?v=keypad-v6';
import {safeKeys, safeDisplay, safeGeometry, safeFit} from './safe-controls.js?v=keypad-v6';
const storage={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{console.warn('Local storage is unavailable.');}}};
const guestId=new URLSearchParams(location.search).get('guest') || 'default';
const greeting=Object.hasOwn(guests,guestId)?guests[guestId]:defaultGreeting;
const key=`op45:guest:${encodeURIComponent(guestId)}`;
let saved={};try{saved=JSON.parse(storage.get(key)||'{}')||{};}catch{}
const audio=new AudioController(storage), main=document.querySelector('#main');
const animations=new SceneAnimations();
let stage='intro',question=0,answered=false,code='',locked=false,openingTimer;
const artwork = new ImageLoader();
let loadingJob = null;
const confirmationStorageNote = 'Подтверждение сохранено только на этом устройстве.';
let lastSafeInput = { value: null, time: -Infinity };
const framePosition = rect => `left:${rect.x/safeGeometry.width*100}%;top:${rect.y/safeGeometry.height*100}%;width:${rect.width/safeGeometry.width*100}%;height:${rect.height/safeGeometry.height*100}%`;
const controlPosition = control => `left:${control.x}%;top:${control.y}%;width:${control.width}%;height:${control.height}%`;
const warmScene = (scene, options) => artwork.warm(sceneImages(scene, options));
function withArtwork(ids, action, gesture = false) {
  if (loadingJob) return;
  if (ids.every(id => artwork.ready(id))) return action();
  const job = { ids, action, gesture };
  loadingJob = job;
  attemptArtwork(job);
}
function attemptArtwork(job) {
  const notice = document.querySelector('#loading');
  const message = document.querySelector('#loading-message');
  const retry = document.querySelector('#loading-retry');
  notice.hidden = false; retry.hidden = true; retry.onclick = null;
  message.textContent = 'Готовим секретные материалы…';
  main.setAttribute('aria-busy', 'true');
  artwork.prepare(job.ids, true).then(() => {
    const complete = () => {
      loadingJob = null; notice.hidden = true; retry.onclick = null;
      main.setAttribute('aria-busy', 'false'); job.action();
    };
    if (job.gesture) {
      // Keep celebration playback inside a fresh tap if loading outlasted the original gesture.
      message.textContent = 'Приглашение готово.';
      retry.textContent = 'Открыть приглашение'; retry.hidden = false; retry.onclick = complete; retry.focus();
    } else complete();
  }).catch(() => {
    message.textContent = 'Материалы пока недоступны. Проверь соединение и попробуй ещё раз.';
    retry.textContent = 'Повторить загрузку'; retry.hidden = false;
    retry.onclick = () => attemptArtwork(job); retry.focus();
  });
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const questions=[
 ['Способны ли вы хранить секреты даже от самых близких?', ['Да. Я умею держать язык за зубами','Смотря насколько интересный секрет…'],['Секреты под надёжной защитой. Даже семейный чат ничего не узнает.','Обнаружено здоровое любопытство. Такие секреты стоит узнавать лично.']],
 ['Сможете ли вы сохранять самообладание перед столом, полным вкусной еды?', ['Конечно! У меня железная выдержка','А зачем подвергать себя таким испытаниям?'],['Выдержка впечатляет. Проверим её при встрече с праздничным столом.','Ответ принят. Служба безопасности тоже за вторую порцию.']],
 ['Если во время секретной операции внезапно заиграет музыка, ваши действия?', ['Немедленно приступлю к танцевальной разведке','Сначала оценю обстановку. Потом покажу класс!'],['Танцевальная разведка одобрена. Пароль на танцпол не потребуется.','Тактический подход! Лучшие движения оставлены для решающего момента.']]
];
function save(progress){saved={...saved,progress};storage.set(key,JSON.stringify(saved));}
let compositionObserver;
function fitComposition(){
  compositionObserver?.disconnect();
  if(typeof ResizeObserver==='undefined')return;
  const slot=main.querySelector('.safe-layout,.card-viewport');
  if(!slot)return;
  const fit=()=>{
    const safe=slot.querySelector('.safe-art'),card=slot.querySelector('.card-stage');
    const width=slot.clientWidth,height=slot.clientHeight;
    if(safe){
      const message=slot.querySelector('.safe-messages').offsetHeight;
      const size=safeFit(width,height,message);
      safe.style.width=`${size.width}px`;
      safe.style.marginTop=`${size.marginTop}px`;
    }else if(card){
      const actions=slot.querySelector('.invitation-actions').offsetHeight;
      const cardWidth=Math.max(0,Math.min(width,600,(height-actions-18)/(1.5-24/1024)));
      card.style.width=`${cardWidth}px`;
      slot.querySelector('.invitation-actions').style.marginTop=`${18-cardWidth*24/1024}px`;
    }
  };
  compositionObserver=new ResizeObserver(fit);
  compositionObserver.observe(slot);
  const content=slot.querySelector('.safe-messages,.invitation-actions');
  if(content)compositionObserver.observe(content);
  fit();
}
function render(html){main.dataset.stage=stage;main.innerHTML=html;animations.setScene(stage);fitComposition();main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});main.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{document.querySelector('#asset-error').hidden=false;console.warn(`Image unavailable: ${img.getAttribute('src')}`);}));}
const eyebrow=s=>`<div class="eyebrow">${s}</div>`;
function updateSound(){const b=document.querySelector('#sound');b.textContent=`Звук: ${audio.enabled?'вкл.':'выкл.'}`;b.setAttribute('aria-pressed',String(audio.enabled));}
document.querySelector('#sound').onclick=()=>{audio.toggle();updateSound();};updateSound();
function intro(returning=false){stage='intro';document.body.classList.remove('celebration');render(`<section class="scene intro"><div class="intro-copy">${eyebrow('Личное дело · Особый допуск')}<p class="greeting">${esc(greeting)}</p><h1>У каждого<br>секрета есть<br><em>свой повод.</em></h1><p class="lead">${returning?'Твоё секретное приглашение уже ждёт. Можно открыть его сразу или снова отправиться на задание.':'На твоё имя поступило задание особой важности… Впереди — проверка, секретный код и кое-что очень личное.'}</p><div class="actions">${returning?'<button class="primary" data-action="direct">Посмотреть приглашение <span class="arrow">↗</span></button><button class="secondary" data-action="restart">Пройти операцию заново</button>':'<button class="primary" data-action="accept">ПРИНЯТЬ ЗАДАНИЕ <span class="arrow">→</span></button>'}</div><p class="small">${returning?'Доступ восстановлен на этом устройстве.':'Пара минут. Немного интриги. И только свои люди.'}</p></div><aside class="dossier" aria-label="Секретное дело"><div class="file-top"><span>ЛИЧНО В РУКИ</span><span>ЗАКРЫТЫЙ АРХИВ</span></div><div class="file-number" aria-hidden="true">◆</div><div class="stamp">СОВЕРШЕННО СЕКРЕТНО</div><div class="file-bottom">ОПЕРАЦИЯ ОСОБОЙ ВАЖНОСТИ<br>КРУГ ДОПУЩЕННЫХ: САМЫЕ БЛИЗКИЕ</div></aside></section>`);warmScene('intro',{returning});}
function detector(){stage='detector';answered=false;save('detector');const q=questions[question];render(`<section class="scene">${eyebrow('Этап 01 · Проверка на детекторе')}<div class="panel"><div class="panel-top"><span>ВОПРОС ${question+1} / 3</span><span class="live">НА СВЯЗИ</span></div><div class="ecg"><div class="ecg-track"><svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 55H70L83 48 95 62 115 55H155L168 54 178 25 190 85 203 10 215 70 228 55H320L335 45 350 55H500H570L583 48 595 62 615 55H655L668 54 678 25 690 85 703 10 715 70 728 55H820L835 45 850 55H1000" fill="none" stroke="currentColor" stroke-width="2"/></svg></div></div><h2>${q[0]}</h2><div id="answer-area" class="answers">${q[1].map((a,i)=>`<button class="answer" data-answer="${i}">${a}</button>`).join('')}</div></div><p class="small">Отвечай спокойно. Здесь нет неправильных ответов.</p></section>`);warmScene('detector',{question});}
function answer(i){if(answered)return;answered=true;audio.sfx();document.querySelector('.ecg').classList.add('answered');document.querySelector('#answer-area').innerHTML=`<div class="verdict" role="status">${questions[question][2][i]}</div><button class="primary" data-action="continue">Продолжить →</button>`;}
function report(){stage='report';save('report');render(`<section class="scene report-scene">${eyebrow('Служба безопасности · Заключение')}<div class="panel"><div class="panel-top"><span>ЗАКРЫТЫЙ АРХИВ</span><span>ПРОВЕРКА ЗАВЕРШЕНА</span></div><h2>Среди своих.<br>Сомнений нет.</h2><p class="lead">${esc(greeting)} Проверка пройдена. Допуск к секретным материалам открыт.</p><div class="report-lines"><div>Надёжность <span>Подтверждена</span></div><div>Чувство юмора <span>В наличии</span></div><div>Статус <span>Особо близкий круг</span></div></div><p class="verdict">Обнаружена аномалия: подозрительно высокая готовность к хорошему времяпрепровождению.</p><div class="actions"><button class="primary" data-action="safe">К секретному сейфу →</button></div></div></section>`);warmScene('report');}
function safe(){
  if(!artwork.ready('safeClosed'))return withArtwork(['safeClosed'],()=>safe());
  stage='safe';code='';locked=false;lastSafeInput={value:null,time:-Infinity};save('safe');
  render(`<section class="scene safe-scene">
    ${eyebrow('СЕКРЕТНЫЙ КОД СОСТОИТ ИЗ ДВУХ ЦИФР')}
    <h2>Секретный сейф</h2>
    <div class="safe-layout"><div class="safe-messages"><p class="safe-status" role="status"></p><div class="hints" aria-live="polite"><p class="hint" id="first-riddle">Первая цифра: сколько времён года в году?</p><p class="hint" id="second-riddle" hidden>Вторая цифра: сколько пальцев на одной руке?</p></div>
    </div><div class="safe-art">
      <div class="safe-closed-frame" style="${framePosition(safeGeometry.closed)}">
        <img class="safe-closed" src="${artwork.url('safeClosed')}" alt="Закрытый чёрный сейф с золотой отделкой" width="1046" height="1504">
        <div class="safe-controls">
          <output class="code-display" aria-label="Введённый код" aria-live="polite" style="${controlPosition(safeDisplay)}">— —</output>
          <div class="keypad" role="group" aria-label="Клавиатура сейфа">${safeKeys.map(key=>`<button type="button" class="safe-key" data-key="${key.value}" aria-label="${key.accessible}" style="${controlPosition(key)}"></button>`).join('')}</div>
        </div>
      </div>
      <img class="safe-open" style="${framePosition(safeGeometry.open)}" alt="Открытый сейф с золотым светом" aria-hidden="true">
      <img class="emerging" alt="" aria-hidden="true">
    </div></div>
  </section>`);
  warmScene('safe');
}
function keypad(value, interaction=false){
  if(stage!=='safe'||locked||loadingJob)return;
  if(!/^[0-9]$/.test(value)&&!['clear','delete','enter'].includes(value))return;
  if(interaction){
    const now=performance.now();
    if(lastSafeInput.value===value&&now-lastSafeInput.time<220)return;
    lastSafeInput={value,time:now};
  }
  if(value==='enter'){
    audio.sfx('key');
    if(code==='45'){unlock();return;}
    document.querySelector('.safe-status').textContent='Код не подошёл. Попробуй ещё — попытки не ограничены.';
    code='';
  }else if(value==='clear'){audio.sfx('key');code='';document.querySelector('.safe-status').textContent='';}
  else if(value==='delete'){audio.sfx('key');code=code.slice(0,-1);document.querySelector('.safe-status').textContent='';}
  else if(code.length<2){audio.sfx('key');code+=value;document.querySelector('.safe-status').textContent='';}
  document.querySelector('.code-display').textContent=code.padEnd(2,'—').split('').join(' ');
  document.querySelector('#first-riddle').hidden=code.length>0;
  document.querySelector('#second-riddle').hidden=code.length===0;
  if(code.length===2)document.querySelector('.safe-status').textContent='Код введён. Нажми OK на сейфе.';
}

function unlock(){locked=true;document.querySelectorAll('.safe-controls button').forEach(b=>b.disabled=true);withArtwork(['safeOpen','front','back'],()=>revealSafe());}
function revealSafe(){save('unlocked');document.querySelector('.safe-closed-frame').setAttribute('aria-hidden','true');document.querySelector('.safe-open').setAttribute('aria-hidden','false');document.querySelector('.safe-open').src=artwork.url('safeOpen');document.querySelector('.emerging').src=artwork.url('front');document.querySelector('.safe-status').textContent='Доступ разрешён. Секрет становится ближе…';audio.sfx('transition');document.querySelector('.safe-art').classList.add('unlocked');openingTimer=setTimeout(()=>invitation(false),3000);}
const icon=(type)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${type==='date'?'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M7 15h2m3 0h2m3 0h2M7 18h2m3 0h2"/>':type==='time'?'<circle cx="12" cy="12" r="9"/><path d="M12 5v7l4 3"/>':'<path d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 1114 0Z"/><circle cx="12" cy="9" r="2.5"/>'}</svg>`;
function invitation(direct){if(!['front','back'].every(id=>artwork.ready(id)))return withArtwork(['front','back'],()=>invitation(direct),direct);stage='invitation';document.body.classList.add('celebration');save('invitation');render(`<section class="scene final-scene">${eyebrow('Секрет раскрыт · Только для тебя')}<div class="card-viewport"><div class="card-stage"><div class="card"><button class="card-face card-front" data-action="flip" aria-label="Открыть приглашение"><img src="${artwork.url('front')}" alt="ПРИГЛАШЕНИЕ — лицевая сторона"></button><div class="card-face card-back" aria-hidden="true"><img src="${artwork.url('back')}" alt="Декоративная оборотная сторона приглашения"><div class="card-copy" data-long-greeting="${greeting.length>14}"><p class="card-greeting">${esc(greeting)}</p><h2 class="card-title">Мне скоро <strong>45!</strong></h2><div class="card-rule" aria-hidden="true">♡</div><p class="card-message">Приглашаю тебя отпраздновать мой юбилей с самыми близкими мне людьми!</p><div class="card-rule" aria-hidden="true">❧</div><div class="event"><div>${icon('date')}<span>${esc(event.date)} (${esc(event.time)})</span></div><div class="address">${icon('address')}<span>${esc(event.address)}</span></div></div><div class="card-rule" aria-hidden="true">♡</div></div></div></div></div><div class="invitation-actions"><p class="tap-label">Нажмите, чтобы открыть</p><div class="final-controls" hidden></div></div></div></section>`);if(direct)flip();}
function celebrate(){animations.celebrate();}
function finalControls(){
  if(stage!=='invitation')return;
  document.querySelector('.final-controls').hidden=false;
  document.querySelector('.final-controls').innerHTML=saved.rsvp
    ? '<button class="secondary" data-action="confirmation">Посмотреть подтверждение</button>'
    : '<button class="primary" data-action="rsvp" aria-label="Я приду! Сохранить ответ на этом устройстве">Я приду!</button>';
}
function confirmation(){
  stage='confirmation';document.body.classList.add('celebration');
  const split=event.confirmation.lastIndexOf('До встречи');
  const lines=split<0?[event.confirmation]:[event.confirmation.slice(0,split).trim(),event.confirmation.slice(split).trim()];
  render(`<section class="scene confirmation-scene">
    ${eyebrow('До скорой встречи')}
    <h1 class="confirmation" role="status">${lines.map(line=>`<span>${esc(line)}</span>`).join(' ')}</h1>
    <p class="local-note">${confirmationStorageNote}</p>
    <button class="secondary" data-action="direct">Посмотреть приглашение</button>
  </section>`);
  celebrate();
}

function flip(){if(document.querySelector('.card').classList.contains('flipped'))return;audio.sfx('transition');audio.start('celebration');document.querySelector('.card').classList.add('flipped');document.querySelector('.card-front').disabled=true;document.querySelector('.card-front').setAttribute('aria-hidden','true');document.querySelector('.card-back').setAttribute('aria-hidden','false');document.querySelector('.tap-label').hidden=true;celebrate();setTimeout(finalControls,1000);}
main.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled||loadingJob)return;if(b.dataset.answer!==undefined){answer(Number(b.dataset.answer));return;}if(b.dataset.key){keypad(b.dataset.key,true);return;}switch(b.dataset.action){case'accept':case'restart':clearTimeout(openingTimer);saved={rsvp:saved.rsvp};question=0;audio.start('spy');audio.sfx('transition');detector();break;case'continue':audio.sfx(question===2?'transition':'click');if(question<2){question++;detector();}else report();break;case'safe':audio.sfx('transition');safe();break;case'flip':flip();break;case'direct':invitation(true);break;case'rsvp':if(stage!=='invitation'||saved.rsvp)return;audio.sfx();saved.rsvp=true;save('invitation');confirmation();break;case'confirmation':if(!saved.rsvp)return;audio.sfx();confirmation();break;}});
document.addEventListener('keydown',e=>{
  if(stage!=='safe'||locked||loadingJob||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.repeat){e.preventDefault();return;}
  if(/^\d$/.test(e.key)){e.preventDefault();keypad(e.key,true);}
  else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();keypad('delete',true);}
  else if(e.key==='Escape'||e.key.toLowerCase()==='c'){e.preventDefault();keypad('clear',true);}
  else if(e.key==='Enter'&&(e.target===main||e.target?.closest?.('.safe-controls'))){e.preventDefault();keypad('enter',true);}
});
artwork.ensure('office', true).then(url => {
  document.querySelector('.ambience').style.setProperty('--office-image', `url("${url}")`);
}).catch(() => { document.querySelector('#asset-error').hidden = false; });
intro(Boolean(saved.progress));
