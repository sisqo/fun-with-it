import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.mjs";
import * as Q from "../js/questions.mjs";
import * as O from "../js/operations.mjs";

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("validazione cifre: input non validi lanciano RangeError", () => {
  assert.throws(() => E.groupsToBin("9", 8), RangeError);
  assert.throws(() => E.groupsToBin("G", 16), RangeError);
  assert.throws(() => E.binaryPointToDecimal("1.2"), RangeError);
  assert.throws(() => E.addBinary("12", "1"), RangeError);
  assert.throws(() => E.subBinary("12", "1"), RangeError);
  assert.throws(() => E.mulBinary("12", "1"), RangeError);
  assert.throws(() => E.binToDecSteps("102"), RangeError);
  assert.throws(() => E.binToGroups("1a", 16), RangeError);
});

test("addBinary: i riporti hanno la stessa lunghezza del risultato", () => {
  assert.deepEqual(E.addBinary("1", "1"), { result: "10", carries: "10" });
  for (let a = 0; a < 70; a++) for (let b = 0; b < 70; b++) {
    const r = E.addBinary(E.toBin(a), E.toBin(b));
    assert.equal(E.fromBin(r.result), a + b);
    assert.ok(r.carries.length >= r.result.length - 1 && r.carries.length <= r.result.length);
  }
});

test("subBinary con prestiti: risultato esatto per tutte le coppie", () => {
  for (let a = 0; a < 80; a++) for (let b = 0; b <= a; b++) {
    const r = E.subBinary(E.toBin(a), E.toBin(b));
    assert.equal(E.fromBin(r.result), a - b);
    assert.equal(r.borrows.length, Math.max(E.toBin(a).length, E.toBin(b).length));
  }
  assert.throws(() => E.subBinary("1", "10"), RangeError);
  assert.equal(E.subBinary("101", "101").result, "0");
});

test("moltiplicazione: totale sommato in binario, 15x15 e 14x15", () => {
  for (const [a, b] of [[15, 15], [14, 15], [13, 15], [6, 5], [11, 7], [0, 9]]) {
    const r = E.mulBinary(E.toBin(a), E.toBin(b));
    assert.equal(E.fromBin(r.result), a * b);
    assert.equal(E.fromBin(r.partials.at(-1)), a * b);
  }
  assert.equal(E.addMany(["1", "10", "11", "100"]).result, "1010");
});

test("divisioni 17:8 e 14:3 dai compiti", () => {
  assert.deepEqual(E.divBinary(E.toBin(17), E.toBin(8)), { quotient: "10", remainder: "1" });
  assert.deepEqual(E.divBinary(E.toBin(14), E.toBin(3)), { quotient: "100", remainder: "10" });
});

test("fracToBin: nessun artefatto della virgola mobile nei passaggi", () => {
  const r = E.fracToBin("1", 12); // 0,1 è periodica
  for (const st of r.steps) {
    assert.match(st.from, /^\d+\.\d+$/);
    assert.ok(st.from.length <= 3 && st.doubled.length <= 4, `${st.from} ${st.doubled}`);
  }
  assert.equal(r.exact, false);
  assert.ok(r.periodStart >= 0, "deve riconoscere il periodo");
  assert.equal(r.bits, "00011"); // 0,1 = 0,0(0011)
  const ex = E.fracToBin("3125");
  assert.equal(ex.bits, "0101");
  assert.equal(ex.exact, true);
  assert.deepEqual(ex.steps[0], { from: "0.3125", doubled: "0.6250", bit: 0 });
  assert.equal(E.decimalToBinaryPointDetailed("0,1").exact, false);
  assert.equal(E.decimalToBinaryPointDetailed("12,3125").exact, true);
});

test("binToGroups toglie i gruppi iniziali a zero, ma ne lascia uno", () => {
  assert.equal(E.binToGroups("00011", 16).map((g) => g.digit).join(""), "3");
  assert.equal(E.binToGroups("0", 8).map((g) => g.digit).join(""), "0");
  assert.equal(E.binToGroups("11001111", 8).map((g) => g.digit).join(""), "317");
});

test("sameNumberString: .1 == 0.1, 0.10 == 0.1, ba0 == BA0", () => {
  assert.ok(E.sameNumberString(".1", "0.1"));
  assert.ok(E.sameNumberString("0.10", ".1"));
  assert.ok(E.sameNumberString("ba0", "BA0"));
  assert.ok(!E.sameNumberString("0.11", "0.1"));
});

test("passaggi binToDecSteps includono anche gli zeri", () => {
  const r = E.binToDecSteps("11010");
  assert.equal(r.all.length, 5);
  assert.equal(r.total, 26);
});

test("radio di bitsFor non dice più 'superi'", () => {
  const q = Q.bitsFor(mulberry(1));
  assert.match(q.radio, /raggiungi/);
  assert.doesNotMatch(q.radio, /superi/);
});

