const $ = id => document.getElementById(id);
const ACCESS_CODE = 'DINA2026';

let questions = [];
let session = [];
let pos = 0;
let mode = 'all';
let lang = localStorage.getItem('itp_lang') || 'ua';
let answers = {};
let optionOrders = {};
let timerId = null;
let timeLeft = 45 * 60;
let examStartedAt = null;
let currentProfile = localStorage.getItem('itp_profile') || '';
let currentTopic = 'all';
let flagged = {};
let lastExamMistakes = [];

const labels = {
  ua: {empty:'Тут поки немає питань', correct:'Правильно ✅', wrong:'Неправильно ❌', next:'Далі', finish:'Завершити', back:'Назад', pass:'СКЛАДЕНО ✅', fail:'НЕ СКЛАДЕНО ❌', result:'Результат', need:'Потрібно мінімум 35 правильних відповідей із 40.', timeout:'Час завершився.', resetConfirm:'Скинути прогрес тільки для цього профілю?', addProfile:'Введи ім’я нового профілю', correctCount:'Правильно', mistakes:'Помилок', unanswered:'Без відповіді', score:'Результат', usedTime:'Використаний час', yourAnswer:'Ваша відповідь', rightAnswer:'Правильна відповідь', noAnswer:'Без відповіді', noMistakes:'Без помилок 🎉', questionWord:'Питання', ofWord:'із'},
  en: {empty:'No questions here yet', correct:'Correct ✅', wrong:'Wrong ❌', next:'Next', finish:'Finish', back:'Back', pass:'PASS ✅', fail:'FAIL ❌', result:'Result', need:'You need at least 35 correct answers out of 40.', timeout:'Time is up.', resetConfirm:'Reset progress only for this profile?', addProfile:'Enter new profile name', correctCount:'Correct', mistakes:'Mistakes', unanswered:'Unanswered', score:'Score', usedTime:'Time used', yourAnswer:'Your answer', rightAnswer:'Correct answer', noAnswer:'Unanswered', noMistakes:'No mistakes 🎉', questionWord:'Question', ofWord:'of'},
  ru: {empty:'Здесь пока нет вопросов', correct:'Правильно ✅', wrong:'Неправильно ❌', next:'Далее', finish:'Завершить', back:'Назад', pass:'СДАНО ✅', fail:'НЕ СДАНО ❌', result:'Результат', need:'Нужно минимум 35 правильных ответов из 40.', timeout:'Время закончилось.', resetConfirm:'Сбросить прогресс только для этого профиля?', addProfile:'Введите имя нового профиля', correctCount:'Правильно', mistakes:'Ошибок', unanswered:'Без ответа', score:'Результат', usedTime:'Использованное время', yourAnswer:'Ваш ответ', rightAnswer:'Правильный ответ', noAnswer:'Без ответа', noMistakes:'Без ошибок 🎉', questionWord:'Вопрос', ofWord:'из'}
};

