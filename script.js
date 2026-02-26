(() => {
  "use strict";

  const LS_KEY = "SYNGE_LC_COACH_ENGINE_V1";

  // AI earned
  const AI_MIN_RESULTS = 2;
  const AI_MIN_SCORE_FOR_AI = 70;
  const AI_MIN_DRILL_AVG_FOR_AI = 70;
  const AI_COOLDOWN_MS = 60 * 60 * 1000;

  // 5 reps for Brother drills
  const DRILL_Q = 5;

  const state = loadState();
  let currentSubject = null;
  let drillRun = null;

  let chartResults = null;
  let chartLeaks = null;
  let chartDrills = null;

  const $ = (id) => document.getElementById(id);

  function esc(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }
  function focus(el){ if(el) setTimeout(()=>{ try{ el.focus(); }catch{} }, 0); }
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null; }
  function toNum(x){
    const n = Number(String(x).replace("%","").trim());
    return Number.isFinite(n) ? n : null;
  }
  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
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

  // UI wiring
  document.addEventListener("DOMContentLoaded", () => {
document.getElementById("drillModal")?.classList.add("hidden");
    
  ["btnStart","btnSaveSubjects","btnEnter","enterBtn","startBtn"].forEach(id=>{
    const b = document.getElementById(id);
    if(b) b.type = "button";
  });

  const bindAny = (ids, fn) => {
    ids.forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener("click", (e)=>{
        e.preventDefault();
        try{ fn(e); }catch(err){ console.error(err); }
      });
    });
  };

  bindAny(["btnSaveSubjects","btnEnter","enterBtn"], saveSubjects);
  bindAny(["btnStart","startBtn","btnStartGame"], start);

  // build subject picker UI from DRILL_BANK keys
  buildSubjectPicker();
  bind("btnStart", start);
  ...
});    // build subject picker UI from DRILL_BANK keys
    buildSubjectPicker();
    bind("btnStart", start);
    bind("btnSaveSubjects", saveSubjects);
    bind("btnAdd", addResult);
    bind("btnCoach", brother);
    bind("btnBrother", brother);
    bind("btnReset", resetAll);
    bind("btnBackToDash", backToDash);
    bind("btnTurbito", () => { if(currentSubject && typeof window.startTurbito==="function") window.startTurbito(currentSubject); });
    bind("btnSubmit", submitDrill);
    bind("btnExitDrill", closeDrill);

    $("dAnswer")?.addEventListener("keydown",(e)=>{ if(e.key==="Enter") submitDrill(); });

    // defaults
    focus($("name"));
    const mDate = $("mDate");
    if(mDate && !mDate.value) mDate.value = new Date().toISOString().slice(0,10);

    render();
  });

  function bind(id, fn){
    const el = $(id);
    if(!el) return;
    el.addEventListener("click", (e)=>{
      try{ fn(e); }
      catch(err){
        console.error(err);
        setBrother(`<div class="muted">Error: ${esc(err.message||String(err))}</div>`);
      }
    });
  }

  function buildSubjectPicker(){
    const picker = $("subjectPicker");
    if(!picker) return;

    const subjects = Object.keys(window.DRILL_BANK || {}).sort();
    picker.innerHTML = subjects.map(s => `
      <div class="pickRow">
        <label><input type="checkbox" data-subject="${esc(s)}"> ${esc(s)}</label>
        <select data-level="${esc(s)}">
          <option value="H">Higher</option>
          <option value="O">Ordinary</option>
        </select>
      </div>
    `).join("");
  }

  function setBrother(html){
    const box = $("coachBox");
    if(box) box.innerHTML = html;
  }

  function start(){
    const name = ($("name")?.value || "").trim();
    if(!name){ alert("Enter a nickname first."); focus($("name")); return; }
    state.profile.name = name;
    state.profile.goal = ($("goal")?.value || "").trim();
    save();
    render();
  }

  function saveSubjects(){
    const picker = $("subjectPicker");
    const checks = [...picker.querySelectorAll('input[type="checkbox"][data-subject]')];
    const chosen = checks.filter(c=>c.checked).map(c=>c.getAttribute("data-subject"));
    if(!chosen.length){ alert("Choose at least one subject."); return; }

    state.profile.picked = chosen.map(sub=>{
      const sel = picker.querySelector(`select[data-level="${CSS.escape(sub)}"]`);
      const lvl = (sel?.value || "H").toUpperCase()==="O" ? "O" : "H";
      return { subject: sub, level: lvl };
    });

    save();
    render();
  }

  function render(){
    const hasName = !!(state.profile.name||"").trim();
    const hasSubs = !!(state.profile.picked||[]).length;

    $("setup")?.classList.toggle("hidden", hasName && hasSubs);
    $("dash")?.classList.toggle("hidden", !(hasName && hasSubs));

    $("whoName") && ($("whoName").textContent = state.profile.name || "—");

    // subject dropdown for result entry
    const mSubject = $("mSubject");
    if(mSubject){
      mSubject.innerHTML = (state.profile.picked||[]).map(p=>`<option value="${esc(p.subject)}">${esc(p.subject)} (${p.level})</option>`).join("");
    }

    renderOverall();
    renderTiles();

    setBrother(`<div class="muted">The Brother is here. Add results. Do reps. Then we polish.</div>`);
  }

  function renderOverall(){
    const picked = state.profile.picked || [];
    const all = [];
    picked.forEach(p => (state.results[p.subject]||[]).forEach(r=>all.push(r.score)));
    const overall = all.length ? Math.round(avg(all)) : null;

    $("overallAvg") && ($("overallAvg").textContent = overall===null ? "—" : overall+"%");
    $("overallBand") && ($("overallBand").textContent = overall===null ? "—" : band(overall));

    // marks recovered sum of subject deltas
    let rec = 0;
    picked.forEach(p=>{
      const arr = (state.results[p.subject]||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
      if(arr.length>=2) rec += (arr[arr.length-1].score - arr[0].score);
    });
    $("marksRecovered") && ($("marksRecovered").textContent = String(rec));
  }

  function renderTiles(){
    const tiles = $("tiles");
    if(!tiles) return;
    tiles.innerHTML = "";

    (state.profile.picked||[]).forEach(p=>{
      const subject = p.subject;
      const level = p.level;
      const arr = (state.results[subject]||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
      const avgScore = arr.length ? Math.round(avg(arr.map(r=>r.score))) : null;
      const last = arr.length ? arr[arr.length-1] : null;

      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `
        <div class="tileTop">
          <div>
            <div class="tileName">${esc(subject)} <span style="font-weight:900;color:${level==="O"?"#2b6cff":"#ff3fa6"}">[${level}]</span></div>
            <div class="tileMeta">${last ? `Last: ${esc(last.date)} • ${last.score}%` : "No results yet"}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:900;font-size:22px">${avgScore===null?"—":avgScore+"%"}</div>
          </div>
        </div>
        <div class="bar"><div class="fill" style="width:${avgScore===null?0:clamp(avgScore,0,100)}%"></div></div>
      `;
      tile.addEventListener("click", ()=> openSubject(subject));
      tiles.appendChild(tile);
    });
  }

  function openSubject(subject){
    currentSubject = subject;
    $("dash")?.classList.add("hidden");
    $("subjectHub")?.classList.remove("hidden");

    const level = (state.profile.picked||[]).find(x=>x.subject===subject)?.level || "H";
    $("subjectTitle") && ($("subjectTitle").textContent = `${subject} (${level==="O"?"Ordinary":"Higher"})`);

    $("hubNote") && ($("hubNote").innerHTML =
      `<strong>The Brother:</strong> This is where you stop bleeding marks. Reps first. Then polish.`
    );

    renderCharts(subject);
  }

  function backToDash(){
    $("subjectHub")?.classList.add("hidden");
    $("dash")?.classList.remove("hidden");
    currentSubject = null;
  }

  function addResult(){
    const subject = $("mSubject")?.value;
    if(!subject) return;

    const date = ($("mDate")?.value || "").trim() || new Date().toISOString().slice(0,10);
    const score = toNum(($("mScore")?.value || "").trim());
    if(score===null || score<0 || score>100){ alert("Score must be 0–100"); return; }

    state.results[subject] = state.results[subject] || [];
    state.results[subject].push({ date, score: Math.round(score) });
    state.results[subject].sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
    save();

    renderOverall();
    renderTiles();

    setBrother(`<div><strong>The Brother:</strong> result saved for ${esc(subject)}.</div><div class="muted">Now press The Brother. We find the leak.</div>`);
    if(currentSubject===subject) renderCharts(subject);
  }

  // ===== Leak model (weighted by markValue*freq on essentials) =====
  function recordAttempt(subject, item, correct){
    const tags = item.tags && item.tags.length ? item.tags : ["general"];
    const mv = Number(item.markValue || 3);
    const fq = Number(item.freq || 3);
    const w = mv * fq;

    state.tagPerf = state.tagPerf || {};
    state.tagPerf[subject] = state.tagPerf[subject] || {};

    tags.forEach(tag=>{
      const t = state.tagPerf[subject][tag] || { attempts:0, correct:0, wSum:0 };
      t.attempts += 1;
      if(correct) t.correct += 1;
      t.wSum += w;
      state.tagPerf[subject][tag] = t;
    });

    save();
  }

  function computeLeaks(subject){
    const perf = state.tagPerf?.[subject] || {};
    const list = Object.entries(perf).map(([tag, t])=>{
      const acc = t.attempts ? (t.correct / t.attempts) : 0;
      const avgW = t.attempts ? (t.wSum / t.attempts) : 1;
      const leak = (1-acc) * avgW;
      return { tag, leak, acc, attempts:t.attempts };
    });
    list.sort((a,b)=>b.leak-a.leak);
    return list;
  }

  function lastDrillAvg(subject, n=5){
    const d = (state.drillScores?.[subject]||[]).slice(-n);
    return d.length ? Math.round(avg(d.map(x=>x.pct))) : null;
  }

  function aiEligible(subject){
    const results = (state.results[subject]||[]);
    if(results.length < AI_MIN_RESULTS) return false;

    const latest = results.slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).at(-1)?.score ?? 0;
    const dAvg = lastDrillAvg(subject, 5);

    const earned = (latest >= AI_MIN_SCORE_FOR_AI) || (dAvg!==null && dAvg >= AI_MIN_DRILL_AVG_FOR_AI);
    if(!earned) return false;

    const now = Date.now();
    const last = state.aiLastAt?.[subject] || 0;
    if(now - last < AI_COOLDOWN_MS) return false;

    return typeof window.classifyAnswer === "function";
  }

  function markAi(subject){
    state.aiLastAt = state.aiLastAt || {};
    state.aiLastAt[subject] = Date.now();
    save();
  }

  function pickDrillItems(subject, level, tag){
    const bank = window.DRILL_BANK?.[subject];
    if(!bank) return [];

    // flatten into unified items with q+a+tags+weights
    const pool = [];
    (bank.rapid||[]).forEach(x=>pool.push({ ...x, q:x.q, a:x.a||["*"] }));
    (bank.structured||[]).forEach(x=>pool.push({ ...x, q:x.q, a:["*"] }));
    (bank.cloze||[]).forEach(x=>pool.push({ level:x.level, q:x.text, a:(x.blanks&&x.blanks.length)?x.blanks:["*"], tags:x.tags||["general"], markValue:x.markValue, freq:x.freq }));

    const levelPool = pool.filter(x=>!x.level || x.level===level);
    const tagged = levelPool.filter(x=>(x.tags||[]).includes(tag));

    const use = tagged.length ? tagged : levelPool;
    return shuffle(use.slice()).slice(0, DRILL_Q);
  }

  async function brother(){
    const subject = currentSubject || $("mSubject")?.value;
    if(!subject){ alert("Pick a subject."); return; }

    const level = (state.profile.picked||[]).find(x=>x.subject===subject)?.level || "H";
    const results = (state.results[subject]||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
    if(results.length < 2){
      setBrother(`<div class="muted">The Brother: give me two results first. Then I can read the trend.</div>`);
      return;
    }

    const leaks = computeLeaks(subject);
    const top = leaks[0] || { tag:"general", leak:0, acc:0, attempts:0 };

    const items = pickDrillItems(subject, level, top.tag);

    const basicLine = `
      <div><strong>The Brother • ${esc(subject)}</strong></div>
      <div class="muted">Most expensive leak: <strong>${esc(top.tag)}</strong> (accuracy ${(top.acc*100).toFixed(0)}%, attempts ${top.attempts}).</div>
      <div class="muted">We fix that, you stop bleeding marks.</div>
      <div style="margin-top:10px">
        <button id="btnStartBrotherDrill" class="primary">Start 5-Rep Fix</button>
      </div>
    `;
    setBrother(basicLine);

    setTimeout(()=>{
      document.getElementById("btnStartBrotherDrill")?.addEventListener("click", ()=> startDrill(subject, items));
    },0);

    renderCharts(subject);

    if(aiEligible(subject)){
      try{
        const ai = await runAI(subject, results, top.tag);
        if(ai){
          setBrother(`
            <div><strong>The Brother (AI) • ${esc(subject)}</strong></div>
            <div class="muted"><strong>Leak:</strong> ${esc(ai.focus || top.tag)}</div>
            <div class="muted">${esc(ai.feedback || "")}</div>
            <div style="margin-top:10px">
              <button id="btnStartBrotherDrill" class="primary">Start 5-Rep Fix</button>
            </div>
          `);
          setTimeout(()=>{
            document.getElementById("btnStartBrotherDrill")?.addEventListener("click", ()=> startDrill(subject, items));
          },0);
          markAi(subject);
        }
      }catch(e){
        console.warn(e);
      }
    }
  }

  async function runAI(subject, results, tag){
    const last = results.at(-1);
    const prev = results.at(-2);

    const task = [
      "LEAVING CERT COACH (THE BROTHER)",
      `Subject: ${subject}`,
      `Previous: ${prev.date} — ${prev.score}%`,
      `Latest: ${last.date} — ${last.score}%`,
      `Most expensive leak tag: ${tag}`,
      "Tone: warm, natural, local. Encourage + one sharp line if needed.",
      "Give: 1) what to fix, 2) how to fix it in 2 steps, 3) one scaffold line.",
      "Return ONLY JSON:",
      "{",
      '  "focus": "leak in plain words",',
      '  "feedback": "max 90 words"',
      "}"
    ].join("\n");

    const res = await window.classifyAnswer({ task, answer:"", lang:"lc" });
    if(!res || typeof res!=="object") return null;
    return { focus:String(res.focus||""), feedback:String(res.feedback||"") };
  }

  // ===== Drill modal =====
  function startDrill(subject, items){
    drillRun = { subject, items: items.slice(0,DRILL_Q), i:0, correct:0 };
    $("dTitle") && ($("dTitle").textContent = `The Brother Drill • ${subject}`);
    $("dFeedback") && ($("dFeedback").textContent = "");
    $("drillModal")?.classList.remove("hidden");
    showDrillQ();
  }

  function showDrillQ(){
    const item = drillRun.items[drillRun.i];
    $("dPrompt").textContent = `Q ${drillRun.i+1}/${DRILL_Q}: ` + (item.q || "");
    $("dAnswer").value = "";
    focus($("dAnswer"));
  }

  function submitDrill(){
    if(!drillRun) return;
    const item = drillRun.items[drillRun.i];

    const ans = ($("dAnswer").value||"").trim();
    if(!ans) return;

    let correct = true;
    if(Array.isArray(item.a) && item.a.length && !(item.a.length===1 && item.a[0]==="*")){
      correct = item.a.some(x=>String(x).trim().toLowerCase()===ans.toLowerCase());
    }

    if(correct) drillRun.correct++;
    recordAttempt(drillRun.subject, item, correct);

    $("dFeedback").textContent = correct ? "✅ Good." : "❌ Not quite. Keep going.";

    drillRun.i++;
    if(drillRun.i >= drillRun.items.length){
      finishDrill();
    }else{
      setTimeout(showDrillQ, 220);
    }
  }

  function finishDrill(){
    const pct = Math.round((drillRun.correct / drillRun.items.length) * 100);

    state.drillScores = state.drillScores || {};
    state.drillScores[drillRun.subject] = state.drillScores[drillRun.subject] || [];
    state.drillScores[drillRun.subject].push({ date:new Date().toISOString().slice(0,10), pct });
    if(state.drillScores[drillRun.subject].length > 40){
      state.drillScores[drillRun.subject] = state.drillScores[drillRun.subject].slice(-40);
    }
    save();

    closeDrill();
    renderTiles();
    renderCharts(drillRun.subject);

    setBrother(`<div><strong>The Brother:</strong> ${pct}%.</div><div class="muted">${pct>=80?"Now we’re talking.":"That’s the leak. Fix it again."}</div>`);
  }

  function closeDrill(){
    $("drillModal")?.classList.add("hidden");
    drillRun = null;
  }

  // ===== Graphs =====
  function renderCharts(subject){
    if(typeof Chart !== "function") return;
    renderResultsChart(subject);
    renderLeakChart(subject);
    renderDrillChart(subject);
  }

  function renderResultsChart(subject){
    const canvas=$("resultsChart");
    if(!canvas) return;

    const arr=(state.results[subject]||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).slice(-16);
    const labels=arr.map(r=>(r.date||"").slice(5));
    const vals=arr.map(r=>r.score);

    if(chartResults) chartResults.destroy();
    chartResults = new Chart(canvas, {
      type:"line",
      data:{ labels, datasets:[{ data:vals, fill:true, tension:0.25, pointRadius:4, borderColor:"#ff3fa6", backgroundColor:"rgba(255,63,166,.18)" }]},
      options:{ plugins:{ legend:{display:false} }, scales:{ y:{ min:0, max:100 } } }
    });
  }

  function renderLeakChart(subject){
    const canvas=$("leakChart");
    if(!canvas) return;

    const leaks=computeLeaks(subject).slice(0,5);
    const labels=leaks.map(x=>x.tag);
    const vals=leaks.map(x=>Number(x.leak.toFixed(2)));

    if(chartLeaks) chartLeaks.destroy();
    chartLeaks = new Chart(canvas, {
      type:"bar",
      data:{ labels, datasets:[{ data:vals, backgroundColor:["#2b6cff","#ff3fa6","#2ecc71","#f1c40f","#9b59b6"] }]},
      options:{ plugins:{ legend:{display:false} }, scales:{ y:{ beginAtZero:true } } }
    });
  }

  function renderDrillChart(subject){
    const canvas=$("drillChart");
    if(!canvas) return;

    const ds=(state.drillScores?.[subject]||[]).slice(-20);
    const labels=ds.map(x=>(x.date||"").slice(5));
    const vals=ds.map(x=>x.pct);

    if(chartDrills) chartDrills.destroy();
    chartDrills = new Chart(canvas, {
      type:"line",
      data:{ labels, datasets:[{ data:vals, fill:true, tension:0.25, pointRadius:4, borderColor:"#2b6cff", backgroundColor:"rgba(43,108,255,.18)" }]},
      options:{ plugins:{ legend:{display:false} }, scales:{ y:{ min:0, max:100 } } }
    });
  }

  // ===== Leak model helpers =====
  function recordAttempt(subject, item, correct){
    const tags = item.tags && item.tags.length ? item.tags : ["general"];
    const mv = Number(item.markValue || 3);
    const fq = Number(item.freq || 3);
    const w = mv * fq;

    state.tagPerf = state.tagPerf || {};
    state.tagPerf[subject] = state.tagPerf[subject] || {};

    tags.forEach(tag=>{
      const t = state.tagPerf[subject][tag] || { attempts:0, correct:0, wSum:0 };
      t.attempts += 1;
      if(correct) t.correct += 1;
      t.wSum += w;
      state.tagPerf[subject][tag] = t;
    });

    save();
  }

  function computeLeaks(subject){
    const perf = state.tagPerf?.[subject] || {};
    const list = Object.entries(perf).map(([tag, t])=>{
      const acc = t.attempts ? (t.correct / t.attempts) : 0;
      const avgW = t.attempts ? (t.wSum / t.attempts) : 1;
      const leak = (1-acc) * avgW;
      return { tag, leak, acc, attempts:t.attempts };
    });
    list.sort((a,b)=>b.leak-a.leak);
    return list;
  }

  // ===== Storage =====
  function fresh(){
    return { profile:{name:"",goal:"",picked:[]}, results:{}, drillScores:{}, tagPerf:{}, aiLastAt:{} };
  }
  function loadState(){
    try{
      const raw=localStorage.getItem(LS_KEY);
      if(!raw) return fresh();
      const s=JSON.parse(raw);
      s.profile=s.profile||{name:"",goal:"",picked:[]};
      s.profile.picked=s.profile.picked||[];
      s.results=s.results||{};
      s.drillScores=s.drillScores||{};
      s.tagPerf=s.tagPerf||{};
      s.aiLastAt=s.aiLastAt||{};
      return s;
    }catch{ return fresh(); }
  }
  function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  function resetAll(){
    if(!confirm("Reset all data on this device?")) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  }
})();
