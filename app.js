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
let activityLastTick=0;
const FREE_QUESTION_LIMIT=60, FREE_EXAM_LIMIT=3;

const translations={
 ua:{questions:'питань',language:'Мова',theme:'Тема',random20:'20 випадкових питань',random10:'10 випадкових питань',random20Hint:'Більше практики',random10Hint:'Швидка практика',start:'Почати',morePractice:'Більше практики',officialExam:'Офіційний іспит',allQuestions:'Усі питання',mistakes:'Робота над помилками',favorites:'Закладки',searchNumber:'Пошук за номером',openQuestion:'Відкрити конкретне питання',open:'Відкрити',back:'Назад',bookmark:'Закладка',next:'Далі',settings:'Налаштування',resetProgress:'Скинути прогрес',resetDescription:'Питання, помилки, закладки та історія іспитів',home:'На головну',profile:'Профіль',createProfile:'+ Новий',progressSaved:'Прогрес автоматично зберігається',continueLast:'Продовжити з останнього питання',statistics:'Статистика',completed:'Пройдено',correctAnswers:'Правильних',errors:'Помилок',successRate:'Успішність',exams:'Іспити',examsTaken:'Складено іспитів',averageResult:'Середній результат',bestResult:'Найкращий результат',recentResults:'Останні результати',upToAttempts:'До 7 спроб',correct:'Вірно',incorrect:'Невірно',startFirst:'З першого питання',startLast:'Продовжити з останнього',whereStart:'Звідки почати?',cancel:'Скасувати',examResult:'Результат іспиту',mistakeQuestions:'Питання з помилками',yourAnswer:'Ваша відповідь',rightAnswer:'Правильна відповідь',time:'Час',result:'Результат',telegramLogin:'Увійти через Telegram',telegramConnected:'Telegram підключено',logout:'Вийти',telegramSigningIn:'Відкриваємо Telegram…',telegramError:'Не вдалося увійти через Telegram',cloudSyncing:'Зберігаємо прогрес…',cloudSynced:'Прогрес синхронізовано',cloudLoaded:'Хмарний прогрес завантажено',cloudError:'Не вдалося синхронізувати прогрес',freePlan:'Безкоштовний',premiumPlan:'Premium',upgrade:'Отримати Premium',lockedPremium:'Доступно у Premium',freeQuestions:'801 питання · перші 60 безкоштовно',demoExamsLeft:'Демо-іспитів залишилось',demoLimitReached:'Ви використали 3 безкоштовні демо-іспити',loginForExam:'Увійдіть через Telegram, щоб використати демо-іспити',premiumSoon:'Оплата Premium буде підключена найближчим часом. Для тестування доступ можна видати вручну.',invalidQuestionNumber:'Введіть номер від 1 до 801',unfinishedExam:'Незавершений іспит',completedOf:'Пройдено {count} із 40 питань.',resumeExam:'Продовжити іспит',startNewExam:'Почати новий',exitExam:'Вийти з іспиту?',exitExamText:'Ваші відповіді та поточне питання буде збережено.',stay:'Залишитися',leaveAndSave:'Вийти й зберегти'},
 en:{questions:'questions',language:'Language',theme:'Theme',random20:'20 Random Questions',random10:'10 Random Questions',random20Hint:'More practice',random10Hint:'Quick practice',start:'Start',morePractice:'More practice',officialExam:'Official Exam',allQuestions:'All Questions',mistakes:'Review Mistakes',favorites:'Bookmarks',searchNumber:'Search by Number',openQuestion:'Open a specific question',open:'Open',back:'Back',bookmark:'Bookmark',next:'Next',settings:'Settings',resetProgress:'Reset Progress',resetDescription:'Questions, mistakes, bookmarks and exam history',home:'Back to Home',profile:'Profile',createProfile:'+ New',progressSaved:'Progress is saved automatically',continueLast:'Continue from last question',statistics:'Statistics',completed:'Completed',correctAnswers:'Correct',errors:'Mistakes',successRate:'Success rate',exams:'Exams',examsTaken:'Exams Taken',averageResult:'Average Result',bestResult:'Best Result',recentResults:'Recent Results',upToAttempts:'Up to 7 attempts',correct:'Correct',incorrect:'Incorrect',startFirst:'Start from question 1',startLast:'Continue from the last question',whereStart:'Where would you like to start?',cancel:'Cancel',examResult:'Exam Result',mistakeQuestions:'Questions answered incorrectly',yourAnswer:'Your answer',rightAnswer:'Correct answer',time:'Time',result:'Result',telegramLogin:'Continue with Telegram',telegramConnected:'Telegram connected',logout:'Log out',telegramSigningIn:'Opening Telegram…',telegramError:'Could not sign in with Telegram',cloudSyncing:'Saving progress…',cloudSynced:'Progress synced',cloudLoaded:'Cloud progress loaded',cloudError:'Could not sync progress',freePlan:'Free',premiumPlan:'Premium',upgrade:'Get Premium',lockedPremium:'Available with Premium',freeQuestions:'801 questions · first 60 free',demoExamsLeft:'Demo exams remaining',demoLimitReached:'You have used all 3 free demo exams',loginForExam:'Sign in with Telegram to use demo exams',premiumSoon:'Premium payments will be connected soon. Test access can be granted manually.',invalidQuestionNumber:'Enter a number from 1 to 801',unfinishedExam:'Unfinished exam',completedOf:'Completed {count} of 40 questions.',resumeExam:'Continue exam',startNewExam:'Start a new exam',exitExam:'Leave the exam?',exitExamText:'Your answers and current question will be saved.',stay:'Stay',leaveAndSave:'Leave and save'},
 ru:{questions:'вопросов',language:'Язык',theme:'Тема',random20:'20 случайных вопросов',random10:'10 случайных вопросов',random20Hint:'Больше практики',random10Hint:'Быстрая практика',start:'Начать',morePractice:'Больше практики',officialExam:'Официальный экзамен',allQuestions:'Все вопросы',mistakes:'Работа над ошибками',favorites:'Закладки',searchNumber:'Поиск по номеру',openQuestion:'Открыть конкретный вопрос',open:'Открыть',back:'Назад',bookmark:'Закладка',next:'Далее',settings:'Настройки',resetProgress:'Сбросить прогресс',resetDescription:'Вопросы, ошибки, закладки и история экзаменов',home:'На главную',profile:'Профиль',createProfile:'+ Новый',progressSaved:'Прогресс сохраняется автоматически',continueLast:'Продолжить с последнего вопроса',statistics:'Статистика',completed:'Пройдено',correctAnswers:'Правильных',errors:'Ошибок',successRate:'Успешность',exams:'Экзамены',examsTaken:'Экзаменов пройдено',averageResult:'Средний результат',bestResult:'Лучший результат',recentResults:'Последние результаты',upToAttempts:'До 7 попыток',correct:'Верно',incorrect:'Неверно',startFirst:'С первого вопроса',startLast:'Продолжить с последнего',whereStart:'С какого вопроса начать?',cancel:'Отмена',examResult:'Результат экзамена',mistakeQuestions:'Вопросы с ошибками',yourAnswer:'Ваш ответ',rightAnswer:'Правильный ответ',time:'Время',result:'Результат',telegramLogin:'Войти через Telegram',telegramConnected:'Telegram подключён',logout:'Выйти',telegramSigningIn:'Открываем Telegram…',telegramError:'Не удалось войти через Telegram',cloudSyncing:'Сохраняем прогресс…',cloudSynced:'Прогресс синхронизирован',cloudLoaded:'Облачный прогресс загружен',cloudError:'Не удалось синхронизировать прогресс',freePlan:'Бесплатный',premiumPlan:'Premium',upgrade:'Получить Premium',lockedPremium:'Доступно в Premium',freeQuestions:'801 вопрос · первые 60 бесплатно',demoExamsLeft:'Осталось демо-экзаменов',demoLimitReached:'Вы использовали 3 бесплатных демо-экзамена',loginForExam:'Войдите через Telegram, чтобы использовать демо-экзамены',premiumSoon:'Оплата Premium будет подключена в ближайшее время. Для тестирования доступ можно выдать вручную.',invalidQuestionNumber:'Введите номер от 1 до 801',unfinishedExam:'Незавершённый экзамен',completedOf:'Пройдено {count} из 40 вопросов.',resumeExam:'Продолжить экзамен',startNewExam:'Начать новый',exitExam:'Выйти из экзамена?',exitExamText:'Ваши ответы и текущий вопрос будут сохранены.',stay:'Остаться',leaveAndSave:'Выйти и сохранить'}
};
function defaultProfile(name='Мій профіль'){return {name,favorites:[],mistakes:[],answered:[],correct:[],last:0,examScores:[],dailyActivity:{},incompleteExam:null}}