function primaryLang(){ return lang.startsWith('en') ? 'en' : lang; }
function t(key){ return (labels[primaryLang()] || labels.en)[key] || key; }
function bilingualLabel(key){
  if (lang === 'en_ua') return `${labels.en[key]} / ${labels.ua[key]}`;
  if (lang === 'en_ru') return `${labels.en[key]} / ${labels.ru[key]}`;
  return t(key);
}
function escapeHtml(s){ return String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function rawText(obj, l){ return (obj && (obj[l] || obj.en || obj.ua || obj.ru)) || ''; }
function displayHtml(obj){
  if (lang === 'en_ua') return `<span>${escapeHtml(rawText(obj,'en'))}</span><small>🇺🇦 ${escapeHtml(rawText(obj,'ua'))}</small>`;
  if (lang === 'en_ru') return `<span>${escapeHtml(rawText(obj,'en'))}</span><small>🇷🇺 ${escapeHtml(rawText(obj,'ru'))}</small>`;
  return escapeHtml(rawText(obj, lang));
}
function plainText(obj){ return rawText(obj, primaryLang()); }
function shuffle(arr){ return [...arr].sort(() => Math.random() - 0.5); }
function sample(arr, count){ return shuffle(arr).slice(0, Math.min(count, arr.length)); }

function loadProfiles(){
  const raw = JSON.parse(localStorage.getItem('itp_profiles') || '[]');
  return raw.filter(p => p && !['Husband','Friend'].includes(p));
}
function saveProfiles(list){ localStorage.setItem('itp_profiles', JSON.stringify(list)); }
function profileKey(){ return `itp_data_${currentProfile}`; }
function defaultData(){ return { wrong:{}, fav:{}, tests:[], answered:0, correct:0, progress:{}, lastQuestion:null }; }
function getData(){ const saved = JSON.parse(localStorage.getItem(profileKey()) || '{}'); return Object.assign(defaultData(), saved, { progress: saved.progress || {} }); }
function setData(data){ localStorage.setItem(profileKey(), JSON.stringify(data)); }

function requireProfile(){
  if (currentProfile) return true;
  addProfile();
  return !!currentProfile;
}
function initProfiles(){
  const profiles = loadProfiles();
  if (!profiles.includes(currentProfile)) currentProfile = profiles[0] || '';
  localStorage.setItem('itp_profile', currentProfile);
  $('profileSelect').innerHTML = currentProfile ? profiles.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('') : '<option value="">Створи профіль</option>';
  $('profileSelect').value = currentProfile;
}
function addProfile(){
  const name = prompt(t('addProfile'));
  if (!name) return;
  const clean = name.trim();
  if (!clean) return;
  const profiles = loadProfiles();
  if (!profiles.includes(clean)) profiles.push(clean);
  saveProfiles(profiles);
  currentProfile = clean;
  localStorage.setItem('itp_profile', clean);
  initProfiles();
  showHome();
}

function normalizeImageName(img){
  if (!img) return '';
  const file = String(img).split('/').pop();
  return file.replace(/\.PNG$/, '.png');
}
function imageCandidates(q){
  const base = normalizeImageName(q.image) || `${q.id}.png`;
  const noExt = base.replace(/\.(png|PNG|jpg|JPG|jpeg|JPEG)$/,'');
  return [base, `${noExt}.png`, `${noExt}.PNG`, `${noExt}.jpg`, `${noExt}.jpeg`, `images/${base}`, `images/${noExt}.png`, `images/${noExt}.PNG`, `images/${noExt}.jpg`, `images/${noExt}.jpeg`];
}
function setQuestionImage(q){
  const img = $('qImg');
  const noImage = $('noImage');
  const candidates = [...new Set(imageCandidates(q))];
  let i = 0;
  noImage.classList.add('hidden');
  img.classList.add('hidden');
  img.removeAttribute('src');
  img.onerror = () => {
    i++;
    if (i < candidates.length) img.src = candidates[i];
    else { img.classList.add('hidden'); noImage.classList.add('hidden'); }
  };
  img.onload = () => { img.classList.remove('hidden'); noImage.classList.add('hidden'); };
  if (candidates.length) img.src = candidates[0];
}

function topicFor(q){
  const s = `${rawText(q.question,'en')} ${q.options?.map(o=>rawText(o,'en')).join(' ') || ''}`.toLowerCase();
  if (s.includes('sign') || s.includes('traffic light') || s.includes('marking')) return 'signs';
  if (s.includes('speed') || s.includes('limit') || s.includes('km/h')) return 'speed';
  if (s.includes('park') || s.includes('parking') || s.includes('clearway')) return 'parking';
  if (s.includes('motorway') || s.includes('dual carriageway')) return 'motorway';
  if (s.includes('tyre') || s.includes('brake') || s.includes('oil') || s.includes('battery') || s.includes('vehicle') || s.includes('light')) return 'vehicle';
  if (s.includes('fine') || s.includes('penalty') || s.includes('licence') || s.includes('insurance') || s.includes('garda') || s.includes('tax')) return 'law';
  if (s.includes('emergency') || s.includes('hazard') || s.includes('skid') || s.includes('fog') || s.includes('wet') || s.includes('breakdown')) return 'hazards';
  return 'rules';
}
function filteredByTopic(topic){ return topic === 'all' ? questions : questions.filter(q => topicFor(q) === topic); }

function getOrder(q){
  if (!optionOrders[q.id]) optionOrders[q.id] = shuffle(q.options.map((_, i) => i));
  return optionOrders[q.id];
}
function showExamIntro(){
  if (!requireProfile()) return;
  $('home').classList.add('hidden');
  $('quiz').classList.add('hidden');
  $('result').classList.add('hidden');
  $('stats').classList.add('hidden');
  $('examIntro').classList.remove('hidden');
}
function beginExam(){
  if (!requireProfile()) return;
  mode = 'exam40';
  answers = {};
  optionOrders = {};
  flagged = {};
  pos = 0;
  stopTimer();
  session = sample(questions, 40);
  if (!session.length) return alert(t('empty'));
  $('examIntro').classList.add('hidden');
  showQuiz();
  startTimer();
  render();
}
function start(selectedMode){
  if (selectedMode === 'exam40') return showExamIntro();
  if (!requireProfile()) return;
  mode = selectedMode;
  answers = {};
  optionOrders = {};
  flagged = {};
  pos = 0;
  stopTimer();
  const data = getData();
  const pool = filteredByTopic(currentTopic);
  if (mode === 'random10') session = sample(pool, 10);
  if (mode === 'random20') session = sample(pool, 20);
  if (mode === 'all') session = [...pool].sort((a,b)=>a.id-b.id);
  if (mode === 'wrong') session = questions.filter(q => data.wrong[q.id]);
  if (mode === 'fav') session = questions.filter(q => data.fav[q.id]);
  if (mode === 'stats') return showStats();
  if (!session.length) return alert(t('empty'));
  showQuiz();
  render();
}
function startQuestionByNumber(id){
  if (!requireProfile()) return;
  const sorted = [...questions].sort((a,b)=>a.id-b.id);
  const index = sorted.findIndex(x => Number(x.id) === Number(id));
  if (index < 0) return alert('Питання не знайдено');
  mode = 'search'; session = sorted; answers = {}; optionOrders = {}; pos = index; stopTimer(); showQuiz(); render();
}
function startTopic(){ currentTopic = $('topicSelect').value; start('all'); }

function showQuiz(){ $('home').classList.add('hidden'); $('examIntro').classList.add('hidden'); $('result').classList.add('hidden'); $('stats').classList.add('hidden'); $('quiz').classList.remove('hidden'); }
function showHome(){ stopTimer(); $('quiz').classList.add('hidden'); $('examIntro').classList.add('hidden'); $('result').classList.add('hidden'); $('stats').classList.add('hidden'); $('home').classList.remove('hidden'); updateResumeCard(); }

function saveLastQuestion(q){
  if (!currentProfile || !q || !['all','search'].includes(mode)) return;
  const data = getData();
  data.lastQuestion = Number(q.id);
  setData(data);
  updateResumeCard();
}
function updateResumeCard(){
  const card = $('resumeCard');
  if (!card) return;
  if (!currentProfile) { card.classList.add('hidden'); return; }
  const last = Number(getData().lastQuestion || 0);
  if (!last) { card.classList.add('hidden'); return; }
  $('resumeText').textContent = `Останнє питання: №${last}`;
  card.classList.remove('hidden');
}
function continueLastQuestion(){
  const last = Number(getData().lastQuestion || 0);
  if (last) startQuestionByNumber(last);
}

function render(){
  const q = session[pos];
  const data = getData();
  saveLastQuestion(q);
  $('counter').textContent = `${pos + 1} / ${session.length}`;
  $('bar').style.width = `${((pos + 1) / session.length) * 100}%`;
  $('qid').textContent = mode === 'exam40' ? `${bilingualLabel('questionWord')} ${pos + 1} ${bilingualLabel('ofWord')} ${session.length}` : `№ ${q.id}`;
  $('modeLabel').textContent = modeLabel();
  $('question').innerHTML = displayHtml(q.question);
  $('favBtn').textContent = data.fav[q.id] ? '★' : '☆';
  $('favBtn').classList.toggle('hidden', mode === 'exam40');
  $('flagBtn').classList.add('hidden');
  $('timer').classList.toggle('hidden', mode !== 'exam40');
  $('examNavigator').classList.add('hidden');
  $('finishExamBtn').classList.toggle('hidden', mode !== 'exam40');
  setQuestionImage(q);

  const saved = answers[q.id];
  $('answers').innerHTML = '';
  getOrder(q).forEach(originalIdx => {
    const opt = q.options[originalIdx];
    const btn = document.createElement('button');
    btn.className = 'answer';
    btn.innerHTML = displayHtml(opt);
    btn.onclick = () => choose(originalIdx);
    if (saved !== undefined) {
      if (mode !== 'exam40') {
        if (originalIdx === q.correctIndex) btn.classList.add('correct');
        if (originalIdx === saved && originalIdx !== q.correctIndex) btn.classList.add('wrong');
      } else if (originalIdx === saved) btn.classList.add('selected');
    }
    $('answers').appendChild(btn);
  });

  const showFeedback = saved !== undefined && mode !== 'exam40';
  $('feedback').classList.toggle('hidden', !showFeedback);
  if (showFeedback) {
    const ok = saved === q.correctIndex;
    $('feedback').className = `feedback ${ok ? 'good' : 'bad'}`;
    $('feedback').innerHTML = ok ? t('correct') : `${t('wrong')}<br><b>Correct answer:</b> ${displayHtml(q.options[q.correctIndex])}`;
  }
  if (mode === 'exam40') {
    $('prevBtn').classList.add('hidden');
    $('nextBtn').disabled = saved === undefined;
    $('nextBtn').textContent = pos === session.length - 1 ? t('finish') : t('next');
  } else {
    $('prevBtn').classList.remove('hidden');
    $('prevBtn').disabled = pos === 0;
    $('nextBtn').disabled = false;
    $('nextBtn').textContent = pos === session.length - 1 ? t('finish') : t('next');
  }
}
function renderExamNavigator(){
  $('examNavigator').innerHTML = session.map((q,i) => {
    const answered = answers[q.id] !== undefined;
    const isFlagged = !!flagged[q.id];
    const classes = ['exam-number', answered ? 'answered' : '', isFlagged ? 'flagged' : '', i === pos ? 'current' : ''].filter(Boolean).join(' ');
    return `<button class="${classes}" data-exam-index="${i}" aria-label="Питання ${i+1}">${i+1}</button>`;
  }).join('');
  $('examNavigator').querySelectorAll('[data-exam-index]').forEach(btn => btn.onclick = () => { pos = Number(btn.dataset.examIndex); render(); window.scrollTo({top:0,behavior:'smooth'}); });
}
function toggleFlag(){
  if (mode !== 'exam40') return;
  const q = session[pos];
  if (flagged[q.id]) delete flagged[q.id]; else flagged[q.id] = true;
  render();
}
function modeLabel(){ return {random10:'10 Random', random20:'20 Random', exam40:'Official Exam 40 / 45 min', all: currentTopic === 'all' ? 'Усі питання' : `Тема: ${$('topicSelect').selectedOptions[0]?.textContent || ''}`, wrong:'Мої помилки', fav:'Обране', search:'Пошук'}[mode] || ''; }
function choose(idx){ const q = session[pos]; answers[q.id] = idx; if (mode !== 'exam40') updateProgress(q, idx); render(); }
function applyProgress(data, q, idx){
  data.progress = data.progress || {};
  data.progress[q.id] = idx === q.correctIndex;
  data.answered = (data.answered || 0) + 1;
  if (idx === q.correctIndex) {
    data.correct = (data.correct || 0) + 1;
    delete data.wrong[q.id];
  } else data.wrong[q.id] = true;
  return data;
}
function updateProgress(q, idx){ const data = applyProgress(getData(), q, idx); setData(data); }
function requestFinish(forced=false){
  if (mode !== 'exam40' || forced) return finish(forced);
  const unanswered = session.filter(q => answers[q.id] === undefined).length;
  const msg = unanswered
    ? `У вас залишилося ${unanswered} питань без відповіді. Завершити іспит?`
    : 'Завершити іспит і показати результат?';
  if (confirm(msg)) finish(false);
}
function finish(forced=false){
  stopTimer();
  let correct = 0;
  const data = getData();
  const mistakes = [];
  session.forEach(q => {
    const ans = answers[q.id];
    const ok = ans !== undefined && ans === q.correctIndex;
    if (ok) correct++;
    if (mode === 'exam40' && ans !== undefined) applyProgress(data, q, ans);
    if (!ok) {
      data.wrong[q.id] = true;
      mistakes.push({q, ans});
    } else delete data.wrong[q.id];
  });
  const total = session.length;
  const incorrect = total - correct;
  const unanswered = session.filter(q => answers[q.id] === undefined).length;
  const isExam = mode === 'exam40';
  const pass = !isExam || correct >= 35;
  const used = examStartedAt ? Math.min(45*60, Math.round((Date.now() - examStartedAt) / 1000)) : null;
  if (isExam) data.tests.push({date:new Date().toISOString(), correct, total, incorrect, unanswered, pass, seconds:used});
  setData(data);
  lastExamMistakes = mistakes;
  $('quiz').classList.add('hidden');
  $('home').classList.add('hidden');
  $('examIntro').classList.add('hidden');
  $('result').classList.remove('hidden');
  $('resultTitle').textContent = isExam ? (pass ? bilingualLabel('pass') : bilingualLabel('fail')) : bilingualLabel('result');
  const pct = total ? Math.round(correct/total*100) : 0;
  $('resultText').innerHTML = `${forced ? `<b>${bilingualLabel('timeout')}</b><br>` : ''}${bilingualLabel('correctCount')}: <b>${correct}/${total}</b><br>${bilingualLabel('mistakes')}: <b>${incorrect}</b><br>${bilingualLabel('unanswered')}: <b>${unanswered}</b><br>${bilingualLabel('score')}: <b>${pct}%</b>${isExam ? `<br>${bilingualLabel('need')}` : ''}${used !== null ? `<br>${bilingualLabel('usedTime')}: ${formatTime(used)}` : ''}`;
  $('resultList').innerHTML = mistakes.length ? mistakes.map(({q,ans}) => {
    const examNumber = session.findIndex(item => item.id === q.id) + 1;
    const your = ans === undefined ? bilingualLabel('noAnswer') : displayHtml(q.options[ans]);
    const right = displayHtml(q.options[q.correctIndex]);
    return `<details class="mistake-detail"><summary><b>${bilingualLabel('questionWord')} ${examNumber}</b> ${displayHtml(q.question)}</summary><p><b>${bilingualLabel('yourAnswer')}:</b> ${your}</p><p><b>${bilingualLabel('rightAnswer')}:</b> ${right}</p></details>`;
  }).join('') : `<div class="mini">${bilingualLabel('noMistakes')}</div>`;
}
function startTimer(){ timeLeft = 45 * 60; examStartedAt = Date.now(); tick(); timerId = setInterval(tick, 1000); }
function stopTimer(){ if (timerId) clearInterval(timerId); timerId = null; $('timer').classList.add('hidden'); }
function tick(){ $('timer').textContent = formatTime(Math.max(0,timeLeft)); if (timeLeft <= 0) { requestFinish(true); return; } timeLeft--; }
function formatTime(sec){ const m = Math.floor(sec/60); const s = sec%60; return `${m}:${String(s).padStart(2,'0')}`; }
function showStats(){
  if (!requireProfile()) return;
  const data = getData();
  const tests = data.tests || [];
  const progress = data.progress || {};
  const completed = Object.keys(progress).length;
  const correctUnique = Object.values(progress).filter(Boolean).length;
  const incorrectUnique = completed - correctUnique;
  const progressPct = questions.length ? ((completed / questions.length) * 100).toFixed(1) : '0.0';
  const accuracy = completed ? ((correctUnique / completed) * 100).toFixed(1) : '0.0';
  const best = tests.length ? Math.max(...tests.map(t => t.correct)) : 0;
  const avg = tests.length ? (tests.reduce((a,t)=>a+t.correct,0)/tests.length).toFixed(1) : 0;
  $('home').classList.add('hidden'); $('examIntro').classList.add('hidden'); $('quiz').classList.add('hidden'); $('result').classList.add('hidden'); $('stats').classList.remove('hidden');
  $('statsText').innerHTML = `
    <b>Профіль:</b> ${escapeHtml(currentProfile)}
    <div class="progress-summary">
      <div class="stat-box"><b>${completed}/${questions.length}</b><span>Пройдено питань</span></div>
      <div class="stat-box"><b>${progressPct}%</b><span>Прогрес</span></div>
      <div class="stat-box"><b>${correctUnique}</b><span>Правильних</span></div>
      <div class="stat-box"><b>${accuracy}%</b><span>Точність</span></div>
    </div>
    <b>Неправильних:</b> ${incorrectUnique}<br>
    <b>Питань у помилках:</b> ${Object.keys(data.wrong||{}).length}<br>
    <b>Обране:</b> ${Object.keys(data.fav||{}).length}<br>
    <b>Офіційних іспитів:</b> ${tests.length}<br>
    <b>Найкращий результат:</b> ${best}/40<br>
    <b>Середній результат:</b> ${avg}/40`;
  $('statsList').innerHTML = tests.slice(-10).reverse().map(t => `<div class="mini">${new Date(t.date).toLocaleDateString()} — <b>${t.correct}/${t.total}</b> ${t.pass ? 'PASS ✅' : 'FAIL ❌'} ${t.seconds ? `(${formatTime(t.seconds)})` : ''}</div>`).join('') || '<div class="mini">Результатів іспитів поки немає</div>';
}

function checkAccess(){
  if (localStorage.getItem('itp_access_ok') === 'yes') { $('accessScreen').classList.add('hidden'); $('appShell').classList.remove('hidden'); return; }
  $('accessScreen').classList.remove('hidden'); $('appShell').classList.add('hidden');
}

$('accessBtn').onclick = () => { if ($('accessCode').value.trim() === ACCESS_CODE) { localStorage.setItem('itp_access_ok','yes'); checkAccess(); } else $('accessError').classList.remove('hidden'); };
$('accessCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('accessBtn').click(); });
$('nextBtn').onclick = () => { if (mode === 'exam40' && answers[session[pos].id] === undefined) return; if (pos < session.length - 1) { pos++; render(); window.scrollTo({top:0,behavior:'smooth'}); } else requestFinish(); };
$('prevBtn').onclick = () => { if (mode === 'exam40') return; if (pos > 0) { pos--; render(); } };
$('backBtn').onclick = () => { if (mode === 'exam40' && !confirm('Вийти з іспиту? Поточна спроба не буде збережена.')) return; showHome(); }; $('homeBtn').onclick = showHome; $('statsHomeBtn').onclick = showHome;
$('examStartBtn').onclick = beginExam;
$('examIntroHomeBtn').onclick = showHome;
$('flagBtn').onclick = toggleFlag;
$('finishExamBtn').onclick = () => requestFinish(false);
$('favBtn').onclick = () => { const q = session[pos]; const data = getData(); if (data.fav[q.id]) delete data.fav[q.id]; else data.fav[q.id] = true; setData(data); render(); };
$('lang').value = lang; $('lang').onchange = e => { lang = e.target.value; localStorage.setItem('itp_lang', lang); if (!$('quiz').classList.contains('hidden')) render(); };
$('themeBtn').onclick = () => { document.body.classList.toggle('dark'); localStorage.setItem('itp_theme', document.body.classList.contains('dark') ? 'dark' : 'light'); };
$('resetBtn').onclick = () => { if (!currentProfile) return; if (confirm(t('resetConfirm'))) { localStorage.removeItem(profileKey()); alert('Готово'); showHome(); } };
$('profileSelect').onchange = e => { currentProfile = e.target.value; localStorage.setItem('itp_profile', currentProfile); showHome(); };
$('addProfileBtn').onclick = addProfile;
$('searchBtn').onclick = () => startQuestionByNumber($('searchNumber').value);
$('searchNumber').addEventListener('keydown', e => { if (e.key === 'Enter') $('searchBtn').click(); });
$('topicBtn').onclick = startTopic;
$('resumeBtn').onclick = continueLastQuestion;
document.querySelectorAll('[data-mode]').forEach(btn => btn.onclick = () => start(btn.dataset.mode));
if (localStorage.getItem('itp_theme') === 'dark') document.body.classList.add('dark');

checkAccess();
fetch('questions.json').then(r => r.json()).then(data => { questions = data; $('totalCount').textContent = questions.length; initProfiles(); updateResumeCard(); }).catch(() => alert('Could not load questions.json'));
