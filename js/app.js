import * as Q from "./questions.mjs";
import { checkAnswer } from "./questions.mjs";
import { judgeStep } from "./operations.mjs";
import * as G from "./progress.mjs";
import * as T from "./teach.mjs";
import * as Boss from "./boss.mjs";
import * as X from "./exam.mjs";
import * as S from "./shop.mjs";
import * as Economy from "./economy.mjs";
import * as FX from "./fx.mjs";
import * as P from "./profiles.mjs";
import { WEIGHTS, bits8, nibbles, onWeights } from "./vault.mjs";

window.__fx = FX; // utile per provare gli effetti dal browser
import { colopHTML, starsHTML, progressHTML, baseBadge, nTag } from "./colop.mjs";

const MAX_STARS = 5;
const { CASH_PER_RIGHT, CASH_PER_STEP, rewardFor } = Economy;
const OP_STEP = 2; // nei passaggi guidati, il terzo è l'operazione in binario (con la colonna)
const app = document.getElementById("app");
const MASCOT = (name) => `design/mascot/r0b-${name}.svg`;

// La porta del caveau e la coppa vanno messe INLINE (la CSS deve raggiungere volantino, bulloni e coppa): si caricano una volta.
const ASSETS = { door: "", cup: "", mascots: {} };
const MASCOT_NAMES = ["neutro", "esulta", "triste", "perplesso", "sete", "podio"];
async function loadAssets() {
  const get = async (url) => { try { const r = await fetch(url); return r.ok ? await r.text() : ""; } catch { return ""; } };
  const [door, cup, ...faces] = await Promise.all([get("design/vault-door.svg"), get("design/trophy.svg"), ...MASCOT_NAMES.map((n) => get(MASCOT(n)))]);
  ASSETS.door = door; ASSETS.cup = cup;
  MASCOT_NAMES.forEach((n, i) => { ASSETS.mascots[n] = faces[i]; });
}

// R0b INLINE: le skin del negozio sono variabili CSS (--mascot-*) e funzionano solo così. Se l'SVG non è ancora arrivato, ripiega sull'immagine.
function mascot(name, cls = "", style = "") {
  const svg = ASSETS.mascots[name];
  if (!svg) return `<img${cls ? ` class="${cls}"` : ""} src="${MASCOT(name)}" alt=""${style ? ` style="${style}"` : ""}>`;
  return svg.replace('role="img" class="mascot"', `aria-hidden="true" class="mascot${cls ? ` ${cls}` : ""}"${style ? ` style="${style}"` : ""}`);
}
const ICON_KEY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12.5 12H21M18 12v3.5M21 12v2.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const ICON_CUP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0zM12 14v4M8 20h8M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const save = {
  read() {
    try { return localStorage.getItem(P.STORE_KEY); } catch { return null; }
  },
  write(text) {
    try { localStorage.setItem(P.STORE_KEY, text); } catch { /* storage non disponibile: si gioca senza salvare */ }
  },
};

// Giocatori e progressi: restano solo su questo dispositivo.
let store = P.parseStore(save.read());
const commit = (next) => { store = next; save.write(P.serialize(store)); };
const me = () => P.currentPlayer(store) ?? { name: "", cash: 0, missionsDone: 0, done: {} };
let game = null;
// Lezioni già mostrate in questa sessione (per giocatore): non si ripetono se si ricomincia una partita non iniziata.
const lessonsSeen = new Map(); // chiave giocatore:argomento -> quante pagine della lezione sono già state mostrate
const lessonKey = (topic) => `${store.current}:${topic}`;

const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Punto sulle migliaia sempre, anche a quattro cifre ($ 1.000): toLocaleString("it-IT") lo omette.
const money = (n) => "$ " + String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const num = (s) => `<span class="num">${esc(s)}</span>`;

const ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_KO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
const ICON_HINT = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>';

// ---------- Radio in auto (Radio Overflow, DJ Nibble) ----------
const EQ = '<svg class="radio__eq" viewBox="0 0 20 16" aria-hidden="true"><rect x="1" y="2" width="3" height="14" rx="1"/><rect x="6" y="2" width="3" height="14" rx="1"/><rect x="11" y="2" width="3" height="14" rx="1"/><rect x="16" y="2" width="3" height="14" rx="1"/></svg>';
const DJ_LINES = [
  "101.1010 in binario è 5,625: una frequenza su cui non trasmette nessuno. Per questo non ci trova nessuno.",
  "Anche i computer sbagliano. Solo, molto più in fretta.",
  "Notizia dal porto: il 10 è arrivato in ritardo. In binario era in anticipo di otto.",
  "Ci sono 10 tipi di persone: chi capisce il binario e chi no. Voi siete in ottima compagnia.",
  "Meteo di Neon Bay: serata limpida, 0 nuvole e 1 luna.",
  "Il caveau della banca ha 8 ruote. Quelle del mio furgone, purtroppo, 4.",
  "Questo brano è dedicato a tutti gli zeri: senza di voi i numeri sarebbero solo uno.",
  "Un byte entra in un bar: ordina otto bit e se ne va con un po' di resto.",
];
const djLine = () => DJ_LINES[Math.floor(Math.random() * DJ_LINES.length)];
const radioFull = (line = djLine()) => `<aside class="radio" aria-label="Radio Overflow, 101.1010 FM"><div class="radio__dial">${EQ}<span class="radio__freq">101.1010<small>FM</small></span><span class="radio__name">Radio Overflow</span><span class="radio__live">In onda</span></div><p class="radio__line"><b class="radio__dj">DJ Nibble</b>${esc(line)}</p></aside>`;
const radioCompact = (line) => `<p class="radio radio--compact">${EQ}<span class="radio__freq">101.1010</span><span class="radio__line">${esc(line)}</span></p>`;

// Schermata che usa le immagini del caveau (home, capitolo): si ridisegna quando le immagini sono arrivate.
let refreshScreen = null;

// Skin di R0b (classe sul body) e sfondo (data-bg su <html>) scelti nel negozio.
function applyLook() {
  const look = S.lookOf(P.currentPlayer(store));
  document.body.classList.forEach((c) => { if (c.startsWith("skin--")) document.body.classList.remove(c); });
  if (look.skin !== S.FREE.skin) document.body.classList.add(`skin--${look.skin}`);
  if (look.bg === S.FREE.bg) delete document.documentElement.dataset.bg; else document.documentElement.dataset.bg = look.bg;
}

function render(node) {
  refreshScreen = null;
  applyLook();
  app.replaceChildren(node);
  window.scrollTo({ top: 0 });
  node.querySelector("input.answer__input, input.ruler__cell, .choice, .dial, .btn")?.focus?.({ preventScroll: true });
}

// ---------- Schermate ----------