function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function todayActivity(){const p=profile();p.dailyActivity=p.dailyActivity||{};const key=todayKey();p.dailyActivity[key]=p.dailyActivity[key]||{questions:0,correct:0,seconds:0};return p.dailyActivity[key]}
function beginActivity(){activityLastTick=Date.now()}
function recordActivity(correctAnswer=null){if(!activityLastTick)activityLastTick=Date.now();const now=Date.now();const elapsed=Math.min(300,Math.max(0,Math.round((now-activityLastTick)/1000)));const a=todayActivity();a.seconds+=elapsed;if(correctAnswer!==null){a.questions+=1;if(correctAnswer)a.correct+=1}activityLastTick=now}
function stopActivity(){if(activityLastTick){recordActivity(null);activityLastTick=0}}
function animateNumber(el,value,suffix=''){if(!el)return;const start=Number(el.dataset.value||0);const end=Number(value)||0;el.dataset.value=String(end);const began=performance.now(),duration=420;function frame(now){const t=Math.min(1,(now-began)/duration),eased=1-Math.pow(1-t,3);el.textContent=`${Math.round(start+(end-start)*eased)}${suffix}`;if(t<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)}
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
function updateHome(){if(!questions.length)return;const p=profile(),s=sets();const allowedIds=new Set(accessibleQuestions().map(q=>q.id));const answered=[...s.answered].filter(id=>allowedIds.has(id)).length,correct=[...s.correct].filter(id=>allowedIds.has(id)).length,mistakes=[...s.mistakes].filter(id=>allowedIds.has(id)).length,bookmarks=[...s.favorites].filter(id=>allowedIds.has(id)).length,total=questions.length;updatePlanUI();const success=answered?Math.round((correct/answered)*100):0;const progress=Math.min(100,Math.round((answered/total)*100));$('#welcomeName').textContent=p.name||'Dina';$('#statsProfileName').textContent=p.name||'Dina';$('#totalCount').textContent=total;$('#favoritesCount').textContent=bookmarks;$('#mistakesCount').textContent=mistakes;$('#allProgress').textContent=`${answered} / ${total}`;animateNumber($('#statAnswered'),answered);$('#statTotal').textContent=total;animateNumber($('#statCorrect'),correct);animateNumber($('#statMistakes'),mistakes);animateNumber($('#statBookmarks'),bookmarks);$('#statSuccess').textContent=`${success}%`;$('#statsProgressBar').style.width=`${progress}%`;$('#successRing').style.setProperty('--success',success);$('#statsRemaining').textContent=baseLang()==='en'?`${Math.max(total-answered,0)} questions remaining`:baseLang()==='ru'?`Осталось ${Math.max(total-answered,0)} вопросов`:`Залишилось ${Math.max(total-answered,0)} питань`;$('#bookmarksLabel').textContent=baseLang()==='en'?'Saved questions':baseLang()==='ru'?'Сохранённые вопросы':'Збережені питання';const a=todayActivity(),todayAccuracy=a.questions?Math.round(a.correct/a.questions*100):0,minutes=Math.floor(a.seconds/60);$('#todayTitle').textContent=baseLang()==='en'?'Today':baseLang()==='ru'?'Сегодня':'Сьогодні';$('#todayQuestionsLabel').textContent=baseLang()==='en'?'Questions':baseLang()==='ru'?'Вопросов':'Питань';$('#todayCorrectLabel').textContent=baseLang()==='en'?'Correct':baseLang()==='ru'?'Правильных':'Правильних';$('#todayAccuracyLabel').textContent=baseLang()==='en'?'Accuracy':baseLang()==='ru'?'Точность':'Точність';$('#todayTimeLabel').textContent=baseLang()==='en'?'Study time':baseLang()==='ru'?'Время обучения':'Час навчання';animateNumber($('#todayQuestions'),a.questions);animateNumber($('#todayCorrect'),a.correct);$('#todayAccuracy').textContent=`${todayAccuracy}%`;$('#todayTime').textContent=baseLang()==='en'?`${minutes} min`:baseLang()==='ru'?`${minutes} мин`:`${minutes} хв`;const motivation=progress>=100?(baseLang()==='en'?'All 801 questions completed!':baseLang()==='ru'?'Все 801 вопрос пройдены!':'Усі 801 питання пройдено!'):progress>=80?(baseLang()==='en'?'Almost there!':baseLang()==='ru'?'Почти готово!':'Майже готово!'):progress>=50?(baseLang()==='en'?'You are getting exam ready.':baseLang()==='ru'?'Вы приближаетесь к готовности.':'Ви наближаєтесь до готовності.'):progress>=20?(baseLang()==='en'?'Great progress!':baseLang()==='ru'?'Отличный прогресс!':'Чудовий прогрес!'):(baseLang()==='en'?'Great start!':baseLang()==='ru'?'Отличное начало!':'Чудовий початок!');$('#motivationText').textContent=motivation;const scores=p.examScores||[];const average=scores.length?scores.reduce((x,y)=>x+y,0)/scores.length:0;const best=scores.length?Math.max(...scores):0;$('#examCount').textContent=scores.length;$('#examAverage').textContent=scores.length?`${average.toFixed(1)}/40`:'—';$('#examBest').textContent=scores.length?`${best}/40`:'—';const readiness=$('#examReadiness');readiness.textContent=baseLang()==='en'?'Continue practice':baseLang()==='ru'?'Продолжить практику':'Продовжити практику';readiness.className='readiness-badge continue-practice';const recent=scores.slice(-7);$('#examHistoryChart').innerHTML=recent.length?recent.map((score,i)=>`<div class="exam-score-bar ${score>=35?'pass':'fail'}" style="--score-height:${Math.max(10,Math.round(score/40*78))}px"><b>${score}</b><span>${scores.length-recent.length+i+1}</span></div>`).join(''):`<div class="empty-chart">${baseLang()==='en'?'Exam results will appear here':baseLang()==='ru'?'Здесь появятся результаты экзаменов':'Тут з’являться результати іспитів'}</div>`;}
function openAllChoice(){const hasLast=(profile().last||0)>0;$('#startChoiceTitle').textContent=t('allQuestions');$('#startChoiceText').textContent=t('whereStart');$('#startFromFirst').textContent=t('startFirst');$('#startFromLast').textContent=t('startLast');$('#cancelStartChoice').textContent=t('cancel');$('#startFromLast').classList.toggle('hidden',!hasLast);$('#startChoiceModal').classList.remove('hidden')}
function closeAllChoice(){$('#startChoiceModal').classList.add('hidden')}
function examAnsweredCount(state=profile().incompleteExam){return state?.answers?.filter(v=>Number.isInteger(v)).length||0}
function saveIncompleteExam(){if(mode!=='exam'||!session.length)return;profile().incompleteExam={session,index,answers:[...examAnswers],remainingSeconds:examSeconds,savedAt:Date.now()};saveProfiles()}
function clearIncompleteExam(){profile().incompleteExam=null;saveProfiles()}
function examIntroLabels(){const b=baseLang();const x={ua:{title:'Офіційний іспит',lead:'Цей режим імітує справжній Irish Driving Theory Test.',q:'питань',m:'хвилин',pass:'для проходження',list:['Можна позначати питання для перегляду.','Після завершення часу іспит закінчиться автоматично.','Незавершений іспит зберігається.'],start:'Почати іспит',cancel:'Скасувати',quick:'Швидкий доступ',hero:'Продовжуйте навчання',sub:'Ви чудово справляєтесь — продовжуйте!',question:'Питання',progress:'Прогрес',continue:'Продовжити'},en:{title:'Official Exam',lead:'This mode simulates the real Irish Driving Theory Test.',q:'questions',m:'minutes',pass:'to pass',list:['Flag questions for review.','The exam finishes automatically when time runs out.','An unfinished exam is saved.'],start:'Start exam',cancel:'Cancel',quick:'Quick Access',hero:'Continue Learning',sub:"Keep going, you're doing great!",question:'Question',progress:'Progress',continue:'Continue'},ru:{title:'Официальный экзамен',lead:'Этот режим имитирует настоящий Irish Driving Theory Test.',q:'вопросов',m:'минут',pass:'для сдачи',list:['Можно отмечать вопросы для повторного просмотра.','После окончания времени экзамен завершится автоматически.','Незавершённый экзамен сохраняется.'],start:'Начать экзамен',cancel:'Отмена',quick:'Быстрый доступ',hero:'Продолжайте обучение',sub:'У вас отлично получается — продолжайте!',question:'Вопрос',progress:'Прогресс',continue:'Продолжить'}};return x[b]||x.en}
function updatePremiumHero(){if(!questions.length)return;const l=examIntroLabels(),p=profile(),total=questions.length,n=Math.min((Number(p.last)||0)+1,total),pct=Math.round(n/total*100);$('#quickAccessTitle').textContent=l.quick;$('#heroTitle').textContent=l.hero;$('#heroSubtitle').textContent=l.sub;$('#heroQuestionLabel').textContent=l.question;$('#heroProgressLabel').textContent=l.progress;$('#heroContinueText').textContent=l.continue;$('#heroQuestionCount').textContent=n;$('#heroProgressPercent').textContent=`${pct}%`;$('#heroProgressBar').style.width=`${pct}%`;document.querySelector('.hero-progress-ring').style.background=`conic-gradient(#d8ffe3 0 ${pct}%,rgba(255,255,255,.2) ${pct}% 100%)`}
function openExamIntro(){const l=examIntroLabels();$('#examIntroTitle').textContent=l.title;$('#examIntroLead').textContent=l.lead;$('#examIntroQuestions').textContent=l.q;$('#examIntroMinutes').textContent=l.m;$('#examIntroPass').textContent=l.pass;$('#examIntroList').innerHTML=l.list.map(v=>`<li>${escapeHtml(v)}</li>`).join('');$('#beginExamBtn').textContent=l.start;$('#cancelExamIntro').textContent=l.cancel;$('#examIntroModal').classList.remove('hidden')}
function closeExamIntro(){$('#examIntroModal').classList.add('hidden')}
function openExamChoice(){const state=profile().incompleteExam;if(!state?.session?.length){openExamIntro();return}const count=examAnsweredCount(state);$('#examResumeTitle').textContent=t('unfinishedExam');$('#examResumeText').textContent=t('completedOf').replace('{count}',count);$('#resumeExamBtn').textContent=t('resumeExam');$('#newExamBtn').textContent=t('startNewExam');$('#cancelExamChoice').textContent=t('cancel');$('#examResumeModal').classList.remove('hidden')}
function closeExamChoice(){$('#examResumeModal').classList.add('hidden')}
function requestLeaveExam(){if(mode!=='exam'){showHome();return}saveIncompleteExam();$('#examExitTitle').textContent=t('exitExam');$('#examExitText').textContent=t('exitExamText');$('#stayExamBtn').textContent=t('stay');$('#leaveExamBtn').textContent=t('leaveAndSave');$('#examExitModal').classList.remove('hidden')}
function closeExamExit(){$('#examExitModal').classList.add('hidden')}
function resumeSavedExam(){const state=profile().incompleteExam;if(!state?.session?.length){start('exam',null,'new');return}stopExamTimer();mode='exam';selected=null;checkedAnswer=null;session=state.session;index=Math.min(Number(state.index)||0,session.length-1);examAnswers=Array.isArray(state.answers)?state.answers:[];selected=examAnswers[index]??null;beginActivity();startExamTimer(Math.max(1,Number(state.remainingSeconds)||45*60));$('#homeView').classList.add('hidden');$('#quizView').classList.remove('hidden');$('#quizView').classList.add('exam-mode');render();window.scrollTo({top:0,behavior:'instant'})}
async function start(type,specificId,startAt){stopExamTimer();if(type==='exam'&&startAt==='resume'){resumeSavedExam();return}if(!isPremium&&premiumOnlyMode(type)){showPremiumModal();return}if(type==='exam'&&!isPremium){if(!telegramUser){showPremiumModal('login');return}if(demoExamAttempts>=FREE_EXAM_LIMIT){showPremiumModal('exam-limit');return}try{const response=await fetch('/api/exam-attempt',{method:'POST',credentials:'same-origin'});const data=await response.json();if(!response.ok){demoExamAttempts=Number(data.demo_exam_attempts||demoExamAttempts);updateHome();updatePremiumHero();showPremiumModal(response.status===401?'login':'exam-limit');return}isPremium=Boolean(data.is_premium);demoExamAttempts=Number(data.demo_exam_attempts||0);updateHome()}catch(error){console.error(error);showPremiumModal('exam-limit');return}}mode=type;selected=null;checkedAnswer=null;examAnswers=[];if(type==='exam'&&startAt==='new')clearIncompleteExam();beginActivity();const s=sets();const available=accessibleQuestions();let source;if(type==='random20')source=shuffle(available).slice(0,20);else if(type==='random10')source=shuffle(available).slice(0,10);else if(type==='exam')source=shuffle(isPremium?questions:available).slice(0,40);else if(type==='favorites')source=questions.filter(q=>s.favorites.has(q.id));else if(type==='mistakes')source=questions.filter(q=>s.mistakes.has(q.id));else source=available;session=prepareSession(source);if(specificId){const pos=session.findIndex(q=>q.id===specificId);if(pos<0){showPremiumModal();return}index=pos}else if(type==='all'&&startAt==='last'){index=Math.min(profile().last||0,Math.max(session.length-1,0))}else index=0;if(!session.length){alert(baseLang()==='ru'?'Список пуст.':baseLang()==='en'?'This list is empty.':'Список порожній.');return}if(type==='exam'){startExamTimer();saveIncompleteExam();}$('#homeView').classList.add('hidden');$('#quizView').classList.remove('hidden');$('#quizView').classList.toggle('exam-mode',type==='exam');render();window.scrollTo({top:0,behavior:'instant'})}
function render(){const q=session[index];if(!q)return;const qparts=getText(q.question);$('#questionText').innerHTML=qparts.map((p,i)=>`<div class="${i?'question-secondary':'question-primary'}">${p.flag?`<span class="language-flag">${p.flag}</span>`:''}${escapeHtml(p.text||'')}</div>`).join('');if(q.image){$('#imageWrap').classList.remove('hidden');$('#questionImage').src=q.image;$('#questionImage').onerror=()=>$('#imageWrap').classList.add('hidden')}else $('#imageWrap').classList.add('hidden');const letters='ABCD';$('#answers').innerHTML=q.options.map((opt,i)=>{const parts=getText(opt);let cls='answer';if(selected===i)cls+=' selected';if(mode!=='exam'&&checkedAnswer!==null){if(i===q.correctIndex)cls+=' correct';if(i===checkedAnswer&&checkedAnswer!==q.correctIndex)cls+=' wrong'}return `<button class="${cls}" data-i="${i}"><span class="answer-letter">${letters[i]}</span><span>${parts.map((p,j)=>`<div class="${j?'answer-secondary':'answer-primary'}">${p.flag?`<span class="language-flag">${p.flag}</span>`:''}${escapeHtml(p.text||'')}</div>`).join('')}</span></button>`}).join('');$$('.answer').forEach(b=>b.onclick=()=>choose(Number(b.dataset.i)));$('#progressText').textContent=`${index+1} / ${session.length}`;$('#progressBar').style.width=`${((index+1)/session.length)*100}%`;$('#prevBtn').disabled=index===0||mode==='exam';$('#nextBtn').disabled=mode==='exam'&&selected===null;const s=sets();$('#favoriteBtn').classList.toggle('active',s.favorites.has(q.id));$('#favoriteBtn').setAttribute('aria-pressed',String(s.favorites.has(q.id)));const feedback=$('#answerFeedback');if(mode!=='exam'&&checkedAnswer!==null){const ok=checkedAnswer===q.correctIndex;feedback.textContent=ok?`✓ ${t('correct')}`:`✕ ${t('incorrect')}`;feedback.className=`answer-feedback ${ok?'correct':'wrong'}`}else feedback.className='answer-feedback hidden';if(mode==='all'){profile().last=index;saveProfiles()}requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}))}
function choose(i){const q=session[index],s=sets();if(mode==='exam'){selected=i;examAnswers[index]=i;recordActivity(i===q.correctIndex);saveIncompleteExam();render();return}selected=null;checkedAnswer=i;s.answered.add(q.id);const ok=i===q.correctIndex;recordActivity(ok);if(ok){s.mistakes.delete(q.id);s.correct.add(q.id)}else{s.mistakes.add(q.id);s.correct.delete(q.id)}saveSets(s);render()}
function next(){if(index<session.length-1){index++;selected=mode==='exam'?(examAnswers[index]??null):null;checkedAnswer=null;if(mode==='exam')saveIncompleteExam();render()}else finish()}
function prev(){if(index>0&&mode!=='exam'){index--;selected=null;checkedAnswer=null;render()}}
function formatTime(sec){const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function startExamTimer(initialSeconds=45*60){examSeconds=initialSeconds;examStartedAt=Date.now();const initial=initialSeconds;$('#examTimer').classList.remove('hidden');$('#examTimer').textContent=formatTime(examSeconds);examTimerId=setInterval(()=>{examSeconds=Math.max(0,initial-Math.floor((Date.now()-examStartedAt)/1000));$('#examTimer').textContent=formatTime(examSeconds);if(examSeconds%5===0)saveIncompleteExam();if(examSeconds<=0)finish()},1000)}
function stopExamTimer(){if(examTimerId)clearInterval(examTimerId);examTimerId=null;$('#examTimer')?.classList.add('hidden')}
function finish(){if(mode!=='exam'){stopActivity();showHome();return}stopExamTimer();stopActivity();clearIncompleteExam();const elapsed=Math.min(45*60,Math.floor((Date.now()-examStartedAt)/1000));const score=session.reduce((sum,q,i)=>sum+(examAnswers[i]===q.correctIndex?1:0),0),s=sets();const wrong=[];session.forEach((q,i)=>{s.answered.add(q.id);if(examAnswers[i]===q.correctIndex){s.correct.add(q.id);s.mistakes.delete(q.id)}else{s.correct.delete(q.id);s.mistakes.add(q.id);wrong.push({position:i+1,q,chosen:examAnswers[i]})}});profile().examScores=profile().examScores||[];profile().examScores.push(score);saveSets(s);showExamResult(score,elapsed,wrong)}
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
function showHome(){stopExamTimer();stopActivity();$('#quizView').classList.add('hidden');$('#quizView').classList.remove('exam-mode');$('#homeView').classList.remove('hidden');closeDrawer();window.scrollTo({top:0,behavior:'smooth'});updateHome()}
function switchProfile(id){activeProfileId=id;saveProfiles();populateProfiles();updateHome();updatePremiumHero();if(!$('#quizView').classList.contains('hidden'))showHome()}
function resetActiveProgress(){if(confirm(t('resetProgress')+'?')){const name=profile().name;profiles[activeProfileId]=defaultProfile(name);saveProfiles();updateHome();updatePremiumHero();showHome()}}
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
  updateHome();updatePremiumHero();
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
  
  if(loggedIn)setTelegramMessage('');
}
async function signInWithTelegram(){
  setTelegramMessage(t('telegramSigningIn'));
  try{
    const tg=window.Telegram?.WebApp;
    if(tg?.initData){
      await loginFromTelegramMiniApp();
      const response=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)throw new Error(await response.text());
      const data=await response.json();
      isPremium=Boolean(data.is_premium);
      demoExamAttempts=Number(data.demo_exam_attempts||0);
      updateTelegramAuthUI(data.user||null);
      updateHome();
      updatePremiumHero();
      if(data.user)await initializeCloudProgress(data.user);
      return;
    }
    // OAuth is used only when the site is opened outside Telegram.
    window.location.assign('/api/telegram-login');
  }catch(error){
    console.error('Telegram sign-in failed',error);
    setTelegramMessage(t('telegramError'),true);
  }
}
async function signOutTelegram(){
  try{
    await fetch('/api/logout',{method:'POST',credentials:'same-origin'});
    telegramUser=null;cloudSyncReady=false;isPremium=false;demoExamAttempts=0;
    updateTelegramAuthUI(null);updateHome();updatePremiumHero();
  }catch(error){
    console.error(error);
    setTelegramMessage(t('telegramError'),true);
  }
}
async function loginFromTelegramMiniApp(){
  const tg=window.Telegram?.WebApp;
  const initData=tg?.initData||'';
  if(!initData)return false;
  tg.ready();
  tg.expand();
  const response=await fetch('/api/telegram-miniapp-login',{
    method:'POST',
    credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({initData})
  });
  if(!response.ok)throw new Error(await response.text());
  return true;
}
async function initTelegramAuth(){
  $('#telegramLoginBtn').onclick=signInWithTelegram;
  $('#telegramLogoutBtn').onclick=signOutTelegram;
  try{
    const tg=window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();

    let response=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
    if(response.status===401){
      // Telegram can populate initData a moment after the page script starts on iOS.
      for(let attempt=0;attempt<10&&!window.Telegram?.WebApp?.initData;attempt++){
        await new Promise(resolve=>setTimeout(resolve,150));
      }
      if(window.Telegram?.WebApp?.initData){
        setTelegramMessage(t('telegramSigningIn'));
        await loginFromTelegramMiniApp();
        response=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
      }
    }
    if(!response.ok){updateTelegramAuthUI(null);return}
    const data=await response.json();
    isPremium=Boolean(data.is_premium);demoExamAttempts=Number(data.demo_exam_attempts||0);updateTelegramAuthUI(data.user||null);updateHome();updatePremiumHero();
    if(data.user)await initializeCloudProgress(data.user);
    const url=new URL(window.location.href);
    if(url.searchParams.has('telegram_login')){
      url.searchParams.delete('telegram_login');
      window.history.replaceState({},document.title,url.pathname+url.search+url.hash);
    }
  }catch(error){
    console.error(error);
    updateTelegramAuthUI(null);
    setTelegramMessage(t('telegramError'),true);
  }
}


