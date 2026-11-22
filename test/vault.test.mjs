import test from "node:test";
import assert from "node:assert/strict";
import * as V from "../js/vault.mjs";
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
const valueOf = (bits) => [...bits].reduce((a, b, i) => a + (b === "1" ? V.WEIGHTS[i] : 0), 0);

test("bits8, onWeights e nibbles coerenti per tutti i valori 0-255", () => {
  for (let n = 0; n <= 255; n++) {
    assert.equal(V.bits8(n).length, 8);
    assert.equal(V.onWeights(n).reduce((a, b) => a + b, 0), n);
    assert.equal(valueOf(V.bits8(n)), n);
    assert.equal(V.nibbles(V.bits8(n)).replace(" ", ""), V.bits8(n));
  }
  assert.equal(V.nibbles("01000101"), "0100 0101");
});

test("la serie: 10 domande, parte da una ruota alla volta e sale", () => {
  for (let s = 1; s <= 500; s++) {
    const m = V.buildWarmupMission(mulberry(s));
    assert.equal(m.length, 10);
    assert.deepEqual(m.slice(0, 3).map((q) => q.value), [1, 2, 3]);
    assert.ok(m.slice(0, 3).every((q) => q.kind === "safe" && q.hint));
    // difficoltà crescente: i valori in gioco non scendono di molto e l'ultimo è a 8 ruote
    const vals = m.map((q) => q.kind === "safe" ? q.value : Number(q.vault.show === "read" ? q.answer : E.fromBin(q.answer)));
    assert.ok(vals[9] >= 64 && vals[8] >= 16 && vals[6] >= 8 && vals[0] === 1);
    assert.ok(vals[3] <= 7 && vals[5] <= 15);
    for (const q of m) assert.ok(q.explain.length && q.radio && q.prompt);
  }
});

test("tipi di domanda: build, read e code, tutti con risposta corretta", () => {
  for (let s = 1; s <= 500; s++) {
    const m = V.buildWarmupMission(mulberry(s));
    const kinds = m.map((q) => (q.kind === "safe" ? "build" : q.vault.show));
    assert.deepEqual(kinds, ["build", "build", "build", "read", "build", "ruler", "build", "read", "build", "ruler"]);
    for (const q of m) {
      if (q.kind === "safe") {
        assert.ok(Q.checkAnswer(q, q.value));
        assert.ok(!Q.checkAnswer(q, q.value + 1));
        assert.match(q.prompt, new RegExp(`segna ${q.value}\\b`));
      } else if (q.vault.show === "read") {
        assert.equal(q.answer, String(valueOf(q.vault.bits)));
        assert.ok(Q.checkAnswer(q, q.answer));
        assert.ok(Q.checkAnswer(q, ` ${q.answer} `));
      } else {
        assert.equal(q.vault.bits, undefined, "nessuna ruota mostrata: niente da ricopiare");
        assert.equal(q.vault.value, E.fromBin(q.answer));
        assert.ok(Q.checkAnswer(q, V.bits8(q.vault.value)), "il codice completo con zeri iniziali è accettato");
        assert.ok(Q.checkAnswer(q, q.answer));
        assert.ok(Q.checkAnswer(q, V.nibbles(V.bits8(q.vault.value))), "anche con lo spazio tra i due gruppi da 4");
        assert.match(q.prompt, new RegExp(`segna ${q.vault.value}\\b`));
        assert.ok(!Q.checkAnswer(q, E.toBin(E.fromBin(q.answer) ^ 1)), "un solo bit sbagliato non va accettato");
      }
    }
  }
});

test("le domande read/code non rivelano la risposta nel testo", () => {
  for (let s = 1; s <= 200; s++) {
    for (const q of V.buildWarmupMission(mulberry(s))) {
      if (q.kind === "safe") continue;
      assert.ok(!q.prompt.includes(q.answer) || q.answer.length < 2, q.prompt);
      if (q.vault.show === "read") assert.doesNotMatch(q.prompt, /segna \d+/);
      if (q.vault.show === "ruler") assert.ok(!q.prompt.includes(V.bits8(q.vault.value)), "il codice non è scritto nel testo");
    }
  }
});
