import test from "node:test";
import assert from "node:assert/strict";
import * as G from "../js/progress.mjs";
import * as P from "../js/profiles.mjs";
import * as Q from "../js/questions.mjs";
import * as E from "../js/engine.mjs";
import { LESSONS } from "../js/lessons.mjs";

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const newPlayer = () => ({ topics: {} });
const stats = (window, attempts = window.length, level = 0) => ({ attempts, correct: window.reduce((a, b) => a + b, 0), window, level, lastAt: 1 });

// Gioca `n` domande con un giocatore che risponde bene con probabilità `skill`; restituisce il giocatore e lo storico.
function simulate(n, skill, seed = 1) {
  const rng = mulberry(seed), dice = mulberry(seed + 999);
  let player = newPlayer(), last = null;
  const history = [];
  for (let i = 0; i < n; i++) {
    const q = G.nextQuestion(player, rng, { last, now: 1_000_000 + i });
    const ok = dice() < skill;
    player = { topics: { ...player.topics, [q.topic]: P.nextStats(player.topics[q.topic], ok, 1_000_000 + i) } };
    history.push({ topic: q.topic, kind: q.kind, ok });
    last = q.topic;
  }
  return { player, history };
}

test("struttura: argomenti unici, capitoli validi, prerequisiti esistenti e senza cicli", () => {
  const ids = G.TOPICS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  const chapters = new Set(G.CHAPTERS.map((c) => c.id));
  for (const t of G.TOPICS) {
    assert.ok(chapters.has(t.chapter), t.id);
    for (const n of t.needs) assert.ok(ids.includes(n), `${t.id} richiede ${n}`);
  }
  // senza cicli: un ordinamento topologico li contiene tutti
  const done = new Set(); let progressed = true;
  while (progressed) { progressed = false; for (const t of G.TOPICS) if (!done.has(t.id) && t.needs.every((n) => done.has(n))) { done.add(t.id); progressed = true; } }
  assert.equal(done.size, G.TOPICS.length);
  for (const c of G.CHAPTERS) assert.ok(G.TOPICS.some((t) => t.chapter === c.id), `capitolo senza argomenti: ${c.id}`);
});

test("ogni domanda di teoria ha un argomento noto", () => {
  const known = new Set(G.TOPICS.map((t) => t.id));
  for (const l of Object.values(LESSONS)) for (const q of l.questions) assert.ok(known.has(q.topic), `${q.prompt} → ${q.topic}`);
});

test("statusOf: soglie di superato e bocciato", () => {
  assert.equal(G.statusOf(undefined), "non-toccato");
  assert.equal(G.statusOf(stats([], 0)), "non-toccato");
  assert.equal(G.statusOf(stats([1])), "toccato");
  assert.equal(G.statusOf(stats([0, 0])), "toccato", "con sole 2 domande non si boccia");
  assert.equal(G.statusOf(stats([0, 0, 1])), "bocciato");
  assert.equal(G.statusOf(stats([0, 0, 0])), "bocciato");
  assert.equal(G.statusOf(stats([1, 0, 1])), "toccato");
  assert.equal(G.statusOf(stats([1, 1, 1])), "toccato", "con 3 domande non si supera");
  assert.equal(G.statusOf(stats([1, 1, 1, 1])), "superato");
  assert.equal(G.statusOf(stats([1, 1, 1, 0, 1])), "superato");
  assert.equal(G.statusOf(stats([1, 0, 1, 1, 0])), "toccato");
  assert.equal(G.statusOf(stats([1, 1, 0, 0, 0])), "bocciato");
  assert.equal(G.statusOf(stats([0, 1, 1, 1, 1], 9)), "superato", "ci si riprende: contano le ultime 5");
});

test("uno stato può cambiare nel tempo: bocciato → superato", () => {
  let s;
  for (const ok of [false, false, false]) s = P.nextStats(s, ok);
  assert.equal(G.statusOf(s), "bocciato");
  for (let i = 0; i < 5; i++) s = P.nextStats(s, true);
  assert.equal(G.statusOf(s), "superato");
  assert.equal(s.attempts, 8);
});

