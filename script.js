/* script.js — LC Coach + Turbito UX glue (uses DRILL_BANK rapid/structured/cloze)
   - Fixes Coach button (always responsive: creates coachBox if missing)
   - Subject selection by ticking subjects (kid-friendly)
   - Turbito gets its own header + motivational tagline
   - Turbito answer feedback: shows correct answer + (if structured item) scaffold hints
   - Keeps existing look: no CSS changes
*/

(() => {
  "use strict";

  const LS_KEY = "SYNGE_LC_COACH_V5";

  // Earned AI coach (intent OR performance)
  const AI_MIN_RESULTS = 2;
  const AI_MIN_SCORE_FOR_AI = 70;
  const AI_MIN_DRILL_AVG_FOR_AI = 70;
  const AI_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour per subject

  const SUBJECT_CATALOGUE = [
    "English","Maths","Spanish","French","German",
    "Biology","Chemistry","Physics",
    "Accounting","Economics","Business",
    "History","Geography","Home Ec","Art","PE"
  ];

  const state = loadState();
  let currentSubject = null;

  // drill run (coach drill, not turbito)
  let drillRun = null;

  const $ = (id) => document.getElementById(id);

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
  function avg(arr){ return arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length) : null; }
  function focus(el){ if(el) setTimeout(()=>{ try{ el.focus(); }catch{} }, 0); }
  function toNum(x){
    const n = Number(String(x).replace("%","").trim());
    return Number.isFinite(n) ? n : null;
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
  function levelAccent(level){
    return level === "O" ? "#2b6cff" : "#ff3fa6"; // Ordinary blue, Higher pink
  }
  function lastN(arr, n){ return arr.slice(Math.max(0, arr.length-n)); }

  function picked(){ return state.profile.picked || []; }
  function pickedSubjects(){ return picked().map(p=>p.subject); }
  function pickedLevel(subject){
    return (picked().find(x=>x.subject===subject)?.level) || "H";
  }

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded", () => {
    // Focus nickname
    focus($("name"));

    // Default date
    const mDate = $("mDate");
    if(mDate && !mDate.value) mDate.value = new Date().toISOString().slice(0,10);

    // Wire buttons safely
    safeBind("btnStart", startFlow);
    safeBind("btnAdd", addResultFlow);
    safeBind("btnCoach", coachFlow);
    safeBind("btnReset", resetAll);

    safeBind("btnBackToDash", () => {
      $("subjectHub")?.classList.add("hidden");
      $("dash")?.classList.remove("hidden");
      currentSubject = null;
    });

    safeBind("btnTurbito", () => {
      if(currentSubject) launchTurbito(currentSubject);
    });

    safeBind("btnSubmit", submitCoachDrillAnswer);
    safeBind("btnExitDrill", closeCoachDrill);

    $("dAnswer")?.addEventListener("keydown", (e)=>{
      if(e.key==="Enter") submitCoachDrillAnswer();
    });

    ensureSubjectPicker();
    ensureCoachBox();
    render();
  });

  function safeBind(id, fn){
    const el = $(id);
    if(!el) return;
    el.addEventListener("click", (e)=>{
      try{ fn(e); }
      catch(err){
        console.error(err);
        // visible error so it never feels “dead”
        ensureCoachBox().innerHTML = `<div class="muted">Coach error: check console. (${esc(err.message || err)})</div>`;
      }
    });
  }

  // ---------- UI injection (no HTML edits) ----------
  function ensureSubjectPicker(){
    const setup = $("setup");
    if(!setup) return;

    if($("subjectPicker")) return;

    const picker = document.createElement("div");
    picker.id = "subjectPicker";
    picker.style.marginTop = "12px";
    picker.style.paddingTop = "10px";
    picker.style.borderTop = "1px solid rgba(0,0,0,.08)";

    const rows = SUBJECT_CATALOGUE.map(s=>`
      <label style="display:flex;align-items:center;gap:10px;margin:8px 0;">
        <input type="checkbox" data-subject="${esc(s)}">
        <span style="flex:1">${esc(s)}</span>
        <select data-level="${esc(s)}">
          <option value="H">Higher</option>
          <option value="O">Ordinary</option>
        </select>
      </label>
    `).join("");

    picker.innerHTML = `
      <h3 style="margin:0 0 8px">Choose your subjects</h3>
      <div class="muted" style="margin-bottom:8px">Tick only what you do. Pick Higher/Ordinary.</div>
      ${rows}
      <button id="btnSaveSubjects" class="primary" style="margin-top:10px">Save subjects</button>
    `;

    setup.appendChild(picker);

    $("btnSaveSubjects")?.addEventListener("click", ()=>{
      const checks = [...picker.querySelectorAll('input[type="checkbox"][data-subject]')];
      const chosen = checks.filter(c=>c.checked).map(c=>c.getAttribute("data-subject"));
      if(!chosen.length){
        alert("Choose at least one subject.");
        return;
      }

      const pickedArr = chosen.map(sub=>{
        const sel = picker.querySelector(`select[data-level="${CSS.escape(sub)}"]`);
        const lvl = (sel?.value || "H").toUpperCase()==="O" ? "O" : "H";
        return { subject: sub, level: lvl };
      });

      state.profile.picked = pickedArr;
      saveState();
      render();
    });
  }

  function ensureCoachBox(){
    const dash = $("dash");
    if(!dash) return null;

    let box = dash.querySelector("#coachBox");
    if(box) return box;

    // Put it under the first .card (Add result card)
    const card = dash.querySelector(".card") || dash;
    box = document.createElement("div");
    box.id = "coachBox";
    box.style.marginTop = "12px";
    box.innerHTML = `<div class="muted">Coach ready. Add results, then press Coach.</div>`;
    card.appendChild(box);
    return box;
  }

  function ensureTurbitoHeader(subject){
    const hub = $("subjectHub");
    const container = $("turbitoContainer");
    if(!hub || !container) return;

    let head = $("turbitoHeader");
    if(!head){
      head = document.createElement("div");
      head.id = "turbitoHeader";
      head.style.margin = "10px 0 10px";
      head.style.transform = "skewX(-6deg)";
      head.style.fontWeight = "900";
      head.style.fontSize = "22px";
      hub.insertBefore(head, container);
    }

    let tag = $("turbitoTagline");
    if(!tag){
      tag = document.createElement("div");
      tag.id = "turbitoTagline";
      tag.className = "muted";
      tag.style.marginTop = "4px";
      tag.style.transform = "skewX(-6deg)";
      head.appendChild(tag);
    }

    head.textContent = "TURBITO ⚡";
    head.appendChild(tag);
    tag.textContent = pickTagline(subject);
  }

  function pickTagline(subject){
    const lines = [
      "Fast hands. Clean brain. No blanks.",
      "Reps win grades. One more round.",
      "Beat your best. Then beat the paper.",
      "Speed + accuracy = marks recovered.",
      "No fear. Just reps."
    ];
    return lines[Math.floor(Math.random()*lines.length)];
  }

  // ---------- render ----------
  function render(){
    const hasName = !!(state.profile.name || "").trim();
    const hasSubjects = !!picked().length;

    $("setup")?.classList.toggle("hidden", hasName && hasSubjects);
    $("dash")?.classList.toggle("hidden", !(hasName && hasSubjects));

    $("whoName") && ($("whoName").textContent = state.profile.name || "—");

    renderOverall();
    renderTiles();
  }

  function startFlow(){
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

  function renderOverall(){
    const subs = pickedSubjects();
    const all = [];
    subs.forEach(s => (state.results[s] || []).forEach(r=>all.push(r.score)));
    const overall = all.length ? Math.round(avg(all)) : null;

    $("overallAvg") && ($("overallAvg").textContent = overall===null ? "—" : `${overall}%`);
    $("overallBand") && ($("overallBand").textContent = overall===null ? "—" : band(overall));
  }

  function starsForSubject(subject){
    const drills = (state.drillScores?.[subject] || []).slice(-5);
    const drillAvg = drills.length ? Math.round(avg(drills.map(d=>d.pct))) : null;

    const res = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    const trend = (res.length>=2) ? (res[res.length-1].score - res[0].score) : 0;

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

    picked().forEach(({subject, level})=>{
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

  // ---------- subject hub ----------
  function openSubject(subject){
    currentSubject = subject;

    $("dash")?.classList.add("hidden");
    $("subjectHub")?.classList.remove("hidden");

    const level = pickedLevel(subject);
    const accent = levelAccent(level);

    $("subjectTitle") && ($("subjectTitle").textContent = `${subject} (${level==="O"?"Ordinary":"Higher"})`);

    // Clear differentiation: Turbito header + tagline
    ensureTurbitoHeader(subject);

    // Accent the Turbito button (no CSS edits)
    const bT = $("btnTurbito");
    if(bT) bT.style.background = accent;

    // Turbito loads
    launchTurbito(subject);

    // Coach quick status line (so it never feels dead)
    ensureCoachBox().innerHTML = `<div class="muted">Coach ready for ${esc(subject)}. Add results + do drills to earn deeper feedback.</div>`;
  }

  // ---------- add result ----------
  function addResultFlow(){
    if(!picked().length){
      alert("Choose subjects first.");
      return;
    }
    const subject = promptSubjectByName();
    if(!subject) return;

    const date = ($("mDate")?.value || "").trim() || new Date().toISOString().slice(0,10);
    const raw = prompt(`Enter ${subject} overall % (0–100)`, "");
    if(raw === null) return;
    const score = toNum(raw);
    if(score === null || score < 0 || score > 100){
      alert("Please enter a number between 0 and 100.");
      return;
    }

    state.results[subject] = state.results[subject] || [];
    state.results[subject].push({ date, score: Math.round(score) });
    state.results[subject].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    saveState();

    ensureCoachBox().innerHTML = `<div class="muted">Saved ${esc(subject)}: ${esc(date)} • ${Math.round(score)}%. Now press <strong>Coach</strong>.</div>`;

    renderOverall();
    renderTiles();
  }

  function promptSubjectByName(){
    const names = pickedSubjects();
    const raw = prompt(`Type a subject name:\n\n${names.join(", ")}`, names[0] || "");
    if(raw === null) return null;
    const t = raw.trim().toLowerCase();
    const found = names.find(n => n.toLowerCase() === t);
    if(!found){
      alert("Type it exactly (e.g. Spanish).");
      return null;
    }
    return found;
  }

  // ---------- coach ----------
  async function coachFlow(){
    const box = ensureCoachBox();

    // immediate feedback so it NEVER feels dead
    box.innerHTML = `<div class="muted">Coach is awake. Choosing subject…</div>`;

    const subject = promptSubjectByName();
    if(!subject){
      box.innerHTML = `<div class="muted">Coach: cancelled.</div>`;
      return;
    }

    const results = (state.results[subject] || []).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    if(results.length < 2){
      box.innerHTML = `<div class="muted">Add at least <strong>two</strong> results for ${esc(subject)} first (trend needed).</div>`;
      return;
    }

    // Determine drill leverage from banks you actually have: rapid / structured / cloze
    const bank = window.DRILL_BANK?.[subject];
    const hasStructured = !!(bank?.structured && bank.structured.length);
    const hasCloze = !!(bank?.cloze && bank.cloze.length);

    const heuristic = heuristicFocus(subject, results);
    const pack = buildCoachDrillPack(subject, heuristic);

    const aiAllowed = aiUnlockedFor(subject, results);

    box.innerHTML = `
      <div><strong>${esc(subject)} Coach</strong></div>
      <div class="muted">${aiAllowed ? "Coach (AI) is allowed now — earned." : `Coach (AI) enters at ≥ ${AI_MIN_SCORE_FOR_AI}% OR drill avg ≥ ${AI_MIN_DRILL_AVG_FOR_AI}%.`}</div>
      <div style="margin-top:8px"><strong>Biggest mark leak:</strong> ${esc(heuristic.focus)}</div>
      <div class="muted">${esc(heuristic.feedback)}</div>
      <div class="muted" style="margin-top:8px">Next drill type: ${hasStructured ? "Structured (scaffold)" : hasCloze ? "Cloze" : "Rapid"}.</div>
      <div style="margin-top:10px">
        <button id="btnStartCoachDrill" class="primary">Start Coach Drill (10)</button>
      </div>
    `;

    setTimeout(()=>{
      document.getElementById("btnStartCoachDrill")?.addEventListener("click", ()=> startCoachDrill(subject, pack));
    }, 0);

    if(aiAllowed){
      try{
        box.innerHTML = `<div class="muted">Coach is thinking…</div>`;
        const ai = await runAiCoach(subject, results, heuristic);
        if(ai){
          box.innerHTML = `
            <div><strong>${esc(subject)} Coach (AI)</strong></div>
            <div style="margin-top:8px"><strong>Biggest mark leak:</strong> ${esc(ai.focus || heuristic.focus)}</div>
            <div class="muted">${esc(ai.feedback || heuristic.feedback)}</div>
            <div style="margin-top:10px">
              <button id="btnStartCoachDrill" class="primary">Start Coach Drill (10)</button>
            </div>
          `;
          setTimeout(()=>{
            document.getElementById("btnStartCoachDrill")?.addEventListener("click", ()=> startCoachDrill(subject, pack));
          }, 0);

          markAiUsed(subject);
        }
      }catch(e){
        console.warn(e);
        box.innerHTML = `<div class="muted">AI connection issue. Try again.</div>`;
      }
    }
  }

  function heuristicFocus(subject, arr){
    const last = arr[arr.length-1];
    const prev = arr[arr.length-2];
    const delta = last.score - prev.score;

    let focus = "Structure + timing";
    let feedback = "";

    if(delta < 0){
      focus = "Stability: remove silly drops";
      feedback = `Down ${Math.abs(delta)} points. Next win: no blanks, clear steps, repeat a routine.`;
    }else if(delta > 0){
      focus = "Consistency: repeat what worked";
      feedback = `Up ${delta}. Now repeat what worked and tighten one weakness with reps.`;
    }else{
      feedback = "Flat. Choose one weakness and do 10 reps, then re-test.";
    }

    if(["Spanish","French","German"].includes(subject)){
      focus = "Accuracy + high-value structures";
      feedback = "Language: stop losing marks to basics first, then add one higher-value structure per answer. " + feedback;
    }else if(subject==="Maths"){
      focus = "Method marks + no blanks";
      feedback = "Maths: write the line even if unsure—method marks save you. " + feedback;
    }else if(subject==="English"){
      focus = "Point → evidence → explain";
      feedback = "English: keep paragraphs tight and evidence-based. " + feedback;
    }

    return { focus, feedback };
  }

  // IMPORTANT: uses your DRILL_BANK categories: rapid / structured / cloze  :contentReference[oaicite:2]{index=2}
  function buildCoachDrillPack(subject){
    const bank = window.DRILL_BANK?.[subject];
    let items = [];

    if(bank?.structured?.length){
      // Convert structured scaffold items into drill prompts
      items = bank.structured.map(x => ({
        q: x.q + "  (Use scaffold)",
        a: ["*"],
        scaffold: x.scaffold
      }));
    } else if(bank?.cloze?.length){
      // Convert cloze into prompts
      items = bank.cloze.map(x => ({
        q: x.text,
        a: x.blanks || ["*"],
        cloze: true
      }));
    } else if(bank?.rapid?.length){
      items = bank.rapid.map(x => ({ q:x.q, a:x.a || ["*"] }));
    }

    // Always 10
    items = shuffle(items).slice(0, 10);

    if(!items.length){
      items = [
        { q:`${subject}: define a key term`, a:["*"] },
        { q:`${subject}: give an example`, a:["*"] },
        { q:`${subject}: explain in 2 lines`, a:["*"] },
        { q:`${subject}: one marking scheme phrase`, a:["*"] },
        { q:`${subject}: common mistake to avoid`, a:["*"] },
        { q:`${subject}: command word meaning`, a:["*"] },
        { q:`${subject}: mini checklist item`, a:["*"] },
        { q:`${subject}: short timed answer`, a:["*"] },
        { q:`${subject}: key term #2`, a:["*"] },
        { q:`${subject}: quick summary`, a:["*"] }
      ];
    }

    return { title: `${subject} • Coach Drill`, items };
  }

  function lastDrillAvg(subject, n=5){
    const drills = (state.drillScores?.[subject] || []).slice(-n);
    if(!drills.length) return null;
    return Math.round(avg(drills.map(d=>d.pct)));
  }

  function aiUnlockedFor(subject, resultsArr){
    if(resultsArr.length < AI_MIN_RESULTS) return false;

    const latest = resultsArr[resultsArr.length-1];
    const drillAvg = lastDrillAvg(subject, 5);

    const earned = (latest.score >= AI_MIN_SCORE_FOR_AI) ||
      (drillAvg !== null && drillAvg >= AI_MIN_DRILL_AVG_FOR_AI);

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
      "Identify the single biggest mark leak and give warm, practical scaffolding advice.",
      "Return ONLY JSON:",
      "{",
      '  "focus": "single weakness (short)",',
      '  "feedback": "max 90 words, warm + specific",',
      '  "drills": ["2–4 drill prompts"]',
      "}"
    ].join("\n");

    const res = await window.classifyAnswer({ task, answer:"", lang:"lc" });
    if(!res || typeof res !== "object") return null;

    return {
      focus: String(res.focus || fallback.focus || "—").slice(0,160),
      feedback: String(res.feedback || fallback.feedback || "—").slice(0,700),
      drills: Array.isArray(res.drills) ? res.drills.map(x=>String(x)) : []
    };
  }

  // ---------- Coach drill modal ----------
  function startCoachDrill(subject, pack){
    drillRun = {
      subject,
      title: pack.title,
      items: pack.items.slice(0,10),
      i: 0,
      correct: 0,
      startedAt: Date.now(),
      wrongs: []
    };

    $("drillModal")?.classList.remove("hidden");
    showCoachDrillPrompt();
  }

  function showCoachDrillPrompt(){
    if(!drillRun) return;
    const item = drillRun.items[drillRun.i];
    $("dPrompt") && ($("dPrompt").textContent = `${drillRun.title} • Q${drillRun.i+1}/10: ${item?.q || ""}`);
    if($("dAnswer")) $("dAnswer").value = "";
    focus($("dAnswer"));
  }

  function submitCoachDrillAnswer(){
    if(!drillRun) return;
    const item = drillRun.items[drillRun.i];
    if(!item) return;

    const ans = ($("dAnswer")?.value || "").trim();
    if(!ans) return;

    // Cloze: require one of blanks; Structured: accept any (scaffold is feedback)
    let ok = false;
    if(item.cloze && Array.isArray(item.a) && item.a.length){
      ok = item.a.some(b => String(b).trim().toLowerCase() === ans.trim().toLowerCase());
    }else{
      ok = true; // scaffold drills accept any attempt
    }

    if(ok) drillRun.correct++;
    else drillRun.wrongs.push({ q:item.q, expected:item.a, got:ans });

    drillRun.i++;
    if(drillRun.i >= drillRun.items.length){
      finishCoachDrill();
      return;
    }

    showCoachDrillPrompt();
  }

  function finishCoachDrill(){
    const ms = Date.now() - drillRun.startedAt;
    const pct = Math.round((drillRun.correct / drillRun.items.length) * 100);

    state.drillScores = state.drillScores || {};
    state.drillScores[drillRun.subject] = state.drillScores[drillRun.subject] || [];
    state.drillScores[drillRun.subject].push({ date: new Date().toISOString().slice(0,10), pct });

    if(state.drillScores[drillRun.subject].length > 30){
      state.drillScores[drillRun.subject] = state.drillScores[drillRun.subject].slice(-30);
    }
    saveState();

    // Warm scaffold feedback summary
    const missed = drillRun.wrongs.length;
    alert(`${drillRun.subject} drill complete: ${pct}% • Time: ${fmtTime(ms)}\nMissed: ${missed}`);

    closeCoachDrill();
    render();
  }

  function closeCoachDrill(){
    $("drillModal")?.classList.add("hidden");
    drillRun = null;
  }

  // ---------- Turbito ----------
  function launchTurbito(subject){
    // Ensure header exists each time
    ensureTurbitoHeader(subject);

    if(typeof window.startTurbito === "function"){
      window.startTurbito(subject);
    }else{
      $("turbitoContainer") && ($("turbitoContainer").innerHTML = `<p class="muted">Turbito not loaded. Check turbito.js.</p>`);
    }
  }

  // ---------- storage ----------
  function fresh(){
    return { profile:{ name:"", picked:[] }, results:{}, drillScores:{}, aiLastAt:{} };
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

  function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

  function resetAll(){
    if(!confirm("Reset all data on this device?")) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  }

})();
