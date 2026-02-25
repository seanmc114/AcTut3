/* script.js — LC Performance Coach v2
   - Invisible adaptive support per subject
   - Positive label only: Build/Strength/Exam
   - Hard unlock after strong streak; Secret unlock after elite streak
*/

const LS_KEY = "SYNGE_LC_COACH_V2";
let state = loadState();
window.state = state;
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
  byId("mDate").value = today;

 showSetup();
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
      if (typeof window.startTurbito === "function") window.startTurbito(currentKey);
      else alert("Turbito file not loaded.");
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
  if(!name){ alert("Type a nickname first."); return; }

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
  if(!picked.length){ alert("Pick at least one subject."); return; }

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
    tile.className="tile";
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
}

function refreshUnlockUI(subject){
  const sel = byId("drillDiff");
  const sup = state.support[subject];

  // Enable/disable Hard + Secret based on unlocks
  const hardOpt = [...sel.options].find(o=>o.value==="hard");
  const secOpt  = [...sel.options].find(o=>o.value==="secret");
  if(hardOpt) hardOpt.disabled = !sup.hardUnlocked;
  if(secOpt)  secOpt.disabled  = !sup.secretUnlocked;

  // If currently selected is locked, revert to auto
  if(sel.value==="hard" && !sup.hardUnlocked) sel.value="auto";
  if(sel.value==="secret" && !sup.secretUnlocked) sel.value="auto";
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
    div.className="sectionItem";
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
  const last = arr[arr.length-1];
  byId("historyLine").textContent = `Latest: ${last.type} (${last.date}) — ${last.score}%`;
}

function band(score){
  if(score >= 90) return "H1";
  if(score >= 80) return "H2";
  if(score >= 70) return "H3";
  if(score >= 60) return "H4";
  if(score >= 50) return "H5";
  if(score >= 40) return "H6";
  return "H7/8";
}

// -------------------- DRILL ENGINE --------------------
let drill = null;

function openDrill(){
  if(!currentKey) return;
  ensureSupport(currentKey);

  const mode = byId("drillMode").value;
  const diffSel = byId("drillDiff").value;

  const bank = window.DRILL_BANK?.[currentKey];
  if(!bank){ alert("No drill bank found for this subject yet."); return; }

  const set = pickSet(bank, mode);
  if(!set.length){ alert("No prompts for this mode yet."); return; }

  // Determine effective difficulty:
  // - If user chose auto, we use support mode as the "difficulty"
  // - Otherwise, respect selection IF unlocked
  const sup = state.support[currentKey];
  const eff = resolveDifficulty(diffSel, sup);

  byId("supportLabel").textContent = supportLabel(currentKey);
  refreshUnlockUI(currentKey);

  byId("modal").classList.add("hidden");
  byId("drillScreen").classList.remove("hidden");

  const total = (mode === "structured5") ? 5 : 10;

  drill = {
    subject: currentKey,
    mode,
    diff: eff,             // build|strength|exam|hard|secret
    prompts: shuffle([...set]),
    i: 0,
    score: 0,
    total,
    startedAt: null,
    timerInt: null,
    current: null
  };

  byId("dTitle").textContent = `${currentKey} • ${labelMode(mode)} • ${displayDiff(eff)}`;
  byId("dTotal").textContent = String(total);
  byId("dScore").textContent = "0";
  byId("dPrompt").textContent = "Press Start";
  byId("dAnswer").value = "";
  byId("dTimer").textContent = "00:00";
  byId("scaffold").classList.add("hidden");
  byId("clozeBank").classList.add("hidden");

  byId("dHelp").textContent =
    mode === "rapid10" ? "Rapid-10: quick recall. 10 prompts."
    : mode === "structured5" ? "Structured-5: show method/steps. 5 prompts."
    : "Cloze: fill blanks. Use ' | ' between blanks.";

  const bestKey = bestKeyFor(currentKey, mode, eff);
  const best = state.best?.[bestKey] || null;
  byId("dBest").textContent = best ? `${best.score}/${total} in ${best.time}` : "—";
}

function resolveDifficulty(sel, sup){
  if(sel === "auto"){
    // Map support mode to how much scaffold help they get
    return sup.mode; // build|strength|exam
  }
  if(sel === "hard" && sup.hardUnlocked) return "hard";
  if(sel === "secret" && sup.secretUnlocked) return "secret";
  if(sel === "easy") return "build";
  if(sel === "mid") return "strength";
  if(sel === "hard") return sup.mode;   // locked -> fallback
  if(sel === "secret") return sup.mode; // locked -> fallback
  return "strength";
}

function displayDiff(d){
  if(d==="build") return "Build";
  if(d==="strength") return "Strength";
  if(d==="exam") return "Exam";
  if(d==="hard") return "Hard";
  return "Secret";
}

function labelMode(m){
  if(m==="rapid10") return "Rapid-10";
  if(m==="structured5") return "Structured-5";
  return "Cloze";
}

