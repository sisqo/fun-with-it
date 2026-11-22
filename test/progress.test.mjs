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

// Gioca `n` domande con un giocatore che risponde bene ad ogni PASSAGGIO con probabilità `skill`.
// Una domanda a passaggi vale la frazione di passaggi giusti; le altre 1 o 0.
function simulate(n, skill, seed = 1) {
  const rng = mulberry(seed), dice = mulberry(seed + 999);
  let player = newPlayer(), last = null;
  const history = [];
  for (let i = 0; i < n; i++) {
    const q = G.nextQuestion(player, rng, { last, now: 1_000_000 + i });
    const units = q.kind === "guided" ? q.steps.length : 1;
    let right = 0;
    for (let u = 0; u < units; u++) if (dice() < skill) right++;
    const outcome = right / units;
    player = { topics: { ...player.topics, [q.topic]: P.nextStats(player.topics[q.topic], outcome, 1_000_000 + i) } };
    history.push({ topic: q.topic, kind: q.kind, outcome });
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

test("statusOf: soglie di superato e da ripassare", () => {
  const S = (w, att = w.length, lvl = 1) => stats(w, att, lvl);
  assert.equal(G.statusOf(undefined), "non-toccato");
  assert.equal(G.statusOf(S([], 0)), "non-toccato");
  assert.equal(G.statusOf(S([1])), "toccato");
  for (const w of [[0, 0, 1], [0, 0, 0], [0, 0, 0, 0]]) assert.equal(G.statusOf(S(w)), "toccato", `${w}: con meno di 5 domande non si boccia`);
  assert.equal(G.statusOf(S([0, 0, 0, 0, 0])), "da-ripassare");
  assert.equal(G.statusOf(S([1, 0, 0, 0, 0])), "da-ripassare");
  assert.equal(G.statusOf(S([1, 1, 0, 0, 0])), "da-ripassare");
  assert.equal(G.statusOf(S([1, 1, 0, 1, 0])), "toccato");
  assert.equal(G.statusOf(S([1, 1, 1])), "toccato", "con 3 domande non si supera");
  assert.equal(G.statusOf(S([1, 1, 1, 1])), "superato");
  assert.equal(G.statusOf(S([1, 1, 1, 0, 1])), "superato");
  assert.equal(G.statusOf(S([1, 0, 1, 1, 0])), "toccato");
  assert.equal(G.statusOf(S([0, 1, 1, 1, 1], 9)), "superato", "ci si riprende: contano le ultime 5");
  // numeri da compito: serve arrivare al livello 0,7
  assert.equal(G.statusOf(S([1, 1, 1, 1], 4, 0.5)), "toccato", "numeri ancora facili");
  assert.equal(G.statusOf(S([1, 1, 1, 1], 4, 0.7)), "superato");
  assert.equal(G.statusOf(S([1, 1, 1, 1], 4, 0.1), { theory: true }), "superato", "la teoria non ha un livello da raggiungere");
  assert.equal(G.statusFor({ topics: { addizione: S([1, 1, 1, 1], 4, 0.3) } }, "addizione"), "toccato");
  assert.equal(G.statusFor({ topics: { "dati-informazioni": S([1, 1, 1, 1], 4, 0.3) } }, "dati-informazioni"), "superato");
});

test("uno stato può cambiare nel tempo: da ripassare → superato", () => {
  let s;
  for (let i = 0; i < 5; i++) s = P.nextStats(s, false);
  assert.equal(G.statusOf(s), "da-ripassare");
  for (let i = 0; i < 5; i++) s = P.nextStats(s, true);
  assert.equal(G.statusOf(s), "superato");
  assert.equal(s.attempts, 10);
});

test("esito frazionario: giusta se ≥ 75% dei passaggi, difficoltà in proporzione", () => {
  const a = P.nextStats(undefined, 0.75);
  assert.deepEqual([a.correct, a.window], [1, [1]]);
  const b = P.nextStats(undefined, 0.5);
  assert.deepEqual([b.correct, b.window], [0, [0]]);
  assert.ok(P.nextStats({ attempts: 3, correct: 3, window: [1, 1, 1], level: 0.5, lastAt: 1 }, 0.75).level > 0.5);
  assert.ok(P.nextStats({ attempts: 3, correct: 3, window: [1, 1, 1], level: 0.5, lastAt: 1 }, 0.5).level < 0.5 + 0.12);
  const mid = P.nextStats({ attempts: 1, correct: 0, window: [0], level: 0.5, lastAt: 1 }, 0.5).level;
  assert.ok(mid > 0.5 - 0.18 && mid < 0.5 + 0.12);
  assert.equal(P.nextStats(undefined, "x").window[0], 0, "valore non valido = sbagliata");
  assert.equal(P.nextStats(undefined, 5).window[0], 1, "frazioni oltre 1 limitate a 1");
});

test("terza risposta giusta di fila: salto più grande della difficoltà", () => {
  let s;
  const levels = [];
  for (let i = 0; i < 4; i++) { s = P.nextStats(s, true); levels.push(s.level); }
  const d = levels.map((l, i) => l - (levels[i - 1] ?? 0));
  assert.ok(Math.abs(d[0] - 0.12) < 1e-9 && Math.abs(d[1] - 0.12) < 1e-9);
  assert.ok(Math.abs(d[2] - 0.2) < 1e-9, `3ª di fila: +${d[2]}`);
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
      p = { topics: { ...p.topics, [h.topic]: P.nextStats(p.topics[h.topic], h.outcome) } };
    }
    assert.ok(Object.keys(player.topics).every((id) => G.topicById[id]));
  }
});

