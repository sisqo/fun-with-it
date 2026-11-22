import { buildMission, checkAnswer } from "./questions.mjs";
import { buildOperationsMission, judgeStep } from "./operations.mjs";

const MAX_STARS = 5;
const CASH_PER_RIGHT = 100;
const app = document.getElementById("app");

const MISSIONS = {
  ops: { title: "Operazioni", sub: "Somme, differenze, prodotti e divisioni nelle varie basi", build: () => buildOperationsMission(Math.random) },
  conv: { title: "Decimale ⇄ Binario", sub: "Pesi, divisioni per 2, cassaforte a 8 interruttori", build: () => buildMission(Math.random, 8) },
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
const money = (n) => "$" + n.toLocaleString("it-IT");

function render(node) { app.replaceChildren(node); node.querySelector("input, button")?.focus?.({ preventScroll: true }); }

function home() {
  render(el(`
    <section class="card center">
      <p class="big" aria-hidden="true">🤖</p>
      <h1>Neon Bay</h1>
      <p>Il tuo conto: <b>${money(profile.cash)}</b> · Missioni completate: <b>${profile.missionsDone}</b></p>
      <p class="muted">Ogni errore ti accende una stella di ricercato. A 5 stelle la missione è fallita. Tre risposte giuste di fila ne spengono una.</p>
      <div class="choices mt">
        ${Object.entries(MISSIONS).map(([k, m]) => `<button class="choice" data-m="${k}"><b>${m.title}</b><br><span class="muted">${m.sub}</span></button>`).join("")}
      </div>
    </section>`));
  app.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => startMission(b.dataset.m)));
}

function startMission(key) {
  game = { key, questions: MISSIONS[key].build(), index: 0, step: 0, stars: 0, streak: 0, earned: 0, rightCount: 0, totalUnits: 0, answered: false, givens: [], marks: [] };
  showQuestion();
}

function hud() {
  const stars = Array.from({ length: MAX_STARS }, (_, i) => `<span class="star${i < game.stars ? " on" : ""}">★</span>`).join("");
  const pct = Math.round((game.index / game.questions.length) * 100);
  return `
    <div class="hud">
      <span class="stars" role="img" aria-label="Ricercato: ${game.stars} stelle su ${MAX_STARS}">${stars}</span>
      <span>${money(profile.cash + game.earned)}</span>
    </div>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`;
}

function doneItem(s, i) {
  const m = game.marks[i] || {};
  const given = esc(game.givens[i] ?? "");
  if (m.wrong) return `<li class="done wrong"><span>${esc(s.label)}</span> <b><s>${given}</s> → ${esc(m.correct)}</b></li>`;
  return `<li class="done"><span>${esc(s.label)}</span> <b>${given}</b></li>`;
}

function inputRow(q, hint) {
  return `<form class="row" id="form"><input type="text" id="ans" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="La tua risposta" ${hint ? `placeholder="${esc(hint)}"` : ""} /><button class="btn" id="submit">Rispondi</button></form>`;
}

function showQuestion() {
  const q = game.questions[game.index];
  game.answered = false;
  let body = "";
  let unit = q;

  if (q.kind === "guided") {
    const done = q.steps.slice(0, game.step).map((s, i) => `${doneItem(s, i)}`).join("");
    const cur = q.steps[game.step];
    unit = cur;
    body = `<ol class="steps">${done}<li class="cur">${esc(cur.label)}</li></ol>${inputRow(q)}`;
  } else if (q.kind === "choice") {
    body = `<div class="choices">${q.options.map((o) => `<button class="choice" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  } else if (q.kind === "safe") {
    const ws = [128, 64, 32, 16, 8, 4, 2, 1];
    body = `
      <div class="safe" role="group" aria-label="Interruttori della cassaforte">
        ${ws.map((w) => `<button class="sw" data-w="${w}" aria-pressed="false" aria-label="Peso ${w}"><b>0</b><small>${w}</small></button>`).join("")}
      </div>
      <p class="sum">Somma: <b id="sum">0</b></p>
      <button class="btn" id="submit">Scassina</button>`;
  } else {
    body = inputRow(q);
  }

  const node = el(`<section>${hud()}<div class="card"><p class="prompt">${esc(q.prompt)}</p>${body}<div id="fb"></div></div></section>`);
  render(node);

  if (q.kind === "choice") {
    node.querySelectorAll(".choice").forEach((b) => (b.onclick = () => submit(q, b.dataset.v, b)));
  } else if (q.kind === "safe") {
    const sum = node.querySelector("#sum");
    const recompute = () => {
      sum.textContent = [...node.querySelectorAll(".sw")].reduce((a, s) => a + (s.getAttribute("aria-pressed") === "true" ? Number(s.dataset.w) : 0), 0);
    };
    node.querySelectorAll(".sw").forEach((s) => (s.onclick = () => {
      const on = s.getAttribute("aria-pressed") !== "true";
      s.setAttribute("aria-pressed", on);
      s.querySelector("b").textContent = on ? "1" : "0";
      recompute();
    }));
    node.querySelector("#submit").onclick = () => submit(q, Number(sum.textContent));
  } else {
    node.querySelector("#form").onsubmit = (e) => { e.preventDefault(); submit(unit, node.querySelector("#ans").value); };
  }
}

