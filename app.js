const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE = {lang:'dtt_lang',theme:'dtt_theme',profiles:'dtt_profiles_v31',active:'dtt_active_profile_v31',cloudUpdated:'dtt_cloud_updated_v1'};
let questions=[], session=[], index=0, mode='all', selected=null, checkedAnswer=null, examAnswers=[];
let examSeconds=45*60, examStartedAt=0, examTimerId=null;
let lang=localStorage.getItem(STORAGE.lang)||'ua';
let profiles=loadProfiles();
let activeProfileId=localStorage.getItem(STORAGE.active)||Object.keys(profiles)[0];
let telegramUser=null, cloudSyncReady=false, cloudSyncTimer=null, cloudSyncInProgress=false;
let isPremium=false, demoExamAttempts=0;
const FREE_QUESTION_LIMIT=60, FREE_EXAM_LIMIT=3;

const translations={
 ua:{questions:'питань',language:'Мова',theme:'Тема',random20:'20 випадкових',morePractice:'Більше практики',officialExam:'40 — пробний іспит',allQuestions:'Усі питання',mistakes:'Лише помилки',favorites:'Лише закладки',searchNumber:'Пошук за номером',openQuestion:'Відкрити конкретне питання',open:'Відкрити',back:'Назад',bookmark:'Закладка',next:'Далі',settings:'Налаштування',resetProgress:'Скинути прогрес',home:'На головну',profile:'Профіль',createProfile:'+ Створити',progressSaved:'Прогрес зберігається окремо',continueLast:'Продовжити з останнього питання',statistics:'Статистика',completed:'Пройдено',correctAnswers:'Правильних',errors:'Помилок',successRate:'Успішність',exams:'Іспити',examsTaken:'Складено іспитів',averageResult:'Середній результат',bestResult:'Найкращий результат',correct:'Вірно',incorrect:'Невірно',startFirst:'З першого питання',startLast:'Продовжити з останнього',whereStart:'Звідки почати?',cancel:'Скасувати',examResult:'Результат іспиту',mistakeQuestions:'Питання з помилками',yourAnswer:'Ваша відповідь',rightAnswer:'Правильна відповідь',time:'Час',result:'Результат',telegramLogin:'Увійти через Telegram',telegramConnected:'Telegram підключено',logout:'Вийти',telegramSigningIn:'Відкриваємо Telegram…',telegramError:'Не вдалося увійти через Telegram',cloudSyncing:'Зберігаємо прогрес…',cloudSynced:'Прогрес синхронізовано',cloudLoaded:'Хмарний прогрес завантажено',cloudError:'Не вдалося синхронізувати прогрес',freePlan:'Безкоштовний',premiumPlan:'Premium',upgrade:'Отримати Premium',lockedPremium:'Доступно у Premium',freeQuestions:'801 питання · перші 60 безкоштовно',demoExamsLeft:'Демо-іспитів залишилось',demoLimitReached:'Ви використали 3 безкоштовні демо-іспити',loginForExam:'Увійдіть через Telegram, щоб використати демо-іспити',premiumSoon:'Оплата Premium буде підключена найближчим часом. Для тестування доступ можна видати вручну.'},
 en:{questions:'questions',language:'Language',theme:'Theme',random20:'20 random questions',morePractice:'More practice',officialExam:'40 — official exam',allQuestions:'All questions',mistakes:'Mistakes only',favorites:'Bookmarks only',searchNumber:'Search by number',openQuestion:'Open a specific question',open:'Open',back:'Back',bookmark:'Bookmark',next:'Next',settings:'Settings',resetProgress:'Reset progress',home:'Back to home',profile:'Profile',createProfile:'+ Create',progressSaved:'Progress is saved separately',continueLast:'Continue from last question',statistics:'Statistics',completed:'Completed',correctAnswers:'Correct',errors:'Mistakes',successRate:'Success rate',exams:'Exams',examsTaken:'Exams taken',averageResult:'Average result',bestResult:'Best result',correct:'Correct',incorrect:'Incorrect',startFirst:'Start from question 1',startLast:'Continue from the last question',whereStart:'Where would you like to start?',cancel:'Cancel',examResult:'Exam result',mistakeQuestions:'Questions answered incorrectly',yourAnswer:'Your answer',rightAnswer:'Correct answer',time:'Time',result:'Result',telegramLogin:'Continue with Telegram',telegramConnected:'Telegram connected',logout:'Log out',telegramSigningIn:'Opening Telegram…',telegramError:'Could not sign in with Telegram',cloudSyncing:'Saving progress…',cloudSynced:'Progress synced',cloudLoaded:'Cloud progress loaded',cloudError:'Could not sync progress',freePlan:'Free',premiumPlan:'Premium',upgrade:'Get Premium',lockedPremium:'Available with Premium',freeQuestions:'801 questions · first 60 free',demoExamsLeft:'Demo exams remaining',demoLimitReached:'You have used all 3 free demo exams',loginForExam:'Sign in with Telegram to use demo exams',premiumSoon:'Premium payments will be connected soon. Test access can be granted manually.'},
 ru:{questions:'вопросов',language:'Язык',theme:'Тема',random20:'20 случайных',morePractice:'Больше практики',officialExam:'40 — пробный экзамен',allQuestions:'Все вопросы',mistakes:'Только ошибки',favorites:'Только закладки',searchNumber:'Поиск по номеру',openQuestion:'Открыть конкретный вопрос',open:'Открыть',back:'Назад',bookmark:'Закладка',next:'Далее',settings:'Настройки',resetProgress:'Сбросить прогресс',home:'На главную',profile:'Профиль',createProfile:'+ Создать',progressSaved:'Прогресс сохраняется отдельно',continueLast:'Продолжить с последнего вопроса',statistics:'Статистика',completed:'Пройдено',correctAnswers:'Правильных',errors:'Ошибок',successRate:'Успешность',exams:'Экзамены',examsTaken:'Сдано экзаменов',averageResult:'Средний результат',bestResult:'Лучший результат',correct:'Верно',incorrect:'Неверно',startFirst:'С первого вопроса',startLast:'Продолжить с последнего',whereStart:'С какого вопроса начать?',cancel:'Отмена',examResult:'Результат экзамена',mistakeQuestions:'Вопросы с ошибками',yourAnswer:'Ваш ответ',rightAnswer:'Правильный ответ',time:'Время',result:'Результат',telegramLogin:'Войти через Telegram',telegramConnected:'Telegram подключён',logout:'Выйти',telegramSigningIn:'Открываем Telegram…',telegramError:'Не удалось войти через Telegram',cloudSyncing:'Сохраняем прогресс…',cloudSynced:'Прогресс синхронизирован',cloudLoaded:'Облачный прогресс загружен',cloudError:'Не удалось синхронизировать прогресс',freePlan:'Бесплатный',premiumPlan:'Premium',upgrade:'Получить Premium',lockedPremium:'Доступно в Premium',freeQuestions:'801 вопрос · первые 60 бесплатно',demoExamsLeft:'Осталось демо-экзаменов',demoLimitReached:'Вы использовали 3 бесплатных демо-экзамена',loginForExam:'Войдите через Telegram, чтобы использовать демо-экзамены',premiumSoon:'Оплата Premium будет подключена в ближайшее время. Для тестирования доступ можно выдать вручную.'}
};
function defaultProfile(name='Мій профіль'){return {name,favorites:[],mistakes:[],answered:[],correct:[],last:0,examScores:[]}}
function accessibleQuestions(){return isPremium?questions:questions.slice(0,FREE_QUESTION_LIMIT)}
function premiumOnlyMode(type){return ['mistakes','favorites'].includes(type)}
function showPremiumModal(reason='locked'){const title=$('#premiumModalTitle'),text=$('#premiumModalText');title.textContent=isPremium?t('premiumPlan'):t('upgrade');text.textContent=reason==='exam-limit'?t('demoLimitReached'):reason==='login'?t('loginForExam'):t('lockedPremium');$('#premiumModal').classList.remove('hidden')}
function closePremiumModal(){$('#premiumModal').classList.add('hidden')}
function updatePlanUI(){const badge=$('#planBadge');if(badge){badge.textContent=isPremium?t('premiumPlan'):t('freePlan');badge.classList.toggle('premium',isPremium)}const left=Math.max(0,FREE_EXAM_LIMIT-demoExamAttempts);const examHint=$('#examAccessHint');if(examHint)examHint.textContent=isPremium?(baseLang()==='en'?'Unlimited exams':baseLang()==='ru'?'Неограниченные экзамены':'Необмежені іспити'):`${t('demoExamsLeft')}: ${left}`;$$('[data-premium-only]').forEach(el=>el.classList.toggle('premium-locked',!isPremium));$$('[data-premium-section]').forEach(el=>{el.classList.toggle('premium-section-locked',!isPremium);let msg=el.querySelector('.premium-section-message');if(!isPremium){if(!msg){msg=document.createElement('button');msg.type='button';msg.className='premium-section-message';msg.innerHTML='<span class="premium-section-icon">★</span><span><b></b><small></small></span><i>→</i>';msg.addEventListener('click',e=>{e.stopPropagation();showPremiumModal()});el.appendChild(msg)}const b=msg.querySelector('b'),sm=msg.querySelector('small');if(baseLang()==='ru'){b.textContent='Подробная статистика — Premium';sm.textContent='Правильные ответы, ошибки, закладки и история экзаменов'}else if(baseLang()==='en'){b.textContent='Detailed statistics — Premium';sm.textContent='Correct answers, mistakes, bookmarks and exam history'}else{b.textContent='Детальна статистика — Premium';sm.textContent='Правильні відповіді, помилки, закладки та історія іспитів'}}else if(msg){msg.remove()}});const allLabel=$('#allAccessHint');if(allLabel)allLabel.textContent=isPremium?`${questions.length} ${t('questions')}`:t('freeQuestions');}
function loadProfiles(){try{const saved=JSON.parse(localStorage.getItem(STORAGE.profiles)||'null');if(saved&&Object.keys(saved).length)return saved}catch{}const legacy={favorites:JSON.parse(localStorage.getItem('dtt_favorites')||'[]'),mistakes:JSON.parse(localStorage.getItem('dtt_mistakes')||'[]'),answered:JSON.parse(localStorage.getItem('dtt_answered')||'[]'),last:Number(localStorage.getItem('dtt_last')||0)};const p=defaultProfile();Object.assign(p,legacy);return {default:p}}
function profile(){return profiles[activeProfileId]}
function saveProfiles(options={}){
  localStorage.setItem(STORAGE.profiles,JSON.stringify(profiles));
  localStorage.setItem(STORAGE.active,activeProfileId);
  if(!options.fromCloud){
    localStorage.setItem(STORAGE.cloudUpdated,String(Date.now()));
    queueCloudSync();
  }
}
function markLocalChange(){
  localStorage.setItem(STORAGE.cloudUpdated,String(Date.now()));
  queueCloudSync();
}
function sets(){const p=profile();return {favorites:new Set(p.favorites),mistakes:new Set(p.mistakes),answered:new Set(p.answered),correct:new Set(p.correct)}}
function saveSets(s){const p=profile();p.favorites=[...s.favorites];p.mistakes=[...s.mistakes];p.answered=[...s.answered];p.correct=[...s.correct];saveProfiles();updateHome()}
function baseLang(){return lang.startsWith('en')?'en':lang.startsWith('ru')?'ru':'ua'}
function t(k){return translations[baseLang()][k]||k}
function applyI18n(){$$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));document.documentElement.lang=baseLang();updateHome()}
function setLang(v,options={}){lang=v;localStorage.setItem(STORAGE.lang,v);$('#languageSelect').value=v;$('#drawerLanguage').value=v;applyI18n();if(!options.fromCloud)markLocalChange();if(!$('#quizView').classList.contains('hidden'))render()}
function toggleTheme(){document.documentElement.classList.toggle('dark');localStorage.setItem(STORAGE.theme,document.documentElement.classList.contains('dark')?'dark':'light');markLocalChange()}
function shuffle(a){
  const copy=[...a];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}