// Finestra di conferma accessibile (<dialog>): annulla è il pulsante predefinito, Esc annulla.
function confirmDialog({ title, text, ok = "Conferma", cancel = "Annulla", danger = false }) {
  return new Promise((resolve) => {
    if (typeof HTMLDialogElement === "undefined" || !document.createElement("dialog").showModal) return resolve(window.confirm(`${title}\n${text}`));
    const d = document.createElement("dialog");
    d.className = "confirm";
    d.innerHTML = `<form method="dialog"><h2 class="confirm__title">${esc(title)}</h2><p class="confirm__text">${esc(text)}</p>
      <div class="confirm__actions"><button class="btn btn--ghost" value="cancel" id="c-cancel">${esc(cancel)}</button><button class="btn ${danger ? "btn--danger" : "btn--primary"}" value="ok" id="c-ok">${esc(ok)}</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener("close", () => { const yes = d.returnValue === "ok"; d.remove(); resolve(yes); });
    d.showModal();
    d.querySelector("#c-cancel").focus();
  });
}

// ---------- Nome del giocatore ----------

function nameScreen(message = "") {
  const others = store.players;
  render(el(`
    <section class="home">
      ${mascot("neutro", "home__mascot")}
      <h1 class="home__title">Neon <span>Bay</span></h1>
      <p class="home__line"><b>Come ti chiami?</b></p>
      <p class="home__rules">Scrivi un nome: ci salviamo partita e progressi. Restano solo su questo dispositivo.</p>
      <form class="answer name-form" id="name-form" novalidate>
        <label class="sr-only" for="name">Il tuo nome</label>
        <input class="answer__input answer__input--text" id="name" name="name" maxlength="20" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="es. Neri" aria-describedby="name-error">
        <button class="btn btn--primary" type="submit" id="name-go">Inizia</button>
      </form>
      <p class="name-error" id="name-error" role="alert"${message ? "" : " hidden"}>${esc(message)}</p>
      ${others.length ? `<p class="home__rules">Oppure riprendi come:</p>
      <ul class="choices choices--stack home__missions">${others.map((p) => `<li><button class="choice" type="button" data-player="${esc(p.key)}"><span><b>${esc(p.name)}</b><br><span class="home__sub">${money(p.cash)} · ${p.missionsDone} ${p.missionsDone === 1 ? "missione" : "missioni"}</span></span></button></li>`).join("")}</ul>` : ""}
    </section>`));
  const input = document.getElementById("name");
  document.getElementById("name-form").onsubmit = (e) => {
    e.preventDefault();
    const r = P.enter(store, input.value);
    if (!r.ok) {
      const err = document.getElementById("name-error");
      err.textContent = r.error; err.hidden = false;
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    commit(r.store);
    home(r.isNew ? `Piacere, ${r.player.name}!` : `Ciao di nuovo, ${r.player.name}!`);
  };
  app.querySelectorAll("[data-player]").forEach((b) => (b.onclick = () => {
    const r = P.enter(store, store.players.find((p) => p.key === b.dataset.player)?.name ?? "");
    if (r.ok) { commit(r.store); home(`Ciao di nuovo, ${r.player.name}!`); }
  }));
}

// ---------- Home ----------

function home(greeting = "") {
  const player = P.currentPlayer(store);
  if (!player) return nameScreen();
  const shopNews = S.newItems(P.currentPlayer(store), shopCtx(P.currentPlayer(store))).length;
  const synced = G.syncVaults(store, store.current);
  if (synced !== store) commit(synced); // salvataggi precedenti: un capitolo già perfetto apre il suo caveau
  const sum = G.summarize(P.currentPlayer(store));
  const c = sum.counts;
  const started = c.touched > 0;
  // il primo capitolo non ancora superato è il consiglio per il prossimo passo
  const next = sum.chapters.find((ch) => !ch.complete);
  render(el(`
    <section class="home">
      ${mascot("neutro", "home__mascot")}
      <h1 class="home__title">Neon <span>Bay</span></h1>
      <p class="home__hello" role="status">${esc(greeting || `Ciao, ${player.name}!`)}</p>
      <p class="home__line">Il tuo conto: <b>${money(player.cash)}</b> · Partite completate: <b>${player.missionsDone}</b></p>
      ${started ? statsHTML(c) : ""}
      <h2 class="board__sub">Scegli un capitolo</h2>
      <p class="home__rules">${started ? (next ? `Consigliato: <b>${esc(chapterTitle(next))}</b>.` : "Hai superato tutti i capitoli!") : "Ogni capitolo comincia con una breve teoria, poi arrivano le domande. Si parte dal riscaldamento con le casseforti."}</p>
      ${coursesHTML(sum, next?.id)}
      <button class="btn btn--primary btn--block" id="exam-open" type="button">Esame finale${player.exams.length ? ` · ultimo voto ${X.formatGrade(player.exams.at(-1).grade)}` : ""}</button>
      <button class="btn btn--ghost btn--block" id="shop-open" type="button">Negozio · ${money(player.cash)}${shopNews ? ` <span class="btn__badge">${shopNews} novità</span>` : ""}</button>
      <button class="btn btn--ghost btn--block" id="progress" type="button">I miei progressi, argomento per argomento</button>
      <p class="home__rules">Ogni errore accende una stella di ricercato. A cinque stelle la partita è finita. Tre risposte giuste di fila ne spengono una.</p>
      ${radioFull(DJ_LINES[0])}
      <details class="profile">
        <summary>Profilo e salvataggio</summary>
        <p class="profile__text">Giocatore: <b>${esc(player.name)}</b>. Conto ${money(player.cash)}, ${player.missionsDone} ${player.missionsDone === 1 ? "partita completata" : "partite completate"}. Partita e progressi sono salvati su questo dispositivo.</p>
        ${trophiesHTML(player)}
        <div class="profile__actions">
          <button class="btn btn--ghost" type="button" id="switch">Cambia giocatore</button>
          <button class="btn btn--ghost" type="button" id="reset">Azzera i progressi</button>
          <button class="btn btn--ghost btn--danger-outline" type="button" id="delete">Elimina questo giocatore</button>
        </div>
      </details>
    </section>`));
  refreshScreen = () => home(greeting);
  document.getElementById("shop-open").onclick = () => enterShop();
  document.getElementById("exam-open").onclick = () => examIntro();
  document.getElementById("progress").onclick = () => progressScreen();
  app.querySelectorAll("[data-chapter]").forEach((b) => (b.onclick = () => chapterScreen(b.dataset.chapter)));
  document.getElementById("switch").onclick = () => { commit(P.signOut(store)); nameScreen(); };
  document.getElementById("reset").onclick = async () => {
    const yes = await confirmDialog({
      title: `Azzerare i progressi di ${player.name}?`,
      text: `Conto (${money(player.cash)}), partite completate e risultati di tutti gli argomenti tornano a zero. Il nome resta. Non si può annullare.`,
      ok: "Sì, azzera", danger: true,
    });
    if (!yes) return;
    commit(P.resetPlayer(store, player.key));
    home("Progressi azzerati: si riparte da zero.");
  };
  document.getElementById("delete").onclick = async () => {
    const yes = await confirmDialog({
      title: `Eliminare ${player.name}?`,
      text: "Il giocatore e tutti i suoi progressi spariscono da questo dispositivo. Non si può annullare.",
      ok: "Sì, elimina", danger: true,
    });
    if (!yes) return;
    commit(P.deletePlayer(store, player.key));
    nameScreen();
  };
}

// Una partita = 10 domande scelte dal gioco in base ai risultati (o 8 su un solo argomento, per allenarsi).
function startGame({ force = null, chapter = null, theory = false } = {}) {
  const ch = chapter ?? (force ? G.topicById[force]?.chapter : null);
  game = { force, chapter: ch, count: force ? 8 : 10, q: null, last: null, seen: new Set(), touched: new Map(), qWrong: false, qUnits: 0, qOkUnits: 0, recorded: false, index: 0, step: 0, stars: 0, streak: 0, earned: 0, rightCount: 0, totalUnits: 0, answered: false, givens: [], marks: [], delta: 0, lit: false };
  game.chBefore = Object.fromEntries(G.summarize(P.currentPlayer(store)).chapters.map((c) => [c.id, { state: c.state, vault: c.vault }]));
  nextQ();
  // Un capitolo nuovo comincia con la breve teoria degli argomenti da cui parte; poi le domande.
  const intro = theory && ch ? T.introPlan(G.initialTopics(ch).map((t) => t.id)) : [];
  if (intro.length) {
    intro.forEach((it) => lessonsSeen.set(lessonKey(it.topic), it.until + 1));
    // "Salta la teoria" salta davvero tutto: le lezioni di questi argomenti si considerano viste, anche le pagine rimaste
    const skipAll = () => { intro.forEach((it) => lessonsSeen.set(lessonKey(it.topic), T.lessonFor(it.topic).length)); present(); };
    showLessonSequence(intro, () => present(), "Salta la teoria", skipAll);
  } else {
    present();
  }
}

// La prima volta che un argomento compare si mostra la lezione (si può saltare); poi la domanda.
function present() {
  const topic = game.q.topic;
  const first = (P.currentPlayer(store).topics?.[topic]?.attempts ?? 0) === 0;
  const shown = lessonsSeen.get(lessonKey(topic)) ?? 0;
  if (first && T.hasLesson(topic) && shown < T.lessonFor(topic).length) {
    lessonsSeen.set(lessonKey(topic), T.lessonFor(topic).length);
    showLesson(topic, () => showQuestion(), { from: shown }); // le pagine non ancora viste
  } else {
    showQuestion();
  }
}

// ---------- Lezione in micro-pagine ----------

function lessonHTML(topicId, i, skipLabel = "Salta la lezione", from = 0, until = null) {
  const pages = T.lessonFor(topicId);
  const end = until ?? pages.length - 1;
  const pg = pages[i];
  const topic = G.topicById[topicId];
  const chapter = G.CHAPTERS.find((c) => c.id === topic.chapter);
  const last = i === end;
  const paras = (pg.paras ?? []).map((p) => `<p>${esc(p)}</p>`).join("");
  const key = pg.key ? `<p class="lesson__key">${esc(pg.key)}</p>` : "";
  const algo = pg.algo?.length ? `<ol class="algo">${pg.algo.map((a) => `<li${a.hl || a.iff ? ` class="${[a.hl && "is-highlight", a.iff && "is-if"].filter(Boolean).join(" ")}"` : ""}>${esc(a.t)}</li>`).join("")}</ol>` : "";
  const shownPages = pages.slice(from, end + 1);
  const pager = shownPages.map((_, k) => `<i class="${k + from < i ? "is-done" : k + from === i ? "is-current" : ""}"></i>`).join("");
  return `<div class="lesson-wrap" data-lesson-topic="${esc(topicId)}"><article class="lesson">
    <header class="lesson__head"><p class="lesson__kicker">Lezione · ${esc(chapter.title)}</p><h1 class="lesson__title">${esc(topic.title)}</h1></header>
    <div class="lesson__scene">${mascot(pg.mascot ?? "neutro", "lesson__mascot")}<p class="bubble">${esc(pg.bubble)}</p></div>
    <div class="lesson__body">${paras}${key}${algo}</div>
    <footer class="lesson__foot"><span class="pager" aria-label="Pagina ${i - from + 1} di ${shownPages.length}">${pager}</span>
      ${i > from ? '<button class="btn btn--ghost" id="lesson-back" type="button">Indietro</button>' : ""}
      <button class="btn btn--primary" id="lesson-next" type="button">${last ? "Ho capito" : "Avanti"}</button></footer>
  </article><p class="lesson__skip"><button class="btn btn--ghost" id="lesson-skip" type="button">${esc(skipLabel)}</button></p></div>`;
}

// opts: from (prima pagina da mostrare), until (ultima), skip (cosa fa "Salta"), skipLabel, i (pagina corrente)
function showLesson(topicId, done, opts = {}) {
  const pages = T.lessonFor(topicId);
  if (!pages) return done();
  const from = opts.from ?? 0;
  const until = opts.until ?? pages.length - 1;
  const i = opts.i ?? from;
  const skip = opts.skip ?? done;
  const skipLabel = opts.skipLabel ?? "Salta la lezione";
  if (from > until) return done();
  render(el(lessonHTML(topicId, i, skipLabel, from, until)));
  document.getElementById("lesson-next").focus({ preventScroll: true });
  document.getElementById("lesson-next").onclick = () => (i < until ? showLesson(topicId, done, { ...opts, i: i + 1 }) : done());
  document.getElementById("lesson-back")?.addEventListener("click", () => showLesson(topicId, done, { ...opts, i: i - 1 }));
  document.getElementById("lesson-skip").onclick = () => skip();
}

// Più lezioni di fila (la teoria di un capitolo): "Salta la teoria" le salta tutte.
// items: [{ topic, until? }] oppure semplici id di argomento (lezione intera).
function showLessonSequence(items, done, skipLabel = "Salta la teoria", onSkip = done) {
  const list = items.map((it) => (typeof it === "string" ? { topic: it } : it));
  const run = (k) => (k >= list.length ? done() : showLesson(list[k].topic, () => run(k + 1), { until: list[k].until, skip: onSkip, skipLabel: list.length > 1 ? skipLabel : "Salta la lezione" }));
  run(0);
}

function nextQ() {
  const q = G.nextQuestion(P.currentPlayer(store), Math.random, { last: game.last, force: game.force, chapter: game.chapter, exclude: game.seen });
  game.seen.add(q.prompt);
  game.last = q.topic;
  game.q = q;
}

// Registra l'esito della domanda sull'argomento (una sola volta): tutta giusta, oppure con almeno un errore.
function recordQuestion() {
  const topic = game.q.topic;
  if (!topic || game.recorded) return;
  game.recorded = true;
  // esito = quota di passaggi giusti (1 per le domande a risposta singola): non conta come sbaglio il passaggio che "scopre l'errore"
  const frac = game.qUnits ? game.qOkUnits / game.qUnits : game.qWrong ? 0 : 1;
  const before = G.statusFor(P.currentPlayer(store), topic);
  const t = game.touched.get(topic) ?? { before, n: 0, ok: 0, res: [] };
  t.n += 1;
  t.res.push(frac >= P.OK_FRACTION);
  if (frac >= P.OK_FRACTION) t.ok += 1;
  game.touched.set(topic, t);
  commit(G.syncVaults(G.recordResult(store, store.current, topic, frac), store.current)); // e ricorda se un caveau si è aperto
}

const SPEAKER = (on) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/>${on ? '<path d="M15.5 9a4 4 0 010 6M18 6.5a8 8 0 010 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}</svg>`;

function hudHTML() {
  const delta = game.delta ? ` <span class="cash__delta">+${game.delta}</span>` : "";
  const on = !FX.isMuted();
  return `<div class="hud">${starsHTML(game.stars, MAX_STARS, game.lit)}<span class="hud__end"><button class="sound-toggle" type="button" aria-pressed="${on}" aria-label="${on ? "Suoni attivi: tocca per disattivarli" : "Suoni disattivati: tocca per attivarli"}">${SPEAKER(on)}</button><span class="cash" aria-label="Contanti: ${me().cash + game.earned} dollari"><span class="cash__n">${money(me().cash + game.earned)}</span>${delta}</span></span></div>`;
}

function wireSoundToggle(root) {
  const b = root.querySelector(".sound-toggle");
  if (!b) return;
  b.onclick = () => {
    FX.setMuted(!FX.isMuted());
    if (!FX.isMuted()) FX.play("coin");
    const on = !FX.isMuted();
    b.setAttribute("aria-pressed", on);
    b.setAttribute("aria-label", on ? "Suoni attivi: tocca per disattivarli" : "Suoni disattivati: tocca per attivarli");
    b.innerHTML = SPEAKER(on);
  };
}

// Su iPhone "numeric" non ha la virgola: per le risposte con la virgola serve "decimal".
const ANSWER_ATTR = (base, withPoint) => (withPoint ? 'inputmode="decimal"' : base === 2 || base === 10 ? 'inputmode="numeric"' : 'inputmode="text" autocapitalize="characters"');

function answerForm(unit, label) {
  const base = unit.base ?? 10;
  const withPoint = /[.,]/.test(String(unit.answer ?? ""));
  const hint = withPoint ? "es. 1011,01" : base === 2 ? "es. 10110" : base === 16 ? "es. 3B" : "";
  return `<form class="answer" id="form"><label class="sr-only" for="ans">${esc(label)}</label><input class="answer__input" id="ans" ${ANSWER_ATTR(base, withPoint)} autocomplete="off" spellcheck="false" ${hint ? `placeholder="${hint}"` : ""}><button class="btn btn--primary" type="submit">Rispondi</button></form>`;
}

function opTitle(q) {
  const m = q.prompt.match(/^(.*?): (\S+) (\S) (\S+)$/);
  if (!m) return `<h1 class="op-title"><span class="op-title__name">${esc(q.prompt)}</span></h1>`;
  const [, name, x, sym, y] = m;
  const binary = /in binario/.test(name);
  const base = binary ? 2 : 10;
  return `<h1 class="op-title"><span class="op-title__name">${esc(name)}</span><span>${nTag(x, base)} ${esc(sym)} ${nTag(y, base)}</span>${binary ? "" : baseBadge(2, "in ")}</h1>`;
}

// ---------- Presentazione chiara delle domande con i numeri ----------
// Invece di una riga di testo con le basi tra parentesi: una frase breve, il numero grande con la sua base e la base della risposta.

const BASE_WORD = { 2: "binario", 8: "ottale", 10: "decimale", 16: "esadecimale" };
const OP_WORD = { "+": "la somma", "−": "la differenza", "×": "il prodotto", ":": "il quoziente" };

// Titolo breve della domanda: con una vista strutturata sostituisce il testo lungo (che resta in q.prompt per i dati e i test).
function viewTitle(q) {
  const v = q.view;
  if (!v) return q.prompt;
  if (v.kind === "order") return "Ordina dal più piccolo al più grande";
  if (v.kind === "calc") return "Fai il calcolo";
  return v.point ? "Converti il numero con la virgola" : "Converti il numero";
}

function viewHTML(q) {
  const v = q.view;
  if (!v) return "";
  if (v.kind === "convert") {
    return `<div class="q__code" aria-label="${esc(v.value)} in base ${v.from}">${esc(v.value)}<sub>${v.from}</sub></div>
      <p class="qview__to">Scrivilo in ${baseBadge(v.to)} <span class="qview__word">(${BASE_WORD[v.to]})</span></p>`;
  }
  if (v.kind === "calc") {
    return `<div class="q__code" aria-label="${esc(v.a)} ${esc(v.op)} ${esc(v.b)}, in base ${v.base}">${esc(v.a)}<sub>${v.base}</sub> ${esc(v.op)} ${esc(v.b)}<sub>${v.base}</sub></div>
      <p class="qview__to">Scrivi ${v.what ?? "il risultato"} in ${baseBadge(v.to)} <span class="qview__word">(${BASE_WORD[v.to]})</span></p>`;
  }
  return "";
}

// Ordinamento a schede: si toccano in ordine, dal più piccolo al più grande. La risposta è la sequenza dei numeri delle schede.
function orderHTML(q) {
  return `<div class="order" role="group" aria-label="Schede da ordinare">${q.view.items.map((it, k) => `
      <button class="order__item" type="button" data-i="${k + 1}" aria-pressed="false" aria-label="${esc(it.value)} in base ${it.base}">
        <span class="order__pos" aria-hidden="true"></span>
        <span class="order__num">${esc(it.value)}<sub>${it.base}</sub></span>
        <span class="order__base">${baseBadge(it.base)}</span>
        <span class="order__dec" hidden>= ${it.dec} in decimale</span>
      </button>`).join("")}</div>
    <p class="order__hint" id="order-hint">Tocca le schede in ordine: prima la più piccola, per ultima la più grande. Tocca di nuovo per toglierla.</p>
    <div class="row"><button class="btn btn--ghost" type="button" id="order-reset">Ricomincia</button><button class="btn btn--primary" type="button" id="order-go" disabled>Rispondi</button></div>`;
}

function wireOrder(root, onAnswer) {
  const items = [...root.querySelectorAll(".order__item")];
  const go = root.querySelector("#order-go");
  const picks = [];
  const paint = () => {
    items.forEach((b) => {
      const at = picks.indexOf(b.dataset.i);
      b.setAttribute("aria-pressed", at >= 0 ? "true" : "false");
      b.querySelector(".order__pos").textContent = at >= 0 ? String(at + 1) : "";
    });
    go.disabled = picks.length !== items.length;
    root.querySelector("#order-hint").textContent = picks.length === items.length ? "Tutte ordinate: controlla e premi «Rispondi»." : `Scelte ${picks.length} su ${items.length}. Tocca la prossima, più grande delle precedenti.`;
  };
  items.forEach((b) => (b.onclick = () => {
    const at = picks.indexOf(b.dataset.i);
    if (at >= 0) picks.splice(at, 1); else picks.push(b.dataset.i);
    paint();
  }));
  root.querySelector("#order-reset").onclick = () => { picks.length = 0; paint(); };
  go.onclick = () => { if (picks.length === items.length) onAnswer(picks.join("")); };
}

// Dopo la risposta: mostra il valore decimale di ogni scheda, così si vede perché quell'ordine.
function revealOrder(root, q, given) {
  root.querySelectorAll(".order__dec").forEach((d) => { d.hidden = false; d.textContent = d.textContent.replace(" in decimale", ""); });
  if (!q?.view?.items || !given) return;
  // ogni scheda: giusta se è nella posizione che le spetta per valore
  const sorted = q.view.items.map((it, k) => [k, it.dec]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  root.querySelectorAll(".order__item").forEach((b) => {
    const k = Number(b.dataset.i) - 1;
    const right = sorted.indexOf(k) === String(given).indexOf(String(k + 1));
    b.classList.add(right ? "is-correct" : "is-wrong");
  });
}

// Cassaforte a 8 ruote. bits = "01000101" la blocca in quella combinazione (domande di lettura).
function vaultHTML({ bits = null, lcd = "0", sum = true, code = true } = {}) {
  const locked = bits !== null;
  const dials = WEIGHTS.map((w, i) => {
    const on = locked && bits[i] === "1";
    return `<li><button class="dial" type="button" aria-pressed="${on}" data-w="${w}" aria-label="Ruota ${w}${locked ? (on ? " accesa" : " spenta") : ""}"${locked ? " disabled" : ""}><span class="dial__weight">${w}</span><span class="dial__wheel" aria-hidden="true"><span class="dial__track"><span>0</span><span>1</span></span></span></button></li>`;
  }).join("");
  return `<div class="vault" id="vault">
    <div class="vault__head"><span class="vault__label">Cassaforte</span><output class="vault__lcd" id="lcd" aria-live="polite">${lcd}</output></div>
    <ul class="vault__dials">${dials}</ul>
    ${sum ? '<p class="vault__sum" id="sum" aria-hidden="true">tutte a zero</p>' : '<p class="vault__sum" id="sum" aria-hidden="true"></p>'}
    ${code ? '<p class="vault__code" id="code">Codice binario: <b>0000 0000</b></p>' : ""}
  </div>`;
}

// Dopo la risposta, nelle domande con cassaforte bloccata, mostra display e somma.
function revealVault(q, ok) {
  const vault = document.getElementById("vault");
  if (!vault || !q.vault || q.vault.show !== "read") return;
  const value = WEIGHTS.reduce((a, w, i) => a + (q.vault.bits[i] === "1" ? w : 0), 0);
  vault.querySelector("#lcd").textContent = value;
  vault.querySelector("#sum").textContent = `${onWeights(value).join(" + ")} = ${value}`;
  vault.classList.toggle("is-open", ok);
}

// Ricomincia la partita o torna al menu. Se è già iniziata chiede conferma: i progressi salvati non cambiano.
function wireMissionTools(root) {
  const started = game.totalUnits > 0;
  const ask = async (title, text, ok) => !started || (await confirmDialog({ title, text, ok }));
  root.querySelector("#restart").onclick = async () => {
    if (await ask("Ricominciare la partita?", "Contanti e stelle di questa partita si azzerano e si riparte dalla prima domanda. I risultati già registrati sugli argomenti restano.", "Sì, ricomincia")) startGame({ force: game.force, chapter: game.chapter });
  };
  root.querySelector("#quit").onclick = async () => {
    if (await ask("Uscire dalla partita?", "I contanti di questa partita andranno persi. I risultati già registrati sugli argomenti restano.", "Sì, esci")) (game.chapter ? chapterScreen(game.chapter) : home());
  };
}

function showQuestion() {
  const q = game.q;
  game.answered = false;
  const kicker = `${esc(G.topicById[q.topic]?.title ?? "")} · domanda ${game.index + 1} di ${game.count}`;
  let body = "";
  let unit = q;

  if (q.kind === "guided") {
    unit = q.steps[game.step];
    const items = q.steps.map((s, i) => {
      if (i < game.step) {
        const m = game.marks[i] || {};
        const given = esc(game.givens[i] ?? "");
        const result = m.wrong ? `<s>${given}</s> → ${esc(m.correct)}` : given;
        return `<li class="step is-done${m.wrong ? " is-wrong" : ""}"><span class="step__label">${esc(s.label)}</span><span class="step__result">${result}</span></li>`;
      }
      if (i === game.step) {
        const withColumn = i === OP_STEP && q.column && q.column.op !== ":";
        return `<li class="step is-current"><span class="step__label">${esc(s.label)}</span><span class="step__result" aria-hidden="true">?</span>
          <div class="step__body">${withColumn ? colopHTML(q.column, { solved: false }) + `<p class="answer__hint">${q.column.op === "×" ? "Prodotti parziali sul quaderno, poi scrivi il risultato qui sotto." : "Scrivi il risultato qui sotto, tutto di fila."}</p>` : ""}${answerForm(s, s.label)}</div></li>`;
      }
      return `<li class="step"><span class="step__label">${esc(s.label)}</span><span class="step__result"></span></li>`;
    }).join("");
    body = `<article class="card">${opTitle(q)}<ol class="steps">${items}</ol></article><div id="fb"></div>`;
  } else if (q.kind === "choice") {
    const stack = q.options.some((o) => o.length > 14) ? " choices--stack" : "";
    const marks = ICON_OK.replace("<svg ", '<svg class="choice__mark choice__mark--ok" ') + ICON_KO.replace("<svg ", '<svg class="choice__mark choice__mark--ko" ');
    body = `<section class="q"><p class="q__kicker">${kicker}</p><h1 class="q__prompt">${esc(q.prompt)}</h1>
      <ul class="choices${stack}">${q.options.map((o) => `<li><button class="choice" type="button" data-v="${esc(o)}">${esc(o)}${marks}</button></li>`).join("")}</ul></section><div id="fb"></div>`;
  } else if (q.kind === "safe") {
    body = `<section class="q"><p class="q__kicker">${kicker}</p><h1 class="q__prompt">${esc(q.prompt)}</h1>
      ${q.hint ? `<p class="answer__hint">${esc(q.hint)}</p>` : ""}
      ${vaultHTML()}
      <button class="btn btn--primary btn--block" type="button" id="submit">Apri</button></section><div id="fb"></div>`;
  } else {
    const locked = !q.vault ? "" : q.vault.show === "ruler"
      ? `<div class="q__code">${q.vault.value}<sub>10</sub></div>
        <form class="ruler-form" id="form" novalidate><div class="ruler" role="group" aria-label="Pesi delle ruote e cifre della combinazione, da sinistra a destra">
          ${WEIGHTS.map((w) => `<span class="ruler__w">${w}</span>`).join("")}
          ${WEIGHTS.map((w) => `<input class="ruler__cell" inputmode="numeric" maxlength="1" pattern="[01]" placeholder=" " autocomplete="off" aria-label="Cifra sotto il peso ${w}">`).join("")}
        </div><button class="btn btn--primary btn--block" type="submit">Rispondi</button></form>`
      : vaultHTML({ bits: q.vault.bits, lcd: "?", sum: false, code: false });
    const entry = q.vault?.show === "ruler" ? "" : q.view?.kind === "order" ? orderHTML(q) : answerForm(q, "La tua risposta");
    body = `<section class="q"><p class="q__kicker">${kicker}</p><h1 class="q__prompt">${esc(viewTitle(q))}</h1>${q.hint ? `<p class="answer__hint">${esc(q.hint)}</p>` : ""}${viewHTML(q)}${locked}${entry}</section><div id="fb"></div>`;
  }

  const tools = `<div class="mission-tools"><button class="btn btn--ghost" type="button" id="restart">Ricomincia la partita</button><button class="btn btn--ghost" type="button" id="quit">Esci al menu</button></div>`;
  const node = el(`<div data-prompt="${esc(q.prompt)}">${hudHTML()}${progressHTML(game.index, game.count)}${body}${tools}</div>`);
  game.delta = 0; game.lit = false;
  render(node);
  wireSoundToggle(node);
  wireMissionTools(node);

  if (q.kind === "choice") {
    node.querySelectorAll(".choice").forEach((b) => (b.onclick = () => submit(q, b.dataset.v, b)));
  } else if (q.kind === "safe") {
    const lcd = node.querySelector("#lcd"), sum = node.querySelector("#sum"), vault = node.querySelector("#vault"), code = node.querySelector("#code b");
    const recompute = () => {
      const on = [...node.querySelectorAll('.dial[aria-pressed="true"]')].map((d) => Number(d.dataset.w));
      const total = on.reduce((a, b) => a + b, 0);
      lcd.textContent = total;
      sum.textContent = on.length ? `${on.join(" + ")} = ${total}` : "tutte a zero";
      if (code) code.textContent = nibbles(bits8(total));
      return total;
    };
    node.querySelectorAll(".dial").forEach((d) => (d.onclick = () => {
      if (game.answered) return;
      d.setAttribute("aria-pressed", d.getAttribute("aria-pressed") !== "true");
      recompute();
    }));
    node.querySelector("#submit").onclick = () => {
      const total = recompute();
      submit(q, total, null, () => vault.classList.toggle("is-open", total === q.value));
    };
  } else if (q.view?.kind === "order") {
    wireOrder(node, (given) => submit(unit, given));
  } else if (q.vault?.show === "ruler") {
    const cells = [...node.querySelectorAll(".ruler__cell")];
    cells.forEach((c, i) => {
      c.addEventListener("input", () => {
        c.value = c.value.replace(/[^01]/g, "").slice(-1);
        if (c.value && cells[i + 1]) cells[i + 1].focus();
      });
      c.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !c.value && cells[i - 1]) cells[i - 1].focus(); });
    });
    node.querySelector("#form").onsubmit = (e) => {
      e.preventDefault();
      const empty = cells.find((c) => c.value === "");
      if (empty) { empty.focus(); return; }
      submit(unit, cells.map((c) => c.value).join(""));
    };
  } else {
    node.querySelector("#form").onsubmit = (e) => { e.preventDefault(); submit(unit, node.querySelector("#ans").value); };
  }
}

// ---------- Risposta e feedback ----------

function feedbackHTML({ q, unit, isStep, verdict, moreSteps, failed, last }) {
  const ok = verdict.ok;
  const found = Boolean(verdict.discovered && !verdict.star); // la verifica ha scoperto un errore: indizio, non festa
  const variant = found ? "hint" : ok ? "ok" : "ko";
  const face = found ? "perplesso" : ok ? "esulta" : failed ? "triste" : "perplesso";
  const icon = found ? ICON_HINT : ok ? ICON_OK : ICON_KO;
  const gaveAnswer = verdict.headline.startsWith("Risposta giusta");
  const title = ok ? verdict.headline || "Esatto!" : gaveAnswer ? "Non è questa" : verdict.headline;
  const text = ok || found
    ? (verdict.note ? esc(verdict.note) : `Pulito. <span class="num">+${isStep ? CASH_PER_STEP : CASH_PER_RIGHT} $</span> sul conto.`)
    : gaveAnswer ? esc(verdict.headline).replace(/: (.*)$/, (_, v) => `: ${num(v)}`) : esc(verdict.note);

  const hasColumn = isStep ? q.column && q.column.op !== ":" : false;
  const opStep = isStep && game.step === OP_STEP && hasColumn;
  const lines = (arr) => arr.map((s) => `<li>${esc(s)}</li>`).join("");
  let extra = "";
  if (isStep && !ok && moreSteps && unit.explain) {
    extra = opStep
      ? `<details class="solution" open><summary>Rifacciamolo insieme</summary>${colopHTML(q.column, { solved: true })}<ol>${lines(unit.explain)}</ol></details>`
      : `<ol class="feedback__explain">${lines(unit.explain)}</ol>`;
  }
  if (!moreSteps) {
    const col = isStep && hasColumn ? colopHTML(q.column, { solved: true }) : "";
    extra += `<details class="solution"${ok ? "" : " open"}><summary>${ok ? "Rivediamo il conto" : "Rifacciamolo insieme"}</summary>${col}<ol>${lines(q.explain)}</ol></details>`;
  }
  const tip = !ok && verdict.star ? `<p class="feedback__tip">+1 stella ricercato. Tre risposte giuste di fila e se ne spegne una.</p>` : "";
  const radio = radioCompact(!moreSteps && q.radio ? q.radio : djLine());
  const next = failed ? "Vedi come è andata" : moreSteps ? "Prossimo passaggio" : last ? "Fine missione" : "Avanti";
  return `<div class="feedback feedback--inline feedback--${variant}" role="status">
    ${mascot(face, "feedback__mascot")}
    <p class="feedback__title">${icon}${esc(title)}</p>
    <p class="feedback__text">${text}</p>
    ${extra}${tip}${radio}
    <button class="btn btn--block" type="button" id="next">${next}</button>
  </div>`;
}

function submit(unit, given, clicked, afterJudge) {
  if (game.answered) return;
  if ((unit.kind === "text" || unit.kind === undefined) && String(given).trim() === "") return;
  game.answered = true;
  const q = game.q;
  const isStep = q.kind === "guided";

  let verdict;
  if (isStep) {
    game.givens[game.step] = String(given).trim();
    verdict = judgeStep(unit, game.givens, given);
  } else {
    const ok = checkAnswer(q, given);
    verdict = { ok, star: !ok, reward: ok, headline: ok ? "" : `Risposta giusta: ${q.kind === "safe" ? q.value : q.answer}`, note: "" };
  }
  game.totalUnits += 1;
  const starsBefore = game.stars;
  if (isStep) game.marks[game.step] = { wrong: !verdict.ok && !verdict.discovered, correct: unit.answer };

  if (verdict.reward) {
    const amount = rewardFor(isStep);
    game.earned += amount;
    game.delta = amount;
    game.rightCount += 1;
    game.streak += 1;
    if (game.streak % 3 === 0 && game.stars > 0) game.stars -= 1;
  } else if (verdict.star) {
    game.streak = 0;
    game.stars += 1;
    game.lit = true;
  }
  afterJudge?.();
  revealVault(q, verdict.ok);
  if (q.view?.kind === "order") revealOrder(app.firstElementChild, q, given);
  const cashBefore = me().cash + game.earned - (verdict.reward ? game.delta : 0);
  const starOff = verdict.reward && game.streak % 3 === 0 && game.stars < starsBefore;
  if (verdict.reward) FX.celebrate({ streak: game.streak, starOff });
  else if (verdict.star) FX.alarm(true);
  else FX.alarm(false);

  const root = app.firstElementChild;
  root.querySelectorAll("input, .dial, #submit, .choice, #form .btn, .order__item, #order-go, #order-reset").forEach((n) => (n.disabled = true));
  const form = root.querySelector("#form");
  if (form) form.classList.add(verdict.ok ? "is-correct" : verdict.discovered && !verdict.star ? "is-hint" : "is-wrong");
  if (q.vault?.show === "ruler" && !verdict.ok) {
    const want = bits8(q.vault.value);
    root.querySelectorAll(".ruler__cell").forEach((cell, i) => { if (cell.value !== want[i]) cell.classList.add("is-wrong"); });
  }
  if (q.kind === "choice") {
    root.querySelectorAll(".choice").forEach((b) => {
      if (b.dataset.v === q.answer) b.classList.add("is-correct");
      else if (b === clicked) b.classList.add("is-wrong");
    });
  }

  const failed = game.stars >= MAX_STARS;
  const moreSteps = isStep && game.step < q.steps.length - 1;
  const last = game.index === game.count - 1;
  if (!verdict.ok || verdict.star) game.qWrong = true;
  if (!(verdict.discovered && !verdict.star && !verdict.reward)) { game.qUnits += 1; if (verdict.reward) game.qOkUnits += 1; }
  if (!moreSteps || failed) recordQuestion();

  root.querySelector(".hud").outerHTML = hudHTML();
  wireSoundToggle(root);
  if (verdict.reward) FX.countUp(root.querySelector(".cash__n"), cashBefore, me().cash + game.earned, money);
  game.delta = 0; game.lit = false;
  root.querySelector("#fb").innerHTML = feedbackHTML({ q, unit, isStep, verdict, moreSteps, failed, last });
  const nb = root.querySelector("#next");
  nb.onclick = () => {
    if (failed) return finish(true);
    if (moreSteps) { game.step += 1; return showQuestion(); }
    if (last) return finish(false);
    game.index += 1; game.step = 0; game.givens = []; game.marks = []; game.qWrong = false; game.qUnits = 0; game.qOkUnits = 0; game.recorded = false;
    nextQ(); present();
  };
  nb.focus({ preventScroll: true });
  root.querySelector(".feedback").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// ---------- Componenti dei progressi (markup di design/components.css) ----------

const WORD = { "non-toccato": "Non toccato", toccato: "Toccato", superato: "Superato", "da-ripassare": "Da ripassare" };
// Nelle classi del design lo stato "da ripassare" si chiama ancora "bocciato".
const cls = (status) => (status === G.STATUS.FAILED ? "bocciato" : status);
const chip = (status, extra = "") => `<span class="chip chip--${cls(status)}${extra}">${WORD[status]}</span>`;
const RANK = { "non-toccato": 0, "da-ripassare": 1, toccato: 2, superato: 3 };

function statsHTML(c) {
  const item = (status, n, label) => `<li class="stats__item stats__item--${cls(status)}"><b>${n}</b>${label}</li>`;
  return `<ul class="stats" aria-label="Argomenti">${item("superato", c.passed, "superati")}${item("toccato", c.inProgress, "in corso")}${item("da-ripassare", c.failed, "da ripassare")}${item("non-toccato", c.untouched, "da toccare")}</ul>`;
}

// Linea dei capitoli (si guarda e basta): il nodo mostra sempre il numero, lo stato è una spilla/riempimento.
const METRO_LABEL = { warm: "Cassaforte", c1: "Algoritmi", c2: "Bit e byte", conv: "Dec → bin", ops: "Operazioni", basi: "Ottale / esa", virgola: "Virgola" };
const METRO_CLASS = { perfetto: "is-perfect", superato: "is-complete", "da-ripassare": "is-review", coperto: "is-covered", "in-corso": "is-started", "da-iniziare": "is-new" };
function metroHTML(sum) {
  const count = (st) => sum.chapters.filter((c) => c.state === st).length;
  const label = `Capitoli: ${count("perfetto")} superati alla perfezione, ${count("superato")} superati, ${count("da-ripassare")} da ripassare, ${count("coperto")} coperti, ${count("in-corso")} in corso, ${count("da-iniziare")} da iniziare`;
  return `<ol class="metro" style="--stops:${sum.chapters.length}" aria-label="${label}">${sum.chapters.map((ch) => `<li class="metro__stop ${METRO_CLASS[ch.state]}${ch.id === "ops" ? " is-hub" : ""}"><span class="metro__node" aria-hidden="true">${ch.n}</span><span class="metro__label">${METRO_LABEL[ch.id] ?? esc(ch.title)}</span></li>`).join("")}</ol>`;
}

// Icone dello stato di un capitolo: forma + testo, mai solo il colore.
const STATE_ICON = {
  perfetto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/></svg>',
  superato: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  "da-ripassare": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v7M12 17.5v.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  coperto: '<i class="state-dot state-dot--half" aria-hidden="true"></i>',
  "in-corso": '<i class="state-dot state-dot--ring" aria-hidden="true"></i>',
  "da-iniziare": '<i class="state-dot state-dot--dash" aria-hidden="true"></i>',
};
const justPerfect = new Set(); // capitoli diventati perfetti nell'ultima partita (il medaglione salta una volta)
// Nota del traguardo in pausa: testo sicuro con la data (12/11) in grassetto.
const wasHTML = (text) => esc(text).replace(/(\d{1,2}\/\d{1,2})/, "<b>$1</b>");
const chapterTitle = (ch) => (ch.n > 0 ? `${ch.n} · ${ch.title}` : ch.title);

// Elenco ordinato dei capitoli con lo stato di ciascuno: si vede subito dalla home.
function coursesHTML(sum, nextId = null) {
  const html = `<ol class="course" aria-label="Capitoli del corso, in ordine">${sum.chapters.map((ch) => `<li>
    <button class="course__item course__item--${ch.state}${justPerfect.has(ch.id) ? " is-new-state" : ""}" type="button" data-chapter="${ch.id}" aria-label="${esc(chapterTitle(ch))}: ${esc(ch.label)}. ${esc(ch.detail)}.${ch.vault === "ready" ? " Caveau aperto da tentare." : ch.vault === "won" ? " Trofeo del caveau conquistato." : ""}${ch.id === nextId ? " Consigliato." : ""} Apri il capitolo.">
      ${ch.vault === "ready" ? `<span class="course__vault course__vault--ready">${ICON_KEY}Caveau aperto</span>` : ch.vault === "won" ? `<span class="course__vault course__vault--won">${ICON_CUP}Trofeo</span>` : ""}
      <span class="course__n" aria-hidden="true">${ch.n > 0 ? ch.n : "0"}</span>
      <span class="course__main"><span class="course__title">${esc(ch.title)}${ch.id === nextId ? ' <span class="course__next">Consigliato</span>' : ""}</span><span class="course__detail">${esc(ch.detail)}</span>${ch.wasNote ? `<span class="course__was">${wasHTML(ch.wasNote)}</span>` : ""}</span>
      <span class="course__state course__state--${ch.state}">${STATE_ICON[ch.state]}<span>${esc(ch.label)}</span></span>
    </button></li>`).join("")}</ol>`;
  justPerfect.clear(); // il salto del medaglione avviene una volta sola
  return html;
}

function finish(failed) {
  if (!failed) { commit(P.recordMission(store, store.current, "gioca", game.earned)); FX.bigWin(); } else FX.play("ko");
  const player = P.currentPlayer(store);
  // capitoli che in questa partita sono diventati perfetti
  justPerfect.clear();
  const newlyPerfect = G.summarize(player).chapters.filter((c) => c.state === "perfetto" && game.chBefore?.[c.id]?.state !== "perfetto");
  newlyPerfect.forEach((c) => justPerfect.add(c.id));
  if (newlyPerfect.length) FX.toast(`${newlyPerfect.length === 1 ? "Capitolo" : "Capitoli"} ${newlyPerfect.map((c) => c.n).join(", ")}: superato alla perfezione!`);
  const entries = [...game.touched.entries()].map(([id, t]) => ({ id, t, after: G.statusFor(player, id) }));
  const delta = (e) => Math.sign(RANK[e.after] - RANK[e.t.before]); // 1 salito, 0 invariato, -1 sceso
  const ordered = [...entries.filter((e) => delta(e) > 0), ...entries.filter((e) => delta(e) === 0), ...entries.filter((e) => delta(e) < 0)];
  const rows = ordered.map((e) => {
    const d = delta(e);
    const pips = `<span class="pips" role="img" aria-label="${e.t.ok} su ${e.t.n} ${e.t.n === 1 ? "giusta" : "giuste"}">${e.t.res.map((ok) => `<i class="${ok ? "is-ok" : "is-ko"}"></i>`).join("")}</span>`;
    const change = d !== 0 ? `${chip(e.t.before, " chip--was")}<span class="topic__arrow" aria-label="diventa">→</span>${chip(e.after)}` : chip(e.after);
    return `<li class="topic topic--${cls(e.after)}${d > 0 ? " is-up" : d < 0 ? " is-down" : ""}"><div class="topic__main"><span class="topic__name">${esc(G.topicById[e.id]?.title ?? e.id)}</span>${pips}</div><span class="topic__change">${change}</span></li>`;
  }).join("");
  render(el(`
    <section class="home">
      ${mascot(failed ? "triste" : "podio", "home__mascot")}
      <h1 class="home__title">${failed ? "Beccato!" : "Partita <span>finita</span>"}</h1>
      <p class="home__line">${failed ? "Cinque stelle: la polizia ti ha preso. Il bottino resta sul banco." : `Hai incassato <b>${money(game.earned)}</b>.`}</p>
      <p class="home__rules">Risposte giuste: ${game.rightCount} su ${game.totalUnits}${failed ? "" : ` · Il tuo conto: ${money(me().cash)}`}</p>
      ${newlyPerfect.length ? `<p class="home__hello" role="status">★ ${newlyPerfect.map((c) => esc(c.title)).join(" · ")}: superato alla perfezione!</p>` : ""}
      ${G.summarize(player).chapters.filter((c) => c.vault === "ready" && game.chBefore?.[c.id]?.vault !== "ready").map((c) => `<section class="chapter-vault chapter-vault--ready"><span class="chapter-vault__icon">${ASSETS.door}</span><p class="chapter-vault__title">Il caveau ${c.n > 0 ? `del capitolo ${c.n}` : "del riscaldamento"} si è aperto: lo tenti?</p><p class="chapter-vault__text">Tre passaggi, niente stelle: se non riesce, riprovi quando vuoi.</p><button class="btn btn--block" type="button" data-boss="${c.id}">Tenta il caveau</button></section>`).join("")}
      ${rows ? `<h2 class="board__sub">Argomenti toccati in questa partita</h2><ul class="topics topics--summary">${rows}</ul>` : ""}
      ${radioFull()}
      <button class="btn btn--primary btn--block" id="again" type="button">${failed ? "Riprova" : game.force ? "Allenati ancora" : "Altre domande del capitolo"}</button>
      ${game.chapter ? `<button class="btn btn--ghost btn--block" id="to-chapter" type="button">Torna al capitolo</button>` : ""}
      <button class="btn btn--ghost btn--block" id="progress" type="button">I miei progressi</button>
      <button class="btn btn--ghost btn--block" id="menu" type="button">Tutti i capitoli</button>
    </section>`));
  document.getElementById("again").onclick = () => startGame({ force: game.force, chapter: game.chapter });
  app.querySelectorAll("[data-boss]").forEach((b) => (b.onclick = () => startBoss(b.dataset.boss)));
  document.getElementById("to-chapter")?.addEventListener("click", () => chapterScreen(game.chapter));
  document.getElementById("progress").onclick = () => progressScreen();
  document.getElementById("menu").onclick = () => home();
}

// ---------- I miei progressi: capitoli coperti e argomenti toccati, superati, da ripassare ----------

// Un capitolo con la sua barra e l'elenco degli argomenti (usato nei progressi e nella schermata del capitolo).
// Le righe degli argomenti di un capitolo (progressi e schermata del capitolo).
function topicRowsHTML(ch, player) {
  const title = (id) => G.topicById[id]?.title ?? id;
  return ch.topics.map((r) => {
    const needs = G.blockingNeedsIn(G.topicById[r.id], player.topics ?? {}).map(title);
    const can = r.unlocked || r.attempts > 0;
    const score = r.attempts ? `${r.correct} su ${r.attempts} ${r.attempts === 1 ? "giusta" : "giuste"}` : can ? "Mai provato" : `Si apre dopo: ${esc(needs.join(", "))}`;
    return `<li class="topic topic--${cls(r.status)}${can ? "" : " is-locked"}"><div class="topic__main"><span class="topic__name">${esc(r.title)}</span><span class="topic__score">${score}</span>${G.wasPassedNote(r) ? `<span class="topic__was">${wasHTML(G.wasPassedNote(r))}</span>` : ""}</div>${chip(r.status)}${can ? `<button class="btn btn--ghost topic__train" type="button" data-train="${r.id}" aria-label="Allenati su ${esc(r.title)}">Allenati</button>` : ""}${T.hasLesson(r.id) ? `<button class="btn btn--ghost topic__train" type="button" data-lesson="${r.id}" aria-label="Rivedi la lezione: ${esc(r.title)}">Lezione</button>` : ""}</li>`;
  }).join("");
}

const BADGE_CLASS = { perfetto: " is-perfect", superato: " is-complete", "da-ripassare": " is-review", coperto: " is-covered", "in-corso": " is-started", "da-iniziare": "" };
const barHTML = (ch) => {
  const pct = (n) => Math.round((n / ch.total) * 100);
  const inProgress = ch.touched - ch.passed - ch.failed;
  return `<div class="chapter__bar" role="img" aria-label="${ch.passed} superati, ${inProgress} in corso, ${ch.failed} da ripassare su ${ch.total}"><i class="is-passed" style="width:${pct(ch.passed)}%"></i><i class="is-touched" style="width:${pct(inProgress)}%"></i><i class="is-failed" style="width:${pct(ch.failed)}%"></i></div>`;
};

// Un capitolo con la sua barra e l'elenco degli argomenti (nei progressi).
function chapterBlockHTML(ch, player) {
  return `<article class="chapter" id="chapter-${ch.id}"><header class="chapter__head"><h2 class="chapter__title">${esc(chapterTitle(ch))}</h2><span class="chapter__badge${BADGE_CLASS[ch.state]}">${esc(ch.label)}</span></header>
    <p class="chapter__src">${esc(ch.source)}</p>
    ${barHTML(ch)}
    <p class="chapter__count"><b>${ch.touched}</b> toccati su ${ch.total} · <b>${ch.passed}</b> ${ch.passed === 1 ? "superato" : "superati"}</p>${ch.wasNote ? `<p class="chapter__was">${wasHTML(ch.wasNote)}</p>` : ""}
    <ul class="topics">${topicRowsHTML(ch, player)}</ul></article>`;
}

// I pulsanti "Allenati" e "Lezione" degli argomenti: servono sia nei progressi sia nella schermata del capitolo.
function wireTopicButtons(back) {
  app.querySelectorAll("[data-train]").forEach((b) => (b.onclick = () => startGame({ force: b.dataset.train })));
  app.querySelectorAll("[data-lesson]").forEach((b) => (b.onclick = () => showLesson(b.dataset.lesson, () => back(b.dataset.lesson))));
}

function progressScreen(focusChapter = null) {
  const player = P.currentPlayer(store);
  if (!player) return nameScreen();
  const sum = G.summarize(player);
  render(el(`
    <section class="board">
      <h1 class="board__title">I miei progressi</h1>
      ${statsHTML(sum.counts)}
      ${metroHTML(sum)}
      <ul class="rules" aria-label="Come funzionano gli stati">
        <li><b>Superato:</b> almeno 4 giuste nelle ultime 5, con numeri da compito.</li>
        <li><b>Alla perfezione:</b> tutti gli argomenti superati, ultime 5 tutte giuste e, per gli esercizi con i numeri, anche quelli più difficili.</li>
        <li><b>Da ripassare:</b> meno della metà giuste nelle ultime 5 (dopo almeno 5 domande).</li>
        <li>Negli esercizi a passaggi conta quanti passaggi fai giusti.</li>
        <li>Lo stato segue come vai adesso: se sbagli di nuovo un capitolo può scendere, ma la data in cui l'avevi superato resta segnata.</li>
      </ul>
      ${sum.chapters.map((ch) => chapterBlockHTML(ch, player)).join("")}
      <button class="btn btn--primary btn--block" id="back" type="button">Torna ai capitoli</button>
    </section>`));
  document.getElementById("back").onclick = () => home();
  if (focusChapter) document.getElementById(`chapter-${focusChapter}`)?.scrollIntoView({ block: "start" });
  wireTopicButtons((topic) => progressScreen(G.topicById[topic].chapter));
}

// ---------- Schermata di un capitolo: teoria, domande, caveau, argomenti ----------

function vaultSectionHTML(ch) {
  if (ch.vault === "won") {
    return `<section class="chapter-vault chapter-vault--won"><span class="chapter-vault__icon">${ASSETS.cup}</span><p class="chapter-vault__title">Caveau aperto ✓</p><p class="chapter-vault__text">Trofeo conquistato il <b>${G.formatDay(ch.trophyAt)}</b> · ${money(P.vaultReward(ch.id))}</p></section>`;
  }
  if (ch.vault === "ready") {
    return `<section class="chapter-vault chapter-vault--ready"><span class="chapter-vault__icon">${ASSETS.door}</span><p class="chapter-vault__title">Il caveau si è aperto</p><p class="chapter-vault__text">Tre passaggi, niente stelle: se non riesce, riprovi quando vuoi.</p><button class="btn btn--block" type="button" data-boss="${ch.id}">Tenta il caveau</button></section>`;
  }
  return `<section class="chapter-vault chapter-vault--closed"><span class="chapter-vault__icon">${ASSETS.door}</span><p class="chapter-vault__title">Caveau chiuso</p><p class="chapter-vault__text">Supera il capitolo alla perfezione e il caveau si apre.</p></section>`;
}

function chapterScreen(id) {
  const player = P.currentPlayer(store);
  if (!player) return nameScreen();
  const ch = G.summarize(player).chapters.find((c) => c.id === id);
  if (!ch) return home();
  const fresh = ch.touched === 0;
  const all = G.chapterTopics(id).filter((t) => T.hasLesson(t.id)).map((t) => t.id);
  const startLabel = fresh ? "Inizia il capitolo" : ch.complete ? "Rigioca il capitolo" : "Continua con le domande";
  const flow = `<ol class="flow" aria-label="Come funziona"><li class="flow__step ${fresh ? "is-current" : "is-done"}"><b>${fresh ? "1" : "✓"}</b>Teoria breve</li><li class="flow__step ${fresh ? "" : "is-current"}"><b>2</b>Domande</li></ol>`;
  render(el(`
    <section class="chapter-page">
      <button class="chapter-page__back" id="back-top" type="button">Capitoli</button>
      <header class="chapter-hero chapter-hero--${ch.state}">
        <span class="chapter-hero__n" aria-hidden="true">${ch.n}</span>
        <div><p class="chapter-hero__kicker">${ch.n > 0 ? `Capitolo ${ch.n}` : "Riscaldamento"}</p><h1 class="chapter-hero__title">${esc(ch.title)}</h1><p class="chapter-hero__src">${esc(ch.source)}</p></div>
        <div class="chapter-hero__status"><span class="chapter__badge${BADGE_CLASS[ch.state]}" id="chapter-state">${esc(ch.label)}</span><p class="chapter-hero__detail">${esc(ch.detail)}</p></div>
        ${barHTML(ch)}
        <p class="chapter__count"><b>${ch.touched}</b> toccati su ${ch.total} · <b>${ch.passed}</b> ${ch.passed === 1 ? "superato" : "superati"}</p>${ch.wasNote ? `<p class="chapter__was">${wasHTML(ch.wasNote)}</p>` : ""}
      </header>
      <div class="chapter-cta">
        ${flow}
        <button class="btn btn--primary btn--block" id="start-chapter" type="button">${startLabel}</button>
        ${all.length ? `<button class="btn btn--ghost btn--block" id="review-theory" type="button">Rivedi la teoria (${all.length} ${all.length === 1 ? "lezione" : "lezioni"})</button>` : ""}
      </div>
      ${vaultSectionHTML(ch)}
      <section class="chapter-page__topics" id="chapter-${ch.id}"><h2>Argomenti</h2><ul class="topics">${topicRowsHTML(ch, player)}</ul></section>
      <button class="btn btn--ghost btn--block" id="back" type="button">Torna ai capitoli</button>
    </section>`));
  refreshScreen = () => chapterScreen(id);
  document.getElementById("start-chapter").onclick = () => startGame({ chapter: id, theory: fresh });
  document.getElementById("review-theory")?.addEventListener("click", () => showLessonSequence(all, () => chapterScreen(id), "Salta la teoria"));
  document.getElementById("back").onclick = () => home();
  document.getElementById("back-top").onclick = () => home();
  app.querySelectorAll("[data-boss]").forEach((b) => (b.onclick = () => startBoss(b.dataset.boss)));
  wireTopicButtons(() => chapterScreen(id));
}

// ---------- Il caveau del capitolo (boss): tre passaggi, niente stelle, tre tentativi ----------

let boss = null; // { chapter, name, steps, i, left }

function startBoss(chapterId) {
  const player = P.currentPlayer(store);
  if (!player || player.trophies?.[chapterId]) return chapterScreen(chapterId); // già vinto: niente da rifare
  boss = { ...Boss.buildBoss(Math.random, chapterId), i: 0 };
  showBossStep();
}

const bossNote = () => `Nessuna stella in gioco. Hai ancora ${boss.left} ${boss.left === 1 ? "tentativo" : "tentativi"}: se sbagli, ripeti solo questo passaggio con una domanda nuova.`;

function bossShell({ step, open = false, title, task, note = true }) {
  const ch = G.CHAPTERS.find((c) => c.id === boss.chapter);
  return `<section class="boss${open ? " is-open" : ""}" data-step="${step}">
    <header class="boss__head"><p class="boss__kicker">Caveau · ${ch.n > 0 ? `Capitolo ${ch.n}` : "Riscaldamento"}</p><h1 class="boss__title">${esc(title)}</h1></header>
    <div class="boss__stage">${ASSETS.door}</div>
    <ol class="boss__steps">${boss.steps.map((s, k) => `<li class="${open || k < boss.i ? "is-done" : k === boss.i ? "is-current" : ""}">${esc(s.label)}</li>`).join("")}</ol>
    <div class="boss__task">${task}</div>
    ${note ? `<p class="boss__note" id="boss-note">${esc(bossNote())}</p>` : ""}
    ${open ? "" : '<p class="lesson__skip"><button class="btn btn--ghost" id="boss-quit" type="button">Esci dal caveau</button></p>'}
  </section>`;
}

const choiceMarks = () => ICON_OK.replace("<svg ", '<svg class="choice__mark choice__mark--ok" ') + ICON_KO.replace("<svg ", '<svg class="choice__mark choice__mark--ko" ');

// La prova di un passaggio: ruote a display coperto, domanda (scelta, testo o due scelte) o combinazione a 8 cifre.
function bossTaskHTML(q, i) {
  const head = `<p class="q__kicker" style="margin:0 0 8px">Passaggio ${i + 1} di 3</p><p class="q__prompt" style="margin:0 0 var(--sp-3)">${esc(viewTitle(q))}</p>${q.hint && q.kind !== "safe" ? `<p class="answer__hint">${esc(q.hint)}</p>` : ""}${viewHTML(q)}`;
  if (q.kind === "safe") return `${head}${vaultHTML({ lcd: "?", sum: false, code: false })}<button class="btn btn--primary btn--block" id="boss-submit" type="button">Apri</button>`;
  if (q.view?.kind === "order") return `${head}${orderHTML(q)}`;
  if (q.kind === "multi") {
    return `${head}${q.parts.map((p, k) => `<div class="boss-part" data-part="${k}"><p class="q__prompt" style="margin:var(--sp-3) 0 var(--sp-2);font-size:var(--fs-md)">${k + 1}. ${esc(p.prompt)}</p>
      <ul class="choices choices--stack">${p.options.map((o) => `<li><button class="choice" type="button" aria-pressed="false" data-part="${k}" data-v="${esc(o)}">${esc(o)}${choiceMarks()}</button></li>`).join("")}</ul></div>`).join("")}
      <button class="btn btn--primary btn--block" id="boss-multi" type="button" disabled style="margin-top:var(--sp-3)">Rispondi</button>`;
  }
  if (q.kind === "choice") return `${head}<ul class="choices choices--stack">${q.options.map((o) => `<li><button class="choice" type="button" data-v="${esc(o)}">${esc(o)}${choiceMarks()}</button></li>`).join("")}</ul>`;
  if (q.vault?.show === "ruler") {
    return `${head}<div class="q__code">${q.vault.value}<sub>10</sub></div>
      <form class="ruler-form" id="boss-form" novalidate><div class="ruler" role="group" aria-label="Pesi delle ruote e cifre della combinazione, da sinistra a destra">
        ${WEIGHTS.map((w) => `<span class="ruler__w">${w}</span>`).join("")}
        ${WEIGHTS.map((w) => `<input class="ruler__cell" inputmode="numeric" maxlength="1" pattern="[01]" placeholder=" " autocomplete="off" aria-label="Cifra sotto il peso ${w}">`).join("")}
      </div><button class="btn btn--primary btn--block" type="submit">Rispondi</button></form>`;
  }
  const locked = q.vault?.show === "read" ? vaultHTML({ bits: q.vault.bits, lcd: "?", sum: false, code: false }) : "";
  return `${head}${locked}${answerForm(q, "La tua risposta").replace('id="form"', 'id="boss-form"')}`;
}

function showBossStep() {
  const q = boss.steps[boss.i].q;
  render(el(`<div>${bossShell({ step: boss.i + 1, title: boss.name, task: bossTaskHTML(q, boss.i) })}</div>`));
  const root = app.firstElementChild;
  root.querySelector("#boss-quit").onclick = () => chapterScreen(boss.chapter);
  const answer = (given, clicked) => bossAnswer(q, given, clicked);

  if (q.kind === "safe") {
    // display coperto: niente somma né codice in tempo reale; il numero si scopre solo premendo «Apri»
    const total = () => [...root.querySelectorAll('.dial[aria-pressed="true"]')].reduce((a, d) => a + Number(d.dataset.w), 0);
    root.querySelectorAll(".dial").forEach((d) => (d.onclick = () => d.setAttribute("aria-pressed", d.getAttribute("aria-pressed") !== "true")));
    root.querySelector("#boss-submit").onclick = () => { const t = total(); root.querySelector("#lcd").textContent = t; answer(t); };
  } else if (q.kind === "multi") {
    const picks = q.parts.map(() => null);
    const go = root.querySelector("#boss-multi");
    root.querySelectorAll(".choice").forEach((b) => (b.onclick = () => {
      const k = Number(b.dataset.part);
      picks[k] = b.dataset.v;
      root.querySelectorAll(`.choice[data-part="${k}"]`).forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      go.disabled = picks.some((p) => p === null);
    }));
    go.onclick = () => answer(picks.slice());
  } else if (q.kind === "choice") {
    root.querySelectorAll(".choice").forEach((b) => (b.onclick = () => answer(b.dataset.v, b)));
  } else if (q.view?.kind === "order") {
    wireOrder(root, (given) => answer(given));
  } else if (q.vault?.show === "ruler") {
    const cells = [...root.querySelectorAll(".ruler__cell")];
    cells.forEach((c, k) => {
      c.addEventListener("input", () => { c.value = c.value.replace(/[^01]/g, "").slice(-1); if (c.value && cells[k + 1]) cells[k + 1].focus(); });
      c.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !c.value && cells[k - 1]) cells[k - 1].focus(); });
    });
    root.querySelector("#boss-form").onsubmit = (e) => { e.preventDefault(); const empty = cells.find((c) => c.value === ""); if (empty) return empty.focus(); answer(cells.map((c) => c.value).join("")); };
  } else {
    root.querySelector("#boss-form").onsubmit = (e) => { e.preventDefault(); const v = root.querySelector("#ans").value; if (v.trim()) answer(v); };
  }
  root.querySelector(".dial, .choice, .ruler__cell, .answer__input")?.focus?.({ preventScroll: true });
}

