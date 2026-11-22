// Argomenti, capitoli e scelta adattiva delle domande.
// Il giocatore non sceglie capitoli: gioca. Qui si decide cosa proporgli e si tiene traccia di
// argomenti toccati, superati e bocciati, e di quanti capitoli del materiale sono coperti.

import * as P from "./profiles.mjs";
import { WINDOW, nextStats } from "./profiles.mjs";
import * as Q from "./questions.mjs";
import * as O from "./operations.mjs";
import * as V from "./vault.mjs";
import { lessonQuestionsFor } from "./lessons.mjs";

// ---------- Capitoli e argomenti (dal materiale: scheda lezione 1, libro pp. 2-4 e 19-20, compiti) ----------

// I capitoli seguono l'ordine del corso. Il riscaldamento (n = 0) è la serie di casseforti con cui si parte.
export const CHAPTERS = [
  { id: "warm", n: 0, title: "Riscaldamento: la cassaforte", source: "Pesi e ruote: il binario girando le ruote" },
  { id: "c1", n: 1, title: "Ragionare per algoritmi", source: "Libro cap. 1 (pp. 2-4) e scheda della lezione 1" },
  { id: "c2", n: 2, title: "Bit, byte e sistemi di numerazione", source: "Libro cap. 2 (pp. 19-20) e scheda della lezione 1" },
  { id: "conv", n: 3, title: "Conversioni decimale ⇄ binario", source: "Libro p. 20 e compito 2: pesi, divisioni, quanti bit servono" },
  { id: "ops", n: 4, title: "Operazioni in binario", source: "Compiti 3-9: + − × :" },
  { id: "basi", n: 5, title: "Ottale ed esadecimale", source: "Compiti 6-8" },
  { id: "virgola", n: 6, title: "Numeri con la virgola e confronti", source: "Compito 9" },
];

// needs: argomenti da aver già provato (almeno 3 domande) e non bocciati prima che questo compaia.
// focus: le operazioni nelle varie basi sono il cuore dell'app, quindi pesano di più. theory: domande a scelta multipla, pesano meno.
export const TOPICS = [
  { id: "cassaforte", title: "La cassaforte: ruote e pesi", chapter: "warm", needs: [] },
  { id: "istruzioni-robot", title: "Istruzioni per il robot", chapter: "c1", needs: [], theory: true },
  { id: "dati-informazioni", title: "Dati e informazioni", chapter: "c1", needs: [], theory: true },
  { id: "bit-byte", title: "Bit, byte e multipli", chapter: "c2", needs: ["cassaforte"], theory: true },
  { id: "sistemi-posizionali", title: "Sistemi posizionali: base 10 e base 2", chapter: "c2", needs: ["cassaforte"], theory: true },
  { id: "algoritmo-pensiero", title: "Algoritmi e pensiero computazionale", chapter: "c1", needs: ["istruzioni-robot"], theory: true },
  { id: "informatica-termini", title: "Che cos'è l'informatica", chapter: "c1", needs: ["dati-informazioni"], theory: true },
  { id: "storia", title: "Storia dell'informatica", chapter: "c1", needs: ["informatica-termini"], theory: true },
  { id: "bit-valori", title: "Quanti valori con n bit", chapter: "c2", needs: ["bit-byte"], theory: true },
  { id: "dec-bin", title: "Da decimale a binario", chapter: "conv", needs: ["cassaforte"] },
  { id: "bin-dec", title: "Da binario a decimale", chapter: "conv", needs: ["cassaforte"] },
  { id: "bit-necessari", title: "Quanti bit servono", chapter: "conv", needs: ["bit-valori", "dec-bin"] },
  { id: "addizione", title: "Addizione in binario", chapter: "ops", needs: ["dec-bin", "bin-dec"], focus: true },
  { id: "sottrazione", title: "Sottrazione in binario", chapter: "ops", needs: ["addizione"], focus: true },
  { id: "moltiplicazione", title: "Moltiplicazione in binario", chapter: "ops", needs: ["addizione"], focus: true },
  { id: "divisione", title: "Divisione in binario", chapter: "ops", needs: ["sottrazione", "moltiplicazione"], focus: true },
  { id: "ott-esa", title: "Ottale ed esadecimale ⇄ binario", chapter: "basi", needs: ["bin-dec", "addizione"], focus: true },
  { id: "ops-basi", title: "Operazioni in base 8 e 16", chapter: "basi", needs: ["addizione", "ott-esa"], focus: true },
  { id: "virgola", title: "Numeri con la virgola", chapter: "virgola", needs: ["dec-bin", "bin-dec", "addizione"], focus: true },
  { id: "confronto-basi", title: "Confronto tra numeri in basi diverse", chapter: "virgola", needs: ["ott-esa", "bin-dec"], focus: true },
];

