// Generatori di domande del quartiere 4 (decimale <-> binario).
// Ogni domanda: { id, kind, prompt, answer, explain[], radio, widget? }
//   kind: "text" (risposta digitata), "choice" (scelta multipla), "safe" (cassaforte a 8 interruttori)

import * as E from "./engine.mjs";

export const rint = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
// Rampa di difficoltà: t = 0 (facile) … 1 (difficile). lerp interpola, rampInt estrae un intero in un intervallo che si allarga con t.
export const lerp = (easy, hard, t) => Math.round(easy + (hard - easy) * t);
export const rampInt = (rng, t, easy, hard) => rint(rng, lerp(easy[0], hard[0], t), lerp(easy[1], hard[1], t));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const shuffle = (rng, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function explainDecToBin(n) {
  const weights = E.weightSteps(n).map((s) =>
    s.bit ? `${s.weight} entra in ${s.restBefore} → 1 (resta ${s.restAfter})` : `${s.weight} non entra in ${s.restBefore} → 0`);
  const divs = E.divisionSteps(n).map((s) => `${s.dividend} : 2 = ${s.quotient} con resto ${s.remainder}`);
  return [
    "Metodo dei pesi:", ...weights, `Risultato: ${E.toBin(n)}`,
    "Controprova con le divisioni per 2:", ...divs, `Resti dal basso verso l'alto: ${E.toBin(n)}`,
  ];
}

function explainBinToDec(bin) {
  const { all, total } = E.binToDecSteps(bin);
  return [all.map((t) => `(${t.bit} × 2^${t.exp})`).join(" + "), all.map((t) => t.bit * t.value).join(" + "), `= ${total}`];
}

export function decToBin(rng, t = 1) {
  const n = rint(rng, 3, lerp(15, 255, t));
  return {
    kind: "text",
    prompt: `Scrivi ${n} in binario.`,
    answer: E.toBin(n),
    base: 2,
    explain: explainDecToBin(n),
    radio: "Radio Overflow: se sbagli il binario, il computer non si arrabbia. Ti ignora e basta.",
  };
}

export function binToDec(rng, t = 1) {
  const bits = lerp(3, 6, t);
  const n = rint(rng, 2 ** (bits - 2), 2 ** bits - 1);
  const bin = E.toBin(n);
  return {
    kind: "text",
    prompt: `Quanto vale ${bin} in decimale?`,
    answer: String(n),
    base: 10,
    explain: explainBinToDec(bin),
    radio: "Ricorda: pesi 1, 2, 4, 8, 16... ogni posto vale il doppio del precedente.",
  };
}

export function safeCrack(rng, t = 1) {
  const n = rint(rng, 3, lerp(15, 255, t));
  return {
    kind: "safe",
    prompt: `Scassina la cassaforte: accendi gli interruttori giusti per ottenere ${n}.`,
    answer: String(n),
    value: n,
    explain: [`${n} = ${E.weightSteps(n).filter((s) => s.bit).map((s) => s.weight).join(" + ")}`, `Interruttori accesi: ${E.toBin(n).padStart(8, "0")}`],
    radio: "Ogni interruttore acceso aggiunge il suo peso. Spento = 0, acceso = 1.",
  };
}

export function bitsFor(rng, t = 1) {
  const n = pick(rng, t < 0.4 ? [10, 100] : [10, 100, 255, 256, 500, 1000, 1023, 1024]);
  const need = E.bitsNeeded(n);
  const opts = shuffle(rng, [...new Set([need, need - 1, need + 1, need + 2])].filter((x) => x > 0));
  return {
    kind: "choice",
    prompt: `Quanti bit servono per scrivere ${n} in binario?`,
    options: opts.map(String),
    answer: String(need),
    explain: [`${n} in binario è ${E.toBin(n)}: ${need} cifre, quindi ${need} bit.`],
    radio: "Ogni volta che raggiungi una nuova potenza di 2 (2, 4, 8, 16…) serve un bit in più: 255 sta in 8 bit, 256 ne vuole 9.",
  };
}

// Domande di teoria (con battuta): il testo è scritto a mano, le risposte no.
export const THEORY = [
  {
    prompt: "Perché i computer digitali usano solo 0 e 1?",
    options: [
      "Perché i circuiti distinguono in modo affidabile due stati fisici (es. due tensioni)",
      "Perché il sistema binario è stato inventato insieme ai computer",
      "Perché tutti i calcolatori, fin dall'inizio, hanno sempre usato il binario",
    ],
    answer: 0,
    explain: ["I circuiti digitali distinguono due stati fisici: per convenzione 0 e 1."],
    radio: "Notizia flash: il computer ha due sole dita. Ed è comunque più veloce di te.",
  },
  {
    prompt: "Quanti bit ha un byte?",
    options: ["8", "10", "1024"],
    answer: 0,
    explain: ["Un byte è un gruppo di 8 bit: da 00000000 (0) a 11111111 (255)."],
    radio: "Un byte = 8 bit. Con 8 interruttori fai 256 combinazioni diverse.",
  },
  {
    prompt: "In un sistema posizionale, il valore di una cifra dipende...",
    options: ["Dalla cifra e dalla posizione che occupa", "Solo dalla cifra", "Solo dalla posizione"],
    answer: 0,
    explain: ["427 e 247 usano le stesse cifre, ma sono numeri diversi: conta la posizione."],
    radio: "Come nella vita: non conta solo chi sei, conta anche dove ti siedi in classe.",
  },
  {
    prompt: "Quanti valori diversi puoi rappresentare con 3 bit?",
    options: ["8", "6", "3"],
    answer: 0,
    explain: ["2 × 2 × 2 = 2^3 = 8 valori (da 000 a 111)."],
    radio: "n bit = 2^n combinazioni. Aggiungi un bit e raddoppi tutto.",
  },
  {
    prompt: "Chi sviluppò nel Seicento la rappresentazione e il calcolo con le sole cifre 0 e 1?",
    options: ["Leibniz", "Boole", "Shannon"],
    answer: 0,
    explain: ["Leibniz (’600): sistema binario. Boole (’800): algebra della logica. Shannon (anni ’30 del ’900): logica di Boole con circuiti a interruttori e relè."],
    radio: "Leibniz ci è arrivato 300 anni prima dei computer. Visionario o solo annoiato?",
  },
  {
    prompt: "Chi elaborò nell’Ottocento un’algebra con valori VERO e FALSO?",
    options: ["Boole", "Leibniz", "Shannon"],
    answer: 0,
    explain: ["George Boole: l’algebra per rappresentare matematicamente le operazioni logiche."],
    radio: "VERO e FALSO: l’unico caso in cui un computer è più onesto di te dopo una verifica.",
  },
  {
    prompt: "Chi mostrò negli anni ’30 del Novecento come realizzare la logica di Boole con circuiti a interruttori e relè?",
    options: ["Shannon", "Leibniz", "Boole"],
    answer: 0,
    explain: ["Claude Shannon collegò l’algebra di Boole ai circuiti elettrici."],
    radio: "Shannon: da una teoria in carta ai primi interruttori che ragionano.",
  },
  {
    prompt: "Quale di queste macchine usava il sistema decimale?",
    options: ["L’ENIAC", "Un moderno PC", "Uno smartphone"],
    answer: 0,
    explain: ["Non tutte le macchine usavano il binario: l’ENIAC usava il sistema decimale. Il binario è diventato fondamentale con i circuiti digitali a due stati."],
    radio: "L’ENIAC faceva i conti in base 10. Sì, come te alle elementari.",
  },
  {
    prompt: "Cambiare sistema di numerazione (ad esempio da base 10 a base 2) cambia...",
    options: ["Il modo in cui la quantità viene scritta, non la quantità", "La quantità rappresentata", "Sia la quantità sia il modo di scriverla"],
    answer: 0,
    explain: ["10 in base 2 e 2 in base 10 sono la stessa quantità scritta in due modi."],
    radio: "Cambi lingua, non cambi il numero di mele nel cesto.",
  },
  {
    prompt: "Cosa indica la base di un sistema di numerazione posizionale?",
    options: ["Quante cifre diverse sono disponibili (e i pesi sono le sue potenze)", "Il numero più grande che si può scrivere", "Il valore della cifra più a sinistra"],
    answer: 0,
    explain: ["Base 10: dieci cifre e pesi 1, 10, 100… Base 2: due cifre e pesi 1, 2, 4, 8…"],
    radio: "La base è il numero di dita che ti servono. In binario ne basta una, a due stati.",
  },
  {
    prompt: "Secondo il libro, quanti byte equivalgono a 1 kB?",
    options: ["1024 (2^10)", "8", "100"],
    answer: 0,
    explain: ["1 kB = 1024 byte = 2^10 byte; si usa ‘circa 10^3’ solo per fare i conti a mente."],
    radio: "Nel libro (e in molti programmi) 1 kB = 1024 byte = 2^10. Per i compiti segui il libro. Lo standard internazionale distingue: KiB = 1024 e kB = 1000.",
  },
  {
    prompt: "Qual è la più piccola unità di misura dell’informazione?",
    options: ["Il bit", "Il byte", "Il kilobyte"],
    answer: 0,
    explain: ["Il bit (0 o 1) è la più piccola unità; il byte è un gruppo di 8 bit."],
    radio: "Il bit è il mattoncino. Il byte è il blocchetto da 8.",
  },
  {
    prompt: "In passato il termine inglese ‘computers’ indicava...",
    options: ["Persone incaricate di eseguire calcoli", "Macchine a schede perforate", "Le prime calcolatrici tascabili"],
    answer: 0,
    explain: ["I ‘computers’ erano persone pagate per fare calcoli (ad esempio nei centri di ricerca aeronautica)."],
    radio: "Il primo lavoro dell’informatica: fare i compiti di matematica a pagamento.",
  },
];

export function theory(rng, used = new Set()) {
  const pool = THEORY.map((_, i) => i).filter((i) => !used.has(i));
  const idx = (pool.length ? pool : THEORY.map((_, i) => i))[Math.floor(rng() * (pool.length || THEORY.length))];
  used.add(idx);
  const t = THEORY[idx];
  const opts = shuffle(rng, t.options.map((text, i) => ({ text, ok: i === t.answer })));
  return {
    kind: "choice",
    prompt: t.prompt,
    options: opts.map((o) => o.text),
    answer: t.options[t.answer],
    explain: t.explain,
    radio: t.radio,
  };
}

// Una missione = sequenza mista di domande che alterna pratica e teoria.
export function buildMission(rng, count = 8) {
  const plan = [theory, decToBin, safeCrack, binToDec, bitsFor, decToBin, theory, safeCrack];
  const out = [];
  const usedTheory = new Set();
  for (let i = 0; i < count; i++) {
    const gen = plan[i % plan.length];
    const t = count > 1 ? i / (count - 1) : 1; // si parte facile e si sale
    const q = gen === theory ? theory(rng, usedTheory) : gen(rng, t);
    out.push({ id: i + 1, ...q });
  }
  return out;
}

// Controllo risposta: tutta la logica di correzione sta qui.
export function checkAnswer(q, given) {
  if (q.kind === "choice") return String(given) === q.answer;
  if (q.kind === "safe") return Number(given) === q.value;
  if (q.alnum) {
    const strip = (v) => String(v).toUpperCase().replace(/[^A-Z0-9]/g, "");
    return strip(given) === strip(q.answer);
  }
  return E.sameNumberString(given, q.answer);
}
