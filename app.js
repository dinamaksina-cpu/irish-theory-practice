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

const labels = {
  ua: {empty:'Тут поки немає питань', correct:'Правильно ✅', wrong:'Неправильно ❌', next:'Далі', finish:'Завершити', back:'Назад', pass:'PASS ✅', fail:'FAIL ❌', result:'Результат', need:'Потрібно мінімум 35 правильних відповідей із 40.', timeout:'Час завершився.', resetConfirm:'Скинути прогрес тільки для цього профілю?', addProfile:'Введи ім’я нового профілю'},
  en: {empty:'No questions here yet', correct:'Correct ✅', wrong:'Wrong ❌', next:'Next', finish:'Finish', back:'Back', pass:'PASS ✅', fail:'FAIL ❌', result:'Result', need:'You need at least 35 correct answers out of 40.', timeout:'Time is up.', resetConfirm:'Reset progress only for this profile?', addProfile:'Enter new profile name'},
  ru: {empty:'Здесь пока нет вопросов', correct:'Правильно ✅', wrong:'Неправильно ❌', next:'Далее', finish:'Завершить', back:'Назад', pass:'PASS ✅', fail:'FAIL ❌', result:'Результат', need:'Нужно минимум 35 правильных ответов из 40.', timeout:'Время закончилось.', resetConfirm:'Сбросить прогресс только для этого профиля?', addProfile:'Введите имя нового профиля'}
};

function primaryLang(){ return lang.startsWith('en') ? 'en' : lang; }
function t(key){ return (labels[primaryLang()] || labels.en)[key] || key; }
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
function defaultData(){ return { wrong:{}, fav:{}, tests:[], answered:0, correct:0 }; }
function getData(){ return Object.assign(defaultData(), JSON.parse(localStorage.getItem(profileKey()) || '{}')); }
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
  img.classList.remove('hidden');
  img.onerror = () => {
    i++;
    if (i < candidates.length) img.src = candidates[i];
    else { img.classList.add('hidden'); noImage.classList.add('hidden'); }
  };
  img.onload = () => { img.classList.remove('hidden'); noImage.classList.add('hidden'); };
  img.src = candidates[0];
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
function start(selectedMode){
  if (!requireProfile()) return;
  mode = selectedMode;
  answers = {};
  optionOrders = {};
  pos = 0;
  stopTimer();
  const data = getData();
  const pool = filteredByTopic(currentTopic);
  if (mode === 'random10') session = sample(pool, 10);
  if (mode === 'random20') session = sample(pool, 20);
  if (mode === 'exam40') session = sample(questions, 40);
  if (mode === 'all') session = [...pool].sort((a,b)=>a.id-b.id);
  if (mode === 'wrong') session = questions.filter(q => data.wrong[q.id]);
  if (mode === 'fav') session = questions.filter(q => data.fav[q.id]);
  if (mode === 'stats') return showStats();
  if (!session.length) return alert(t('empty'));
  showQuiz();
  if (mode === 'exam40') startTimer();
  render();
}
function startQuestionByNumber(id){
  if (!requireProfile()) return;
  const q = questions.find(x => Number(x.id) === Number(id));
  if (!q) return alert('Питання не знайдено');
  mode = 'search'; session = [q]; answers = {}; optionOrders = {}; pos = 0; stopTimer(); showQuiz(); render();
}
function startTopic(){ currentTopic = $('topicSelect').value; start('all'); }

function showQuiz(){ $('home').classList.add('hidden'); $('result').classList.add('hidden'); $('stats').classList.add('hidden'); $('quiz').classList.remove('hidden'); }
function showHome(){ stopTimer(); $('quiz').classList.add('hidden'); $('result').classList.add('hidden'); $('stats').classList.add('hidden'); $('home').classList.remove('hidden'); }