test("teoria: nessuna domanda ripetuta nella stessa missione", () => {
  for (let s = 1; s <= 500; s++) {
    const prompts = Q.buildMission(mulberry(s), 8).filter((q) => q.kind === "choice" && !/Quanti bit servono/.test(q.prompt)).map((q) => q.prompt);
    assert.equal(new Set(prompts).size, prompts.length, `seed ${s}`);
  }
});

test("teoria: ogni domanda ha una sola risposta giusta, unica tra le opzioni", () => {
  for (let s = 1; s <= 400; s++) {
    const q = Q.theory(mulberry(s));
    assert.equal(q.options.filter((o) => o === q.answer).length, 1);
    assert.equal(new Set(q.options).size, q.options.length);
  }
});

test("conversione con la virgola: la risposta torna ricalcolando in decimale", () => {
  for (let s = 1; s <= 1500; s++) {
    const p = O.pointConversion(mulberry(s));
    const m = p.prompt.match(/: ([\d,]+)$/);
    if (p.prompt.startsWith("Da base 10")) {
      assert.equal(E.binaryPointToDecimal(p.answer), Number(m[1].replace(",", ".")));
    } else {
      assert.equal(Number(p.answer), E.binaryPointToDecimal(m[1]));
    }
    assert.ok(p.explain.every((l) => !/\d\.\d{8,}/.test(l)), "artefatti di virgola mobile nei passaggi");
  }
});

test("operazioni guidate: la colonna espone riporti/prestiti/righe coerenti", () => {
  for (let s = 1; s <= 500; s++) {
    const add = O.guidedOperation(mulberry(s), "+");
    assert.equal(add.column.result.length - add.column.carries.length <= 1, true);
    const sub = O.guidedOperation(mulberry(s), "−");
    assert.ok(sub.column.borrows.length >= sub.column.b.length);
    const mul = O.guidedOperation(mulberry(s), "×");
    assert.ok(mul.column.rows.length >= 1 && mul.column.partials.length === mul.column.rows.length);
    const div = O.guidedOperation(mulberry(s), ":");
    assert.ok("quotient" in div.column && "remainder" in div.column);
  }
});

test("verifica vera: un risultato sbagliato nell'operazione fa 'non tornare' la verifica", () => {
  const q = O.guidedOperation(mulberry(3), "+");
  const verify = q.steps.at(-1);
  const wrong = E.toBin(E.fromBin(q.steps[2].answer) + 1);
  const bad = O.resolveStep(verify, [q.steps[0].answer, q.steps[1].answer, wrong]);
  assert.equal(bad.consistent, false);
  assert.match(bad.note, /non torna/);
  assert.equal(bad.expected, String(E.fromBin(wrong)));
  const good = O.resolveStep(verify, [q.steps[0].answer, q.steps[1].answer, q.steps[2].answer]);
  assert.equal(good.consistent, true);
});

test("verifica divisione: q × d + r con i risultati dell'utente, il resto conta", () => {
  for (let s = 1; s <= 300; s++) {
    const q = O.guidedOperation(mulberry(s), ":");
    const v = q.steps.at(-1);
    const ok = O.resolveStep(v, [null, null, q.steps[2].answer, q.steps[3].answer]);
    assert.equal(ok.consistent, true);
    const badR = O.resolveStep(v, [null, null, q.steps[2].answer, "111111"]);
    assert.equal(badR.consistent, false);
  }
});

test("divisione già in binario (compito 5): tutto coerente", () => {
  for (let s = 1; s <= 1000; s++) {
    const q = O.binaryDivision(mulberry(s));
    const [A, B] = q.prompt.match(/([01]+) : ([01]+)/).slice(1);
    const n = E.fromBin(A), d = E.fromBin(B);
    assert.equal(E.fromBin(q.steps[0].answer), Math.floor(n / d));
    assert.equal(E.fromBin(q.steps[1].answer), n % d);
    assert.equal(q.steps[2].answer, String(n));
    assert.ok(d >= 3);
  }
  assert.deepEqual(E.divSteps("111100", "110").quotient, "1010");
  assert.equal(E.divSteps("111100", "110").remainder, "0");
});

test("sottrazioni: sempre almeno un prestito, spesso minuendo potenza di 2", () => {
  let pow2 = 0;
  for (let s = 1; s <= 1000; s++) {
    const q = O.guidedOperation(mulberry(s), "−");
    assert.ok(q.column.borrows.includes("1"), q.prompt);
    const a = Number(q.prompt.match(/: (\d+)/)[1]);
    if ((a & (a - 1)) === 0) pow2++;
  }
  assert.ok(pow2 > 250, `potenze di 2: ${pow2}`);
});

test("addSteps/subSteps/divSteps ricostruiscono il risultato", () => {
  for (let a = 0; a < 40; a++) for (let b = 0; b < 40; b++) {
    const bits = E.addSteps(E.toBin(a), E.toBin(b)).map((s) => s.digit).reverse().join("");
    assert.equal(E.fromBin(bits), a + b);
    if (a >= b) {
      const sb = E.subSteps(E.toBin(a), E.toBin(b)).map((s) => s.digit).reverse().join("");
      assert.equal(E.fromBin(sb), a - b);
    }
  }
  assert.match(E.subSteps("100", "1")[0].text, /Cerco a sinistra il primo 1/);
});

