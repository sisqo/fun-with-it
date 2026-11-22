import test from "node:test";
import assert from "node:assert/strict";
import * as B from "../js/boss.mjs";
import * as G from "../js/progress.mjs";
import * as P from "../js/profiles.mjs";
import * as Q from "../js/questions.mjs";
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
const answerOf = (q) => (q.kind === "safe" ? q.value : q.kind === "multi" ? q.parts.map((p) => p.answer) : q.answer);

test("ogni capitolo ha un caveau con nome, tre passaggi e tre tentativi", () => {
  for (const ch of G.CHAPTERS) {
    assert.ok(B.BOSS_NAME[ch.id], ch.id);
    const boss = B.buildBoss(mulberry(1), ch.id);
    assert.equal(boss.chapter, ch.id);
    assert.equal(boss.left, 3);
    assert.equal(B.BOSS_ATTEMPTS, 3);
    assert.deepEqual(boss.steps.map((s) => s.label), ["Ruote", "Domanda", "Combinazione"]);
    assert.equal(boss.steps[0].q.kind, "safe");
    assert.equal(boss.steps[2].q.vault.show, "ruler");
  }
  assert.throws(() => B.buildBoss(mulberry(1), "inventato"), RangeError);
});

test("passaggio 1: ruote A DISPLAY COPERTO, difficili, con spiegazione del metodo", () => {
  for (let s = 1; s <= 300; s++) {
    const q = B.blindVault(mulberry(s));
    assert.equal(q.blind, true, "il display non deve mostrare la somma in tempo reale");
    assert.ok(q.value >= 64 && q.value <= 255);
    assert.match(q.prompt, new RegExp(`fare ${q.value}\\.`));
    assert.match(q.prompt, /Il display resta spento/);
    assert.doesNotMatch(q.prompt, /finché il display segna/, "non dice di guardare il display");
    assert.ok(Q.checkAnswer(q, q.value) && !Q.checkAnswer(q, q.value + 1));
    assert.ok(q.explain.length >= 2);
  }
  assert.equal(B.buildBoss(mulberry(2), "ops").steps[0].q.blind, true);
});

test("la combinazione (passaggio 3) è sempre ≥ 128 e senza ruote da ricopiare", () => {
  for (let s = 1; s <= 200; s++) for (const ch of G.CHAPTERS) {
    const q = B.buildBoss(mulberry(s), ch.id).steps[2].q;
    assert.ok(q.vault.value >= 128 && q.vault.value <= 255);
    assert.equal(q.vault.bits, undefined);
  }
});

test("passaggio 2: risposta singola oppure, nei capitoli di teoria, DUE domande da azzeccare", () => {
  for (let s = 1; s <= 400; s++) for (const ch of G.CHAPTERS) {
    const q = B.buildBoss(mulberry(s), ch.id).steps[1].q;
    if (ch.id === "c1" || ch.id === "c2") {
      assert.equal(q.kind, "multi", ch.id);
      assert.equal(q.parts.length, 2);
      assert.notEqual(q.parts[0].prompt, q.parts[1].prompt, "due domande diverse");
      assert.ok(q.parts.every((p) => p.kind === "choice" && p.options.includes(p.answer)));
      assert.notEqual(q.parts[0].topic, q.parts[1].topic, "da argomenti diversi del capitolo");
      assert.ok(B.bossCheck(q, answerOf(q)));
    } else {
      assert.ok(["choice", "text"].includes(q.kind), `${ch.id}: ${q.kind}`);
      assert.ok(B.bossCheck(q, answerOf(q)), `${ch.id}: ${q.prompt}`);
    }
    assert.ok(q.explain?.length && q.prompt);
  }
});

