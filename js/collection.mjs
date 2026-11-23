// Garage e armadio di Neon Bay: ogni capitolo superato (anche una volta sola) sblocca un oggetto da criminale d'altri tempi:
// tatuaggi, auto e vestiti. L'esame finale ne sblocca altri due. Tutto originale, tutto gratis: si guadagna studiando.

export const TYPES = { car: "Auto", tattoo: "Tatuaggio", outfit: "Vestito" };

export const ITEMS = [
  { id: "tat-ruote", type: "tattoo", name: "Le otto ruote", chapter: "warm", color: "#ff3d8b", joke: "128, 64, 32… sul polso. Così non te li scordi neanche in vacanza." },
  { id: "giubbotto", type: "outfit", name: "Giubbotto Algoritmo", chapter: "c1", color: "#7c4dff", joke: "Ha una tasca per ogni passo. Nessuno sa cosa ci sia nella terza." },
  { id: "auto-byte", type: "car", name: "Byte Runner", chapter: "c2", color: "#19c6d8", joke: "Otto cilindri, uno per bit. Il serbatoio è da un solo kilobyte." },
  { id: "tat-ponte", type: "tattoo", name: "Il Ponte 0-1", chapter: "conv", color: "#ff8a3d", joke: "Da una sponda all'altra: decimale di qua, binario di là." },
  { id: "auto-torre", type: "car", name: "Torre Coupé", chapter: "ops", color: "#ff8a3d", joke: "Fa i conti in colonna anche in curva. Non guidarla con i riporti sbagliati." },
  { id: "completo", type: "outfit", name: "Completo Sedici", chapter: "basi", color: "#2fbf71", joke: "Sedici bottoni, da 0 a F. L'ultimo non si chiude mai." },
  { id: "auto-spider", type: "car", name: "Lungomare Spider", chapter: "virgola", color: "#ff3d8b", joke: "Scoperta, veloce e con la virgola al posto giusto." },
  { id: "occhiali", type: "outfit", name: "Occhiali da boss", exam: 6, color: "#ffc233", joke: "Esame superato. Dietro le lenti, due occhi che non sbagliano più un riporto." },
  { id: "auto-oro", type: "car", name: "Cabrio d'oro", exam: 9, color: "#ffc233", joke: "Voto altissimo, macchina di conseguenza. La polizia fa il saluto." },
];

export const itemById = (id) => ITEMS.find((i) => i.id === id);

// Come si sblocca, a parole (per gli oggetti ancora chiusi).
export function howToUnlock(item, chapters) {
  if (item.chapter) {
    const ch = chapters.find((c) => c.id === item.chapter);
    return ch ? `Supera ${ch.n > 0 ? `il capitolo ${ch.n}` : "il riscaldamento"}: ${ch.title}` : "Supera il capitolo";
  }
  return item.exam >= 9 ? "All'esame finale prendi almeno 9" : "Supera l'esame finale (voto 6 o più)";
}

// Id sbloccati. chapters: elenco di { id, everPassed } (dal riepilogo dei progressi); exams: esami salvati { grade }.
export function unlockedIds(chapters, exams = []) {
  const passed = new Set(chapters.filter((c) => c.everPassed).map((c) => c.id));
  const best = exams.reduce((m, e) => Math.max(m, e.grade ?? 0), 0);
  return ITEMS.filter((i) => (i.chapter ? passed.has(i.chapter) : best >= i.exam)).map((i) => i.id);
}

export const newlyUnlocked = (before, after) => after.filter((id) => !before.includes(id)).map(itemById);

// ---------- Disegni (SVG originali, semplici, con il colore dell'oggetto) ----------