export const topicById = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
export const WARMUP_QUESTIONS = 6; // le prime domande in assoluto sono sempre casseforti

// ---------- Stato di un argomento ----------

export const STATUS = { NEW: "non-toccato", TOUCHED: "toccato", PASSED: "superato", FAILED: "da-ripassare" };
export const STATUS_LABEL = { "non-toccato": "Non toccato", toccato: "Toccato", superato: "Superato", "da-ripassare": "Da ripassare" };
export const PASS_LEVEL = 0.7; // per superare un argomento "numerico" bisogna essere arrivati a numeri da compito
export const FAIL_MIN_ATTEMPTS = 5;

const windowAcc = (stats) => {
  const w = stats?.window ?? [];
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
};

// Superato: almeno 4 domande, 4 giuste su 5 (le ultime) e, se ci sono numeri di mezzo, difficoltà arrivata a livello compito.
// Da ripassare: almeno 5 domande e meno della metà giuste (ultime 5). Altrimenti toccato.
// `topic` serve a sapere se è teoria (niente livello di difficoltà da raggiungere).
export function statusOf(stats, topic = null) {
  if (!stats || stats.attempts === 0) return STATUS.NEW;
  const acc = windowAcc(stats);
  const w = stats.window ?? [];
  const levelOk = topic?.theory ? true : (stats.level ?? 0) >= PASS_LEVEL;
  if (stats.attempts >= 4 && w.length >= 4 && acc >= 0.8 && levelOk) return STATUS.PASSED;
  if (stats.attempts >= FAIL_MIN_ATTEMPTS && acc < 0.5) return STATUS.FAILED;
  return STATUS.TOUCHED;
}
export const statusFor = (player, id) => statusOf(player.topics?.[id], topicById[id]);

// Un argomento si apre quando i suoi prerequisiti sono stati provati (almeno 3 domande) e non vanno male
// (meno della metà giuste nelle ultime risposte): chi non ha capito le basi non viene portato avanti.
// Un argomento già aperto non si richiude.
export const isStruggling = (st) => (st?.attempts ?? 0) >= 3 && windowAcc(st) < 0.5;
const struggling = isStruggling;
export const isUnlocked = (topic, topics) =>
  (topics[topic.id]?.attempts ?? 0) > 0 || topic.needs.every((id) => (topics[id]?.attempts ?? 0) >= 3 && !struggling(topics[id]));

// Prerequisiti che ancora impediscono di aprire un argomento (per dire "Si apre dopo: …").
export const blockingNeeds = (topic, topics) => topic.needs.filter((id) => (topics[id]?.attempts ?? 0) < 3 || isStruggling(topics[id]));

// ---------- Scelta dell'argomento ----------

const DAY = 86_400_000;
export function topicWeight(topic, stats, { last = null, now = Date.now() } = {}) {
  const status = statusOf(stats, topic);
  let w = { [STATUS.NEW]: 3, [STATUS.FAILED]: 4, [STATUS.TOUCHED]: 2.5, [STATUS.PASSED]: 0.5 }[status];
  if (status === STATUS.PASSED && stats.lastAt && now - stats.lastAt > 7 * DAY) w *= 2; // ripasso dopo una settimana
  if (topic.focus) w *= 1.6;
  if (topic.theory) w *= 0.55;
  if (topic.id === last) w *= 0.25;
  return w;
}

// ---------- Un capitolo alla volta ----------
// Il giocatore sceglie il capitolo: dentro conta l'ordine dei prerequisiti, ma quelli di altri capitoli no
// (è lui che ha deciso di entrare qui). Il capitolo comincia con la teoria degli argomenti da cui si parte.

export const chapterTopics = (chapterId) => TOPICS.filter((t) => t.chapter === chapterId);
const sameChapterNeeds = (topic) => topic.needs.filter((n) => topicById[n].chapter === topic.chapter);
// Prerequisiti ancora mancanti DENTRO il capitolo (per dire "Si apre dopo: …" nella schermata del capitolo).
export const blockingNeedsIn = (topic, topics) => sameChapterNeeds(topic).filter((id) => (topics[id]?.attempts ?? 0) < 3 || isStruggling(topics[id]));
export const isUnlockedIn = (topic, topics) =>
  (topics[topic.id]?.attempts ?? 0) > 0 || sameChapterNeeds(topic).every((id) => (topics[id]?.attempts ?? 0) >= 3 && !isStruggling(topics[id]));