function bossAnswer(q, given, clicked) {
  const root = app.firstElementChild;
  if (root.dataset.done) return;
  root.dataset.done = "1";
  const ok = Boss.bossCheck(q, given);
  root.querySelectorAll("input, .dial, button.btn--primary, .choice, .order__item, #order-reset").forEach((n) => (n.disabled = true));
  if (q.view?.kind === "order") revealOrder(root, q, given);
  if (q.kind === "choice") root.querySelectorAll(".choice").forEach((b) => { if (b.dataset.v === q.answer) b.classList.add("is-correct"); else if (b === clicked) b.classList.add("is-wrong"); });
  if (q.kind === "multi") root.querySelectorAll(".choice").forEach((b) => { const p = q.parts[Number(b.dataset.part)]; if (b.dataset.v === p.answer) b.classList.add("is-correct"); else if (b.getAttribute("aria-pressed") === "true") b.classList.add("is-wrong"); });
  const task = root.querySelector(".boss__task");
  const last = boss.i === boss.steps.length - 1;
  if (ok) {
    FX.play("ok");
    if (last) return bossWin();
    task.insertAdjacentHTML("beforeend", `<div class="feedback feedback--inline feedback--ok" role="status">${mascot("esulta", "feedback__mascot")}<p class="feedback__title">${ICON_OK}Passaggio superato</p><p class="feedback__text">Il volantino gira. Ne mancano ${boss.steps.length - boss.i - 1}.</p><button class="btn btn--block" type="button" id="boss-next">Passaggio ${boss.i + 2}</button></div>`);
    const nb = root.querySelector("#boss-next");
    nb.onclick = () => { boss.i += 1; showBossStep(); };
    nb.focus({ preventScroll: true });
    return;
  }
  // errore: un tentativo in meno, nessuna stella e niente perso (tono "indizio", non rosso)
  boss.left -= 1;
  const explain = `<ol class="feedback__explain">${(q.explain ?? []).map((l) => `<li>${esc(l)}</li>`).join("")}</ol>`;
  const shown = `La risposta giusta era <span class="num">${esc(Boss.bossShown(q))}</span>.`;
  const note = root.querySelector("#boss-note");
  if (boss.left > 0) {
    if (note) note.textContent = bossNote();
    task.insertAdjacentHTML("beforeend", `<div class="feedback feedback--inline feedback--hint" role="status">${mascot("perplesso", "feedback__mascot")}<p class="feedback__title">${ICON_HINT}Non è questa</p><p class="feedback__text">${shown} Tentativi rimasti: <b>${boss.left}</b>. Ripeti questo passaggio con una domanda nuova.</p>${explain}<button class="btn btn--block" type="button" id="boss-again">Riprova questo passaggio</button><button class="btn btn--ghost btn--block" type="button" id="boss-back">Torna al capitolo</button></div>`);
    root.querySelector("#boss-again").onclick = () => { boss.steps[boss.i] = { ...boss.steps[boss.i], q: Boss.stepQuestion(Math.random, boss.chapter, boss.i) }; showBossStep(); };
    root.querySelector("#boss-back").onclick = () => chapterScreen(boss.chapter);
    root.querySelector("#boss-again").focus({ preventScroll: true });
  } else {
    if (note) note.textContent = "Tentativi finiti. Nessuna stella persa e nessun danno: il caveau resta lì.";
    task.insertAdjacentHTML("beforeend", `<div class="feedback feedback--inline feedback--hint" role="status">${mascot("perplesso", "feedback__mascot")}<p class="feedback__title">${ICON_HINT}Il caveau resta lì</p><p class="feedback__text">${shown} Hai finito i tentativi, ma non hai perso niente: riprovi quando vuoi.</p>${explain}<button class="btn btn--block" type="button" id="boss-retry">Riprova il caveau</button><button class="btn btn--ghost btn--block" type="button" id="boss-back">Torna al capitolo</button></div>`);
    root.querySelector("#boss-retry").onclick = () => startBoss(boss.chapter);
    root.querySelector("#boss-back").onclick = () => chapterScreen(boss.chapter);
    root.querySelector("#boss-retry").focus({ preventScroll: true });
  }
  root.querySelector(".feedback").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function bossWin() {
  const chapterId = boss.chapter;
  const reward = P.vaultReward(chapterId);
  commit(P.winVault(store, store.current, chapterId));
  FX.bigWin();
  const ch = G.CHAPTERS.find((c) => c.id === chapterId);
  const task = `<div style="display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center">
    <figure class="trophy trophy--big">${ASSETS.cup}<figcaption><b>Trofeo del caveau</b>${ch.n > 0 ? `Capitolo ${ch.n}` : "Riscaldamento"}</figcaption></figure>
    <div><p style="margin:0;font-weight:700">+ ${money(reward)} e un trofeo nel profilo.</p>${mascot("podio", "", "width:72px;margin-top:8px")}</div></div>
    <button class="btn btn--primary btn--block" id="boss-done" type="button">Torna al capitolo</button>
    <button class="btn btn--ghost btn--block" id="boss-home" type="button">Tutti i capitoli</button>`;
  render(el(`<div>${bossShell({ step: 3, open: true, title: "Aperto!", task, note: false })}</div>`));
  document.getElementById("boss-done").onclick = () => chapterScreen(chapterId);
  document.getElementById("boss-home").onclick = () => home();
}

// ---------- Negozio: skin di R0b e sfondi ----------

let shopTab = "skin";

let shopFresh = new Set(); // oggetti diventati comprabili dall'ultima visita (per tutta la visita corrente)

function shopItemHTML(it, player, ctx, boughtId) {
  const st = S.itemState(it, player, ctx);
  const preview = shopTab === "skin"
    ? `<span class="skin--${it.value}" style="display:contents">${mascot("neutro")}</span>`
    : `<span class="bg-swatch"${it.value === S.FREE.bg ? "" : ` data-bg="${it.value}"`}></span>`;
  const fresh = shopFresh.has(it.id) && st.state === "buy";
  const tag = st.state === "equipped" ? '<span class="item__tag">In uso</span>' : st.state === "owned" ? '<span class="item__tag">Tuo</span>' : fresh ? '<span class="item__tag">Nuovo</span>' : "";
  const price = it.price > 0 && (st.state === "buy" || st.state === "locked") ? `<span class="item__price">${money(it.price)}</span>` : "";
  let action = "";
  if (st.state === "equipped") action = '<button class="btn btn--ghost" type="button" disabled aria-disabled="true">In uso</button>';
  else if (st.state === "owned") action = `<button class="btn btn--ghost" type="button" data-equip="${it.id}" aria-label="Usa ${esc(it.name)}">Usa</button>`;
  else if (st.state === "buy") action = `<button class="btn" type="button" data-buy="${it.id}" aria-label="Compra ${esc(it.name)} per ${money(it.price)}">Compra</button>`;
  else if (st.reason === "chapters") {
    // bloccato dai capitoli: lucchetto viola e un pallino per ogni capitolo richiesto (si sbloccano giocando, i contanti arrivano da soli)
    action = `<div class="item__pips" role="img" aria-label="${st.have} capitoli superati su ${st.need} richiesti">${Array.from({ length: st.need }, (_, k) => `<i${k < st.have ? ' class="is-on"' : ""}></i>`).join("")}</div><p class="item__gap">Servono <b>${st.need} capitoli superati</b> (ne hai ${st.have})</p>`;
  } else {
    action = `<div class="item__bar" role="img" aria-label="Hai il ${st.percent}% del prezzo"><i style="width:${st.percent}%"></i></div><p class="item__gap">Ti mancano <b>${money(st.gap)}</b></p>`;
  }
  const needs = st.state === "locked" && st.reason === "chapters" ? " item--needs-chapters" : "";
  return `<li class="item item--${st.state}${needs}${fresh ? " is-new" : ""}${boughtId === it.id ? " is-bought" : ""}" data-item="${it.id}">${tag}<div class="item__preview">${preview}</div><p class="item__name">${esc(it.name)}</p>${price}${action}</li>`;
}

// Dalla home: le novità sono gli oggetti diventati comprabili dall'ultima visita; entrando si considerano viste.
function enterShop() {
  const player = P.currentPlayer(store);
  if (!player) return nameScreen();
  const ctx = shopCtx(player);
  shopFresh = new Set(S.newItems(player, ctx).map((i) => i.id));
  // unione: un oggetto è "novità" solo la prima volta che lo vedi comprabile, anche se poi i soldi salgono e scendono
  commit(P.setShopSeen(store, store.current, [...new Set([...player.shopSeen, ...S.buyableNow(player, ctx).map((i) => i.id)])]));
  shopScreen();
}

const shopCtx = (player) => ({ chapters: G.summarize(player).chapters.filter((c) => c.everPassed).length }); // superati almeno una volta, riscaldamento compreso

function shopScreen(boughtId = null, walletFrom = null) {
  const player = P.currentPlayer(store);
  if (!player) return nameScreen();
  const ctx = shopCtx(player);
  render(el(`
    <section class="shop">
      <header class="shop__head"><h1 class="shop__title">Negozio</h1><span class="cash shop__wallet" aria-label="Contanti: ${player.cash} dollari"><span class="cash__n">${money(walletFrom ?? player.cash)}</span></span></header>
      <p class="shop__hint">${money(Economy.CASH_PER_RIGHT)} a risposta giusta, ${money(Economy.CASH_PER_STEP)} a passaggio di un esercizio, un premio a caveau aperto. Gli oggetti più cari richiedono anche capitoli superati (anche il riscaldamento).</p>
      <div class="tabs" role="tablist" aria-label="Reparti">${Object.entries(S.SLOTS).map(([slot, label]) => `<button class="tabs__tab" role="tab" type="button" data-tab="${slot}" aria-selected="${slot === shopTab}">${esc(label)}</button>`).join("")}</div>
      <ul class="shop__grid" role="tabpanel">${S.itemsIn(shopTab).map((it) => shopItemHTML(it, player, ctx, boughtId)).join("")}</ul>
      <button class="btn btn--ghost btn--block" id="back" type="button">Torna ai capitoli</button>
    </section>`));
  if (walletFrom !== null) FX.countUp(app.querySelector(".shop__wallet .cash__n"), walletFrom, player.cash, money);
  app.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { shopTab = b.dataset.tab; shopScreen(); }));
  document.getElementById("back").onclick = () => home();
  app.querySelectorAll("[data-equip]").forEach((b) => (b.onclick = () => {
    commit(S.equip(store, store.current, b.dataset.equip));
    FX.play("ok");
    shopScreen();
  }));
  app.querySelectorAll("[data-buy]").forEach((b) => (b.onclick = async () => {
    const it = S.itemById(b.dataset.buy);
    const yes = await confirmDialog({ title: `Comprare ${it.name} per ${money(it.price)}?`, text: "I contanti si scalano subito. Potrai metterlo quando vuoi.", ok: "Sì, compra" });
    if (!yes) return;
    const before = P.currentPlayer(store).cash;
    const r = S.buy(store, store.current, it.id, ctx);
    if (!r.ok) { FX.toast(r.error === "capitoli insufficienti" ? "Servono più capitoli superati." : "Non hai abbastanza contanti."); return; }
    commit(r.store);
    FX.play("coin");
    FX.rain(10);
    FX.toast(`${it.name} è tuo: tocca «Usa» per metterlo.`);
    shopScreen(it.id, before);
  }));
}

