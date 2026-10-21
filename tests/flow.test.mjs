import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {guests, defaultGreeting, event} from '../config.js';
import {boot} from './helpers.mjs';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');

for(const choice of [0,1]){
 const t=boot('?guest=mama');assert.match(t.get('#main').innerHTML,/Мамочка!/);t.run('detector()');
 for(let q=0;q<3;q++){assert.match(t.get('#main').innerHTML,new RegExp(`ВОПРОС ${q+1} / 3`));t.run(`answer(${choice})`);assert.match(t.get('#answer-area').innerHTML,/Продолжить/);assert.equal(t.run('answered'),true);if(q<2)t.run('question++;detector()');}
 t.run('report()');assert.match(t.get('#main').innerHTML,/Обнаружена аномалия/);t.run('safe();keypad("1");keypad("2");keypad("enter")');assert.match(t.get('.safe-status').textContent,/Код не подошёл/);assert.equal(t.run('locked'),false);
 t.run('keypad("4");keypad("delete")');assert.equal(t.run('code'),'');t.run('keypad("4");keypad("5");keypad("enter")');assert.equal(t.run('stage'),'invitation');assert.equal(t.run('locked'),true);
 t.run('flip()');assert.equal(t.get('.card').classList.contains('flipped'),true);assert.match(t.get('#main').innerHTML,/15 ноября 2026/);assert.equal(t.calls.includes('celebration'),true);
 t.run("saved.rsvp=true;save('invitation');finalControls()");assert.match(t.get('.final-controls').innerHTML,/Посмотреть подтверждение/);t.run('confirmation()');assert.equal(t.run('stage'),'confirmation');assert.match(t.get('#main').innerHTML,/Ура!/);assert.doesNotMatch(t.get('#main').innerHTML,/class="card-stage"/);
 const returning=boot('?guest=mama',t.persist);assert.match(returning.get('#main').innerHTML,/Посмотреть приглашение/);
 const papa=boot('?guest=papa',t.persist);assert.match(papa.get('#main').innerHTML,/Папочка!/);assert.doesNotMatch(papa.get('#main').innerHTML,/Посмотреть приглашение/);
 t.run("saved={rsvp:saved.rsvp};question=0;detector()");assert.equal(t.run('saved.rsvp'),true);assert.equal(t.run('saved.progress'),'detector');
}
for(const search of ['', '?guest=unknown','?guest=%3Cscript%3E'])assert.match(boot(search).get('#main').innerHTML,/Дорогой мой человек!/);
assert.equal(readFileSync(new URL('../styles.css',import.meta.url),'utf8').includes('prefers-reduced-motion'),true);
assert.equal(source.includes('invitation_preview.png'),false);
console.log('PASS: both answer paths, verdict gates, report, wrong/correct code, deletion, unlock, flip, event copy, RSVP, returning guests, guest isolation, restart state, neutral fallback, reduced-motion rule, reference exclusion.');

const expected = {
  mama: 'Мамочка!', papa: 'Папочка!', tamara: 'Тамара!', zhanna: 'Жанна!',
  tolya: 'Толя!', inna: 'Инна!', katya: 'Катя!', masha: 'Маша!',
  timur: 'Тимур!', egorio: 'Егорио!', danya: 'Даня!', nina: 'Нина!'
};
const sharedStorage = new Map();
for (const [id, greeting] of Object.entries(expected)) {
  assert.equal(guests[id], greeting);
  const visitor = boot(`?guest=${id}`, sharedStorage);
  assert.ok(visitor.get('#main').innerHTML.includes(`<p class="greeting">${greeting}</p>`));
  assert.doesNotMatch(visitor.get('#main').innerHTML, /Посмотреть приглашение/);
  visitor.run('detector()');
  assert.equal(JSON.parse(sharedStorage.get(`op45:guest:${id}`)).progress, 'detector');
  visitor.run('invitation(false)');
  assert.ok(visitor.get('#main').innerHTML.includes(`<p class="card-greeting">${greeting}</p>`));
  const returning = boot(`?guest=${id}`, sharedStorage);
  assert.match(returning.get('#main').innerHTML, /Посмотреть приглашение/);
  assert.ok(returning.get('#main').innerHTML.includes(`<p class="greeting">${greeting}</p>`));
}
assert.equal(sharedStorage.size, 12);
const before = new Map(sharedStorage);
boot('?guest=tamara', sharedStorage).run('detector()');
for (const [key, value] of before) {
  if (key !== 'op45:guest:tamara') assert.equal(sharedStorage.get(key), value);
}
for (const query of ['', '?guest=unknown']) {
  const visitor = boot(query, sharedStorage);
  assert.ok(visitor.get('#main').innerHTML.includes(defaultGreeting));
  visitor.run('invitation(false)');
  assert.ok(visitor.get('#main').innerHTML.includes(`<p class="card-greeting">${defaultGreeting}</p>`));
}
console.log('PASS: all 10 added guests plus mama/papa match the actual configuration in both scenes; URL selection, isolated progress keys, returning visits, independent updates, and neutral fallback verified with mocked DOM/localStorage.');

const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(shell, /<title>СЕКРЕТНАЯ ОПЕРАЦИЯ/);
assert.match(shell, />СЕКРЕТНАЯ ОПЕРАЦИЯ<\/a>/);
assert.doesNotMatch(shell, /45|045/);
const puzzle = boot('?guest=nina');
const noSpoiler = () => assert.doesNotMatch(puzzle.get('#main').innerHTML, />[^<]*45[^<]*</);
noSpoiler();
for (let i = 0; i < 3; i++) { puzzle.run(`question=${i};detector()`); noSpoiler(); puzzle.run('answer(0)'); }
puzzle.run('report()'); noSpoiler();
puzzle.run('safe()'); noSpoiler();
assert.match(puzzle.get('#main').innerHTML, /СЕКРЕТНЫЙ КОД СОСТОИТ ИЗ ДВУХ ЦИФР/);
assert.match(puzzle.get('#main').innerHTML, /Первая цифра: сколько времён года в году\?/);
assert.match(puzzle.get('#main').innerHTML, /id="second-riddle" hidden>Вторая цифра: сколько пальцев на одной руке\?/);
puzzle.run('keypad("9")');
assert.equal(puzzle.get('#second-riddle').hidden, false);
assert.equal(puzzle.run('locked'), false);
puzzle.run('keypad("delete")');
assert.equal(puzzle.run('code'), '');
assert.equal(puzzle.get('#second-riddle').hidden, true);
puzzle.run('keypad("9");keypad("8");keypad("enter")');
assert.equal(puzzle.run('code'), '');
assert.equal(puzzle.run('locked'), false);
assert.equal(puzzle.get('#second-riddle').hidden, true);
assert.doesNotMatch(puzzle.get('.safe-status').textContent, /45|4.*5/);
puzzle.run('keypad("4");keypad("9");keypad("delete");keypad("5")');
assert.equal(puzzle.run('code'), '45');
assert.equal(puzzle.get('#second-riddle').hidden, false);
puzzle.run('keypad("enter")');
assert.equal(puzzle.run('stage'), 'invitation');
assert.equal(puzzle.get('.safe-art').classList.contains('unlocked'), true);
assert.match(puzzle.get('#main').innerHTML, /Мне скоро <strong>45!/);
puzzle.run('keypad("9")');
assert.equal(puzzle.run('code'), '45');
console.log('PASS: spoiler-free shell and pre-unlock text, initial/second riddles, wrong first digit, deletion, failed attempt reset, second-digit correction, correct unlock, preserved reveal class, and input lock.');
