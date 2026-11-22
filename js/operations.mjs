// Esercizi di operazioni, ispirati ai compiti del prof:
// "converti prima in base 2, esegui l'operazione, poi verifica riconvertendo in base 10".
//
// Domanda guidata: { kind: "guided", prompt, steps: [{ label, answer, base, explain[], verify? }], explain[], radio, column }
//   step.verify = { of: i }                        → riconverti in base 10 il TUO risultato del passo i
//   step.verify = { q: i, r: j, divisor }          → quoziente × divisore + resto, con i TUOI q (passo i) e r (passo j)

import * as E from "./engine.mjs";
import { rint, rampInt, lerp } from "./questions.mjs";

// Simbolo mostrato all'utente: nei compiti e nel libro la divisione è ":".
const OPS = {
  "+": { name: "Addizione", show: "+", dec: (a, b) => a + b },
  "−": { name: "Sottrazione", show: "−", dec: (a, b) => a - b },
  "×": { name: "Moltiplicazione", show: "×", dec: (a, b) => a * b },
  ":": { name: "Divisione", show: ":", dec: (a, b) => Math.floor(a / b) },
};

const POW2 = [16, 32, 64, 128, 256];

// Operandi nelle fasce dei compiti (41+29, 256−105, 15×13, 26:3).
// Sottrazioni: metà delle volte il minuendo è una potenza di 2 (prestito a catena) e c'è sempre almeno un prestito.
function operands(rng, op, t = 1) {
  if (op === "+") return [rampInt(rng, t, [3, 12], [7, 61]), rampInt(rng, t, [3, 12], [7, 61])];
  if (op === "−") {
    if (t < 0.35) { const a = rint(rng, 6, 15); return [a, rint(rng, 1, a - 1)]; } // riscaldamento: anche senza prestiti
    const maxA = lerp(31, 256, t);
    const pool = POW2.filter((p) => p <= maxA);
    for (let tries = 0; tries < 50; tries++) {
      const a = rng() < 0.5 && t >= 0.6 ? pool[rint(rng, 0, pool.length - 1)] : rint(rng, 16, maxA);
      const b = rint(rng, 1, a - 1);
      if (E.subBinary(E.toBin(a), E.toBin(b)).borrows.includes("1")) return [a, b];
    }
    return [16, 5];
  }
  if (op === "×") return [rampInt(rng, t, [2, 4], [3, 15]), rampInt(rng, t, [2, 4], [3, 15])];
  return [rampInt(rng, t, [6, 15], [9, 60]), rampInt(rng, t, [2, 3], [3, 9])];
}

const convExplain = (n) => [
  ...E.weightSteps(n).map((s) => (s.bit ? `${s.weight} entra in ${s.restBefore} → 1 (resta ${s.restAfter})` : `${s.weight} non entra in ${s.restBefore} → 0`)),
  `${n} = ${E.toBin(n)}`,
];

// Dato lo stato delle risposte dell'utente, calcola cosa ci si aspetta da un passaggio.
// Per i passaggi di verifica il valore atteso dipende dalla risposta data prima:
// così la verifica scopre davvero un'operazione sbagliata.
export function resolveStep(step, givens) {
  const cleaned = (s) => String(s ?? "").replace(/\s+/g, "");
  const bin = (s) => (/^[01]+$/.test(cleaned(s)) ? E.fromBin(cleaned(s)) : NaN);
  if (step.verify && "of" in step.verify) {
    const userBin = cleaned(givens[step.verify.of]);
    const v = bin(givens[step.verify.of]);
    const expected = Number.isNaN(v) ? step.answer : String(v);
    return { kind: "conv", expected, consistent: expected === step.answer, userBin, detail: Number.isNaN(v) ? null : E.binToDecSteps(userBin) };
  }
  if (step.verify && "q" in step.verify) {
    const qBin = cleaned(givens[step.verify.q]), rBin = cleaned(givens[step.verify.r]);
    const q = bin(qBin), r = bin(rBin);
    const ok = !Number.isNaN(q) && !Number.isNaN(r);
    const d = step.verify.divisor;
    const expected = ok ? String(q * d + r) : step.answer;
    return { kind: "div", expected, consistent: expected === step.answer, qBin, rBin, q, r, d, calc: ok ? `con il tuo quoziente ${qBin}${qBin === String(q) ? "" : ` (= ${q})`} e il tuo resto ${rBin}${rBin === String(r) ? "" : ` (= ${r})`}: ${q} × ${d} + ${r} = ${expected}` : "" };
  }
  return { kind: "plain", expected: step.answer, consistent: true };
}

