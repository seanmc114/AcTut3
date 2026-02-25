/* script.js — LC Performance Coach (Synge Street) — SUBJECT PICK + CLEAR MODES
   - Students pick their own subjects (not all)
   - Stores H/O per subject (O blue, H pink)
   - Subject Hub clearly separates Turbito vs Coach/Drills
   - Charts inserted near top of hub (not bottom scroll)
   - Uses your existing: drills.js (window.DRILL_BANK), ai.js (window.classifyAnswer), turbito.js (window.startTurbito)
*/

(() => {
  "use strict";

  const LS_KEY = "SYNGE_LC_COACH_PICKED_V1";

  // Earned AI (as per your philosophy)
  const AI_MIN_RESULTS = 2;                 // needs trend
  const AI_MIN_SCORE_FOR_AI = 70;           // “coach enters” by performance
  const AI_MIN_DRILL_AVG_FOR_AI = 70;       // or by intent via drills
  const AI_COOLDOWN_MS = 60 * 60 * 1000;    // 1 hour per subject

  // Master list used ONLY for picking (not for dashboard)
  const SUBJECT_CATALOGUE = [
    "English","Maths","Spanish","French","German",
    "Biology","Chemistry","Physics",
    "Accounting","Economics","Business",
    "History","Geography","Home Ec","Art","PE"
  ];

  const state = loadState();
  let currentSubject = null;

  // drill run state
  let drillRun = null;

  // charts
  let drillChart = null;
  let resultsChart = null;

  const $ = (id) => document.getElementById(id);

  // ---------- Helpers ----------
  function esc(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function avg(arr){
    if(!arr || !arr.length) return null;
    return arr.reduce((a,b)=>a+b,0)/arr.length;
  }

  function focus(el){
    if(!el) return;
    setTimeout(() => {
      try{
        el.focus();
        if(el.setSelectionRange && typeof el.value === "string"){
          const n = el.value.length;
          el.setSelectionRange(n,n);
        }
      }catch{}
    }, 0);
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

  function fmtTime(ms){
    const total = Math.floor(ms/1000);
    const m = Math.floor(total/60);
    const s = total % 60;
    return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  }

  function toNum(x){
    const n = Number(String(x).replace("%","").trim());
    return Number.isFinite(n) ? n : null;
  }

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
  }

  function levelAccent(level){
    // Ordinary blue, Higher pink (Irish LC paper familiarity)
    return level === "O" ? "#2b6cff" : "#ff3fa6";
  }

  function pickedSubjects(){
    return (state.profile?.picked || []).map(p => p.subject);
  }

  function pickedLevel(subject){
    const p = (state.profile?.picked || []).find(x=>x.subject===subject);
    return p?.level || "H";
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    // cursor
    focus($("name"));

    // default date for entry (still backfillable)
    const mDate = $("mDate");
    if(mDate && !mDate.value) mDate.value = new Date().toISOString().slice(0,10);

    $("btnStart")?.addEventListener("click", startFlow);
    $("btnAdd")?.addEventListener("click", addResultFlow);
    $("btnCoach")?.addEventListener("click", coachFlow);
    $("btnReset")?.addEventListener("click", resetAll);

    $("btnBackToDash")?.addEventListener("click", () => {
      $("subjectHub")?.classList.add("hidden");
      $("dash")?.classList.remove("hidden");
      currentSubject = null;
    });

    $("btnTurbito")?.addEventListener("click", () => {
      if(!currentSubject) return;
      launchTurbito(currentSubject);
    });

    // Drill modal
    $("btnSubmit")?.addEventListener("click", submitDrillAnswer);
    $("btnExitDrill")?.addEventListener("click", closeDrill);

    $("dAnswer")?.addEventListener("keydown", (e)=>{
      if(e.key === "Enter") submitDrillAnswer();
    });

    render();
  });

  // ---------- Main flow ----------
  function startFlow(){
    const name = ($("name")?.value || "").trim();
    if(!name){
      alert("Enter a nickname first.");
      focus($("name"));
      return;
    }

    // If not picked yet, pick now (this is “how it was” without needing new HTML)
    if(!state.profile.picked || !state.profile.picked.length){
      const picked = promptPickSubjects();
      if(!picked.length) return;
      state.profile.picked = picked;
    }

    state.profile.name = name;
    saveState();
    render();
  }

  function promptPickSubjects(){
    const list = SUBJECT_CATALOGUE.map((s,i)=>`${i+1}. ${s}`).join("\n");
    const raw = prompt(
      "Choose YOUR subjects (comma-separated numbers)\n\n" +
      list +
      "\n\nExample: 2,3,11",
      ""
    );
    if(raw === null) return [];

    const nums = raw.split(",").map(x=>parseInt(x.trim(),10)).filter(n=>Number.isFinite(n));
    const uniq = [...new Set(nums)].filter(n=>n>=1 && n<=SUBJECT_CATALOGUE.length);
    if(!uniq.length){
      alert("No valid subjects selected.");
      return [];
    }

    const picked = [];
    for(const n of uniq){
      const subject = SUBJECT_CATALOGUE[n-1];
      const lvlRaw = prompt(`Level for ${subject}? Type H or O`, "H");
      const lvl = String(lvlRaw||"H").trim().toUpperCase()==="O" ? "O" : "H";
      picked.push({ subject, level:lvl });
    }

    return picked;
  }

  function render(){
    const hasName = !!(state.profile.name || "").trim();
    $("setup")?.classList.toggle("hidden", hasName);
    $("dash")?.classList.toggle("hidden", !hasName);

    $("whoName") && ($("whoName").textContent = state.profile.name || "—");

    // If they have name but no subjects yet, force pick (once)
    if(hasName && (!state.profile.picked || !state.profile.picked.length)){
      const picked = promptPickSubjects();
      if(picked.length){
        state.profile.picked = picked;
        saveState();
      }
    }

    renderOverall();
    renderTiles();
  }

  function renderOverall(){
    const subs = pickedSubjects();
    const all = [];
    subs.forEach(s=>{
      (state.results[s] || []).forEach(r=> all.push(r.score));
    });
    const overall = all.length ? Math.round(avg(all)) : null;

    $("overallAvg") && ($("overallAvg").textContent = overall===null ? "—" : `${overall}%`);
    $("overallBand") && ($("overallBand").textContent = overall===null ? "—" : band(overall));

    let recovered = 0;
    subs.forEach(s=>{
      const arr = (state.results[s] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
      if(arr.length >= 2) recovered += (arr[arr.length-1].score - arr[0].score);
    });
    $("marksRecovered") && ($("marksRecovered").textContent = String(recovered));
  }

  function starsForSubject(subject){
    const drills = (state.drillScores?.[subject] || []).slice(-5);
    const drillAvg = drills.length ? Math.round(avg(drills.map(d=>d.pct))) : null;

    const res = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    const trend = (res.length >= 2) ? (res[res.length-1].score - res[0].score) : 0;

    let score = 0;
    if(drillAvg !== null) score += Math.round(clamp(drillAvg,0,100)/100*7);
    score += Math.round(clamp((trend/15)*3, -3, 3));
    score = clamp(score, 0, 10);

    return "★".repeat(score) + "☆".repeat(10-score);
  }

  function renderTiles(){
    const tiles = $("tiles");
    if(!tiles) return;
    tiles.innerHTML = "";

    const picked = state.profile.picked || [];
    picked.forEach(({subject, level})=>{
      const arr = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
      const avgScore = arr.length ? Math.round(avg(arr.map(r=>r.score))) : null;
      const last = arr.length ? arr[arr.length-1] : null;

      const fill = avgScore===null ? 0 : clamp(avgScore,0,100);
      const stars = starsForSubject(subject);
      const accent = levelAccent(level);

      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `
        <div class="tileTop">
          <div>
            <div class="tileName">${esc(subject)} <span style="font-weight:900;color:${accent}">[${level}]</span></div>
            <div class="tileMeta">${last ? `Last: ${esc(last.date)} • ${last.score}%` : "No results yet"}</div>
            <div class="tileMeta">${esc(stars)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:900;font-size:22px">${avgScore===null ? "—" : `${avgScore}%`}</div>
            <div class="tileMeta">${avgScore===null ? "" : band(avgScore)}</div>
          </div>
        </div>
        <div class="bar"><div class="fill" style="width:${fill}%"></div></div>
      `;
      tile.addEventListener("click", ()=> openSubject(subject));
      tiles.appendChild(tile);
    });
  }

  // ---------- Subject Hub ----------
  function openSubject(subject){
    currentSubject = subject;
    const level = pickedLevel(subject);
    const accent = levelAccent(level);

    $("dash")?.classList.add("hidden");
    $("subjectHub")?.classList.remove("hidden");
    $("subjectTitle") && ($("subjectTitle").textContent = `${subject} (${level})`);

    // Differentiate: set a clear top note (without redesign)
    injectHubHeaderNote(subject, level, accent);

    // Turbito loads immediately, and button also exists
    launchTurbito(subject);

    // Charts near TOP (insert before turbito container)
    renderSubjectChartsNearTop(subject);
  }

  function injectHubHeaderNote(subject, level, accent){
    const hub = $("subjectHub");
    if(!hub) return;

    let note = $("hubNote");
    if(!note){
      note = document.createElement("div");
      note.id = "hubNote";
      note.style.margin = "8px 0 10px";
      note.style.padding = "10px 12px";
      note.style.borderRadius = "14px";
      note.style.background = "rgba(255,255,255,.75)";
      note.style.boxShadow = "0 6px 18px rgba(0,0,0,.08)";
      // insert at top of hub content
      hub.insertBefore(note, hub.firstChild);
    }

    note.innerHTML = `
      <div style="font-weight:900;color:${accent}">${esc(subject)} • ${level==="O"?"Ordinary (Blue)":"Higher (Pink)"}</div>
      <div class="muted">Turbito = fast recall/high score. Coach/Drills = fix the mark leaks.</div>
    `;

    // accent the hub buttons (no CSS edits, just inline)
    const bT = $("btnTurbito");
    const bB = $("btnBackToDash");
    if(bT) bT.style.background = accent;
    if(bB) bB.style.borderColor = accent;
  }

  // ---------- Result entry ----------
  function addResultFlow(){
    if(!(state.profile.name || "").trim()){
      alert("Enter a nickname first.");
      focus($("name"));
      return;
    }
    if(!state.profile.picked || !state.profile.picked.length){
      alert("Pick subjects first (press Start).");
      return;
    }

    // pick from ONLY chosen subjects
    const subject = promptPickFromChosen();
    if(!subject) return;

    const date = ($("mDate")?.value || "").trim() || new Date().toISOString().slice(0,10);

    let raw = prompt(`Enter ${subject} overall % (0–100). Example: 62`, "");
    if(raw === null) return;
    const score = toNum(raw);
    if(score === null || score < 0 || score > 100){
      alert("Please enter a number between 0 and 100.");
      return;
    }

    addResult(subject, date, Math.round(score));
    renderOverall();
    renderTiles();

    if(currentSubject === subject) renderSubjectChartsNearTop(subject);
  }

  function promptPickFromChosen(){
    const chosen = pickedSubjects();
    const list = chosen.map((s,i)=>`${i+1}. ${s}`).join("\n");
    const raw = prompt("Which of YOUR subjects?\n\n" + list + "\n\nType a number", "");
    if(raw === null) return null;
    const n = parseInt(raw.trim(), 10);
    if(!Number.isFinite(n) || n<1 || n>chosen.length){
      alert("Not a valid subject number.");
      return null;
    }
    return chosen[n-1];
  }

  function addResult(subject, date, score){
    state.results[subject] = state.results[subject] || [];
    state.results[subject].push({ date, score });
    state.results[subject].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    saveState();
  }

  // ---------- Coach / AI ----------
  async function coachFlow(){
    if(!(state.profile.name || "").trim()){
      alert("Enter a nickname first.");
      focus($("name"));
      return;
    }
    if(!state.profile.picked || !state.profile.picked.length){
      alert("Pick subjects first (press Start).");
      return;
    }

    const subject = promptPickFromChosen();
    if(!subject) return;

    const arr = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    if(arr.length < 2){
      alert(`Add at least two results for ${subject} first (trend needed).`);
      return;
    }

    const heuristic = heuristicFocus(subject, arr);
    const prescribed = buildPrescribedDrill(subject, heuristic);

    const aiAllowed = aiUnlockedFor(subject, arr.length);

    showCoachPanel(subject, heuristic, prescribed, aiAllowed);

    if(aiAllowed){
      try{
        const ai = await runAiCoach(subject, arr, heuristic);
        if(ai){
          const drills = normalizeAiDrills(ai.drills);
          const mergedPack = {
            title: `${subject} • AI Prescribed`,
            items: drills.length ? drills.slice(0,10).map(q=>({q, a:["*"]})) : prescribed.items
          };
          showCoachPanel(subject, {
            focus: ai.focus || heuristic.focus,
            feedback: ai.feedback || heuristic.feedback,
            mode: heuristic.mode
          }, mergedPack, true, true);
          markAiUsed(subject);
        }
      }catch(e){
        console.warn(e);
      }
    }
  }

  function lastDrillAvg(subject, n=5){
    const drills = (state.drillScores?.[subject] || []).slice(-n);
    if(!drills.length) return null;
    return Math.round(avg(drills.map(d=>d.pct)));
  }

  function aiUnlockedFor(subject, resultsCount){
    if(resultsCount < AI_MIN_RESULTS) return false;

    const arr = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    const latest = arr[arr.length-1];
    const drillAvg = lastDrillAvg(subject, 5);

    const earned = (latest.score >= AI_MIN_SCORE_FOR_AI) || (drillAvg !== null && drillAvg >= AI_MIN_DRILL_AVG_FOR_AI);
    if(!earned) return false;

    const now = Date.now();
    const last = state.aiLastAt?.[subject] || 0;
    if(now - last < AI_COOLDOWN_MS) return false;

    return typeof window.classifyAnswer === "function";
  }

  function markAiUsed(subject){
    state.aiLastAt = state.aiLastAt || {};
    state.aiLastAt[subject] = Date.now();
    saveState();
  }

  function showCoachPanel(subject, focusObj, pack, aiAllowed, aiUsed=false){
    const coachOut = $("coachBox");
    if(!coachOut) return;

    const drillPreview = (pack.items || []).slice(0,4).map(x=>`<li>${esc(x.q)}</li>`).join("");

    const lockLine = aiAllowed
      ? `<div class="muted">${aiUsed ? "AI coach active." : `Coach enters now (earned). Running AI...`}</div>`
      : `<div class="muted">Coach (AI) enters at ≥ <strong>${AI_MIN_SCORE_FOR_AI}%</strong> OR drill intent avg ≥ <strong>${AI_MIN_DRILL_AVG_FOR_AI}%</strong>.</div>`;

    coachOut.innerHTML = `
      <div><strong>${esc(subject)} Coach</strong></div>
      ${lockLine}
      <div style="margin-top:10px"><strong>Biggest mark leak:</strong> ${esc(focusObj.focus)}</div>
      <div class="muted" style="margin-top:6px">${esc(focusObj.feedback)}</div>
      <div style="margin-top:10px"><strong>Prescribed drill (10):</strong></div>
      <ul>${drillPreview}</ul>
      <div style="margin-top:10px">
        <button id="btnStartPrescribed" class="primary">Start Prescribed Drill (10)</button>
      </div>
    `;

    setTimeout(()=>{
      $("btnStartPrescribed")?.addEventListener("click", ()=> startDrill(subject, pack));
    }, 0);
  }

  function heuristicFocus(subject, arr){
    const last = arr[arr.length-1];
    const prev = arr[arr.length-2];
    const delta = last.score - prev.score;

    const mode = last.score < 55 ? "build" : (last.score < 75 ? "strength" : "exam");
    const modeLabel = mode === "build" ? "Build Mode" : (mode === "strength" ? "Strength Mode" : "Exam Mode");

    let focus = "Paper structure + timing";
    let feedback = `You’re in ${modeLabel}. `;

    if(delta < 0){
      focus = "Stability: remove silly drops";
      feedback += `Down ${Math.abs(delta)}. Next win: no blanks, clean method marks, repeat a tight routine.`;
    }else if(delta > 0){
      focus = "Convert improvement into consistency";
      feedback += `Up ${delta}. Now repeat what worked and add one targeted rep set weekly.`;
    }else{
      feedback += "Flat. Pick one weakness and do 10 reps, then re-test.";
    }

    if(["Spanish","French","German"].includes(subject)){
      focus = (mode==="exam") ? "Writing polish + accuracy under pressure" : "Core accuracy (verbs, agreements)";
      feedback = `Language: stop losing marks to basics, then add 1–2 high-value structures. ` + feedback;
    }else if(subject==="Maths"){
      focus = (mode==="exam") ? "Selection + method marks" : "Algebra routine + accuracy";
      feedback = `Maths: method marks win grades. Write the line even if unsure; avoid blanks. ` + feedback;
    }else if(subject==="English"){
      focus = (mode==="exam") ? "Structure + evidence" : "Paragraph discipline";
      feedback = `English: point → evidence → explain. No waffle. ` + feedback;
    }

    return { mode, focus, feedback };
  }

  function buildPrescribedDrill(subject, focusObj){
    // For Turbito-style short-form reps, we use DRILL_BANK[subject].rapid if available.
    // For coach drills, use build/strength/exam based on mode.
    const bank = window.DRILL_BANK?.[subject];
    const cat = (focusObj.mode === "build") ? "build" : (focusObj.mode === "strength" ? "strength" : "exam");

    let items = [];
    if(bank){
      const arr = bank[cat] || bank.rapid || bank.build || bank.strength || bank.exam || [];
      if(Array.isArray(arr) && arr.length){
        items = shuffle(arr.slice()).slice(0, 10);
      }
    }

    if(!items.length){
      items = [
        { q:`${subject}: 3 key definitions (no notes)`, a:["*"] },
        { q:`${subject}: 2 formulas / core facts`, a:["*"] },
        { q:`${subject}: 5 exam phrases/terms`, a:["*"] },
        { q:`${subject}: one timed short question`, a:["*"] },
        { q:`${subject}: marking scheme scan: 3 earning phrases`, a:["*"] },
        { q:`${subject}: your top 3 mistakes`, a:["*"] },
        { q:`${subject}: mini-checklist for this topic`, a:["*"] },
        { q:`${subject}: explain one concept in 2 lines`, a:["*"] },
        { q:`${subject}: define 3 command words`, a:["*"] },
        { q:`${subject}: “no blanks” rule`, a:["*"] }
      ];
    }

    return { title: `${subject} • ${cat.toUpperCase()} Drill`, items };
  }

  async function runAiCoach(subject, arr, fallback){
    const last = arr[arr.length-1];
    const prev = arr[arr.length-2];

    const task = [
      "LC PERFORMANCE COACH",
      `Subject: ${subject}`,
      `Previous: ${prev.date} — ${prev.score}%`,
      `Latest: ${last.date} — ${last.score}%`,
      "Identify the single biggest mark leak (where the student is losing the most marks) and prescribe a drill.",
      "Constraints: practical, short, no essays. 10–20 mins.",
      "",
      "Return ONLY JSON:",
      "{",
      '  "focus": "single weakness (short)",',
      '  "feedback": "max 70 words",',
      '  "drills": ["2–4 drill prompts"]',
      "}"
    ].join("\n");

    const res = await window.classifyAnswer({ task, answer:"", lang:"lc" });
    if(!res || typeof res !== "object") return null;

    return {
      focus: String(res.focus || fallback.focus || "—").slice(0,120),
      feedback: String(res.feedback || fallback.feedback || "—").slice(0,500),
      drills: Array.isArray(res.drills) ? res.drills.map(x=>String(x)) : []
    };
  }

  function normalizeAiDrills(drills){
    if(!Array.isArray(drills)) return [];
    return drills.map(d=>String(d).trim()).filter(Boolean);
  }

  // ---------- Drill modal ----------
  function startDrill(subject, pack){
    drillRun = {
      subject,
      title: pack.title || `${subject} Drill`,
      items: (pack.items || []).slice(0,10),
      i: 0,
      correct: 0,
      startedAt: Date.now()
    };

    $("drillModal")?.classList.remove("hidden");
    showDrillPrompt();
  }

  function showDrillPrompt(){
    if(!drillRun) return;
    const item = drillRun.items[drillRun.i];
    $("dPrompt") && ($("dPrompt").textContent = `${drillRun.title} • Q${drillRun.i+1}/10: ${item?.q || ""}`);
    if($("dAnswer")) $("dAnswer").value = "";
    focus($("dAnswer"));
  }

  function submitDrillAnswer(){
    if(!drillRun) return;
    const item = drillRun.items[drillRun.i];
    if(!item) return;

    const ans = ($("dAnswer")?.value || "").trim();
    if(!ans) return;

    const ok = isCorrect(ans, item.a || ["*"]);
    if(ok) drillRun.correct++;

    drillRun.i++;
    if(drillRun.i >= drillRun.items.length){
      finishDrill();
      return;
    }
    showDrillPrompt();
  }

  function isCorrect(raw, answers){
    const n = String(raw||"").trim().toLowerCase();
    if(!n) return false;
    return (answers || []).some(a=>{
      const aa = String(a||"").trim();
      if(aa === "*") return true;
      return aa.toLowerCase() === n;
    });
  }

  function finishDrill(){
    if(!drillRun) return;
    const ms = Date.now() - drillRun.startedAt;
    const pct = Math.round((drillRun.correct / drillRun.items.length) * 100);

    state.drillScores = state.drillScores || {};
    state.drillScores[drillRun.subject] = state.drillScores[drillRun.subject] || [];
    state.drillScores[drillRun.subject].push({ date: new Date().toISOString().slice(0,10), pct });

    if(state.drillScores[drillRun.subject].length > 30){
      state.drillScores[drillRun.subject] = state.drillScores[drillRun.subject].slice(-30);
    }

    saveState();

    alert(`${drillRun.subject} drill complete: ${pct}% • Time: ${fmtTime(ms)}`);
    closeDrill();

    if(currentSubject === drillRun.subject){
      renderSubjectChartsNearTop(currentSubject);
    }
    renderTiles();
  }

  function closeDrill(){
    $("drillModal")?.classList.add("hidden");
    drillRun = null;
  }

  // ---------- Charts near top ----------
  function renderSubjectChartsNearTop(subject){
    const hub = $("subjectHub");
    const anchor = $("turbitoContainer") || hub?.firstChild;
    if(!hub || !anchor) return;

    // wrappers (create once)
    let topWrap = $("hubChartsTop");
    if(!topWrap){
      topWrap = document.createElement("div");
      topWrap.id = "hubChartsTop";
      topWrap.style.margin = "10px 0";
      // insert BEFORE turbito container so it’s not “far away”
      hub.insertBefore(topWrap, anchor);
      topWrap.innerHTML = `
        <div style="display:grid;gap:14px">
          <div>
            <h3 style="margin:6px 0">Results Trend</h3>
            <canvas id="resultsChart" height="120"></canvas>
          </div>
          <div>
            <h3 style="margin:6px 0">Drill Streak</h3>
            <div class="muted" style="margin-bottom:6px">Intent earns the coach.</div>
            <canvas id="drillChart" height="120"></canvas>
          </div>
        </div>
      `;
    }

    renderResultsChart(subject);
    renderDrillChart(subject);
  }

  function renderResultsChart(subject){
    const canvas = $("resultsChart");
    if(!canvas || typeof Chart !== "function") return;

    const arr = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).slice(-12);
    const labels = arr.map(r => (r.date ? r.date.slice(5) : ""));
    const values = arr.map(r => r.score);

    if(resultsChart) resultsChart.destroy();
    resultsChart = new Chart(canvas, {
      type:"line",
      data:{
        labels,
        datasets:[{
          data: values,
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

  function renderDrillChart(subject){
    const canvas = $("drillChart");
    if(!canvas || typeof Chart !== "function") return;

    const arr = (state.drillScores?.[subject] || []).slice(-12);
    const labels = arr.map(d => (d.date ? d.date.slice(5) : ""));
    const values = arr.map(d => d.pct);

    if(drillChart) drillChart.destroy();
    drillChart = new Chart(canvas, {
      type:"line",
      data:{
        labels,
        datasets:[{
          data: values,
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

  // ---------- Turbito ----------
  function launchTurbito(subject){
    // If turbito.js is improved (below), it will now pull real questions from DRILL_BANK
    if(typeof window.startTurbito === "function"){
      window.startTurbito(subject);
    }
  }

  // ---------- Storage ----------
  function fresh(){
    return {
      profile: { name:"", picked:[] },
      results: {},
      drillScores: {},
      aiLastAt: {}
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return fresh();
      const s = JSON.parse(raw);
      s.profile = s.profile || { name:"", picked:[] };
      s.profile.picked = s.profile.picked || [];
      s.results = s.results || {};
      s.drillScores = s.drillScores || {};
      s.aiLastAt = s.aiLastAt || {};
      return s;
    }catch{
      return fresh();
    }
  }

  function saveState(){
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function resetAll(){
    if(!confirm("Reset all data on this device?")) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  }

  // Debug handle
  window.__LC_STATE__ = state;

})();
