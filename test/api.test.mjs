import test from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../api/_progress.mjs";
import * as P from "../js/profiles.mjs";

// archivio finto in memoria, con la stessa forma dello SDK
function fakeBlob() {
  const files = new Map();
  return {
    files,
    async put(path, body) { files.set(path, body); },
    async get(path) { return files.has(path) ? { stream: new Response(files.get(path)).body } : null; },
    async del(path) { files.delete(path); },
  };
}
async function call(handler, { method = "GET", query = {}, body } = {}) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(t) { this.text = t; } };
  await handler({ method, query, body }, res);
  return { status: res.statusCode, json: JSON.parse(res.text), headers: res.headers };
}
const player = (name = "Neri", extra = {}) => ({ ...P.enter(P.emptyStore(), name, 1000).player, cash: 700, updatedAt: 5000, ...extra });

test("salva e rilegge un giocatore, il nome non distingue le maiuscole", async () => {
  const b = fakeBlob(), h = createHandler(b);
  assert.equal((await call(h, { query: { name: "Neri" } })).status, 404);
  const put = await call(h, { method: "PUT", body: { player: player() } });
  assert.equal(put.status, 200);
  for (const name of ["Neri", "neri", "NERI "]) {
    const r = await call(h, { query: { name } });
    assert.equal(r.status, 200);
    assert.equal(r.json.player.cash, 700);
    assert.equal(r.json.player.name, "Neri");
  }
  assert.equal(b.files.size, 1);
  assert.equal(put.headers["cache-control"], "no-store");
});

test("il salvataggio si pulisce come quello del browser e il vecchio si sovrascrive", async () => {
  const b = fakeBlob(), h = createHandler(b);
  await call(h, { method: "PUT", body: { player: player("Neri", { cash: -5, topics: { "x!": { attempts: 3 } }, evil: "<script>" }) } });
  const saved = JSON.parse([...b.files.values()][0]);
  assert.equal(saved.cash, 0);
  assert.deepEqual(saved.topics, {});
  assert.equal(saved.evil, undefined);
  await call(h, { method: "PUT", body: { player: player("neri", { cash: 900 }) } });
  assert.equal(b.files.size, 1);
  assert.equal((await call(h, { query: { name: "Neri" } })).json.player.cash, 900);
});

test("richieste sbagliate: nome vuoto o lungo, corpo enorme, metodo", async () => {
  const h = createHandler(fakeBlob());
  assert.equal((await call(h, { query: { name: "  " } })).status, 400);
  assert.equal((await call(h, { query: { name: "x".repeat(40) } })).status, 400);
  assert.equal((await call(h, { method: "PUT", body: { player: { name: "" } } })).status, 400);
  assert.equal((await call(h, { method: "PUT", body: {} })).status, 400);
  assert.equal((await call(h, { method: "PUT", body: { player: player("Neri", { pad: "a".repeat(300000) }) } })).status, 413);
  assert.equal((await call(h, { method: "POST", query: { name: "Neri" } })).status, 405);
});

test("elimina il salvataggio, e un nome con simboli non esce dall'archivio", async () => {
  const b = fakeBlob(), h = createHandler(b);
  await call(h, { method: "PUT", body: { player: player("../x/y") } });
  assert.ok([...b.files.keys()].every((k) => /^players\/[^/]+\.json$/.test(k)), [...b.files.keys()].join());
  await call(h, { method: "PUT", body: { player: player() } });
  assert.equal((await call(h, { method: "DELETE", query: { name: "neri" } })).status, 200);
  assert.equal((await call(h, { query: { name: "Neri" } })).status, 404);
});

test("un errore dell'archivio dà 500 senza dettagli", async () => {
  const h = createHandler({ get: async () => { throw new Error("segreto"); } });
  const r = await call(h, { query: { name: "Neri" } });
  assert.equal(r.status, 500);
  assert.ok(!JSON.stringify(r.json).includes("segreto"));
});
