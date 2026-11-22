import { buildMission, checkAnswer } from "./questions.mjs";
import { buildOperationsMission, judgeStep } from "./operations.mjs";
import { colopHTML, starsHTML, progressHTML, baseBadge, nTag } from "./colop.mjs";

const MAX_STARS = 5;
const CASH_PER_RIGHT = 100;
const OP_STEP = 2; // nei passaggi guidati, il terzo è l'operazione in binario (con la colonna)
const app = document.getElementById("app");
const MASCOT = (name) => `design/mascot/r0b-${name}.svg`;

const MISSIONS = {
  ops: { title: "Operazioni", sub: "Somme, differenze, prodotti e divisioni nelle varie basi", build: () => buildOperationsMission(Math.random) },
  conv: { title: "Decimale ⇄ Binario", sub: "Pesi, divisioni per 2 e cassaforte a 8 ruote", build: () => buildMission(Math.random, 8) },
};

const save = {
  read() {
    try { return JSON.parse(localStorage.getItem("neonbay") || "{}"); } catch { return {}; }
  },
  write(data) {
    try { localStorage.setItem("neonbay", JSON.stringify(data)); } catch { /* storage non disponibile */ }
  },
};

const profile = { cash: 0, missionsDone: 0, ...save.read() };
let game = null;

const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => "$ " + n.toLocaleString("it-IT");
const num = (s) => `<span class="num">${esc(s)}</span>`;

const ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_KO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
const ICON_HINT = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>';

function render(node) {
  app.replaceChildren(node);
  window.scrollTo({ top: 0 });
  node.querySelector("input.answer__input, .choice, .dial, .btn")?.focus?.({ preventScroll: true });
}

// ---------- Schermate ----------

function home() {
  render(el(`
    <section class="home">
      <img class="home__mascot" src="${MASCOT("neutro")}" alt="">
      <h1 class="home__title">Neon <span>Bay</span></h1>
      <p class="home__line">Il tuo conto: <b>${money(profile.cash)}</b> · Missioni completate: <b>${profile.missionsDone}</b></p>
      <p class="home__rules">Ogni errore accende una stella di ricercato. A cinque stelle la missione è fallita. Tre risposte giuste di fila ne spengono una.</p>
      <ul class="choices choices--stack home__missions">
        ${Object.entries(MISSIONS).map(([k, m]) => `<li><button class="choice" type="button" data-m="${k}"><span><b>${esc(m.title)}</b><br><span class="home__sub">${esc(m.sub)}</span></span></button></li>`).join("")}
      </ul>
    </section>`));
  app.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => startMission(b.dataset.m)));
}

function startMission(key) {
  game = { key, questions: MISSIONS[key].build(), index: 0, step: 0, stars: 0, streak: 0, earned: 0, rightCount: 0, totalUnits: 0, answered: false, givens: [], marks: [], delta: 0, lit: false };
  showQuestion();
}

function hudHTML() {
  const delta = game.delta ? ` <span class="cash__delta">+${game.delta}</span>` : "";
  return `<div class="hud">${starsHTML(game.stars, MAX_STARS, game.lit)}<span class="cash" aria-label="Contanti: ${profile.cash + game.earned} dollari">${money(profile.cash + game.earned)}${delta}</span></div>`;
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

function showQuestion() {
  const q = game.questions[game.index];
  game.answered = false;
  const kicker = `${esc(MISSIONS[game.key].title)} · domanda ${game.index + 1} di ${game.questions.length}`;
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
    const ws = [128, 64, 32, 16, 8, 4, 2, 1];
    body = `<section class="q"><p class="q__kicker">${kicker}</p><h1 class="q__prompt">${esc(q.prompt)}</h1>
      <div class="vault" id="vault">
        <div class="vault__head"><span class="vault__label">Cassaforte</span><output class="vault__lcd" id="lcd" aria-live="polite">0</output></div>
        <ul class="vault__dials">${ws.map((w) => `<li><button class="dial" type="button" aria-pressed="false" data-w="${w}" aria-label="Ruota ${w}"><span class="dial__weight">${w}</span><span class="dial__wheel" aria-hidden="true"><span class="dial__track"><span>0</span><span>1</span></span></span></button></li>`).join("")}</ul>
        <p class="vault__sum" id="sum" aria-hidden="true">tutte a zero</p>
      </div>
      <button class="btn btn--primary btn--block" type="button" id="submit">Apri</button></section><div id="fb"></div>`;
  } else {
    body = `<section class="q"><p class="q__kicker">${kicker}</p><h1 class="q__prompt">${esc(q.prompt)}</h1>${answerForm(q, "La tua risposta")}</section><div id="fb"></div>`;
  }

  const node = el(`<div data-prompt="${esc(q.prompt)}">${hudHTML()}${progressHTML(game.index, game.questions.length)}${body}</div>`);
  game.delta = 0; game.lit = false;
  render(node);

  if (q.kind === "choice") {
    node.querySelectorAll(".choice").forEach((b) => (b.onclick = () => submit(q, b.dataset.v, b)));
  } else if (q.kind === "safe") {
    const lcd = node.querySelector("#lcd"), sum = node.querySelector("#sum"), vault = node.querySelector("#vault");
    const recompute = () => {
      const on = [...node.querySelectorAll('.dial[aria-pressed="true"]')].map((d) => Number(d.dataset.w));
      const total = on.reduce((a, b) => a + b, 0);
      lcd.textContent = total;
      sum.textContent = on.length ? `${on.join(" + ")} = ${total}` : "tutte a zero";
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
  const radio = !moreSteps && q.radio ? `<p class="feedback__tip">📻 ${esc(q.radio)}</p>` : "";
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
  const q = game.questions[game.index];
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
  const last = game.index === game.questions.length - 1;

  root.querySelector(".hud").outerHTML = hudHTML();
  game.delta = 0; game.lit = false;
  root.querySelector("#fb").innerHTML = feedbackHTML({ q, unit, isStep, verdict, moreSteps, failed, last });
  const nb = root.querySelector("#next");
  nb.onclick = () => {
    if (failed) return finish(true);
    if (moreSteps) { game.step += 1; return showQuestion(); }
    if (last) return finish(false);
    game.index += 1; game.step = 0; game.givens = []; game.marks = []; showQuestion();
  };
  nb.focus({ preventScroll: true });
  root.querySelector(".feedback").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function finish(failed) {
  if (!failed) { profile.cash += game.earned; profile.missionsDone += 1; save.write(profile); }
  render(el(`
    <section class="home">
      <img class="home__mascot" src="${MASCOT(failed ? "triste" : "podio")}" alt="">
      <h1 class="home__title">${failed ? "Beccato!" : "Missione <span>compiuta</span>"}</h1>
      <p class="home__line">${failed ? "Cinque stelle: la polizia ti ha preso. Il bottino resta sul banco." : `Hai incassato <b>${money(game.earned)}</b>.`}</p>
      <p class="home__rules">Risposte giuste: ${game.rightCount} su ${game.totalUnits}</p>
      <button class="btn btn--primary btn--block" id="again" type="button">${failed ? "Riprova" : "Un'altra missione"}</button>
      <button class="btn btn--ghost btn--block" id="menu" type="button">Menu</button>
    </section>`));
  document.getElementById("again").onclick = () => startMission(game.key);
  document.getElementById("menu").onclick = home;
}

home();
