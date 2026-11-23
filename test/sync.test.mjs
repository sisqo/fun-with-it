import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../js/sync.mjs";

const p = (updatedAt, cash = 0) => ({ key: "neri", name: "Neri", cash, updatedAt });
const reply = (status, body) => async () => ({ status, json: async () => { if (body === undefined) throw new Error("non json"); return body; } });

test("reconcile: vince la copia più recente, un azzeramento (più recente) vince", () => {
  assert.equal(S.reconcile(null, null).source, "none");
  assert.deepEqual(S.reconcile(p(5), null), { source: "local", player: p(5), pushLocal: true });
  assert.deepEqual(S.reconcile(null, p(5)), { source: "remote", player: p(5), pushLocal: false });
  assert.equal(S.reconcile(p(5, 100), p(9, 700)).source, "remote");
  const l = S.reconcile(p(9, 0), p(5, 700));
  assert.deepEqual([l.source, l.pushLocal, l.player.cash], ["local", true, 0]);
  assert.deepEqual([S.reconcile(p(5), p(5)).source, S.reconcile(p(5), p(5)).pushLocal], ["local", false]);
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
