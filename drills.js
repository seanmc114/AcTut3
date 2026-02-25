/* drills.js — LC Drill Banks (Serious LC Edition)
   Proper exam-mapped banks.
*/

(function(){

const N = (s)=> String(s||"").trim().toLowerCase();

function S(build,strength,exam){
  return { build,strength,exam };
}

/* =========================
   MATHS
========================= */

const Maths = {
  rapid: [
    { q:"Solve: 3x + 5 = 20", a:["5","x=5"] },
    { q:"Differentiate: 4x^3", a:["12x^2"] },
    { q:"Solve: x^2 - 16 = 0", a:["4,-4","4 and -4","x=4,-4"] },
    { q:"sin(30°)", a:["0.5","1/2"] },
    { q:"Factorise: x^2 + 5x + 6", a:["(x+2)(x+3)"] },
    { q:"Mean of 4, 6, 10", a:["20/3","6.67","6.666"] },
    { q:"d/dx (7)", a:["0"] },
    { q:"Rearrange: A = πr^2 for r", a:["√(a/π)","sqrt(a/pi)"] },
    { q:"Solve: 2^x = 8", a:["3"] },
    { q:"Expand: (x+4)^2", a:["x^2+8x+16"] }
  ],

  structured: [
    { q:"Solve fully: x^2 - 5x + 6 = 0",
      scaffold: S(
        ["Set equal to 0","Factorise","Set brackets = 0","State 2 solutions"],
        ["Factorise → 2 solutions"],
        ["Show method briefly"]
      )
    },
    { q:"Differentiate: 3x^2 + 4x - 5",
      scaffold: S(
        ["Power rule each term","Simplify","Final answer"],
        ["Power rule → simplify"],
        ["Answer only"]
      )
    },
    { q:"Find gradient between (1,2) and (5,10)",
      scaffold: S(
        ["m = (y2-y1)/(x2-x1)","Substitute numbers","Simplify"],
        ["Formula → substitute"],
        ["State formula or final answer"]
      )
    },
    { q:"Solve simultaneous equations (outline method)",
      scaffold: S(
        ["Choose substitution/elimination","Rearrange one equation","Substitute","Solve","Back substitute"],
        ["Choose method → solve"],
        ["State method used"]
      )
    },
    { q:"Integration: ∫ 6x dx",
      scaffold: S(
        ["Increase power by 1","Divide by new power","Add +C"],
        ["Power + divide + C"],
        ["Include +C"]
      )
    }
  ],

  cloze: [
    { text:"The derivative of x^n is ___ x^(n-1).", blanks:["n"] },
    { text:"To solve quadratics, first set equal to ___.", blanks:["0"] },
    { text:"m = (y2 - y1) / (___ - x1).", blanks:["x2"] },
    { text:"∫ x^2 dx = x^3 / ___ + C.", blanks:["3"] },
    { text:"Probability of certain event = ___", blanks:["1"] }
  ]
};

/* =========================
   BIOLOGY
========================= */

const Biology = {
  rapid: [
    { q:"Define osmosis", a:["movement of water","water moves"] },
    { q:"Site of respiration?", a:["mitochondria","mitochondrion"] },
    { q:"Photosynthesis word equation (start with carbon dioxide)", a:["carbon dioxide + water"] },
    { q:"Name a plant hormone", a:["auxin","gibberellin"] },
    { q:"Gas taken in during respiration?", a:["oxygen"] },
    { q:"Function of xylem?", a:["water transport"] },
    { q:"Name one enzyme", a:["amylase","protease","lipase"] },
    { q:"Define diffusion", a:["movement from high to low"] },
    { q:"Role of chlorophyll?", a:["absorbs light"] },
    { q:"Name a vitamin", a:["a","b","c","d","k"] }
  ],

  structured: [
    { q:"Explain photosynthesis (outline structure)",
      scaffold: S(
        ["Word equation","Chloroplast","Light phase","Carbon fixation","Limiting factor"],
        ["Equation + process + limiting factor"],
        ["Equation + explanation"]
      )
    },
    { q:"Describe respiration",
      scaffold: S(
        ["Definition","Site","Aerobic vs anaerobic","Products"],
        ["Definition + products"],
        ["Clear definition"]
      )
    },
    { q:"Experiment scaffold (biology)",
      scaffold: S(
        ["Aim","Apparatus","Method","Control","Conclusion"],
        ["Aim → Method → Conclusion"],
        ["Clear structure"]
      )
    },
    { q:"Explain enzyme action",
      scaffold: S(
        ["Active site","Substrate","Lock-and-key","Denature"],
        ["Active site + effect"],
        ["Clear mechanism"]
      )
    },
    { q:"Long question structure",
      scaffold: S(
        ["3 points","Explain each","Example","Diagram mention"],
        ["Point + explain"],
        ["Concise explanation"]
      )
    }
  ],

  cloze: [
    { text:"The ___ is the site of respiration.", blanks:["mitochondrion"] },
    { text:"Water moves by ___ from high to low concentration.", blanks:["osmosis"] },
    { text:"Photosynthesis requires ___ energy.", blanks:["light"] },
    { text:"Enzymes are ___ catalysts.", blanks:["biological"] },
    { text:"Gas released in photosynthesis is ___.", blanks:["oxygen"] }
  ]
};

/* =========================
   ENGLISH
========================= */

const English = {
  rapid: [
    { q:"Name 3 persuasive techniques (one)", a:["repetition","emotive language","statistics","rhetorical question"] },
    { q:"Define thesis (1 phrase)", a:["main argument"] },
    { q:"Effect of imagery?", a:["creates picture"] },
    { q:"Define tone", a:["attitude"] },
    { q:"Define theme", a:["central idea"] },
    { q:"Name one comparative word", a:["however","similarly"] },
    { q:"Purpose of rhetorical question?", a:["engage reader"] },
    { q:"One evaluation word", a:["overall","ultimately"] },
    { q:"PEE stands for?", a:["point evidence explain"] },
    { q:"Name one narrative technique", a:["flashback","foreshadowing"] }
  ],

  structured: [
    { q:"Write paragraph structure (PEE)",
      scaffold: S(
        ["Point","Evidence (quote)","Explain effect","Link to question"],
        ["Point + quote + effect"],
        ["Clear paragraph"]
      )
    },
    { q:"Essay intro structure",
      scaffold: S(
        ["Thesis","2 key points","Tone established"],
        ["Thesis + roadmap"],
        ["Strong thesis"]
      )
    },
    { q:"Comparative structure",
      scaffold: S(
        ["Similarity","Difference","Effect"],
        ["Compare + judge"],
        ["Analytical comparison"]
      )
    },
    { q:"Personal essay opening",
      scaffold: S(
        ["Engaging hook","Clear direction"],
        ["Hook + focus"],
        ["Focused opening"]
      )
    },
    { q:"Speech structure",
      scaffold: S(
        ["Address audience","Clear argument","Strong close"],
        ["Audience + argument"],
        ["Strong close"]
      )
    }
  ],

  cloze: [
    { text:"A paragraph should make a ___ then support it with ___.", blanks:["point","evidence"] },
    { text:"A thesis states the main ___ of the essay.", blanks:["argument"] },
    { text:"Imagery creates a mental ___.", blanks:["picture"] },
    { text:"Compare texts using ___ and ___ language.", blanks:["analytical","evaluative"] },
    { text:"A conclusion should restate the ___ clearly.", blanks:["thesis"] }
  ]
};

/* =========================
   OTHER SUBJECTS
========================= */

function recallTemplate(subject){
  return {
    rapid:[
      { q:`${subject}: define a key term`, a:["*"] },
      { q:`${subject}: give one example`, a:["*"] },
      { q:`${subject}: name a concept`, a:["*"] },
      { q:`${subject}: one evaluation word`, a:["overall","therefore"] },
      { q:`${subject}: command word meaning explain`, a:["explain"] },
      { q:`${subject}: command word meaning compare`, a:["compare"] },
      { q:`${subject}: one diagram/data term`, a:["label","axis","trend"] },
      { q:`${subject}: state one advantage`, a:["*"] },
      { q:`${subject}: state one disadvantage`, a:["*"] },
      { q:`${subject}: name a case study`, a:["*"] }
    ],
    structured:[
      { q:`${subject}: short answer scaffold`,
        scaffold:S(
          ["Define","Explain","Example","Link"],
          ["Define + example"],
          ["Clear answer"]
        )
      },
      { q:`${subject}: 12-mark structure`,
        scaffold:S(
          ["3 paragraphs","Example each","Evaluation"],
          ["Point + example"],
          ["Concise structure"]
        )
      },
      { q:`${subject}: data response`,
        scaffold:S(
          ["Trend","Evidence","Explain"],
          ["Trend + explain"],
          ["Clear explanation"]
        )
      },
      { q:`${subject}: evaluation scaffold`,
        scaffold:S(
          ["Argument","Counterpoint","Judgement"],
          ["Argument + judgement"],
          ["Clear judgement"]
        )
      },
      { q:`${subject}: exam timing`,
        scaffold:S(
          ["Plan","Write","Check"],
          ["Plan + check"],
          ["Efficient structure"]
        )
      }
    ],
    cloze:[
      { text:`${subject}: A strong answer defines the ___ and gives an ___.`, blanks:["term","example"] },
      { text:`${subject}: Always respond to the command ___ carefully.`, blanks:["word"] },
      { text:`${subject}: Use evidence to support your ___.`, blanks:["point"] },
      { text:`${subject}: Evaluation requires a clear ___.`, blanks:["judgement"] },
      { text:`${subject}: Match your detail to the available ___.`, blanks:["marks"] }
    ]
  };
}

window.DRILL_BANK = {
  Maths,
  Biology,
  English,
  Spanish: recallTemplate("Spanish"),
  French: recallTemplate("French"),
  German: recallTemplate("German"),
  Accounting: recallTemplate("Accounting"),
  Economics: recallTemplate("Economics"),
  Physics: recallTemplate("Physics"),
  Chemistry: recallTemplate("Chemistry"),
  PE: recallTemplate("PE"),
  "Home Ec": recallTemplate("Home Ec"),
  History: recallTemplate("History"),
  Geography: recallTemplate("Geography"),
  Business: recallTemplate("Business"),
  Art: recallTemplate("Art")
};

window.__NORM = N;

})();
