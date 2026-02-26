window.DRILL_BANK = window.DRILL_BANK || {};

// Helpers
function rapid(subject, level, q, a, tags, markValue=3, freq=3){
  return { subject, level, q, a: Array.isArray(a)?a:[a], tags, markValue, freq };
}
function structured(subject, level, q, tags, markValue=4, freq=3, scaffold=[]){
  return { subject, level, q, tags, markValue, freq, scaffold };
}
function cloze(subject, level, text, blanks, tags, markValue=3, freq=3){
  return { subject, level, text, blanks: Array.isArray(blanks)?blanks:[blanks], tags, markValue, freq };
}

// ===== MATHS =====
window.DRILL_BANK["Maths"] = {
  rapid: [
    // O
    rapid("Maths","O","State Pythagoras theorem","a^2+b^2=c^2",["trig","definitions"],3,5),
    rapid("Maths","O","Area of a circle","πr^2",["geometry","formulae"],3,5),
    rapid("Maths","O","Circumference of a circle","2πr",["geometry","formulae"],3,5),
    rapid("Maths","O","Sine rule (form)","a/sinA=b/sinB=c/sinC",["trig","formulae"],3,4),
    rapid("Maths","O","Cosine rule (form)","c^2=a^2+b^2-2abcosC",["trig","formulae"],4,4),
    rapid("Maths","O","Mean (formula)","sum/n",["stats","definitions"],2,4),
    rapid("Maths","O","Probability (definition form)","favourable/total",["probability","definitions"],2,4),
    // H
    rapid("Maths","H","d/dx(x^n)","nx^(n-1)",["calculus","formulae","method-marks"],4,5),
    rapid("Maths","H","∫ x^n dx (n≠-1)","x^(n+1)/(n+1)+C",["calculus","formulae","method-marks"],4,5),
    rapid("Maths","H","d/dx(sin x)","cos x",["calculus","formulae"],3,4),
    rapid("Maths","H","d/dx(cos x)","-sin x",["calculus","formulae"],3,4),
    rapid("Maths","H","Quadratic formula","(-b±√(b^2-4ac))/(2a)",["algebra","formulae"],4,5),
    rapid("Maths","H","Radians: 180° =","π",["trig","definitions"],2,4)
  ],
  structured: [
    structured("Maths","O","When stuck: write the 3 method-marks lines you can always write.",["method-marks","exam-technique"],5,5,[
      "Write the formula you intend to use",
      "Substitute values clearly",
      "Do one algebra step (even if unsure)"
    ]),
    structured("Maths","H","Derivative routine (method marks): write your 3-line template.",["method-marks","calculus"],5,5,[
      "State rule (power/chain/product)",
      "Differentiate step-by-step",
      "Simplify carefully (signs!)"
    ])
  ],
  cloze: [
    cloze("Maths","O","Area of a circle is ___","πr^2",["geometry","formulae"],3,5),
    cloze("Maths","H","d/dx (sin x) = ___","cos x",["calculus","formulae"],3,4),
    cloze("Maths","H","∫ x^n dx = ___ + C","x^(n+1)/(n+1)",["calculus","formulae"],4,5),
  ]
};

// ===== SPANISH =====
window.DRILL_BANK["Spanish"] = {
  rapid: [
    // O essentials
    rapid("Spanish","O","Translate: I go","voy",["verbs","present"],3,5),
    rapid("Spanish","O","Translate: I have","tengo",["verbs","present"],3,5),
    rapid("Spanish","O","Translate: I like","me gusta",["structures","present"],2,5),
    rapid("Spanish","O","Translate: because","porque",["connectors"],2,5),
    rapid("Spanish","O","Translate: in my opinion","en mi opinión",["opinion"],3,5),
    rapid("Spanish","O","Translate: I went","fui",["verbs","preterite"],3,5),
    // H polish essentials
    rapid("Spanish","H","Translate: I would like to","me gustaría",["conditional","opinion"],4,5),
    rapid("Spanish","H","Translate: although","aunque",["connectors"],3,5),
    rapid("Spanish","H","Translate: on the other hand","por otro lado",["connectors"],3,4),
    rapid("Spanish","H","Translate: it is important that…","es importante que…",["subjunctive"],5,4),
    rapid("Spanish","H","Translate: if I had more time","si tuviera más tiempo",["subjunctive","conditional"],5,4),
    rapid("Spanish","H","Translate: I used to go","iba",["imperfect","verbs"],4,4)
  ],
  structured: [
    structured("Spanish","O","3-line scaffold about school (use all three).",["writing","scaffold"],4,5,[
      "En mi instituto…",
      "Me gusta / No me gusta porque…",
      "En el futuro, me gustaría…"
    ]),
    structured("Spanish","H","Upgrade a sentence: connector + justification + example.",["writing","connectors","scaffold"],5,5,[
      "Start: Pienso que…",
      "Connector: Sin embargo / Por otro lado…",
      "Justify: …porque…",
      "Example: Por ejemplo…"
    ]),
    structured("Spanish","H","Subjunctive trigger scaffold: Es importante que…",["subjunctive","scaffold"],5,4,[
      "Es importante que + subjunctive",
      "Reason with porque",
      "Finish with para + infinitive"
    ])
  ],
  cloze: [
    cloze("Spanish","O","Me gusta mi instituto ___ mis amigos son simpáticos.","porque",["connectors"],2,5),
    cloze("Spanish","H","Es importante que ___ (estudiar) todos los días.","estudie",["subjunctive"],5,4),
    cloze("Spanish","H","Si ___ más tiempo, haría más deporte.","tuviera",["subjunctive","conditional"],5,4)
  ]
};
