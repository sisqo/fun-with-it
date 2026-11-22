import test from "node:test";
import assert from "node:assert/strict";
import * as O from "../js/operations.mjs";
import * as Q from "../js/questions.mjs";
import * as B from "../js/boss.mjs";
import * as V from "../js/vault.mjs";
import * as E from "../js/engine.mjs";

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const num = (value, base) => (/[,.]/.test(value) ? (base === 2 ? E.binaryPointToDecimal(value) : Number(value.replace(",", "."))) : parseInt(value, base));

test("conversioni: il numero mostrato, la base di partenza e quella di arrivo coincidono con la risposta attesa", () => {
  for (let s = 1; s <= 600; s++) {
    for (const q of [Q.decToBin(mulberry(s), s % 2), Q.binToDec(mulberry(s), s % 2), O.groupConversion(mulberry(s), (s % 5) / 4), O.pointConversion(mulberry(s), (s % 5) / 4)]) {
      const v = q.view;
      assert.equal(v.kind, "convert", q.prompt);
      assert.ok([2, 8, 10, 16].includes(v.from) && [2, 8, 10, 16].includes(v.to));
      assert.ok(q.prompt.includes(v.value), `il testo contiene il numero mostrato: ${q.prompt} / ${v.value}`);
      assert.equal(q.base, v.to, "la base della risposta è quella mostrata");
      const given = num(v.value, v.from);
      const want = v.point ? (v.to === 2 ? E.decimalToBinaryPoint(v.value) : String(num(q.answer, 10))) : null;
      if (v.point) {
        if (v.to === 2) assert.equal(E.binaryPointToDecimal(q.answer), given);
        else assert.equal(Number(q.answer), given);
      } else {
        assert.equal(parseInt(q.answer, v.to), given, q.prompt);
      }
      void want;
    }
  }
});

test("calcoli in altre basi: operandi, operazione e base della risposta", () => {
  for (let s = 1; s <= 800; s++) {
    for (const base of [8, 16]) {
      const q = O.baseOperation(mulberry(s), base, (s % 5) / 4);
      const v = q.view;
      assert.deepEqual([v.kind, v.base, v.to], ["calc", base, base]);
      assert.ok(q.prompt.includes(`${v.a} ${v.op} ${v.b}`));
      const a = parseInt(v.a, base), b = parseInt(v.b, base);
      const want = { "+": a + b, "−": a - b, "×": a * b }[v.op];
      assert.equal(parseInt(q.answer, base), want, q.prompt);
      assert.equal(q.base, base);
    }
  }
});

test("caveau, operazioni: la vista del calcolo è coerente (risultato o quoziente, in binario)", () => {
  for (let s = 1; s <= 600; s++) {
    const q = B.bossQuestion(mulberry(s), "ops");
    const v = q.view;
    assert.deepEqual([v.kind, v.base, v.to], ["calc", 2, 2]);
    const a = E.fromBin(v.a), b = E.fromBin(v.b);
    const want = { "+": a + b, "−": a - b, "×": a * b, ":": Math.floor(a / b) }[v.op];
    assert.equal(E.fromBin(q.answer), want);
    assert.ok(v.what === "il risultato" || v.what === "il quoziente");
    assert.equal(v.what === "il quoziente", v.op === ":");
    assert.match(q.hint, /quaderno/);
  }
});

test("ordinamento: quattro schede con valore, base e decimale; la risposta le mette in ordine crescente", () => {
  for (let s = 1; s <= 1000; s++) {
    const q = O.orderMixed(mulberry(s), (s % 5) / 4);
    const v = q.view;
    assert.equal(v.kind, "order");
    assert.equal(v.items.length, 4);
    assert.deepEqual(v.items.map((i) => i.base).sort((a, b) => a - b), [2, 8, 10, 16], "una scheda per base");
    for (const it of v.items) assert.equal(parseInt(it.value, it.base), it.dec, `${it.value} in base ${it.base}`);
    assert.equal(new Set(v.items.map((i) => i.dec)).size, 4, "valori diversi: l'ordine è unico");
    const order = [...q.answer].map((d) => v.items[Number(d) - 1].dec);
    assert.deepEqual(order, order.slice().sort((a, b) => a - b), q.prompt);
    assert.equal(q.answer.length, 4);
    // il testo lungo resta per compatibilità, ma la vista contiene tutto ciò che serve per non doverlo leggere
    for (const it of v.items) assert.ok(q.prompt.includes(it.value));
  }
});

test("cassaforte: testo breve e suggerimento a parte", () => {
  for (let s = 1; s <= 100; s++) {
    const read = V.vaultRead(mulberry(s), 100 + (s % 100));
    assert.equal(read.prompt, "Leggi la cassaforte: quanto segna il display?");
    assert.match(read.hint, /ruote accese aggiungono il loro peso/);
    const code = V.vaultCode(mulberry(s), 130 + (s % 100));
    assert.match(code.prompt, /^Il display della cassaforte segna \d+\. Scrivi la combinazione in binario, una cifra sotto ogni peso\.$/);
    assert.match(code.hint, /Parti da sinistra: se il peso ci sta in quello che resta, scrivi 1 e toglilo; se non ci sta, scrivi 0/);
    assert.ok(code.prompt.length < 110, "il testo non è più un muro");
  }
});

test("le domande senza numeri da mostrare non hanno vista (restano normali)", () => {
  assert.equal(Q.bitsFor(mulberry(1), 1).view, undefined);
  assert.equal(O.guidedOperation(mulberry(1), "+", 1).view, undefined);
  assert.equal(V.vaultBuild(mulberry(1), 5).view, undefined);
});
