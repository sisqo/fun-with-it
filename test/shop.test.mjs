import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../js/shop.mjs";
import * as P from "../js/profiles.mjs";
import * as B from "../js/boss.mjs";

function newStore(cash = 0) {
  let st = P.enter(P.emptyStore(), "Neri", 1).store;
  if (cash) st = P.recordMission(st, "neri", "x", cash);
  return st;
}
const me = (st) => P.currentPlayer(st);

test("listino: identificativi unici, classico e tramonto gratis, prezzi del listino di Doris", () => {
  const ids = S.CATALOG.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(S.itemsIn("skin").map((i) => [i.value, i.price]), [["classico", 0], ["notte", 400], ["menta", 400], ["tramonto", 800], ["terminale", 1500], ["oro", 4000]]);
  assert.deepEqual(S.itemsIn("bg").map((i) => [i.value, i.price]), [["tramonto", 0], ["molo", 300], ["aurora", 600], ["griglia", 600], ["codice", 1500], ["oro", 3000]]);
  for (const slot of Object.keys(S.SLOTS)) assert.equal(S.itemsIn(slot).filter((i) => i.price === 0).length, 1, `un solo oggetto gratuito in ${slot}`);
  for (const i of S.CATALOG) assert.match(i.id, new RegExp(`^${i.slot}:${i.value}$`));
  assert.deepEqual(S.FREE, P.DEFAULT_LOOK);
});

test("ritmo: il primo acquisto arriva presto, l'oro dopo qualche caveau", () => {
  const cheapest = Math.min(...S.CATALOG.filter((i) => i.price > 0).map((i) => i.price));
  assert.ok(cheapest <= 500, "dopo mezza partita (5 risposte a 100) si compra qualcosa");
  const gold = S.itemById("skin:oro").price;
  const caveauAvg = Object.values(P.VAULT_REWARDS).reduce((a, b) => a + b, 0) / 7;
  assert.ok(gold / caveauAvg >= 2 && gold / caveauAvg <= 4, `oro = ${(gold / caveauAvg).toFixed(1)} caveau medi`);
  assert.ok(S.CATALOG.every((i) => i.price <= gold));
});

test("giocatore nuovo: gli oggetti gratuiti sono suoi e in uso, il resto no", () => {
  const p = me(newStore());
  assert.deepEqual(S.lookOf(p), { skin: "classico", bg: "tramonto" });
  assert.deepEqual(S.itemState(S.itemById("skin:classico"), p), { state: "equipped" });
  assert.deepEqual(S.itemState(S.itemById("bg:tramonto"), p), { state: "equipped" });
  assert.equal(S.isOwned(S.itemById("skin:oro"), p), false);
});

test("stati della scheda: troppo cara (con quanto manca), da comprare, tua, in uso", () => {
  const poor = me(newStore(150));
  assert.deepEqual(S.itemState(S.itemById("skin:notte"), poor), { state: "locked", reason: "cash", gap: 250, percent: 37 });
  assert.deepEqual(S.itemState(S.itemById("skin:oro"), poor, { chapters: 4 }), { state: "locked", reason: "cash", gap: 3850, percent: 3 });
  assert.equal(S.itemState(S.itemById("bg:molo"), me(newStore(300))).state, "buy", "con i soldi esatti si può comprare");
  assert.equal(S.itemState(S.itemById("bg:molo"), me(newStore(299))).state, "locked");
  assert.equal(S.itemState(S.itemById("bg:molo"), me(newStore(299))).gap, 1);
  const rich = me(newStore(1000));
  assert.equal(S.itemState(S.itemById("skin:menta"), rich).state, "buy");
  assert.equal(S.itemState(S.itemById("skin:tramonto"), rich).state, "buy");
  assert.equal(S.itemState(S.itemById("skin:terminale"), rich).state, "locked", "1000 non bastano per 1500 (e servono 2 capitoli)");
});

test("acquisto: scala il prezzo, l'oggetto diventa tuo ma non in uso finché non lo scegli", () => {
  const r = S.buy(newStore(1000), "neri", "skin:menta", {}, 5);
  assert.equal(r.ok, true);
  const p = me(r.store);
  assert.equal(p.cash, 600);
  assert.deepEqual(p.owned, ["skin:menta"]);
  assert.equal(S.itemState(S.itemById("skin:menta"), p).state, "owned");
  assert.equal(S.lookOf(p).skin, "classico");
});

