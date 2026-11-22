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

test("operazioni guidate: ogni passaggio concorda con un calcolo decimale indipendente", () => {
  for (let s = 1; s <= 2000; s++) {
    for (const op of ["+", "−", "×", ":"]) {
      const q = O.guidedOperation(mulberry(s), op);
      const [, a, sym, b] = q.prompt.match(/: (\d+) (\S) (\d+)/);
      const x = Number(a), y = Number(b);
      assert.equal(sym, op);
      assert.equal(q.steps[0].answer, x.toString(2));
      assert.equal(q.steps[1].answer, y.toString(2));
      const expected = { "+": x + y, "−": x - y, "×": x * y, ":": Math.floor(x / y) }[op];
      assert.ok(expected >= 0 && Number.isInteger(expected));
      assert.equal(parseInt(q.steps[2].answer, 2), expected, `${q.prompt}`);
      if (op === ":") assert.equal(parseInt(q.steps[3].answer, 2), x % y);
      assert.equal(q.steps.at(-1).answer, op === ":" ? String(x) : String(expected));
      assert.equal(q.steps.at(-1).base, 10);
    }
  }
});

test("operazioni in base 8/16: il risultato ricalcolato in decimale torna", () => {
  for (let s = 1; s <= 2000; s++) {
    for (const base of [8, 16]) {
      const q = O.baseOperation(mulberry(s), base);
      const m = q.prompt.match(/: ([0-9A-F]+) (\S) ([0-9A-F]+) /);
      const x = parseInt(m[1], base), y = parseInt(m[3], base);
      const r = { "+": x + y, "−": x - y, "×": x * y }[m[2]];
      assert.ok(r >= 0);
      assert.equal(parseInt(q.answer, base), r);
    }
  }
});

test("conversioni con raggruppamento, virgola e ordinamento", () => {
  for (let s = 1; s <= 2000; s++) {
    const g = O.groupConversion(mulberry(s));
    const m = g.prompt.match(/base (\d+) a base (\d+): (\w+)/);
    assert.equal(parseInt(g.answer, Number(m[2])), parseInt(m[3], Number(m[1])));
    const p = O.pointConversion(mulberry(s));
    assert.ok(Q.checkAnswer(p, p.answer));
    const o = O.orderMixed(mulberry(s));
    assert.equal(new Set(o.answer).size, 4); // 4 lettere distinte
  }
});

test("ordinamento: valori sempre distinti e risposta coerente", () => {
  for (let s = 1; s <= 1000; s++) {
    const o = O.orderMixed(mulberry(s));
    const items = [...o.prompt.matchAll(/(\d)\) (\w+) \(base (\d+)\)/g)];
    assert.equal(items.length, 4);
    const nums = items.map((i) => parseInt(i[2], Number(i[3])));
    assert.equal(new Set(nums).size, 4);
    const order = [...o.answer].map((L) => nums[Number(L) - 1]);
    assert.deepEqual(order, order.slice().sort((a, b) => a - b));
  }
});

test("missione operazioni: 9 domande, tutte con spiegazione", () => {
  const m = O.buildOperationsMission(mulberry(7));
  assert.equal(m.length, 9);
  for (const q of m) assert.ok(q.explain.length && q.prompt);
});
