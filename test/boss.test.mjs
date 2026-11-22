import test from "node:test";
import assert from "node:assert/strict";
import * as B from "../js/boss.mjs";
import * as G from "../js/progress.mjs";
import * as P from "../js/profiles.mjs";
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
const answerOf = (q) => (q.kind === "safe" ? q.value : q.answer);

test("ogni capitolo ha un caveau con nome e tre passaggi: ruote, domanda, combinazione", () => {
  for (const ch of G.CHAPTERS) {
    assert.ok(B.BOSS_NAME[ch.id], ch.id);
    const boss = B.buildBoss(mulberry(1), ch.id);
    assert.equal(boss.chapter, ch.id);
    assert.deepEqual(boss.steps.map((s) => s.label), ["Ruote", "Domanda", "Combinazione"]);
    assert.equal(boss.steps[0].q.kind, "safe");
    assert.equal(boss.steps[2].q.vault.show, "ruler");
  }
  assert.throws(() => B.buildBoss(mulberry(1), "inventato"), RangeError);
});

test("i passaggi sono difficili: ruote ≥ 64, combinazione ≥ 128", () => {
  for (let s = 1; s <= 300; s++) for (const ch of G.CHAPTERS) {
    const boss = B.buildBoss(mulberry(s), ch.id);
    assert.ok(boss.steps[0].q.value >= 64 && boss.steps[0].q.value <= 255);
    assert.ok(boss.steps[2].q.vault.value >= 128 && boss.steps[2].q.vault.value <= 255);
  }
});

test("la domanda centrale è a risposta singola (scelta o testo), con risposta giusta verificabile", () => {
  for (let s = 1; s <= 400; s++) for (const ch of G.CHAPTERS) {
    const q = B.buildBoss(mulberry(s), ch.id).steps[1].q;
    assert.ok(["choice", "text"].includes(q.kind), `${ch.id}: ${q.kind}`);
    assert.ok(Q.checkAnswer(q, answerOf(q)), `${ch.id}: ${q.prompt}`);
    assert.ok(q.explain?.length && q.prompt);
    if (q.kind === "choice") assert.ok(q.options.includes(q.answer));
  }
});

test("le tre prove accettano la risposta giusta e rifiutano un errore", () => {
  for (let s = 1; s <= 200; s++) for (const ch of G.CHAPTERS) {
    const [r, d, c] = B.buildBoss(mulberry(s), ch.id).steps.map((x) => x.q);
    assert.ok(Q.checkAnswer(r, r.value) && !Q.checkAnswer(r, r.value + 1));
    assert.ok(Q.checkAnswer(c, E.toBin(c.vault.value).padStart(8, "0")) && !Q.checkAnswer(c, E.toBin(c.vault.value ^ 1).padStart(8, "0")));
    assert.ok(Q.checkAnswer(d, answerOf(d)));
  }
});

test("operazioni: il calcolo in binario è corretto (verificato in decimale)", () => {
  let seen = new Set();
  for (let s = 1; s <= 600; s++) {
    const q = B.bossQuestion(mulberry(s), "ops");
    const m = q.prompt.match(/: ([01]+) (\S) ([01]+) /);
    const a = E.fromBin(m[1]), b = E.fromBin(m[3]);
    const want = { "+": a + b, "−": a - b, "×": a * b, ":": Math.floor(a / b) }[m[2]];
    assert.equal(E.fromBin(q.answer), want, q.prompt);
    if (m[2] === ":") assert.equal(a % b, 0, "divisione esatta");
    assert.ok(want > 0);
    seen.add(m[2]);
  }
  assert.deepEqual([...seen].sort(), ["+", ":", "×", "−"].sort());
});

test("i capitoli di teoria danno domande a scelta del capitolo giusto", () => {
  const c1 = new Set(G.chapterTopics("c1").map((t) => t.id)), c2 = new Set(G.chapterTopics("c2").map((t) => t.id));
  for (let s = 1; s <= 200; s++) {
    assert.ok(c1.has(B.bossQuestion(mulberry(s), "c1").topic));
    assert.ok(c2.has(B.bossQuestion(mulberry(s), "c2").topic));
  }
});

// ---------- stato del caveau e trofei ----------

const passedAll = (ids) => Object.fromEntries(ids.map((id) => [id, { attempts: 12, correct: 12, window: [1, 1, 1, 1, 1], level: 1, lastAt: 1, passedAt: 1 }]));
const player = (extra = {}) => ({ topics: passedAll(G.chapterTopics("ops").map((t) => t.id)), trophies: {}, ...extra });

test("vaultState: chiuso, da tentare, vinto", () => {
  const sumOf = (p) => G.summarize(p).chapters.find((c) => c.id === "ops");
  assert.equal(sumOf({ topics: {}, trophies: {} }).vault, "closed");
  assert.equal(sumOf(player()).vault, "ready");
  const almost = { topics: { ...player().topics, addizione: { attempts: 12, correct: 10, window: [1, 1, 0, 1, 1], level: 1, lastAt: 1, passedAt: 1 } }, trophies: {} };
  assert.equal(sumOf(almost).state, "superato");
  assert.equal(sumOf(almost).vault, "closed", "senza perfezione il caveau è chiuso");
  const won = sumOf(player({ trophies: { ops: 1_700_000_000_000 } }));
  assert.equal(won.vault, "won");
  assert.equal(won.trophyAt, 1_700_000_000_000);
});

test("il trofeo resta anche se il capitolo scende dopo", () => {
  const down = { topics: {}, trophies: { ops: 5 } };
  const ch = G.summarize(down).chapters.find((c) => c.id === "ops");
  assert.equal(ch.state, "da-iniziare");
  assert.equal(ch.vault, "won");
});

test("winVault: contanti e trofeo una volta sola", () => {
  let st = P.enter(P.emptyStore(), "Neri", 10).store;
  st = P.recordMission(st, "neri", "x", 100);
  const won = P.winVault(st, "neri", "ops", 1000);
  const p = P.currentPlayer(won);
  assert.deepEqual([p.cash, p.trophies], [600, { ops: 1000 }]);
  const again = P.winVault(won, "neri", "ops", 2000);
  assert.equal(again, won, "rivincere non paga due volte");
  assert.equal(P.currentPlayer(P.winVault(won, "neri", "c1", 3000)).cash, 1100);
  assert.equal(P.winVault(st, "neri", "__proto__", 5), st);
  assert.equal(P.winVault(st, "altro", "ops", 5), st);
  assert.equal(P.VAULT_REWARD, 500);
});

test("trofei: salvataggio, dati ostili e reset", () => {
  let st = P.enter(P.emptyStore(), "Neri", 10).store;
  st = P.winVault(st, "neri", "virgola", 1_770_000_000_000);
  const back = P.parseStore(P.serialize(st));
  assert.equal(P.currentPlayer(back).trophies.virgola, 1_770_000_000_000);
  assert.deepEqual(P.currentPlayer(P.resetPlayer(st, "neri")).trophies, {});
  const hostile = P.parseStore(JSON.stringify({ players: [{ name: "Ok", trophies: { ops: "x", "__proto__": 5, "a b": 1, virgola: -3, c1: 7 } }] }));
  const t = hostile.players[0].trophies;
  assert.deepEqual(Object.keys(t).sort(), ["c1", "ops", "virgola"]);
  assert.ok(Object.values(t).every((v) => v >= 1));
  assert.equal(Object.getPrototypeOf(t), Object.prototype);
});
