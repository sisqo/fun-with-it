// Salvataggio online dei progressi: un file JSON per giocatore, il cui nome (senza distinzione di maiuscole) fa da login.
// Il file non è pubblico: sta in un archivio Vercel Blob privato e si raggiunge solo da qui.
// Nessuna password, per scelta: è un'app didattica. Si accetta però solo un giocatore ben formato (stessa pulizia dei dati del browser).

import { normalizeName, parseStore } from "../js/profiles.mjs";

export const MAX_BODY = 200_000;
const pathFor = (key) => `players/${encodeURIComponent(key)}.json`;

async function readText(stream) {
  const reader = stream.getReader();
  const chunks = [];
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
  return Buffer.concat(chunks).toString("utf8");
}

// blob: { get, put, del } dello SDK (o un finto nei test).
export function createHandler(blob) {
  return async function handler(req, res) {
    const send = (code, body) => { res.statusCode = code; res.setHeader("content-type", "application/json; charset=utf-8"); res.setHeader("cache-control", "no-store"); res.end(JSON.stringify(body)); };
    try {
      if (req.method === "PUT") {
        const raw = req.body;
        const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? {});
        if (text.length > MAX_BODY) return send(413, { error: "Salvataggio troppo grande" });
        const body = typeof raw === "string" ? JSON.parse(raw) : raw;
        const n = normalizeName(body?.player?.name);
        if (!n.ok) return send(400, { error: n.error });
        const clean = parseStore(JSON.stringify({ current: n.key, players: [body.player] })).players.find((p) => p.key === n.key);
        if (!clean) return send(400, { error: "Giocatore non valido" });
        await blob.put(pathFor(n.key), JSON.stringify(clean), { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json" });
        return send(200, { ok: true, updatedAt: clean.updatedAt });
      }
      const n = normalizeName(req.query?.name);
      if (!n.ok) return send(400, { error: n.error });
      if (req.method === "GET") {
        const r = await blob.get(pathFor(n.key), { access: "private", useCache: false });
        if (!r || !r.stream) return send(404, { error: "Nessun salvataggio con questo nome" });
        const player = parseStore(JSON.stringify({ current: n.key, players: [JSON.parse(await readText(r.stream))] })).players.find((p) => p.key === n.key);
        return player ? send(200, { player }) : send(404, { error: "Salvataggio non leggibile" });
      }
      if (req.method === "DELETE") {
        await blob.del(pathFor(n.key));
        return send(200, { ok: true });
      }
      res.setHeader("allow", "GET, PUT, DELETE");
      return send(405, { error: "Metodo non consentito" });
    } catch (err) {
      return send(500, { error: "Errore del server" });
    }
  };
}
