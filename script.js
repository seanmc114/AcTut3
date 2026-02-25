/* script.js — LC Coach + Turbito Hub (Synge Street) — FIXED UI + EASY SUBJECT PICK
   - Students pick only their subjects (names OR numbers; no commas required)
   - Coach button works (auto-injects coach panel into existing HTML)
   - Clear differentiation: Turbito vs Coach/Drills inside Subject Hub
   - Ordinary (O) = blue, Higher (H) = pink for familiarity
   - Charts appear near top of hub (not buried)
*/

(() => {
  "use strict";

  const LS_KEY = "SYNGE_LC_COACH_V5";

  // Earned AI coach
  const AI_MIN_RESULTS = 2;
  const AI_MIN_SCORE_FOR_AI = 70;       // performance unlock
  const AI_MIN_DRILL_AVG_FOR_AI = 70;   // intent unlock
  const AI_COOLDOWN_MS = 60 * 60 * 1000;

  const SUBJECT_CATALOGUE = [
    "English","Maths","Spanish","French","German",
    "Biology","Chemistry","Physics",
    "Accounting","Economics","Business",
    "History","Geography","Home Ec","Art","PE"
  ];

  const $ = (id) => document.getElementById(id);

  const state = loadState();
  let currentSubject = null;

  // drill run state
  let drillRun = null;

  // charts
  let drillChart = null;
  let resultsChart = null;

  // ---------- helpers ----------
  function esc(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function avg(arr){ return arr && arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null; }
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
  function focus(el){
    if(!el) return;
    setTimeout(()=>{ try{ el.focus(); }catch{} }, 0);
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
  function levelAccent(level){
    return level === "O" ? "#2b6cff" : "#ff3fa6"; // O blue, H pink
  }

  function pickedList(){
    return state.profile.picked || [];
  }
  function pickedSubjects(){
    return pickedList().map(p=>p.subject);
  }
  function pickedLevel(subject){
    const p = pickedList().find(x=>x.subject===subject);
    return p?.level || "H";
  }

  // ---------- inject missing UI (coach boxes) ----------
  function ensureCoachBoxes(){
    // Dashboard coach area inside the "Add Result" card
    const dash = $("dash");
    if(dash && !$("coachBoxDash")){
      const card = dash.querySelector(".card"); // first card is Add Result card in your HTML
      if(card){
        const div = document.createElement("div");
        div.id = "coachBoxDash";
        div.style.marginTop = "12px";
        div.innerHTML = `<div class="muted">Coach: add results, then press “Coach Me”.</div>`;
        card.appendChild(div);
      }
    }

    // Subject hub coach area (so hub clearly has Turbito + Coach/Drills)
    const hub = $("subjectHub");
    if(hub && !$("coachBoxHub")){
      const wrap = document.createElement("div");
      wrap.id = "coachBoxHubWrap";
      wrap.style.marginTop = "14px";
      wrap.innerHTML = `
        <h3 style="margin:10px 0 6px">Coach & Drills</h3>
        <div id="coachBoxHub" class="muted" style="margin-bottom:10px">
          Press <strong>Coach Me</strong> (on dashboard) or use the button below to coach this subject.
        </div>
        <button id="btnCoachThis" class="primary">Coach this subject</button>
      `;
      hub.appendChild(wrap);

      // wire hub coach button
      setTimeout(()=>{
        $("btnCoachThis")?.addEventListener("click", ()=>{
          if(currentSubject) coachThisSubject(currentSubject);
        });
      }, 0);
    }
  }

  function setCoachDash(html){
    ensureCoachBoxes();
    const box = $("coachBoxDash");
    if(box) box.innerHTML = html;
  }

  function setCoachHub(html){
    ensureCoachBoxes();
    const box = $("coachBoxHub");
    if(box) box.innerHTML = html;
  }

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded", ()=>{
    ensureCoachBoxes();

    focus($("name"));

    const mDate = $("mDate");
    if(mDate && !mDate.value) mDate.value = new Date().toISOString().slice(0,10);

    $("btnStart")?.addEventListener("click", startFlow);
    $("btnAdd")?.addEventListener("click", addResultFlow);
    $("btnCoach")?.addEventListener("click", coachFlow);
    $("btnReset")?.addEventListener("click", resetAll);

    $("btnBackToDash")?.addEventListener("click", ()=>{
      $("subjectHub")?.classList.add("hidden");
      $("dash")?.classList.remove("hidden");
      currentSubject = null;
    });

    $("btnTurbito")?.addEventListener("click", ()=>{
      if(currentSubject) launchTurbito(currentSubject);
    });

    $("btnSubmit")?.addEventListener("click", submitDrillAnswer);
    $("btnExitDrill")?.addEventListener("click", closeDrill);

    $("dAnswer")?.addEventListener("keydown",(e)=>{
      if(e.key==="Enter") submitDrillAnswer();
    });

    render();
  });

  // ---------- subject picking (easy) ----------
  function startFlow(){
    const name = ($("name")?.value || "").trim();
    if(!name){
      alert("Enter a nickname first.");
      focus($("name"));
      return;
    }

    // if no picked subjects yet, pick now
    if(!state.profile.picked || !state.profile.picked.length){
      const picked = promptPickSubjectsEasy();
      if(!picked.length) return;
      state.profile.picked = picked;
    }

    state.profile.name = name;
    saveState();
    render();
  }

  function promptPickSubjectsEasy(){
    // Accept: names ("Spanish Maths Biology") OR numbers ("2 3 6") OR mixed.
    const list = SUBJECT_CATALOGUE.map((s,i)=>`${i+1}. ${s}`).join("\n");
    const raw = prompt(
      "Choose your subjects.\n\n" +
      "EASY: type subject NAMES (e.g. Spanish Maths Biology)\n" +
      "OR type NUMBERS (e.g. 2 3 6)\n\n" +
      list,
      ""
    );
    if(raw === null) return [];

    const tokens = raw
      .replace(/and/gi," ")
      .replace(/,/g," ")
      .split(/\s+/)
      .map(t=>t.trim())
      .filter(Boolean);

    const chosen = new Map(); // subject -> true

    // numbers
    tokens.forEach(t=>{
      const n = parseInt(t,10);
      if(Number.isFinite(n) && n>=1 && n<=SUBJECT_CATALOGUE.length){
        chosen.set(SUBJECT_CATALOGUE[n-1], true);
      }
    });

    // names (case-insensitive contains match)
    tokens.forEach(t=>{
      const low = t.toLowerCase();
      SUBJECT_CATALOGUE.forEach(s=>{
        if(s.toLowerCase().replace(/\s+/g,"") === low.replace(/\s+/g,"")){
          chosen.set(s,true);
        }
      });
    });

    const subjects = [...chosen.keys()];
    if(!subjects.length){
      alert("No valid subjects detected. Try typing: Spanish Maths Biology (or 2 3 6).");
      return [];
    }

    // Choose H/O per subject
    const picked = [];
    for(const s of subjects){
      const lvlRaw = prompt(`Level for ${s}? Type H or O`, "H");
      const lvl = String(lvlRaw||"H").trim().toUpperCase()==="O" ? "O" : "H";
      picked.push({ subject:s, level:lvl });
    }
    return picked;
  }

  // ---------- render ----------
  function render(){
    ensureCoachBoxes();

    const hasName = !!(state.profile.name || "").trim();
    $("setup")?.classList.toggle("hidden", hasName);
    $("dash")?.classList.toggle("hidden", !hasName);

    if(!hasName) return;

    // If name exists but no picked subjects (old data), prompt once
    if(!state.profile.picked || !state.profile.picked.length){
      const picked = promptPickSubjectsEasy();
      if(picked.length){
        state.profile.picked = picked;
        saveState();
      }
    }

    renderOverall();
    renderTiles();

    setCoachDash(`<div class="muted">Add results (you can backfill older dates). Then press <strong>Coach Me</strong>.</div>`);
  }

  function renderOverall(){
    const subs = pickedSubjects();
    const all = [];
    subs.forEach(s => (state.results[s]||[]).forEach(r=>all.push(r.score)));
    const overall = all.length ? Math.round(avg(all)) : null;

    $("overallAvg") && ($("overallAvg").textContent = overall===null ? "—" : `${overall}%`);
    $("overallBand") && ($("overallBand").textContent = overall===null ? "—" : band(overall));

    let recovered = 0;
    subs.forEach(s=>{
      const arr = (state.results[s]||[]).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
      if(arr.length>=2) recovered += (arr[arr.length-1].score - arr[0].score);
    });
    $("marksRecovered") && ($("marksRecovered").textContent = String(recovered));
  }

  function lastDrillAvg(subject, n=5){
    const d = (state.drillScores?.[subject] || []).slice(-n);
    return d.length ? Math.round(avg(d.map(x=>x.pct))) : null;
  }

  function starsForSubject(subject){
    const drillAvg = lastDrillAvg(subject, 5);
    const res = (state.results[subject]||[]).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    const trend = res.length>=2 ? (res[res.length-1].score - res[0].score) : 0;

    let score = 0;
    if(drillAvg !== null) score += Math.round(clamp(drillAvg,0,100)/100*7);
    score += Math.round(clamp((trend/15)*3, -3, 3));
    score = clamp(score,0,10);

    return "★".repeat(score) + "☆".repeat(10-score);
  }

  function renderTiles(){
    const tiles = $("tiles");
    if(!tiles) return;
    tiles.innerHTML = "";

    pickedList().forEach(({subject, level})=>{
      const arr = (state.results[subject]||[]).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
      const avgScore = arr.length ? Math.round(avg(arr.map(r=>r.score))) : null;
      const last = arr.length ? arr[arr.length-1] : null;
      const fill = avgScore===null ? 0 : clamp(avgScore,0,100);
      const accent = levelAccent(level);
      const stars = starsForSubject(subject);

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

  // ---------- dashboard subject picking for add/coach (easy) ----------
  function promptPickFromChosen(label){
    const chosen = pickedSubjects();
    const list = chosen.map((s,i)=>`${i+1}. ${s}`).join("\n");
    const raw = prompt(`${label}\n\nType NAME (e.g. Spanish) OR NUMBER (e.g. 2)\n\n${list}`, "");
    if(raw === null) return null;

    const t = raw.trim();
    if(!t) return null;

    const n = parseInt(t,10);
    if(Number.isFinite(n) && n>=1 && n<=chosen.length) return chosen[n-1];

    // name match
    const low = t.toLowerCase().replace(/\s+/g,"");
    const found = chosen.find(s=> s.toLowerCase().replace(/\s+/g,"") === low);
    if(found) return found;

    alert("Not recognised. Type a subject name or its number.");
    return null;
  }

  // ---------- add result ----------
  function addResultFlow(){
    if(!(state.profile.name||"").trim()){
      alert("Enter a nickname first.");
      focus($("name"));
      return;
    }
    if(!pickedSubjects().length){
      alert("Press Start and pick subjects first.");
      return;
    }

    const subject = promptPickFromChosen("Add Result — which subject?");
    if(!subject) return;

    const date = ($("mDate")?.value || "").trim() || new Date().toISOString().slice(0,10);

    const raw = prompt(`Enter ${subject} overall % (0–100)`, "");
    if(raw === null) return;
    const score = toNum(raw);
    if(score === null || score<0 || score>100){
      alert("Please enter a number between 0 and 100.");
      return;
    }

    state.results[subject] = state.results[subject] || [];
    state.results[subject].push({ date, score: Math.round(score) });
    state.results[subject].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    saveState();

    renderOverall();
    renderTiles();

    setCoachDash(`<div><strong>${esc(subject)}</strong> saved: ${esc(date)} • ${Math.round(score)}%</div><div class="muted">Now press <strong>Coach Me</strong> for the mark-leak drill.</div>`);

    if(currentSubject === subject) renderHubChartsNearTop(subject);
  }

  // ---------- subject hub ----------
  function openSubject(subject){
    currentSubject = subject;

    $("dash")?.classList.add("hidden");
    $("subjectHub")?.classList.remove("hidden");

    const lvl = pickedLevel(subject);
    const accent = levelAccent(lvl);

    $("subjectTitle") && ($("subjectTitle").textContent = `${subject} (${lvl})`);

    // color-cue buttons (no CSS edits)
    if($("btnTurbito")) $("btnTurbito").style.background = accent;
    if($("btnBackToDash")) $("btnBackToDash").style.borderColor = accent;

    // clear separation note at top
    ensureHubNote(subject, lvl, accent);

    // charts near top (so not “far away”)
    renderHubChartsNearTop(subject);

    // turbito should render levels
    launchTurbito(subject);
  }

  function ensureHubNote(subject, lvl, accent){
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
      hub.insertBefore(note, hub.firstChild);
    }
    note.innerHTML = `
      <div style="font-weight:900;color:${accent}">${esc(subject)} • ${lvl==="O"?"Ordinary (Blue)":"Higher (Pink)"}</div>
      <div class="muted"><strong>Turbito</strong> = fast recall/high score. <strong>Coach & Drills</strong> = fix mark leaks.</div>
    `;
  }

  // ---------- charts near top ----------
  function renderHubChartsNearTop(subject){
    ensureCoachBoxes();

    const hub = $("subjectHub");
    const turbitoContainer = $("turbitoContainer");
    if(!hub || !turbitoContainer) return;

    let wrap = $("hubChartsTop");
    if(!wrap){
      wrap = document.createElement("div");
      wrap.id = "hubChartsTop";
      wrap.style.margin = "10px 0";
      hub.insertBefore(wrap, turbitoContainer); // BEFORE Turbito so it’s near the top
      wrap.innerHTML = `
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

    const arr = (state.results[subject]||[]).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).slice(-12);
    const labels = arr.map(r=> (r.date ? r.date.slice(5) : ""));
    const values = arr.map(r=> r.score);

    if(resultsChart) resultsChart.destroy();
    resultsChart = new Chart(canvas, {
      type:"line",
      data:{ labels, datasets:[{ data:values, fill:true, tension:0.25, borderColor:"#1f7a4c", backgroundColor:"rgba(31,122,76,.18)", pointRadius:4 }] },
      options:{ responsive:true, plugins:{ legend:{ display:false } }, scales:{ y:{ min:0, max:100 } } }
    });
  }

  function renderDrillChart(subject){
    const canvas = $("drillChart");
    if(!canvas || typeof Chart !== "function") return;

    const arr = (state.drillScores?.[subject] || []).slice(-12);
    const labels = arr.map(d=> (d.date ? d.date.slice(5) : ""));
    const values = arr.map(d=> d.pct);

    if(drillChart) drillChart.destroy();
    drillChart = new Chart(canvas, {
      type:"line",
      data:{ labels, datasets:[{ data:values, fill:true, tension:0.25, borderColor:"#1f7a4c", backgroundColor:"rgba(31,122,76,.18)", pointRadius:4 }] },
      options:{ responsive:true, plugins:{ legend:{ display:false } }, scales:{ y:{ min:0, max:100 } } }
    });
  }

  // ---------- coach ----------
  function coachFlow(){
    const subject = promptPickFromChosen("Coach Me — which subject?");
    if(!subject) return;
    coachThisSubject(subject);
  }

  async function coachThisSubject(subject){
    const arr = (state.results[subject]||[]).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    if(arr.length < 2){
      const msg = `<div class="muted">Add at least two results for <strong>${esc(subject)}</strong> so coach can see a trend.</div>`;
      setCoachDash(msg);
      setCoachHub(msg);
      return;
    }

    const heuristic = heuristicFocus(subject, arr);
    const pack = buildPrescribedDrill(subject, heuristic);

    const aiAllowed = aiUnlockedFor(subject, arr.length);

    showCoachPanels(subject, heuristic, pack, aiAllowed, false);

    if(aiAllowed){
      try{
        const ai = await runAiCoach(subject, arr, heuristic);
        if(ai){
          const drills = normalizeAiDrills(ai.drills);
          const aiPack = {
            title: `${subject} • AI Prescribed`,
            items: drills.length ? drills.slice(0,10).map(q=>({q, a:["*"]})) : pack.items
          };
          showCoachPanels(subject, { focus: ai.focus || heuristic.focus, feedback: ai.feedback || heuristic.feedback, mode: heuristic.mode }, aiPack, true, true);
          markAiUsed(subject);
        }
      }catch(e){
        // keep heuristic output
        console.warn(e);
      }
    }
  }

  function showCoachPanels(subject, focusObj, pack, aiAllowed, aiUsed){
    const drillPreview = (pack.items||[]).slice(0,4).map(x=>`<li>${esc(x.q)}</li>`).join("");
    const lockLine = aiAllowed
      ? `<div class="muted">${aiUsed ? "AI coach active." : "Coach enters now (earned). Running AI..."}</div>`
      : `<div class="muted">AI coach enters at ≥ <strong>${AI_MIN_SCORE_FOR_AI}%</strong> OR drill avg ≥ <strong>${AI_MIN_DRILL_AVG_FOR_AI}%</strong>.</div>`;

    const html = `
      <div><strong>${esc(subject)} Coach</strong></div>
      ${lockLine}
      <div style="margin-top:10px"><strong>Biggest mark leak:</strong> ${esc(focusObj.focus)}</div>
      <div class="muted" style="margin-top:6px">${esc(focusObj.feedback)}</div>
      <div style="margin-top:10px"><strong>Prescribed drill (10):</strong></div>
      <ul>${drillPreview}</ul>
      <div style="margin-top:10px">
        <button id="btnStartPrescribedDash" class="primary">Start Drill (10)</button>
      </div>
    `;

    setCoachDash(html);
    setCoachHub(html.replace('btnStartPrescribedDash','btnStartPrescribedHub'));

    // wire both buttons
    setTimeout(()=>{
      $("btnStartPrescribedDash")?.addEventListener("click", ()=> startDrill(subject, pack));
      $("btnStartPrescribedHub")?.addEventListener("click", ()=> startDrill(subject, pack));
    }, 0);
  }

  function heuristicFocus(subject, arr){
    const last = arr[arr.length-1];
    const prev = arr[arr.length-2];
    const delta = last.score - prev.score;

    const mode = last.score < 55 ? "build" : (last.score < 75 ? "strength" : "exam");
    const modeLabel = mode==="build" ? "Build Mode" : mode==="strength" ? "Strength Mode" : "Exam Mode";

    let focus = "Paper structure + timing";
    let feedback = `You’re in ${modeLabel}. `;

    if(delta < 0){
      focus = "Stability: remove silly drops";
      feedback += `Down ${Math.abs(delta)}. Next win: no blanks, clean method marks, repeat tight routine.`;
    }else if(delta > 0){
      focus = "Convert improvement into consistency";
      feedback += `Up ${delta}. Repeat what worked and add targeted reps weekly.`;
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
    const bank = window.DRILL_BANK?.[subject];
    const cat = focusObj.mode === "build" ? "build" : focusObj.mode === "strength" ? "strength" : "exam";

    let items = [];
    if(bank){
      const arr = bank[cat] || bank.rapid || bank.build || bank.strength || bank.exam || [];
      if(Array.isArray(arr) && arr.length){
        items = shuffle(arr.slice()).slice(0,10);
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

  function aiUnlockedFor(subject, resultsCount){
    if(resultsCount < AI_MIN_RESULTS) return false;

    const arr = (state.results[subject]||[]).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
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

  async function runAiCoach(subject, arr, fallback){
    const last = arr[arr.length-1];
    const prev = arr[arr.length-2];

    const task = [
      "LC PERFORMANCE COACH",
      `Subject: ${subject}`,
      `Previous: ${prev.date} — ${prev.score}%`,
      `Latest: ${last.date} — ${last.score}%`,
      "Identify the single biggest mark leak (where marks are being lost) and prescribe drills.",
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
      feedback: String(res.feedback || fallback.feedback || "—").slice(0,600),
      drills: Array.isArray(res.drills) ? res.drills.map(x=>String(x)) : []
    };
  }

  function normalizeAiDrills(drills){
    if(!Array.isArray(drills)) return [];
    return drills.map(d=>String(d).trim()).filter(Boolean);
  }

  // ---------- drill modal ----------
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

    render();
    if(currentSubject === drillRun.subject) renderHubChartsNearTop(currentSubject);
  }

  function closeDrill(){
    $("drillModal")?.classList.add("hidden");
    drillRun = null;
  }

  // ---------- turbito ----------
  function launchTurbito(subject){
    // IMPORTANT: if startTurbito is missing, we show that message in the container (not at bottom).
    const c = $("turbitoContainer");
    if(typeof window.startTurbito === "function"){
      window.startTurbito(subject);
    }else{
      if(c) c.innerHTML = `<div class="muted">Turbito not loaded. Check turbito.js is present and linked.</div>`;
    }
  }

  // ---------- storage ----------
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

  window.__LC_STATE__ = state;

})();
