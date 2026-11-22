// Riscaldamento con la cassaforte: una serie graduale che fa capire il meccanismo del binario.
// 8 ruote con i pesi 128 64 32 16 8 4 2 1: ruota accesa = 1 (aggiunge il suo peso), spenta = 0.
//
// Tre tipi di domanda:
//   build: l'utente gira le ruote finché il display segna N            (kind "safe")
//   read:  le ruote sono già impostate, l'utente somma i pesi → N      (kind "text", vault.show = "read")
//   code:  si vede solo il numero del display e i pesi: l'utente decide, peso per peso, 1 (serve) o 0 (non serve)
//          e scrive la combinazione in binario (kind "text", vault.show = "ruler"). Nessuna ruota mostrata: niente da ricopiare.

import * as E from "./engine.mjs";
import { rint } from "./questions.mjs";

export const WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1];
export const bits8 = (n) => E.toBin(n).padStart(8, "0");
export const onWeights = (n) => WEIGHTS.filter((_, i) => bits8(n)[i] === "1");
// "01000101" -> "0100 0101"
export const nibbles = (bits) => `${bits.slice(0, 4)} ${bits.slice(4)}`;

const RADIO_BUILD = [
  "Ogni ruota accesa mette il suo peso sul piatto. Non c'è altro trucco, ed è già il binario.",
  "Il caveau non vuole la password: vuole la somma giusta di pesi.",
  "Una ruota accesa è un 1, una spenta è uno 0. Il computer pensa così tutto il giorno.",
  "Con 8 ruote ci sono 256 combinazioni. Questo caveau ne apre una sola.",
];
const RADIO_READ = [
  "Leggere la cassaforte è leggere il binario: ruote accese, pesi da sommare.",
  "Le ruote spente non pesano niente: le puoi ignorare.",
];
const RADIO_CODE = [
  "Il codice binario è la cassaforte scritta a parole: 1 se la ruota è accesa, 0 se è spenta.",
  "Otto ruote, otto cifre: da sinistra, 128, 64, 32, 16, 8, 4, 2, 1.",
];
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export function vaultBuild(rng, n, hint = "") {
  return {
    kind: "safe",
    prompt: `Apri la cassaforte: accendi le ruote giuste finché il display segna ${n}.`,
    answer: String(n),
    value: n,
    hint,
    explain: [`${n} = ${onWeights(n).join(" + ")}`, `Ruote accese: ${nibbles(bits8(n))} (1 = accesa, 0 = spenta)`],
    radio: pick(rng, RADIO_BUILD),
  };
}

export function vaultRead(rng, n) {
  return {
    kind: "text",
    base: 10,
    vault: { bits: bits8(n), show: "read" },
    prompt: "Leggi la cassaforte: le ruote accese aggiungono il loro peso. Quanto segna il display?",
    answer: String(n),
    explain: [`Ruote accese: ${onWeights(n).join(" + ")}`, `= ${n}`],
    radio: pick(rng, RADIO_READ),
  };
}

export function vaultCode(rng, n) {
  return {
    kind: "text",
    base: 2,
    vault: { show: "ruler", value: n },
    prompt: `Il display della cassaforte segna ${n}. Scrivi la combinazione in binario, una cifra sotto ogni peso. Parti da sinistra: se il peso ci sta in quello che resta, scrivi 1 e toglilo; se non ci sta, scrivi 0.`,
    answer: E.toBin(n),
    explain: [`Ruote da 128 a 1: ${nibbles(bits8(n))}`, `Senza zeri iniziali: ${E.toBin(n)}`, `Valore: ${onWeights(n).join(" + ")} = ${n}`],
    radio: pick(rng, RADIO_CODE),
  };
}

// La serie di riscaldamento: si parte da UNA ruota alla volta e si sale fino a 8 ruote.
export function buildWarmupMission(rng) {
  const plan = [
    vaultBuild(rng, 1, "Ogni ruota ha un peso. Ruota accesa = 1: aggiunge il suo peso. Ruota spenta = 0: non aggiunge niente. Per fare 1 accendi solo la ruota con il peso 1 (la più a destra)."),
    vaultBuild(rng, 2, "I pesi raddoppiano a ogni ruota: 1, 2, 4, 8… Per fare 2 basta la ruota del 2."),
    vaultBuild(rng, 3, "Per fare 3 non c'è una ruota sola: ne servono due insieme, 1 + 2."),
    vaultRead(rng, rint(rng, 3, 7)),
    vaultBuild(rng, rint(rng, 4, 7), "Guarda il codice binario sotto il display: ogni ruota accesa è un 1."),
    vaultCode(rng, rint(rng, 5, 15)),
    vaultBuild(rng, rint(rng, 8, 15)),
    vaultRead(rng, rint(rng, 9, 31)),
    vaultBuild(rng, rint(rng, 16, 63)),
    vaultCode(rng, rint(rng, 64, 255)),
  ];
  return plan.map((q, i) => ({ id: i + 1, ...q }));
}
