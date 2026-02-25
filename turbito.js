/* turbito.js — Turbo Engine Clone (Subject Specific, 10 Levels)
   Uses: time + 30s per error scoring
   Unlocks next level automatically when threshold beaten
   Local storage only
*/

(function(){

const STORAGE_KEY = "TURBITO_V1";

function load(){
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function save(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function ensureSubject(subject){
  const data = load();
  if(!data[subject]){
    data[subject] = {
      unlocked: 1,
      bestScore: {},
      stars: {}
    };
    save(data);
  }
  return data;
}

/* ===========================
   CONFIG — EDIT PER SUBJECT
=========================== */

const TURBITO_CONFIG = {
  Spanish: {
    thresholds: [180,160,150,140,130,120,110,100,90,80]
  },
  Maths: {
    thresholds: [200,180,170,160,150,140,130,120,110,100]
  },
  Economics: {
    thresholds: [200,180,170,160,150,140,130,120,110,100]
  }
  // Add more subjects as needed
};

let active = null;

/* ===========================
   PUBLIC ENTRY POINT
=========================== */

window.startTurbito = function(subject){

  ensureSubject(subject);

  const container = document.getElementById("turbitoContainer");
  container.innerHTML = "";

  const data = load()[subject];
  const config = TURBITO_CONFIG[subject];

  if(!config){
    container.innerHTML = "<p>No Turbito config for this subject yet.</p>";
    return;
  }

  for(let i=1;i<=10;i++){
    const btn = document.createElement("button");
    btn.className = "turbito-level";

    const unlocked = i <= data.unlocked;

    btn.innerHTML = `
      <div>Level ${i}</div>
      <div>${renderStars(data.stars[i])}</div>
    `;

    if(!unlocked){
      btn.disabled = true;
      btn.classList.add("locked");
    } else {
      btn.onclick = ()=>launchLevel(subject, i);
    }

    container.appendChild(btn);
  }

  document.getElementById("turbitoView").style.display = "block";
};

/* ===========================
   LEVEL ENGINE
=========================== */

function launchLevel(subject, level){

  active = {
    subject,
    level,
    startTime: Date.now(),
    errors: 0,
    total: 5,
    correct: 0
  };

  document.getElementById("turbitoView").innerHTML = `
    <h3>${subject} · Level ${level}</h3>
    <div id="tbStats">Q 1/5</div>
    <div id="tbQuestion"></div>
    <input id="tbInput" placeholder="Answer">
    <button id="tbSubmit">Submit</button>
  `;

  nextQuestion();
}

function nextQuestion(){

  if(active.correct + active.errors >= active.total){
    finishLevel();
    return;
  }

  document.getElementById("tbStats").innerText =
    `Q ${active.correct + active.errors + 1}/5`;

  // Placeholder question for now
  document.getElementById("tbQuestion").innerText =
    "Answer correctly to simulate (mechanics placeholder)";

  document.getElementById("tbSubmit").onclick = ()=>{

    const val = document.getElementById("tbInput").value.trim();

    if(val.toLowerCase() === "a"){
      active.correct++;
    } else {
      active.errors++;
    }

    document.getElementById("tbInput").value = "";
    nextQuestion();
  };
}

function finishLevel(){

  const timeTaken = Math.floor((Date.now() - active.startTime)/1000);
  const score = timeTaken + (30 * active.errors);

  const data = load();
  const subjData = data[active.subject];
  const thresholds = TURBITO_CONFIG[active.subject].thresholds;

  const threshold = thresholds[active.level - 1];

  // Save best score
  if(!subjData.bestScore[active.level] ||
     score < subjData.bestScore[active.level]){
       subjData.bestScore[active.level] = score;
  }

  // Stars
  let stars = 1;
  if(score <= threshold) stars = 2;
  if(score <= threshold * 0.8) stars = 3;
  subjData.stars[active.level] = stars;

  // Unlock
  if(score <= threshold && active.level === subjData.unlocked){
    subjData.unlocked++;
  }

  save(data);

  document.getElementById("turbitoView").innerHTML = `
    <h3>Level Complete</h3>
    <p>Time: ${timeTaken}s</p>
    <p>Errors: ${active.errors}</p>
    <p>Score: ${score}</p>
    <p>Stars: ${renderStars(stars)}</p>
    <button onclick="startTurbito('${active.subject}')">Back to Levels</button>
  `;

  active = null;
}

function renderStars(n){
  if(!n) return "";
  return "⭐".repeat(n);
}

})();