function prepareQuestion(question){
  const mixed=shuffle(question.options.map((option,originalIndex)=>({option,originalIndex})));
  return {
    ...question,
    options:mixed.map(item=>item.option),
    correctIndex:mixed.findIndex(item=>item.originalIndex===question.correctIndex)
  };
}
function prepareSession(list){return list.map(prepareQuestion)}
function getText(obj){if(lang==='en')return[{text:obj.en,flag:''}];if(lang==='ua')return[{text:obj.ua,flag:''}];if(lang==='ru')return[{text:obj.ru,flag:''}];if(lang==='en-ua')return[{text:obj.en,flag:''},{text:obj.ua,flag:'ua'}];return[{text:obj.en,flag:''},{text:obj.ru,flag:'ru'}]}
function resultText(obj){if(lang==='en-ua')return[{text:obj.ua,cls:'primary'},{text:obj.en,cls:'secondary'}];if(lang==='en-ru')return[{text:obj.ru,cls:'primary'},{text:obj.en,cls:'secondary'}];return getText(obj).map((x,i)=>({text:x.text,cls:i?'secondary':'primary'}))}
function resultLabel(key){const labels={examResult:{ua:'Результат іспиту',en:'Exam result',ru:'Результат экзамена'},correctAnswers:{ua:'Правильні відповіді',en:'Correct answers',ru:'Правильные ответы'},timeTaken:{ua:'Час проходження',en:'Time taken',ru:'Время прохождения'},errors:{ua:'Помилок',en:'Mistakes',ru:'Ошибок'},mistakes:{ua:'Неправильні відповіді',en:'Incorrect answers',ru:'Неправильные ответы'},tip:{ua:'Порада',en:'Tip',ru:'Совет'},tipText:{ua:'Перегляньте неправильні відповіді та повторіть матеріал перед наступною спробою.',en:'Review the incorrect answers before your next attempt.',ru:'Просмотрите неправильные ответы перед следующей попыткой.'},allQuestions:{ua:'Усі питання',en:'All questions',ru:'Все вопросы'},retry:{ua:'Спробувати знову',en:'Try again',ru:'Попробовать снова'},question:{ua:'Питання',en:'Question',ru:'Вопрос'},passed:{ua:'СКЛАДЕНО',en:'PASSED',ru:'СДАНО'},failed:{ua:'НЕ СКЛАДЕНО',en:'FAILED',ru:'НЕ СДАНО'}};const v=labels[key];if(!v)return key;if(lang==='en-ua')return `${v.ua} / ${v.en}`;if(lang==='en-ru')return `${v.ru} / ${v.en}`;return v[baseLang()]||v.en}
function resultLines(obj){return resultText(obj).filter(x=>x.text).map(x=>`<div class="result-q-${x.cls}">${escapeHtml(x.text)}</div>`).join('')}
function primaryText(obj){return obj?.[baseLang()]||obj?.en||''}
function populateProfiles(){const html=Object.entries(profiles).map(([id,p])=>`<option value="${escapeHtml(id)}">${escapeHtml(p.name)}</option>`).join('');$('#profileSelect').innerHTML=html;$('#drawerProfile').innerHTML=html;$('#profileSelect').value=activeProfileId;$('#drawerProfile').value=activeProfileId}
function updateHome(){if(!questions.length)return;const p=profile(),s=sets();const allowedIds=new Set(accessibleQuestions().map(q=>q.id));const answered=[...s.answered].filter(id=>allowedIds.has(id)).length,correct=[...s.correct].filter(id=>allowedIds.has(id)).length,mistakes=[...s.mistakes].filter(id=>allowedIds.has(id)).length,bookmarks=[...s.favorites].filter(id=>allowedIds.has(id)).length,total=questions.length;updatePlanUI();const success=answered?Math.round((correct/answered)*100):0;const progress=Math.min(100,Math.round((answered/total)*100));$('#welcomeName').textContent=p.name||'Dina';$('#statsProfileName').textContent=p.name||'Dina';$('#totalCount').textContent=total;$('#favoritesCount').textContent=bookmarks;$('#mistakesCount').textContent=mistakes;$('#allProgress').textContent=`${answered} / ${total}`;$('#statAnswered').textContent=answered;$('#statTotal').textContent=total;$('#statCorrect').textContent=correct;$('#statMistakes').textContent=mistakes;$('#statBookmarks').textContent=bookmarks;$('#statSuccess').textContent=`${success}%`;$('#statsProgressBar').style.width=`${progress}%`;$('#successRing').style.setProperty('--success',success);$('#correctShare').textContent=`${answered?Math.round(correct/answered*100):0}%`;$('#mistakeShare').textContent=`${answered?Math.round(mistakes/answered*100):0}%`;$('#statsRemaining').textContent=baseLang()==='en'?`${Math.max(total-answered,0)} questions remaining`:baseLang()==='ru'?`Осталось ${Math.max(total-answered,0)} вопросов`:`Залишилось ${Math.max(total-answered,0)} питань`;$('#bookmarkHint').textContent=baseLang()==='en'?'Saved':baseLang()==='ru'?'Сохранено':'Збережено';const scores=p.examScores||[];const passed=scores.filter(x=>x>=35).length;const average=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0;const best=scores.length?Math.max(...scores):0;const latest=scores.length?scores[scores.length-1]:null;$('#examCount').textContent=scores.length;$('#examAverage').textContent=scores.length?`${average.toFixed(1)}/40`:'—';$('#examBest').textContent=scores.length?`${best}/40`:'—';$('#examPassedText').textContent=baseLang()==='en'?`${passed} passed`:baseLang()==='ru'?`${passed} сдано`:`${passed} складено`;$('#examLatest').textContent=(baseLang()==='en'?'Latest: ':baseLang()==='ru'?'Последний: ':'Останній: ')+(latest===null?'—':`${latest}/40`);const readiness=$('#examReadiness');if(!scores.length){readiness.textContent=baseLang()==='en'?'Take your first exam':baseLang()==='ru'?'Пройдите первый экзамен':'Почніть перший іспит';readiness.className='readiness-badge'}else if(average>=35){readiness.textContent=baseLang()==='en'?'Exam ready':baseLang()==='ru'?'Готовы к экзамену':'Готові до іспиту';readiness.className='readiness-badge ready'}else{readiness.textContent=baseLang()==='en'?'Keep practising':baseLang()==='ru'?'Продолжайте практику':'Продовжуйте практику';readiness.className='readiness-badge almost'}const recent=scores.slice(-7);$('#examHistoryChart').innerHTML=recent.length?recent.map((score,i)=>`<div class="exam-score-bar ${score>=35?'':'fail'}" style="--score-height:${Math.max(10,Math.round(score/40*78))}px"><b>${score}</b><span>${scores.length-recent.length+i+1}</span></div>`).join(''):`<div class="empty-chart">${baseLang()==='en'?'Exam results will appear here':baseLang()==='ru'?'Здесь появятся результаты экзаменов':'Тут з’являться результати іспитів'}</div>`;const hasLast=Number.isInteger(p.last)&&p.last>0;$('#resumeCard').classList.toggle('hidden',!hasLast);if(hasLast){const n=Math.min(p.last+1,total),pct=Math.min(100,Math.round(n/total*100));$('#resumeText').textContent=`${baseLang()==='en'?'Question':baseLang()==='ru'?'Вопрос':'Питання'} ${n} / ${total}`;$('#resumeBar').style.width=`${pct}%`;$('#resumePercent').textContent=`${pct}%`;document.querySelector('.resume-ring').style.background=`conic-gradient(var(--green) 0 ${pct}%,var(--line) ${pct}% 100%)`}}
function openAllChoice(){const hasLast=(profile().last||0)>0;$('#startChoiceTitle').textContent=t('allQuestions');$('#startChoiceText').textContent=t('whereStart');$('#startFromFirst').textContent=t('startFirst');$('#startFromLast').textContent=t('startLast');$('#cancelStartChoice').textContent=t('cancel');$('#startFromLast').classList.toggle('hidden',!hasLast);$('#startChoiceModal').classList.remove('hidden')}
function closeAllChoice(){$('#startChoiceModal').classList.add('hidden')}
async function start(type,specificId,startAt){stopExamTimer();if(!isPremium&&premiumOnlyMode(type)){showPremiumModal();return}if(type==='exam'&&!isPremium){if(!telegramUser){showPremiumModal('login');return}if(demoExamAttempts>=FREE_EXAM_LIMIT){showPremiumModal('exam-limit');return}try{const response=await fetch('/api/exam-attempt',{method:'POST',credentials:'same-origin'});const data=await response.json();if(!response.ok){demoExamAttempts=Number(data.demo_exam_attempts||demoExamAttempts);updateHome();showPremiumModal(response.status===401?'login':'exam-limit');return}isPremium=Boolean(data.is_premium);demoExamAttempts=Number(data.demo_exam_attempts||0);updateHome()}catch(error){console.error(error);showPremiumModal('exam-limit');return}}mode=type;selected=null;checkedAnswer=null;examAnswers=[];const s=sets();const available=accessibleQuestions();let source;if(type==='random20')source=shuffle(available).slice(0,20);else if(type==='exam')source=shuffle(isPremium?questions:available).slice(0,40);else if(type==='favorites')source=questions.filter(q=>s.favorites.has(q.id));else if(type==='mistakes')source=questions.filter(q=>s.mistakes.has(q.id));else source=available;session=prepareSession(source);if(specificId){const pos=session.findIndex(q=>q.id===specificId);if(pos<0){showPremiumModal();return}index=pos}else if(type==='all'&&startAt==='last'){index=Math.min(profile().last||0,Math.max(session.length-1,0))}else index=0;if(!session.length){alert(baseLang()==='ru'?'Список пуст.':baseLang()==='en'?'This list is empty.':'Список порожній.');return}if(type==='exam')startExamTimer();$('#homeView').classList.add('hidden');$('#quizView').classList.remove('hidden');$('#quizView').classList.toggle('exam-mode',type==='exam');render();window.scrollTo({top:0,behavior:'instant'})}
function render(){const q=session[index];if(!q)return;const qparts=getText(q.question);$('#questionText').innerHTML=qparts.map((p,i)=>`<div class="${i?'question-secondary':'question-primary'}">${p.flag?`<span class="language-flag">${p.flag}</span>`:''}${escapeHtml(p.text||'')}</div>`).join('');if(q.image){$('#imageWrap').classList.remove('hidden');$('#questionImage').src=q.image;$('#questionImage').onerror=()=>$('#imageWrap').classList.add('hidden')}else $('#imageWrap').classList.add('hidden');const letters='ABCD';$('#answers').innerHTML=q.options.map((opt,i)=>{const parts=getText(opt);let cls='answer';if(selected===i)cls+=' selected';if(mode!=='exam'&&checkedAnswer!==null){if(i===q.correctIndex)cls+=' correct';if(i===checkedAnswer&&checkedAnswer!==q.correctIndex)cls+=' wrong'}return `<button class="${cls}" data-i="${i}"><span class="answer-letter">${letters[i]}</span><span>${parts.map((p,j)=>`<div class="${j?'answer-secondary':'answer-primary'}">${p.flag?`<span class="language-flag">${p.flag}</span>`:''}${escapeHtml(p.text||'')}</div>`).join('')}</span></button>`}).join('');$$('.answer').forEach(b=>b.onclick=()=>choose(Number(b.dataset.i)));$('#progressText').textContent=`${index+1} / ${session.length}`;$('#progressBar').style.width=`${((index+1)/session.length)*100}%`;$('#prevBtn').disabled=index===0||mode==='exam';$('#nextBtn').disabled=mode==='exam'&&selected===null;const s=sets();$('#favoriteBtn').classList.toggle('active',s.favorites.has(q.id));$('#favoriteBtn').setAttribute('aria-pressed',String(s.favorites.has(q.id)));const feedback=$('#answerFeedback');if(mode!=='exam'&&checkedAnswer!==null){const ok=checkedAnswer===q.correctIndex;feedback.textContent=ok?`✓ ${t('correct')}`:`✕ ${t('incorrect')}`;feedback.className=`answer-feedback ${ok?'correct':'wrong'}`}else feedback.className='answer-feedback hidden';if(mode==='all'){profile().last=index;saveProfiles()}requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}))}
function choose(i){const q=session[index],s=sets();if(mode==='exam'){selected=i;examAnswers[index]=i;saveSets(s);render();return}selected=null;checkedAnswer=i;s.answered.add(q.id);const ok=i===q.correctIndex;if(ok){s.mistakes.delete(q.id);s.correct.add(q.id)}else{s.mistakes.add(q.id);s.correct.delete(q.id)}saveSets(s);render()}
function next(){if(index<session.length-1){index++;selected=mode==='exam'?(examAnswers[index]??null):null;checkedAnswer=null;render()}else finish()}
function prev(){if(index>0&&mode!=='exam'){index--;selected=null;checkedAnswer=null;render()}}
function formatTime(sec){const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function startExamTimer(){examSeconds=45*60;examStartedAt=Date.now();$('#examTimer').classList.remove('hidden');$('#examTimer').textContent='45:00';examTimerId=setInterval(()=>{examSeconds=Math.max(0,45*60-Math.floor((Date.now()-examStartedAt)/1000));$('#examTimer').textContent=formatTime(examSeconds);if(examSeconds<=0)finish()},1000)}
function stopExamTimer(){if(examTimerId)clearInterval(examTimerId);examTimerId=null;$('#examTimer')?.classList.add('hidden')}
function finish(){if(mode!=='exam'){showHome();return}stopExamTimer();const elapsed=Math.min(45*60,Math.floor((Date.now()-examStartedAt)/1000));const score=session.reduce((sum,q,i)=>sum+(examAnswers[i]===q.correctIndex?1:0),0),s=sets();const wrong=[];session.forEach((q,i)=>{s.answered.add(q.id);if(examAnswers[i]===q.correctIndex){s.correct.add(q.id);s.mistakes.delete(q.id)}else{s.correct.delete(q.id);s.mistakes.add(q.id);wrong.push({position:i+1,q,chosen:examAnswers[i]})}});profile().examScores=profile().examScores||[];profile().examScores.push(score);saveSets(s);showExamResult(score,elapsed,wrong)}
function showExamResult(score,elapsed,wrong){
  const passed=score>=35, correctPct=Math.round(score/40*100), wrongPct=100-correctPct;
  $('#resultStatus').textContent=resultLabel(passed?'passed':'failed')+(passed?' ✓':' ×');
  $('#resultStatus').className=`result-status ${passed?'pass':'fail'}`;
  $('#resultTitle').textContent=resultLabel('examResult');
  $('#resultTopTitle').textContent=resultLabel('examResult');
  $('#resultScore').textContent=`${score}/40`;
  $('#resultScoreLabel').textContent=resultLabel('correctAnswers');
  $('#resultScorePercent').textContent=`${correctPct}%`;
  $('#resultTime').textContent=formatTime(elapsed);
  $('#resultTimeLabel').textContent=resultLabel('timeTaken');
  $('#resultMistakeCount').textContent=wrong.length;
  $('#resultMistakeLabel').textContent=resultLabel('errors');
  $('#resultMistakePercent').textContent=`${wrongPct}%`;
  $('#mistakesTitle').textContent=resultLabel('mistakes');
  $('#resultTipTitle').textContent=resultLabel('tip');
  $('#resultTipText').textContent=resultLabel('tipText');
  $('#resultHomeBtn').textContent=resultLabel('allQuestions');
  $('#resultRetryBtn').textContent=resultLabel('retry');
  $('#examMistakesList').innerHTML=wrong.length?wrong.map(x=>{
    const chosenObj=x.chosen==null?null:x.q.options[x.chosen];
    const correctObj=x.q.options[x.q.correctIndex];
    const qLabel=resultLabel('question');
    return `<details class="exam-mistake"><summary><span class="mistake-play">▶</span><span class="mistake-copy"><span class="mistake-question-title">${escapeHtml(qLabel)} ${x.position}</span>${resultLines(x.q.question)}</span><span class="mistake-number">${x.position}</span></summary><div class="exam-mistake-body"><div class="user-answer"><b>${t('yourAnswer')}:</b>${chosenObj?resultLines(chosenObj):'<div>—</div>'}</div><div class="correct-answer"><b>${t('rightAnswer')}:</b>${resultLines(correctObj)}</div></div></details>`
  }).join(''):`<div class="perfect-result">${resultLabel('correctAnswers')}: 40/40 🎉</div>`;
  $('#resultTip').classList.toggle('hidden',wrong.length===0);
  $('#examResultModal').classList.remove('hidden')
}
function closeResult(){ $('#examResultModal').classList.add('hidden');showHome() }
function showHome(){stopExamTimer();$('#quizView').classList.add('hidden');$('#quizView').classList.remove('exam-mode');$('#homeView').classList.remove('hidden');closeDrawer();window.scrollTo({top:0,behavior:'smooth'});updateHome()}
function switchProfile(id){activeProfileId=id;saveProfiles();populateProfiles();updateHome();if(!$('#quizView').classList.contains('hidden'))showHome()}
function resetActiveProgress(){if(confirm(t('resetProgress')+'?')){const name=profile().name;profiles[activeProfileId]=defaultProfile(name);saveProfiles();updateHome();showHome()}}
function createProfile(){const name=prompt(baseLang()==='en'?'Profile name':baseLang()==='ru'?'Имя профиля':'Назва профілю');if(!name||!name.trim())return;const id=`p_${Date.now()}`;profiles[id]=defaultProfile(name.trim());activeProfileId=id;saveProfiles();populateProfiles();updateHome()}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function openDrawer(){$('#settingsDrawer').classList.add('open');$('#settingsDrawer').setAttribute('aria-hidden','false');$('#drawerBackdrop').classList.remove('hidden')}
function closeDrawer(){$('#settingsDrawer').classList.remove('open');$('#settingsDrawer').setAttribute('aria-hidden','true');$('#drawerBackdrop').classList.add('hidden')}
function cloudPayload(){
  return {
    version:1,
    updatedAt:Number(localStorage.getItem(STORAGE.cloudUpdated)||Date.now()),
    profiles,
    activeProfileId,
    lang,
    theme:document.documentElement.classList.contains('dark')?'dark':'light'
  };
}
function validCloudPayload(data){
  return data&&typeof data==='object'&&data.profiles&&typeof data.profiles==='object'&&Object.keys(data.profiles).length;
}
function applyCloudPayload(data){
  if(!validCloudPayload(data))return false;
  profiles=data.profiles;
  activeProfileId=data.activeProfileId&&profiles[data.activeProfileId]?data.activeProfileId:Object.keys(profiles)[0];
  lang=data.lang||lang;
  localStorage.setItem(STORAGE.profiles,JSON.stringify(profiles));
  localStorage.setItem(STORAGE.active,activeProfileId);
  localStorage.setItem(STORAGE.lang,lang);
  localStorage.setItem(STORAGE.theme,data.theme==='dark'?'dark':'light');
  localStorage.setItem(STORAGE.cloudUpdated,String(Number(data.updatedAt)||Date.now()));
  document.documentElement.classList.toggle('dark',data.theme==='dark');
  populateProfiles();
  setLang(lang,{fromCloud:true});
  updateHome();
  return true;
}
async function saveCloudProgress(showStatus=false){
  if(!telegramUser||!cloudSyncReady||cloudSyncInProgress)return;
  cloudSyncInProgress=true;
  if(showStatus)setTelegramMessage(t('cloudSyncing'));
  try{
    const response=await fetch('/api/progress',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile_data:cloudPayload()})});
    if(!response.ok)throw new Error(await response.text());
    if(showStatus){setTelegramMessage(t('cloudSynced'));setTimeout(()=>setTelegramMessage(''),1800)}
  }catch(error){
    console.error('Cloud save failed',error);
    setTelegramMessage(t('cloudError'),true);
  }finally{cloudSyncInProgress=false}
}
function queueCloudSync(){
  if(!telegramUser||!cloudSyncReady)return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer=setTimeout(()=>saveCloudProgress(false),1200);
}
async function initializeCloudProgress(user){
  telegramUser=user;
  cloudSyncReady=false;
  try{
    const response=await fetch('/api/progress',{credentials:'same-origin',cache:'no-store'});
    if(response.status===404){
      if(!Number(localStorage.getItem(STORAGE.cloudUpdated)||0))localStorage.setItem(STORAGE.cloudUpdated,String(Date.now()));
      cloudSyncReady=true;
      await saveCloudProgress(true);
      return;
    }
    if(!response.ok)throw new Error(await response.text());
    const remote=await response.json();
    const remoteData=remote?.profile_data;
    const localUpdated=Number(localStorage.getItem(STORAGE.cloudUpdated)||0);
    const remoteUpdated=Number(remoteData?.updatedAt||0);
    if(validCloudPayload(remoteData)&&remoteUpdated>localUpdated){
      applyCloudPayload(remoteData);
      setTelegramMessage(t('cloudLoaded'));
      setTimeout(()=>setTelegramMessage(''),1800);
    }
    cloudSyncReady=true;
    if(!validCloudPayload(remoteData)||localUpdated>=remoteUpdated)await saveCloudProgress(false);
  }catch(error){
    console.error('Cloud initialization failed',error);
    cloudSyncReady=true;
    setTelegramMessage(t('cloudError'),true);
  }
}

