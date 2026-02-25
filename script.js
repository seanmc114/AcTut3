/* script.js — LC Performance Coach v2
   - Invisible adaptive support per subject
   - Positive label only: Build/Strength/Exam
   - Hard unlock after strong streak; Secret unlock after elite streak
*/

const LS_KEY = "SYNGE_LC_COACH_V2";
let state = loadState();
let currentKey = null;
let chart = null;

const CORE = [
  "English","Maths","Spanish","French","German",
  "Accounting","Economics","Physics","Biology","Chemistry",
  "PE","Home Ec","History","Geography","Business","Art"
];

const TEMPLATES = {
  "English": { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"P1",label:"Paper 1",weight:50},{key:"P2",label:"Paper 2",weight:50}] },
  "Maths":   { levelOptions:["H","O"], defaultLevel:"O", sections:[{key:"P1",label:"Paper 1",weight:50},{key:"P2",label:"Paper 2",weight:50}] },
  "Spanish": { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"oral",label:"Oral",weight:25},{key:"aural",label:"Aural",weight:25},{key:"reading",label:"Reading",weight:25},{key:"writing",label:"Writing",weight:25}] },
  "French":  { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"oral",label:"Oral",weight:25},{key:"aural",label:"Aural",weight:25},{key:"reading",label:"Reading",weight:25},{key:"writing",label:"Writing",weight:25}] },
  "German":  { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"oral",label:"Oral",weight:25},{key:"aural",label:"Aural",weight:25},{key:"reading",label:"Reading",weight:25},{key:"writing",label:"Writing",weight:25}] },
  "Accounting": { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"Q1",label:"Q1",weight:40},{key:"Q2",label:"Q2",weight:30},{key:"Q3",label:"Q3",weight:30}] },
  "Economics":  { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"srq",label:"Short Questions",weight:40},{key:"long",label:"Long Questions",weight:60}] },
  "Physics":    { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"short",label:"Short Questions",weight:40},{key:"long",label:"Long Questions",weight:60}] },
  "Biology":    { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"A",label:"Short Q",weight:30},{key:"B",label:"Experiments",weight:20},{key:"C",label:"Long Q",weight:50}] },
  "Chemistry":  { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"short",label:"Short Questions",weight:40},{key:"long",label:"Long Questions",weight:60}] },
  "PE":         { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"written",label:"Written",weight:70},{key:"project",label:"Project",weight:30}] },
  "Home Ec":    { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"core",label:"Core",weight:60},{key:"elective",label:"Elective",weight:40}] },
  "History":    { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"doc",label:"Documents/Source",weight:40},{key:"essay",label:"Essays",weight:60}] },
  "Geography":  { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"short",label:"Short Q",weight:40},{key:"long",label:"Long Q",weight:60}] },
  "Business":   { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"srq",label:"Short Q",weight:40},{key:"abq",label:"ABQ/Applied",weight:60}] },
  "Art":        { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"hist",label:"History/Appreciation",weight:50},{key:"pract",label:"Practical/Project",weight:50}] },
};

document.addEventListener("DOMContentLoaded", () => {
  wire();
  renderPicker();

  const today = new Date().toISOString().slice(0,10);
  const mDateEl = byId("mDate");
  if(mDateEl && !mDateEl.value) mDateEl.value = today;

  showSetup();
  focusEl("name");
});

// ========= SUBJECT HUB CONTROL =========

function openSubjectHub(subject){
  document.getElementById("dash").classList.add("hidden");
  document.getElementById("subjectHub").classList.remove("hidden");
  document.getElementById("subjectTitle").innerText = subject;
  currentKey = subject;
}

document.addEventListener("DOMContentLoaded", () => {

  // Back button
  document.getElementById("btnBackToDash").onclick = function(){
    document.getElementById("subjectHub").classList.add("hidden");
    document.getElementById("dash").classList.remove("hidden");
  };

  // Turbito button
  document.getElementById("btnTurbito").onclick = function(){
    if(currentKey){
      startTurbito(currentKey);
    }
  };

});

function wire(){
  const safeClick = (id, handler) => {
    const el = byId(id);
    if(el) el.addEventListener("click", handler);
  };

  safeClick("btnStart", start);
  safeClick("btnClose", closeModal);
  safeClick("btnAdd", addResult);
  safeClick("btnCoach", coachMe);
  safeClick("btnReset", resetLocal);
  safeClick("btnStartDrill", openDrill);
  safeClick("btnExitDrill", exitDrill);
  safeClick("btnStartRound", startRound);
  safeClick("btnSubmit", submitAnswer);

  const ans = byId("dAnswer");
  if(ans){
    ans.addEventListener("keydown", (e)=>{
      if(e.key==="Enter") submitAnswer();
    });
  }
}

