// =============================
// Feedback Radar – Lógica JS
// =============================
const STORAGE_KEY = 'fr_feedbacks_v1';
const state = {
  feedbacks: [],        // todos os feedbacks
  filters: new Set([1,2,3,4,5]), // filtros ativos para a lista
  chartUsesFilter: false // se true, o gráfico usa os filtros
};

// Utilidades
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

// DOM refs
const form = $('#feedbackForm');
const listEl = $('#feedbackList');
const emptyEl = $('#emptyState');
const countLabel = $('#countLabel');
const toast = $('#toast');
const chartUsesFilterChk = $('#chartUsesFilter');

// Carrega do LocalStorage
function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    state.feedbacks = raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Erro ao ler LocalStorage', e);
    state.feedbacks = [];
  }
}

// Salva no LocalStorage
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.feedbacks));
}

// Renderiza lista com base nos filtros
function renderList(){
  listEl.innerHTML = '';
  const filtered = state.feedbacks.filter(f => state.filters.has(f.rating));
  countLabel.textContent = `${filtered.length} feedback(s)`;
  if(filtered.length === 0){
    emptyEl.hidden = false; return;
  }
  emptyEl.hidden = true;

  for(const f of filtered.sort((a,b)=>b.createdAt - a.createdAt)){
    const item = document.createElement('div');
    item.className = 'feedback-item';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden','true');

    const body = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = f.name;
    const meta = document.createElement('div');
    meta.className = 'small';
    meta.style.margin = '2px 0 6px';
    meta.textContent = new Date(f.createdAt).toLocaleString();
    const comment = document.createElement('div');
    comment.textContent = f.comment || '—';

    const stars = document.createElement('div');
    stars.className = 'stars';
    stars.innerHTML = '★'.repeat(f.rating) + '<span style="opacity:.25">' + '★'.repeat(5-f.rating) + '</span>';

    body.append(name, meta, comment);

    // Ações (editar/remover)
    const actions = document.createElement('div');
    actions.className = 'inline';
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `Nota ${f.rating}`;
    const editBtn = document.createElement('button');
    editBtn.className = 'btn';
    editBtn.textContent = 'Editar';
    editBtn.onclick = () => editFeedback(f.id);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn';
    delBtn.textContent = 'Excluir';
    delBtn.onclick = () => deleteFeedback(f.id);
    actions.append(chip, stars, editBtn, delBtn);

    item.append(avatar, body, actions);
    listEl.appendChild(item);
  }
}

// Atualiza gráfico (usa filtros se marcado)
let chart;
function updateChart(){
  const source = chartUsesFilterChk.checked ? state.feedbacks.filter(f=>state.filters.has(f.rating)) : state.feedbacks;
  const counts = [1,2,3,4,5].map(n => source.filter(f => f.rating === n).length);
  const data = {
    labels: ['1','2','3','4','5'],
    datasets: [{
      label: 'Quantidade de avaliações',
      data: counts,
      borderWidth: 2,
      borderColor: 'rgba(231,165,255,.9)',
      backgroundColor: ['rgba(255,107,107,.35)','rgba(255,211,110,.35)','rgba(231,165,255,.35)','rgba(113,214,200,.35)','rgba(61,214,140,.35)']
    }]
  };
  const options = {
    responsive:true,
    plugins:{
      legend:{labels:{color:'#eaeaf2'}},
      tooltip:{enabled:true}
    },
    scales:{
      x:{ticks:{color:'#cfd0e6'}, grid:{color:'rgba(255,255,255,.06)'}},
      y:{beginAtZero:true,ticks:{color:'#cfd0e6', precision:0}, grid:{color:'rgba(255,255,255,.06)'}}
    }
  };
  if(!chart){
    const ctx = document.getElementById('ratingChart');
    chart = new Chart(ctx, { type:'bar', data, options });
  }else{
    chart.data = data; chart.update();
  }
}

// Cria novo feedback
function createFeedback(data){
  const fb = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    rating: Number(data.rating),
    occasion: data.occasion || 'geral',
    comment: (data.comment || '').trim(),
    createdAt: Date.now()
  };
  state.feedbacks.push(fb);
  save();
  renderList();
  updateChart();
  showToast('Feedback enviado. Obrigado por contribuir! 🎉');
}

