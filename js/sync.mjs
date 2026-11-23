// Salvataggio online dei progressi (lato browser). Il nome del giocatore fa da login: nessuna password.
// Il browser resta la copia di lavoro, il server è il posto da cui recuperarla: se la rete manca si gioca lo stesso.

export const ENDPOINT = "/api/progress";

// Quale copia vince quando ce n'è una sul dispositivo e una online: la più recente (updatedAt). Un azzeramento aggiorna updatedAt, quindi vince.
// source: "none" (niente da nessuna parte), "local", "remote". pushLocal: la copia locale va caricata online.
export function reconcile(local, remote) {
  if (!local && !remote) return { source: "none", player: null, pushLocal: false };
  if (!remote) return { source: "local", player: local, pushLocal: true };
  if (!local) return { source: "remote", player: remote, pushLocal: false };
  if (remote.updatedAt > local.updatedAt) return { source: "remote", player: remote, pushLocal: false };
  return { source: "local", player: local, pushLocal: local.updatedAt > remote.updatedAt };
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