// Giudizio su un passaggio guidato. Nei passaggi di verifica, se il risultato dell'operazione era sbagliato,
// la verifica non è una domanda da giusto/sbagliato: è il momento in cui l'errore viene scoperto.
// Il grassetto "Risposta giusta" non mostra mai un valore incoerente e non c'è una seconda stella per lo stesso errore.
// Le frasi mostrano sempre i conti fatti con i numeri dell'utente.
export function judgeStep(step, givens, given) {
  const r = resolveStep(step, givens);
  const same = (x) => E.sameNumberString(given, x);
  const summary = step.verify?.summary ?? step.answer;
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  if (r.consistent) {
    const ok = same(r.expected);
    return { ok, star: !ok, reward: ok, headline: ok ? "" : `Risposta giusta: ${r.expected}`, note: "", discovered: false };
  }
  const shown = String(given).trim();

  if (r.kind === "div") {
    const tail = `non ${step.answer} (il dividendo) → c'è un errore nel quoziente o nel resto.`;
    if (same(r.expected)) {
      return { ok: true, star: false, reward: true, discovered: true, headline: "Conto giusto, e la verifica ha scoperto un errore", note: `${cap(r.calc)}, ${tail}` };
    }
    if (same(step.answer)) {
      return { ok: false, star: false, reward: false, discovered: true, headline: "La verifica ha scoperto un errore",
        note: `${cap(r.calc)}, ${tail}` };
    }
    return { ok: false, star: true, reward: false, discovered: true, headline: "Ahi, il conto non torna",
      note: `Il conto da fare era: ${r.calc}. Tu hai scritto ${shown}. E ${r.expected} è diverso dal dividendo ${step.answer}: c'è anche un errore nel quoziente o nel resto.` };
  }

  const expand = r.detail ? ` (${r.userBin} = ${r.detail.parts.map((p) => p.value).join(" + ") || 0} = ${r.expected})` : "";
  if (same(r.expected)) {
    return { ok: true, star: false, reward: true, discovered: true, headline: "Conversione giusta, e la verifica ha scoperto un errore",
      note: `Ma ${r.expected} ≠ ${summary}: la verifica ha scoperto un errore nell'operazione in binario.${expand}` };
  }
  if (same(step.answer)) {
    return { ok: false, star: false, reward: false, discovered: true, headline: "La verifica ha scoperto un errore",
      note: `Hai scritto il risultato dell'operazione in decimale (${step.answer}), ma qui si riconverte il tuo ${r.userBin}: vale ${r.expected}${expand}. Quindi l'operazione in binario era sbagliata.` };
  }
  return { ok: false, star: true, reward: false, discovered: true, headline: "Ahi, la riconversione non torna",
    note: `Riconvertendo il tuo ${r.userBin} dovevi ottenere ${r.expected}${expand}, hai scritto ${shown}. E ${r.expected} non è ${summary}: quindi era sbagliata anche l'operazione in binario.` };
}

