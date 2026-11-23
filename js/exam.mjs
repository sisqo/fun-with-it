// Esame finale: una prova unica su tutti i capitoli, senza suggerimenti né correzioni mentre si risponde.
// Alla fine c'è un voto in decimi (come a scuola) e l'esito capitolo per capitolo: serve a capire se le lezioni sono davvero superate.
// Ogni domanda è a risposta finale (niente passaggi guidati) e vale 1 punto, tutto o niente.

import * as E from "./engine.mjs";
import * as Q from "./questions.mjs";
import * as O from "./operations.mjs";
import * as V from "./vault.mjs";
import { CHAPTERS, topicById } from "./progress.mjs";
import { lessonQuestionsFor } from "./lessons.mjs";

const { rint } = Q;
export const EXAM_LEVEL = 0.75; // difficoltà dei numeri: a livello di compito, senza arrivare al massimo
export const PASS_GRADE = 6;
export const CHAPTER_PASS = 0.6; // un capitolo è superato con almeno il 60% di risposte giuste
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// Dalla versione guidata di un'operazione si tiene solo la risposta finale (il calcolo in binario).
function opQuestion(rng, op) {
  if (op === ":") {
    const g = O.binaryDivision(rng, EXAM_LEVEL);
    const c = g.column;
    return {
      kind: "text", base: 2, prompt: `Calcola in binario: ${c.a} : ${c.b} (scrivi il quoziente in binario, ignora l'eventuale resto).`,
      view: { kind: "calc", a: c.a, op: ":", b: c.b, base: 2, to: 2, what: "il quoziente" },
      answer: c.quotient, explain: g.explain, radio: g.radio,
    };
  }
  const g = O.guidedOperation(rng, op, EXAM_LEVEL);
  const c = g.column;
  return {
    kind: "text", base: 2, prompt: `Calcola in binario: ${c.a} ${op} ${c.b} (scrivi il risultato in binario).`,
    view: { kind: "calc", a: c.a, op, b: c.b, base: 2, to: 2, what: "il risultato" },
    answer: g.steps[2].answer, explain: g.explain, radio: g.radio,
  };
}

const theory = (rng, ids, n, used) => {
  const out = [];
  const pool = [...ids];
  while (out.length < n) {
    const id = pool.length ? pool.splice(Math.floor(rng() * pool.length), 1)[0] : pick(rng, ids);
    out.push({ topic: id, q: lessonQuestionsFor(rng, id, new Set(used)) });
    used.add(out.at(-1).q.prompt);
  }
  return out;
};

// Piano dell'esame: per ogni capitolo i generatori da usare. Le operazioni (cuore del corso) pesano di più.
const PLAN = {
  warm: (rng) => [
    { topic: "cassaforte", q: V.vaultBuild(rng, rint(rng, 40, 255)) },
    { topic: "cassaforte", q: V.vaultRead(rng, rint(rng, 100, 255)) },
    { topic: "cassaforte", q: V.vaultCode(rng, rint(rng, 128, 255)) },
  ],
  c1: (rng, used) => theory(rng, ["istruzioni-robot", "dati-informazioni", "algoritmo-pensiero", "informatica-termini", "storia"], 3, used),
  c2: (rng, used) => theory(rng, ["bit-byte", "sistemi-posizionali", "bit-valori"], 3, used),
  conv: (rng) => [
    { topic: "dec-bin", q: Q.decToBin(rng, EXAM_LEVEL) },
    { topic: "bin-dec", q: Q.binToDec(rng, EXAM_LEVEL) },
    { topic: "bit-necessari", q: Q.bitsFor(rng, EXAM_LEVEL) },
    { topic: "bin-dec", q: Q.binToDec(rng, EXAM_LEVEL) },
  ],
  ops: (rng) => [
    { topic: "addizione", q: opQuestion(rng, "+") },
    { topic: "sottrazione", q: opQuestion(rng, "−") },
    { topic: "moltiplicazione", q: opQuestion(rng, "×") },
    { topic: "divisione", q: opQuestion(rng, ":") },
    { topic: "addizione", q: opQuestion(rng, pick(rng, ["+", "−", "×"])) },
  ],
  basi: (rng) => [
    { topic: "ott-esa", q: O.groupConversion(rng, EXAM_LEVEL) },
    { topic: "ops-basi", q: O.baseOperation(rng, 8, EXAM_LEVEL) },
    { topic: "ops-basi", q: O.baseOperation(rng, 16, EXAM_LEVEL) },
  ],
  virgola: (rng) => [
    { topic: "virgola", q: O.pointConversion(rng, EXAM_LEVEL) },
    { topic: "virgola", q: O.pointConversion(rng, EXAM_LEVEL) },
    { topic: "confronto-basi", q: O.orderMixed(rng, EXAM_LEVEL) },
  ],
};

// 24 domande in ordine di capitolo. Se una domanda esce uguale a una già presa, se ne genera un'altra.
export function buildExam(rng) {
  const used = new Set();
  const items = [];
  for (const ch of CHAPTERS) {
    let batch = PLAN[ch.id](rng, used);
    for (let tries = 0; tries < 8 && new Set(batch.map((b) => b.q.prompt)).size < batch.length; tries++) batch = PLAN[ch.id](rng, used);
    for (const b of batch) { used.add(b.q.prompt); items.push({ chapter: ch.id, topic: b.topic, q: { ...b.q, topic: b.topic } }); }
  }
  return items.map((it, i) => ({ ...it, id: i + 1 }));
}

// Voto in decimi, a mezzi punti (7, 7½, 8…), da 0 a 10.
export const gradeFor = (correct, total) => (total > 0 ? Math.round((10 * correct) / total * 2) / 2 : 0);

export function verdictFor(grade) {
  if (grade >= 10) return "Eccellente";
  if (grade >= 9) return "Ottimo";
  if (grade >= 8) return "Buono";
  if (grade >= 7) return "Discreto";
  if (grade >= 6) return "Sufficiente";
  if (grade >= 5) return "Quasi sufficiente";
  if (grade >= 4) return "Insufficiente";
  return "Gravemente insufficiente";
}
export const isPassed = (grade) => grade >= PASS_GRADE;

// Esito: voto, promosso o no e, capitolo per capitolo, giuste/totali e se è superato.
// items: le domande; results: per ogni domanda true/false (stessa lunghezza).
export function gradeExam(items, results) {
  const total = items.length;
  const correct = results.filter(Boolean).length;
  const grade = gradeFor(correct, total);
  const chapters = CHAPTERS.map((ch) => {
    const idx = items.map((it, i) => (it.chapter === ch.id ? i : -1)).filter((i) => i >= 0);
    const right = idx.filter((i) => results[i]).length;
    const state = right === idx.length ? "perfetto" : right / idx.length >= CHAPTER_PASS ? "superato" : "da-ripassare";
    return { id: ch.id, n: ch.n, title: ch.title, correct: right, total: idx.length, passed: state !== "da-ripassare", state };
  }).filter((c) => c.total > 0);
  const toReview = chapters.filter((c) => !c.passed).map((c) => c.id);
  return { grade, correct, total, verdict: verdictFor(grade), passed: isPassed(grade), chapters, toReview, allChaptersPassed: toReview.length === 0 };
}

// Argomenti con almeno un errore (per dire cosa ripassare).
export const wrongTopics = (items, results) => [...new Set(items.filter((_, i) => !results[i]).map((it) => topicById[it.topic]?.title ?? it.topic))];

export const formatGrade = (g) => (Number.isInteger(g) ? String(g) : String(g).replace(".", ","));
