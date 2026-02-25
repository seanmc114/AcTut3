/* script.js — LC Performance Coach (Synge Street) — ONE FILE DROP-IN
   Keeps look. Connects Turbito + Drills + Coach.
   AI Coach unlock is EARNED:
   - At least 2 results in a subject
   - AND (latest result >= 70% OR drill-intent avg >= 70%)
   - AND cooldown (default 1 hour per subject)
*/

(() => {
  "use strict";

  // ========= COST / UNLOCK POLICY =========
  const AI_MIN_RESULTS = 2;                 // must have trend
  const AI_MIN_SCORE_FOR_AI = 70;           // "coach enters" by performance
  const AI_MIN_DRILL_AVG_FOR_AI = 70;       // or by intent (drill work)
  const AI_COOLDOWN_MS = 60 * 60 * 1000;    // 1 hour per subject

  const LS_KEY = "SYNGE_LC_PERF_COACH_V4";

  // ========= SUBJECT LIST =========
  const SUBJECTS = [
    "English","Maths","Spanish","French","German",
    "Biology","Chemistry","Physics",
    "Accounting","Economics","Business",
    "History","Geography","Home Ec","Art","PE"
  ];

  // ========= STATE =========
  const state = loadState();
  let currentSubject = null;

  // drill run state
  let drillRun = null;

  // charts
  let drillChart = null;
  let resultsChart = null;

  // ========= DOM HELPERS =========
  const $ = (id) => document.getElementById(id);

  function esc(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function toNum(x){
    const n = Number(String(x).replace("%","").trim());
    return Number.isFinite(n) ? n : null;
  }

  function avg(arr){
    if(!arr || !arr.length) return null;
    return arr.reduce((a,b)=>a+b,0) / arr.length;
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

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
  }

  function fmtTime(ms){
    const total = Math.floor(ms/1000);
    const m = Math.floor(total/60);
    const s = total % 60;
    return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  }

  // ========= INIT =========
  document.addEventListener("DOMContentLoaded", () => {
    // Cursor: nickname
    focus($("name"));

    // Default date (still allows backfill)
    const mDate = $("mDate");
    if(mDate && !mDate.value){
      mDate.value = new Date().toISOString().slice(0,10);
    }

    // Buttons
    $("btnStart")?.addEventListener("click", enter);
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

    // Enter to submit in drill
    $("dAnswer")?.addEventListener("keydown", (e)=>{
      if(e.key === "Enter") submitDrillAnswer();
    });

    render();
  });

  // ========= MAIN UI =========
  function enter(){
    const name = ($("name")?.value || "").trim();
    if(!name){
      alert("Enter a nickname first.");
      focus($("name"));
      return;
    }
    state.profile.name = name;
    saveState();
    render();
  }

  function render(){
    const hasName = !!(state.profile.name || "").trim();
    $("setup")?.classList.toggle("hidden", hasName);
    $("dash")?.classList.toggle("hidden", !hasName);

    $("whoName") && ($("whoName").textContent = state.profile.name || "—");

    renderOverall();
    renderTiles();
  }

  function renderOverall(){
    const allScores = [];
    for(const s of SUBJECTS){
      const arr = state.results[s] || [];
      for(const r of arr) allScores.push(r.score);
    }
    const overall = allScores.length ? Math.round(avg(allScores)) : null;

    $("overallAvg") && ($("overallAvg").textContent = overall===null ? "—" : `${overall}%`);
    $("overallBand") && ($("overallBand").textContent = overall===null ? "—" : band(overall));

    // Marks recovered (simple: sum of subject deltas)
    let recovered = 0;
    for(const s of SUBJECTS){
      const arr = (state.results[s] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
      if(arr.length >= 2) recovered += (arr[arr.length-1].score - arr[0].score);
    }
    $("marksRecovered") && ($("marksRecovered").textContent = String(recovered));
  }

  function starsForSubject(subject){
    // 0–10 stars based on drill intent (last 5 avg) + improvement trend.
    const drills = (state.drillScores?.[subject] || []).slice(-5);
    const drillAvg = drills.length ? Math.round(avg(drills.map(d=>d.pct))) : null;

    const res = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    const trend = (res.length >= 2) ? (res[res.length-1].score - res[0].score) : 0;

    let score = 0;

    // Drill intent: up to 7 stars
    if(drillAvg !== null){
      score += Math.round(clamp(drillAvg, 0, 100) / 100 * 7);
    }

    // Trend bonus: up to +3 stars
    // +15 points or more gives full bonus, negative trend reduces it
    const bonus = Math.round(clamp((trend / 15) * 3, -3, 3));
    score += bonus;

    score = clamp(score, 0, 10);

    const full = "★".repeat(score);
    const empty = "☆".repeat(10 - score);
    return full + empty;
  }

  function renderTiles(){
    const tiles = $("tiles");
    if(!tiles) return;
    tiles.innerHTML = "";

    SUBJECTS.forEach(subject=>{
      const arr = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
      const avgScore = arr.length ? Math.round(avg(arr.map(r=>r.score))) : null;
      const last = arr.length ? arr[arr.length-1] : null;

      const fill = avgScore===null ? 0 : clamp(avgScore,0,100);
      const stars = starsForSubject(subject);

      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `
        <div class="tileTop">
          <div>
            <div class="tileName">${esc(subject)}</div>
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

  function openSubject(subject){
    currentSubject = subject;

    $("dash")?.classList.add("hidden");
    $("subjectHub")?.classList.remove("hidden");
    $("subjectTitle") && ($("subjectTitle").textContent = subject);

    // Turbito linked immediately
    launchTurbito(subject);

    // Charts in hub (results + drill streak)
    renderSubjectCharts(subject);
  }

  // ========= RESULTS ENTRY =========
  function addResultFlow(){
    if(!(state.profile.name || "").trim()){
      alert("Enter a nickname first.");
      focus($("name"));
      return;
    }

    // choose subject
    const subject = pickSubjectPrompt();
    if(!subject) return;

    // date (supports older backfill)
    const date = ($("mDate")?.value || "").trim() || new Date().toISOString().slice(0,10);

    // score
    let raw = prompt(`Enter ${subject} overall % (0–100). Example: 62`, "");
    if(raw === null) return;
    raw = raw.trim();
    const score = toNum(raw);

    if(score === null || score < 0 || score > 100){
      alert("Please enter a number between 0 and 100.");
      return;
    }

    addResult(subject, date, Math.round(score));

    renderOverall();
    renderTiles();

    // If currently in this subject hub, refresh charts too
    if(currentSubject === subject){
      renderSubjectCharts(subject);
    }
  }

  function pickSubjectPrompt(){
    const list = SUBJECTS.map((s,i)=> `${i+1}. ${s}`).join("\n");
    const raw = prompt("Which subject?\n\n" + list + "\n\nType a number (e.g. 3)", "");
    if(raw === null) return null;
    const n = parseInt(raw.trim(), 10);
    if(!Number.isFinite(n) || n < 1 || n > SUBJECTS.length){
      alert("Not a valid subject number.");
      return null;
    }
    return SUBJECTS[n-1];
  }

  function addResult(subject, date, score){
    state.results[subject] = state.results[subject] || [];
    state.results[subject].push({ date, score });
    state.results[subject].sort((a,b)=>(a.date||"").localeCompare(b.date||"")); // backfill friendly
    saveState();
  }

  // ========= COACH =========
  async function coachFlow(){
    if(!(state.profile.name || "").trim()){
      alert("Enter a nickname first.");
      focus($("name"));
      return;
    }

    const subject = pickSubjectPrompt();
    if(!subject) return;

    const arr = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    if(arr.length < 2){
      alert(`Add at least two results for ${subject} first (so the coach can see a trend).`);
      return;
    }

    const focusObj = heuristicFocus(subject, arr);
    const prescribed = buildPrescribedDrill(subject, focusObj);

    const aiAllowed = aiUnlockedFor(subject, arr.length);

    // Coach output goes in the existing coach area (same look)
    showCoachPanel(subject, focusObj, prescribed, aiAllowed);

    if(aiAllowed){
      try{
        const ai = await runAiCoach(subject, arr, focusObj);
        if(ai){
          // Replace with AI output + keep drill start button
          showCoachPanel(subject, {
            focus: ai.focus || focusObj.focus,
            feedback: ai.feedback || focusObj.feedback,
            mode: focusObj.mode
          }, {
            title: prescribed.title,
            items: normalizeAiDrills(ai.drills).length
              ? normalizeAiDrills(ai.drills).slice(0,10).map(q=>({q, a:["*"]}))
              : prescribed.items
          }, true, true);
          markAiUsed(subject);
        }
      }catch(e){
        console.warn(e);
        // Keep heuristic panel; no disruption.
      }
    }
  }

  function showCoachPanel(subject, focusObj, prescribed, aiAllowed, aiUsed=false){
    const coachBox = $("coachBox");
    if(!coachBox) return;

    const drillsList = (prescribed.items || []).slice(0,4).map(x=>`<li>${esc(x.q)}</li>`).join("");

    const lockLine = aiAllowed
      ? `<div class="muted">${aiUsed ? "AI coach active." : `Coach enters now (earned): ≥ ${AI_MIN_SCORE_FOR_AI}% OR drill intent ≥ ${AI_MIN_DRILL_AVG_FOR_AI}%. Running AI...`}</div>`
      : `<div class="muted">Coach (AI) enters at ≥ <strong>${AI_MIN_SCORE_FOR_AI}%</strong> OR drill intent ≥ <strong>${AI_MIN_DRILL_AVG_FOR_AI}%</strong>. For now: built-in coach + prescribed reps.</div>`;

    coachBox.innerHTML = `
      <div><strong>${esc(subject)} Coach</strong></div>
      ${lockLine}
      <div style="margin-top:10px"><strong>Most costly weakness:</strong> ${esc(focusObj.focus)}</div>
      <div class="muted" style="margin-top:6px">${esc(focusObj.feedback)}</div>
      <div style="margin-top:10px"><strong>Prescribed drill (next 10):</strong></div>
      <ul>${drillsList || `<li class="muted">Drill bank empty; using fallback prompts.</li>`}</ul>
      <div style="margin-top:10px">
        <button id="btnStartPrescribed" class="primary">Start Prescribed Drill (10)</button>
      </div>
    `;

    // Wire start drill button
    setTimeout(()=>{
      $("btnStartPrescribed")?.addEventListener("click", ()=> startDrill(subject, { title: prescribed.title, items: prescribed.items }));
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
      feedback += `Latest score dipped by ${Math.abs(delta)} points. Tighten routines: no blanks, clean steps, show method marks.`;
    }else if(delta > 0){
      focus = "Convert improvement into consistency";
      feedback += `Up ${delta} points since last entry. Repeat what worked and add one targeted rep set each week.`;
    }else{
      feedback += "Flat since last entry. Pick one weakness and do 10 reps, then re-test.";
    }

    if(["Spanish","French","German"].includes(subject)){
      focus = (mode==="exam") ? "Writing polish + accuracy under pressure" : "Core accuracy: verbs + agreements";
      feedback = `Language focus: stop losing marks to basics. Then add 1–2 high-value structures (connectors, opinions, justification). ` + feedback;
    }else if(subject==="Maths"){
      focus = (mode==="exam") ? "Question selection + method marks" : "Algebra + routine skills";
      feedback = `Maths focus: method marks win grades. Write the line even if unsure—avoid blanks. ` + feedback;
    }else if(subject==="English"){
      focus = (mode==="exam") ? "Structure + evidence" : "Paragraph discipline";
      feedback = `English focus: point → evidence → explanation. No waffle. ` + feedback;
    }

    return { mode, focus, feedback };
  }

  function buildPrescribedDrill(subject, focusObj){
    // Category selection
    const cat = (focusObj.mode === "build") ? "rapid" : (focusObj.mode === "strength" ? "structure" : "exam");

    // Pull from DRILL_BANK if present
    const bank = window.DRILL_BANK?.[subject];
    let items = [];

    if(bank){
      const arr = bank[cat] || bank.rapid || bank.structure || bank.exam || [];
      if(Array.isArray(arr) && arr.length){
        items = shuffle(arr.slice()).slice(0, 10);
      }
    }

    // Generic fallback
    if(!items.length){
      items = [
        { q:`${subject}: Write 3 key definitions (no notes)`, a:["*"] },
        { q:`${subject}: Write 2 formulas / core facts`, a:["*"] },
        { q:`${subject}: 5-minute recall: list 5 exam phrases/terms`, a:["*"] },
        { q:`${subject}: One worked example / short answer (timed)`, a:["*"] },
        { q:`${subject}: Marking scheme scan: 3 phrases that earn marks`, a:["*"] },
        { q:`${subject}: Your 3 most common mistakes — list them`, a:["*"] },
        { q:`${subject}: Create a mini-checklist for this topic`, a:["*"] },
        { q:`${subject}: Explain one concept in 2 lines`, a:["*"] },
        { q:`${subject}: Command words: define 3 (e.g., explain/compare)`, a:["*"] },
        { q:`${subject}: Finish: write your “no blanks” rule`, a:["*"] }
      ];
    }

    return { title: `${subject} • ${cat.toUpperCase()} Drill`, items };
  }

  function lastDrillAvg(subject, n=5){
    const drills = (state.drillScores?.[subject] || []).slice(-n);
    if(!drills.length) return null;
    return Math.round(avg(drills.map(d=>d.pct)));
  }

  function aiUnlockedFor(subject, resultsCount){
    if(resultsCount < AI_MIN_RESULTS) return false;

    const arr = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    const latest = arr.length ? arr[arr.length-1] : null;
    if(!latest || typeof latest.score !== "number") return false;

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

  async function runAiCoach(subject, arr, fallback){
    const last = arr[arr.length-1];
    const prev = arr[arr.length-2];

    const task = [
      "LC PERFORMANCE COACH",
      `Subject: ${subject}`,
      `Previous: ${prev.date} — ${prev.score}%`,
      `Latest: ${last.date} — ${last.score}%`,
      "Identify the single most costly weakness (where marks are being lost), and prescribe a drill.",
      "Constraints: practical, short, no essays. Drills 10–20 mins.",
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

  // ========= DRILL MODAL =========
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
    focus($("dAnswer"));
  }

  function showDrillPrompt(){
    if(!drillRun) return;
    const item = drillRun.items[drillRun.i];
    if($("dPrompt")) $("dPrompt").textContent = `${drillRun.title} • Q${drillRun.i+1}/10: ${item?.q || ""}`;
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

    // keep last 30
    if(state.drillScores[drillRun.subject].length > 30){
      state.drillScores[drillRun.subject] = state.drillScores[drillRun.subject].slice(-30);
    }

    saveState();

    alert(`${drillRun.subject} drill complete: ${pct}% • Time: ${fmtTime(ms)}`);
    closeDrill();

    // refresh hub charts if in that subject
    if(currentSubject === drillRun.subject){
      renderSubjectCharts(currentSubject);
    }
    renderTiles();
  }

  function closeDrill(){
    $("drillModal")?.classList.add("hidden");
    drillRun = null;
  }

  // ========= SUBJECT HUB CHARTS =========
  function renderSubjectCharts(subject){
    // append containers without changing layout (just add below turbito container)
    const hub = $("subjectHub");
    if(!hub) return;

    // Results chart wrapper
    let rWrap = $("resultsChartWrap");
    if(!rWrap){
      rWrap = document.createElement("div");
      rWrap.id = "resultsChartWrap";
      rWrap.style.marginTop = "14px";
      rWrap.innerHTML = `
        <h3 style="margin:10px 0 6px">Results Trend</h3>
        <div class="muted" style="margin-bottom:8px">Last results (old dates included). Aim for a rising line.</div>
        <canvas id="resultsChart" height="120"></canvas>
      `;
      hub.appendChild(rWrap);
    }

    // Drill chart wrapper
    let dWrap = $("drillChartWrap");
    if(!dWrap){
      dWrap = document.createElement("div");
      dWrap.id = "drillChartWrap";
      dWrap.style.marginTop = "14px";
      dWrap.innerHTML = `
        <h3 style="margin:10px 0 6px">Drill Streak</h3>
        <div class="muted" style="margin-bottom:8px">Last drills (%). Intent earns the coach.</div>
        <canvas id="drillChart" height="120"></canvas>
      `;
      hub.appendChild(dWrap);
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

  // ========= TURBITO LINKING =========
  function launchTurbito(subject){
    const c = $("turbitoContainer");
    const v = $("turbitoView");
    if(c) c.innerHTML = "";
    if(v) v.style.display = "none";

    if(typeof window.startTurbito === "function"){
      window.startTurbito(subject);
    }else{
      if(c) c.innerHTML = `<p class="muted">Turbito not loaded. Check <strong>turbito.js</strong> is linked and present.</p>`;
    }
  }

  // alias for older calls
  (function ensureTurbitoAliases(){
    const wire = ()=>{
      if(typeof window.startTurbito === "function"){
        window.Turbito = window.startTurbito;
        window.turbito = window.startTurbito;
        return true;
      }
      return false;
    };
    if(!wire()){
      let tries = 0;
      const t = setInterval(()=>{
        tries++;
        if(wire() || tries>40) clearInterval(t);
      }, 250);
    }
  })();

  // ========= RESET =========
  function resetAll(){
    if(!confirm("Reset all data on this device?")) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  }

  // ========= STORAGE =========
  function fresh(){
    return {
      profile: { name:"" },
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
      s.profile = s.profile || { name:"" };
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

  // Debug handle (optional)
  window.__LC_STATE__ = state;

})();
