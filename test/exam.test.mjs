import test from "node:test";
import assert from "node:assert/strict";
import * as X from "../js/exam.mjs";
import { checkAnswer } from "../js/questions.mjs";
import { CHAPTERS } from "../js/progress.mjs";

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("l'esame ha 24 domande a risposta finale, in ordine di capitolo, tutte i capitoli coperti", () => {
  for (let s = 1; s <= 200; s++) {
    const ex = X.buildExam(mulberry(s));
    assert.equal(ex.length, 24);
    assert.deepEqual([...new Set(ex.map((e) => e.chapter))], CHAPTERS.map((c) => c.id));
    assert.equal(new Set(ex.map((e) => e.q.prompt)).size, 24, "nessuna domanda ripetuta");
    for (const it of ex) {
      assert.notEqual(it.q.kind, "guided", `${it.q.prompt}: niente passaggi guidati`);
      assert.ok(it.q.explain?.length, it.q.prompt);
      if (it.q.kind === "safe") assert.ok(checkAnswer(it.q, it.q.value));
      else if (it.q.view?.kind === "order") assert.ok(checkAnswer(it.q, it.q.answer));
      else assert.ok(checkAnswer(it.q, it.q.answer), `${it.q.prompt} → ${it.q.answer}`);
    }
  }
});

test("le operazioni: il risultato finale è corretto", () => {
  for (let s = 1; s <= 200; s++) {
    for (const it of X.buildExam(mulberry(s)).filter((e) => e.chapter === "ops")) {
      const v = it.q.view;
      const [a, b] = [parseInt(v.a, 2), parseInt(v.b, 2)];
      const want = { "+": a + b, "−": a - b, "×": a * b, ":": Math.floor(a / b) }[v.op];
      assert.equal(parseInt(it.q.answer, 2), want, it.q.prompt);
    }
  }
});

test("voto in decimi a mezzi punti e giudizio", () => {
  assert.equal(X.gradeFor(24, 24), 10);
  assert.equal(X.gradeFor(0, 24), 0);
  assert.equal(X.gradeFor(18, 24), 7.5);
  assert.equal(X.gradeFor(14, 24), 6);
  assert.equal(X.gradeFor(13, 24), 5.5);
  assert.equal(X.formatGrade(7.5), "7,5");
  assert.equal(X.formatGrade(8), "8");
  assert.equal(X.verdictFor(6), "Sufficiente");
  assert.equal(X.verdictFor(5.5), "Quasi sufficiente");
  assert.equal(X.verdictFor(9.5), "Ottimo");
  assert.ok(X.isPassed(6) && !X.isPassed(5.5));
});

test("gradeExam: esito per capitolo, soglia 60%, da ripassare", () => {
  const ex = X.buildExam(mulberry(3));
  const all = X.gradeExam(ex, ex.map(() => true));
  assert.equal(all.grade, 10);
  assert.ok(all.passed && all.allChaptersPassed && all.chapters.every((c) => c.state === "perfetto"));
  const none = X.gradeExam(ex, ex.map(() => false));
  assert.equal(none.grade, 0);
  assert.ok(!none.passed && none.toReview.length === 7);
  // sbaglio tutte le operazioni (5): capitolo ops da ripassare, voto 19/24 ≈ 8
  const res = ex.map((e) => e.chapter !== "ops");
  const g = X.gradeExam(ex, res);
  assert.equal(g.correct, 19);
  assert.deepEqual(g.toReview, ["ops"]);
  assert.ok(g.passed && !g.allChaptersPassed);
  // 3 su 5 nelle operazioni: basta (60%)
  let k = 0;
  const g2 = X.gradeExam(ex, ex.map((e) => (e.chapter === "ops" ? k++ < 3 : true)));
  assert.equal(g2.chapters.find((c) => c.id === "ops").state, "superato");
});

test("wrongTopics elenca gli argomenti sbagliati una volta sola", () => {
  const ex = X.buildExam(mulberry(5));
  const t = X.wrongTopics(ex, ex.map((e) => e.topic !== "bin-dec"));
  assert.deepEqual(t, ["Da binario a decimale"]);
});

import * as P from "../js/profiles.mjs";

test("recordExam: salva, tiene gli ultimi 10, sanifica, il reset li cancella", () => {
  let st = P.enter(P.emptyStore(), "Neri", 1).store;
  const key = st.current;
  const ex = X.buildExam(mulberry(1));
  const g = X.gradeExam(ex, ex.map((_, i) => i % 2 === 0));
  for (let i = 0; i < 12; i++) st = P.recordExam(st, key, g, 1000 + i);
  const p = P.currentPlayer(st);
  assert.equal(p.exams.length, 10);
  assert.equal(p.exams.at(-1).at, 1011);
  assert.equal(p.exams[0].grade, g.grade);
  assert.deepEqual(p.exams[0].chapters.ops, [g.chapters.find((c) => c.id === "ops").correct, 5]);
  // sopravvive al salvataggio e ai dati sporchi
  const back = P.currentPlayer(P.parseStore(P.serialize(st)));
  assert.deepEqual(back.exams, p.exams);
  const dirty = P.parseStore(JSON.stringify({ current: "neri", players: [{ name: "Neri", exams: [null, { total: 0 }, { total: 24, correct: 99, grade: 99, at: 5, chapters: { ops: [9, 5], "BAD!": [1, 1] } }] }] }));
  const e = P.currentPlayer(dirty).exams;
  assert.equal(e.length, 1);
  assert.deepEqual([e[0].correct, e[0].grade, e[0].chapters], [24, 10, { ops: [5, 5] }]);
  assert.deepEqual(P.currentPlayer(P.resetPlayer(st, key)).exams, []);
});