test("le due domande di teoria: servono tutte e due giuste", () => {
  const q = B.bossQuestion(mulberry(5), "c1");
  const [a, b] = q.parts;
  const wrongA = a.options.find((o) => o !== a.answer), wrongB = b.options.find((o) => o !== b.answer);
  assert.equal(B.bossCheck(q, [a.answer, b.answer]), true);
  assert.equal(B.bossCheck(q, [wrongA, b.answer]), false);
  assert.equal(B.bossCheck(q, [a.answer, wrongB]), false);
  assert.equal(B.bossCheck(q, [wrongA, wrongB]), false);
  assert.equal(B.bossCheck(q, [a.answer]), false, "ne manca una");
  assert.equal(B.bossCheck(q, a.answer), false);
  // indovinando a caso, la probabilità di passare è bassa (circa 1/9)
  let pass = 0;
  for (let s = 1; s <= 900; s++) {
    const m = B.bossQuestion(mulberry(s), "c2"); const r = mulberry(s + 77);
    if (B.bossCheck(m, m.parts.map((p) => p.options[Math.floor(r() * p.options.length)]))) pass++;
  }
  assert.ok(pass / 900 < 0.2, `indovinando passa il ${Math.round((pass / 900) * 100)}%`);
});

test("le tre prove accettano la risposta giusta e rifiutano un errore", () => {
  for (let s = 1; s <= 200; s++) for (const ch of G.CHAPTERS) {
    const [r, d, c] = B.buildBoss(mulberry(s), ch.id).steps.map((x) => x.q);
    assert.ok(B.bossCheck(r, r.value) && !B.bossCheck(r, r.value + 1));
    assert.ok(B.bossCheck(c, V.bits8(c.vault.value)) && !B.bossCheck(c, V.bits8(c.vault.value ^ 1)));
    assert.ok(B.bossCheck(d, answerOf(d)));
  }
});

test("bossShown: la risposta giusta da mostrare dopo l'errore", () => {
  const boss = B.buildBoss(mulberry(3), "ops");
  assert.equal(B.bossShown(boss.steps[0].q), String(boss.steps[0].q.value));
  assert.equal(B.bossShown(boss.steps[2].q), V.bits8(boss.steps[2].q.vault.value));
  assert.equal(B.bossShown(boss.steps[1].q), boss.steps[1].q.answer);
  const c1 = B.buildBoss(mulberry(3), "c1").steps[1].q;
  assert.equal(B.bossShown(c1), `${c1.parts[0].answer} · ${c1.parts[1].answer}`);
});