export function guidedOperation(rng, op, t = 1) {
  const [a, b] = operands(rng, op, t);
  const A = E.toBin(a), B = E.toBin(b);
  const steps = [
    { label: `Converti ${a} in base 2`, answer: A, base: 2, explain: convExplain(a) },
    { label: `Converti ${b} in base 2`, answer: B, base: 2, explain: convExplain(b) },
  ];
  const explain = [`${a} = ${A}`, `${b} = ${B}`];
  const opIdx = 2;
  let column;

  if (op === "+") {
    const r = E.addBinary(A, B);
    const st = E.addSteps(A, B).map((s) => (s.text.startsWith("Riporto finale") ? s.text : `${E.colName(2 ** s.column)}: ${s.text}`));
    steps.push({ label: `Addizione in binario: ${A} + ${B}`, answer: r.result, base: 2, explain: st });
    column = { op, a: A, b: B, result: r.result, carries: r.carries, steps: st };
    explain.push(...st, `${A} + ${B} = ${r.result}`);
  } else if (op === "−") {
    const r = E.subBinary(A, B);
    const st = E.subSteps(A, B).map((s) => s.text);
    steps.push({ label: `Sottrazione in binario: ${A} − ${B}`, answer: r.result, base: 2, explain: st });
    column = { op, a: A, b: B, result: r.result, borrows: r.borrows, ...(({ values, lent, chains }) => ({ borrowed: values, lent, chains }))(E.subColumn(A, B)), steps: st };
    explain.push(...st, `${A} − ${B} = ${r.result}`);
  } else if (op === "×") {
    const r = E.mulBinary(A, B);
    const st = [
      `Un prodotto parziale per ogni 1 del moltiplicatore (spostato a sinistra): ${r.rows.join(" , ")}`,
      r.rows.length > 1
        ? `Somma a due a due: ${r.rows.slice(1).map((row, i) => `${r.partials[i]} + ${row} = ${r.partials[i + 1]}`).join("; ")}`
        : "Un solo prodotto parziale: è già il risultato",
    ];
    steps.push({ label: `Moltiplicazione in binario: ${A} × ${B}`, answer: r.result, base: 2, explain: st });
    column = { op, a: A, b: B, result: r.result, rows: r.rows, partials: r.partials };
    explain.push(...st, `Risultato: ${r.result}`);
  } else {
    const r = E.divBinary(A, B);
    const long = E.divSteps(A, B);
    const st = long.steps.map((s) => s.text);
    steps.push({ label: `Quoziente di ${A} : ${B} (in binario)`, answer: r.quotient, base: 2, explain: st });
    steps.push({ label: `Resto di ${A} : ${B} (in binario, 0 se esatta)`, answer: r.remainder, base: 2, explain: [`Il resto è l'ultimo resto parziale: ${r.remainder}`] });
    column = { op, a: A, b: B, quotient: r.quotient, remainder: r.remainder, steps: st };
    explain.push(...st, `${A} : ${B} = ${r.quotient} con resto ${r.remainder}`);
  }

  if (op === ":") {
    steps.push({
      label: "Verifica in base 10: converti quoziente, divisore e resto, poi calcola quoziente × divisore + resto (con i TUOI risultati): deve venire il dividendo",
      answer: String(a), base: 10, verify: { q: opIdx, r: opIdx + 1, divisor: b, summary: `il dividendo ${a}` },
      explain: [`quoziente × ${b} + resto deve dare il dividendo ${a}`],
    });
    explain.push(`Verifica: ${Math.floor(a / b)} × ${b} + ${a % b} = ${a}`);
  } else {
    const check = OPS[op].dec(a, b);
    steps.push({
      label: "Verifica in base 10: riconverti il TUO risultato",
      answer: String(check), base: 10, verify: { of: opIdx, summary: `${a} ${OPS[op].show} ${b} = ${check}` },
      explain: [`${a} ${OPS[op].show} ${b} = ${check} in base 10: il tuo risultato in binario deve valere lo stesso numero`],
    });
    explain.push(`Verifica: ${a} ${OPS[op].show} ${b} = ${check}`);
  }

  return {
    kind: "guided",
    op,
    prompt: `${OPS[op].name}: ${a} ${OPS[op].show} ${b}`,
    steps,
    explain,
    column, // dati per disegnare l'operazione in colonna (riporti, prestiti, righe)
    radio: "Tre mosse: converti, opera in binario, verifica in decimale. Se la verifica non torna, l'errore è nell'operazione.",
  };
}

// Divisione data già in binario (compito 5: 111100 : 110): niente conversione iniziale.
export function binaryDivision(rng, t = 1) {
  const d = rampInt(rng, t, [2, 3], [3, 9]);
  const q = rampInt(rng, t, [2, 4], [2, 15]);
  const r = rint(rng, 0, d - 1);
  const n = q * d + r;
  const A = E.toBin(n), B = E.toBin(d);
  const div = E.divBinary(A, B);
  const long = E.divSteps(A, B);
  const st = long.steps.map((s) => s.text);
  return {
    kind: "guided",
    op: ":",
    prompt: `Divisione in binario: ${A} : ${B}`,
    steps: [
      { label: "Quoziente (in binario)", answer: div.quotient, base: 2, explain: st },
      { label: "Resto (in binario, 0 se esatta)", answer: div.remainder, base: 2, explain: [`Il resto è l'ultimo resto parziale: ${div.remainder}`] },
      {
        label: "Verifica in base 10: converti quoziente, divisore e resto, poi calcola quoziente × divisore + resto (con i TUOI risultati): deve venire il dividendo",
        answer: String(n), base: 10, verify: { q: 0, r: 1, divisor: d, summary: `il dividendo ${n}` },
        explain: [`Il dividendo ${A} in base 10 vale ${n}; il divisore ${B} vale ${d}`],
      },
    ],
    explain: [...st, `${A} : ${B} = ${div.quotient} con resto ${div.remainder}`, `Verifica: ${E.fromBin(div.quotient)} × ${d} + ${E.fromBin(div.remainder)} = ${n}`],
    column: { op: ":", a: A, b: B, quotient: div.quotient, remainder: div.remainder, steps: st },
    radio: "Si lavora come a scuola: abbassi una cifra, il divisore ci sta? Se sì scrivi 1 e sottrai, se no scrivi 0.",
  };
}