test("pesi: i da ripassare tornano più spesso, i superati meno, le operazioni pesano di più", () => {
  const base = stats([1, 1], 2);
  const w = (id, st, opts) => G.topicWeight(G.topicById[id], st, opts);
  assert.ok(w("bit-byte", stats([0, 0, 0, 0, 0])) > w("bit-byte", base), "da ripassare > toccato");
  assert.ok(w("bit-byte", base) > w("bit-byte", stats([1, 1, 1, 1], 4, 1)), "toccato > superato");
  assert.ok(w("bit-byte", undefined) > w("bit-byte", stats([1, 1, 1, 1], 4, 1)), "nuovo > superato");
  assert.ok(w("addizione", base) > w("bit-byte", base), "focus sulle operazioni");
  assert.ok(w("dec-bin", base) > w("bit-byte", base), "gli esercizi numerici pesano più della teoria");
  assert.ok(w("bit-byte", base, { last: "bit-byte" }) < w("bit-byte", base), "evita lo stesso argomento di fila");
  const old = { ...stats([1, 1, 1, 1], 4, 1), lastAt: 1 };
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
    "istruzioni-robot": stats([1, 1, 1, 1]), "dati-informazioni": stats([1, 1, 1, 1]), "algoritmo-pensiero": stats([1, 0, 1]), "informatica-termini": stats([0, 0, 0, 0, 0]),
    cassaforte: stats([1, 1, 1, 1, 1, 1], 6, 1),
  } };
  const s = G.summarize(player);
  const c1 = s.chapters.find((c) => c.id === "c1");
  assert.deepEqual([c1.total, c1.touched, c1.passed, c1.failed, c1.covered, c1.complete], [5, 4, 2, 1, false, false]);
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

// ---------- Revisione 7: sistema adattivo ----------

function runStep(skill, n, seed) {
  const rng = mulberry(seed), dice = mulberry(seed + 999);
  let player = newPlayer(), last = null, failedAdd = false, firstSub = -1;
  for (let i = 0; i < n; i++) {
    const q = G.nextQuestion(player, rng, { last, now: 1_000_000 + i });
    const units = q.kind === "guided" ? q.steps.length : 1;
    let right = 0;
    for (let u = 0; u < units; u++) if (dice() < skill) right++;
    player = { topics: { ...player.topics, [q.topic]: P.nextStats(player.topics[q.topic], right / units, 1_000_000 + i) } };
    last = q.topic;
    if (q.topic === "sottrazione" && firstSub < 0) firstSub = i + 1;
    if (G.statusFor(player, "addizione") === "da-ripassare") failedAdd = true;
  }
  return { player, failedAdd, firstSub };
}