let imageViewerScale=1,imageViewerX=0,imageViewerY=0,imageViewerStartDistance=0,imageViewerStartScale=1,imageViewerDragging=false,imageViewerStartX=0,imageViewerStartY=0,imageViewerBaseX=0,imageViewerBaseY=0,imageViewerLastTap=0;
function applyImageViewerTransform(){const img=$('#modalImage');if(!img)return;img.style.transform=`translate3d(${imageViewerX}px,${imageViewerY}px,0) scale(${imageViewerScale})`;img.classList.toggle('is-zoomed',imageViewerScale>1.01)}
function resetImageViewer(){imageViewerScale=1;imageViewerX=0;imageViewerY=0;imageViewerDragging=false;applyImageViewerTransform()}
function openImageViewer(){const src=$('#questionImage').src;if(!src)return;const img=$('#modalImage');img.src=src;resetImageViewer();$('#imageModal').classList.remove('hidden');document.body.classList.add('modal-open')}
function closeImageViewer(){$('#imageModal').classList.add('hidden');document.body.classList.remove('modal-open');resetImageViewer()}
function touchDistance(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
function clampViewerPosition(){if(imageViewerScale<=1){imageViewerX=0;imageViewerY=0;return}const maxX=Math.max(0,(window.innerWidth*(imageViewerScale-1))/2),maxY=Math.max(0,(window.innerHeight*(imageViewerScale-1))/2);imageViewerX=Math.max(-maxX,Math.min(maxX,imageViewerX));imageViewerY=Math.max(-maxY,Math.min(maxY,imageViewerY))}
function bindImageViewerGestures(){const img=$('#modalImage');if(!img||img.dataset.gesturesBound)return;img.dataset.gesturesBound='1';img.addEventListener('touchstart',e=>{if(e.touches.length===2){imageViewerStartDistance=touchDistance(e.touches[0],e.touches[1]);imageViewerStartScale=imageViewerScale;e.preventDefault()}else if(e.touches.length===1&&imageViewerScale>1){imageViewerDragging=true;imageViewerStartX=e.touches[0].clientX;imageViewerStartY=e.touches[0].clientY;imageViewerBaseX=imageViewerX;imageViewerBaseY=imageViewerY}}, {passive:false});img.addEventListener('touchmove',e=>{if(e.touches.length===2&&imageViewerStartDistance){imageViewerScale=Math.max(1,Math.min(4,imageViewerStartScale*touchDistance(e.touches[0],e.touches[1])/imageViewerStartDistance));clampViewerPosition();applyImageViewerTransform();e.preventDefault()}else if(e.touches.length===1&&imageViewerDragging){imageViewerX=imageViewerBaseX+e.touches[0].clientX-imageViewerStartX;imageViewerY=imageViewerBaseY+e.touches[0].clientY-imageViewerStartY;clampViewerPosition();applyImageViewerTransform();e.preventDefault()}}, {passive:false});img.addEventListener('touchend',e=>{if(e.touches.length<2)imageViewerStartDistance=0;if(e.touches.length===0)imageViewerDragging=false;clampViewerPosition();applyImageViewerTransform()});img.addEventListener('click',()=>{const now=Date.now();if(now-imageViewerLastTap<300){if(imageViewerScale>1){resetImageViewer()}else{imageViewerScale=2;applyImageViewerTransform()}imageViewerLastTap=0}else imageViewerLastTap=now});img.addEventListener('dragstart',e=>e.preventDefault())}
async function init(){if(localStorage.getItem(STORAGE.theme)==='dark')document.documentElement.classList.add('dark');const res=await fetch('questions.json',{cache:'no-store'});questions=await res.json();bindImageViewerGestures();if(!profiles[activeProfileId])activeProfileId=Object.keys(profiles)[0];const opts=$('#languageSelect').innerHTML;$('#drawerLanguage').innerHTML=opts;populateProfiles();setLang(lang,{fromCloud:true});updateHome();updatePremiumHero();$$('.mode-card[data-mode]').forEach(b=>b.onclick=()=>b.dataset.mode==='all'?openAllChoice():b.dataset.mode==='exam'?openExamChoice():start(b.dataset.mode));$('#startFromFirst').onclick=()=>{closeAllChoice();start('all',null,'first')};$('#startFromLast').onclick=()=>{closeAllChoice();start('all',null,'last')};$('#cancelStartChoice').onclick=closeAllChoice;$('#startChoiceModal').onclick=e=>{if(e.target===$('#startChoiceModal'))closeAllChoice()};$('#searchForm').onsubmit=e=>{e.preventDefault();const n=Number($('#searchInput').value);if(!Number.isInteger(n)||n<1||n>questions.length){alert(t('invalidQuestionNumber'));$('#searchInput').focus();return}if(!isPremium&&n>FREE_QUESTION_LIMIT){showPremiumModal();return}start('all',n)};$('#examReadiness').onclick=()=>start('all',null,(profile().last||0)>0?'last':'first');$('#themeBtn').onclick=toggleTheme;$('#drawerTheme').onclick=toggleTheme;$('#languageSelect').onchange=e=>setLang(e.target.value);$('#drawerLanguage').onchange=e=>setLang(e.target.value);$('#profileSelect').onchange=e=>switchProfile(e.target.value);$('#drawerProfile').onchange=e=>switchProfile(e.target.value);$('#createProfileBtn').onclick=createProfile;$('#homeBtn').onclick=requestLeaveExam;$('#drawerHome').onclick=requestLeaveExam;$('#settingsBtn').onclick=openDrawer;$('#closeDrawer').onclick=closeDrawer;$('#drawerBackdrop').onclick=closeDrawer;$('#prevBtn').onclick=prev;$('#nextBtn').onclick=next;$('#favoriteBtn').onclick=()=>{const s=sets(),id=session[index].id;s.favorites.has(id)?s.favorites.delete(id):s.favorites.add(id);saveSets(s);render()};$('#resetProgress').onclick=resetActiveProgress;$('#homeResetProgress').onclick=resetActiveProgress;$('#zoomBtn').onclick=openImageViewer;$('#questionImage').onclick=openImageViewer;$('#closeImage').onclick=closeImageViewer;$('#imageModal').onclick=e=>{if(e.target===$('#imageModal'))closeImageViewer()};$('#closeResult').onclick=closeResult;$('#resultBackBtn').onclick=closeResult;$('#resultHomeBtn').onclick=closeResult;$('#resultRetryBtn').onclick=()=>{ $('#examResultModal').classList.add('hidden'); start('exam',null,'new') };$('#resumeExamBtn').onclick=()=>{closeExamChoice();start('exam',null,'resume')};$('#newExamBtn').onclick=()=>{closeExamChoice();openExamIntro()};$('#cancelExamChoice').onclick=closeExamChoice;$('#beginExamBtn').onclick=()=>{closeExamIntro();start('exam',null,'new')};$('#cancelExamIntro').onclick=closeExamIntro;$('#examIntroModal').onclick=e=>{if(e.target===$('#examIntroModal'))closeExamIntro()};$('#heroContinueBtn').onclick=()=>start('all',null,(profile().last||0)>0?'last':'first');$('#examResumeModal').onclick=e=>{if(e.target===$('#examResumeModal'))closeExamChoice()};$('#stayExamBtn').onclick=closeExamExit;$('#leaveExamBtn').onclick=()=>{closeExamExit();showHome()};$('#examExitModal').onclick=e=>{if(e.target===$('#examExitModal'))closeExamExit()};$('#closePremiumModal').onclick=closePremiumModal;$('#premiumModal').onclick=e=>{if(e.target===$('#premiumModal'))closePremiumModal()};$('#premiumUpgradeBtn').onclick=()=>{$('#premiumModalText').textContent=t('premiumSoon')};$$('[data-premium-section]').forEach(el=>el.onclick=()=>{if(!isPremium)showPremiumModal()});await initTelegramAuth();document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closeAllChoice();closeExamChoice();closeExamIntro();closeExamExit();closeImageViewer()}})}
window.addEventListener('beforeunload',e=>{if(mode==='exam'&&!$('#quizView').classList.contains('hidden')){saveIncompleteExam();e.preventDefault();e.returnValue=''}});
init().catch(err=>{console.error(err);alert('Could not load questions.json')});