test("acquisto rifiutato: contanti insufficienti, già comprato, gratuito, sconosciuto", () => {
  const poor = newStore(399);
  const a = S.buy(poor, "neri", "skin:notte");
  assert.deepEqual([a.ok, a.error, a.store], [false, "contanti insufficienti", poor]);
  const exact = S.buy(newStore(400), "neri", "skin:notte");
  assert.equal(exact.ok, true);
  assert.equal(me(exact.store).cash, 0, "si può comprare con i soldi esatti, senza andare sotto zero");
  const again = S.buy(exact.store, "neri", "skin:notte");
  assert.equal(again.ok, false);
  const rich = newStore(5000);
  const twice = S.buy(S.buy(rich, "neri", "skin:menta").store, "neri", "skin:menta");
  assert.deepEqual([twice.ok, twice.error], [false, "già tuo"]);
  assert.equal(me(twice.store).cash, 4600, "non si paga due volte");
  assert.equal(S.buy(rich, "neri", "skin:classico").ok, false, "il gratuito non si compra");
  assert.equal(S.buy(rich, "neri", "skin:inventato").ok, false);
  assert.equal(S.buy(rich, "neri", "__proto__").ok, false);
  assert.equal(S.buy(rich, "altro", "skin:menta").ok, false);
});

test("uso: solo ciò che è tuo; il gratuito si rimette sempre", () => {
  let st = S.buy(newStore(2000), "neri", "skin:menta").store;
  st = S.buy(st, "neri", "bg:molo").store;
  const notOwned = S.equip(st, "neri", "skin:oro");
  assert.equal(notOwned, st, "non si usa ciò che non si possiede");
  st = S.equip(st, "neri", "skin:menta");
  st = S.equip(st, "neri", "bg:molo");
  assert.deepEqual(S.lookOf(me(st)), { skin: "menta", bg: "molo" });
  assert.equal(S.itemState(S.itemById("skin:menta"), me(st)).state, "equipped");
  assert.equal(S.itemState(S.itemById("skin:classico"), me(st)).state, "owned", "il classico ora è 'tuo' e si può rimettere");
  st = S.equip(st, "neri", "skin:classico");
  assert.equal(S.lookOf(me(st)).skin, "classico");
  assert.equal(S.equip(st, "neri", "skin:inventato"), st);
});

test("un solo oggetto per slot in uso: skin e sfondo sono indipendenti", () => {
  let st = S.buy(S.buy(newStore(3000), "neri", "skin:notte").store, "neri", "skin:menta").store;
  st = S.equip(S.equip(st, "neri", "skin:notte"), "neri", "skin:menta");
  const equipped = S.itemsIn("skin").filter((i) => S.itemState(i, me(st)).state === "equipped");
  assert.deepEqual(equipped.map((i) => i.value), ["menta"]);
  assert.equal(S.lookOf(me(st)).bg, "tramonto");
});

test("dati vecchi o manomessi: l'aspetto non posseduto o sconosciuto torna a quello di partenza", () => {
  const tampered = P.parseStore(JSON.stringify({ players: [{ name: "Neri", cash: 0, owned: ["skin:oro", "__proto__", "bg:molo", "skin:oro", 5, "x y"], look: { skin: "oro", bg: "molo" } }] }));
  const p = tampered.players[0];
  assert.deepEqual(p.owned, ["skin:oro", "bg:molo"], "doppioni e valori non validi scartati");
  assert.deepEqual(S.lookOf({ ...p, owned: [] }), { skin: "classico", bg: "tramonto" }, "se non lo possiede non lo usa");
  assert.deepEqual(S.lookOf(p), { skin: "oro", bg: "molo" }, "se lo possiede sì");
  const unknown = P.parseStore(JSON.stringify({ players: [{ name: "Ok", look: { skin: "inesistente", bg: "__proto__", extra: "x" } }] })).players[0];
  assert.deepEqual(S.lookOf(unknown), S.FREE);
  const junk = P.parseStore(JSON.stringify({ players: [{ name: "Ok", owned: "no", look: "no" }] })).players[0];
  assert.deepEqual([junk.owned, junk.look], [[], { skin: "classico", bg: "tramonto" }]);
  assert.equal(P.parseStore(JSON.stringify({ players: [{ name: "Ok", owned: Array.from({ length: 200 }, (_, i) => `bg:a${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i / 26) | 0))}`) }] })).players[0].owned.length <= 60, true);
});

test("acquisti e aspetto si salvano e si rileggono; il reset li azzera", () => {
  let st = S.buy(newStore(1000), "neri", "skin:menta").store;
  st = S.equip(st, "neri", "skin:menta");
  const back = me(P.parseStore(P.serialize(st)));
  assert.deepEqual([back.owned, back.look, back.cash], [["skin:menta"], { skin: "menta", bg: "tramonto" }, 600]);
  const reset = me(P.resetPlayer(st, "neri"));
  assert.deepEqual([reset.owned, reset.look, reset.cash], [[], { skin: "classico", bg: "tramonto" }, 0]);
});

