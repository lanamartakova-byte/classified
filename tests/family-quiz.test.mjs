import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boot} from './helpers.mjs';
import {questions,quizVersion} from '../quiz.js';
const expected=[
 ['Какой мой любимый цвет?',['голубой','оранжевый','зеленый','желтый'],0],
 ['Кто заядлый путешественник и ездит на тойоте?',['Света','Толя','Тимур','Бабай'],1],
 ['Кто у нас сейчас жених?',['Толя','Тимур','Даня','Егор'],2],
 ['Кто у нас круче всех рисует?',['Света','бабуля','Катя','Толя'],2],
 ['Кто мастер по разгадыванию сканвордов?',['бабуля','Инна','Егор','Даня'],0],
 ['Кто самый крутой танцор в семье?',['Света','Нина','Тимур','Маша'],3],
 ['Кто самый крутой айтишник?',['Толя','Егор','Тимур','Инна'],2],
 ['Кто самая лучшая сестричка на свете?',['Кукумберта','Шушундра','Хрюзильда','Жанна'],3],
 ['Кто самая неповторимая и креативная пчелка?',['Инна','Толя','Тимур','Даня'],0],
 ['Кто живет в Туле и всегда дарит подарочки?',['Толя','Даня','Нина','бабуля'],2],
 ['Кто мой любимый сладкий мальчишечка?',['Вася','Петя','Федя','Егорио'],3],
 ['Кто самый лучший папа по Вселенной?',['Владимир','Вольдемар','Вениамин','Вильгельм'],0]
];
assert.deepEqual(questions.map(q=>[q.text,q.answers,q.correct]),expected);
function fixture(store=new Map(),guest='katya'){
 let now=0,id=0;const tasks=new Map();
 const app=boot('?guest='+guest,store,null,{now:()=>now},{setTimeout(fn,delay){tasks.set(++id,{fn,at:now+delay});return id},clearTimeout(id){tasks.delete(id)}});
 const advance=ms=>{const end=now+ms;while(true){const task=[...tasks].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!task)break;tasks.delete(task[0]);now=task[1].at;task[1].fn()}now=end};
 const click=action=>app.get('#main').listeners.click({target:{closest:()=>({disabled:false,dataset:{action}})}});
 return {app,advance,tasks,click};
}
const f=fixture(),{app,advance,click,tasks}=f;click('accept');
for(let i=0;i<12;i++){
 const q=questions[i];assert.equal(app.run('question'),i);assert.equal(app.run('stage'),'detector');
 const html=app.get('#main').innerHTML;
 assert.ok(html.includes(q.text));assert.ok(html.includes(`ВОПРОС ${i+1} / 12`));
 assert.equal((html.match(/class="answer"/g)||[]).length,4);
 q.answers.forEach((a,n)=>assert.ok(html.includes(`${['А','Б','В','Г'][n]}) ${a}`)));
 const progress=app.persist.get('op45:guest:katya');
 for(const wrong of [0,1,2,3].filter(n=>n!==q.correct)){
  app.run(`answer(${wrong})`);assert.equal(app.get('#quiz-feedback').textContent,'Подумай ещё!');
  assert.equal(app.run('question'),i);assert.equal(app.run('answered'),false);assert.equal(tasks.size,0);
  assert.equal(app.get('#quiz-effects').children.length,0);assert.equal(app.persist.get('op45:guest:katya'),progress);
 }
 app.run(`answer(${q.correct})`);
 assert.equal(app.get('#quiz-feedback').textContent,['Молодец!','Правильно!','Верный выбор!','Отлично!','Точно!'][i%5]);
 assert.equal(app.get('#quiz-effects').children.length,24);assert.equal(app.get('#effects').children.length,0);
 assert.equal(tasks.size,1);assert.equal(app.run('answered'),true);
 assert.equal(JSON.parse(app.persist.get('op45:guest:katya')).quiz.next,i+1);
 for(let n=0;n<5;n++)app.run(`answer(${q.correct})`);
 assert.equal(tasks.size,1);assert.equal(app.get('#quiz-effects').children.length,24);
 advance(1799);assert.equal(app.run('question'),i);advance(1);
 assert.equal(app.get('#quiz-effects').children.length,0);assert.equal(app.run('question'),i+1);
}
assert.equal(app.run('stage'),'quiz-complete');
const completion=app.get('#main').innerHTML;
for(const text of ['МИССИЯ ВЫПОЛНЕНА','Блестящая работа!','Все испытания пройдены!','Ты отлично знаешь нашу семью.','Пора перейти к следующему этапу секретной операции!','ПРОДОЛЖИТЬ ОПЕРАЦИЮ'])assert.ok(completion.includes(text));
assert.doesNotMatch(completion,/справился|справилась/);click('continue');assert.equal(app.run('stage'),'report');
app.run('safe();keypad("1");keypad("2");keypad("enter")');assert.equal(app.run('code'),'');assert.equal(app.get('.safe-status').textContent,'');
app.run('keypad("4");keypad("5");keypad("enter")');advance(2999);assert.equal(app.run('stage'),'safe');advance(1);assert.equal(app.run('stage'),'invitation');
app.run('flip()');advance(1000);click('rsvp');assert.equal(app.run('stage'),'confirmation');assert.equal(app.get('#effects').children.length,48);
// Current partial state resumes only at the next correctly completed question.
const partial=fixture();partial.click('accept');partial.app.run('answer(0)');
const resumed=fixture(partial.app.persist);resumed.click('accept');assert.equal(resumed.app.run('question'),1);
for(const record of [{progress:'detector'},{progress:'safe',quiz:{version:'old',next:8}},{progress:'report',quiz:{version:quizVersion,next:99}},{quiz:{version:quizVersion,next:-1}}]){
 const legacy=fixture(new Map([['op45:guest:katya',JSON.stringify(record)]]));
 assert.doesNotMatch(legacy.app.get('#main').innerHTML,/data-action="direct"/);legacy.click('accept');assert.equal(legacy.app.run('question'),0);
}
for(const record of [{progress:'invitation',rsvp:true},{progress:'unlocked'},{progress:'detector',rsvp:true}]){
 const complete=fixture(new Map([['op45:guest:katya',JSON.stringify(record)]]));assert.match(complete.app.get('#main').innerHTML,/data-action="direct"/);
 assert.equal(JSON.parse(complete.app.persist.get('op45:guest:katya')).rsvp,record.rsvp);
}
// Completion click cannot skip unfinished quiz; scene exit cancels celebration.
const cancel=fixture();cancel.click('accept');cancel.click('continue');assert.equal(cancel.app.run('question'),0);
cancel.app.run('answer(0)');cancel.app.run('intro()');assert.equal(cancel.tasks.size,0);cancel.advance(5000);assert.equal(cancel.app.run('stage'),'intro');
const savedComplete=fixture(new Map([['op45:guest:katya',JSON.stringify({progress:'quiz-complete',quiz:{version:quizVersion,next:12}})]]));savedComplete.click('accept');assert.equal(savedComplete.app.run('stage'),'quiz-complete');
assert.notEqual(fixture(partial.app.persist,'nina').app.run('quizNext()'),1);
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');assert.match(css,/\.quiz-scene \.answer\{min-height:44px/);
assert.doesNotMatch(css,/prefers-reduced-motion/);
console.log('PASS: exact 12 questions/answers/mappings; all wrong answers retry without progress/fireworks; number-based praise, one 1800ms/24-spark celebration, duplicate guard, completion gate, migration/resume/RSVP safety, safe 45 and silent retry, 3000ms reveal and final fireworks preserved. Layout rendering unverified.');
// Foreground celebration time is preserved when the quiz is backgrounded.
const paused=fixture();paused.click('accept');paused.app.run('answer(0)');paused.advance(600);
paused.app.run('animations.onPageHide()');assert.equal(paused.tasks.size,0);
paused.advance(10000);assert.equal(paused.app.run('question'),0);assert.equal(paused.app.get('#quiz-effects').children.length,24);
paused.app.run('animations.onPageShow()');paused.advance(1199);assert.equal(paused.app.run('question'),0);
paused.advance(1);assert.equal(paused.app.run('question'),1);assert.equal(paused.app.get('#quiz-effects').children.length,0);
// Invalid input and an explicit replay cannot use stale callbacks to skip a question.
const restart=fixture();restart.click('accept');
for(const value of ['-1','4','NaN','0.5'])restart.app.run(`answer(${value})`);
assert.equal(restart.tasks.size,0);assert.equal(restart.app.run('answered'),false);
restart.app.run('answer(0)');restart.click('restart');assert.equal(restart.app.run('question'),0);assert.equal(restart.tasks.size,0);
restart.advance(5000);assert.equal(restart.app.run('question'),0);
console.log('PASS: compact quiz effects pause/resume with remaining foreground time, cancel on restart/scene exit, and reject invalid submissions.');
