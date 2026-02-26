/* drills.js — Essential Bank (starter)
   DRILL_BANK[subject] contains:
   - rapid: short, autocheckable where possible (turbito uses this)
   - structured: prompts + scaffolds (coach uses this)
   - cloze: recall patterns (coach uses this)
   Each item can include:
   level: "H"|"O"
   tags: ["method-marks","definitions","verbs",...]
   markValue: 1..5   (how expensive when missed)
   freq: 1..5        (how often it shows up / is rewarded)
*/

window.DRILL_BANK = window.DRILL_BANK || {};

function R(subject, level, q, a, tags, markValue=3, freq=3, scaffold=[]){
  return { subject, level, q, a, tags, markValue, freq, scaffold };
}
function S(subject, level, q, tags, markValue=4, freq=3, scaffold=[]){
  return { subject, level, q, tags, markValue, freq, scaffold };
}
function C(subject, level, text, blanks, tags, markValue=3, freq=3){
  return { subject, level, text, blanks, tags, markValue, freq };
}

/* =========================
   MATHS (starter essentials)
   ========================= */
window.DRILL_BANK["Maths"] = {
  rapid: [
    // Ordinary (O) essentials
    R("Maths","O","Expand: (x+3)(x+5)","x^2+8x+15",["algebra","mechanics"],3,5),
    R("Maths","O","Factorise: x^2+7x+10","(x+5)(x+2)",["algebra","mechanics"],3,5),
    R("Maths","O","Solve: 3x-5=16","7",["algebra","mechanics"],3,5),
    R("Maths","O","Gradient formula (two points)","(y2-y1)/(x2-x1)",["functions","definitions"],2,4),
    R("Maths","O","Mean formula","sum/n",["stats","definitions"],2,4),
    R("Maths","O","Probability of event A","favourable/total",["probability","definitions"],2,4),
    R("Maths","O","Circumference of circle","2πr",["geometry","formulae"],3,5),
    R("Maths","O","Area of circle","πr^2",["geometry","formulae"],3,5),
    R("Maths","O","Pythagoras theorem","a^2+b^2=c^2",["trig","definitions"],3,5),
    R("Maths","O","Sine rule (form)","a/sinA=b/sinB=c/sinC",["trig","formulae"],3,4),

    // Higher (H) essentials
    R("Maths","H","Derivative of x^n","nx^(n-1)",["calculus","formulae","method-marks"],4,5),
    R("Maths","H","Integral of x^n (n≠-1)","x^(n+1)/(n+1)+C",["calculus","formulae","method-marks"],4,5),
    R("Maths","H","Derivative of sin x","cos x",["calculus","formulae"],3,4),
    R("Maths","H","Derivative of cos x","-sin x",["calculus","formulae"],3,4),
    R("Maths","H","Derivative of e^x","e^x",["calculus","formulae"],3,4),
    R("Maths","H","Log rule: log(ab)","log a + log b",["logs","mechanics"],3,4),
    R("Maths","H","Binomial: (a+b)^2","a^2+2ab+b^2",["algebra","mechanics"],3,5),
    R("Maths","H","Complex i^2","-1",["complex","definitions"],2,4),
    R("Maths","H","Quadratic formula","(-b±√(b^2-4ac))/(2a)",["algebra","formulae"],4,5),
    R("Maths","H","Radians: 180° =","π",["trig","definitions"],2,4),
  ],

  structured: [
    // O: method marks + no blanks
    S("Maths","O","You’re stuck: write 3 ‘method marks’ lines you can always write.",["method-marks","exam-technique"],5,5,[
      "Write the formula you intend to use",
      "Substitute the known values clearly",
      "Do one algebra step even if unsure"
    ]),
    S("Maths","O","Units/rounding: what is your ‘final answer’ checklist?",["accuracy","units"],3,4,[
      "Units included where needed",
      "Answer rounded correctly",
      "Reasonable size check"
    ]),
    // H: calculus method marks
    S("Maths","H","Differentiate: what are the 3 standard lines that earn method marks?",["method-marks","calculus"],5,5,[
      "State the rule (power/product/chain)",
      "Differentiate step-by-step",
      "Simplify carefully (don’t lose signs)"
    ]),
    S("Maths","H","Integration: what are the 3 standard lines for method marks?",["method-marks","calculus"],5,5,[
      "Write ∫ f(x) dx",
      "Apply power rule correctly",
      "Add +C (and simplify)"
    ]),
  ],

  cloze: [
    C("Maths","O","The area of a circle is ___","πr^2",["formulae","geometry"],3,5),
    C("Maths","O","Pythagoras: ___","a^2+b^2=c^2",["definitions","trig"],3,5),
    C("Maths","H","d/dx (sin x) = ___","cos x",["calculus","formulae"],3,4),
    C("Maths","H","∫ x^n dx = ___ + C","x^(n+1)/(n+1)",["calculus","formulae"],4,5),
  ]
};