// Gli argomenti da cui il capitolo parte: nessun prerequisito dentro il capitolo.
export const initialTopics = (chapterId) => chapterTopics(chapterId).filter((t) => sameChapterNeeds(t).length === 0);

export function pickTopicInChapter(player, rng, chapterId, { last = null, now = Date.now() } = {}) {
  const topics = player.topics ?? {};
  const open = chapterTopics(chapterId).filter((t) => isUnlockedIn(t, topics));
  if (!open.length) throw new RangeError(`capitolo sconosciuto o vuoto: ${chapterId}`);
  const weights = open.map((t) => topicWeight(t, topics[t.id], { last: open.length > 1 ? last : null, now }));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < open.length; i++) {
    r -= weights[i];
    if (r <= 0) return open[i].id;
  }
  return open[open.length - 1].id;
}

export function pickTopic(player, rng, { last = null, force = null, now = Date.now() } = {}) {
  if (force) return force;
  const topics = player.topics ?? {};
  if ((topics.cassaforte?.attempts ?? 0) < WARMUP_QUESTIONS) return "cassaforte";
  const open = TOPICS.filter((t) => isUnlocked(t, topics));
  const weights = open.map((t) => topicWeight(t, topics[t.id], { last, now }));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < open.length; i++) {
    r -= weights[i];
    if (r <= 0) return open[i].id;
  }
  return open[open.length - 1].id;
}

// ---------- Costruzione della domanda ----------

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// La difficoltà (0 = facile, 1 = valori dei compiti) segue le risposte del giocatore su quell'argomento:
// sale se risponde bene, scende se sbaglia, e parte sempre dal riscaldamento.
export function buildQuestion(topicId, rng, player, { exclude = new Set() } = {}) {
  const st = player.topics?.[topicId];
  const t = clamp01(st?.level ?? 0);
  let q;
  switch (topicId) {
    case "cassaforte": {
      const i = st?.attempts ?? 0;
      if (i < 10) { q = V.buildWarmupMission(rng)[i]; break; }
      const n = Q.rampInt(rng, t, [8, 63], [64, 255]);
      const kind = Math.floor(rng() * 3);
      q = kind === 0 ? V.vaultBuild(rng, n) : kind === 1 ? V.vaultRead(rng, n) : V.vaultCode(rng, n);
      break;
    }
    case "dec-bin": q = Q.decToBin(rng, t); break;
    case "bin-dec": q = Q.binToDec(rng, t); break;
    case "bit-necessari": q = Q.bitsFor(rng, t); break;
    case "addizione": q = O.guidedOperation(rng, "+", t); break;
    case "sottrazione": q = O.guidedOperation(rng, "−", t); break;
    case "moltiplicazione": q = O.guidedOperation(rng, "×", t); break;
    case "divisione": q = rng() < 0.5 ? O.guidedOperation(rng, ":", t) : O.binaryDivision(rng, t); break;
    case "ott-esa": q = O.groupConversion(rng, t); break;
    case "ops-basi": q = O.baseOperation(rng, rng() < 0.5 ? 8 : 16, t); break;
    case "virgola": q = O.pointConversion(rng, t); break;
    case "confronto-basi": q = O.orderMixed(rng, t); break;
    default: q = lessonQuestionsFor(rng, topicId, exclude);
  }
  if (!q) throw new RangeError(`argomento sconosciuto: ${topicId}`);
  // evita di ripetere subito la stessa identica domanda
  for (let tries = 0; tries < 4 && exclude.has(q.prompt) && topicId !== "cassaforte"; tries++) {
    q = buildQuestion(topicId, rng, { ...player, topics: { ...player.topics, [topicId]: { ...(st ?? {}), attempts: (st?.attempts ?? 0) } } }, { exclude: new Set() });
    break;
  }
  return { ...q, topic: topicId };
}

export function nextQuestion(player, rng, opts = {}) {
  const topic = !opts.force && opts.chapter ? pickTopicInChapter(player, rng, opts.chapter, opts) : pickTopic(player, rng, opts);
  return buildQuestion(topic, rng, player, opts);
}