test("riscaldamento: le prime 6 domande sono sempre casseforti, in ordine di difficoltà", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const rng = mulberry(seed);
    let player = newPlayer();
    const qs = [];
    for (let i = 0; i < 6; i++) {
      const q = G.nextQuestion(player, rng);
      assert.equal(q.topic, "cassaforte");
      qs.push(q);
      player = { topics: { cassaforte: P.nextStats(player.topics.cassaforte, true) } };
    }
    assert.deepEqual(qs.slice(0, 3).map((q) => q.value), [1, 2, 3]);
    assert.equal(qs[3].vault.show, "read");
    assert.equal(qs[5].vault.show, "ruler");
  }
});

test("dopo il riscaldamento si aprono solo gli argomenti senza prerequisiti, poi via via gli altri", () => {
  const afterWarm = { topics: { cassaforte: stats([1, 1, 1, 1, 1, 1]) } };
  const open = G.TOPICS.filter((t) => G.isUnlocked(t, afterWarm.topics)).map((t) => t.id).sort();
  assert.deepEqual(open, ["bin-dec", "bit-byte", "cassaforte", "dati-informazioni", "dec-bin", "istruzioni-robot", "sistemi-posizionali"]);
  const seen = new Set();
  for (let s = 1; s <= 300; s++) seen.add(G.pickTopic(afterWarm, mulberry(s)));
  for (const id of seen) assert.ok(open.includes(id), `scelto un argomento bloccato: ${id}`);
  assert.ok(seen.size >= 4, "li alterna");
  const add = G.topicById.addizione;
  const both = (a, b) => ({ "dec-bin": a, "bin-dec": b });
  assert.ok(!G.isUnlocked(add, both(stats([1, 1]), stats([1, 1, 1]))), "2 domande non bastano per sbloccare");
  assert.ok(G.isUnlocked(add, both(stats([1, 1, 1]), stats([1, 1, 1]))));
  assert.ok(!G.isUnlocked(add, both(stats([0, 0, 0]), stats([1, 1, 1]))), "un prerequisito bocciato blocca");
  assert.ok(G.isUnlocked(add, both(stats([0, 0, 0, 1, 1, 1], 6), stats([1, 1, 1]))), "si riapre quando recupera");
});

test("mai un argomento bloccato, qualunque sia lo storico (fuzz)", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { history, player } = simulate(150, 0.4 + (seed % 6) / 10, seed);
    let p = newPlayer();
    for (const h of history) {
      const t = G.topicById[h.topic];
      assert.ok(G.isUnlocked(t, p.topics) || (h.topic === "cassaforte"), `${h.topic} bloccato`);
      p = { topics: { ...p.topics, [h.topic]: P.nextStats(p.topics[h.topic], h.ok) } };
    }
    assert.ok(Object.keys(player.topics).every((id) => G.topicById[id]));
  }
});

test("pesi: i bocciati tornano più spesso, i superati meno, le operazioni pesano di più", () => {
  const base = stats([1, 1], 2);
  const w = (id, st, opts) => G.topicWeight(G.topicById[id], st, opts);
  assert.ok(w("bit-byte", stats([0, 0, 0])) > w("bit-byte", base), "bocciato > toccato");
  assert.ok(w("bit-byte", base) > w("bit-byte", stats([1, 1, 1, 1])), "toccato > superato");
  assert.ok(w("bit-byte", undefined) > w("bit-byte", stats([1, 1, 1, 1])), "nuovo > superato");
  assert.ok(w("addizione", base) > w("bit-byte", base), "focus sulle operazioni");
  assert.ok(w("dec-bin", base) > w("bit-byte", base), "gli esercizi numerici pesano più della teoria");
  assert.ok(w("bit-byte", base, { last: "bit-byte" }) < w("bit-byte", base), "evita lo stesso argomento di fila");
  const old = { ...stats([1, 1, 1, 1]), lastAt: 1 };
  assert.ok(w("bit-byte", old, { now: 1 + 8 * 86_400_000 }) > w("bit-byte", old, { now: 2 }), "ripasso dopo una settimana");
});

test("non propone due volte di fila lo stesso argomento quasi mai", () => {
  const { history } = simulate(400, 0.75, 7);
  let same = 0;
  for (let i = 1; i < history.length; i++) if (history[i].topic === history[i - 1].topic && history[i].topic !== "cassaforte") same++;
  assert.ok(same < history.length * 0.12, `ripetizioni consecutive: ${same}`);
});

