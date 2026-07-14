const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE = {lang:'dtt_lang',theme:'dtt_theme',profiles:'dtt_profiles_v31',active:'dtt_active_profile_v31'};
let questions=[], session=[], index=0, mode='all', selected=null, examAnswers=[];
let lang=localStorage.getItem(STORAGE.lang)||'ua';
let profiles=loadProfiles();
let activeProfileId=localStorage.getItem(STORAGE.active)||Object.keys(profiles)[0];

const translations={
 ua:{questions:'питань',language:'Мова',theme:'Тема',random20:'20 випадкових',morePractice:'Більше практики',officialExam:'40 — пробний іспит',allQuestions:'Усі питання',mistakes:'Лише помилки',favorites:'Лише закладки',searchNumber:'Пошук за номером',openQuestion:'Відкрити конкретне питання',open:'Відкрити',back:'Назад',bookmark:'Закладка',next:'Далі',settings:'Налаштування',resetProgress:'Скинути прогрес',home:'На головну',profile:'Профіль',createProfile:'+ Створити',progressSaved:'Прогрес зберігається окремо',continueLast:'Продовжити з останнього питання',statistics:'Статистика',completed:'Пройдено',correctAnswers:'Правильних',errors:'Помилок',successRate:'Успішність',exams:'Іспити',examsTaken:'Складено іспитів',averageResult:'Середній результат',bestResult:'Найкращий результат'},
 en:{questions:'questions',language:'Language',theme:'Theme',random20:'20 random questions',morePractice:'More practice',officialExam:'40 — official exam',allQuestions:'All questions',mistakes:'Mistakes only',favorites:'Bookmarks only',searchNumber:'Search by number',openQuestion:'Open a specific question',open:'Open',back:'Back',bookmark:'Bookmark',next:'Next',settings:'Settings',resetProgress:'Reset progress',home:'Back to home',profile:'Profile',createProfile:'+ Create',progressSaved:'Progress is saved separately',continueLast:'Continue from last question',statistics:'Statistics',completed:'Completed',correctAnswers:'Correct',errors:'Mistakes',successRate:'Success rate',exams:'Exams',examsTaken:'Exams taken',averageResult:'Average result',bestResult:'Best result'},
 ru:{questions:'вопросов',language:'Язык',theme:'Тема',random20:'20 случайных',morePractice:'Больше практики',officialExam:'40 — пробный экзамен',allQuestions:'Все вопросы',mistakes:'Только ошибки',favorites:'Только закладки',searchNumber:'Поиск по номеру',openQuestion:'Открыть конкретный вопрос',open:'Открыть',back:'Назад',bookmark:'Закладка',next:'Далее',settings:'Настройки',resetProgress:'Сбросить прогресс',home:'На главную',profile:'Профиль',createProfile:'+ Создать',progressSaved:'Прогресс сохраняется отдельно',continueLast:'Продолжить с последнего вопроса',statistics:'Статистика',completed:'Пройдено',correctAnswers:'Правильных',errors:'Ошибок',successRate:'Успешность',exams:'Экзамены',examsTaken:'Сдано экзаменов',averageResult:'Средний результат',bestResult:'Лучший результат'}
};
function defaultProfile(name='Мій профіль'){return {name,favorites:[],mistakes:[],answered:[],correct:[],last:0,examScores:[]}}
function loadProfiles(){
 try{const saved=JSON.parse(localStorage.getItem(STORAGE.profiles)||'null');if(saved&&Object.keys(saved).length)return saved}catch{}
 const legacy={favorites:JSON.parse(localStorage.getItem('dtt_favorites')||'[]'),mistakes:JSON.parse(localStorage.getItem('dtt_mistakes')||'[]'),answered:JSON.parse(localStorage.getItem('dtt_answered')||'[]'),last:Number(localStorage.getItem('dtt_last')||0)};
 const p=defaultProfile();Object.assign(p,legacy);return {default:p};
}
function profile(){return profiles[activeProfileId]}
function saveProfiles(){localStorage.setItem(STORAGE.profiles,JSON.stringify(profiles));localStorage.setItem(STORAGE.active,activeProfileId)}
function sets(){const p=profile();return {favorites:new Set(p.favorites),mistakes:new Set(p.mistakes),answered:new Set(p.answered),correct:new Set(p.correct)}}
function saveSets(s){const p=profile();p.favorites=[...s.favorites];p.mistakes=[...s.mistakes];p.answered=[...s.answered];p.correct=[...s.correct];saveProfiles();updateHome()}
function baseLang(){return lang.startsWith('en')?'en':lang.startsWith('ru')?'ru':'ua'}
function t(k){return translations[baseLang()][k]||k}
function applyI18n(){$$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));document.documentElement.lang=baseLang();updateHome()}
function setLang(v){lang=v;localStorage.setItem(STORAGE.lang,v);$('#languageSelect').value=v;$('#drawerLanguage').value=v;applyI18n();if(!$('#quizView').classList.contains('hidden'))render()}
function toggleTheme(){document.documentElement.classList.toggle('dark');localStorage.setItem(STORAGE.theme,document.documentElement.classList.contains('dark')?'dark':'light')}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function getText(obj){if(lang==='en')return[{text:obj.en,flag:''}];if(lang==='ua')return[{text:obj.ua,flag:''}];if(lang==='ru')return[{text:obj.ru,flag:''}];if(lang==='en-ua')return[{text:obj.en,flag:''},{text:obj.ua,flag:'🇺🇦'}];return[{text:obj.en,flag:''},{text:obj.ru,flag:'🇷🇺'}]}
function populateProfiles(){
 const html=Object.entries(profiles).map(([id,p])=>`<option value="${escapeHtml(id)}">${escapeHtml(p.name)}</option>`).join('');
 $('#profileSelect').innerHTML=html;$('#drawerProfile').innerHTML=html;$('#profileSelect').value=activeProfileId;$('#drawerProfile').value=activeProfileId;
}
function updateHome(){
 if(!questions.length)return;const p=profile(),s=sets();
 $('#totalCount').textContent=questions.length;$('#favoritesCount').textContent=s.favorites.size;$('#mistakesCount').textContent=s.mistakes.size;$('#allProgress').textContent=`${s.answered.size} / ${questions.length}`;
 $('#statAnswered').textContent=s.answered.size;$('#statCorrect').textContent=s.correct.size;$('#statMistakes').textContent=s.mistakes.size;$('#statSuccess').textContent=s.answered.size?`${Math.round((s.correct.size/s.answered.size)*100)}%`:'0%';
 const scores=p.examScores||[];$('#examCount').textContent=scores.length;$('#examAverage').textContent=scores.length?`${(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)}/40`:'—';$('#examBest').textContent=scores.length?`${Math.max(...scores)}/40`:'—';
 const hasLast=Number.isInteger(p.last)&&p.last>0;$('#resumeCard').classList.toggle('hidden',!hasLast);if(hasLast){const n=Math.min(p.last+1,questions.length);$('#resumeText').textContent=`${baseLang()==='en'?'Question':baseLang()==='ru'?'Вопрос':'Питання'} ${n} / ${questions.length}`;$('#resumeBar').style.width=`${(n/questions.length)*100}%`}
}
function start(type,specificId){
 mode=type;selected=null;examAnswers=[];const s=sets();
 if(type==='random20')session=shuffle(questions).slice(0,20);else if(type==='exam')session=shuffle(questions).slice(0,40);else if(type==='favorites')session=questions.filter(q=>s.favorites.has(q.id));else if(type==='mistakes')session=questions.filter(q=>s.mistakes.has(q.id));else session=questions;
 if(specificId){const pos=session.findIndex(q=>q.id===specificId);index=pos>=0?pos:0}else if(type==='all'){index=Math.min(profile().last||0,Math.max(session.length-1,0))}else index=0;
 if(!session.length){alert(baseLang()==='ru'?'Список пуст.':baseLang()==='en'?'This list is empty.':'Список порожній.');return}
 $('#homeView').classList.add('hidden');$('#quizView').classList.remove('hidden');render();window.scrollTo({top:0,behavior:'instant'});
}
function render(){
 const q=session[index];if(!q)return;const qparts=getText(q.question);$('#questionText').innerHTML=qparts.map((p,i)=>`<div class="${i?'question-secondary':'question-primary'}">${p.flag?`<span class="language-flag">${p.flag}</span>`:''}${escapeHtml(p.text||'')}</div>`).join('');
 if(q.image){$('#imageWrap').classList.remove('hidden');$('#questionImage').src=q.image;$('#questionImage').onerror=()=>$('#imageWrap').classList.add('hidden')}else $('#imageWrap').classList.add('hidden');
 const letters='ABCD';$('#answers').innerHTML=q.options.map((opt,i)=>{const parts=getText(opt);return `<button class="answer ${selected===i?'selected':''}" data-i="${i}"><span class="answer-letter">${letters[i]}</span><span>${parts.map((p,j)=>`<div class="${j?'answer-secondary':'answer-primary'}">${p.flag?`<span class="language-flag">${p.flag}</span>`:''}${escapeHtml(p.text||'')}</div>`).join('')}</span></button>`}).join('');
 $$('.answer').forEach(b=>b.onclick=()=>choose(Number(b.dataset.i)));$('#progressText').textContent=`${index+1} / ${session.length}`;$('#progressBar').style.width=`${((index+1)/session.length)*100}%`;
 $('#prevBtn').disabled=index===0||mode==='exam';$('#nextBtn').disabled=mode==='exam'&&selected===null;const s=sets();$('#favoriteBtn').classList.toggle('active',s.favorites.has(q.id));$('#favoriteBtn').querySelector('span').textContent=s.favorites.has(q.id)?'★':'♡';
 if(mode==='all'){profile().last=index;saveProfiles()}requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
}
function choose(i){selected=i;const q=session[index],s=sets();s.answered.add(q.id);if(mode==='exam'){examAnswers[index]=i;saveSets(s);render();return}const ok=i===q.correctIndex;if(ok){s.mistakes.delete(q.id);s.correct.add(q.id)}else{s.mistakes.add(q.id);s.correct.delete(q.id)}saveSets(s);render();setTimeout(()=>$$('.answer').forEach((b,n)=>{if(n===q.correctIndex)b.classList.add('correct');if(n===i&&!ok)b.classList.add('wrong')}),0)}
function next(){if(index<session.length-1){index++;selected=mode==='exam'?(examAnswers[index]??null):null;render()}else finish()}
function prev(){if(index>0&&mode!=='exam'){index--;selected=null;render()}}
function finish(){if(mode==='exam'){const score=session.reduce((sum,q,i)=>sum+(examAnswers[i]===q.correctIndex?1:0),0),s=sets();session.forEach((q,i)=>{s.answered.add(q.id);if(examAnswers[i]===q.correctIndex){s.correct.add(q.id);s.mistakes.delete(q.id)}else{s.correct.delete(q.id);s.mistakes.add(q.id)}});profile().examScores=profile().examScores||[];profile().examScores.push(score);saveSets(s);alert(`${baseLang()==='en'?'Result':baseLang()==='ru'?'Результат':'Результат'}: ${score}/40\n${score>=35?'PASS ✅':'FAIL ❌'}`)}showHome()}
function showHome(){$('#quizView').classList.add('hidden');$('#homeView').classList.remove('hidden');closeDrawer();window.scrollTo({top:0,behavior:'smooth'});updateHome()}
function switchProfile(id){activeProfileId=id;saveProfiles();populateProfiles();updateHome();if(!$('#quizView').classList.contains('hidden'))showHome()}
function createProfile(){const name=prompt(baseLang()==='en'?'Profile name':baseLang()==='ru'?'Имя профиля':'Назва профілю');if(!name||!name.trim())return;const id=`p_${Date.now()}`;profiles[id]=defaultProfile(name.trim());activeProfileId=id;saveProfiles();populateProfiles();updateHome()}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function openDrawer(){$('#settingsDrawer').classList.add('open');$('#settingsDrawer').setAttribute('aria-hidden','false');$('#drawerBackdrop').classList.remove('hidden')}
function closeDrawer(){$('#settingsDrawer').classList.remove('open');$('#settingsDrawer').setAttribute('aria-hidden','true');$('#drawerBackdrop').classList.add('hidden')}
async function init(){
 if(localStorage.getItem(STORAGE.theme)==='dark')document.documentElement.classList.add('dark');const res=await fetch('questions.json',{cache:'no-store'});questions=await res.json();if(!profiles[activeProfileId])activeProfileId=Object.keys(profiles)[0];
 const opts=$('#languageSelect').innerHTML;$('#drawerLanguage').innerHTML=opts;populateProfiles();setLang(lang);updateHome();
 $$('.mode-card[data-mode]').forEach(b=>b.onclick=()=>start(b.dataset.mode));$('#searchModeBtn').onclick=()=>{$('#searchPanel').classList.toggle('hidden');$('#searchInput').focus()};$('#searchBtn').onclick=()=>{const n=Number($('#searchInput').value);if(n>=1&&n<=questions.length)start('all',n)};$('#resumeBtn').onclick=()=>start('all');
 $('#themeBtn').onclick=toggleTheme;$('#drawerTheme').onclick=toggleTheme;$('#languageSelect').onchange=e=>setLang(e.target.value);$('#drawerLanguage').onchange=e=>setLang(e.target.value);$('#profileSelect').onchange=e=>switchProfile(e.target.value);$('#drawerProfile').onchange=e=>switchProfile(e.target.value);$('#createProfileBtn').onclick=createProfile;
 $('#homeBtn').onclick=showHome;$('#drawerHome').onclick=showHome;$('#settingsBtn').onclick=openDrawer;$('#closeDrawer').onclick=closeDrawer;$('#drawerBackdrop').onclick=closeDrawer;$('#prevBtn').onclick=prev;$('#nextBtn').onclick=next;
 $('#favoriteBtn').onclick=()=>{const s=sets(),id=session[index].id;s.favorites.has(id)?s.favorites.delete(id):s.favorites.add(id);saveSets(s);render()};
 $('#resetProgress').onclick=()=>{if(confirm(t('resetProgress')+'?')){const name=profile().name;profiles[activeProfileId]=defaultProfile(name);saveProfiles();updateHome();showHome()}};
 $('#zoomBtn').onclick=()=>{$('#modalImage').src=$('#questionImage').src;$('#imageModal').classList.remove('hidden')};$('#closeImage').onclick=()=>$('#imageModal').classList.add('hidden');$('#imageModal').onclick=e=>{if(e.target===$('#imageModal'))$('#imageModal').classList.add('hidden')};document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();$('#imageModal').classList.add('hidden')}})
}
init().catch(err=>{console.error(err);alert('Could not load questions.json')});
