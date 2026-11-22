import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../js/colop.mjs";
import * as O from "../js/operations.mjs";
import * as E from "../js/engine.mjs";

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const count = (html, re) => (html.match(re) || []).length;

test("ogni riga della colonna ha esattamente cols+1 celle, per +, − e ×", () => {
  for (let s = 1; s <= 600; s++) {
    for (const op of ["+", "−", "×"]) {
      for (const solved of [true, false]) {
        const q = O.guidedOperation(mulberry(s), op);
        const html = C.colopHTML(q.column, { solved });
        const cols = Number(html.match(/--cols:(\d+)/)[1]);
        assert.equal(Number(html.match(/--tracks:(\d+)/)[1]), cols + 1, "tracks = cols + 1 intero");
        assert.equal(count(html, /<span[ >]/g) % (cols + 1), 0, `${op} ${q.prompt} solved=${solved}`);
        assert.ok(count(html, /<i class="colop__rule/g) >= 1);
      }
    }
  }
});

test("addizione: le cifre disegnate ricostruiscono operandi e risultato", () => {
  const q = O.guidedOperation(mulberry(9), "+");
  const html = C.colopHTML(q.column, { solved: true });
  const digs = [...html.matchAll(/<span class="colop__dig">(\d)<\/span>/g)].map((m) => m[1]).join("");
  assert.ok(digs.includes(q.column.a) && digs.includes(q.column.b));
  const res = [...html.matchAll(/<span class="colop__res">(\d)<\/span>/g)].map((m) => m[1]).join("");
  assert.equal(res, q.column.result);
});

test("senza soluzione non rivela risultato né riporti", () => {
  const q = O.guidedOperation(mulberry(9), "+");
  const html = C.colopHTML(q.column, { solved: false });
  assert.doesNotMatch(html, /colop__res">\d/);
  assert.doesNotMatch(html, /colop__carry">1/);
  assert.match(html, /is-blank/);
  const m = C.colopHTML(O.guidedOperation(mulberry(9), "×").column, { solved: false });
  assert.doesNotMatch(m, /is-partial/);
});

test("sottrazione 1000 − 11: valori 0 1 1 10, cifre barrate e pillola della catena", () => {
  const col = { op: "−", a: "1000", b: "11", result: "101", ...(({ values, lent, chains }) => ({ borrowed: values, lent, chains }))(E.subColumn("1000", "11")) };
  const html = C.colopHTML(col, { solved: true });
  const borrow = [...html.matchAll(/colop__carry is-borrow[^"]*">(\d+)</g)].map((m) => m[1]);
  assert.deepEqual(borrow, ["0", "1", "1", "10"]);
  assert.equal(count(html, /is-lent/g), 3);
  assert.equal(count(html, /is-chain-start/g), 1);
  assert.equal(count(html, /is-chain-end/g), 1);
  assert.equal(count(html, /is-chain[ "]/g), 4);
});

test("moltiplicazione: zeri di spostamento marcati, '+' sull'ultimo parziale", () => {
  const q = { op: "×", a: "101", b: "11", result: "1111", rows: ["101", "1010"], partials: ["101", "1111"] };
  const html = C.colopHTML(q, { solved: true });
  assert.equal(count(html, /is-shift/g), 1);
  assert.equal(count(html, /colop__op">\+/g), 1);
  assert.match(html, /colop__rule is-thin/);
});

test("la divisione non si disegna in colonna", () => {
  assert.equal(C.colopHTML({ op: ":", a: "1001", b: "11", quotient: "11", remainder: "0" }), "");
});

test("sottrazione: i valori sopra le colonne sono coerenti con le regole di Doris", () => {
  for (let a = 1; a <= 200; a++) for (let b = 1; b <= a; b++) {
    const sc = E.subColumn(E.toBin(a), E.toBin(b));
    sc.values.forEach((v, i) => {
      assert.ok(["", "0", "1", "10"].includes(v));
      if (v === "10") assert.ok(sc.chains.some((c) => c.to === i));
      if (v === "0") assert.ok(sc.lent[i]);
    });
    sc.lent.forEach((l, i) => { if (l) assert.notEqual(sc.values[i], ""); });
    if (a === b) assert.equal(sc.chains.length, 0);
  }
});

test("helper: stelle, progresso, badge e numeri con pedice", () => {
  assert.match(C.starsHTML(2), /data-level="2".*aria-label="Ricercato: 2 stelle su 5"/);
  assert.equal(count(C.starsHTML(3), /wanted__star is-on/g), 3);
  assert.match(C.starsHTML(1), /1 stella su 5/);
  assert.equal(count(C.progressHTML(2, 8), /progress__dot/g), 8);
  assert.match(C.progressHTML(2, 8), /Domanda 3 di 8/);
  assert.match(C.baseBadge(16), /base--16">HEX <b>16/);
  assert.match(C.nTag("3B", 16), /n--16">3B<sub>16/);
});

test("colonna non risolta: la larghezza non dipende dal risultato", () => {
  const sub = O.guidedOperation(mulberry(11), "−").column;
  const wide = { ...sub, result: "1".repeat(20) };
  const short = { ...sub, result: "1" };
  const cols = (c) => Number(C.colopHTML(c, { solved: false }).match(/--cols:(\d+)/)[1]);
  assert.equal(cols(wide), cols(short));
  assert.equal(cols(sub), Math.max(sub.a.length, sub.b.length));
  const add = O.guidedOperation(mulberry(11), "+").column;
  assert.equal(cols(add), Math.max(add.a.length, add.b.length) + 1);
  assert.equal(cols({ ...add, result: "1" }), cols({ ...add, result: "1".repeat(30) }));
  const html = C.colopHTML(add, { solved: false });
  assert.equal((html.match(/colop__res is-blank/g) || []).length, cols(add));
});