test("economia: un caveau vale più di qualunque oggetto tranne i due più cari", () => {
  const rewards = Object.values(P.VAULT_REWARDS);
  const mid = S.CATALOG.filter((i) => i.price > 0 && i.price <= 1500);
  for (const item of mid) assert.ok(Math.max(...rewards) >= item.price, item.id);
  // con la ricompensa del caveau delle operazioni si compra subito uno degli oggetti più cari a metà listino
  assert.ok(P.vaultReward("ops") >= S.itemById("bg:codice").price);
});

test("i nomi dei caveau non si confondono con gli oggetti (id diversi)", () => {
  for (const id of Object.keys(B.BOSS_NAME)) assert.ok(!S.itemById(id));
});

// ---------- capitoli richiesti e ritmo del negozio (controlli di Rebecca) ----------

import * as G from "../js/progress.mjs";
import * as Eco from "../js/economy.mjs";

test("gli oggetti più cari richiedono capitoli superati, non solo contanti", () => {
  const expensive = S.CATALOG.filter((i) => i.price >= 1500);
  assert.ok(expensive.length >= 4);
  for (const i of expensive) assert.ok(S.chaptersNeeded(i) >= 2, `${i.id} senza requisito di capitoli`);
  assert.equal(S.chaptersNeeded(S.itemById("skin:oro")), 4, "l'oggetto più caro richiede più capitoli di tutti");
  for (const i of S.CATALOG) assert.ok(S.chaptersNeeded(i) <= S.chaptersNeeded(S.itemById("skin:oro")));
  for (const i of S.CATALOG.filter((x) => x.price > 0 && x.price < 1500)) assert.equal(S.chaptersNeeded(i), 0, `${i.id}: gli oggetti economici sono per tutti`);
  assert.ok(S.chaptersNeeded(S.itemById("skin:oro")) <= 6, "raggiungibile: ci sono 7 capitoli");
});

test("stato 'bloccato' per capitoli: prima i capitoli, poi i contanti", () => {
  const rich = me(newStore(10000));
  const gold = S.itemById("skin:oro");
  assert.deepEqual(S.itemState(gold, rich, { chapters: 1 }), { state: "locked", reason: "chapters", need: 4, have: 1, percent: 25 });
  assert.deepEqual(S.itemState(gold, rich, { chapters: 3 }), { state: "locked", reason: "chapters", need: 4, have: 3, percent: 75 });
  assert.equal(S.itemState(gold, rich, { chapters: 4 }).state, "buy");
  assert.equal(S.itemState(gold, rich).state, "locked", "senza il contesto si assumono 0 capitoli");
  const poor = me(newStore(100));
  assert.equal(S.itemState(gold, poor, { chapters: 4 }).reason, "cash");
});

test("acquisto: con i soldi ma senza i capitoli viene rifiutato", () => {
  const st = newStore(10000);
  const no = S.buy(st, "neri", "skin:oro", { chapters: 3 });
  assert.deepEqual([no.ok, no.error, no.store], [false, "capitoli insufficienti", st]);
  const ok = S.buy(st, "neri", "skin:oro", { chapters: 4 });
  assert.equal(ok.ok, true);
  assert.equal(me(ok.store).cash, 6000);
  assert.equal(S.buy(newStore(1500), "neri", "skin:terminale", { chapters: 1 }).ok, false);
  assert.equal(S.buy(newStore(1500), "neri", "skin:terminale", { chapters: 2 }).ok, true);
});

test("nessun oggetto richiede di vincere un caveau: bastano i contanti delle partite e i capitoli superati", () => {
  for (const i of S.CATALOG) {
    assert.ok(!("vault" in i) && !("trophy" in i) && !("vaults" in i), i.id);
    assert.ok(i.price <= 4000);
  }
  // senza nemmeno un trofeo si arriva a tutto: con 6 capitoli superati e abbastanza contanti si compra l'oro
  const st = newStore(4000);
  assert.equal(S.buy(st, "neri", "skin:oro", { chapters: 6 }).ok, true);
});

