// Salvataggio online dei progressi (lato browser). Il nome del giocatore fa da login: nessuna password.
// Il browser resta la copia di lavoro, il server è il posto da cui recuperarla: se la rete manca si gioca lo stesso.

export const ENDPOINT = "/api/progress";

// Quanti progressi ha una copia (per dire quale è "più avanti"): risposte date, partite e esami.
const progressOf = (p) => Object.values(p.topics ?? {}).reduce((n, t) => n + (t.attempts ?? 0), 0) + (p.missionsDone ?? 0) + (p.exams?.length ?? 0) + Object.keys(p.trophies ?? {}).length;

// Unisce due copie dello stesso giocatore senza perdere progressi: un dispositivo quasi vuoto non cancella mai uno avanti.
// - Un azzeramento voluto (resetAt) vince su tutto ciò che è più vecchio.
// - Argomenti: per ognuno vale la copia con più risposte; trofei, caveau, oggetti e esami si sommano.
// - Contanti, aspetto, partite: dalla copia "capofila" (azzeramento più recente, poi più progressi, poi più recente).
export function mergePlayers(a, b) {
  const resetAt = Math.max(a.resetAt ?? 0, b.resetAt ?? 0);
  const alive = (x) => (x.resetAt ?? 0) >= resetAt; // la copia non è precedente all'ultimo azzeramento
  const live = [a, b].filter(alive);
  const lead = [...live].sort((x, y) => progressOf(y) - progressOf(x) || y.updatedAt - x.updatedAt)[0];
  const topics = {};
  for (const x of live) for (const [id, st] of Object.entries(x.topics ?? {})) {
    const cur = topics[id];
    if (!cur || st.attempts > cur.attempts || (st.attempts === cur.attempts && st.lastAt > cur.lastAt)) topics[id] = { ...st, passedAt: Math.max(st.passedAt ?? 0, cur?.passedAt ?? 0) };
    else topics[id] = { ...cur, passedAt: Math.max(st.passedAt ?? 0, cur.passedAt ?? 0) };
  }
  const union = (field) => { const out = {}; for (const x of live) for (const [k, v] of Object.entries(x[field] ?? {})) out[k] = Math.max(out[k] ?? 0, v); return out; };
  const list = (field) => [...new Set(live.flatMap((x) => x[field] ?? []))];
  const exams = [...new Map(live.flatMap((x) => x.exams ?? []).map((e) => [e.at, e])).values()].sort((x, y) => x.at - y.at).slice(-10);
  return {
    ...lead, topics, trophies: union("trophies"), vaultsOpened: union("vaultsOpened"), done: union("done"),
    owned: list("owned"), shopSeen: list("shopSeen"), exams,
    missionsDone: Math.max(...live.map((x) => x.missionsDone ?? 0)),
    createdAt: Math.min(...[a, b].map((x) => x.createdAt || Infinity).filter(Number.isFinite), Date.now()),
    updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0), resetAt,
  };
}

// Cosa fare con la copia del dispositivo e quella online. source: "none", "local" (tieni la locale), "remote" (prendi l'online),
// "merged" (le due sono state unite: salva l'unione in entrambi i posti). pushLocal: la copia finale va caricata online.
export function reconcile(local, remote) {
  if (!local && !remote) return { source: "none", player: null, pushLocal: false };
  if (!remote) return { source: "local", player: local, pushLocal: true };
  if (!local) return { source: "remote", player: remote, pushLocal: false };
  const merged = mergePlayers(local, remote);
  const same = (x) => JSON.stringify(x) === JSON.stringify(merged);
  if (same(remote)) return { source: "remote", player: remote, pushLocal: false };
  if (same(local)) return { source: "local", player: local, pushLocal: true };
  return { source: "merged", player: merged, pushLocal: true };
}

async function json(res) {
  try { return await res.json(); } catch { return null; } // pagina non JSON (nessun server, rete di casa strana): è come essere offline
}

// { status: "ok", player } | { status: "none" } | { status: "offline" }
export async function pull(name, f = globalThis.fetch) {
  try {
    const res = await f(`${ENDPOINT}?name=${encodeURIComponent(name)}`, { cache: "no-store" });
    const body = await json(res);
    if (res.status === 200 && body?.player) return { status: "ok", player: body.player };
    if (res.status === 404 && body?.error) return { status: "none" };
  } catch { /* offline */ }
  return { status: "offline" };
}

export async function push(player, f = globalThis.fetch) {
  try {
    const res = await f(ENDPOINT, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ player }), keepalive: true });
    return res.status === 200 && !!(await json(res))?.ok;
  } catch { return false; }
}

export async function remove(name, f = globalThis.fetch) {
  try {
    const res = await f(`${ENDPOINT}?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    return res.status === 200;
  } catch { return false; }
}
