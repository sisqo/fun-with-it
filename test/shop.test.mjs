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
  assert.deepEqual(S.itemState(S.itemById("skin:notte"), poor), { state: "locked", gap: 250, percent: 37 });
  assert.deepEqual(S.itemState(S.itemById("skin:oro"), poor), { state: "locked", gap: 3850, percent: 3 });
  assert.equal(S.itemState(S.itemById("bg:molo"), me(newStore(300))).state, "buy", "con i soldi esatti si può comprare");
  assert.equal(S.itemState(S.itemById("bg:molo"), me(newStore(299))).state, "locked");
  assert.equal(S.itemState(S.itemById("bg:molo"), me(newStore(299))).gap, 1);
  const rich = me(newStore(1000));
  assert.equal(S.itemState(S.itemById("skin:menta"), rich).state, "buy");
  assert.equal(S.itemState(S.itemById("skin:tramonto"), rich).state, "buy");
  assert.equal(S.itemState(S.itemById("skin:terminale"), rich).state, "locked");
});

test("acquisto: scala il prezzo, l'oggetto diventa tuo ma non in uso finché non lo scegli", () => {
  const r = S.buy(newStore(1000), "neri", "skin:menta", 5);
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
