// Il caveau di un capitolo (boss): bonus che si offre quando il capitolo è superato alla perfezione.
// Tre passaggi, niente stelle: 1 le ruote (cassaforte difficile), 2 una domanda del capitolo, 3 la combinazione in binario.
// Un errore ferma il tentativo e non toglie niente: il caveau resta lì e si può ritentare.

import * as E from "./engine.mjs";
import * as Q from "./questions.mjs";
import * as O from "./operations.mjs";
import * as V from "./vault.mjs";
import { chapterTopics } from "./progress.mjs";
import { lessonQuestionsFor } from "./lessons.mjs";

const { rint } = Q;
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export const BOSS_NAME = {
  warm: "Il Garage", c1: "Il Molo dei Robot", c2: "Il Vicolo dei Bit", conv: "Il Ponte",
  ops: "La Torre dei Conti", basi: "Il Faro Sedici", virgola: "Il Lungomare",
};
export const STEP_LABELS = ["Ruote", "Domanda", "Combinazione"];

// Calcolo in binario a livello compito, con risposta in binario.
function binaryOp(rng) {
  const op = pick(rng, ["+", "−", "×", ":"]);
  let a, b, want, tail;
  if (op === "+") { a = rint(rng, 30, 120); b = rint(rng, 30, 120); want = a + b; }
  else if (op === "−") { a = rint(rng, 100, 255); b = rint(rng, 20, a - 1); want = a - b; }
  else if (op === "×") { a = rint(rng, 8, 15); b = rint(rng, 8, 15); want = a * b; }
  else { b = rint(rng, 3, 9); want = rint(rng, 5, 25); a = want * b; tail = "il quoziente"; }
  const A = E.toBin(a), B = E.toBin(b);
  return {
    kind: "text", base: 2, topic: "ops-boss",
    prompt: `Calcola in binario: ${A} ${op} ${B}   (scrivi ${tail ?? "il risultato"} in binario)`,
    answer: E.toBin(want),
    explain: [`${A} = ${a}, ${B} = ${b}`, `${a} ${op} ${b} = ${want}`, `${want} in binario = ${E.toBin(want)}`],
    radio: "Converti, opera, verifica: le tre mosse non cambiano nemmeno davanti a un caveau.",
  };
}

// Una domanda a livello massimo, del capitolo del caveau. Solo risposta singola (scelta o testo): niente esercizi a passaggi.
export function bossQuestion(rng, chapterId) {
  const topics = chapterTopics(chapterId);
  switch (chapterId) {
    case "warm": return V.vaultRead(rng, rint(rng, 100, 255));
    case "conv": return rng() < 0.5 ? Q.decToBin(rng, 1) : Q.binToDec(rng, 1);
    case "ops": return binaryOp(rng);
    case "basi": return rng() < 0.5 ? O.groupConversion(rng, 1) : O.baseOperation(rng, rng() < 0.5 ? 8 : 16, 1);
    case "virgola": return rng() < 0.5 ? O.pointConversion(rng, 1) : O.orderMixed(rng, 1);
    default: { // capitoli di teoria: una domanda a scelta multipla di un argomento qualsiasi del capitolo
      const q = lessonQuestionsFor(rng, pick(rng, topics).id);
      if (!q) throw new RangeError(`capitolo senza domande: ${chapterId}`);
      return q;
    }
  }
}

export function buildBoss(rng, chapterId) {
  if (!BOSS_NAME[chapterId]) throw new RangeError(`capitolo sconosciuto: ${chapterId}`);
  const steps = [
    { label: STEP_LABELS[0], q: V.vaultBuild(rng, rint(rng, 64, 255)) },
    { label: STEP_LABELS[1], q: bossQuestion(rng, chapterId) },
    { label: STEP_LABELS[2], q: V.vaultCode(rng, rint(rng, 128, 255)) },
  ];
  return { chapter: chapterId, name: BOSS_NAME[chapterId], steps };
}