function telegramDisplayName(user){
  return user?.name||user?.preferred_username||user?.username||'Telegram user';
}
function setTelegramMessage(text='',isError=false){
  const el=$('#telegramAuthMessage');
  if(!el)return;
  el.textContent=text;
  el.classList.toggle('hidden',!text);
  el.classList.toggle('error',isError);
}
function updateTelegramAuthUI(user){
  const loggedIn=Boolean(user?.id);
  $('#telegramLoginBtn')?.classList.toggle('hidden',loggedIn);
  $('#telegramUserInfo')?.classList.toggle('hidden',!loggedIn);
  if(loggedIn&&$('#telegramUserName'))$('#telegramUserName').textContent=telegramDisplayName(user);
  if(loggedIn)setTelegramMessage('');
}
function signInWithTelegram(){
  setTelegramMessage(t('telegramSigningIn'));
  window.location.assign('/api/telegram-login');
}
async function signOutTelegram(){
  try{
    await fetch('/api/logout',{method:'POST',credentials:'same-origin'});
    telegramUser=null;cloudSyncReady=false;isPremium=false;demoExamAttempts=0;
    updateTelegramAuthUI(null);updateHome();
  }catch(error){
    console.error(error);
    setTelegramMessage(t('telegramError'),true);
  }
}
async function initTelegramAuth(){
  $('#telegramLoginBtn').onclick=signInWithTelegram;
  $('#telegramLogoutBtn').onclick=signOutTelegram;
  try{
    const response=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
    if(!response.ok){updateTelegramAuthUI(null);return}
    const data=await response.json();
    isPremium=Boolean(data.is_premium);demoExamAttempts=Number(data.demo_exam_attempts||0);updateTelegramAuthUI(data.user||null);updateHome();
    if(data.user)await initializeCloudProgress(data.user);
    const url=new URL(window.location.href);
    if(url.searchParams.has('telegram_login')){
      url.searchParams.delete('telegram_login');
      window.history.replaceState({},document.title,url.pathname+url.search+url.hash);
    }
  }catch(error){
    console.error(error);
    updateTelegramAuthUI(null);
  }
}