function pickSet(bank, mode){
  if(mode==="rapid10") return bank.rapid || [];
  if(mode==="structured5") return bank.structured || [];
  return bank.cloze || [];
}

function exitDrill(){
  stopTimer();
  byId("drillScreen").classList.add("hidden");
  byId("modal").classList.remove("hidden");
  // refresh label in modal
  if(currentKey) byId("supportLabel").textContent = supportLabel(currentKey);
}

function startRound(){
  if(!drill) return;
  drill.i = 0;
  drill.score = 0;
  drill.startedAt = Date.now();
  byId("dScore").textContent = "0";
  nextPrompt();
  startTimer();
  byId("dAnswer").focus();
}

function nextPrompt(){
  const p = drill.prompts[drill.i % drill.prompts.length];
  drill.current = p;

  byId("scaffold").classList.add("hidden");
  byId("clozeBank").classList.add("hidden");

  if(p.text && p.blanks){
    byId("dPrompt").textContent = renderCloze(p, drill.diff);
    const showBank = (drill.diff==="build" || drill.diff==="strength") && Array.isArray(p.bank) && p.bank.length;
    if(showBank){
      byId("clozeBank").innerHTML = `<strong>Word bank:</strong> ${p.bank.join(" • ")}`;
      byId("clozeBank").classList.remove("hidden");
    }
  } else {
    byId("dPrompt").textContent = p.q;
  }
  byId("dAnswer").value = "";
}

function renderCloze(p, diff){
  // more difficulty => less help: we increase blanks visually by hiding more words (simple version)
  // Here we just replace ___ with blanks; Secret/Hard means no bank + more pressure
  const blanks = p.blanks.map(()=> "_____").join(" ");
  return p.text.replace(/___+/g, blanks);
}

function submitAnswer(){
  if(!drill || !drill.startedAt) return;

  const p = drill.current;
  const raw = byId("dAnswer").value;

  const ok = checkAnswer(drill.mode, p, raw);

  if(ok){
    drill.score++;
    byId("dScore").textContent = String(drill.score);
  } else {
    const scaffold = scaffoldFor(drill.subject, drill.mode, p, drill.diff);
    if(scaffold){
      byId("scaffold").innerHTML = scaffold;
      byId("scaffold").classList.remove("hidden");
    }
  }

  drill.i++;
  if(drill.i >= drill.total){
    finishDrill();
  } else {
    nextPrompt();
  }
}

function checkAnswer(mode, p, raw){
  const ans = norm(raw);

  if(p.text && p.blanks){
    const parts = raw.split("|").map(x=>norm(x)).filter(Boolean);
    if(parts.length !== p.blanks.length) return false;
    for(let i=0;i<p.blanks.length;i++){
      if(norm(p.blanks[i]) !== parts[i]) return false;
    }
    return true;
  }

  const acceptable = (p.a||[]).map(norm);
  if(acceptable.includes("*")) return ans.length > 0;
  if(acceptable.some(x=>x===ans)) return true;

  // Structured: allow “good structure keywords” to count (so they practise the frame)
  if(mode==="structured5"){
    const hits = ["formula","sub","substitute","unit","because","however","overall","point","evidence","explain","example","define"];
    if(hits.some(t => ans.includes(t))) return true;
  }

  return false;
}

function scaffoldFor(subject, mode, p, diff){
  if(mode !== "structured5") return "";

  // Use scaffold if prompt supplies it
  if(p.scaffold){
    const tier = (diff==="hard" || diff==="secret") ? "exam" : diff; // hard/secret => minimal scaffold
    const lines = p.scaffold[tier] || p.scaffold.exam || [];
    if(lines.length){
      return `<strong>Support:</strong><br>` + lines.map(l=>`• ${esc(l)}`).join("<br>");
    }
  }

  // Fallback generic scaffold for structured tasks
  const tier = (diff==="hard" || diff==="secret") ? "exam" : diff;
  if(tier==="build"){
    return `<strong>Support:</strong><br>• Define / State<br>• Explain (how/why)<br>• Example (specific)<br>• Link to question`;
  }
  if(tier==="strength"){
    return `<strong>Support:</strong><br>• Define + explain + example`;
  }
  return `<strong>Support:</strong><br>• Answer to the marks`;
}

function finishDrill(){
  stopTimer();
  const elapsedMs = Date.now() - drill.startedAt;
  const time = fmtTime(elapsedMs);

  const key = bestKeyFor(drill.subject, drill.mode, drill.diff);
  state.best = state.best || {};
  const prev = state.best[key];

  const isPB = (!prev)
    || (drill.score > prev.score)
    || (drill.score === prev.score && msFromFmt(time) < msFromFmt(prev.time));

  if(isPB){
    state.best[key] = { score: drill.score, time };
    confettiBoom();
    playFanfare();
  }

  // Update adaptive support only using structured mode (this is the learning backbone)
  if(drill.mode === "structured5"){
    updateSupportAfterStructured(drill.subject, drill.score, drill.total);
    byId("supportLabel").textContent = supportLabel(drill.subject);
  }

  saveState();
  renderTiles();

  byId("dPrompt").textContent = isPB
    ? `PB! ${drill.score}/${drill.total} in ${time}`
    : `Done: ${drill.score}/${drill.total} in ${time}`;

  const bestNow = state.best[key];
  byId("dBest").textContent = bestNow ? `${bestNow.score}/${drill.total} in ${bestNow.time}` : "—";
}

