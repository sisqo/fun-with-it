import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../js/sync.mjs";

const p = (updatedAt, cash = 0) => ({ key: "neri", name: "Neri", cash, updatedAt });
const reply = (status, body) => async () => ({ status, json: async () => { if (body === undefined) throw new Error("non json"); return body; } });

const full = (o = {}) => ({ key: "neri", name: "Neri", cash: 0, missionsDone: 0, done: {}, topics: {}, trophies: {}, vaultsOpened: {}, owned: [], look: { skin: "classico", bg: "tramonto" }, shopSeen: [], exams: [], createdAt: 10, updatedAt: 10, resetAt: 0, ...o });
const st = (attempts, lastAt = 1, passedAt = 0) => ({ attempts, correct: attempts, window: [1], level: 0.5, lastAt, passedAt });

test("reconcile: una sola copia, copie uguali, nessuna", () => {
  assert.equal(S.reconcile(null, null).source, "none");
  assert.deepEqual(S.reconcile(p(5), null), { source: "local", player: p(5), pushLocal: true });
  assert.deepEqual(S.reconcile(null, p(5)), { source: "remote", player: p(5), pushLocal: false });
  const same = S.reconcile(full(), full());
  assert.deepEqual([same.source, same.pushLocal], ["remote", false]);
});

test("un salvataggio online quasi vuoto ma più recente NON cancella i progressi veri del dispositivo", () => {
  const real = full({ cash: 5000, missionsDone: 7, updatedAt: 100, topics: { cassaforte: st(30, 90, 50), addizione: st(12, 95) }, trophies: { warm: 80 }, owned: ["skin:notte"], exams: [{ at: 70, grade: 8, correct: 20, total: 24, chapters: {} }] });
  const stub = full({ cash: 0, updatedAt: 500, topics: { cassaforte: st(1, 480), addizione: st(2, 490) } });
  for (const [l, r] of [[real, stub], [stub, real]]) {
    const out = S.reconcile(l, r);
    assert.equal(out.player.cash, 5000);
    assert.equal(out.player.missionsDone, 7);
    assert.equal(out.player.topics.cassaforte.attempts, 30);
    assert.equal(out.player.topics.cassaforte.passedAt, 50);
    assert.deepEqual(out.player.owned, ["skin:notte"]);
    assert.equal(out.player.exams.length, 1);
    assert.equal(out.player.updatedAt, 500);
  }
});

test("due dispositivi con progressi diversi si sommano", () => {
  const a = full({ cash: 300, updatedAt: 10, missionsDone: 2, topics: { cassaforte: st(10), "dec-bin": st(4) }, trophies: { warm: 5 }, owned: ["skin:notte"] });
  const b = full({ cash: 100, updatedAt: 20, missionsDone: 1, topics: { cassaforte: st(6), addizione: st(3) }, trophies: { c1: 9 }, owned: ["bg:molo"] });
  const m = S.reconcile(a, b);
  assert.equal(m.source, "merged");
  assert.deepEqual(Object.keys(m.player.topics).sort(), ["addizione", "cassaforte", "dec-bin"]);
  assert.equal(m.player.topics.cassaforte.attempts, 10);
  assert.deepEqual(m.player.trophies, { warm: 5, c1: 9 });
  assert.deepEqual([...m.player.owned].sort(), ["bg:molo", "skin:notte"]);
  assert.equal(m.player.missionsDone, 2);
  assert.equal(m.player.cash, 300, "contanti dalla copia più avanti");
  assert.ok(m.pushLocal);
});

test("un azzeramento voluto vince sulle copie più vecchie", () => {
  const old = full({ cash: 900, updatedAt: 50, missionsDone: 4, topics: { cassaforte: st(20, 40) }, trophies: { warm: 30 }, owned: ["skin:notte"] });
  const reset = full({ updatedAt: 200, resetAt: 200 });
  for (const [l, r] of [[old, reset], [reset, old]]) {
    const out = S.reconcile(l, r).player;
    assert.deepEqual([out.cash, out.missionsDone, out.topics, out.trophies, out.owned], [0, 0, {}, {}, []]);
    assert.equal(out.resetAt, 200);
  }
  // dopo l'azzeramento si ricomincia a giocare: i nuovi progressi restano, i vecchi no
  const after = full({ updatedAt: 300, resetAt: 200, missionsDone: 1, topics: { addizione: st(2, 250) } });
  const out = S.reconcile(old, after).player;
  assert.deepEqual(Object.keys(out.topics), ["addizione"]);
});

test("pull: ok, nessun salvataggio, offline (rete, pagina non JSON, errore server)", async () => {
  assert.deepEqual(await S.pull("Neri", reply(200, { player: p(1) })), { status: "ok", player: p(1) });
  assert.deepEqual(await S.pull("Neri", reply(404, { error: "Nessun salvataggio" })), { status: "none" });
  assert.deepEqual(await S.pull("Neri", reply(404, undefined)), { status: "offline" }, "404 di un server statico senza API");
  assert.deepEqual(await S.pull("Neri", reply(500, { error: "x" })), { status: "offline" });
  assert.deepEqual(await S.pull("Neri", async () => { throw new TypeError("fetch failed"); }), { status: "offline" });
});

test("pull codifica il nome nell'indirizzo; push e remove usano i metodi giusti", async () => {
  const calls = [];
  const f = async (url, opt) => { calls.push([url, opt?.method ?? "GET"]); return { status: 200, json: async () => ({ ok: true }) }; };
  await S.pull("Zoë & co", f); await S.push(p(1), f); await S.remove("Zoë", f);
  assert.deepEqual(calls.map((c) => c[1]), ["GET", "PUT", "DELETE"]);
  assert.ok(calls[0][0].endsWith("name=Zo%C3%AB%20%26%20co"));
  assert.equal(await S.push(p(1), async () => { throw new Error("x"); }), false);
  assert.equal(await S.remove("a", reply(500, {})), false);
});