// Registra l'esito di una domanda e, se l'argomento diventa "superato" per la prima volta, ne ricorda la data.
export function recordResult(store, key, topic, outcome, now = Date.now()) {
  let next = P.recordResult(store, key, topic, outcome, now);
  const player = P.currentPlayer({ ...next, current: key });
  if (player && statusFor(player, topic) === STATUS.PASSED) next = P.markPassed(next, key, topic, now);
  return next;
}

// "12/11" (giorno/mese) per una data in millisecondi.
export const formatDay = (ts) => { const d = new Date(ts); return `${d.getDate()}/${d.getMonth() + 1}`; };

// Riga per chi ha già superato un argomento ma ora non lo è più (o non è più perfetto): il traguardo resta visibile.
export function wasPassedNote(row) {
  if (!row.passedAt || row.status === STATUS.PASSED) return "";
  const errs = (row.window ?? []).filter((x) => x === 0).length;
  const recent = errs === 0 ? "" : errs === 1 ? "un errore recente" : `${errs} errori recenti`;
  return `Superato il ${formatDay(row.passedAt)}${recent ? `: ${recent}` : ""}, rifai giuste le prossime per tornarci`;
}

// ---------- Stato di un capitolo ----------

export const PERFECT_LEVEL = 0.9; // per gli argomenti con i numeri: difficoltà arrivata quasi al massimo
export const CHAPTER_STATE = {
  PERFECT: "perfetto", PASSED: "superato", REVIEW: "da-ripassare", COVERED: "coperto", STARTED: "in-corso", NEW: "da-iniziare",
};
export const CHAPTER_LABEL = {
  perfetto: "Superato alla perfezione", superato: "Superato", "da-ripassare": "Da ripassare",
  coperto: "Tutto provato", "in-corso": "In corso", "da-iniziare": "Da iniziare",
};

// La perfezione misura come si va ADESSO, non la storia: gli errori fatti imparando non si portano dietro per sempre.
// Argomento perfetto: superato, ultime 5 risposte tutte giuste e, se ci sono i numeri, difficoltà ≥ 0,9.
// Superato alla perfezione: tutti gli argomenti perfetti. Superato non alla perfezione: tutti superati ma non tutti perfetti.
// Da ripassare: almeno un argomento da ripassare.
// Coperto: tutti gli argomenti toccati ma non ancora tutti superati. In corso: qualcuno toccato. Da iniziare: nessuno.
export function chapterState(ch) {
  if (ch.complete) return ch.mastered ? CHAPTER_STATE.PERFECT : CHAPTER_STATE.PASSED;
  if (ch.failed > 0) return CHAPTER_STATE.REVIEW;
  if (ch.covered) return CHAPTER_STATE.COVERED;
  if (ch.touched > 0) return CHAPTER_STATE.STARTED;
  return CHAPTER_STATE.NEW;
}

// Un argomento è perfetto se è superato, le ultime 5 risposte sono tutte giuste e (se numerico) la difficoltà è ≥ 0,9.
export function isPerfect(stats, topic = null) {
  if (statusOf(stats, topic) !== STATUS.PASSED) return false;
  const w = stats.window ?? [];
  return w.length >= WINDOW && w.slice(-WINDOW).every((x) => x === 1) && (topic?.theory || (stats.level ?? 0) >= PERFECT_LEVEL);
}

// Riga di spiegazione sotto il nome del capitolo, nella home.
export function chapterDetail(ch) {
  switch (ch.state) {
    case CHAPTER_STATE.PERFECT: return "Tutti gli argomenti superati, ultime risposte tutte giuste";
    case CHAPTER_STATE.PASSED: {
      // La frase dice cosa serve davvero: errori nelle ultime risposte → rispondere giusto alle prossime;
      // finestra pulita ma numeri ancora facili → continuare, arriveranno quelli difficili.
      const names = (list) => list.slice(0, 2).map((t) => `«${t.title}»`).join(" e ") + (list.length > 2 ? "…" : "");
      const imperfect = ch.topics.filter((t) => !t.perfect);
      const withErrors = imperfect.filter((t) => (t.window ?? []).includes(0));
      const clean = imperfect.filter((t) => !(t.window ?? []).includes(0));
      if (withErrors.length && !clean.length) return `Tutti superati. Per la perfezione: rispondi giusto alle prossime domande di ${names(withErrors)}`;
      if (!withErrors.length && clean.every((t) => !t.theory)) return `Tutti superati. Per la perfezione: continua con ${names(clean)}, arriveranno i numeri più difficili`;
      return `Tutti superati. Per la perfezione: continua a rispondere giusto su ${names(imperfect)}`;
    }
    case CHAPTER_STATE.REVIEW: return `${ch.failed} ${ch.failed === 1 ? "argomento" : "argomenti"} da ripassare`;
    case CHAPTER_STATE.COVERED: return `Toccati tutti: ${ch.passed} su ${ch.total} superati`;
    case CHAPTER_STATE.STARTED: return `${ch.touched} su ${ch.total} argomenti toccati`;
    default: return "Non ancora iniziato";
  }
}