// Scaffale dei trofei per il profilo: uno per capitolo, la sagoma tratteggiata se ancora da aprire.
function trophiesHTML(player) {
  const won = G.CHAPTERS.filter((c) => player.trophies?.[c.id]).length;
  return `<ul class="trophies" aria-label="Trofei dei caveau: ${won} su ${G.CHAPTERS.length}">${G.CHAPTERS.map((c) => {
    const at = player.trophies?.[c.id];
    return `<li><figure class="trophy${at ? "" : " is-empty"}">${ASSETS.cup}<figcaption><b>Caveau ${c.n}</b>${at ? G.formatDay(at) : "da aprire"}</figcaption></figure></li>`;
  }).join("")}</ul>`;
}


// ---------- Esame finale: una prova unica, senza suggerimenti né correzioni, con un voto in decimi ----------

let exam = null;
window.__exam = () => exam; // per provare l'esame dal browser
const EXAM_RADIO = [
  [9, "Dieci e lode in arrivo? Il caveau ti saluta in piedi."],
  [7, "Roba da bravi: si vede che il binario non ti fa più paura."],
  [6, "Sufficiente: la porta si apre, ma cigola. Ripassa i capitoli segnati."],
  [0, "Il caveau non si è aperto. Non è una tragedia: è un elenco di cose da ripassare."],
];
const examRadio = (grade) => EXAM_RADIO.find(([min]) => grade >= min)[1];

