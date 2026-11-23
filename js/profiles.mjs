// Giocatori e progressi, salvati solo su questo dispositivo (localStorage). Nessun dato lascia il browser.
// Funzioni pure: lavorano su un oggetto `store` e ne restituiscono uno nuovo; la lettura/scrittura sul disco sta in app.js.
//
// store = { v: 2, current: "chiave"|null, legacy?: {cash, missionsDone}, players: [player] }
// player = { key, name, cash, missionsDone, done: { [missione]: volte }, topics: { [argomento]: stats }, trophies: { [capitolo]: quando }, vaultsOpened: { [capitolo]: quando }, owned: ["skin:menta", "bg:molo"…], look: { skin, bg }, shopSeen: [id…], exams, createdAt, updatedAt, resetAt (ultimo azzeramento) }
// stats  = { attempts, correct, window: [0|1 … ultimi 5 esiti], level: 0..1 (difficoltà), lastAt, passedAt (quando è stato superato la prima volta, 0 = mai; non si cancella) }

export const MAX_NAME = 20;
export const MAX_PLAYERS = 12;
export const STORE_KEY = "neonbay";
export const WINDOW = 5; // gli ultimi esiti che contano per dire se un argomento è superato o bocciato
export const MAX_TOPICS = 60;
export const OK_FRACTION = 0.75; // una domanda a passaggi conta "giusta" se almeno il 75% dei passaggi è giusto

export const emptyStore = () => ({ v: 2, current: null, players: [] });

// Pulisce un nome: toglie i caratteri di controllo e comprime gli spazi. Restituisce { ok, name, key } oppure { ok:false, error }.
export function normalizeName(raw) {
  const name = String(raw ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length === 0) return { ok: false, error: "Scrivi un nome." };
  if ([...name].length > MAX_NAME) return { ok: false, error: `Massimo ${MAX_NAME} caratteri.` };
  return { ok: true, name, key: name.toLocaleLowerCase("it-IT") };
}

const ts = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0); // millisecondi: nessun tetto a 1e9
const num = (v) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), 1e9) : 0);
const safeDone = (d) => {
  const out = {};
  if (d && typeof d === "object") {
    for (const [k, v] of Object.entries(d)) if (typeof k === "string" && /^[a-z0-9_-]{1,24}$/i.test(k) && k !== "__proto__") out[k] = num(v);
  }
  return out;
};

const clamp01 = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
function safeTopics(t) {
  const out = {};
  if (!t || typeof t !== "object") return out;
  let n = 0;
  for (const [id, st] of Object.entries(t)) {
    if (!/^[a-z0-9-]{1,32}$/.test(id) || !st || typeof st !== "object") continue;
    const window = Array.isArray(st.window) ? st.window.slice(-WINDOW).map((x) => (x ? 1 : 0)) : [];
    const attempts = num(st.attempts);
    out[id] = { attempts, correct: Math.min(num(st.correct), attempts), window: window.slice(-attempts), level: clamp01(st.level), lastAt: ts(st.lastAt), passedAt: ts(st.passedAt) };
    if (++n >= MAX_TOPICS) break;
  }
  return out;
}

// Aggiorna le statistiche di un argomento dopo una domanda.
// outcome: true/false oppure la frazione di passaggi giusti (0..1) per gli esercizi a passaggi.
// Lo stato guarda se la domanda è "giusta" (>= 75%); la difficoltà sale e scende in proporzione,
// e sale di più (+0,2) alla terza risposta giusta di fila.
export function nextStats(st, outcome, now = Date.now()) {
  const s = st ?? { attempts: 0, correct: 0, window: [], level: 0, lastAt: 0, passedAt: 0 };
  const frac = outcome === true ? 1 : outcome === false ? 0 : clamp01(Number(outcome));
  const ok = frac >= OK_FRACTION;
  const window = [...s.window, ok ? 1 : 0].slice(-WINDOW);
  const streak3 = window.length >= 3 && window.slice(-3).every((x) => x === 1);
  const delta = frac * (streak3 ? 0.2 : 0.12) - (1 - frac) * 0.18;
  return { attempts: s.attempts + 1, correct: s.correct + (ok ? 1 : 0), window, level: clamp01(s.level + delta), lastAt: now, passedAt: s.passedAt ?? 0 };
}