test("operazioni: calcolo corretto, 'usa il quaderno', spiegazione in colonna", () => {
  const seen = new Set();
  for (let s = 1; s <= 600; s++) {
    const q = B.bossQuestion(mulberry(s), "ops");
    const m = q.prompt.match(/: ([01]+) (\S) ([01]+) /);
    const a = E.fromBin(m[1]), b = E.fromBin(m[3]);
    const want = { "+": a + b, "−": a - b, "×": a * b, ":": Math.floor(a / b) }[m[2]];
    assert.equal(E.fromBin(q.answer), want, q.prompt);
    if (m[2] === ":") assert.equal(a % b, 0);
    assert.match(q.prompt, /Usa il quaderno: fai l'operazione in colonna\./);
    // la spiegazione non passa solo dal decimale: ci sono i passaggi dell'operazione
    assert.ok(q.explain.length >= 4, `${m[2]}: ${q.explain.length} righe`);
    assert.ok(q.explain.some((l) => /colonna|Colonna|Righe|Prendo le prime cifre|Abbasso|Somme/.test(l)), q.explain.join(" | "));
    assert.match(q.explain.at(-1), /^Risultato: /);
    seen.add(m[2]);
  }
  assert.deepEqual([...seen].sort(), ["+", ":", "×", "−"].sort());
});

test("stepQuestion: dopo un errore il passaggio si ripete con una domanda nuova", () => {
  const rng = mulberry(11);
  const first = B.stepQuestion(rng, "ops", 1);
  let different = 0;
  for (let i = 0; i < 20; i++) if (B.stepQuestion(rng, "ops", 1).prompt !== first.prompt) different++;
  assert.ok(different >= 18);
  assert.equal(B.stepQuestion(rng, "warm", 0).blind, true);
  assert.equal(B.stepQuestion(rng, "warm", 2).vault.show, "ruler");
});

// ---------- stato del caveau, premi e trofei ----------

const passedAll = (ids) => Object.fromEntries(ids.map((id) => [id, { attempts: 12, correct: 12, window: [1, 1, 1, 1, 1], level: 1, lastAt: 1, passedAt: 1 }]));
const player = (extra = {}) => ({ topics: passedAll(G.chapterTopics("ops").map((t) => t.id)), trophies: {}, vaultsOpened: {}, ...extra });
const sumOf = (p) => G.summarize(p).chapters.find((c) => c.id === "ops");

test("vaultState: chiuso, da tentare, vinto", () => {
  assert.equal(sumOf({ topics: {}, trophies: {}, vaultsOpened: {} }).vault, "closed");
  assert.equal(sumOf(player()).vault, "ready");
  const almost = { topics: { ...player().topics, addizione: { attempts: 12, correct: 10, window: [1, 1, 0, 1, 1], level: 1, lastAt: 1, passedAt: 1 } }, trophies: {}, vaultsOpened: {} };
  assert.equal(sumOf(almost).state, "superato");
  assert.equal(sumOf(almost).vault, "closed", "senza perfezione e senza essersi mai aperto il caveau è chiuso");
  const won = sumOf(player({ trophies: { ops: 1_700_000_000_000 } }));
  assert.equal(won.vault, "won");
  assert.equal(won.trophyAt, 1_700_000_000_000);
});

test("il caveau aperto RESTA da tentare anche se il capitolo perde la perfezione (Rebecca, punto 4)", () => {
  const dropped = { topics: { ...player().topics, addizione: { attempts: 12, correct: 10, window: [1, 1, 0, 1, 1], level: 1, lastAt: 1, passedAt: 1 } }, trophies: {}, vaultsOpened: { ops: 123 } };
  assert.equal(sumOf(dropped).state, "superato");
  assert.equal(sumOf(dropped).vault, "ready", "una sola risposta sbagliata non richiude la porta");
  const gone = { topics: {}, trophies: {}, vaultsOpened: { ops: 123 } };
  assert.equal(sumOf(gone).vault, "ready");
  assert.equal(sumOf({ ...gone, trophies: { ops: 5 } }).vault, "won", "vinto vince su aperto");
});

test("syncVaults ricorda il caveau appena un capitolo diventa perfetto, e non cambia lo store se non serve", () => {
  let st = P.enter(P.emptyStore(), "Neri", 10).store;
  assert.equal(G.syncVaults(st, "neri", 20), st, "niente di perfetto: stesso oggetto");
  // porta il capitolo operazioni alla perfezione scrivendo le statistiche
  const full = JSON.parse(P.serialize(st));
  full.players[0].topics = passedAll(G.chapterTopics("ops").map((t) => t.id));
  st = P.parseStore(JSON.stringify(full));
  const synced = G.syncVaults(st, "neri", 99);
  assert.equal(P.currentPlayer(synced).vaultsOpened.ops, 99);
  assert.equal(G.syncVaults(synced, "neri", 200), synced, "già registrato: stesso oggetto");
  assert.equal(P.currentPlayer(G.syncVaults(synced, "neri", 200)).vaultsOpened.ops, 99, "la data della prima volta non cambia");
  // poi la perfezione cala: il caveau resta
  const dropped = JSON.parse(P.serialize(synced));
  dropped.players[0].topics.addizione.window = [1, 1, 0, 1, 1];
  const after = P.parseStore(JSON.stringify(dropped));
  assert.equal(G.summarize(P.currentPlayer(after)).chapters.find((c) => c.id === "ops").vault, "ready");
});

test("il trofeo resta anche se il capitolo scende dopo", () => {
  const ch = G.summarize({ topics: {}, trophies: { ops: 5 }, vaultsOpened: {} }).chapters.find((c) => c.id === "ops");
  assert.equal(ch.state, "da-iniziare");
  assert.equal(ch.vault, "won");
});

test("premi: crescono con il capitolo e una vittoria vale più di una partita normale", () => {
  assert.deepEqual(P.VAULT_REWARDS, { warm: 1000, c1: 1500, c2: 1500, conv: 2000, ops: 3000, basi: 2500, virgola: 2500 });
  for (const ch of G.CHAPTERS) assert.ok(P.vaultReward(ch.id) >= 1000, ch.id);
  assert.ok(P.vaultReward("ops") > P.vaultReward("warm"), "crescente con il capitolo");
  assert.equal(P.vaultReward("inventato"), 1000);
  // una partita di 10 domande semplici porta al massimo $ 1.000; il caveau non vale meno
  assert.ok(P.vaultReward("warm") >= 10 * 100);
});

test("winVault: contanti e trofeo una volta sola, con il premio del capitolo", () => {
  let st = P.enter(P.emptyStore(), "Neri", 10).store;
  st = P.recordMission(st, "neri", "x", 100);
  const won = P.winVault(st, "neri", "ops", 1000);
  const p = P.currentPlayer(won);
  assert.deepEqual([p.cash, p.trophies], [3100, { ops: 1000 }]);
  assert.equal(P.winVault(won, "neri", "ops", 2000), won, "rivincere non paga due volte");
  assert.equal(P.currentPlayer(P.winVault(won, "neri", "warm", 3000)).cash, 4100);
  assert.equal(P.winVault(st, "neri", "__proto__", 5), st);
  assert.equal(P.winVault(st, "altro", "ops", 5), st);
});

test("markVaultOpened: una sola volta, mai dopo il trofeo, id non valido ignorato", () => {
  let st = P.enter(P.emptyStore(), "Neri", 10).store;
  const a = P.markVaultOpened(st, "neri", "ops", 100);
  assert.equal(P.currentPlayer(a).vaultsOpened.ops, 100);
  assert.equal(P.markVaultOpened(a, "neri", "ops", 999), a);
  assert.equal(P.markVaultOpened(P.winVault(st, "neri", "ops", 5), "neri", "ops", 9).players[0].vaultsOpened.ops, undefined);
  assert.equal(P.markVaultOpened(st, "neri", "__proto__", 5), st);
  assert.equal(P.markVaultOpened(st, "altro", "ops", 5), st);
});

test("trofei e caveau aperti: salvataggio, dati ostili e reset", () => {
  let st = P.enter(P.emptyStore(), "Neri", 10).store;
  st = P.winVault(st, "neri", "virgola", 1_770_000_000_000);
  st = P.markVaultOpened(st, "neri", "ops", 1_771_000_000_000);
  const back = P.currentPlayer(P.parseStore(P.serialize(st)));
  assert.equal(back.trophies.virgola, 1_770_000_000_000);
  assert.equal(back.vaultsOpened.ops, 1_771_000_000_000);
  const reset = P.currentPlayer(P.resetPlayer(st, "neri"));
  assert.deepEqual([reset.trophies, reset.vaultsOpened], [{}, {}]);
  const hostile = P.parseStore(JSON.stringify({ players: [{ name: "Ok", trophies: { ops: "x", "__proto__": 5, "a b": 1, virgola: -3, c1: 7 }, vaultsOpened: { "__proto__": 1, basi: 4, "x y": 2 } }] }));
  assert.deepEqual(Object.keys(hostile.players[0].trophies).sort(), ["c1", "ops", "virgola"]);
  assert.deepEqual(Object.keys(hostile.players[0].vaultsOpened), ["basi"]);
  assert.equal(Object.getPrototypeOf(hostile.players[0].vaultsOpened), Object.prototype);
});