// Editar feedback (in-place preenchendo o form)
function editFeedback(id){
  const f = state.feedbacks.find(x => x.id === id);
  if(!f) return;
  $('#name').value = f.name;
  $('#rating').value = String(f.rating);
  $('#occasion').value = f.occasion;
  $('#comment').value = f.comment;
  form.dataset.editing = id; // flag de edição
  showToast('Editando feedback. Altere os campos e clique em Enviar ✍️');
  window.scrollTo({top: form.getBoundingClientRect().top + window.scrollY - 100, behavior:'smooth'});
}

// Atualiza feedback existente
function updateFeedback(id, data){
  const idx = state.feedbacks.findIndex(x => x.id === id);
  if(idx === -1) return;
  state.feedbacks[idx] = {
    ...state.feedbacks[idx],
    name: data.name.trim(),
    rating: Number(data.rating),
    occasion: data.occasion || 'geral',
    comment: (data.comment || '').trim()
  };
  save();
  renderList();
  updateChart();
  showToast('Feedback atualizado com sucesso ✅');
}

// Excluir feedback
function deleteFeedback(id){
  if(!confirm('Tem certeza que deseja excluir este feedback?')) return;
  state.feedbacks = state.feedbacks.filter(f => f.id !== id);
  save(); renderList(); updateChart();
  showToast('Feedback removido 🗑️');
}

// Toast utilitário
let toastTimer;
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toast.classList.remove('show'), 2200);
}

// Form submit
form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  // Validações básicas de UX
  const errors = [];
  if(!data.name || data.name.trim().length < 2){ errors.push('Informe um nome válido.'); }
  if(!data.rating){ errors.push('Selecione uma nota de 1 a 5.'); }
  if(errors.length){ alert(errors.join('\n')); return; }

  // Se estiver editando, atualiza; senão, cria
  const editingId = form.dataset.editing;
  if(editingId){
    updateFeedback(editingId, data);
    form.reset();
    delete form.dataset.editing;
  }else{
    createFeedback(data);
    form.reset();
  }
});

// Reset geral
$('#resetBtn').addEventListener('click', ()=>{
  if(!confirm('Isto apagará todos os feedbacks salvos no navegador. Deseja continuar?')) return;
  state.feedbacks = [];
  save(); renderList(); updateChart();
  showToast('Tudo limpo. Comece do zero ✨');
});

// Filtros (checkboxes 1–5)
$$('.filterChk').forEach(chk => {
  chk.addEventListener('change', ()=>{
    const val = Number(chk.value);
    if(chk.checked) state.filters.add(val); else state.filters.delete(val);
    renderList(); updateChart();
  });
});

// Presets de filtro
$$('.toolbar .btn').forEach(btn => {
  btn.addEventListener('click', ()=>{
    const preset = btn.dataset.preset;
    const setAll = (vals)=>{
      state.filters = new Set(vals);
      $$('.filterChk').forEach(c=> c.checked = vals.includes(Number(c.value)));
    }
    if(preset==='all') setAll([1,2,3,4,5]);
    if(preset==='high') setAll([4,5]);
    if(preset==='mid') setAll([3]);
    if(preset==='low') setAll([1,2]);
    renderList(); updateChart();
  });
});

// Alterna uso dos filtros no chart
chartUsesFilterChk.addEventListener('change', updateChart);

// Boot
(function init(){
  $('#year').textContent = new Date().getFullYear();
  load();
  renderList();
  updateChart();
  // Dummies iniciais (só se vazio) para demonstrar
  if(state.feedbacks.length === 0){
    state.feedbacks = [
      {id:crypto.randomUUID(),name:'João (Contratipos)',rating:4,occasion:'contratipos',comment:'Conteúdo direto e claro. Queria mais comparativos de fixação.',createdAt:Date.now()-1000*60*60*6},
      {id:crypto.randomUUID(),name:'Carla (Árabes)',rating:5,occasion:'arabes',comment:'A curadoria está excelente e o visual do site é lindo!',createdAt:Date.now()-1000*60*60*3},
      {id:crypto.randomUUID(),name:'Ricardo (Nicho)',rating:5,occasion:'nicho',comment:'Recomendações cirúrgicas. Falem mais sobre ingredientes raros.',createdAt:Date.now()-1000*60*40}
    ];
    save(); renderList(); updateChart();
  }
})();