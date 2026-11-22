import test from "node:test";
import assert from "node:assert/strict";
import * as O from "../js/operations.mjs";
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
const TS = [0, 0.125, 0.25, 0.5, 0.75, 1];
const nums = (prompt) => [...prompt.matchAll(/\d+/g)].map((m) => Number(m[0]));

test("a ogni livello di difficoltà tutte le risposte restano corrette", () => {
  for (const t of TS) for (let s = 1; s <= 400; s++) {
    for (const op of ["+", "−", "×", ":"]) {
      const q = O.guidedOperation(mulberry(s), op, t);
      const [, a, , b] = q.prompt.match(/: (\d+) (\S) (\d+)/);
      const x = +a, y = +b;
      const want = { "+": x + y, "−": x - y, "×": x * y, ":": Math.floor(x / y) }[op];
      assert.ok(want >= 0 && y >= 1);
      assert.equal(parseInt(q.steps[2].answer, 2), want, `${q.prompt} t=${t}`);
      assert.equal(q.steps[0].answer, x.toString(2));
    }
    const d = O.binaryDivision(mulberry(s), t);
    const [A, B] = d.prompt.match(/([01]+) : ([01]+)/).slice(1);
    assert.equal(E.fromBin(d.steps[0].answer), Math.floor(E.fromBin(A) / E.fromBin(B)));
    const b = O.baseOperation(mulberry(s), s % 2 ? 8 : 16, t);
    const base = s % 2 ? 8 : 16;
    const m = b.prompt.match(/: ([0-9A-F]+) (\S) ([0-9A-F]+) /);
    const x = parseInt(m[1], base), y = parseInt(m[3], base);
    assert.equal(parseInt(b.answer, base), { "+": x + y, "−": x - y, "×": x * y }[m[2]]);
    const g = O.groupConversion(mulberry(s), t);
    const gm = g.prompt.match(/base (\d+) a base (\d+): (\w+)/);
    assert.equal(parseInt(g.answer, +gm[2]), parseInt(gm[3], +gm[1]));
    const p = O.pointConversion(mulberry(s), t);
    const pm = p.prompt.match(/: ([\d,]+)$/);
    if (p.prompt.startsWith("Da base 10")) assert.equal(E.binaryPointToDecimal(p.answer), Number(pm[1].replace(",", ".")));
    else assert.equal(Number(p.answer), E.binaryPointToDecimal(pm[1]));
    const o = O.orderMixed(mulberry(s), t);
    const items = [...o.prompt.matchAll(/(\d)\) (\w+) \(base (\d+)\)/g)].map((i) => parseInt(i[2], +i[3]));
    assert.equal(new Set(items).size, 4);
    const order = [...o.answer].map((L) => items[Number(L) - 1]);
    assert.deepEqual(order, order.slice().sort((p, q) => p - q));
    const c1 = Q.decToBin(mulberry(s), t), c2 = Q.binToDec(mulberry(s), t), c3 = Q.safeCrack(mulberry(s), t), c4 = Q.bitsFor(mulberry(s), t);
    assert.equal(c1.answer, E.toBin(nums(c1.prompt)[0]));
    assert.equal(c2.answer, String(E.fromBin(c2.prompt.match(/[01]+/)[0])));
    assert.ok(Q.checkAnswer(c3, c3.value) && Q.checkAnswer(c4, c4.answer));
  }
});

test("riscaldamento: nella missione Operazioni le prime domande hanno numeri piccoli", () => {
  for (let s = 1; s <= 500; s++) {
    const m = O.buildOperationsMission(mulberry(s));
    const first = nums(m[0].prompt); // addizione, t = 0
    assert.ok(first.every((n) => n <= 12), `${m[0].prompt}`);
    const second = nums(m[1].prompt); // sottrazione, t = 0.125: niente numeri grandi
    assert.ok(second.every((n) => n <= 15), `${m[1].prompt}`);
    const third = nums(m[2].prompt); // moltiplicazione, t = 0.25
    assert.ok(third.every((n) => n <= 7), `${m[2].prompt}`);
  }
});

test("la difficoltà sale: la media degli operandi cresce con t e arriva ai valori dei compiti", () => {
  const avg = (t) => {
    let sum = 0, n = 0, max = 0;
    for (let s = 1; s <= 600; s++) for (const op of ["+", "−", "×"]) {
      const v = nums(O.guidedOperation(mulberry(s), op, t).prompt.split(": ")[1]);
      sum += v[0] + v[1]; n += 2; max = Math.max(max, ...v);
    }
    return { mean: sum / n, max };
  };
  const [a0, a5, a1] = [avg(0), avg(0.5), avg(1)];
  assert.ok(a0.mean < a5.mean && a5.mean < a1.mean, JSON.stringify([a0, a5, a1]));
  assert.ok(a0.max <= 15);
  assert.ok(a1.max >= 200, "al massimo si arriva a 256 − …");
});

test("sottrazioni: con t alto sempre almeno un prestito, con t basso anche senza", () => {
  let noBorrow = 0;
  for (let s = 1; s <= 400; s++) {
    assert.ok(O.guidedOperation(mulberry(s), "−", 1).column.borrows.includes("1"));
    if (!O.guidedOperation(mulberry(s), "−", 0).column.borrows.includes("1")) noBorrow++;
  }
  assert.ok(noBorrow > 40, `senza prestito a t=0: ${noBorrow}`);
});

test("missione Decimale⇄Binario: parte con numeri piccoli e sale", () => {
  for (let s = 1; s <= 300; s++) {
    const m = Q.buildMission(mulberry(s), 8);
    const dec1 = nums(m[1].prompt)[0]; // decToBin a t = 1/7
    assert.ok(dec1 <= 49, `${m[1].prompt}`);
    assert.ok(m[2].value <= 84, `${m[2].prompt}`); // cassaforte a t = 2/7
  }
  let bigLate = 0;
  for (let s = 1; s <= 300; s++) if (nums(Q.buildMission(mulberry(s), 8)[5].prompt)[0] > 100) bigLate++;
  assert.ok(bigLate > 30);
});