function examIntro() {
  const player = P.currentPlayer(store);
  const last = player.exams.at(-1);
  const best = player.exams.reduce((m, e) => Math.max(m, e.grade), 0);
  const perCh = G.CHAPTERS.map((c) => ({ c, n: { warm: 3, c1: 3, c2: 3, conv: 4, ops: 5, basi: 3, virgola: 3 }[c.id] }));
  render(el(`
    <section class="home exam">
      ${mascot("neutro", "home__mascot")}
      <h1 class="home__title">Esame <span>finale</span></h1>
      <p class="home__line">24 domande su tutti i capitoli, e alla fine un voto in decimi.</p>
      <ul class="rules">
        <li>Niente suggerimenti e nessuna correzione mentre rispondi: si vede tutto alla fine.</li>
        <li>Ogni domanda vale 1 punto, tutto o niente. Con 6 sei <b>sufficiente</b>.</li>
        <li>Un capitolo è superato con almeno il 60% di risposte giuste.</li>
        <li>Se esci prima della fine, l'esame non viene registrato.</li>
      </ul>
      <p class="home__rules">${perCh.map(({ c, n }) => `${esc(c.title)}: ${n}`).join(" · ")}</p>
      ${last ? `<p class="home__hello" role="status">Ultimo voto: <b>${X.formatGrade(last.grade)}</b> · il migliore: <b>${X.formatGrade(best)}</b> · esami fatti: ${player.exams.length}</p>` : ""}
      <button class="btn btn--primary btn--block" id="exam-go" type="button">${last ? "Rifai l'esame" : "Inizia l'esame"}</button>
      <button class="btn btn--ghost btn--block" id="exam-back" type="button">Torna ai capitoli</button>
    </section>`));
  document.getElementById("exam-go").onclick = () => startExam();
  document.getElementById("exam-back").onclick = () => home();
}

