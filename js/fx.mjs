// Effetti speciali: suoni sintetizzati (Web Audio, nessun file), pioggia di monete, conteggio dei contanti, avvisi di serie.
// Le funzioni pure in alto sono testate; le altre toccano il DOM solo quando vengono chiamate.

// ---------- Parti pure ----------

// Quante monete far cadere: cresce con la serie di risposte giuste.
export const coinCount = (streak) => 12 + 6 * Math.min(Math.max(streak, 1) - 1, 6);
export const BIG_WIN_COINS = 70;

// Note (Hz) delle melodie: scala di Do maggiore.
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568 };
export const MELODIES = {
  ok: [[N.C5, 0.07], [N.E5, 0.07], [N.G5, 0.11]],
  coin: [[N.B5, 0.06], [N.E6, 0.22]],
  streak: [[N.C5, 0.07], [N.E5, 0.07], [N.G5, 0.07], [N.C6, 0.07], [N.E6, 0.18]],
  win: [[N.C5, 0.1], [N.E5, 0.1], [N.G5, 0.1], [N.C6, 0.1], [N.G5, 0.08], [N.C6, 0.08], [N.E6, 0.3]],
  ko: [[220, 0.12], [165, 0.2]],
  star: [[880, 0.08], [660, 0.08], [880, 0.08], [660, 0.1]],
};

// Valori intermedi per il conteggio dei contanti (easing out), l'ultimo è sempre il valore finale.
export function countSteps(from, to, steps = 18) {
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const e = 1 - (1 - i / steps) ** 3;
    out.push(Math.round(from + (to - from) * e));
  }
  out[out.length - 1] = to;
  return out;
}

// ---------- Audio ----------

const STORE = "neonbay-sound";
let ctx = null;
let muted = false;
try { muted = typeof localStorage !== "undefined" && localStorage.getItem(STORE) === "off"; } catch { /* storage non disponibile */ }
export const soundLog = []; // ultimi suoni richiesti (utile ai test nel browser)

export const isMuted = () => muted;
export const audioState = () => (ctx ? ctx.state : "none");
export function setMuted(value) {
  muted = Boolean(value);
  try { localStorage.setItem(STORE, muted ? "off" : "on"); } catch { /* ignora */ }
}

function audio() {
  if (ctx) return ctx;
  const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}

export function play(name, { volume = 0.07 } = {}) {
  soundLog.push(name);
  if (soundLog.length > 30) soundLog.shift();
  if (muted) return;
  const ac = audio();
  const notes = MELODIES[name];
  if (!ac || !notes) return;
  if (ac.state === "suspended") ac.resume?.();
  let when = ac.currentTime + 0.01;
  const type = name === "ko" ? "sawtooth" : name === "coin" ? "square" : "triangle";
  for (const [freq, dur] of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    when += dur * 0.9;
  }
}

// ---------- Effetti visivi ----------

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function layer() {
  let el = document.querySelector(".fx-layer");
  if (!el) {
    el = document.createElement("div");
    el.className = "fx-layer";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

// Pioggia di monete "$". Con prefers-reduced-motion non cade nulla.
export function rain(count = 14) {
  if (reduced()) return 0;
  const host = layer();
  const room = Math.max(0, 140 - host.children.length);
  const n = Math.min(count, room);
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i");
    c.className = "fx-coin";
    c.textContent = "$";
    c.style.setProperty("--x", `${Math.random() * 100}%`);
    c.style.setProperty("--dx", `${(Math.random() - 0.5) * 120}px`);
    c.style.setProperty("--r", `${(Math.random() - 0.5) * 900}deg`);
    c.style.setProperty("--d", `${1.1 + Math.random() * 1.1}s`);
    c.style.setProperty("--delay", `${Math.random() * 0.35}s`);
    c.style.setProperty("--s", `${0.8 + Math.random() * 0.7}`);
    c.addEventListener("animationend", () => c.remove(), { once: true });
    host.appendChild(c);
  }
  return n;
}

// Messaggio breve in alto ("Serie di 3! −1 stella").
export function toast(text) {
  const t = document.createElement("div");
  t.className = "fx-toast";
  t.setAttribute("role", "status");
  t.textContent = text;
  layer().appendChild(t);
  t.addEventListener("animationend", () => t.remove(), { once: true });
  setTimeout(() => t.remove(), 3500);
}

// Fa "girare" il numero dei contanti fino al nuovo valore.
export function countUp(el, from, to, format) {
  if (!el) return;
  if (reduced() || from === to) { el.textContent = format(to); return; }
  const steps = countSteps(from, to);
  let i = 0;
  el.classList.add("is-counting");
  const tick = () => {
    el.textContent = format(steps[i]);
    i += 1;
    if (i < steps.length) setTimeout(tick, 28);
    else el.classList.remove("is-counting");
  };
  tick();
}

// Vibrazione breve sul telefono, solo per le risposte giuste.
export function buzz(ms = 25) {
  try { navigator.vibrate?.(ms); } catch { /* ignora */ }
}

// ---------- Eventi di gioco ----------

export function celebrate({ streak = 1, starOff = false } = {}) {
  play("ok");
  setTimeout(() => play("coin"), 140);
  buzz();
  rain(coinCount(streak));
  if (streak >= 3 && streak % 3 === 0) {
    setTimeout(() => play("streak"), 330);
    toast(starOff ? `Serie di ${streak}! Una stella in meno` : `Serie di ${streak}!`);
    rain(coinCount(streak) + 10);
  }
}

export const alarm = (starLit) => { play(starLit ? "star" : "ko"); };

export function bigWin() {
  play("win", { volume: 0.09 });
  rain(BIG_WIN_COINS);
  setTimeout(() => rain(BIG_WIN_COINS / 2), 700);
}