test("studente che sbaglia un passaggio ogni tanto (90% per passaggio) non resta mai bloccato sull'addizione", () => {
  for (let seed = 1; seed <= 25; seed++) {
    const r = runStep(0.9, 150, seed);
    assert.equal(r.failedAdd, false, `seed ${seed}: addizione da ripassare`);
    assert.ok(r.firstSub > 0 && r.firstSub <= 90, `seed ${seed}: sottrazione aperta alla domanda ${r.firstSub}`);
    assert.notEqual(G.statusFor(r.player, "addizione"), "da-ripassare");
    assert.ok(r.player.topics.addizione.attempts >= 4);
  }
});

test("85% per passaggio: le operazioni si aprono comunque, e l'addizione di solito non è mai da ripassare", () => {
  let stuck = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const r = runStep(0.85, 200, seed);
    assert.ok(r.firstSub > 0 && r.firstSub <= 120, `seed ${seed}: sottrazione alla domanda ${r.firstSub}`);
    if (r.failedAdd) stuck++;
  }
  assert.ok(stuck <= 8, `addizione da ripassare in ${stuck}/40 simulazioni`);
});

test("70% per passaggio: scivola, ma si riprende e arriva alle operazioni", () => {
  let passedAdd = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const r = runStep(0.7, 300, seed);
    assert.ok(r.firstSub > 0, `seed ${seed}: la sottrazione non si apre mai`);
    if (G.statusFor(r.player, "addizione") === "superato") passedAdd++;
  }
  assert.ok(passedAdd >= 22, `addizione superata in ${passedAdd}/30`);
});

test("10% per passaggio: resta sulle basi, le operazioni non si aprono", () => {
  for (let seed = 1; seed <= 15; seed++) {
    const r = runStep(0.1, 200, seed);
    assert.equal(r.firstSub, -1);
    assert.equal(r.player.topics.addizione, undefined);
  }
});

test("un argomento già aperto non si richiude se un prerequisito va male", () => {
  const topics = { "dec-bin": stats([0, 0, 0, 0, 0], 5), "bin-dec": stats([1, 1, 1], 3), addizione: stats([1], 1) };
  const add = G.topicById.addizione, sub = G.topicById.sottrazione;
  assert.ok(G.isUnlocked(add, topics), "addizione già iniziata: resta aperta");
  assert.ok(!G.isUnlocked(G.topicById.moltiplicazione, { ...topics, addizione: stats([0, 0, 0], 3) }), "ma quelli mai provati restano chiusi");
  assert.ok(!G.isUnlocked(sub, { ...topics, addizione: stats([1, 0, 0, 0], 4) }));
});

test("da ripassare solo dopo almeno 5 domande", () => {
  for (let n = 1; n <= 4; n++) assert.notEqual(G.statusOf(stats(Array(n).fill(0), n, 1)), "da-ripassare", `${n} domande`);
  assert.equal(G.statusOf(stats([0, 0, 0, 0, 0], 5, 1)), "da-ripassare");
});

test("l'argomento si supera solo arrivando a numeri da compito: con risposte tutte giuste servono più domande", () => {
  let s, attemptsToPass = 0;
  for (let i = 1; i <= 12 && !attemptsToPass; i++) { s = P.nextStats(s, true); if (G.statusOf(s) === "superato") attemptsToPass = i; }
  assert.ok(attemptsToPass >= 5 && attemptsToPass <= 6, `superato dopo ${attemptsToPass} domande`);
  assert.ok(s.level >= G.PASS_LEVEL);
  // la teoria invece si supera con 4 giuste
  let t, theory = 0;
  for (let i = 1; i <= 8 && !theory; i++) { t = P.nextStats(t, true); if (G.statusOf(t, { theory: true }) === "superato") theory = i; }
  assert.equal(theory, 4);
});