function startExam() {
  exam = { items: X.buildExam(Math.random), i: 0, results: [], givens: [] };
  examQuestion();
}

function examBody(q, kicker) {
  const head = `<p class="q__kicker">${kicker}</p>`;
  if (q.kind === "choice") {
    const stack = q.options.some((o) => o.length > 14) ? " choices--stack" : "";
    return `<section class="q">${head}<h1 class="q__prompt">${esc(q.prompt)}</h1><ul class="choices${stack}">${q.options.map((o) => `<li><button class="choice" type="button" data-v="${esc(o)}">${esc(o)}</button></li>`).join("")}</ul></section>`;
  }
  if (q.kind === "safe") {
    return `<section class="q">${head}<h1 class="q__prompt">${esc(q.prompt)}</h1>${vaultHTML()}<button class="btn btn--primary btn--block" type="button" id="submit">Rispondi</button></section>`;
  }
  const locked = !q.vault ? "" : q.vault.show === "ruler"
    ? `<div class="q__code">${q.vault.value}<sub>10</sub></div>
      <form class="ruler-form" id="form" novalidate><div class="ruler" role="group" aria-label="Pesi delle ruote e cifre della combinazione, da sinistra a destra">
        ${WEIGHTS.map((w) => `<span class="ruler__w">${w}</span>`).join("")}
        ${WEIGHTS.map((w) => `<input class="ruler__cell" inputmode="numeric" maxlength="1" pattern="[01]" placeholder=" " autocomplete="off" aria-label="Cifra sotto il peso ${w}">`).join("")}
      </div><button class="btn btn--primary btn--block" type="submit">Rispondi</button></form>`
    : vaultHTML({ bits: q.vault.bits, lcd: "?", sum: false, code: false });
  const entry = q.vault?.show === "ruler" ? "" : q.view?.kind === "order" ? orderHTML(q) : answerForm(q, "La tua risposta");
  return `<section class="q">${head}<h1 class="q__prompt">${esc(viewTitle(q))}</h1>${viewHTML(q)}${locked}${entry}</section>`;
}

