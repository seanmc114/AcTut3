(() => {
  "use strict";

  const LS_KEY = "SYNGE_LC_BROTHER_V1";
  const DRILL_Q = 5;

  const FALLBACK_SUBJECTS = [
    "English","Maths","Spanish","French","German",
    "Biology","Chemistry","Physics",
    "Accounting","Economics","Business",
    "History","Geography","Home Ec","Art","PE"
  ];

  const state = loadState();
  let currentSubject = null;

  let chartResults=null, chartLeaks=null, chartDrills=null;

  const $ = (id)=>document.getElementById(id);

  function esc(s){
    return String(s)
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
  function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null; }
  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function toNum(x){ const n=Number(String(x).replace("%","").trim()); return Number.isFinite(n)?n:null; }
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
  function setBrother(html){
    const box=$("coachBox");
    if(box) box.innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    // ensure modal is hidden on load (if present)
    $("drillModal")?.classList.add("hidden");

    // Build picker
    buildSubjectPicker();

    // Wire the few essential buttons (if they exist)
    on("btnStart", start);
    on("btnAdd", addResult);
    on("btnReset", resetAll);
    on("btnBrother", brother);
    on("btnBrotherHub", brother);
    on("btnBackToDash", backToDash);
    on("btnTurbito", ()=>{ if(currentSubject && typeof window.startTurbito==="function") window.startTurbito(currentSubject); });

    // date default
    const d=$("mDate");
    if(d && !d.value) d.value = new Date().toISOString().slice(0,10);

    render();
  });

  function on(id, fn){
    const el=$(id);
    if(!el) return;
    el.type = "button";
    el.addEventListener("click",(e)=>{
      e.preventDefault();
      try{ fn(e); }catch(err){
        console.error(err);
        setBrother(`<div class="muted">Error: ${esc(err.message||String(err))}</div>`);
      }
    });
  }

  function subjects(){
    const keys = Object.keys(window.DRILL_BANK || {});
    return (keys && keys.length) ? keys.sort() : FALLBACK_SUBJECTS;
  }

  function buildSubjectPicker(){
    const box=$("subjectPicker");
    if(!box) return;

    const subs = subjects();
    const hasReal = Object.keys(window.DRILL_BANK||{}).length > 0;

    box.innerHTML = `
      <div class="muted" style="margin:10px 0 8px">
        ${hasReal ? "Choose subjects" : "drills.js not loaded — showing fallback subjects"}
      </div>
      ${subs.map(s=>`
        <div class="pickRow">
          <label><input type="checkbox" data-sub="${esc(s)}"> ${esc(s)}</label>
          <select data-level="${esc(s)}">
            <option value="H">Higher</option>
            <option value="O">Ordinary</option>
          </select>
        </div>
      `).join("")}
    `;
  }

  function picked(){ return state.profile.picked || []; }
  function pickedLevel(subject){ return picked().find(x=>x.subject===subject)?.level || "H"; }

  function start(){
    const name = ($("name")?.value || "").trim();
    const goal = ($("goal")?.value || "").trim();
    if(!name) return alert("Enter a nickname first.");

    const pickedArr=[];
    document.querySelectorAll('input[type="checkbox"][data-sub]').forEach(cb=>{
      if(cb.checked){
        const subject = cb.getAttribute("data-sub");
        const sel = document.querySelector(`select[data-level="${CSS.escape(subject)}"]`);
        const level = (sel?.value || "H").toUpperCase()==="O" ? "O" : "H";
        pickedArr.push({subject, level});
        state.results[subject] = state.results[subject] || [];
      }
    });
    if(!pickedArr.length) return alert("Pick at least one subject.");

    state.profile = { name, goal, picked: pickedArr };
    saveState();
    render();
  }

  function render(){
    const hasProfile = !!(state.profile.name && picked().length);
    $("setup")?.classList.toggle("hidden", hasProfile);
    $("dash")?.classList.toggle("hidden", !hasProfile);

    $("whoName") && ($("whoName").textContent = state.profile.name || "—");

    // subject dropdown
    const ms=$("mSubject");
    if(ms){
      ms.innerHTML = picked().map(p=>`<option value="${esc(p.subject)}">${esc(p.subject)} (${p.level})</option>`).join("");
    }

    renderOverall();
    renderTiles();

    setBrother(`<div class="muted"><strong>The Brother:</strong> Add results. Then we find the leak.</div>`);
  }

  function renderOverall(){
    const all=[];
    picked().forEach(p => (state.results[p.subject]||[]).forEach(r=>all.push(r.score)));
    const overall = all.length ? Math.round(avg(all)) : null;
    $("overallAvg") && ($("overallAvg").textContent = overall===null ? "—" : overall+"%");
    $("overallBand") && ($("overallBand").textContent = overall===null ? "—" : band(overall));
  }

  function renderTiles(){
    const tiles=$("tiles");
    if(!tiles) return;
    tiles.innerHTML="";

    picked().forEach(p=>{
      const subject=p.subject;
      const arr=(state.results[subject]||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
      const avgScore=arr.length?Math.round(avg(arr.map(r=>r.score))):null;
      const last=arr.length?arr[arr.length-1]:null;

      const tile=document.createElement("div");
      tile.className="tile";
      tile.innerHTML=`
        <div class="tileTop">
          <div>
            <div class="tileName">${esc(subject)} <span class="muted">[${p.level}]</span></div>
            <div class="tileMeta">${last?`Last: ${esc(last.date)} • ${last.score}%`:"No results yet"}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:900;font-size:22px">${avgScore===null?"—":avgScore+"%"}</div>
          </div>
        </div>
        <div class="bar"><div class="fill" style="width:${avgScore===null?0:clamp(avgScore,0,100)}%"></div></div>
      `;
      tile.addEventListener("click", ()=>openSubject(subject));
      tiles.appendChild(tile);
    });
  }

  function openSubject(subject){
    currentSubject=subject;
    $("dash")?.classList.add("hidden");
    $("subjectHub")?.classList.remove("hidden");
    $("subjectTitle") && ($("subjectTitle").textContent = `${subject} (${pickedLevel(subject)==="O"?"Ordinary":"Higher"})`);
    renderCharts(subject);
    if(typeof window.startTurbito==="function") window.startTurbito(subject);
  }

  function backToDash(){
    $("subjectHub")?.classList.add("hidden");
    $("dash")?.classList.remove("hidden");
    currentSubject=null;
  }

  function addResult(){
    const subject=$("mSubject")?.value;
    if(!subject) return;
    const date=($("mDate")?.value||"").trim()||new Date().toISOString().slice(0,10);
    const score=toNum(($("mScore")?.value||"").trim());
    if(score===null||score<0||score>100) return alert("Score must be 0–100.");

    state.results[subject]=state.results[subject]||[];
    state.results[subject].push({date, score:Math.round(score)});
    state.results[subject].sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
    saveState();

    renderOverall();
    renderTiles();
    setBrother(`<div class="muted"><strong>The Brother:</strong> saved ${esc(subject)}. Press me.</div>`);
    if(currentSubject===subject) renderCharts(subject);
  }

  function brother(){
    const subject=currentSubject || $("mSubject")?.value;
    if(!subject) return alert("Pick a subject.");
    const arr=(state.results[subject]||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
    if(arr.length<2){
      setBrother(`<div class="muted"><strong>The Brother:</strong> give me two results first. Then I can read the trend.</div>`);
      return;
    }
    setBrother(`<div><strong>The Brother • ${esc(subject)}</strong></div><div class="muted">You’re live. Add more essentials to drills.js and I’ll target leaks.</div>`);
  }

  function renderCharts(subject){
    if(typeof Chart!=="function") return;
    // charts optional; won't crash if canvases missing
    const rc=$("resultsChart"), lc=$("leakChart"), dc=$("drillChart");

    const res=(state.results[subject]||[]).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).slice(-16);
    const labels=res.map(r=>(r.date||"").slice(5));
    const vals=res.map(r=>r.score);

    if(rc){
      if(chartResults) chartResults.destroy();
      chartResults=new Chart(rc,{type:"line",data:{labels,datasets:[{data:vals,fill:true,tension:.25,pointRadius:4}]},options:{plugins:{legend:{display:false}},scales:{y:{min:0,max:100}}}});
    }
    if(lc){
      if(chartLeaks) chartLeaks.destroy();
      chartLeaks=new Chart(lc,{type:"bar",data:{labels:["setup"],datasets:[{data:[1]}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
    }
    if(dc){
      if(chartDrills) chartDrills.destroy();
      chartDrills=new Chart(dc,{type:"line",data:{labels:[""],datasets:[{data:[0],fill:true,tension:.25,pointRadius:4}]},options:{plugins:{legend:{display:false}},scales:{y:{min:0,max:100}}}});
    }
  }

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
  function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  function resetAll(){
    if(!confirm("Reset all data on this device?")) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
  }
})();