function submit(unit, given, clicked) {
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
  const ok = verdict.ok;
  game.totalUnits += 1;
  if (isStep) game.marks[game.step] = { wrong: !verdict.ok && !verdict.discovered, correct: unit.answer };

  if (verdict.reward) {
    game.earned += CASH_PER_RIGHT;
    game.rightCount += 1;
    game.streak += 1;
    if (game.streak % 3 === 0 && game.stars > 0) game.stars -= 1;
  } else if (verdict.star) {
    game.streak = 0;
    game.stars += 1;
  }

  const root = app.firstElementChild;
  root.querySelectorAll("input, .sw, #submit, .choice").forEach((n) => (n.disabled = true));
  if (q.kind === "choice") {
    root.querySelectorAll(".choice").forEach((b) => {
      if (b.dataset.v === q.answer) b.classList.add("right");
      else if (b === clicked) b.classList.add("wrong");
    });
  }

  const failed = game.stars >= MAX_STARS;
  const moreSteps = isStep && game.step < q.steps.length - 1;
  const last = game.index === game.questions.length - 1;
  const showExplain = !moreSteps; // per gli esercizi guidati la spiegazione completa arriva alla fine
  const stepHelp = isStep && !ok && moreSteps && unit.explain ? `<ol>${unit.explain.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : "";
  const note = verdict.note ? `<p>${esc(verdict.note)}</p>` : "";
  const steps = showExplain ? `<ol>${q.explain.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : "";
  const msg = verdict.reward
    ? `<b>${verdict.headline ? esc(verdict.headline) + " " : "Esatto! "}+${money(CASH_PER_RIGHT)}</b>`
    : `<b>${esc(verdict.headline)}</b>`;
  const next = failed ? "Vedi come è andata" : moreSteps ? "Prossimo passaggio" : last ? "Fine missione" : "Avanti";
  root.querySelector("#fb").innerHTML = `
    <div class="feedback ${ok ? "ok" : "bad"}" role="status">${msg}${note}${stepHelp}${steps}${showExplain ? `<p class="radio">${esc(q.radio)}</p>` : ""}</div>
    <p class="mt"><button class="btn" id="next">${next}</button></p>`;
  const nb = root.querySelector("#next");
  nb.onclick = () => {
    if (failed) return finish(true);
    if (moreSteps) { game.step += 1; return showQuestion(); }
    if (last) return finish(false);
    game.index += 1; game.step = 0; game.givens = []; game.marks = []; showQuestion();
  };
  nb.focus({ preventScroll: false });
  root.querySelector(".hud").outerHTML = hud().split('<div class="progress"')[0];
}

function finish(failed) {
  if (!failed) { profile.cash += game.earned; profile.missionsDone += 1; save.write(profile); }
  render(el(`
    <section class="card center">
      <p class="big" aria-hidden="true">${failed ? "🚔" : "🏆"}</p>
      <h1>${failed ? "Beccato!" : "Missione compiuta"}</h1>
      <p>${failed ? "Cinque stelle: la polizia ti ha preso. Il bottino resta sul banco." : `Hai incassato <b>${money(game.earned)}</b>.`}</p>
      <p class="muted">Risposte giuste: ${game.rightCount} su ${game.totalUnits}</p>
      <button class="btn" id="again">${failed ? "Riprova" : "Un'altra missione"}</button>
      <button class="btn ghost" id="menu">Menu</button>
    </section>`));
  document.getElementById("again").onclick = () => startMission(game.key);
  document.getElementById("menu").onclick = home;
}

home();