function examQuestion() {
  const it = exam.items[exam.i], q = it.q, total = exam.items.length;
  const ch = G.CHAPTERS.find((c) => c.id === it.chapter);
  const node = el(`<div class="exam" data-prompt="${esc(q.prompt)}">
    <div class="exam__top"><span class="exam__count">Domanda <b>${exam.i + 1}</b> di ${total}</span><div class="exam__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${exam.i}"><i style="width:${(exam.i / total) * 100}%"></i></div></div>
    ${examBody(q, `Esame · ${esc(ch.title)}`)}
    <div class="mission-tools"><button class="btn btn--ghost" type="button" id="quit">Abbandona l'esame</button></div></div>`);
  render(node);
  node.querySelector("#quit").onclick = async () => {
    const yes = await confirmDialog({ title: "Abbandonare l'esame?", text: "Le risposte date finora si perdono e l'esame non viene registrato.", ok: "Sì, abbandona", cancel: "Continua", danger: true });
    if (yes) examIntro();
  };
  if (q.kind === "choice") {
    node.querySelectorAll(".choice").forEach((b) => (b.onclick = () => examAnswer(b.dataset.v)));
  } else if (q.kind === "safe") {
    const lcd = node.querySelector("#lcd"), sum = node.querySelector("#sum"), code = node.querySelector("#code b");
    const recompute = () => {
      const on = [...node.querySelectorAll('.dial[aria-pressed="true"]')].map((d) => Number(d.dataset.w));
      const t = on.reduce((a, b) => a + b, 0);
      lcd.textContent = t;
      sum.textContent = on.length ? `${on.join(" + ")} = ${t}` : "tutte a zero";
      if (code) code.textContent = nibbles(bits8(t));
      return t;
    };
    node.querySelectorAll(".dial").forEach((d) => (d.onclick = () => { d.setAttribute("aria-pressed", d.getAttribute("aria-pressed") !== "true"); recompute(); }));
    node.querySelector("#submit").onclick = () => examAnswer(recompute());
  } else if (q.view?.kind === "order") {
    wireOrder(node, (given) => examAnswer(given));
  } else if (q.vault?.show === "ruler") {
    const cells = [...node.querySelectorAll(".ruler__cell")];
    cells.forEach((c, i) => {
      c.addEventListener("input", () => { c.value = c.value.replace(/[^01]/g, "").slice(-1); if (c.value && cells[i + 1]) cells[i + 1].focus(); });
      c.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !c.value && cells[i - 1]) cells[i - 1].focus(); });
    });
    node.querySelector("#form").onsubmit = (e) => { e.preventDefault(); const empty = cells.find((c) => c.value === ""); if (empty) { empty.focus(); return; } examAnswer(cells.map((c) => c.value).join("")); };
  } else {
    node.querySelector("#form").onsubmit = (e) => { e.preventDefault(); examAnswer(node.querySelector("#ans").value); };
  }
}