function updateSupportAfterStructured(subject, score, total){
  ensureSupport(subject);
  const sup = state.support[subject];

  const pct = Math.round((score/total)*100);
  sup.structuredScores.push(pct);
  // keep last 6
  if(sup.structuredScores.length > 6) sup.structuredScores.shift();

  // "shown improvement" rules:
  // Promote if:
  // - last 2 >= 80
  // OR last 3 avg >= 75
  // OR last 4 avg >= 70
  const last2 = sup.structuredScores.slice(-2);
  const last3 = sup.structuredScores.slice(-3);
  const last4 = sup.structuredScores.slice(-4);

  const good2 = last2.length===2 && last2.every(x=>x>=80);
  const avg3 = last3.length===3 ? Math.round(avgOf(last3)) : 0;
  const avg4 = last4.length===4 ? Math.round(avgOf(last4)) : 0;

  // demote if wobble:
  // - last 2 avg < 55
  const wobble = last2.length===2 && Math.round(avgOf(last2)) < 55;

  if(wobble){
    // protect them: add support back
    sup.mode = "build";
  } else {
    if(sup.mode === "build"){
      if(good2 || avg3>=75 || avg4>=70) sup.mode = "strength";
    } else if(sup.mode === "strength"){
      if(good2 || avg3>=82) sup.mode = "exam";
    } else if(sup.mode === "exam"){
      // stay in exam unless sustained wobble triggers build above
    }
  }

  // Unlocks:
  // Hard unlock if last 3 structured >= 85 avg OR 3 consecutive >= 85
  if(!sup.hardUnlocked && last3.length===3){
    if(Math.round(avgOf(last3)) >= 85) sup.hardUnlocked = true;
  }

  // Secret unlock if last 4 avg >= 90 AND at least one perfect (100) in last 6
  if(!sup.secretUnlocked && sup.structuredScores.length >= 4){
    const avgLast4 = Math.round(avgOf(last4.length?last4:sup.structuredScores.slice(-4)));
    const hasPerfect = sup.structuredScores.includes(100);
    if(avgLast4 >= 90 && hasPerfect) sup.secretUnlocked = true;
  }
}

function startTimer(){
  stopTimer();
  drill.timerInt = setInterval(()=>{
    const ms = Date.now() - drill.startedAt;
    byId("dTimer").textContent = fmtTime(ms);
  }, 250);
}
function stopTimer(){
  if(drill?.timerInt) clearInterval(drill.timerInt);
  if(drill) drill.timerInt = null;
}

function confettiBoom(){
  const c = byId("confetti");
  const ctx = c.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth || 900;
  const h = c.clientHeight || 600;
  c.width = w*dpr; c.height = h*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);

  const pieces = Array.from({length:140}, ()=>({
    x: Math.random()*w,
    y: -20 - Math.random()*h*0.2,
    vx: (Math.random()-0.5)*3,
    vy: 2 + Math.random()*4,
    r: 2 + Math.random()*4,
    a: 1
  }));

  let t = 0;
  const anim = () => {
    t++;
    ctx.clearRect(0,0,w,h);
    pieces.forEach(p=>{
      p.x += p.vx; p.y += p.vy; p.vy += 0.03;
      p.a -= 0.008;
      ctx.globalAlpha = Math.max(p.a,0);
      ctx.fillStyle = (Math.random()<0.33) ? "#1f7a4c" : (Math.random()<0.5 ? "#0b2545" : "#f2b01e");
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if(t < 150) requestAnimationFrame(anim);
    else ctx.clearRect(0,0,w,h);
  };
  requestAnimationFrame(anim);
}

function playFanfare(){
  const a = byId("fanfare");
  if(!a) return;
  a.currentTime = 0;
  a.play().catch(()=>{});
}

// -------------------- storage + helpers --------------------
function loadState(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw){
    try { return JSON.parse(raw); } catch {}
  }
  return { profile:null, results:{}, best:{}, support:{} };
}
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function resetLocal(){
  if(!confirm("Reset all local data on this device?")) return;
  localStorage.removeItem(LS_KEY);
  location.reload();
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
function norm(s){ return (window.__NORM ? window.__NORM(s) : String(s||"").trim().toLowerCase()); }

function fmtTime(ms){
  const total = Math.floor(ms/1000);
  const m = Math.floor(total/60);
  const s = total%60;
  return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
}
function msFromFmt(t){
  const [m,s]=String(t).split(":").map(Number);
  return (m*60+s)*1000;
}
function bestKeyFor(subject, mode, diff){
  return `best_${subject}_${mode}_${diff}`;
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}


window.openModal = openModal;