function render(){
  const q = session[pos];
  const data = getData();
  $('counter').textContent = `${pos + 1} / ${session.length}`;
  $('bar').style.width = `${((pos + 1) / session.length) * 100}%`;
  $('qid').textContent = `№ ${q.id}`;
  $('modeLabel').textContent = modeLabel();
  $('question').innerHTML = displayHtml(q.question);
  $('favBtn').textContent = data.fav[q.id] ? '★' : '☆';
  $('timer').classList.toggle('hidden', mode !== 'exam40');
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
  $('prevBtn').disabled = pos === 0;
  $('nextBtn').textContent = pos === session.length - 1 ? t('finish') : t('next');
}
function modeLabel(){ return {random10:'10 Random', random20:'20 Random', exam40:'Official Exam 40 / 45 min', all: currentTopic === 'all' ? 'Усі питання' : `Тема: ${$('topicSelect').selectedOptions[0]?.textContent || ''}`, wrong:'Мої помилки', fav:'Обране', search:'Пошук'}[mode] || ''; }
function choose(idx){ const q = session[pos]; answers[q.id] = idx; if (mode !== 'exam40') updateProgress(q, idx); render(); }
function updateProgress(q, idx){ const data = getData(); data.answered += 1; if (idx === q.correctIndex) { data.correct += 1; delete data.wrong[q.id]; } else data.wrong[q.id] = true; setData(data); }
function finish(forced=false){
  stopTimer(); let correct = 0; const data = getData(); const mistakes = [];
  session.forEach(q => { const ans = answers[q.id]; const ok = ans === q.correctIndex; if (ok) correct++; if (ans !== undefined) updateProgress(q, ans); if (!ok) { data.wrong[q.id] = true; mistakes.push(q); } else delete data.wrong[q.id]; });
  const total = session.length; const incorrect = total - correct; const isExam = mode === 'exam40'; const pass = !isExam || correct >= 35; const used = examStartedAt ? Math.round((Date.now() - examStartedAt) / 1000) : null;
  if (isExam) data.tests.push({date:new Date().toISOString(), correct, total, incorrect, pass, seconds: used});
  setData(data);
  $('quiz').classList.add('hidden'); $('home').classList.add('hidden'); $('result').classList.remove('hidden');
  $('resultTitle').textContent = isExam ? (pass ? t('pass') : t('fail')) : t('result');
  $('resultText').innerHTML = `${forced ? `<b>${t('timeout')}</b><br>` : ''}Правильно: <b>${correct}/${total}</b><br>Помилок: <b>${incorrect}</b>${isExam ? `<br>${t('need')}` : ''}${used ? `<br>Time: ${formatTime(used)}` : ''}`;
  $('resultList').innerHTML = mistakes.slice(0, 50).map(q => `<div class="mini"><b>№${q.id}</b> ${escapeHtml(plainText(q.question))}</div>`).join('') || '<div class="mini">Без помилок 🎉</div>';
}
function startTimer(){ timeLeft = 45 * 60; examStartedAt = Date.now(); tick(); timerId = setInterval(tick, 1000); }
function stopTimer(){ if (timerId) clearInterval(timerId); timerId = null; $('timer').classList.add('hidden'); }
function tick(){ $('timer').textContent = formatTime(timeLeft); if (timeLeft <= 0) finish(true); timeLeft--; }
function formatTime(sec){ const m = Math.floor(sec/60); const s = sec%60; return `${m}:${String(s).padStart(2,'0')}`; }
function showStats(){
  if (!requireProfile()) return;
  const data = getData(); const tests = data.tests || []; const best = tests.length ? Math.max(...tests.map(t => t.correct)) : 0; const avg = tests.length ? (tests.reduce((a,t)=>a+t.correct,0)/tests.length).toFixed(1) : 0;
  $('home').classList.add('hidden'); $('quiz').classList.add('hidden'); $('result').classList.add('hidden'); $('stats').classList.remove('hidden');
  $('statsText').innerHTML = `<b>Profile:</b> ${escapeHtml(currentProfile)}<br><b>Wrong questions:</b> ${Object.keys(data.wrong||{}).length}<br><b>Favorites:</b> ${Object.keys(data.fav||{}).length}<br><b>Official exams:</b> ${tests.length}<br><b>Best:</b> ${best}/40<br><b>Average:</b> ${avg}/40`;
  $('statsList').innerHTML = tests.slice(-10).reverse().map(t => `<div class="mini">${new Date(t.date).toLocaleDateString()} — <b>${t.correct}/${t.total}</b> ${t.pass ? 'PASS ✅' : 'FAIL ❌'} ${t.seconds ? `(${formatTime(t.seconds)})` : ''}</div>`).join('') || '<div class="mini">No exam results yet</div>';
}
function checkAccess(){
  if (localStorage.getItem('itp_access_ok') === 'yes') { $('accessScreen').classList.add('hidden'); $('appShell').classList.remove('hidden'); return; }
  $('accessScreen').classList.remove('hidden'); $('appShell').classList.add('hidden');
}

$('accessBtn').onclick = () => { if ($('accessCode').value.trim() === ACCESS_CODE) { localStorage.setItem('itp_access_ok','yes'); checkAccess(); } else $('accessError').classList.remove('hidden'); };
$('accessCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('accessBtn').click(); });
$('nextBtn').onclick = () => { if (pos < session.length - 1) { pos++; render(); } else finish(); };
$('prevBtn').onclick = () => { if (pos > 0) { pos--; render(); } };
$('backBtn').onclick = showHome; $('homeBtn').onclick = showHome; $('statsHomeBtn').onclick = showHome;
$('favBtn').onclick = () => { const q = session[pos]; const data = getData(); if (data.fav[q.id]) delete data.fav[q.id]; else data.fav[q.id] = true; setData(data); render(); };
$('lang').value = lang; $('lang').onchange = e => { lang = e.target.value; localStorage.setItem('itp_lang', lang); if (!$('quiz').classList.contains('hidden')) render(); };
$('themeBtn').onclick = () => { document.body.classList.toggle('dark'); localStorage.setItem('itp_theme', document.body.classList.contains('dark') ? 'dark' : 'light'); };
$('resetBtn').onclick = () => { if (!currentProfile) return; if (confirm(t('resetConfirm'))) { localStorage.removeItem(profileKey()); alert('Готово'); showHome(); } };
$('profileSelect').onchange = e => { currentProfile = e.target.value; localStorage.setItem('itp_profile', currentProfile); showHome(); };
$('addProfileBtn').onclick = addProfile;
$('searchBtn').onclick = () => startQuestionByNumber($('searchNumber').value);
$('searchNumber').addEventListener('keydown', e => { if (e.key === 'Enter') $('searchBtn').click(); });
$('topicBtn').onclick = startTopic;
document.querySelectorAll('[data-mode]').forEach(btn => btn.onclick = () => start(btn.dataset.mode));
if (localStorage.getItem('itp_theme') === 'dark') document.body.classList.add('dark');

checkAccess();
fetch('questions.json').then(r => r.json()).then(data => { questions = data; $('totalCount').textContent = questions.length; initProfiles(); }).catch(() => alert('Could not load questions.json'));