test("giocatore bravo: copre tutti gli argomenti e li supera", () => {
  const { player } = simulate(700, 1, 3);
  const sum = G.summarize(player);
  assert.equal(sum.counts.untouched, 0, "tutti toccati");
  assert.ok(sum.counts.passed >= sum.counts.total - 2, JSON.stringify(sum.counts));
  assert.equal(sum.counts.failed, 0);
  assert.ok(sum.chapters.every((c) => c.covered));
});

test("giocatore in difficoltà: pochi argomenti sbloccati e molti bocciati, nessuno superato di troppo", () => {
  const { player } = simulate(300, 0.1, 5);
  const sum = G.summarize(player);
  assert.ok(sum.counts.failed >= 1);
  assert.ok(sum.counts.untouched >= 8, `non apre il resto del programma: ${JSON.stringify(sum.counts)}`);
  assert.ok(sum.counts.passed <= 2);
  const ops = sum.rows.filter((r) => r.chapter === "ops");
  assert.ok(ops.every((r) => r.status === "non-toccato"), "le operazioni restano chiuse finché non si capiscono i bit");
});

test("giocatore medio (70%): copre gran parte del programma senza bloccarsi", () => {
  const { player } = simulate(600, 0.7, 11);
  const sum = G.summarize(player);
  assert.ok(sum.counts.touched >= 14, JSON.stringify(sum.counts));
  assert.ok(sum.counts.passed >= 3);
});

test("la difficoltà segue il giocatore: livello basso = numeri piccoli, livello alto = valori dei compiti", () => {
  const at = (id, level, seed) => G.buildQuestion(id, mulberry(seed), { topics: { [id]: stats([1, 1], 2, level) } });
  const nums = (q) => [...q.prompt.split(": ")[1].matchAll(/\d+/g)].map((m) => Number(m[0]));
  let easyMax = 0, hardMax = 0, chain256 = false, mul15 = false, add41 = false;
  for (let s = 1; s <= 600; s++) {
    easyMax = Math.max(easyMax, ...nums(at("addizione", 0, s)));
    const hard = nums(at("addizione", 1, s));
    hardMax = Math.max(hardMax, ...hard);
    if (hard[0] > 40 && hard[1] > 40) add41 = true;
    const sub = nums(at("sottrazione", 1, s));
    if (sub[0] === 256 || sub[0] === 128) chain256 = at("sottrazione", 1, s).column.borrows.includes("1") || chain256;
    const mul = nums(at("moltiplicazione", 1, s));
    if (mul[0] >= 14 && mul[1] >= 14) mul15 = true;
  }
  assert.ok(easyMax <= 12, `livello 0: ${easyMax}`);
  assert.ok(hardMax >= 55);
  assert.ok(add41, "a livello alto compaiono addizioni come 41+29");
  assert.ok(chain256, "a livello alto compaiono sottrazioni come 256−x con prestito a catena");
  assert.ok(mul15, "a livello alto compare 15×15");
});

test("il livello sale con le risposte giuste e scende con gli errori, restando tra 0 e 1", () => {
  let s;
  for (let i = 0; i < 20; i++) s = P.nextStats(s, true);
  assert.equal(s.level, 1);
  for (let i = 0; i < 20; i++) s = P.nextStats(s, false);
  assert.equal(s.level, 0);
  assert.ok(P.nextStats(undefined, true).level > 0);
  assert.ok(P.nextStats({ attempts: 5, correct: 5, window: [1, 1, 1, 1, 1], level: 0.5, lastAt: 1 }, false).level < 0.5);
});

