import test from "node:test";
import assert from "node:assert/strict";
import * as Q from "../js/questions.mjs";
import * as E from "../js/engine.mjs";

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("1000 missioni: ogni risposta indicata come giusta è accettata", () => {
  for (let s = 1; s <= 1000; s++) {
    for (const q of Q.buildMission(mulberry(s), 8)) {
      const given = q.kind === "safe" ? q.value : q.answer;
      assert.ok(Q.checkAnswer(q, given), `seed ${s}: ${q.prompt}`);
      assert.ok(q.explain.length > 0);
    }
  }
});

test("decToBin e binToDec sono coerenti con il motore", () => {
  for (let s = 1; s <= 300; s++) {
    const d = Q.decToBin(mulberry(s));
    const n = Number(d.prompt.match(/\d+/)[0]);
    assert.equal(d.answer, E.toBin(n));
    const b = Q.binToDec(mulberry(s));
    const bin = b.prompt.match(/[01]+/)[0];
    assert.equal(b.answer, String(E.fromBin(bin)));
  }
});

test("risposte sbagliate rifiutate, zeri iniziali tollerati", () => {
  const q = { kind: "text", answer: "10111", base: 2 };
  assert.ok(Q.checkAnswer(q, "010111"));
  assert.ok(!Q.checkAnswer(q, "10110"));
  assert.ok(!Q.checkAnswer({ kind: "safe", value: 23 }, 22));
});

test("scelta multipla: la risposta giusta è fra le opzioni e le opzioni sono uniche", () => {
  for (let s = 1; s <= 500; s++) {
    for (const q of [Q.bitsFor(mulberry(s)), Q.theory(mulberry(s))]) {
      assert.ok(q.options.includes(q.answer));
      assert.equal(new Set(q.options).size, q.options.length);
    }
  }
});
