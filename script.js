Chart.defaults.color = '#888';
Chart.defaults.font.family = "'DM Sans', sans-serif";

let predictionChart = null;

const ACTIONS = [
  {key:'favorite',   label:'Like',           weight:0.5,  dir:1},
  {key:'reply',      label:'Reply',          weight:1.5,  dir:1},
  {key:'repost',     label:'Repost',         weight:0.8,  dir:1},
  {key:'quote',      label:'Quote',          weight:1.2,  dir:1},
  {key:'click',      label:'Click',          weight:0.3,  dir:1},
  {key:'video_view', label:'Video view',     weight:0.6,  dir:1},
  {key:'share',      label:'Share',          weight:0.9,  dir:1},
  {key:'dwell',      label:'Dwell time',     weight:0.4,  dir:1},
  {key:'follow',     label:'Follow author',  weight:2.0,  dir:1},
  {key:'not_int',    label:'Not interested', weight:-1.0, dir:-1},
  {key:'block',      label:'Block',          weight:-3.0, dir:-1},
  {key:'mute',       label:'Mute',           weight:-2.5, dir:-1},
  {key:'report',     label:'Report',         weight:-4.0, dir:-1},
];

const PRE_FILTERS = [
  {label:'No duplicate post IDs in batch',  check:()=>true},
  {label:'Core metadata hydrated successfully', check:()=>true},
  {label:'Post within age threshold',       check:()=>document.getElementById('post-age').value!=='stale'},
  {label:'Not viewer\'s own post',          check:()=>true},
  {label:'Repost deduplication passed',     check:()=>document.getElementById('post-type').value!=='repost'||true},
  {label:'Subscription content eligible',   check:()=>true},
  {label:'Not previously seen by viewer',   check:()=>true},
  {label:'Not served in this session',      check:()=>true},
  {label:'No muted keywords matched',       check:()=>true},
  {label:'Author not blocked or muted',     check:()=>parseInt(document.getElementById('s-blocks').value)<70},
];

const POST_FILTERS = [
  {label:'Visibility filter — not deleted or spam',   check:()=>true},
  {label:'Visibility filter — no violence or gore',   check:()=>true},
  {label:'Conversation deduplication passed',         check:()=>true},
];

function sigmoid(x){ return 1/(1+Math.exp(-x)); }

function fmtFollowers(v){
  if(v<15) return Math.round(v*60)+'';
  if(v<40) return (v*0.12).toFixed(1)+'k';
  if(v<70) return Math.round(v*2.2)+'k';
  if(v<90) return (v*0.15).toFixed(0)+'k';
  return '1M+';
}
function fmtEngRate(v){ return (v*0.15).toFixed(1)+'%'; }
function fmtFreq(v){
  if(v<15) return '0.5/day';
  if(v<35) return '1/day';
  if(v<55) return '2/day';
  if(v<70) return '5/day';
  if(v<85) return '10/day';
  return '20+/day';
}
function fmtBlocks(v){
  if(v<20) return 'Very low';
  if(v<40) return 'Low';
  if(v<60) return 'Medium';
  if(v<80) return 'High';
  return 'Very high';
}
function fmtMutual(v){
  if(v<25) return 'Low';
  if(v<60) return 'Med';
  return 'High';
}

function getProbs(){
  const engRate  = parseInt(document.getElementById('s-engrate').value)/100;
  const blocks   = parseInt(document.getElementById('s-blocks').value)/100;
  const freq     = parseInt(document.getElementById('s-freq').value)/100;
  const replies  = parseInt(document.getElementById('s-replies').value)/100;
  const affinity = parseInt(document.getElementById('s-affinity').value)/100;
  const mutual   = parseInt(document.getElementById('s-mutual').value)/100;
  const postType = document.getElementById('post-type').value;
  const media    = document.getElementById('media-type').value;
  const age      = document.getElementById('post-age').value;
  const audience = document.getElementById('audience').value;

  const ageMult   = {fresh:1.0, recent:0.78, old:0.38, stale:0.05}[age];
  const mediaMult = {text:1.0, image:1.15, video:1.25}[media];
  const typeMult  = {original:1.0, quote:1.08, reply:0.82, repost:0.68}[postType];
  const freqPenalty = freq > 0.55 ? (freq-0.55)*0.9 : 0;
  const oonPenalty  = audience === 'oon' ? 0.6 : 1.0;

  const base = (engRate*0.6 + affinity*0.25 + mutual*0.15) * ageMult * mediaMult * typeMult * oonPenalty - freqPenalty*0.15;

  return ACTIONS.map(a => {
    let p;
    if(a.dir===1){
      const boost = {
        reply: 1.4 + replies*0.8,
        quote: 1.2 + replies*0.4,
        follow: 0.5 + engRate*0.6,
        video_view: media==='video' ? 1.8 : 0.15,
        dwell: media==='video' ? 1.3 : 0.9,
        favorite: 1.0,
        repost: 0.9,
        click: 0.8,
        share: 0.9,
      }[a.key] || 1;
      p = sigmoid(-3.5 + base*7*boost);
    } else {
      const negBase = blocks*0.75 + (freq>0.65 ? (freq-0.65)*0.4 : 0) + (oonPenalty<1?0.1:0);
      p = sigmoid(-6 + negBase*9);
    }
    return {...a, prob: Math.min(0.99, Math.max(0.001, p))};
  });
}

