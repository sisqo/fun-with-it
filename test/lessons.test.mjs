import test from "node:test";
import assert from "node:assert/strict";
import { LESSONS, buildLessonMission } from "../js/lessons.mjs";
import { checkAnswer } from "../js/questions.mjs";

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("ogni domanda di teoria è ben formata", () => {
  for (const [key, lesson] of Object.entries(LESSONS)) {
    assert.ok(lesson.questions.length >= 9, `quartiere ${key}: servono almeno 9 domande`);
    const prompts = lesson.questions.map((q) => q.prompt);
    assert.equal(new Set(prompts).size, prompts.length, `prompt duplicati nel quartiere ${key}`);
    for (const q of lesson.questions) {
      assert.ok(q.options.length >= 3, q.prompt);
      assert.equal(new Set(q.options).size, q.options.length, `opzioni duplicate: ${q.prompt}`);
      assert.ok(q.explain.length > 0 && q.radio.length > 0, q.prompt);
      assert.ok(!q.options.slice(1).includes(q.options[0]));
    }
  }
});

test("missioni: 8 domande diverse, una sola risposta giusta, la giusta è accettata", () => {
  for (const key of Object.keys(LESSONS)) {
    for (let s = 1; s <= 200; s++) {
      const m = buildLessonMission(mulberry(s), key);
      assert.equal(m.length, 8);
      assert.equal(new Set(m.map((q) => q.prompt)).size, 8);
      for (const q of m) {
        assert.equal(q.options.filter((o) => o === q.answer).length, 1);
        assert.ok(checkAnswer(q, q.answer));
        for (const o of q.options) if (o !== q.answer) assert.ok(!checkAnswer(q, o));
      }
    }
  }
});

test("la posizione della risposta giusta varia (le opzioni sono mescolate)", () => {
  const pos = new Set();
  for (let s = 1; s <= 100; s++) {
    for (const q of buildLessonMission(mulberry(s), 1)) pos.add(q.options.indexOf(q.answer));
  }
  assert.ok(pos.size >= 3);
});

test("fatti chiave dal libro: ordine delle fasi, ENIAC non c'è qui ma 1 MB = 1024 kB", () => {
  const l1 = LESSONS[1].questions.find((q) => /ordine delle quattro fasi/.test(q.prompt));
  assert.match(l1.options[0], /^Analisi del problema, astrazione, scomposizione, formulazione di algoritmi$/);
  const l2 = LESSONS[2].questions.find((q) => /kilobyte sono 1 megabyte/.test(q.prompt));
  assert.equal(l2.options[0], "1024");
  assert.ok(!l2.options.includes("1000"), "1000 è difendibile secondo lo standard SI");
  assert.equal(LESSONS[2].questions.find((q) => /numero intero più grande/.test(q.prompt)).options[0], "255");
  assert.equal(LESSONS[3].questions.find((q) => /Quanto vale 101/.test(q.prompt)).options[0], "5");
});

test("la risposta giusta non si indovina dalla lunghezza (distrattori dello stesso registro)", () => {
  for (const [key, lesson] of Object.entries(LESSONS)) {
    for (const q of lesson.questions) {
      const [right, ...wrong] = q.options;
      if (right.length < 25) continue;
      const longestWrong = Math.max(...wrong.map((o) => o.length));
      assert.ok(right.length <= longestWrong * 1.5, `quartiere ${key}: «${q.prompt}» giusta ${right.length} vs distrattore più lungo ${longestWrong}`);
    }
  }
});

test("testi corretti dopo la revisione: computers, battute", () => {
  const all = Object.values(LESSONS).flatMap((l) => l.questions);
  assert.ok(all.some((q) => q.prompt === "Che cosa indicava un tempo la parola inglese «computers»?"));
  const radio = all.map((q) => q.radio).join(" ");
  assert.doesNotMatch(radio, /birre|ama' e 'maa|neanche una lettera|A voi servono dieci/);
});