test("tutte le domande di teoria sono raggiungibili: ogni argomento esiste e ha prerequisiti aperti dal gioco", async () => {
  const { LESSONS, EXTRA_QUESTIONS, LEGACY_THEORY } = await import("../js/lessons.mjs");
  const { THEORY } = await import("../js/questions.mjs");
  const all = [...Object.values(LESSONS).flatMap((l) => l.questions), ...EXTRA_QUESTIONS];
  const known = new Set(G.TOPICS.map((t) => t.id));
  for (const q of all) assert.ok(known.has(q.topic), `${q.prompt} → ${q.topic}`);
  // ogni vecchia domanda di THEORY è o assegnata a un argomento o dichiarata doppione
  THEORY.forEach((_, i) => assert.ok(i in LEGACY_THEORY, `domanda ${i} di THEORY non assegnata`));
  assert.equal(THEORY.length, Object.keys(LEGACY_THEORY).length);
  // ogni argomento di teoria ha almeno 4 domande per poter essere "superato" senza ripetere
  for (const t of G.TOPICS.filter((x) => x.theory)) assert.ok(all.filter((q) => q.topic === t.id).length >= 4, `${t.id}: poche domande`);
  // raggiungibilità: partendo da zero, con risposte sempre giuste, si apre ogni argomento
  const { history } = simulate(500, 1, 21);
  const seen = new Set(history.map((h) => h.topic));
  for (const t of G.TOPICS) assert.ok(seen.has(t.id), `${t.id} non viene mai proposto`);
  assert.ok(seen.has("storia"));
});

test("storia dell'informatica: Leibniz, Boole, Shannon ed ENIAC tornano in gioco", async () => {
  const { lessonQuestionsFor } = await import("../js/lessons.mjs");
  const prompts = new Set();
  for (let s = 1; s <= 200; s++) prompts.add(lessonQuestionsFor(mulberry(s), "storia").prompt);
  assert.equal(prompts.size, 4);
  assert.ok([...prompts].some((p) => /Seicento/.test(p)) && [...prompts].some((p) => /decimale/.test(p)));
});

test("ordine dei compiti: ottale/esadecimale e virgola si aprono dopo l'addizione", () => {
  assert.ok(G.topicById["ott-esa"].needs.includes("addizione"));
  assert.ok(G.topicById.virgola.needs.includes("addizione"));
});

test("blockingNeeds: dice sempre quale prerequisito blocca, anche se non è (ancora) da ripassare", () => {
  const add = G.topicById.addizione;
  assert.deepEqual(G.blockingNeeds(add, {}), ["dec-bin", "bin-dec"]);
  assert.deepEqual(G.blockingNeeds(add, { "dec-bin": stats([1, 1, 1]), "bin-dec": stats([1, 1]) }), ["bin-dec"]);
  assert.deepEqual(G.blockingNeeds(add, { "dec-bin": stats([0, 0, 0, 1]), "bin-dec": stats([1, 1, 1]) }), ["dec-bin"], "1 giusta su 4: va male, anche se non è ancora da ripassare");
  assert.deepEqual(G.blockingNeeds(add, { "dec-bin": stats([1, 1, 1]), "bin-dec": stats([1, 1, 1]) }), []);
  for (const t of G.TOPICS) {
    const topics = {};
    assert.equal(G.isUnlocked(t, topics), G.blockingNeeds(t, topics).length === 0, t.id);
  }
});

// ---------- Capitoli ordinati e stato di ciascuno ----------

const C1 = ["istruzioni-robot", "dati-informazioni", "algoritmo-pensiero", "informatica-termini", "storia"];
const chapterOf = (player, id) => G.summarize(player).chapters.find((c) => c.id === id);
const passedAll = (ids, attempts, correct) => Object.fromEntries(ids.map((id) => [id, { attempts, correct, window: [1, 1, 1, 1, 1].slice(0, Math.min(5, attempts)), level: 1, lastAt: 1 }]));

