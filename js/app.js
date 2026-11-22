import { checkAnswer } from "./questions.mjs";
import { judgeStep } from "./operations.mjs";
import * as G from "./progress.mjs";
import * as FX from "./fx.mjs";
import * as P from "./profiles.mjs";
import { WEIGHTS, bits8, nibbles, onWeights } from "./vault.mjs";

window.__fx = FX; // utile per provare gli effetti dal browser
import { colopHTML, starsHTML, progressHTML, baseBadge, nTag } from "./colop.mjs";

const MAX_STARS = 5;
const CASH_PER_RIGHT = 100;
const OP_STEP = 2; // nei passaggi guidati, il terzo è l'operazione in binario (con la colonna)
const app = document.getElementById("app");
const MASCOT = (name) => `design/mascot/r0b-${name}.svg`;

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

function render(node) {
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
      <img class="home__mascot" src="${MASCOT("neutro")}" alt="">
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
  const sum = G.summarize(player);
  const c = sum.counts;
  const started = c.touched > 0;
  const toReview = sum.rows.find((r) => r.status === G.STATUS.FAILED);
  render(el(`
    <section class="home">
      <img class="home__mascot" src="${MASCOT("neutro")}" alt="">
      <h1 class="home__title">Neon <span>Bay</span></h1>
      <p class="home__hello" role="status">${esc(greeting || `Ciao, ${player.name}!`)}</p>
      <p class="home__line">Il tuo conto: <b>${money(player.cash)}</b> · Partite completate: <b>${player.missionsDone}</b></p>
      <button class="btn btn--primary home__play" id="play" type="button">${started ? "Gioca" : "Inizia a giocare"}</button>
      ${started ? statsHTML(c) : `<p class="home__rules">Si parte con una serie di casseforti per capire come funziona il binario. Poi il gioco sceglie le domande per te.</p>`}
      ${toReview ? `<button class="btn btn--ghost btn--block" id="review" type="button">Ripassa: ${esc(toReview.title)}</button>` : ""}
      <h2 class="board__sub">I capitoli</h2>
      ${coursesHTML(sum)}
      <button class="btn btn--ghost btn--block" id="progress" type="button">I miei progressi, argomento per argomento</button>
      <p class="home__rules">Ogni errore accende una stella di ricercato. A cinque stelle la partita è finita. Tre risposte giuste di fila ne spengono una.</p>
      ${radioFull(DJ_LINES[0])}
      <details class="profile">
        <summary>Profilo e salvataggio</summary>
        <p class="profile__text">Giocatore: <b>${esc(player.name)}</b>. Conto ${money(player.cash)}, ${player.missionsDone} ${player.missionsDone === 1 ? "partita completata" : "partite completate"}. Partita e progressi sono salvati su questo dispositivo.</p>
        <div class="profile__actions">
          <button class="btn btn--ghost" type="button" id="switch">Cambia giocatore</button>
          <button class="btn btn--ghost" type="button" id="reset">Azzera i progressi</button>
          <button class="btn btn--ghost btn--danger-outline" type="button" id="delete">Elimina questo giocatore</button>
        </div>
      </details>
    </section>`));
  document.getElementById("play").onclick = () => startGame();
  document.getElementById("progress").onclick = () => progressScreen();
  app.querySelectorAll("[data-chapter]").forEach((b) => (b.onclick = () => progressScreen(b.dataset.chapter)));
  document.getElementById("review")?.addEventListener("click", () => startGame({ force: toReview.id }));
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
function startGame({ force = null } = {}) {
  game = { force, count: force ? 8 : 10, q: null, last: null, seen: new Set(), touched: new Map(), qWrong: false, qUnits: 0, qOkUnits: 0, recorded: false, index: 0, step: 0, stars: 0, streak: 0, earned: 0, rightCount: 0, totalUnits: 0, answered: false, givens: [], marks: [], delta: 0, lit: false };
  game.chBefore = Object.fromEntries(G.summarize(P.currentPlayer(store)).chapters.map((c) => [c.id, c.state]));
  nextQ();
  showQuestion();
}

function nextQ() {
  const q = G.nextQuestion(P.currentPlayer(store), Math.random, { last: game.last, force: game.force, exclude: game.seen });
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
  commit(G.recordResult(store, store.current, topic, frac));
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
    if (await ask("Ricominciare la partita?", "Contanti e stelle di questa partita si azzerano e si riparte dalla prima domanda. I risultati già registrati sugli argomenti restano.", "Sì, ricomincia")) startGame({ force: game.force });
  };
  root.querySelector("#quit").onclick = async () => {
    if (await ask("Uscire dalla partita?", "I contanti di questa partita andranno persi. I risultati già registrati sugli argomenti restano.", "Sì, esci")) home();
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
          ${WEIGHTS.map((w) => `<input class="ruler__cell" inputmode="numeric" maxlength="1" pattern="[01]" autocomplete="off" aria-label="Cifra sotto il peso ${w}">`).join("")}
        </div><button class="btn btn--primary btn--block" type="submit">Rispondi</button></form>`
      : vaultHTML({ bits: q.vault.bits, lcd: "?", sum: false, code: false });
    body = `<section class="q"><p class="q__kicker">${kicker}</p><h1 class="q__prompt">${esc(q.prompt)}</h1>${locked}${q.vault?.show === "ruler" ? "" : answerForm(q, "La tua risposta")}</section><div id="fb"></div>`;
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
  const mascot = found ? "perplesso" : ok ? "esulta" : failed ? "triste" : "perplesso";
  const icon = found ? ICON_HINT : ok ? ICON_OK : ICON_KO;
  const gaveAnswer = verdict.headline.startsWith("Risposta giusta");
  const title = ok ? verdict.headline || "Esatto!" : gaveAnswer ? "Non è questa" : verdict.headline;
  const text = ok || found
    ? (verdict.note ? esc(verdict.note) : `Pulito. <span class="num">+${CASH_PER_RIGHT} $</span> sul conto.`)
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
    <img class="feedback__mascot" src="${MASCOT(mascot)}" alt="">
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
    game.earned += CASH_PER_RIGHT;
    game.delta = CASH_PER_RIGHT;
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
  const cashBefore = me().cash + game.earned - (verdict.reward ? CASH_PER_RIGHT : 0);
  const starOff = verdict.reward && game.streak % 3 === 0 && game.stars < starsBefore;
  if (verdict.reward) FX.celebrate({ streak: game.streak, starOff });
  else if (verdict.star) FX.alarm(true);
  else FX.alarm(false);

  const root = app.firstElementChild;
  root.querySelectorAll("input, .dial, #submit, .choice, #form .btn").forEach((n) => (n.disabled = true));
  const form = root.querySelector("#form");
  if (form) form.classList.add(verdict.ok ? "is-correct" : verdict.discovered && !verdict.star ? "is-hint" : "is-wrong");
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
    nextQ(); showQuestion();
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
const chapterTitle = (ch) => (ch.n > 0 ? `${ch.n} · ${ch.title}` : ch.title);

// Elenco ordinato dei capitoli con lo stato di ciascuno: si vede subito dalla home.
function coursesHTML(sum) {
  const html = `<ol class="course" aria-label="Capitoli del corso, in ordine">${sum.chapters.map((ch) => `<li>
    <button class="course__item course__item--${ch.state}${justPerfect.has(ch.id) ? " is-new-state" : ""}" type="button" data-chapter="${ch.id}" aria-label="${esc(chapterTitle(ch))}: ${esc(ch.label)}. ${esc(ch.detail)}. Apri il dettaglio.">
      <span class="course__n" aria-hidden="true">${ch.n > 0 ? ch.n : "0"}</span>
      <span class="course__main"><span class="course__title">${esc(ch.title)}</span><span class="course__detail">${esc(ch.detail)}</span>${ch.wasNote ? `<span class="course__was">${esc(ch.wasNote)}</span>` : ""}</span>
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
  const newlyPerfect = G.summarize(player).chapters.filter((c) => c.state === "perfetto" && game.chBefore?.[c.id] !== "perfetto");
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
      <img class="home__mascot" src="${MASCOT(failed ? "triste" : "podio")}" alt="">
      <h1 class="home__title">${failed ? "Beccato!" : "Partita <span>finita</span>"}</h1>
      <p class="home__line">${failed ? "Cinque stelle: la polizia ti ha preso. Il bottino resta sul banco." : `Hai incassato <b>${money(game.earned)}</b>.`}</p>
      <p class="home__rules">Risposte giuste: ${game.rightCount} su ${game.totalUnits}${failed ? "" : ` · Il tuo conto: ${money(me().cash)}`}</p>
      ${newlyPerfect.length ? `<p class="home__hello" role="status">★ ${newlyPerfect.map((c) => esc(c.title)).join(" · ")}: superato alla perfezione!</p>` : ""}
      ${rows ? `<h2 class="board__sub">Argomenti toccati in questa partita</h2><ul class="topics topics--summary">${rows}</ul>` : ""}
      ${radioFull()}
      <button class="btn btn--primary btn--block" id="again" type="button">${failed ? "Riprova" : "Gioca ancora"}</button>
      <button class="btn btn--ghost btn--block" id="progress" type="button">I miei progressi</button>
      <button class="btn btn--ghost btn--block" id="menu" type="button">Menu</button>
    </section>`));
  document.getElementById("again").onclick = () => startGame({ force: game.force });
  document.getElementById("progress").onclick = () => progressScreen();
  document.getElementById("menu").onclick = () => home();
}

// ---------- I miei progressi: capitoli coperti e argomenti toccati, superati, da ripassare ----------

function progressScreen(focusChapter = null) {
  const player = P.currentPlayer(store);
  if (!player) return nameScreen();
  const sum = G.summarize(player);
  const c = sum.counts;
  const title = (id) => G.topicById[id]?.title ?? id;
  const chapters = sum.chapters.map((ch) => {
    const pct = (n) => Math.round((n / ch.total) * 100);
    const inProgress = ch.touched - ch.passed - ch.failed;
    const BADGE = { perfetto: " is-perfect", superato: " is-complete", "da-ripassare": " is-review", coperto: " is-covered", "in-corso": " is-started", "da-iniziare": "" };
    const badge = `<span class="chapter__badge${BADGE[ch.state]}">${STATE_ICON[ch.state].startsWith("<svg") ? "" : ""}${esc(ch.label)}</span>`;
    const items = ch.topics.map((r) => {
      const needs = G.blockingNeeds(G.topicById[r.id], player.topics ?? {}).map(title);
      const can = r.unlocked || r.attempts > 0;
      const score = r.attempts ? `${r.correct} su ${r.attempts} ${r.attempts === 1 ? "giusta" : "giuste"}` : can ? "Mai provato" : `Si apre dopo: ${esc(needs.join(", "))}`;
      return `<li class="topic topic--${cls(r.status)}${can ? "" : " is-locked"}"><div class="topic__main"><span class="topic__name">${esc(r.title)}</span><span class="topic__score">${score}</span>${G.wasPassedNote(r) ? `<span class="topic__was">${esc(G.wasPassedNote(r))}</span>` : ""}</div>${chip(r.status)}${can ? `<button class="btn btn--ghost topic__train" type="button" data-train="${r.id}" aria-label="Allenati su ${esc(r.title)}">Allenati</button>` : ""}</li>`;
    }).join("");
    return `<article class="chapter" id="chapter-${ch.id}"><header class="chapter__head"><h2 class="chapter__title">${esc(chapterTitle(ch))}</h2>${badge}</header>
      <p class="chapter__src">${esc(ch.source)}</p>
      <div class="chapter__bar" role="img" aria-label="${ch.passed} superati, ${inProgress} in corso, ${ch.failed} da ripassare su ${ch.total}"><i class="is-passed" style="width:${pct(ch.passed)}%"></i><i class="is-touched" style="width:${pct(inProgress)}%"></i><i class="is-failed" style="width:${pct(ch.failed)}%"></i></div>
      <p class="chapter__count"><b>${ch.touched}</b> toccati su ${ch.total} · <b>${ch.passed}</b> ${ch.passed === 1 ? "superato" : "superati"}</p>${ch.wasNote ? `<p class="chapter__was">${esc(ch.wasNote)}</p>` : ""}
      <ul class="topics">${items}</ul></article>`;
  }).join("");
  render(el(`
    <section class="board">
      <h1 class="board__title">I miei progressi</h1>
      ${statsHTML(c)}
      ${metroHTML(sum)}
      <ul class="rules" aria-label="Come funzionano gli stati">
        <li><b>Superato:</b> almeno 4 giuste nelle ultime 5, con numeri da compito.</li>
        <li><b>Alla perfezione:</b> tutti gli argomenti superati, ultime 5 tutte giuste e, per gli esercizi con i numeri, anche quelli più difficili.</li>
        <li><b>Da ripassare:</b> meno della metà giuste nelle ultime 5 (dopo almeno 5 domande).</li>
        <li>Negli esercizi a passaggi conta quanti passaggi fai giusti.</li>
        <li>Lo stato segue come vai adesso: se sbagli di nuovo un capitolo può scendere, ma la data in cui l'avevi superato resta segnata.</li>
      </ul>
      ${chapters}
      <button class="btn btn--primary btn--block" id="back" type="button">Torna a giocare</button>
    </section>`));
  document.getElementById("back").onclick = () => home();
  if (focusChapter) document.getElementById(`chapter-${focusChapter}`)?.scrollIntoView({ block: "start" });
  app.querySelectorAll("[data-train]").forEach((b) => (b.onclick = () => startGame({ force: b.dataset.train })));
}

home();
