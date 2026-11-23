import test from "node:test";
import assert from "node:assert/strict";
import * as P from "../js/profiles.mjs";

test("normalizeName: pulisce, accetta accenti, rifiuta vuoto e troppo lungo", () => {
  assert.deepEqual(P.normalizeName("  Neri  "), { ok: true, name: "Neri", key: "neri" });
  assert.equal(P.normalizeName("Maria   Chiara").name, "Maria Chiara");
  assert.equal(P.normalizeName("Zoë\u0000​").name, "Zoë");
  assert.equal(P.normalizeName("ÀNGELO").key, "àngelo");
  assert.equal(P.normalizeName("").ok, false);
  assert.equal(P.normalizeName("   ").ok, false);
  assert.equal(P.normalizeName(null).ok, false);
  assert.equal(P.normalizeName("x".repeat(20)).ok, true);
  assert.equal(P.normalizeName("x".repeat(21)).ok, false);
  assert.match(P.normalizeName("x".repeat(21)).error, /20/);
  assert.equal(P.normalizeName("😀".repeat(20)).ok, true, "conta i caratteri, non le unità UTF-16");
});

test("enter: crea un giocatore nuovo e lo seleziona", () => {
  const r = P.enter(P.emptyStore(), "Neri", 1000);
  assert.equal(r.ok, true);
  assert.equal(r.isNew, true);
  assert.equal(r.store.current, "neri");
  assert.deepEqual(r.player, { key: "neri", name: "Neri", cash: 0, missionsDone: 0, done: {}, topics: {}, trophies: {}, vaultsOpened: {}, owned: [], shopSeen: [], exams: [], look: { skin: "classico", bg: "tramonto" }, createdAt: 1000, updatedAt: 1000 });
});

test("enter con lo stesso nome (anche con altre maiuscole) riprende il giocatore", () => {
  let st = P.enter(P.emptyStore(), "Neri").store;
  st = P.recordMission(st, "neri", "ops", 700);
  st = P.signOut(st);
  assert.equal(st.current, null);
  const r = P.enter(st, "  NERI ");
  assert.equal(r.isNew, false);
  assert.equal(r.player.cash, 700);
  assert.equal(r.store.players.length, 1);
  assert.equal(r.store.current, "neri");
});

test("enter con nome non valido non cambia lo store", () => {
  const st = P.enter(P.emptyStore(), "Neri").store;
  const r = P.enter(st, "   ");
  assert.equal(r.ok, false);
  assert.equal(r.store, st);
});

test("più giocatori sullo stesso dispositivo restano separati", () => {
  let st = P.enter(P.emptyStore(), "Neri").store;
  st = P.recordMission(st, "neri", "ops", 500);
  st = P.enter(P.signOut(st), "Giulia").store;
  st = P.recordMission(st, "giulia", "warm", 300);
  const [a, b] = st.players;
  assert.deepEqual([a.name, a.cash, a.done], ["Neri", 500, { ops: 1 }]);
  assert.deepEqual([b.name, b.cash, b.done], ["Giulia", 300, { warm: 1 }]);
  assert.equal(P.currentPlayer(st).name, "Giulia");
});

test("recordMission accumula conto e missioni, per missione", () => {
  let st = P.enter(P.emptyStore(), "Neri").store;
  st = P.recordMission(st, "neri", "ops", 900);
  st = P.recordMission(st, "neri", "ops", 400);
  st = P.recordMission(st, "neri", "warm", 1000);
  const p = P.currentPlayer(st);
  assert.deepEqual([p.cash, p.missionsDone, p.done], [2300, 3, { ops: 2, warm: 1 }]);
});

test("resetPlayer azzera conto e missioni ma tiene nome e giocatore corrente", () => {
  let st = P.enter(P.emptyStore(), "Neri").store;
  st = P.recordMission(st, "neri", "ops", 900);
  const before = st;
  const after = P.resetPlayer(st, "neri", 5);
  const p = P.currentPlayer(after);
  assert.deepEqual([p.name, p.cash, p.missionsDone, p.done, p.updatedAt], ["Neri", 0, 0, {}, 5]);
  assert.equal(after.current, "neri");
  assert.equal(P.currentPlayer(before).cash, 900, "non modifica lo store originale");
});

test("resetPlayer non tocca gli altri giocatori", () => {
  let st = P.enter(P.emptyStore(), "Neri").store;
  st = P.recordMission(st, "neri", "ops", 100);
  st = P.enter(P.signOut(st), "Giulia").store;
  st = P.recordMission(st, "giulia", "ops", 200);
  st = P.resetPlayer(st, "giulia");
  assert.equal(st.players.find((p) => p.key === "neri").cash, 100);
  assert.equal(st.players.find((p) => p.key === "giulia").cash, 0);
});

