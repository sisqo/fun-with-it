// Negozio: skin di R0b e sfondi, da comprare con i contanti guadagnati. Il listino sta qui: la CSS non contiene prezzi.
// Con $ 100 a risposta giusta e $ 1.000-3.000 a caveau, il primo acquisto arriva dopo mezza partita e l'oro dopo circa tre caveau.

import * as P from "./profiles.mjs";

export const CATALOG = [
  // R0b: .skin--<valore> su un contenitore alto. "classico" è la skin di partenza (nessuna classe).
  { id: "skin:classico", slot: "skin", value: "classico", name: "Classico", price: 0 },
  { id: "skin:notte", slot: "skin", value: "notte", name: "Notte al neon", price: 400 },
  { id: "skin:menta", slot: "skin", value: "menta", name: "Menta", price: 400 },
  { id: "skin:tramonto", slot: "skin", value: "tramonto", name: "Tramonto", price: 800 },
  { id: "skin:terminale", slot: "skin", value: "terminale", name: "Terminale", price: 1500 },
  { id: "skin:oro", slot: "skin", value: "oro", name: "Oro 24 carati", price: 4000 },
  // Sfondi: data-bg="<valore>" su <html>. "tramonto" è lo sfondo di partenza (nessun data-bg).
  { id: "bg:tramonto", slot: "bg", value: "tramonto", name: "Tramonto sulla baia", price: 0 },
  { id: "bg:molo", slot: "bg", value: "molo", name: "Molo di notte", price: 300 },
  { id: "bg:aurora", slot: "bg", value: "aurora", name: "Aurora", price: 600 },
  { id: "bg:griglia", slot: "bg", value: "griglia", name: "Griglia", price: 600 },
  { id: "bg:codice", slot: "bg", value: "codice", name: "Pioggia di bit", price: 1500 },
  { id: "bg:oro", slot: "bg", value: "oro", name: "Caveau d'oro", price: 3000 },
];

export const SLOTS = { skin: "R0b", bg: "Sfondi" };
export const itemById = (id) => CATALOG.find((i) => i.id === id) ?? null;
export const itemsIn = (slot) => CATALOG.filter((i) => i.slot === slot);
export const FREE = { skin: "classico", bg: "tramonto" };

// Un oggetto è tuo se è gratis o se l'hai comprato.
export const isOwned = (item, player) => item.price === 0 || (player?.owned ?? []).includes(item.id);

// Aspetto in uso, sempre valido: un valore sconosciuto o non posseduto (dati vecchi o manomessi) torna a quello di partenza.
export function lookOf(player) {
  const out = { ...FREE };
  for (const slot of Object.keys(FREE)) {
    const want = player?.look?.[slot];
    const item = itemsIn(slot).find((i) => i.value === want);
    if (item && isOwned(item, player)) out[slot] = item.value;
  }
  return out;
}

// Stato di una scheda: in uso, tua, da comprare (te la puoi permettere) o troppo cara (con quanto manca e a che punto sei).
export function itemState(item, player) {
  const look = lookOf(player);
  if (look[item.slot] === item.value) return { state: "equipped" };
  if (isOwned(item, player)) return { state: "owned" };
  const cash = player?.cash ?? 0;
  if (cash >= item.price) return { state: "buy" };
  return { state: "locked", gap: item.price - cash, percent: Math.floor((cash / item.price) * 100) };
}

export function buy(store, key, itemId, now = Date.now()) {
  const item = itemById(itemId);
  if (!item || item.price === 0) return { ok: false, error: "oggetto non in vendita", store };
  return P.buyItem(store, key, item.id, item.price, now);
}

// Mette in uso un oggetto, solo se è tuo.
export function equip(store, key, itemId, now = Date.now()) {
  const item = itemById(itemId);
  const player = store.players.find((p) => p.key === key);
  if (!item || !player || !isOwned(item, player)) return store;
  return P.setLook(store, key, item.slot, item.value, now);
}