const car = (c, open = false) => `<svg viewBox="0 0 120 70" aria-hidden="true"><ellipse cx="60" cy="62" rx="50" ry="4" fill="currentColor" opacity=".15"/>
  <path d="M10 46c0-6 4-9 12-10l14-12c3-3 7-4 12-4h22c6 0 10 2 14 6l8 9c10 1 16 3 16 10v4c0 3-2 5-5 5H15c-3 0-5-2-5-5z" fill="${c}"/>
  ${open ? "" : `<path d="M42 24h24c4 0 7 2 10 5l5 7H33z" fill="#12082b" opacity=".75"/><path d="M58 24v12" stroke="${c}" stroke-width="2"/>`}
  <rect x="96" y="44" width="10" height="4" rx="2" fill="#fff6c9"/><rect x="14" y="44" width="8" height="4" rx="2" fill="#ff5b6e"/>
  <circle cx="36" cy="54" r="9" fill="#12082b"/><circle cx="36" cy="54" r="4" fill="#cfc8e6"/><circle cx="86" cy="54" r="9" fill="#12082b"/><circle cx="86" cy="54" r="4" fill="#cfc8e6"/></svg>`;
const jacket = (c) => `<svg viewBox="0 0 100 80" aria-hidden="true"><path d="M30 8l-20 12 6 22 10-4v38h48V38l10 4 6-22L70 8c-3 8-9 12-20 12S33 16 30 8z" fill="${c}"/><path d="M50 20v58M30 8l20 16 20-16" stroke="#12082b" stroke-width="3" fill="none" opacity=".55"/><circle cx="50" cy="38" r="2.5" fill="#fff"/><circle cx="50" cy="52" r="2.5" fill="#fff"/><circle cx="50" cy="66" r="2.5" fill="#fff"/></svg>`;
const suit = (c) => `<svg viewBox="0 0 100 80" aria-hidden="true"><path d="M28 6l22 14L72 6l16 14-8 58H20L12 20z" fill="${c}"/><path d="M50 20l-8 8 8 6 8-6z" fill="#fff"/><path d="M50 34l-5 8 5 26 5-26z" fill="#ff3d8b"/><path d="M28 6l22 30M72 6L50 36" stroke="#12082b" stroke-width="2.5" fill="none" opacity=".5"/><text x="50" y="76" text-anchor="middle" font-size="9" font-weight="800" fill="#12082b" opacity=".6" font-family="monospace">0..F</text></svg>`;
const glasses = (c) => `<svg viewBox="0 0 120 60" aria-hidden="true"><path d="M8 20h104" stroke="#12082b" stroke-width="5" stroke-linecap="round"/><rect x="10" y="16" width="44" height="30" rx="10" fill="#12082b"/><rect x="66" y="16" width="44" height="30" rx="10" fill="#12082b"/><path d="M18 24l14 0M74 24l14 0" stroke="${c}" stroke-width="4" stroke-linecap="round"/><path d="M54 24h12" stroke="#12082b" stroke-width="5"/></svg>`;
const tatRuote = (c) => `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="none" stroke="${c}" stroke-width="5"/>${[128, 64, 32, 16, 8, 4, 2, 1].map((w, i) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, x = 50 + 28 * Math.cos(a), y = 50 + 28 * Math.sin(a); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 2 ? 5 : 7}" fill="${c}"/>`; }).join("")}<path d="M50 40v20M42 50h16" stroke="${c}" stroke-width="4" stroke-linecap="round"/></svg>`;
const tatPonte = (c) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M8 62h84M8 74h84" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M14 62C26 22 74 22 86 62" fill="none" stroke="${c}" stroke-width="5"/><path d="M30 62V42M42 62V32M58 62V32M70 62V42" stroke="${c}" stroke-width="4"/><text x="22" y="22" font-size="16" font-weight="800" fill="${c}" font-family="monospace">0</text><text x="72" y="22" font-size="16" font-weight="800" fill="${c}" font-family="monospace">1</text></svg>`;

const ART = {
  "tat-ruote": tatRuote, giubbotto: jacket, "auto-byte": (c) => car(c), "tat-ponte": tatPonte, "auto-torre": (c) => car(c),
  completo: suit, "auto-spider": (c) => car(c, true), occhiali: glasses, "auto-oro": (c) => car(c, true),
};
export const artFor = (item) => ART[item.id](item.color);