// Trofei dei caveau vinti: { capitolo: data in ms }. Non si perdono mai, nemmeno con un errore successivo.
function safeTrophies(t) {
  const out = {};
  if (!t || typeof t !== "object") return out;
  for (const [id, when] of Object.entries(t)) if (/^[a-z0-9]{1,12}$/.test(id)) out[id] = Math.max(1, ts(when));
  return out;
}

// Esami finali sostenuti: gli ultimi MAX_EXAMS, dal più vecchio. { at, grade (0-10, mezzi punti), correct, total, chapters: { id: [giuste, totali] } }
export const MAX_EXAMS = 10;
function safeExams(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    const total = Math.min(100, num(e.total)), correct = Math.min(total, num(e.correct));
    if (!total) continue;
    const chapters = {};
    if (e.chapters && typeof e.chapters === "object") {
      for (const [id, v] of Object.entries(e.chapters)) {
        if (/^[a-z0-9]{1,12}$/.test(id) && Array.isArray(v)) { const t = Math.min(100, num(v[1])); if (t) chapters[id] = [Math.min(t, num(v[0])), t]; }
      }
    }
    out.push({ at: Math.max(1, ts(e.at)), grade: Math.min(10, Math.max(0, Math.round(Number(e.grade) * 2) / 2 || 0)), correct, total, chapters });
  }
  return out.slice(-MAX_EXAMS);
}

// Oggetti comprati nel negozio ("skin:menta", "bg:molo") e aspetto scelto. Il listino sta in shop.mjs: qui solo la forma.
export const DEFAULT_LOOK = { skin: "classico", bg: "tramonto" };
const ITEM_ID = /^(skin|bg):[a-z]{2,12}$/;
const LOOK_VALUE = /^[a-z]{2,12}$/;
function safeOwned(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((x) => typeof x === "string" && ITEM_ID.test(x)))].slice(0, 60);
}
function safeLook(look) {
  const out = { ...DEFAULT_LOOK };
  if (look && typeof look === "object") for (const slot of ["skin", "bg"]) if (typeof look[slot] === "string" && LOOK_VALUE.test(look[slot])) out[slot] = look[slot];
  return out;
}