test("ogni argomento produce una domanda valida con l'etichetta dell'argomento", () => {
  for (const t of G.TOPICS) {
    for (let s = 1; s <= 120; s++) {
      const player = { topics: { cassaforte: stats([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 11, (s % 10) / 10), [t.id]: stats([1, 1, 1], 3, (s % 10) / 10) } };
      const q = G.buildQuestion(t.id, mulberry(s), player);
      assert.equal(q.topic, t.id);
      assert.ok(["text", "choice", "safe", "guided"].includes(q.kind), `${t.id} ${q.kind}`);
      assert.ok(q.prompt && q.explain?.length, t.id);
      if (q.kind === "choice") assert.ok(Q.checkAnswer(q, q.answer) && q.options.includes(q.answer));
      if (q.kind === "safe") assert.ok(Q.checkAnswer(q, q.value));
      if (q.kind === "text") assert.ok(Q.checkAnswer(q, q.answer));
      if (q.kind === "guided") assert.ok(q.steps.length >= 3 && q.steps.every((st) => st.answer !== undefined));
    }
  }
});

test("allenamento su un argomento (force) e argomento sconosciuto", () => {
  assert.equal(G.pickTopic(newPlayer(), mulberry(1), { force: "divisione" }), "divisione");
  assert.throws(() => G.buildQuestion("inventato", mulberry(1), newPlayer()), RangeError);
});

test("la teoria non ripete la stessa domanda dentro la partita", () => {
  const exclude = new Set();
  const rng = mulberry(4);
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const q = G.buildQuestion("informatica-termini", rng, newPlayer(), { exclude });
    seen.push(q.prompt); exclude.add(q.prompt);
  }
  assert.equal(new Set(seen).size, 6);
});

test("summarize: capitoli coperti e superati", () => {
  const player = { topics: {
    "istruzioni-robot": stats([1, 1, 1, 1]), "dati-informazioni": stats([1, 1, 1, 1]), "algoritmo-pensiero": stats([1, 0, 1]), "informatica-termini": stats([0, 0, 0]),
    cassaforte: stats([1, 1, 1, 1, 1, 1]),
  } };
  const s = G.summarize(player);
  const c1 = s.chapters.find((c) => c.id === "c1");
  assert.deepEqual([c1.total, c1.touched, c1.passed, c1.failed, c1.covered, c1.complete], [4, 4, 2, 1, true, false]);
  const c2 = s.chapters.find((c) => c.id === "c2");
  assert.equal(c2.covered, false);
  assert.deepEqual([s.counts.passed, s.counts.failed], [3, 1]);
  assert.equal(s.counts.total, G.TOPICS.length);
  assert.equal(s.counts.untouched + s.counts.touched, s.counts.total);
});

test("il riepilogo di un giocatore nuovo è tutto da toccare", () => {
  const s = G.summarize(newPlayer());
  assert.equal(s.counts.untouched, G.TOPICS.length);
  assert.ok(s.chapters.every((c) => !c.covered && c.passed === 0));
});

test("le statistiche si salvano e rileggono: gli argomenti sopravvivono al localStorage", () => {
  let st = P.enter(P.emptyStore(), "Neri").store;
  for (const ok of [true, true, false, true]) st = P.recordResult(st, "neri", "addizione", ok);
  const back = P.currentPlayer(P.parseStore(P.serialize(st)));
  assert.equal(back.topics.addizione.attempts, 4);
  assert.deepEqual(back.topics.addizione.window, [1, 1, 0, 1]);
  assert.equal(G.statusOf(back.topics.addizione), "toccato");
  assert.equal(P.recordResult(st, "neri", "__proto__", true), st, "id non valido ignorato");
  assert.equal(P.currentPlayer(P.resetPlayer(st, "neri")).topics.addizione, undefined, "il reset azzera anche gli argomenti");
});

test("E è usabile accanto al modulo (sanity)", () => { assert.equal(E.toBin(5), "101"); });

test("ritmo: la teoria non prende il sopravvento e le operazioni arrivano presto", () => {
  const { history } = simulate(120, 1, 9);
  const first40 = history.slice(0, 40);
  const theory = first40.filter((h) => h.kind === "choice").length;
  assert.ok(theory <= 22, `teoria nelle prime 40: ${theory}`);
  const firstOp = history.findIndex((h) => ["addizione", "sottrazione", "moltiplicazione", "divisione", "ott-esa", "ops-basi"].includes(h.topic));
  assert.ok(firstOp >= 0 && firstOp < 45, `prima operazione alla domanda ${firstOp + 1}`);
  const ops = history.filter((h) => G.topicById[h.topic]?.focus).length;
  assert.ok(ops >= 25, `operazioni e basi nelle prime 120: ${ops}`);
});
