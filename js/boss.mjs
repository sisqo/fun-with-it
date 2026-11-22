// Il caveau di un capitolo (boss): bonus che si offre quando il capitolo è superato alla perfezione e resta da tentare finché non si vince.
// Tre passaggi, niente stelle: 1 le ruote (a display coperto, si calcolano i pesi a mente), 2 una domanda del capitolo, 3 la combinazione in binario.
// Ci sono 3 tentativi: un errore fa ripetere SOLO quel passaggio con una domanda nuova; finiti i tentativi si ricomincia da capo.
// Non si perde niente, mai.

import * as E from "./engine.mjs";
import * as Q from "./questions.mjs";
import * as O from "./operations.mjs";
import * as V from "./vault.mjs";
import { chapterTopics } from "./progress.mjs";
import { lessonQuestionsFor } from "./lessons.mjs";

const { rint } = Q;
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export const BOSS_ATTEMPTS = 3;
export const BOSS_NAME = {
  warm: "Il Garage", c1: "Il Molo dei Robot", c2: "Il Vicolo dei Bit", conv: "Il Ponte",
  ops: "La Torre dei Conti", basi: "Il Faro Sedici", virgola: "Il Lungomare",
};
export const STEP_LABELS = ["Ruote", "Domanda", "Combinazione"];

// Passaggio 1: le ruote a display coperto. Niente somma in tempo reale: bisogna fare i conti con i pesi.
export function blindVault(rng) {
  const n = rint(rng, 64, 255);
  return {
    ...V.vaultBuild(rng, n),
    blind: true,
    prompt: `Accendi le ruote giuste per fare ${n}. Il display resta spento: calcola tu i pesi, poi premi «Apri».`,
    hint: "",
  };
}

// Calcolo in binario a livello compito, con risposta in binario. La spiegazione usa i passaggi in colonna.
function binaryOp(rng) {
  const op = pick(rng, ["+", "−", "×", ":"]);
  let a, b, want, tail, steps;
  if (op === "+") { a = rint(rng, 30, 120); b = rint(rng, 30, 120); want = a + b; }
  else if (op === "−") { a = rint(rng, 100, 255); b = rint(rng, 20, a - 1); want = a - b; }
  else if (op === "×") { a = rint(rng, 8, 15); b = rint(rng, 8, 15); want = a * b; }
  else { b = rint(rng, 3, 9); want = rint(rng, 5, 25); a = want * b; tail = "il quoziente"; }
  const A = E.toBin(a), B = E.toBin(b);
  if (op === "+") steps = E.addSteps(A, B).map((s) => (s.text.startsWith("Riporto finale") ? s.text : `${E.colName(2 ** s.column)}: ${s.text}`));
  else if (op === "−") steps = E.subSteps(A, B).map((s) => s.text);
  else if (op === "×") { const m = E.mulBinary(A, B); steps = [`Righe (una per ogni 1 del moltiplicatore, spostate a sinistra): ${m.rows.join(" , ")}`, `Somme a due a due: ${m.rows.slice(1).map((r, i) => `${m.partials[i]} + ${r} = ${m.partials[i + 1]}`).join("; ") || "una sola riga"}`]; }
  else steps = E.divSteps(A, B).steps.map((s) => s.text);
  return {
    kind: "text", base: 2, topic: "ops-boss",
    prompt: `Calcola in binario: ${A} ${op} ${B}   (scrivi ${tail ?? "il risultato"} in binario). Usa il quaderno: fai l'operazione in colonna.`,
    answer: E.toBin(want),
    explain: [`${A} = ${a}, ${B} = ${b}`, ...steps, `Risultato: ${E.toBin(want)} (${want} in decimale)`],
    radio: "Converti, opera, verifica: le tre mosse non cambiano nemmeno davanti a un caveau.",
  };
}

// Capitoli di teoria: DUE domande a scelta di argomenti diversi, tutte e due da azzeccare (con tre opzioni una sola si indovina troppo spesso).
function twoChoices(rng, chapterId) {
  const topics = chapterTopics(chapterId);
  const first = pick(rng, topics);
  const rest = topics.filter((t) => t.id !== first.id);
  const second = rest.length ? pick(rng, rest) : first;
  const qa = lessonQuestionsFor(rng, first.id);
  const qb = lessonQuestionsFor(rng, second.id, new Set([qa.prompt]));
  if (!qa || !qb) throw new RangeError(`capitolo senza domande: ${chapterId}`);
  return {
    kind: "multi", topic: `${first.id}+${second.id}`,
    prompt: "Rispondi a tutte e due le domande.",
    parts: [qa, qb],
    answer: `${qa.answer} · ${qb.answer}`,
    explain: [...qa.explain, ...qb.explain],
    radio: qa.radio,
  };
}

// La domanda del passaggio 2: a risposta singola (scelta o testo), a livello massimo, del capitolo del caveau.
export function bossQuestion(rng, chapterId) {
  switch (chapterId) {
    case "warm": return V.vaultRead(rng, rint(rng, 100, 255));
    case "conv": return rng() < 0.5 ? Q.decToBin(rng, 1) : Q.binToDec(rng, 1);
    case "ops": return binaryOp(rng);
    case "basi": return rng() < 0.5 ? O.groupConversion(rng, 1) : O.baseOperation(rng, rng() < 0.5 ? 8 : 16, 1);
    case "virgola": return rng() < 0.5 ? O.pointConversion(rng, 1) : O.orderMixed(rng, 1);
    default: return twoChoices(rng, chapterId);
  }
}

// Una prova nuova per un passaggio (dopo un errore si ripete solo quello, con una domanda diversa).
export function stepQuestion(rng, chapterId, stepIndex) {
  if (stepIndex === 0) return blindVault(rng);
  if (stepIndex === 1) return bossQuestion(rng, chapterId);
  return V.vaultCode(rng, rint(rng, 128, 255));
}

export function buildBoss(rng, chapterId) {
  if (!BOSS_NAME[chapterId]) throw new RangeError(`capitolo sconosciuto: ${chapterId}`);
  return {
    chapter: chapterId, name: BOSS_NAME[chapterId], left: BOSS_ATTEMPTS,
    steps: STEP_LABELS.map((label, i) => ({ label, q: stepQuestion(rng, chapterId, i) })),
  };
}

// Verifica di un passaggio. given: numero (ruote), stringa (testo, combinazione, scelta) o elenco di scelte (due domande).
export function bossCheck(q, given) {
  if (q.kind === "multi") return Array.isArray(given) && given.length === q.parts.length && q.parts.every((p, i) => Q.checkAnswer(p, given[i]));
  return Q.checkAnswer(q, given);
}

// La risposta giusta, da mostrare dopo un errore.
export function bossShown(q) {
  if (q.kind === "safe") return String(q.value);
  if (q.kind === "multi") return q.parts.map((p) => p.answer).join(" · ");
  if (q.vault?.show === "ruler") return V.bits8(q.vault.value);
  return q.answer;
}