// Simula una partita di 10 domande in un capitolo con la probabilità `skill` di azzeccare ogni passaggio; restituisce i dollari.
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function playGame(chapter, skill, seed, player = { topics: {} }) {
  const rng = mulberry(seed), dice = mulberry(seed + 7);
  let cash = 0, last = null, p = player;
  for (let i = 0; i < 10; i++) {
    const q = G.nextQuestion(p, rng, { chapter, last });
    const guided = q.kind === "guided";
    const units = guided ? q.steps.length : 1;
    let right = 0;
    for (let u = 0; u < units; u++) if (dice() < skill) right++;
    cash += right * Eco.rewardFor(guided);
    p = { topics: { ...p.topics, [q.topic]: P.nextStats(p.topics[q.topic], right / units) } };
    last = q.topic;
  }
  return { cash, p };
}
const avgGame = (chapter, skill, n = 40) => { let sum = 0; for (let s = 1; s <= n; s++) sum += playGame(chapter, skill, s).cash; return sum / n; };

test("economia: un passaggio guidato vale la metà di una risposta semplice", () => {
  assert.equal(Eco.CASH_PER_RIGHT, 100);
  assert.equal(Eco.CASH_PER_STEP, 50);
  assert.equal(Eco.rewardFor(false), 100);
  assert.equal(Eco.rewardFor(true), 50);
});

test("ritmo (1): il primo acquisto arriva entro 1-2 partite, anche per chi sbaglia spesso, in qualunque capitolo", () => {
  const cheapest = Math.min(...S.CATALOG.filter((i) => i.price > 0).map((i) => i.price));
  for (const ch of G.CHAPTERS) {
    const weak = avgGame(ch.id, 0.3);
    assert.ok(weak * 2 >= cheapest, `${ch.id}: ${Math.round(weak)} a partita, 2 partite = ${Math.round(weak * 2)} < ${cheapest}`);
    const ok = avgGame(ch.id, 0.5);
    assert.ok(ok >= cheapest, `${ch.id}: già alla prima partita con il 50% (${Math.round(ok)})`);
  }
});

test("ritmo: le partite sulle operazioni non pagano da 4 a 8 volte le altre (al massimo circa il doppio)", () => {
  for (const skill of [0.3, 0.5, 0.7, 0.9]) {
    const ops = avgGame("ops", skill), theory = avgGame("c1", skill);
    assert.ok(ops / theory <= 2.4, `abilità ${skill}: operazioni ${Math.round(ops)} / teoria ${Math.round(theory)} = ${(ops / theory).toFixed(1)}`);
    assert.ok(ops >= theory, "ma fare gli esercizi guidati rende di più");
  }
});

test("ritmo (2): l'oggetto più caro non si compra giocando tante volte un solo capitolo: serve aver superato 4 capitoli", () => {
  const gold = S.itemById("skin:oro");
  // anche chi fa solo il capitolo più ricco (operazioni) a livello alto, dopo molte partite ha i contanti ma non i capitoli
  let cash = 0, p = { topics: {} };
  for (let n = 0; n < 25; n++) { const r = playGame("ops", 0.9, 100 + n, p); cash += r.cash; p = r.p; }
  assert.ok(cash >= gold.price, "con tante partite i contanti arrivano");
  const player = { ...me(newStore(cash)), cash };
  const chaptersDone = G.summarize({ topics: p.topics, trophies: {}, vaultsOpened: {} }).chapters.filter((c) => c.complete).length;
  assert.ok(chaptersDone <= 1, `con le sole operazioni si superano ${chaptersDone} capitoli`);
  assert.equal(S.itemState(gold, player, { chapters: chaptersDone }).state, "locked");
  assert.equal(S.itemState(gold, player, { chapters: chaptersDone }).reason, "chapters");
});

test("ritmo (3): giocando anche solo un capitolo di teoria, senza caveau, si compra tutto ciò che non richiede capitoli", () => {
  let cash = 0, p = { topics: {} };
  let games = 0;
  while (cash < 1000 && games < 40) { const r = playGame("c1", 0.5, 500 + games, p); cash += r.cash; p = r.p; games++; }
  assert.ok(games <= 3, `1.000 dollari in ${games} partite al 50% nel capitolo più povero`);
  for (const i of S.CATALOG.filter((x) => x.price > 0 && x.price <= 1000)) assert.equal(S.chaptersNeeded(i), 0, i.id);
});

// ---------- il traguardo raggiunto resta valido per il negozio (Rebecca) ----------

const everPassedChapters = (player) => G.summarize(player).chapters.filter((c) => c.everPassed).length;
const slippedTopic = { attempts: 12, correct: 10, window: [1, 1, 0, 0, 1], level: 1, lastAt: 1, passedAt: 5 }; // era superato, ora non più
const passedTopic = { attempts: 12, correct: 12, window: [1, 1, 1, 1, 1], level: 1, lastAt: 1, passedAt: 5 };
const ids = (ch) => G.chapterTopics(ch).map((t) => t.id);