// Operazioni dirette in base 8 o 16 (si passa dal decimale).
export function baseOperation(rng, base, t = 1) {
  const op = ["+", "−", "×"][rint(rng, 0, 2)];
  let a = rampInt(rng, t, [5, 20], [8, 90]), b = rampInt(rng, t, [2, 9], [3, 40]);
  if (op === "−" && b >= a) [a, b] = [b + 1, a];
  if (op === "×") { a = rampInt(rng, t, [2, 6], [3, 20]); b = rampInt(rng, t, [2, 4], [3, 12]); }
  const A = E.toBase(a, base), B = E.toBase(b, base);
  const res = OPS[op].dec(a, b);
  return {
    kind: "text",
    prompt: `Calcola in base ${base}: ${A} ${op} ${B}   (scrivi il risultato in base ${base})`,
    view: { kind: "calc", a: A, op, b: B, base, to: base },
    answer: E.toBase(res, base),
    base,
    explain: [`${A}(${base}) = ${a}`, `${B}(${base}) = ${b}`, `${a} ${op} ${b} = ${res}`, `${res} in base ${base} = ${E.toBase(res, base)}`],
    radio: base === 16 ? "Porta tutto in base 10, calcola, poi riporta il risultato in base 16 (A=10, B=11, C=12, D=13, E=14, F=15)." : "Porta tutto in base 10, calcola, poi riporta il risultato in base 8 (cifre da 0 a 7).",
  };
}

// Conversioni ottale/esadecimale <-> binario (compiti 6-9).
export function groupConversion(rng, t = 1) {
  const base = rng() < 0.5 ? 8 : 16;
  const toBin = rng() < 0.5;
  const n = rampInt(rng, t, [8, 60], [40, 4000]);
  if (toBin) {
    const s = E.toBase(n, base);
    const { chunks, bin } = E.groupsToBin(s, base);
    return {
      kind: "text",
      prompt: `Da base ${base} a base 2: ${s}`,
      view: { kind: "convert", value: s, from: base, to: 2 },
      answer: bin,
      base: 2,
      explain: [...chunks.map((c) => `${c.digit} → ${c.bits}`), `Unisci: ${bin} (gli zeri all'inizio si possono togliere)`],
      radio: base === 8 ? "Ogni cifra ottale = 3 bit." : "Ogni cifra esadecimale = 4 bit.",
    };
  }
  const bin = E.toBin(n);
  const groups = E.binToGroups(bin, base);
  return {
    kind: "text",
    prompt: `Da base 2 a base ${base}: ${bin}`,
    view: { kind: "convert", value: bin, from: 2, to: base },
    answer: groups.map((g) => g.digit).join(""),
    base,
    explain: [`Raggruppa da ${base === 8 ? 3 : 4} bit a partire da destra`, ...groups.map((g) => `${g.bits} → ${g.digit}`)],
    radio: "Se all'ultimo gruppo mancano bit, riempi con zeri a sinistra.",
  };
}

const comma = (s) => String(s).replace(/\./g, ",");