test("capitoli: in ordine, numerati da 0 a 6, e ogni argomento sta in un solo capitolo", () => {
  assert.deepEqual(G.CHAPTERS.map((c) => c.n), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(new Set(G.CHAPTERS.map((c) => c.id)).size, G.CHAPTERS.length);
  assert.equal(G.CHAPTERS[0].id, "warm");
  const order = G.CHAPTERS.map((c) => c.id);
  assert.deepEqual(order, ["warm", "c1", "c2", "conv", "ops", "basi", "virgola"]);
  const first = (id) => G.TOPICS.findIndex((t) => t.chapter === id);
  for (let i = 1; i < order.length; i++) assert.ok(first(order[i - 1]) >= 0 && first(order[i]) >= 0);
  for (const t of G.TOPICS) assert.equal(G.CHAPTERS.filter((c) => c.id === t.chapter).length, 1, t.id);
  const sum = G.summarize({ topics: {} });
  assert.equal(sum.chapters.reduce((a, c) => a + c.total, 0), G.TOPICS.length);
  assert.deepEqual(sum.chapters.map((c) => c.total), [1, 5, 3, 3, 4, 2, 2]);
});

test("i capitoli contengono gli argomenti giusti, nell'ordine del corso", () => {
  const ids = (cid) => G.TOPICS.filter((t) => t.chapter === cid).map((t) => t.id).sort();
  assert.deepEqual(ids("c1"), [...C1].sort());
  assert.deepEqual(ids("c2"), ["bit-byte", "bit-valori", "sistemi-posizionali"]);
  assert.deepEqual(ids("conv"), ["bin-dec", "bit-necessari", "dec-bin"]);
  assert.deepEqual(ids("ops"), ["addizione", "divisione", "moltiplicazione", "sottrazione"]);
  assert.deepEqual(ids("basi"), ["ops-basi", "ott-esa"]);
  assert.deepEqual(ids("virgola"), ["confronto-basi", "virgola"]);
});

test("stato del capitolo: da iniziare, in corso, coperto, da ripassare", () => {
  assert.equal(chapterOf(newPlayer(), "c1").state, "da-iniziare");
  const started = { topics: { "istruzioni-robot": stats([1, 1], 2, 0.2) } };
  assert.equal(chapterOf(started, "c1").state, "in-corso");
  const covered = { topics: Object.fromEntries(C1.map((id) => [id, stats([1, 0], 2, 0.2)])) };
  assert.equal(chapterOf(covered, "c1").state, "coperto");
  const review = { topics: { ...covered.topics, storia: stats([0, 0, 0, 0, 0], 5, 0) } };
  const r = chapterOf(review, "c1");
  assert.equal(r.state, "da-ripassare");
  assert.equal(r.failed, 1);
  assert.match(r.detail, /1 argomento da ripassare/);
});

// Argomenti di un capitolo con le ultime risposte e la difficoltà indicate (la storia passata è un'altra cosa).
const mastery = (ids, { window = [1, 1, 1, 1, 1], level = 1, attempts = 12, correct = 8 } = {}) =>
  Object.fromEntries(ids.map((id) => [id, { attempts, correct, window, level, lastAt: 1 }]));
const NUM_OPS = ["addizione", "sottrazione", "moltiplicazione", "divisione"];

test("superato alla perfezione: tutti superati, ultime 5 giuste e difficoltà ≥ 0,9", () => {
  const perfect = chapterOf({ topics: mastery(C1) }, "c1");
  assert.deepEqual([perfect.state, perfect.complete, perfect.mastered], ["perfetto", true, true]);
  assert.equal(perfect.label, "Superato alla perfezione");
  assert.match(perfect.detail, /ultime risposte tutte giuste/);
  const ops = chapterOf({ topics: mastery(NUM_OPS, { level: 0.9 }) }, "ops");
  assert.equal(ops.state, "perfetto");
});

test("superato non alla perfezione: dice quale argomento rifare, senza 'solo'", () => {
  // una risposta sbagliata nelle ultime 5 di un argomento: superato (4 su 5) ma non perfetto
  const topics = { ...mastery(C1), "istruzioni-robot": { attempts: 12, correct: 9, window: [1, 1, 0, 1, 1], level: 1, lastAt: 1 } };
  const ch = chapterOf({ topics }, "c1");
  assert.deepEqual([ch.state, ch.complete, ch.mastered], ["superato", true, false]);
  assert.equal(ch.label, "Superato, non alla perfezione");
  assert.match(ch.detail, /Per la perfezione: rifai giuste le ultime 5 domande di «Istruzioni per il robot»/);
  assert.doesNotMatch(ch.detail, /solo/);
  assert.doesNotMatch(ch.detail, /%/, "niente percentuali: conta come si va adesso");
  // più argomenti da rifare: ne cita due e poi puntini
  const many = chapterOf({ topics: mastery(C1, { window: [1, 1, 0, 1, 1] }) }, "c1");
  assert.match(many.detail, /«Istruzioni per il robot» e «Dati e informazioni»…$/);
});

test("per le operazioni con i numeri serve anche la difficoltà ≥ 0,9; per la teoria no", () => {
  assert.equal(chapterOf({ topics: mastery(NUM_OPS, { level: 0.8 }) }, "ops").state, "superato");
  assert.equal(chapterOf({ topics: mastery(NUM_OPS, { level: 0.7 }) }, "ops").state, "superato");
  assert.equal(chapterOf({ topics: mastery(NUM_OPS, { level: 0.9 }) }, "ops").state, "perfetto");
  assert.equal(chapterOf({ topics: mastery(C1, { level: 0.1 }) }, "c1").state, "perfetto", "la teoria non ha livello");
  // con meno di 5 risposte nella finestra non si può essere perfetti
  assert.equal(chapterOf({ topics: mastery(C1, { window: [1, 1, 1, 1], attempts: 4 }) }, "c1").state, "superato");
});

test("gli errori fatti imparando non impediscono la perfezione: si recupera ripassando", () => {
  // storia lunga con tanti errori all'inizio: 12 domande, 6 giuste in tutto…
  let s;
  for (const ok of [false, false, true, false, true, false, true, true, true, true, true, true]) s = P.nextStats(s, ok);
  const before = { topics: Object.fromEntries(C1.map((id) => [id, s])) };
  assert.equal(s.correct, 8);
  assert.equal(chapterOf(before, "c1").state, "perfetto", "…ma le ultime 5 sono tutte giuste: perfetto");
  // partendo da un argomento superato ma non perfetto, bastano 3 giuste di fila: l'errore esce dalla finestra delle ultime 5
  let t = { attempts: 10, correct: 6, window: [1, 1, 0, 1, 1], level: 1, lastAt: 1 };
  const stateWith = (x) => chapterOf({ topics: { ...mastery(C1.slice(1)), "istruzioni-robot": x } }, "c1").state;
  assert.equal(stateWith(t), "superato");
  const states = [];
  for (let i = 0; i < 5; i++) { t = P.nextStats(t, true); states.push(stateWith(t)); }
  assert.deepEqual(states, ["superato", "superato", "perfetto", "perfetto", "perfetto"]);
});

test("lo stato segue come si va adesso: due errori e un capitolo perfetto torna superato o coperto", () => {
  let t = { attempts: 12, correct: 12, window: [1, 1, 1, 1, 1], level: 1, lastAt: 1 };
  const topics = (x) => ({ ...mastery(C1.slice(1)), "istruzioni-robot": x });
  assert.equal(chapterOf({ topics: topics(t) }, "c1").state, "perfetto");
  t = P.nextStats(t, false);
  assert.equal(chapterOf({ topics: topics(t) }, "c1").state, "superato", "1 errore: ancora superato, non più perfetto");
  t = P.nextStats(t, false);
  assert.equal(chapterOf({ topics: topics(t) }, "c1").state, "coperto", "2 errori: torna coperto");
});

test("stato dei capitoli nella simulazione: il giocatore bravo li completa tutti, uno incerto no", () => {
  const strong = G.summarize(simulate(900, 1, 3).player);
  assert.ok(strong.chapters.every((c) => c.state === "perfetto"), strong.chapters.map((c) => `${c.n}:${c.state}`).join(" "));
  const weak = G.summarize(simulate(300, 0.1, 5).player);
  assert.equal(weak.chapters.find((c) => c.id === "ops").state, "da-iniziare");
  assert.ok(weak.chapters.some((c) => c.state === "da-ripassare"));
  const mid = G.summarize(simulate(600, 0.8, 11).player);
  assert.ok(mid.chapters.every((c) => ["perfetto", "superato", "coperto", "in-corso", "da-ripassare"].includes(c.state)));
  assert.ok(mid.chapters.filter((c) => c.state === "perfetto" || c.state === "superato").length >= 3, mid.chapters.map((c) => `${c.n}:${c.state}`).join(" "));
});

test("ogni stato ha etichetta e riga di spiegazione", () => {
  const states = Object.values(G.CHAPTER_STATE);
  assert.equal(states.length, 6);
  for (const st of states) assert.ok(G.CHAPTER_LABEL[st], st);
  assert.equal(new Set(states.map((s) => G.CHAPTER_LABEL[s])).size, 6);
  const sum = G.summarize(newPlayer());
  assert.ok(sum.chapters.every((c) => c.detail && c.label && c.state === "da-iniziare"));
});

// ---------- Il traguardo raggiunto resta visibile ----------

const DAY0 = Date.UTC(2026, 10, 12, 12); // 12 novembre 2026
function playTopic(store, topic, outcomes, t0 = DAY0) {
  let st = store;
  outcomes.forEach((o, i) => { st = G.recordResult(st, "neri", topic, o, t0 + i); });
  return st;
}

test("passedAt: si imposta la prima volta che l'argomento diventa superato e non cambia più", () => {
  let st = P.enter(P.emptyStore(), "Neri", DAY0).store;
  st = playTopic(st, "dati-informazioni", [true, true, true]);
  assert.equal(P.currentPlayer(st).topics["dati-informazioni"].passedAt, 0, "con 3 risposte non è superato");
  st = playTopic(st, "dati-informazioni", [true], DAY0 + 10);
  const first = P.currentPlayer(st).topics["dati-informazioni"].passedAt;
  assert.equal(first, DAY0 + 10, "alla quarta giusta");
  st = playTopic(st, "dati-informazioni", [true, true], DAY0 + 99_999);
  assert.equal(P.currentPlayer(st).topics["dati-informazioni"].passedAt, first, "non cambia");
});

test("passedAt non si cancella quando lo stato scende", () => {
  let st = P.enter(P.emptyStore(), "Neri", DAY0).store;
  st = playTopic(st, "dati-informazioni", [true, true, true, true]);
  const player = () => P.currentPlayer(st);
  assert.equal(G.statusFor(player(), "dati-informazioni"), "superato");
  st = playTopic(st, "dati-informazioni", [false, false, false, false, false], DAY0 + 1000);
  assert.equal(G.statusFor(player(), "dati-informazioni"), "da-ripassare");
  assert.equal(player().topics["dati-informazioni"].passedAt, DAY0 + 3, "il traguardo resta");
  const sum = G.summarize(player());
  assert.equal(sum.counts.passed, 0, "il conteggio dei superati è quello di adesso");
});

test("nota 'superato il…': data, errori recenti e cosa fare", () => {
  let st = P.enter(P.emptyStore(), "Neri", DAY0).store;
  st = playTopic(st, "dati-informazioni", [true, true, true, true]);
  st = playTopic(st, "dati-informazioni", [false, false], DAY0 + 50);
  const row = G.summarize(P.currentPlayer(st)).rows.find((r) => r.id === "dati-informazioni");
  assert.notEqual(row.status, "superato");
  assert.equal(G.wasPassedNote(row), "Superato il 12/11: 2 errori recenti, rifai giuste le prossime per tornarci");
  st = playTopic(st, "dati-informazioni", [true, true, true, true, true], DAY0 + 90);
  const back = G.summarize(P.currentPlayer(st)).rows.find((r) => r.id === "dati-informazioni");
  assert.equal(back.status, "superato");
  assert.equal(G.wasPassedNote(back), "", "tornato superato: niente nota");
  assert.equal(G.wasPassedNote({ passedAt: 0, status: "toccato", window: [0] }), "", "mai superato: niente nota");
  assert.match(G.wasPassedNote({ passedAt: DAY0, status: "toccato", window: [0] }), /un errore recente/);
  assert.equal(G.wasPassedNote({ passedAt: DAY0, status: "toccato", window: [1, 1] }), "Superato il 12/11, rifai giuste le prossime per tornarci");
});

test("nota del capitolo: era superato (tutti gli argomenti) e ora non lo è più", () => {
  let st = P.enter(P.emptyStore(), "Neri", DAY0).store;
  for (const id of ["istruzioni-robot", "dati-informazioni", "algoritmo-pensiero", "informatica-termini", "storia"]) st = playTopic(st, id, [true, true, true, true, true], DAY0);
  const c1 = () => G.summarize(P.currentPlayer(st)).chapters.find((c) => c.id === "c1");
  assert.equal(c1().state, "perfetto");
  assert.equal(c1().wasNote, "", "ancora superato: nessuna nota");
  st = playTopic(st, "storia", [false, false, false, false, false], DAY0 + 5000);
  assert.equal(c1().state, "da-ripassare");
  assert.equal(c1().wasNote, "Era superato il 12/11: rifai giuste le prossime domande per tornarci");
  // un capitolo mai superato per intero non ha la nota
  let st2 = P.enter(P.emptyStore(), "Neri", DAY0).store;
  st2 = playTopic(st2, "istruzioni-robot", [true, true, true, true]);
  assert.equal(G.summarize(P.currentPlayer(st2)).chapters.find((c) => c.id === "c1").wasNote, "");
});

test("markPassed: una sola volta, solo per argomenti provati, id non valido ignorato", () => {
  let st = P.enter(P.emptyStore(), "Neri", DAY0).store;
  assert.equal(P.markPassed(st, "neri", "addizione", 5), st, "mai provato: nessuna modifica");
  st = P.recordResult(st, "neri", "addizione", true, 1);
  st = P.markPassed(st, "neri", "addizione", 10);
  st = P.markPassed(st, "neri", "addizione", 99);
  assert.equal(P.currentPlayer(st).topics.addizione.passedAt, 10);
  assert.equal(P.markPassed(st, "neri", "__proto__", 5), st);
});

test("passedAt sopravvive al salvataggio e il reset lo cancella", () => {
  let st = P.enter(P.emptyStore(), "Neri", DAY0).store;
  st = playTopic(st, "dati-informazioni", [true, true, true, true]);
  const back = P.parseStore(P.serialize(st));
  assert.equal(P.currentPlayer(back).topics["dati-informazioni"].passedAt, DAY0 + 3);
  assert.equal(P.currentPlayer(P.resetPlayer(st, "neri")).topics["dati-informazioni"], undefined);
  const hostile = P.parseStore(JSON.stringify({ players: [{ name: "Ok", topics: { addizione: { attempts: 2, correct: 1, window: [1, 0], level: 0.3, passedAt: "x" }, storia: { attempts: 1, correct: 1, window: [1], level: 0, passedAt: -5 } } }] }));
  assert.deepEqual(P.currentPlayer({ ...hostile, current: "ok" }).topics.addizione.passedAt, 0);
  assert.equal(P.currentPlayer({ ...hostile, current: "ok" }).topics.storia.passedAt, 0);
});

test("formatDay: giorno/mese", () => {
  assert.equal(G.formatDay(Date.UTC(2026, 10, 12, 12)), "12/11");
  assert.equal(G.formatDay(Date.UTC(2026, 0, 5, 12)), "5/1");
});