async function init(){if(localStorage.getItem(STORAGE.theme)==='dark')document.documentElement.classList.add('dark');const res=await fetch('questions.json',{cache:'no-store'});questions=await res.json();if(!profiles[activeProfileId])activeProfileId=Object.keys(profiles)[0];const opts=$('#languageSelect').innerHTML;$('#drawerLanguage').innerHTML=opts;populateProfiles();setLang(lang,{fromCloud:true});updateHome();$$('.mode-card[data-mode]').forEach(b=>b.onclick=()=>b.dataset.mode==='all'?openAllChoice():start(b.dataset.mode));$('#startFromFirst').onclick=()=>{closeAllChoice();start('all',null,'first')};$('#startFromLast').onclick=()=>{closeAllChoice();start('all',null,'last')};$('#cancelStartChoice').onclick=closeAllChoice;$('#startChoiceModal').onclick=e=>{if(e.target===$('#startChoiceModal'))closeAllChoice()};$('#searchModeBtn').onclick=()=>{$('#searchPanel').classList.toggle('hidden');$('#searchInput').focus()};$('#searchBtn').onclick=()=>{const n=Number($('#searchInput').value);if(n<1||n>questions.length)return;if(!isPremium&&n>FREE_QUESTION_LIMIT){showPremiumModal();return}start('all',n)};$('#resumeBtn').onclick=()=>start('all',null,'last');$('#themeBtn').onclick=toggleTheme;$('#drawerTheme').onclick=toggleTheme;$('#languageSelect').onchange=e=>setLang(e.target.value);$('#drawerLanguage').onchange=e=>setLang(e.target.value);$('#profileSelect').onchange=e=>switchProfile(e.target.value);$('#drawerProfile').onchange=e=>switchProfile(e.target.value);$('#createProfileBtn').onclick=createProfile;$('#homeBtn').onclick=showHome;$('#drawerHome').onclick=showHome;$('#settingsBtn').onclick=openDrawer;$('#closeDrawer').onclick=closeDrawer;$('#drawerBackdrop').onclick=closeDrawer;$('#prevBtn').onclick=prev;$('#nextBtn').onclick=next;$('#favoriteBtn').onclick=()=>{const s=sets(),id=session[index].id;s.favorites.has(id)?s.favorites.delete(id):s.favorites.add(id);saveSets(s);render()};$('#resetProgress').onclick=resetActiveProgress;$('#homeResetProgress').onclick=resetActiveProgress;$('#zoomBtn').onclick=()=>{$('#modalImage').src=$('#questionImage').src;$('#imageModal').classList.remove('hidden')};$('#closeImage').onclick=()=>$('#imageModal').classList.add('hidden');$('#imageModal').onclick=e=>{if(e.target===$('#imageModal'))$('#imageModal').classList.add('hidden')};$('#closeResult').onclick=closeResult;$('#resultBackBtn').onclick=closeResult;$('#resultHomeBtn').onclick=closeResult;$('#resultRetryBtn').onclick=()=>{ $('#examResultModal').classList.add('hidden'); start('exam') };$('#closePremiumModal').onclick=closePremiumModal;$('#premiumModal').onclick=e=>{if(e.target===$('#premiumModal'))closePremiumModal()};$('#premiumUpgradeBtn').onclick=()=>{$('#premiumModalText').textContent=t('premiumSoon')};$$('[data-premium-section]').forEach(el=>el.onclick=()=>{if(!isPremium)showPremiumModal()});await initTelegramAuth();document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closeAllChoice();$('#imageModal').classList.add('hidden')}})}
init().catch(err=>{console.error(err);alert('Could not load questions.json')});
