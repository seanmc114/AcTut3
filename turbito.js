/* turbito.js — Turbito sidegame (5Q)
   - 10 levels, lock/unlock
   - 5 questions per run
   - uses DRILL_BANK[subject].rapid filtered by level (H/O)
*/

(function(){

const STORAGE_KEY = "TURBITO_V2";
const RUN_Q = 5;

function load(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

function ensureSubject(subject){
  const data = load();
  if(!data[subject]){
    data[subject] = { unlocked: 1, best: {} };
    save(data);
  }
  return data;
}

const DEFAULT_THRESHOLDS = [220,205,195,185,175,165,155,145,135,125];

function thresholdsFor(subject){
  const MAP = {
    Spanish: [200,185,175,165,155,145,135,125,115,105],
    Maths:   [230,215,205,195,185,175,165,155,145,135],
    English: [210,195,185,175,165,155,145,135,125,115]
  };
  return MAP[subject] || DEFAULT_THRESHOLDS;
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

function norm(s){
  return (window.__NORM ? window.__NORM(s) : String(s||"").trim().toLowerCase());
}

function isCorrect(raw, answers){
  const n = norm(raw);
  if(!n) return false;
  return (answers||[]).some(a=>{
    const aa = String(a||"").trim();
    if(aa === "*") return true;
    return norm(aa) === n;
  });
}

function getLevelForSubject(subject){
  // read from coach profile if present
  try{
    const coach = JSON.parse(localStorage.getItem("SYNGE_LC_COACH_MAIN_V6") || "null")
      || JSON.parse(localStorage.getItem("SYNGE_LC_COACH_V5A") || "null")
      || JSON.parse(localStorage.getItem("SYNGE_LC_COACH_V5") || "null");
    const picked = coach?.profile?.picked || [];
    return (picked.find(x=>x.subject===subject)?.level) || "H";
  }catch{
    return "H";
  }
}

function pickQuestions(subject, n=RUN_Q){
  const level = getLevelForSubject(subject);
  const bank = window.DRILL_BANK?.[subject];
  let pool = [];

  if(bank){
    if(Array.isArray(bank.rapid) && bank.rapid.length){
      pool = bank.rapid.filter(x => !x.level || x.level === level);
    } else if(Array.isArray(bank.structured) && bank.structured.length){
      pool = bank.structured.filter(x => !x.level || x.level === level).map(x => ({ q:x.q, a:["*"] }));
    } else if(Array.isArray(bank.cloze) && bank.cloze.length){
      pool = bank.cloze.filter(x => !x.level || x.level === level).map(x => ({ q:x.text, a: (x.blanks && x.blanks.length) ? x.blanks : ["*"] }));
    }
  }

  if(!pool.length){
    pool = [
      { q:`${subject}: one key definition`, a:["*"] },
      { q:`${subject}: one core formula/fact`, a:["*"] },
      { q:`${subject}: list 3 key terms`, a:["*"] },
      { q:`${subject}: one exam phrase that earns marks`, a:["*"] },
      { q:`${subject}: one mistake to avoid`, a:["*"] }
    ];
  }

  shuffle(pool);
  return pool.slice(0,n);
}

let active = null;

window.startTurbito = function(subject){
  ensureSubject(subject);

  const container = document.getElementById("turbitoContainer");
  const view = document.getElementById("turbitoView");
  if(!container || !view) return;

  container.innerHTML = "";
  view.style.display = "none";

  view.innerHTML = `
    <div class="card" style="margin-top:10px">
      <h3 id="tbTitle"></h3>
      <div id="tbStats" class="muted"></div>
      <div id="tbQuestion" style="margin:10px 0;font-weight:800"></div>
      <input id="tbInput" placeholder="Answer">
      <button id="tbSubmit" class="primary" style="margin-top:8px">Submit</button>
    </div>
  `;

  const data = load();
  const prog = data[subject];
  const thresholds = thresholdsFor(subject);

  for(let lvl=1; lvl<=10; lvl++){
    const btn = document.createElement("button");
    btn.className = "primary";
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.margin = "8px 0";

    const unlocked = lvl <= prog.unlocked;
    const best = prog.best?.[String(lvl)];

    btn.textContent = unlocked
      ? `${subject} · Level ${lvl}${best!=null ? ` (Best ${best}s)` : ""}`
      : `${subject} · Level ${lvl} 🔒`;

    btn.style.background = unlocked ? "#2ecc71" : "#e74c3c";

    btn.onclick = ()=>{
      if(!unlocked) return;
      startLevel(subject, lvl, thresholds[lvl-1]);
    };

    container.appendChild(btn);
  }

  function startLevel(subject, level, target){
    active = {
      subject, level, target,
      qs: pickQuestions(subject, RUN_Q),
      i: 0,
      errors: 0,
      startedAt: Date.now()
    };
    view.style.display = "block";
    document.getElementById("tbTitle").innerText = `${subject} · Level ${level}`;
    document.getElementById("tbStats").innerText = `Q 1/${RUN_Q}`;
    document.getElementById("tbInput").value = "";
    renderQ();
    document.getElementById("tbInput").focus();
  }

  function renderQ(){
    const q = active.qs[active.i];
    document.getElementById("tbQuestion").innerText = q.q;
    document.getElementById("tbStats").innerText = `Q ${active.i+1}/${RUN_Q}`;

    const submit = ()=>{
      const val = document.getElementById("tbInput").value.trim();
      document.getElementById("tbInput").value = "";

      if(!val) active.errors++;
      else if(!isCorrect(val, q.a || ["*"])) active.errors++;

      active.i++;
      if(active.i >= active.qs.length){
        finish();
      }else{
        renderQ();
      }
      document.getElementById("tbInput").focus();
    };

    document.getElementById("tbSubmit").onclick = submit;
    document.getElementById("tbInput").onkeydown = (e)=>{ if(e.key==="Enter") submit(); };
  }

  function finish(){
    const secs = Math.round((Date.now() - active.startedAt)/1000);
    const score = secs + active.errors*30;

    const data = load();
    const prog = data[active.subject];
    const key = String(active.level);

    const prevBest = prog.best?.[key];
    if(prevBest == null || score < prevBest) prog.best[key] = score;

    if(score <= active.target && active.level < 10){
      prog.unlocked = Math.max(prog.unlocked, active.level+1);
    }

    save(data);

    alert(
      `Finished!\nTime: ${secs}s\nErrors: ${active.errors} (+${active.errors*30}s)\nScore: ${score}s\nTarget: ${active.target}s\n\n` +
      (score<=active.target ? "✅ Cleared — next level unlocked!" : "Try again to unlock the next level.")
    );

    window.startTurbito(subject);
    view.style.display = "none";
  }
};

})();
