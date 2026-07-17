const demoQuestions = [
  {
    topic: 'Пішоходи',
    question: 'Що повинен зробити водій, наближаючись до пішохідного переходу?',
    answers: [
      'Збільшити швидкість і проїхати першим.',
      'Подати звуковий сигнал пішоходам.',
      'Зменшити швидкість і бути готовим зупинитися.',
      'Проїхати перехід, якщо пішоходів немає на переході.'
    ]
  },
  {
    topic: 'Дорожні знаки',
    question: 'Що означає цей дорожній знак?',
    answers: ['Попередження про небезпеку.', 'Кінець обмеження.', 'Обов’язковий напрямок руху.', 'Місце для паркування.']
  },
  {
    topic: 'Безпечне водіння',
    question: 'Коли слід збільшити дистанцію до автомобіля попереду?',
    answers: ['Лише вночі.', 'Під час дощу або поганої видимості.', 'Тільки на автомагістралі.', 'Коли дорога порожня.']
  }
];

const state = { current: 0, selected: {}, saved: false, total: 20 };
const $ = (s) => document.querySelector(s);
const answersEl = $('#answers');
const progressEl = $('#segmentedProgress');

function renderProgress(){
  progressEl.innerHTML = '';
  for(let i=0;i<state.total;i++){
    const seg = document.createElement('span');
    seg.className = 'segment';
    if(i < state.current) seg.classList.add('answered');
    if(i === state.current) seg.classList.add('active');
    progressEl.appendChild(seg);
  }
  $('#progressText').textContent = `${state.current + 1} / ${state.total}`;
  $('#progressPercent').textContent = `${Math.round(((state.current + 1)/state.total)*100)}%`;
  $('#questionCounter').textContent = `Питання ${state.current + 1} із ${state.total}`;
}

function renderQuestion(){
  const q = demoQuestions[state.current % demoQuestions.length];
  $('#topic').textContent = q.topic;
  $('#questionText').textContent = q.question;
  answersEl.innerHTML = '';
  q.answers.forEach((text,index)=>{
    const button = document.createElement('button');
    button.className = 'answer';
    if(state.selected[state.current] === index) button.classList.add('selected');
    button.innerHTML = `<span class="answer-letter">${String.fromCharCode(65+index)}</span><span class="answer-text"></span><span class="answer-mark">✓</span>`;
    button.querySelector('.answer-text').textContent = text;
    button.addEventListener('click',()=>{
      state.selected[state.current] = index;
      renderQuestion();
    });
    answersEl.appendChild(button);
  });
  $('#prevBtn').disabled = state.current === 0;
  $('#nextBtn').innerHTML = state.current === state.total-1 ? 'Завершити' : 'Далі <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
  renderProgress();
  window.scrollTo({top:0,behavior:'smooth'});
}

function showToast(text){
  const toast=$('#toast');
  toast.textContent=text;toast.classList.add('show');
  clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1800);
}

$('#prevBtn').addEventListener('click',()=>{if(state.current>0){state.current--;renderQuestion();}});
$('#nextBtn').addEventListener('click',()=>{
  if(state.current < state.total-1){state.current++;renderQuestion();}
  else showToast('Практику завершено');
});
$('#saveBtn').addEventListener('click',()=>{
  state.saved=!state.saved;
  $('#saveBtn').classList.toggle('is-saved',state.saved);
  showToast(state.saved?'Питання збережено':'Видалено із збережених');
});
$('#settingsBtn').addEventListener('click',()=>$('#settingsSheet').hidden=false);
$('#closeSettings').addEventListener('click',()=>$('#settingsSheet').hidden=true);
$('#settingsSheet').addEventListener('click',(e)=>{if(e.target.id==='settingsSheet')e.currentTarget.hidden=true;});
$('#imageFrame').addEventListener('click',()=>$('#imageModal').hidden=false);
$('#closeImage').addEventListener('click',()=>$('#imageModal').hidden=true);
$('#imageModal').addEventListener('click',(e)=>{if(e.target.id==='imageModal')e.currentTarget.hidden=true;});
$('#exitBtn').addEventListener('click',()=>showToast('Тут буде ваша логіка виходу'));

renderQuestion();