// Legge il testo salvato (anche corrotto o in formato vecchio) e restituisce sempre uno store valido.
export function parseStore(raw) {
  let data;
  try { data = JSON.parse(raw ?? ""); } catch { return emptyStore(); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return emptyStore();
  const store = emptyStore();
  if (Array.isArray(data.players)) {
    const seen = new Set();
    for (const p of data.players.slice(0, MAX_PLAYERS * 3)) {
      if (!p || typeof p !== "object") continue;
      const n = normalizeName(p.name);
      if (!n.ok || seen.has(n.key)) continue;
      seen.add(n.key);
      store.players.push({
        key: n.key, name: n.name, cash: num(p.cash), missionsDone: num(p.missionsDone), done: safeDone(p.done), topics: safeTopics(p.topics), trophies: safeTrophies(p.trophies), vaultsOpened: safeTrophies(p.vaultsOpened), owned: safeOwned(p.owned), look: safeLook(p.look), shopSeen: safeOwned(p.shopSeen), exams: safeExams(p.exams),
        createdAt: ts(p.createdAt), updatedAt: ts(p.updatedAt), resetAt: ts(p.resetAt),
      });
      if (store.players.length >= MAX_PLAYERS) break;
    }
    if (typeof data.current === "string" && store.players.some((p) => p.key === data.current)) store.current = data.current;
  } else if ("cash" in data || "missionsDone" in data) {
    // formato della prima versione: un solo profilo senza nome. Lo si assegna al primo nome inserito.
    store.legacy = { cash: num(data.cash), missionsDone: num(data.missionsDone) };
  }
  if (data.legacy && typeof data.legacy === "object" && !store.legacy) store.legacy = { cash: num(data.legacy.cash), missionsDone: num(data.legacy.missionsDone) };
  return store;
}

export const serialize = (store) => JSON.stringify(store);
export const currentPlayer = (store) => store.players.find((p) => p.key === store.current) ?? null;

const replacePlayer = (store, key, fn) => ({ ...store, players: store.players.map((p) => (p.key === key ? fn(p) : p)) });

// Entra con un nome: se esiste (senza badare alle maiuscole) riprende quel giocatore, altrimenti lo crea.
export function enter(store, rawName, now = Date.now()) {
  const n = normalizeName(rawName);
  if (!n.ok) return { ok: false, error: n.error, store };
  const existing = store.players.find((p) => p.key === n.key);
  if (existing) return { ok: true, isNew: false, store: { ...store, current: existing.key }, player: existing };
  if (store.players.length >= MAX_PLAYERS) return { ok: false, error: `Ci sono già ${MAX_PLAYERS} giocatori: elimina un profilo prima di aggiungerne uno.`, store };
  const inherited = store.legacy && store.players.length === 0 ? store.legacy : { cash: 0, missionsDone: 0 };
  const player = { key: n.key, name: n.name, cash: inherited.cash, missionsDone: inherited.missionsDone, done: {}, topics: {}, trophies: {}, vaultsOpened: {}, owned: [], look: { ...DEFAULT_LOOK }, shopSeen: [], exams: [], createdAt: now, updatedAt: now, resetAt: 0 };
  const next = { ...store, current: player.key, players: [...store.players, player] };
  delete next.legacy;
  return { ok: true, isNew: true, store: next, player };
}

// Azzera i progressi di un giocatore (conto, missioni completate), tenendo il nome.
export function resetPlayer(store, key, now = Date.now()) {
  return replacePlayer(store, key, (p) => ({ ...p, cash: 0, missionsDone: 0, done: {}, topics: {}, trophies: {}, vaultsOpened: {}, owned: [], look: { ...DEFAULT_LOOK }, shopSeen: [], exams: [], updatedAt: now, resetAt: now }));
}

// Elimina del tutto un giocatore.
export function deletePlayer(store, key) {
  const players = store.players.filter((p) => p.key !== key);
  return { ...store, players, current: store.current === key ? null : store.current };
}

// Esce dal giocatore corrente, senza cancellare niente (serve per "Cambia giocatore").
export const signOut = (store) => ({ ...store, current: null });

// Registra una missione completata.
export function recordMission(store, key, missionKey, earned, now = Date.now()) {
  return replacePlayer(store, key, (p) => ({
    ...p,
    cash: num(p.cash + num(earned)),
    missionsDone: p.missionsDone + 1,
    done: { ...p.done, [missionKey]: (p.done[missionKey] ?? 0) + 1 },
    updatedAt: now,
  }));
}

// Registra l'esito di una domanda su un argomento (ok: booleano o frazione di passaggi giusti).
export function recordResult(store, key, topic, ok, now = Date.now()) {
  if (!/^[a-z0-9-]{1,32}$/.test(topic)) return store;
  return replacePlayer(store, key, (p) => ({ ...p, topics: { ...p.topics, [topic]: nextStats(p.topics[topic], ok, now) }, updatedAt: now }));
}

// Segna il momento in cui un argomento è stato superato per la prima volta. Una volta impostato non cambia e non si cancella:
// lo stato di adesso può scendere, ma il traguardo raggiunto resta visibile.
export function markPassed(store, key, topic, now = Date.now()) {
  if (!/^[a-z0-9-]{1,32}$/.test(topic)) return store;
  const current = store.players.find((p) => p.key === key)?.topics[topic];
  if (!current || current.passedAt > 0) return store; // niente da cambiare: stesso oggetto
  return replacePlayer(store, key, (p) => ({ ...p, topics: { ...p.topics, [topic]: { ...current, passedAt: now } } }));
}

// Il premio cresce con il capitolo: una partita normale porta $ 1.000-2.500, il caveau deve valere di più.
export const VAULT_REWARDS = { warm: 1000, c1: 1500, c2: 1500, conv: 2000, ops: 3000, basi: 2500, virgola: 2500 };
export const vaultReward = (chapterId) => VAULT_REWARDS[chapterId] ?? 1000;

// Vince il caveau di un capitolo: contanti e trofeo, una volta sola (rivincere non paga di nuovo).
export function winVault(store, key, chapterId, now = Date.now()) {
  if (!/^[a-z0-9]{1,12}$/.test(chapterId)) return store;
  const player = store.players.find((p) => p.key === key);
  if (!player || player.trophies?.[chapterId]) return store;
  return replacePlayer(store, key, (p) => ({ ...p, cash: num(p.cash + vaultReward(chapterId)), trophies: { ...p.trophies, [chapterId]: now }, updatedAt: now }));
}

// Il caveau di un capitolo si è aperto (capitolo alla perfezione): resta da tentare finché non si vince, anche se poi la perfezione si perde.
export function markVaultOpened(store, key, chapterId, now = Date.now()) {
  if (!/^[a-z0-9]{1,12}$/.test(chapterId)) return store;
  const p = store.players.find((x) => x.key === key);
  if (!p || p.vaultsOpened?.[chapterId] || p.trophies?.[chapterId]) return store;
  return replacePlayer(store, key, (x) => ({ ...x, vaultsOpened: { ...x.vaultsOpened, [chapterId]: now }, updatedAt: now }));
}

// Compra un oggetto: scala il prezzo e lo aggiunge a quelli posseduti. Rifiuta se non ci sono abbastanza contanti o se è già tuo.
export function buyItem(store, key, itemId, price, now = Date.now()) {
  const p = store.players.find((x) => x.key === key);
  if (!p) return { ok: false, error: "giocatore sconosciuto", store };
  if (!ITEM_ID.test(String(itemId))) return { ok: false, error: "oggetto non valido", store };
  if (!Number.isInteger(price) || price < 0) return { ok: false, error: "prezzo non valido", store };
  if (p.owned.includes(itemId)) return { ok: false, error: "già tuo", store };
  if (p.cash < price) return { ok: false, error: "contanti insufficienti", store };
  return { ok: true, store: replacePlayer(store, key, (x) => ({ ...x, cash: x.cash - price, owned: [...x.owned, itemId], updatedAt: now })) };
}

// Sceglie l'aspetto in uso (slot "skin" o "bg"). La verifica che l'oggetto sia tuo è in shop.mjs.
export function setLook(store, key, slot, value, now = Date.now()) {
  if (!["skin", "bg"].includes(slot) || !LOOK_VALUE.test(String(value))) return store;
  const p = store.players.find((x) => x.key === key);
  if (!p || p.look?.[slot] === value) return store;
  return replacePlayer(store, key, (x) => ({ ...x, look: { ...x.look, [slot]: value }, updatedAt: now }));
}

// Ricorda quali oggetti erano già comprabili all'ultima visita al negozio (serve al segno "novità"). Non cambia lo store se è uguale.
export function setShopSeen(store, key, ids) {
  const p = store.players.find((x) => x.key === key);
  const next = safeOwned(ids);
  if (!p || (p.shopSeen.length === next.length && p.shopSeen.every((x, i) => x === next[i]))) return store;
  return replacePlayer(store, key, (x) => ({ ...x, shopSeen: next }));
}

// Registra un esame finito: result = { grade, correct, total, chapters: [{ id, correct, total }] }.
export function recordExam(store, key, result, now = Date.now()) {
  const chapters = Object.fromEntries((result.chapters ?? []).map((c) => [c.id, [c.correct, c.total]]));
  const [exam] = safeExams([{ at: now, grade: result.grade, correct: result.correct, total: result.total, chapters }]);
  if (!exam) return store;
  return replacePlayer(store, key, (p) => ({ ...p, exams: [...p.exams, exam].slice(-MAX_EXAMS), updatedAt: now }));
}