function showSetup(){
  byId("setup").classList.remove("hidden");
  byId("dash").classList.add("hidden");
  byId("who").classList.add("hidden");
}

function showDash(){
  byId("setup").classList.add("hidden");
  byId("dash").classList.remove("hidden");
  byId("who").classList.remove("hidden");
  byId("whoName").textContent = state.profile.name;
  renderTiles();
  renderOverall();
}

function tplFor(subject){
  return TEMPLATES[subject] || { levelOptions:["H","O"], defaultLevel:"H", sections:[{key:"P1",label:"Paper 1",weight:50},{key:"P2",label:"Paper 2",weight:50}] };
}

function renderPicker(){
  const box = byId("subjectPicker");
  box.innerHTML = "";
  CORE.forEach(name=>{
    const tpl = tplFor(name);
    const row = document.createElement("div");
    row.className = "pickRow";
    row.innerHTML = `
      <label><input type="checkbox" data-sub="${esc(name)}"> ${esc(name)}</label>
      <select class="lvl" data-lvl="${esc(name)}">
        ${tpl.levelOptions.map(l=>`<option value="${l}" ${l===tpl.defaultLevel?"selected":""}>${l==="H"?"Higher":"Ordinary"}</option>`).join("")}
      </select>
    `;
    box.appendChild(row);
  });
}

function start(){
  const name = byId("name").value.trim();
  const goal = byId("goal").value.trim();

  if(!name){
    alert("Type a nickname first.");
    focusEl("name");
    return;
  }

  const picked = [];
  document.querySelectorAll("input[type=checkbox][data-sub]").forEach(cb=>{
    if(cb.checked){
      const subject = cb.dataset.sub;
      const lvl = document.querySelector(`select[data-lvl="${cssEsc(subject)}"]`).value;
      picked.push({ subject, level:lvl });
      if(!state.results[subject]) state.results[subject] = [];
      ensureSupport(subject);
    }
  });

  if(!picked.length){
    alert("Pick at least one subject.");
    return;
  }

  state.profile = { name, goal, picked };
  saveState();
  showDash();
}

function ensureSupport(subject){
  state.support = state.support || {};
  if(!state.support[subject]){
    state.support[subject] = {
      mode: "build",              // build|strength|exam
      structuredScores: [],       // last N structured drill % scores
      hardUnlocked: false,
      secretUnlocked: false
    };
  }
}

function supportLabel(subject){
  ensureSupport(subject);
  const m = state.support[subject].mode;
  if(m==="build") return "Build Mode";
  if(m==="strength") return "Strength Mode";
  return "Exam Mode";
}