/* ==========================
   SPANISH (starter essentials)
   ========================== */
window.DRILL_BANK["Spanish"] = {
  rapid: [
    // Ordinary (O) — core phrases and mechanics
    R("Spanish","O","Translate: I go","voy",["verbs","present","mechanics"],3,5),
    R("Spanish","O","Translate: I have","tengo",["verbs","present","mechanics"],3,5),
    R("Spanish","O","Translate: I can","puedo",["verbs","present","mechanics"],3,5),
    R("Spanish","O","Translate: I like","me gusta",["structures","present"],2,5),
    R("Spanish","O","Translate: because","porque",["connectors","writing"],2,5),
    R("Spanish","O","Translate: however","sin embargo",["connectors","writing"],3,4),
    R("Spanish","O","Translate: I went","fui",["verbs","preterite","mechanics"],3,5),
    R("Spanish","O","Translate: I did / I made","hice",["verbs","preterite","mechanics"],3,4),
    R("Spanish","O","Translate: next weekend","el fin de semana que viene",["time","writing"],2,4),
    R("Spanish","O","Translate: in my opinion","en mi opinión",["opinion","writing"],3,5),

    // Higher (H) — higher value structures/phrases
    R("Spanish","H","Translate: I would like to","me gustaría",["conditional","opinion","writing"],4,5),
    R("Spanish","H","Translate: if I had more time","si tuviera más tiempo",["subjunctive","conditional","writing"],5,4),
    R("Spanish","H","Translate: although","aunque",["connectors","writing"],3,5),
    R("Spanish","H","Translate: on the other hand","por otro lado",["connectors","writing"],3,4),
    R("Spanish","H","Translate: it is important that…","es importante que…",["subjunctive","writing"],5,4),
    R("Spanish","H","Translate: I have been studying","llevo estudiando",["structures","writing"],4,4),
    R("Spanish","H","Translate: as soon as possible","lo antes posible",["exam-phrase","writing"],3,4),
    R("Spanish","H","Translate: to improve my marks","para mejorar mis notas",["exam-phrase","writing"],3,4),
    R("Spanish","H","Translate: I used to go","iba",["imperfect","verbs"],4,4),
    R("Spanish","H","Translate: I will have to","tendré que",["future","verbs","exam-phrase"],4,4),
  ],

  structured: [
    // O: scaffold paragraphs
    S("Spanish","O","Write 3 lines about your school using this scaffold.",["writing","scaffold","opinion"],4,5,[
      "En mi instituto…",
      "Me gusta / No me gusta porque…",
      "En el futuro, me gustaría…"
    ]),
    S("Spanish","O","Opinion sentence drill: build a 3-part sentence.",["writing","scaffold","opinion"],4,5,[
      "Opinion phrase (en mi opinión / creo que)",
      "Reason (porque / ya que)",
      "Extra detail (además / también)"
    ]),

    // H: higher-value “polish” scaffolds
    S("Spanish","H","Upgrade a sentence: add a connector + justification + example.",["writing","scaffold","connectors"],5,5,[
      "Start simple: ‘Pienso que…’",
      "Add connector: ‘Sin embargo / Por otro lado…’",
      "Justify: ‘…porque…’",
      "Add example: ‘Por ejemplo…’"
    ]),
    S("Spanish","H","Subjunctive trigger scaffold: ‘Es importante que…’",["subjunctive","scaffold"],5,4,[
      "Es importante que + present subjunctive",
      "Reason with ‘porque’",
      "Finish with ‘para + infinitive’"
    ]),
  ],

  cloze: [
    C("Spanish","O","En mi opinión, ___ que es importante estudiar.","creo",["opinion","writing"],3,5),
    C("Spanish","O","Me gusta mi instituto ___ mis amigos son simpáticos.","porque",["connectors","writing"],2,5),
    C("Spanish","H","Es importante que ___ (estudiar) todos los días.","estudie",["subjunctive","writing"],5,4),
    C("Spanish","H","Si ___ más tiempo, haría más deporte.","tuviera",["subjunctive","conditional"],5,4),
  ]
};