// Nessun verdetto durante l'esame: si registra la risposta e si passa alla successiva.
function examAnswer(given) {
  const it = exam.items[exam.i];
  exam.results.push(!!checkAnswer(it.q, given));
  exam.givens.push(given);
  exam.i += 1;
  if (exam.i < exam.items.length) examQuestion(); else examResult();
}

// Testo breve per rivedere una domanda: l'ordinamento diventa «Ordina: 97 (base 10), 56 (base 16)…».
const examLabel = (q) => (q.view?.kind === "order" ? `Ordina dal più piccolo al più grande: ${q.view.items.map((i) => `${i.value} (base ${i.base})`).join(", ")}` : q.prompt);

function examResult() {
  const r = X.gradeExam(exam.items, exam.results);
  commit(P.recordExam(store, store.current, r));
  r.passed ? FX.bigWin() : FX.play("ko");
  const wrong = exam.items.map((it, i) => ({ it, i })).filter(({ i }) => !exam.results[i]);
  const given = (v) => (v === "" || v == null ? "(vuota)" : String(v));
  const review = wrong.map(({ it, i }) => `<li class="exam-rev"><details><summary><span class="exam-rev__n">${it.id}</span> ${esc(examLabel(it.q))}</summary>
      <p><b>La tua risposta:</b> ${esc(given(exam.givens[i]))}</p><p><b>Giusta:</b> ${esc(Boss.bossShown(it.q))}</p>
      <ul>${it.q.explain.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></details></li>`).join("");
  const chRows = r.chapters.map((c) => `<li class="exam-ch exam-ch--${c.state}"><span class="exam-ch__name">${esc(c.title)}</span><span class="exam-ch__score">${c.correct}/${c.total}</span><span class="chip chip--${c.state === "da-ripassare" ? "bocciato" : "superato"}">${c.state === "perfetto" ? "Perfetto" : c.state === "superato" ? "Superato" : "Da ripassare"}</span></li>`).join("");
  const reviewList = r.chapters.filter((c) => !c.passed);
  render(el(`
    <section class="home exam">
      ${mascot(r.passed ? "podio" : "triste", "home__mascot")}
      <h1 class="home__title">${r.passed ? "Esame <span>superato</span>" : "Esame <span>da rifare</span>"}</h1>
      <div class="exam-grade${r.passed ? " is-pass" : " is-fail"}" role="status" aria-label="Voto ${X.formatGrade(r.grade)} su 10, ${r.verdict}"><b>${X.formatGrade(r.grade)}</b><span>/10</span><em>${esc(r.verdict)}</em></div>
      <p class="home__line">${r.correct} risposte giuste su ${r.total}.</p>
      <p class="home__rules">${r.allChaptersPassed ? "Tutte le lezioni risultano superate." : `Lezioni da ripassare: <b>${reviewList.map((c) => esc(c.title)).join(" · ")}</b>.`}${r.passed && !r.allChaptersPassed ? " Il voto basta, ma queste non sono ancora solide." : ""}</p>
      <h2 class="board__sub">Capitolo per capitolo</h2>
      <ul class="exam-chs">${chRows}</ul>
      ${wrong.length ? `<h2 class="board__sub">Gli errori, spiegati</h2><ul class="exam-revs">${review}</ul>` : ""}
      ${radioFull(examRadio(r.grade))}
      ${reviewList.map((c) => `<button class="btn btn--ghost btn--block" type="button" data-review="${c.id}">Ripassa: ${esc(c.title)}</button>`).join("")}
      <button class="btn btn--primary btn--block" id="exam-again" type="button">Rifai l'esame</button>
      <button class="btn btn--ghost btn--block" id="exam-menu" type="button">Tutti i capitoli</button>
    </section>`));
  app.querySelectorAll("[data-review]").forEach((b) => (b.onclick = () => chapterScreen(b.dataset.review)));
  document.getElementById("exam-again").onclick = () => startExam();
  document.getElementById("exam-menu").onclick = () => home();
}

home(); // subito: la prima schermata non aspetta le immagini del caveau
loadAssets().then(() => refreshScreen?.());