function renderTiles(){
  const tiles = byId("tiles");
  tiles.innerHTML = "";

  state.profile.picked.forEach(({subject,level})=>{
    ensureSupport(subject);
    const results = state.results[subject] || [];
    const avg = results.length ? Math.round(avgOf(results.map(r=>r.score))) : null;
    const last = results.length ? results[results.length-1] : null;

    const fill = avg===null ? 0 : clamp(avg,0,100);
    const sup = supportLabel(subject);

    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="tileTop">
        <div>
          <div class="tileName">${esc(subject)}</div>
          <div class="tileMeta">${level==="H"?"Higher":"Ordinary"} • ${esc(sup)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:900;font-size:22px">${avg===null?"—":avg+"%"}</div>
          <div class="tileMeta">${last ? `${esc(last.type)} • ${esc(last.date)}` : "No results yet"}</div>
        </div>
      </div>
      <div class="bar"><div class="fill" style="width:${fill}%"></div></div>
    `;
    tile.addEventListener("click", ()=>openSubjectHub(subject));
    tiles.appendChild(tile);
  });
}

function renderOverall(){
  const avgs = state.profile.picked
    .map(p => state.results[p.subject] || [])
    .filter(arr => arr.length)
    .map(arr => Math.round(avgOf(arr.map(r=>r.score))));

  if(!avgs.length){
    byId("overallAvg").textContent = "—";
    byId("overallBand").textContent = "—";
    byId("marksRecovered").textContent = "0";
    return;
  }

  const overall = Math.round(avgOf(avgs));
  byId("overallAvg").textContent = overall + "%";
  byId("overallBand").textContent = band(overall);

  let recovered = 0;
  state.profile.picked.forEach(p=>{
    const arr = state.results[p.subject] || [];
    if(arr.length){
      recovered += (Math.round(avgOf(arr.map(r=>r.score))) - arr[0].score);
    }
  });
  byId("marksRecovered").textContent = String(recovered);
}

function openModal(subject, level){
  currentKey = subject;
  ensureSupport(subject);

  const tpl = tplFor(subject);

  byId("mTitle").textContent = subject;
  byId("mMeta").textContent = `${level==="H"?"Higher":"Ordinary"} level • ${tpl.sections.length} sections`;
  byId("mOverall").value = "";
  byId("weightedPreview").textContent = "";

  byId("supportLabel").textContent = supportLabel(subject);

  renderSections(subject);
  renderChart(subject);
  renderHistory(subject);
  refreshUnlockUI(subject);

  byId("coachBox").innerHTML = `<div class="muted">Add at least two results for best targeting.</div>`;
  byId("drillList").innerHTML = `<li class="muted">Drills appear after AI coaching.</li>`;

  byId("modal").classList.remove("hidden");
  focusEl("mOverall");
}

function refreshUnlockUI(subject){
  const sel = byId("drillDiff");
  const sup = state.support[subject];

  const hardOpt = [...sel.options].find(o=>o.value==="hard");
  const secOpt  = [...sel.options].find(o=>o.value==="secret");
  if(hardOpt) hardOpt.disabled = !sup.hardUnlocked;
  if(secOpt)  secOpt.disabled  = !sup.secretUnlocked;

  if(sel.value==="hard" && !sup.hardUnlocked) sel.value = "auto";
  if(sel.value==="secret" && !sup.secretUnlocked) sel.value = "auto";
}

function closeModal(){
  byId("modal").classList.add("hidden");
  currentKey = null;
}

function renderSections(subject){
  const tpl = tplFor(subject);
  const box = byId("sectionBox");
  box.innerHTML = "";

  tpl.sections.forEach(sec=>{
    const div = document.createElement("div");
    div.className = "sectionItem";
    div.innerHTML = `
      <div class="sectionHead">
        <div>
          <div class="sectionLbl">${esc(sec.label)}</div>
          <div class="sectionW">${sec.weight}% weight</div>
        </div>
        <div style="width:120px">
          <input type="number" min="0" max="100" placeholder="%" data-sec="${esc(sec.key)}">
        </div>
      </div>
    `;
    box.appendChild(div);
  });

  box.querySelectorAll("input[data-sec]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const weighted = computeWeighted(subject);
      byId("weightedPreview").textContent = weighted===null ? "" : `Weighted score: ${weighted}%`;
    });
  });
}

function computeWeighted(subject){
  const tpl = tplFor(subject);
  const inputs = [...byId("sectionBox").querySelectorAll("input[data-sec]")];
  let gotAny = false;
  let sum = 0;
  let wsum = 0;

  tpl.sections.forEach(sec=>{
    const inp = inputs.find(i => i.dataset.sec === sec.key);
    const v = inp ? num(inp.value) : null;
    if(v !== null){
      gotAny = true;
      sum += v * sec.weight;
      wsum += sec.weight;
    }
  });

  if(!gotAny || wsum === 0) return null;
  return Math.round(sum / wsum);
}

function collectSections(){
  const tpl = tplFor(currentKey);
  const inputs = [...byId("sectionBox").querySelectorAll("input[data-sec]")];
  const out = {};
  tpl.sections.forEach(sec=>{
    const inp = inputs.find(i => i.dataset.sec === sec.key);
    const v = inp ? num(inp.value) : null;
    if(v !== null) out[sec.key] = v;
  });
  return out;
}

function addResult(){
  if(!currentKey) return;

  const type = byId("mType").value;
  const date = byId("mDate").value || new Date().toISOString().slice(0,10);
  const overall = num(byId("mOverall").value);

  const weighted = computeWeighted(currentKey);
  const score = (weighted !== null) ? weighted : overall;

  if(score === null){
    alert("Enter overall % or section breakdown.");
    return;
  }

  const sections = collectSections();

  state.results[currentKey] = state.results[currentKey] || [];
  state.results[currentKey].push({ type, date, score, sections });
  state.results[currentKey].sort((a,b)=> String(a.date||"").localeCompare(String(b.date||"")));

  saveState();
  renderTiles();
  renderOverall();
  renderChart(currentKey);
  renderHistory(currentKey);

  byId("coachBox").innerHTML = `<div class="muted">Result added. Click “Coach me (AI)”.</div>`;
}

async function coachMe(){
  if(!currentKey) return;

  const results = state.results[currentKey] || [];
  if(results.length < 2){
    byId("coachBox").innerHTML = `<div class="muted">Add at least two results first (e.g. Christmas + Pre-Mock).</div>`;
    return;
  }

  const latest = results[results.length-1];
  const prev = results[results.length-2];

  const level = (state.profile.picked.find(p=>p.subject===currentKey)?.level) || "H";
  const tpl = tplFor(currentKey);
  const leakage = estimateLeakage(tpl, latest);

  const task = [
    "LC PERFORMANCE MODE",
    `Subject: ${currentKey}`,
    `Level: ${level}`,
    `Previous: ${prev.type} ${prev.date} — ${prev.score}%`,
    `Latest: ${latest.type} ${latest.date} — ${latest.score}%`,
    leakage ? `Weakest section guess: ${leakage}` : `Weakest section guess: none (no section data)`,
    `Paper structure (weights): ${tpl.sections.map(s=>`${s.label}:${s.weight}%`).join(" | ")}`,
    "",
    "Return ONLY JSON:",
    "{",
    '  "score": 0-100,',
    '  "focus": "single most costly weakness",',
    '  "feedback": "max 90 words, specific and practical",',
    '  "drills": ["2–4 drills, varied, 10–20 mins each, avoid essay marking"]',
    "}"
  ].join("\n");

  byId("coachBox").innerHTML = `<div class="muted">Thinking…</div>`;
  byId("drillList").innerHTML = "";

  try{
    const ai = await window.classifyAnswer({ task, answer:"", lang:"lc" });

    const focus = ai?.focus || "—";
    const feedback = ai?.feedback || "—";
    const drills = Array.isArray(ai?.drills) ? ai.drills : [];

    byId("coachBox").innerHTML = `
      <div><strong>Focus:</strong> ${esc(focus)}</div>
      <div class="mt">${esc(feedback)}</div>
    `;

    byId("drillList").innerHTML = drills.length
      ? drills.map(d=>`<li>${esc(d)}</li>`).join("")
      : `<li class="muted">No drills returned. (Still fine: drill banks are built-in.)</li>`;

    saveState();
  } catch(e){
    byId("coachBox").innerHTML = `<div class="muted">AI connection issue. Try again.</div>`;
    byId("drillList").innerHTML = `<li class="muted">—</li>`;
    console.warn(e);
  }
}

function estimateLeakage(tpl, latest){
  const s = latest.sections || {};
  let lowest = null;
  tpl.sections.forEach(sec=>{
    if(typeof s[sec.key] === "number"){
      if(!lowest || s[sec.key] < lowest.v) lowest = { label:sec.label, v:s[sec.key] };
    }
  });
  return lowest ? `${lowest.label} (${lowest.v}%)` : "";
}

function renderChart(subject){
  const arr = state.results[subject] || [];
  const ctx = byId("chart");
  if(chart) chart.destroy();

  chart = new Chart(ctx, {
    type:"line",
    data:{
      labels: arr.map((_,i)=>String(i+1)),
      datasets:[{
        data: arr.map(r=>r.score),
        fill:true,
        tension:0.25,
        borderColor:"#1f7a4c",
        backgroundColor:"rgba(31,122,76,.18)",
        pointRadius:4
      }]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ display:false } },
      scales:{ y:{ min:0, max:100 } }
    }
  });
}

function renderHistory(subject){
  const arr = state.results[subject] || [];
  if(!arr.length){
    byId("historyLine").textContent = "No results yet.";
    return;
  }

  const first = arr[0].score;
  const last = arr[arr.length-1].score;
  const delta = last - first;
  const trend = delta > 0 ? `up ${delta}` : delta < 0 ? `down ${Math.abs(delta)}` : "flat";
  byId("historyLine").textContent = `${arr.length} results • ${arr[0].date} → ${arr[arr.length-1].date} • Trend: ${trend}`;
}

function band(p){
  if(p >= 90) return "H1 / O1";
  if(p >= 80) return "H2 / O1";
  if(p >= 70) return "H3 / O2";
  if(p >= 60) return "H4 / O3";
  if(p >= 50) return "H5 / O4";
  if(p >= 40) return "H6 / O5";
  if(p >= 30) return "H7 / O6";
  return "Needs lift";
}

// ======= DRILLS / TURBITO =======

function openDrill(){
  if(!currentKey) return;

  byId("modal").classList.add("hidden");
  byId("drillScreen").classList.remove("hidden");
  byId("subjectHub").classList.add("hidden");
  focusEl("dAnswer");

  const subject = currentKey;
  byId("drillSubject").textContent = subject;
  byId("drillSupport").textContent = supportLabel(subject);

  resetRoundUI();
}

function exitDrill(){
  byId("drillScreen").classList.add("hidden");
  byId("subjectHub").classList.remove("hidden");
  resetRoundState();
}

let roundState = {
  active:false,
  items:[],
  i:0,
  score:0,
  max:0,
  wrongs:[],
  startedAt:0,
  timerId:null
};

function resetRoundState(){
  if(roundState.timerId) clearInterval(roundState.timerId);
  roundState = { active:false, items:[], i:0, score:0, max:0, wrongs:[], startedAt:0, timerId:null };
}

function resetRoundUI(){
  byId("dPrompt").textContent = "Press Start round";
  byId("dAnswer").value = "";
  byId("dFeedback").textContent = "";
  byId("dProgress").textContent = "0/0";
  byId("dScore").textContent = "0";
  byId("dTimer").textContent = "00:00";
}

function selectDrillDifficulty(subject){
  const pick = byId("drillDiff").value;
  if(pick !== "auto") return pick;

  ensureSupport(subject);
  const sup = state.support[subject];
  const avg = sup.structuredScores.length ? Math.round(avgOf(sup.structuredScores.slice(-5))) : 0;

  if(avg >= 85 && sup.secretUnlocked) return "secret";
  if(avg >= 70 && sup.hardUnlocked) return "hard";
  return "base";
}

function buildDrillItems(subject, diff){
  const bank = (window.DRILLS && window.DRILLS[subject]) || [];
  let items = [];

  if(Array.isArray(bank) && bank.length){
    items = bank
      .filter(x => !diff || x.diff === diff || (diff==="base" && !x.diff))
      .slice();
  }

  if(!items.length && Array.isArray(bank) && bank.length){
    items = bank.slice();
  }

  if(!items.length){
    items = [
      {q:`${subject}: define 3 key terms`, a:["sample"], diff:"base"},
      {q:`${subject}: one short answer practice`, a:["sample"], diff:"base"},
      {q:`${subject}: one exam tip`, a:["sample"], diff:"base"}
    ];
  }

  return shuffle(items).slice(0, 10);
}

function startRound(){
  if(!currentKey) return;

  const subject = currentKey;
  ensureSupport(subject);

  const diff = selectDrillDifficulty(subject);
  const items = buildDrillItems(subject, diff);

  resetRoundState();
  roundState.active = true;
  roundState.items = items;
  roundState.i = 0;
  roundState.score = 0;
  roundState.max = items.length;
  roundState.wrongs = [];
  roundState.startedAt = Date.now();

  byId("dDifficulty").textContent = diff.toUpperCase();
  byId("dProgress").textContent = `1/${roundState.max}`;
  byId("dScore").textContent = "0";
  byId("dAnswer").value = "";
  byId("dFeedback").textContent = "";

  showCurrentPrompt();
  focusEl("dAnswer");
  startTimer();
}

function showCurrentPrompt(){
  const item = roundState.items[roundState.i];
  byId("dPrompt").textContent = item ? item.q : "Done";
}

function submitAnswer(){
  if(!roundState.active) return;

  const item = roundState.items[roundState.i];
  if(!item) return;

  const raw = byId("dAnswer").value.trim();
  if(!raw) return;

  const ok = isCorrect(raw, item.a || []);
  if(ok){
    roundState.score++;
    byId("dFeedback").textContent = "✅ Correct";
  }else{
    byId("dFeedback").textContent = "❌ Not quite";
    roundState.wrongs.push({q:item.q, a:item.a, got:raw});
  }

  byId("dScore").textContent = String(roundState.score);

  roundState.i++;
  if(roundState.i >= roundState.max){
    finishRound();
    return;
  }

  byId("dProgress").textContent = `${roundState.i+1}/${roundState.max}`;
  byId("dAnswer").value = "";
  showCurrentPrompt();
  focusEl("dAnswer");
}

function isCorrect(raw, answers){
  const n = norm(raw);
  return answers.some(a => norm(a) === n);
}

function finishRound(){
  roundState.active = false;
  if(roundState.timerId) clearInterval(roundState.timerId);

  const elapsed = Date.now() - roundState.startedAt;
  const pct = roundState.max ? Math.round((roundState.score / roundState.max) * 100) : 0;

  byId("dPrompt").textContent = `Round complete • ${pct}%`;
  byId("dFeedback").innerHTML = `
    <div><strong>Score:</strong> ${roundState.score}/${roundState.max} (${pct}%)</div>
    <div><strong>Time:</strong> ${fmtTime(elapsed)}</div>
    ${roundState.wrongs.length ? `<div class="mt muted">Review: ${roundState.wrongs.length} missed</div>` : `<div class="mt">Perfect round 👏</div>`}
  `;

  recordDrillPerformance(currentKey, pct);
  refreshUnlockUI(currentKey);
  byId("drillSupport").textContent = supportLabel(currentKey);
}

function recordDrillPerformance(subject, pct){
  ensureSupport(subject);
  const sup = state.support[subject];

  sup.structuredScores.push(pct);
  if(sup.structuredScores.length > 12) sup.structuredScores = sup.structuredScores.slice(-12);

  const last5 = sup.structuredScores.slice(-5);
  const avg5 = last5.length ? Math.round(avgOf(last5)) : 0;

  if(avg5 >= 65) sup.hardUnlocked = true;
  if(avg5 >= 85 && last5.length >= 3) sup.secretUnlocked = true;

  if(avg5 >= 80){
    sup.mode = "exam";
  }else if(avg5 >= 55){
    sup.mode = "strength";
  }else{
    sup.mode = "build";
  }

  saveState();
}

function startTimer(){
  if(roundState.timerId) clearInterval(roundState.timerId);
  roundState.timerId = setInterval(()=>{
    if(!roundState.active) return;
    const ms = Date.now() - roundState.startedAt;
    byId("dTimer").textContent = fmtTime(ms);
  }, 250);
}

// ======= STORAGE =======

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw){
      return {
        profile: { name:"", goal:"", picked:[] },
        results: {},
        support: {}
      };
    }
    const parsed = JSON.parse(raw);

    parsed.profile = parsed.profile || { name:"", goal:"", picked:[] };
    parsed.results = parsed.results || {};
    parsed.support = parsed.support || {};

    return parsed;
  }catch{
    return {
      profile: { name:"", goal:"", picked:[] },
      results: {},
      support: {}
    };
  }
}

function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function resetLocal(){
  if(!confirm("Reset all local coach data on this device?")) return;
  localStorage.removeItem(LS_KEY);
  location.reload();
}

// ======= HELPERS =======

function focusEl(id){
  const el = byId(id);
  if(!el) return;
  setTimeout(()=>{
    try{
      el.focus();
      if(el.setSelectionRange && el.value != null){
        const n = String(el.value).length;
        el.setSelectionRange(n,n);
      }
    }catch{}
  }, 0);
}

function byId(id){ return document.getElementById(id); }
function avgOf(arr){ return arr.reduce((a,b)=>a+b,0)/arr.length; }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function num(v){
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function esc(s){
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function cssEsc(s){ return String(s).replaceAll('"','\\"'); }

function norm(s){
  return (window.__NORM ? window.__NORM(s) : String(s||"").trim().toLowerCase());
}

function fmtTime(ms){
  const total = Math.floor(ms/1000);
  const m = Math.floor(total/60);
  const s = total % 60;
  return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}

function msFromFmt(t){
  const [m,s] = String(t).split(":").map(Number);
  return (m*60+s)*1000;
}

function bestKeyFor(subject, mode, diff){
  return `best_${subject}_${mode}_${diff}`;
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

// expose for inline hooks / compatibility
window.state = state;
window.openModal = openModal;

// Turbito compatibility aliases (keeps your turbito.js)
(function ensureTurbitoAliases(){
  const wireAliases = ()=>{
    if(typeof window.startTurbito === "function"){
      window.Turbito = window.startTurbito;
      window.turbito = window.startTurbito;
      return true;
    }
    return false;
  };
  if(!wireAliases()){
    let tries = 0;
    const t = setInterval(()=>{
      tries++;
      if(wireAliases() || tries > 40) clearInterval(t);
    }, 250);
  }
})();
