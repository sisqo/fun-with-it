// Costruttori di HTML per i componenti di design/components.css.
// Funzioni pure: dati dell'esercizio (q.column) → stringa HTML. Nessun accesso al DOM.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const STAR_PATH = "M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z";

export function starsHTML(level, max = 5, justLit = false) {
  const items = Array.from({ length: max }, (_, i) => {
    const on = i < level;
    const cls = `wanted__star${on ? " is-on" : ""}${on && justLit && i === level - 1 ? " is-new" : ""}`;
    return `<li><svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg></li>`;
  }).join("");
  return `<ul class="wanted" data-level="${level}" role="img" aria-label="Ricercato: ${level} ${level === 1 ? "stella" : "stelle"} su ${max}">${items}</ul>`;
}

export function progressHTML(index, total) {
  const dots = Array.from({ length: total }, (_, i) => `<i class="progress__dot${i < index ? " is-done" : i === index ? " is-current" : ""}"></i>`).join("");
  return `<div class="progress" aria-label="Domanda ${index + 1} di ${total}">${dots}</div>`;
}

const BASE_LABEL = { 2: "BIN", 8: "OTT", 10: "DEC", 16: "HEX" };
export const baseBadge = (base, prefix = "") => `<span class="base base--${base}">${prefix}${BASE_LABEL[base]} <b>${base}</b></span>`;
export const nTag = (value, base) => `<span class="n n--${base}">${esc(value)}<sub>${base}</sub></span>`;

// --- Operazione in colonna ---------------------------------------------

const pad = (s, n) => [...Array(Math.max(0, n - s.length)).fill(""), ...String(s)];
const cell = (cls, ch) => (ch === "" ? (cls ? `<span class="${cls}"></span>` : "<span></span>") : `<span class="${cls}">${esc(ch)}</span>`);
const rule = (thin = false) => `<i class="colop__rule${thin ? " is-thin" : ""}" aria-hidden="true"></i>`;
const row = (sign, cells, cls, extra = () => "") => (sign || "<span></span>") + cells.map((c, i) => cell(`${cls}${extra(i, c) ? " " + extra(i, c) : ""}`.trim(), c)).join("");
const signCell = (ch) => (ch ? `<span class="colop__op">${esc(ch)}</span>` : "<span></span>");

// column: { op, a, b, result, carries?, borrowed?, lent?, chains?, rows?, partials? }
// solved=false: operandi e caselle vuote (non rivela riporti né risultato). solved=true: soluzione completa.
// Per la divisione non si disegna la colonna: restituisce "".
export function colopHTML(column, { solved = true } = {}) {
  const { op, a, b, result } = column;
  if (op === ":") return "";
  let cols = Math.max(a.length, b.length, result.length);
  if (op === "×") cols = Math.max(cols, ...column.rows.map((r) => r.length));
  const A = pad(a, cols), B = pad(b, cols), R = pad(result, cols);
  const parts = [];
  const resultRow = () => (solved
    ? row("", R, "colop__res")
    : "<span></span>" + R.map((c) => (c === "" ? "<span></span>" : '<span class="colop__res is-blank"></span>')).join(""));

  if (op === "+") {
    const C = pad(column.carries || "", cols);
    parts.push("<span class=\"colop__carry\"></span>" + C.map((c) => (solved && c === "1" ? '<span class="colop__carry">1</span>' : '<span class="colop__carry"></span>')).join(""));
    parts.push(row("", A, "colop__dig"), row(signCell("+"), B, "colop__dig"), rule(), resultRow());
  } else if (op === "−") {
    const n = column.lent ? column.lent.length : a.length;
    const off = cols - n;
    const chainAt = (i) => (column.chains || []).find((c) => i >= c.from && i <= c.to);
    const cells = Array.from({ length: cols }, (_, i) => {
      const k = i - off;
      const v = solved && k >= 0 ? column.borrowed[k] : "";
      if (v === "") return "<span class=\"colop__carry\"></span>";
      const ch = chainAt(k);
      const cls = ["colop__carry", "is-borrow"];
      if (ch && ch.to > ch.from) { cls.push("is-chain"); if (k === ch.from) cls.push("is-chain-start"); if (k === ch.to) cls.push("is-chain-end"); }
      return `<span class="${cls.join(" ")}">${esc(v)}</span>`;
    });
    parts.push("<span class=\"colop__carry\"></span>" + cells.join(""));
    parts.push(row("", A, "colop__dig", (i) => (solved && column.lent && i - off >= 0 && column.lent[i - off] ? "is-lent" : "")));
    parts.push(row(signCell("−"), B, "colop__dig"), rule(), resultRow());
  } else {
    parts.push(row("", A, "colop__dig"), row(signCell("×"), B, "colop__dig"));
    if (solved) {
      parts.push(rule(true));
      column.rows.forEach((r, ri) => {
        const shift = r.length - a.length;
        const P = pad(r, cols);
        parts.push(row(signCell(ri === column.rows.length - 1 && column.rows.length > 1 ? "+" : ""), P, "colop__dig is-partial",
          (i) => (i >= cols - shift && P[i] !== "" ? "is-shift" : "")));
      });
    }
    parts.push(rule(), resultRow());
  }
  const label = describe(column, solved);
  return `<div class="colop-wrap"><div class="colop" style="--cols:${cols};--tracks:${cols + 1}" role="img" aria-label="${esc(label)}">${parts.join("")}</div></div>`;
}

function describe(c, solved) {
  const sym = { "+": "più", "−": "meno", "×": "per" }[c.op];
  return solved ? `${c.a} ${sym} ${c.b} uguale ${c.result}, in colonna` : `${c.a} ${sym} ${c.b}, in colonna: il risultato è da scrivere`;
}