test("capitoli per il negozio: contano anche quelli superati in passato e poi scivolati", () => {
  const topics = {};
  for (const id of [...ids("warm"), ...ids("c1")]) topics[id] = passedTopic;
  assert.equal(everPassedChapters({ topics, trophies: {}, vaultsOpened: {} }), 2);
  // due errori in c1: lo stato di adesso scende, ma il traguardo resta
  const slipped = { ...topics, ...Object.fromEntries(ids("c1").map((id) => [id, slippedTopic])) };
  const chapters = G.summarize({ topics: slipped, trophies: {}, vaultsOpened: {} }).chapters;
  assert.equal(chapters.find((c) => c.id === "c1").complete, false, "adesso non è più superato");
  assert.equal(everPassedChapters({ topics: slipped, trophies: {}, vaultsOpened: {} }), 2, "ma resta contato");
});

test("superato → scivola → l'oggetto resta acquistabile (e dà ancora i capitoli giusti)", () => {
  const slipped = { ...Object.fromEntries([...ids("warm"), ...ids("c1")].map((id) => [id, slippedTopic])) };
  const player = { ...me(newStore(1500)), topics: slipped };
  const chapters = everPassedChapters(player);
  assert.equal(chapters, 2);
  assert.equal(S.itemState(S.itemById("skin:terminale"), player, { chapters }).state, "buy", "Terminale resta comprabile");
  const store = { ...newStore(1500) };
  store.players = [{ ...store.players[0], topics: slipped }];
  assert.equal(S.buy(store, "neri", "skin:terminale", { chapters }).ok, true);
});

test("un capitolo mai superato per intero non conta; con un argomento mai superato nemmeno", () => {
  const topics = Object.fromEntries(ids("c1").map((id) => [id, passedTopic]));
  delete topics.storia; // un argomento mai toccato
  assert.equal(everPassedChapters({ topics, trophies: {}, vaultsOpened: {} }), 0);
  topics.storia = { attempts: 3, correct: 3, window: [1, 1, 1], level: 0.3, lastAt: 1, passedAt: 0 }; // toccato ma mai superato
  assert.equal(everPassedChapters({ topics, trophies: {}, vaultsOpened: {} }), 0);
});

test("salvataggi senza passedAt: un capitolo superato adesso conta comunque", () => {
  const legacy = Object.fromEntries(ids("c1").map((id) => [id, { ...passedTopic, passedAt: 0 }]));
  assert.equal(everPassedChapters({ topics: legacy, trophies: {}, vaultsOpened: {} }), 1);
});

test("un oggetto comprato resta tuo e indossabile anche se i capitoli scendono dopo", () => {
  let st = newStore(6000);
  let r = S.buy(st, "neri", "skin:oro", { chapters: 4 });
  assert.equal(r.ok, true);
  st = S.equip(r.store, "neri", "skin:oro");
  const p = me(st);
  // ora il giocatore non ha più nessun capitolo superato
  assert.equal(S.itemState(S.itemById("skin:oro"), p, { chapters: 0 }).state, "equipped", "resta in uso");
  const off = S.equip(S.equip(st, "neri", "skin:classico"), "neri", "skin:oro");
  assert.equal(S.lookOf(me(off)).skin, "oro", "si può rimettere anche senza capitoli");
  assert.equal(S.itemState(S.itemById("skin:oro"), me(S.equip(st, "neri", "skin:classico")), { chapters: 0 }).state, "owned");
  assert.equal(S.buy(st, "neri", "skin:oro", { chapters: 0 }).ok, false, "ma non si ricompra");
});

import { buyableNow, newItems } from "../js/shop.mjs";
import { setShopSeen, emptyStore, enter, resetPlayer } from "../js/profiles.mjs";

test("novità: oggetti diventati comprabili dall'ultima visita", () => {
  const p = { cash: 500, owned: [], shopSeen: [], look: {} };
  const now = buyableNow(p, { chapters: 0 }).map((i) => i.id);
  assert.ok(now.length > 0);
  assert.deepEqual(newItems(p, { chapters: 0 }).map((i) => i.id), now);
  assert.deepEqual(newItems({ ...p, shopSeen: now }, { chapters: 0 }), []);
});

test("setShopSeen: salva, non cambia se uguale, il reset lo azzera", () => {
  let st = enter(emptyStore(), "Neri", 1).store;
  const key = st.current;
  const a = setShopSeen(st, key, ["skin:notte", "skin:notte", 5]);
  assert.deepEqual(a.players[0].shopSeen, ["skin:notte"]);
  assert.equal(setShopSeen(a, key, ["skin:notte"]), a);
  assert.deepEqual(resetPlayer(a, key).players[0].shopSeen, []);
});