function computeScore(probs){
  return probs.reduce((s,a)=>s+a.weight*a.prob, 0);
}

//function to update or build the Bar Chart
function updateChart(probs) {
  const ctx = document.getElementById('predictionChart');
  if(!ctx) return;

  const labels = probs.map(p => p.label);
  const data = probs.map(p => (p.prob * 100).toFixed(1));
  const backgroundColors = probs.map(p => 
    p.dir === 1 ? 'rgba(61, 220, 132, 0.6)' : 'rgba(255, 91, 91, 0.6)'
  );
  const borderColors = probs.map(p => 
    p.dir === 1 ? 'rgba(61, 220, 132, 1)' : 'rgba(255, 91, 91, 1)'
  );

  if (predictionChart) {
    predictionChart.data.datasets[0].data = data;
    predictionChart.update();
  } else {
    predictionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Probability (%)',
          data: data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) { return context.raw + '% chance'; }
            }
          }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }
}

function recalc(){
  //update labels
  const sv = id => parseInt(document.getElementById(id).value);
  document.getElementById('v-engrate').textContent  = fmtEngRate(sv('s-engrate'));
  document.getElementById('v-followers').textContent= fmtFollowers(sv('s-followers'));
  document.getElementById('v-freq').textContent     = fmtFreq(sv('s-freq'));
  document.getElementById('v-blocks').textContent   = fmtBlocks(sv('s-blocks'));
  document.getElementById('v-replies').textContent  = sv('s-replies')+'%';
  document.getElementById('v-affinity').textContent = sv('s-affinity')+'%';
  document.getElementById('v-mutual').textContent   = fmtMutual(sv('s-mutual'));

  const probs = getProbs();
  const raw = computeScore(probs);

  //normalise to 0-100
  const normalized = Math.max(0, Math.min(100, (raw + 2.5) / 6.5 * 100));
  const feedProb = Math.min(99, Math.max(1, normalized * 0.88 + 2));
  const allFilters = PRE_FILTERS.filter(f=>f.check()).length + POST_FILTERS.filter(f=>f.check()).length;
  const totalFilters = PRE_FILTERS.length + POST_FILTERS.length;
  const rankPct = Math.min(99, Math.max(1, normalized * 0.92 + 3));

  //tier
  let tier, tierColor, tierDotColor;
  if(normalized > 78){ tier='Viral'; tierColor='rgba(61,220,132,0.12)'; tierDotColor='#3ddc84'; }
  else if(normalized > 58){ tier='High reach'; tierColor='rgba(91,156,246,0.12)'; tierDotColor='#5b9cf6'; }
  else if(normalized > 38){ tier='Normal'; tierColor='rgba(255,181,71,0.12)'; tierDotColor='#ffb547'; }
  else if(normalized > 18){ tier='Low reach'; tierColor='rgba(255,181,71,0.12)'; tierDotColor='#ffb547'; }
  else { tier='Suppressed'; tierColor='rgba(255,91,91,0.12)'; tierDotColor='#ff5b5b'; }

  const scoreColor = normalized>65?'#3ddc84':normalized>40?'#ffb547':'#ff5b5b';

  //hero
  document.getElementById('big-score').textContent = normalized.toFixed(1);
  document.getElementById('big-score').style.color = scoreColor;
  document.getElementById('s-feedprob').textContent = feedProb.toFixed(0)+'%';
  document.getElementById('s-feedprob').style.color = scoreColor;
  document.getElementById('s-filters').textContent = allFilters+'/'+totalFilters;
  document.getElementById('s-filters').style.color = allFilters===totalFilters?'#3ddc84':'#ff5b5b';
  document.getElementById('s-rank').textContent = rankPct.toFixed(0)+'th';
  document.getElementById('s-rank').style.color = scoreColor;

  const badge = document.getElementById('tier-badge');
  badge.style.background = tierColor;
  badge.style.borderColor = tierDotColor+'44';
  badge.style.color = tierDotColor;
  badge.querySelector('.tier-dot').style.background = tierDotColor;
  document.getElementById('tier-label').textContent = tier;

  //render chart
  updateChart(probs);

  //actions grid
  const grid = document.getElementById('actions-grid');
  grid.innerHTML = probs.map(a=>{
    const pct = (a.prob*100).toFixed(1);
    const cls = a.dir===1?'pos':'neg';
    return `<div class="action-card ${cls}" style="--bar:${pct}%">
      <div class="action-name">${a.label}</div>
      <div class="action-prob">${pct}%</div>
      <div class="action-weight">weight ${a.weight>0?'+':''}${a.weight}</div>
    </div>`;
  }).join('');

  //filters
  const fgrid = document.getElementById('filters-grid');
  fgrid.innerHTML = PRE_FILTERS.map(f=>{
    const pass = f.check();
    return `<div class="filter-chip ${pass?'pass':'fail'}">
      <div class="filter-chip-dot"></div>
      <div class="filter-chip-text">${f.label}</div>
      <div class="filter-chip-status">${pass?'pass':'fail'}</div>
    </div>`;
  }).join('');
  const pfgrid = document.getElementById('filters-post-grid');
  pfgrid.innerHTML = POST_FILTERS.map(f=>{
    const pass = f.check();
    return `<div class="filter-chip ${pass?'pass':'fail'}">
      <div class="filter-chip-dot"></div>
      <div class="filter-chip-text">${f.label}</div>
      <div class="filter-chip-status">${pass?'pass':'fail'}</div>
    </div>`;
  }).join('');

  //waterfall
  const posScore  = probs.filter(a=>a.dir===1).reduce((s,a)=>s+a.weight*a.prob,0);
  const negScore  = probs.filter(a=>a.dir===-1).reduce((s,a)=>s+a.weight*a.prob,0);
  const freqPenalty = Math.max(0,(parseInt(document.getElementById('s-freq').value)-55)/100*0.9);
  const diversityPenalty = freqPenalty * 15;
  const oonAdjust = document.getElementById('audience').value==='oon' ? -8 : 0;

  const wfEl = document.getElementById('waterfall');
  const stages = [
    {icon:'🧠', bg:'rgba(61,220,132,0.08)', label:'Phoenix predictions', desc:'Transformer outputs P(action) for all 15 engagement types', delta:'+'+posScore.toFixed(2), color:'#3ddc84'},
    {icon:'📉', bg:'rgba(255,91,91,0.08)',   label:'Negative action penalty', desc:'Block, mute, report predictions subtracted with high weights', delta:negScore.toFixed(2), color:'#ff5b5b'},
    {icon:'👥', bg:'rgba(255,181,71,0.08)',   label:'Author diversity attenuation', desc:'Score reduced if author already appears in candidate batch', delta: diversityPenalty>0?'-'+diversityPenalty.toFixed(1):'0.0', color: diversityPenalty>0?'#ffb547':'#3ddc84'},
    {icon:'🌐', bg:'rgba(91,156,246,0.08)',   label:'OON adjustment', desc:'Out-of-network content adjusted to balance discovery ratio', delta: oonAdjust!==0?oonAdjust.toFixed(1):'n/a', color: oonAdjust<0?'#ffb547':'#666'},
    {icon:'🏆', bg:'rgba(232,255,71,0.08)',   label:'Top-K selection', desc:'Sorted against ~1,500 competing candidates per viewer session', delta:'rank '+rankPct.toFixed(0)+'th', color:'#e8ff47'},
  ];

  wfEl.innerHTML = stages.map(s=>`
    <div class="waterfall-row">
      <div class="waterfall-icon" style="background:${s.bg}">${s.icon}</div>
      <div>
        <div class="waterfall-name">${s.label}</div>
        <div class="waterfall-desc">${s.desc}</div>
      </div>
      <div class="waterfall-delta" style="color:${s.color}">${s.delta}</div>
    </div>
  `).join('');
}

function switchTab(name, btn){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
}

recalc();