test("ordinamento: risposta con separatori e senza", () => {
  const o = O.orderMixed(mulberry(5));
  const spaced = [...o.answer].join(", ");
  assert.ok(Q.checkAnswer(o, spaced));
  assert.ok(Q.checkAnswer(o, o.answer));
  assert.ok(!Q.checkAnswer(o, [...o.answer].reverse().join("")) || o.answer === [...o.answer].reverse().join(""));
});

test("verifica: caso di Rebecca 46+9, risultato sbagliato 110110 (=54)", () => {
  const step = { answer: "55", base: 10, verify: { of: 2, summary: "46 + 9 = 55" } };
  const givens = ["101110", "1001", "110110"];
  const wrote54 = O.judgeStep(step, givens, "54");
  assert.deepEqual([wrote54.ok, wrote54.star, wrote54.reward], [true, false, true]);
  assert.match(wrote54.note, /54 ≠ 46 \+ 9 = 55/);
  const wrote55 = O.judgeStep(step, givens, "55");
  assert.deepEqual([wrote55.ok, wrote55.star], [false, false]);
  assert.match(wrote55.note, /54/);
  for (const j of [wrote54, wrote55]) assert.doesNotMatch(j.headline, /Risposta giusta/);
  const other = O.judgeStep(step, givens, "7");
  assert.equal(other.star, true);
  assert.doesNotMatch(other.headline, /Risposta giusta/);
  // caso normale
  const fine = O.judgeStep(step, ["101110", "1001", "110111"], "55");
  assert.deepEqual([fine.ok, fine.star, fine.reward], [true, false, true]);
  const bad = O.judgeStep({ answer: "5", base: 10 }, [], "6");
  assert.equal(bad.star, true);
  assert.equal(bad.headline, "Risposta giusta: 5");
});

test("verifica: risultato scritto con spazi interni viene riconosciuto", () => {
  const step = { answer: "55", base: 10, verify: { of: 2, summary: "x" } };
  const r = O.resolveStep(step, [null, null, "110 110"]);
  assert.equal(r.expected, "54");
  assert.equal(r.consistent, false);
});

test("sottrazione 64−13: una sola riga per la catena, poi colonne brevi", () => {
  const st = E.subSteps(E.toBin(64), E.toBin(13));
  assert.equal(E.fromBin(st.map((s) => s.digit).reverse().join("")), 51);
  assert.match(st[0].text, /Colonna dei 1: 0 − 1 non si può/);
  assert.match(st[0].text, /colonna dei 64/);
  assert.match(st[0].text, /colonne dei 32, 16, 8, 4, 2\) diventano 1/);
  assert.equal(st.filter((s) => /Cerco a sinistra/.test(s.text)).length, 1, "una sola catena");
  assert.ok(st.every((s) => s.text.length < 260));
  assert.doesNotMatch(st.map((s) => s.text).join(" "), /\b3 −/);
});

test("sottrazione: nessun '3' nei testi, risultato giusto per tutte le coppie fino a 130", () => {
  for (let a = 0; a <= 130; a++) for (let b = 0; b <= a; b++) {
    const st = E.subSteps(E.toBin(a), E.toBin(b));
    assert.equal(E.fromBin(st.map((s) => s.digit).reverse().join("")), a - b, `${a}-${b}`);
    assert.doesNotMatch(st.map((s) => s.text).join(" "), /[2-9] − [01] − 1/);
  }
});

test("divisione lunga: prime cifre insieme, 111100 : 110 = 1010", () => {
  const r = E.divSteps("111100", "110");
  assert.equal(r.quotient, "1010");
  assert.equal(r.remainder, "0");
  assert.match(r.steps[0].text, /^Prendo le prime cifre finché 110 ci sta: 111/);
  assert.equal(r.steps.length, 4); // 111, poi 3 cifre abbassate
  assert.doesNotMatch(r.steps.map((s) => s.text).join(" "), /quoziente 0\b(?! e resto)/);
  for (let a = 0; a < 200; a++) for (let b = 1; b < 20; b++) {
    const d = E.divSteps(E.toBin(a), E.toBin(b));
    assert.equal(E.fromBin(d.quotient), Math.floor(a / b), `${a}:${b}`);
    assert.equal(E.fromBin(d.remainder), a % b, `${a}:${b}`);
  }
});

test("colonne indicate col peso e somme parziali per esteso", () => {
  const add = O.guidedOperation(mulberry(2), "+");
  assert.match(add.steps[2].explain[0], /^Colonna dei 1:/);
  const mul = O.guidedOperation(mulberry(2), "×");
  assert.match(mul.steps[2].explain.join(" "), / \+ .* = /);
});