test("deletePlayer elimina e, se era quello corrente, esce", () => {
  let st = P.enter(P.emptyStore(), "Neri").store;
  st = P.enter(P.signOut(st), "Giulia").store;
  const after = P.deletePlayer(st, "giulia");
  assert.deepEqual(after.players.map((p) => p.name), ["Neri"]);
  assert.equal(after.current, null);
  assert.equal(P.deletePlayer(st, "neri").current, "giulia");
});

test("limite di giocatori", () => {
  let st = P.emptyStore();
  for (let i = 0; i < P.MAX_PLAYERS; i++) st = P.enter(P.signOut(st), `g${i}`).store;
  const r = P.enter(P.signOut(st), "uno-di-troppo");
  assert.equal(r.ok, false);
  assert.match(r.error, /12/);
  assert.equal(P.enter(st, "g3").ok, true, "ma un nome esistente si può sempre riprendere");
});

test("serialize/parseStore: andata e ritorno", () => {
  let st = P.enter(P.emptyStore(), "Neri", 1).store;
  st = P.recordMission(st, "neri", "ops", 800, 2);
  const back = P.parseStore(P.serialize(st));
  assert.deepEqual(back, st);
});

test("parseStore: formato della prima versione, il profilo passa al primo nome", () => {
  const st = P.parseStore(JSON.stringify({ cash: 1200, missionsDone: 3 }));
  assert.deepEqual(st.legacy, { cash: 1200, missionsDone: 3 });
  assert.equal(st.players.length, 0);
  const r = P.enter(st, "Neri");
  assert.deepEqual([r.player.cash, r.player.missionsDone], [1200, 3]);
  assert.equal(r.store.legacy, undefined);
  const second = P.enter(P.signOut(r.store), "Giulia").player;
  assert.deepEqual([second.cash, second.missionsDone], [0, 0], "i vecchi progressi si assegnano una volta sola");
});

test("parseStore: dati corrotti o ostili non rompono nulla", () => {
  for (const raw of [null, undefined, "", "non è json", "[]", "null", "42", '"x"', "{", '{"players":"no"}', '{"players":[null,1,"x",[]]}']) {
    const st = P.parseStore(raw);
    assert.deepEqual([st.v, st.current, st.players.length], [2, null, 0], String(raw));
  }
  const nasty = P.parseStore(JSON.stringify({
    current: "ghost",
    players: [
      { name: "Neri", cash: -5, missionsDone: "tanti", done: { ops: "x", "__proto__": 9, "a b": 1, warm: 2.9 } },
      { name: "neri", cash: 999 },
      { name: "<b>hi</b>", cash: 1e99, missionsDone: Infinity },
      { name: "", cash: 10 },
    ],
  }));
  assert.equal(nasty.current, null, "il corrente deve esistere");
  assert.deepEqual(nasty.players.map((p) => p.name), ["Neri", "<b>hi</b>"], "duplicati e nomi vuoti scartati");
  assert.deepEqual([nasty.players[0].cash, nasty.players[0].missionsDone], [0, 0]);
  assert.deepEqual(nasty.players[0].done, { ops: 0, warm: 2 });
  assert.ok(nasty.players[1].cash <= 1e9);
  assert.equal(Object.getPrototypeOf(nasty.players[0].done), Object.prototype);
  assert.equal({}.polluted, undefined);
});

test("parseStore: tanti giocatori vengono limitati", () => {
  const players = Array.from({ length: 100 }, (_, i) => ({ name: `g${i}`, cash: i }));
  assert.equal(P.parseStore(JSON.stringify({ players })).players.length, P.MAX_PLAYERS);
});

test("il nome è sempre trattato come testo: nessuna interpretazione HTML nello store", () => {
  const r = P.enter(P.emptyStore(), "<img onerror=x>");
  assert.equal(r.ok, true);
  assert.equal(r.player.name, "<img onerror=x>");
  assert.equal(P.enter(P.emptyStore(), "<img src=x onerror=alert(1)>").ok, false, "i nomi troppo lunghi (anche se ostili) sono rifiutati");
});

test("le date in millisecondi sopravvivono al salvataggio e alla rilettura", () => {
  const now = 1_770_000_000_000;
  let st = P.enter(P.emptyStore(), "Neri", now).store;
  st = P.recordResult(st, "neri", "dec-bin", true, now + 5);
  const back = P.parseStore(P.serialize(st));
  const p = P.currentPlayer(back);
  assert.equal(p.createdAt, now);
  assert.equal(p.updatedAt, now + 5);
  assert.equal(p.topics["dec-bin"].lastAt, now + 5);
});