// Numeri con la virgola (compito 9). Tutto in virgola italiana.
export function pointConversion(rng, t = 1) {
  if (rng() < 0.5) {
    const i = rampInt(rng, t, [1, 6], [1, 40]);
    const k = t < 0.4 ? [4, 8, 12][rint(rng, 0, 2)] : rint(rng, 1, 15); // k/16 ha sempre una scrittura decimale finita e una binaria esatta
    const digits = String(k * 625).padStart(4, "0").replace(/0+$/, "");
    const info = E.decimalToBinaryPointDetailed(`${i}.${digits}`);
    return {
      kind: "text",
      prompt: `Da base 10 a base 2 (con la virgola): ${i},${digits}`,
      view: { kind: "convert", value: `${i},${digits}`, from: 10, to: 2, point: true },
      answer: info.text,
      base: 2,
      explain: [
        `Parte intera: ${i} → ${info.intPart}`,
        "Parte decimale: moltiplica per 2 e prendi la cifra prima della virgola",
        ...info.steps.map((st) => `${comma(st.from)} × 2 = ${comma(st.doubled)} → cifra ${st.bit}`),
        `Risultato: ${comma(info.text)}`,
      ],
      radio: "Parte intera: divisioni per 2. Parte decimale: moltiplicazioni per 2.",
    };
  }
  const i = rampInt(rng, t, [1, 7], [1, 31]), f = t < 0.4 ? [2, 4, 6][rint(rng, 0, 2)] : rint(rng, 1, 7);
  const bin = `${E.toBin(i)}.${E.toBin(f).padStart(3, "0")}`;
  const st = E.binaryPointSteps(bin);
  const weight = (t) => (t.exp >= 0 ? String(2 ** t.exp) : `1/${2 ** -t.exp}`);
  return {
    kind: "text",
    prompt: `Da base 2 a base 10 (con la virgola): ${comma(bin)}`,
    view: { kind: "convert", value: comma(bin), from: 2, to: 10, point: true },
    answer: String(st.total),
    base: 10,
    explain: [
      st.terms.map((t) => `${t.bit}×${weight(t)}`).join(" + "),
      "Dopo la virgola i pesi sono 1/2, 1/4, 1/8…",
      `= ${comma(st.total)}`,
    ],
    radio: "Dopo la virgola i pesi sono 2⁻¹, 2⁻², 2⁻³: metà, un quarto, un ottavo.",
  };
}

// Ordinare numeri in basi diverse (compito 9). Etichette 1-4: non si confondono con le cifre esadecimali.
export function orderMixed(rng, t = 1) {
  const vals = [];
  const used = new Set();
  const forms = [
    (n) => ({ text: `${n} (base 10)`, n, value: String(n), base: 10 }),
    (n) => ({ text: `${E.toBase(n, 16)} (base 16)`, n, value: E.toBase(n, 16), base: 16 }),
    (n) => ({ text: `${E.toBin(n)} (base 2)`, n, value: E.toBin(n), base: 2 }),
    (n) => ({ text: `${E.toBase(n, 8)} (base 8)`, n, value: E.toBase(n, 8), base: 8 }),
  ];
  for (const f of forms) {
    let n;
    do { n = rampInt(rng, t, [5, 25], [10, 140]); } while (used.has(n));
    used.add(n);
    vals.push(f(n));
  }
  // mescola l'ordine di presentazione
  for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
  const sorted = vals.slice().sort((x, y) => x.n - y.n);
  return {
    kind: "text",
    alnum: true,
    prompt: `Ordina dal più piccolo al più grande (scrivi i numeri 1-4, es. 3412):  ${vals.map((v, i) => `${i + 1}) ${v.text}`).join("   ")}`,
    view: { kind: "order", items: vals.map((v) => ({ value: v.value, base: v.base, dec: v.n })) },
    answer: sorted.map((s) => String(vals.indexOf(s) + 1)).join(""),
    base: 10,
    explain: [...vals.map((v, i) => `${i + 1}) ${v.text} = ${v.n} in base 10`), "Ora ordina i valori in base 10."],
    radio: "Per confrontare basi diverse, porta tutto in base 10.",
  };
}

// Missione "Operazioni": il focus dell'app. Il binario pesa più delle altre basi.
export function buildOperationsMission(rng) {
  const plan = [
    (t) => guidedOperation(rng, "+", t),
    (t) => guidedOperation(rng, "−", t),
    (t) => guidedOperation(rng, "×", t),
    (t) => binaryDivision(rng, t),
    (t) => groupConversion(rng, t),
    (t) => guidedOperation(rng, ":", t),
    (t) => baseOperation(rng, rng() < 0.5 ? 8 : 16, t),
    (t) => pointConversion(rng, t),
    (t) => orderMixed(rng, t),
  ];
  // Si parte con numeri facili (riscaldamento) e si sale fino ai valori dei compiti.
  return plan.map((g, i) => ({ id: i + 1, ...g(i / (plan.length - 1)) }));
}