// Stato del caveau di un capitolo: vinto (trofeo, per sempre), da tentare (capitolo alla perfezione), chiuso.
export const VAULT_STATE = { WON: "won", READY: "ready", CLOSED: "closed" };
// Una volta aperto (capitolo alla perfezione) resta da tentare finché non si vince, anche se poi la perfezione si perde.
export function vaultState(chapter, player) {
  if (player?.trophies?.[chapter.id]) return VAULT_STATE.WON;
  if (player?.vaultsOpened?.[chapter.id] || chapter.state === CHAPTER_STATE.PERFECT) return VAULT_STATE.READY;
  return VAULT_STATE.CLOSED;
}

// Ricorda i caveau che si sono aperti (capitoli ora alla perfezione). Restituisce lo stesso store se non c'è niente da fare.
export function syncVaults(store, key, now = Date.now()) {
  const player = store.players.find((p) => p.key === key);
  if (!player) return store;
  let next = store;
  for (const ch of summarize(player).chapters) if (ch.state === CHAPTER_STATE.PERFECT) next = P.markVaultOpened(next, key, ch.id, now);
  return next;
}

// ---------- Riepilogo per la schermata "I miei progressi" ----------

export function summarize(player) {
  const topics = player.topics ?? {};
  const rows = TOPICS.map((t) => {
    const st = topics[t.id];
    return { ...t, status: statusOf(st, t), perfect: isPerfect(st, t), passedAt: st?.passedAt ?? 0, window: st?.window ?? [], attempts: st?.attempts ?? 0, correct: st?.correct ?? 0, level: st?.level ?? 0, unlocked: isUnlockedIn(t, topics) };
  });
  const chapters = CHAPTERS.map((c) => {
    const list = rows.filter((r) => r.chapter === c.id);
    const touched = list.filter((r) => r.status !== STATUS.NEW).length;
    const passed = list.filter((r) => r.status === STATUS.PASSED).length;
    const failed = list.filter((r) => r.status === STATUS.FAILED).length;
    const attempts = list.reduce((a, r) => a + r.attempts, 0);
    const correct = list.reduce((a, r) => a + r.correct, 0);
    const ch = { ...c, topics: list, total: list.length, touched, passed, failed, covered: touched === list.length, complete: passed === list.length, mastered: list.every((r) => r.perfect), accuracy: attempts ? correct / attempts : 0, attempts };
    ch.state = chapterState(ch);
    // il capitolo era stato superato (ogni argomento superato almeno una volta) ma ora non lo è più
    const everAll = list.every((r) => r.passedAt > 0);
    ch.wasPassedAt = everAll ? Math.max(...list.map((r) => r.passedAt)) : 0;
    ch.vault = vaultState(ch, player);
    ch.trophyAt = player.trophies?.[ch.id] ?? 0;
    // superato almeno una volta (ogni argomento ha passedAt) o lo è adesso: il traguardo raggiunto non si perde, nemmeno per il negozio
    ch.everPassed = everAll || ch.complete;
    ch.wasNote = everAll && !ch.complete ? `Era superato il ${formatDay(ch.wasPassedAt)}: rifai giuste le prossime domande per tornarci` : "";
    ch.label = CHAPTER_LABEL[ch.state];
    ch.detail = chapterDetail(ch);
    return ch;
  });
  const count = (s) => rows.filter((r) => r.status === s).length;
  return {
    rows, chapters,
    counts: { total: rows.length, touched: rows.length - count(STATUS.NEW), passed: count(STATUS.PASSED), failed: count(STATUS.FAILED), inProgress: count(STATUS.TOUCHED), untouched: count(STATUS.NEW) },
  };
}

// Applica l'esito di una domanda a uno `stats` (comodo per le simulazioni nei test).
export { nextStats };
