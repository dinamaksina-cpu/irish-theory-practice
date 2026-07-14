const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE = {lang:'dtt_lang',theme:'dtt_theme',favorites:'dtt_favorites',mistakes:'dtt_mistakes',answered:'dtt_answered',last:'dtt_last'};
let questions=[], session=[], index=0, mode='all', selected=null, examAnswers=[], examStart=0;
let favorites=new Set(JSON.parse(localStorage.getItem(STORAGE.favorites)||'[]'));
let mistakes=new Set(JSON.parse(localStorage.getItem(STORAGE.mistakes)||'[]'));
let answered=new Set(JSON.parse(localStorage.getItem(STORAGE.answered)||'[]'));
let lang=localStorage.getItem(STORAGE.lang)||'ua';

const translations={
 ua:{questions:'питань',language:'Мова',theme:'Тема',random10:'10 випадкових',random20:'20 випадкових',quickPractice:'Швидке тренування',morePractice:'Більше практики',officialExam:'40 — пробний іспит',allQuestions:'Усі питання',mistakes:'Лише помилки',favorites:'Лише закладки',searchNumber:'Пошук за номером',open:'Відкрити',back:'Назад',bookmark:'Закладка',next:'Далі',settings:'Налаштування',resetProgress:'Скинути прогрес',home:'На головну'},
 en:{questions:'questions',language:'Language',theme:'Theme',random10:'10 random questions',random20:'20 random questions',quickPractice:'Quick practice',morePractice:'More practice',officialExam:'40 — official exam',allQuestions:'All questions',mistakes:'Mistakes only',favorites:'Bookmarks only',searchNumber:'Search by question number',open:'Open',back:'Back',bookmark:'Bookmark',next:'Next',settings:'Settings',resetProgress:'Reset progress',home:'Back to home'},
 ru:{questions:'вопросов',language:'Язык',theme:'Тема',random10:'10 случайных',random20:'20 случайных',quickPractice:'Быстрая практика',morePractice:'Больше практики',officialExam:'40 — пробный экзамен',allQuestions:'Все вопросы',mistakes:'Только ошибки',favorites:'Только закладки',searchNumber:'Поиск по номеру',open:'Открыть',back:'Назад',bookmark:'Закладка',next:'Далее',settings:'Настройки',resetProgress:'Сбросить прогресс',home:'На главную'}
};
function baseLang(){return lang.startsWith('en')?'en':lang.startsWith('ru')?'ru':'ua'}
function t(k){return translations[baseLang()][k]||k}
function applyI18n(){ $$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n)); document.documentElement.lang=baseLang(); updateCounts(); }
function setLang(v){lang=v;localStorage.setItem(STORAGE.lang,v);$('#languageSelect').value=v;$('#drawerLanguage').value=v;applyI18n();if(!$('#quizView').classList.contains('hidden'))render()}
function toggleTheme(){document.documentElement.classList.toggle('dark');localStorage.setItem(STORAGE.theme,document.documentElement.classList.contains('dark')?'dark':'light')}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function getText(obj){
 if(lang==='en') return [{text:obj.en,flag:''}];
 if(lang==='ua') return [{text:obj.ua,flag:''}];
 if(lang==='ru') return [{text:obj.ru,flag:''}];
 if(lang==='en-ua') return [{text:obj.en,flag:''},{text:obj.ua,flag:'🇺🇦'}];
 return [{text:obj.en,flag:''},{text:obj.ru,flag:'🇷🇺'}];
}
function updateCounts(){
 $('#totalCount').textContent=questions.length||801;
 $('#favoritesCount').textContent=favorites.size;
 $('#mistakesCount').textContent=mistakes.size;
 $('#allProgress').textContent=`${answered.size} / ${questions.length||801}`;
}
function saveSets(){localStorage.setItem(STORAGE.favorites,JSON.stringify([...favorites]));localStorage.setItem(STORAGE.mistakes,JSON.stringify([...mistakes]));localStorage.setItem(STORAGE.answered,JSON.stringify([...answered]));updateCounts()}
function start(type, specificId){
 mode=type; selected=null; examAnswers=[]; examStart=Date.now();
 if(type==='random10') session=shuffle(questions).slice(0,10);
 else if(type==='random20') session=shuffle(questions).slice(0,20);
 else if(type==='exam') session=shuffle(questions).slice(0,40);
 else if(type==='favorites') session=questions.filter(q=>favorites.has(q.id));
 else if(type==='mistakes') session=questions.filter(q=>mistakes.has(q.id));
 else session=questions;
 if(specificId){const pos=session.findIndex(q=>q.id===specificId);index=pos>=0?pos:0}else if(type==='all'){index=Math.min(Number(localStorage.getItem(STORAGE.last)||0),Math.max(session.length-1,0))}else index=0;
 if(!session.length){alert(baseLang()==='ru'?'Список пуст.':baseLang()==='en'?'This list is empty.':'Список порожній.');return}
 $('#homeView').classList.add('hidden');$('#quizView').classList.remove('hidden');render();window.scrollTo({top:0,behavior:'instant'});
}
function render(){
 const q=session[index]; if(!q)return;
 const qparts=getText(q.question);$('#questionText').innerHTML=qparts.map((p,i)=>`<div class="${i?'question-secondary':'question-primary'}">${p.flag?`<span class="language-flag">${p.flag}</span>`:''}${escapeHtml(p.text||'')}</div>`).join('');
 if(q.image){$('#imageWrap').classList.remove('hidden');$('#questionImage').src=q.image;$('#questionImage').onerror=()=>$('#imageWrap').classList.add('hidden')}else $('#imageWrap').classList.add('hidden');
 const letters='ABCD';$('#answers').innerHTML=q.options.map((opt,i)=>{const parts=getText(opt);return `<button class="answer ${selected===i?'selected':''}" data-i="${i}"><span class="answer-letter">${letters[i]}</span><span>${parts.map((p,j)=>`<div class="${j?'answer-secondary':'answer-primary'}">${p.flag?`<span class="language-flag">${p.flag}</span>`:''}${escapeHtml(p.text||'')}</div>`).join('')}</span></button>`}).join('');
 $$('.answer').forEach(b=>b.onclick=()=>choose(Number(b.dataset.i)));
 $('#progressText').textContent=`${index+1} / ${session.length}`;$('#progressBar').style.width=`${((index+1)/session.length)*100}%`;
 $('#prevBtn').disabled=index===0||mode==='exam';$('#nextBtn').disabled=mode==='exam'&&selected===null;
 $('#favoriteBtn').classList.toggle('active',favorites.has(q.id));$('#favoriteBtn').querySelector('span').textContent=favorites.has(q.id)?'★':'♡';
 localStorage.setItem(STORAGE.last,String(index));
 requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
}
function choose(i){
 selected=i; const q=session[index]; answered.add(q.id);
 if(mode==='exam'){examAnswers[index]=i;render();saveSets();return}
 const correct=i===q.correctIndex; if(correct)mistakes.delete(q.id);else mistakes.add(q.id);saveSets();render();
 setTimeout(()=>{$$('.answer').forEach((b,n)=>{if(n===q.correctIndex)b.classList.add('correct');if(n===i&&!correct)b.classList.add('wrong')})},0)
}
function next(){if(index<session.length-1){index++;selected=mode==='exam'?(examAnswers[index]??null):null;render()}else finish()}
function prev(){if(index>0&&mode!=='exam'){index--;selected=null;render()}}
function finish(){
 if(mode==='exam'){
  const score=session.reduce((s,q,i)=>s+(examAnswers[i]===q.correctIndex?1:0),0);
  session.forEach((q,i)=>{answered.add(q.id);if(examAnswers[i]!==q.correctIndex)mistakes.add(q.id);else mistakes.delete(q.id)});saveSets();
  const msg=baseLang()==='ru'?`Результат: ${score}/40\n${score>=35?'PASS ✅':'FAIL ❌'}`:baseLang()==='en'?`Result: ${score}/40\n${score>=35?'PASS ✅':'FAIL ❌'}`:`Результат: ${score}/40\n${score>=35?'PASS ✅':'FAIL ❌'}`;alert(msg)
 }
 showHome();
}
function showHome(){$('#quizView').classList.add('hidden');$('#homeView').classList.remove('hidden');closeDrawer();window.scrollTo({top:0,behavior:'smooth'});updateCounts()}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function openDrawer(){$('#settingsDrawer').classList.add('open');$('#settingsDrawer').setAttribute('aria-hidden','false');$('#drawerBackdrop').classList.remove('hidden')}
function closeDrawer(){$('#settingsDrawer').classList.remove('open');$('#settingsDrawer').setAttribute('aria-hidden','true');$('#drawerBackdrop').classList.add('hidden')}
async function init(){
 if(localStorage.getItem(STORAGE.theme)==='dark')document.documentElement.classList.add('dark');
 const res=await fetch('questions.json',{cache:'no-store'});questions=await res.json();
 const opts=$('#languageSelect').innerHTML;$('#drawerLanguage').innerHTML=opts;setLang(lang);updateCounts();
 $$('.mode-card').forEach(b=>b.onclick=()=>start(b.dataset.mode));
 $('#searchBtn').onclick=()=>{const n=Number($('#searchInput').value);if(n>=1&&n<=questions.length)start('all',n)};
 $('#themeBtn').onclick=toggleTheme;$('#drawerTheme').onclick=toggleTheme;
 $('#languageSelect').onchange=e=>setLang(e.target.value);$('#drawerLanguage').onchange=e=>setLang(e.target.value);
 $('#homeBtn').onclick=showHome;$('#drawerHome').onclick=showHome;$('#settingsBtn').onclick=openDrawer;$('#closeDrawer').onclick=closeDrawer;$('#drawerBackdrop').onclick=closeDrawer;
 $('#prevBtn').onclick=prev;$('#nextBtn').onclick=next;$('#favoriteBtn').onclick=()=>{const id=session[index].id;favorites.has(id)?favorites.delete(id):favorites.add(id);saveSets();render()};
 $('#resetProgress').onclick=()=>{if(confirm(t('resetProgress')+'?')){favorites.clear();mistakes.clear();answered.clear();localStorage.removeItem(STORAGE.last);saveSets();showHome()}};
 $('#zoomBtn').onclick=()=>{$('#modalImage').src=$('#questionImage').src;$('#imageModal').classList.remove('hidden')};$('#closeImage').onclick=()=>$('#imageModal').classList.add('hidden');$('#imageModal').onclick=e=>{if(e.target===$('#imageModal'))$('#imageModal').classList.add('hidden')};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();$('#imageModal').classList.add('hidden')}})
}
init().catch(err=>{console.error(err);alert('Could not load questions.json')});
