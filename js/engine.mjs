// Motore matematico: funzioni pure, nessun accesso al DOM.
// Ogni risposta corretta è calcolata qui, mai scritta a mano.

const DIGITS = "0123456789ABCDEF";

export function toBase(n, base) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n deve essere un intero >= 0");
  if (n === 0) return "0";
  let out = "";
  while (n > 0) {
    out = DIGITS[n % base] + out;
    n = Math.floor(n / base);
  }
  return out;
}

export function fromBase(str, base) {
  const s = String(str).trim().toUpperCase();
  if (s === "") return NaN;
  let n = 0;
  for (const ch of s) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return NaN;
    n = n * base + d;
  }
  return n;
}

// Lancia RangeError se la stringa contiene cifre non valide per la base.
export function assertDigits(str, base, allowPoint = false) {
  const s = String(str).trim().toUpperCase();
  if (s === "") throw new RangeError("numero vuoto");
  for (const ch of s) {
    if (allowPoint && (ch === "." || ch === ",")) continue;
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) throw new RangeError(`cifra non valida in base ${base}: ${ch}`);
  }
  return s;
}

export const toBin = (n) => toBase(n, 2);
export const fromBin = (s) => fromBase(s, 2);

// --- Passaggi didattici -----------------------------------------------

// Metodo dei pesi: per ogni peso (potenza di 2) dice se entra e cosa resta.
export function weightSteps(n) {
  const bits = Math.max(1, toBin(n).length);
  const steps = [];
  let rest = n;
  for (let i = bits - 1; i >= 0; i--) {
    const w = 2 ** i;
    const fits = rest >= w;
    steps.push({ weight: w, bit: fits ? 1 : 0, restBefore: rest, restAfter: fits ? rest - w : rest });
    if (fits) rest -= w;
  }
  return steps;
}

// Divisioni successive per la base: i resti letti dal basso verso l'alto.
export function divisionSteps(n, base = 2) {
  const steps = [];
  let q = n;
  if (q === 0) return [{ dividend: 0, quotient: 0, remainder: 0 }];
  while (q > 0) {
    const r = q % base;
    steps.push({ dividend: q, quotient: Math.floor(q / base), remainder: r });
    q = Math.floor(q / base);
  }
  return steps;
}

// Binario -> decimale: somma delle potenze di 2 dove c'è un 1.
export function binToDecSteps(bin) {
  const s = assertDigits(bin, 2);
  const parts = [];
  const all = [];
  for (let i = 0; i < s.length; i++) {
    const exp = s.length - 1 - i;
    all.push({ bit: Number(s[i]), exp, value: 2 ** exp });
    if (s[i] === "1") parts.push({ exp, value: 2 ** exp });
  }
  return { parts, all, total: parts.reduce((a, p) => a + p.value, 0) };
}

// Quanti bit servono per rappresentare n.
export const bitsNeeded = (n) => toBin(n).length;

// --- Operazioni in binario (con numeri interi non negativi) ------------

// Somma colonna per colonna: restituisce il risultato e i riporti.
export function addBinary(a, b) {
  const x = assertDigits(a, 2), y = assertDigits(b, 2);
  const len = Math.max(x.length, y.length);
  const xa = x.padStart(len, "0"), ya = y.padStart(len, "0");
  let carry = 0, out = "", carries = "";
  for (let i = len - 1; i >= 0; i--) {
    const sum = Number(xa[i]) + Number(ya[i]) + carry;
    out = (sum % 2) + out;
    carries = carry + carries;
    carry = sum > 1 ? 1 : 0;
  }
  if (carry) { out = "1" + out; carries = "1" + carries; }
  return { result: out.replace(/^0+(?=.)/, ""), carries };
}

// Sottrazione colonna per colonna con prestiti. borrows[i] = 1 se la colonna i presta alla successiva.
export function subBinary(a, b) {
  const x = assertDigits(a, 2), y = assertDigits(b, 2);
  if (fromBin(x) < fromBin(y)) throw new RangeError("risultato negativo");
  const len = Math.max(x.length, y.length);
  const xa = x.padStart(len, "0"), ya = y.padStart(len, "0");
  let borrow = 0, out = "", borrows = "";
  for (let i = len - 1; i >= 0; i--) {
    let d = Number(xa[i]) - Number(ya[i]) - borrow;
    borrows = borrow + borrows;
    if (d < 0) { d += 2; borrow = 1; } else borrow = 0;
    out = d + out;
  }
  return { result: out.replace(/^0+(?=.)/, ""), borrows };
}

// Somma di più righe (serve per sommare i prodotti parziali della moltiplicazione).
export function addMany(rows) {
  let acc = "0";
  const partials = [];
  for (const r of rows) {
    acc = addBinary(acc, r).result;
    partials.push(acc);
  }
  return { result: acc, partials };
}

// Moltiplicazione scuola: una riga di prodotto parziale per ogni 1 del moltiplicatore.
export function mulBinary(a, b) {
  const x = assertDigits(a, 2), y = assertDigits(b, 2);
  const rows = [];
  for (let i = y.length - 1; i >= 0; i--) {
    if (y[i] === "1") rows.push(x + "0".repeat(y.length - 1 - i));
  }
  if (rows.length === 0) return { result: "0", rows: ["0"], partials: ["0"] };
  const sum = addMany(rows);
  return { result: sum.result, rows, partials: sum.partials };
}

// Divisione intera con resto.
export function divBinary(a, b) {
  const d = fromBin(assertDigits(b, 2));
  if (d === 0) throw new RangeError("divisione per zero");
  const n = fromBin(assertDigits(a, 2));
  return { quotient: toBin(Math.floor(n / d)), remainder: toBin(n % d) };
}

// --- Numeri con la virgola ---------------------------------------------

// Parte frazionaria decimale -> binaria con moltiplicazioni per 2, in aritmetica INTERA.
// `digits` sono le cifre dopo la virgola ("3125" per 0,3125): niente virgola mobile.
// Si ferma quando la frazione finisce, quando un resto si ripete (frazione periodica)
// o dopo maxBits cifre. Ogni passo mostra decimali esatti ("0.3125 x 2 = 0.6250").
export function fracToBin(digits, maxBits = 16) {
  const d = String(digits).replace(/^0?[.,]/, "");
  if (!/^\d*$/.test(d)) throw new RangeError("cifre decimali non valide");
  const k = d.length;
  const den = 10n ** BigInt(k);
  let num = k === 0 ? 0n : BigInt(d);
  const fmt = (n) => `${n / den}.${(n % den).toString().padStart(k, "0")}`;
  const steps = [];
  const seen = new Map();
  let bits = "", periodStart = -1;
  while (num !== 0n && bits.length < maxBits) {
    if (seen.has(num)) { periodStart = seen.get(num); break; }
    seen.set(num, bits.length);
    const dbl = num * 2n;
    const bit = dbl >= den ? 1 : 0;
    steps.push({ from: fmt(num), doubled: fmt(dbl), bit });
    bits += bit;
    num = dbl - (bit ? den : 0n);
  }
  return { bits: bits || "0", steps, exact: num === 0n, periodStart };
}

// Dettaglio: { text: "1100.0101", exact, periodStart } (periodStart = indice dove inizia il periodo)
export function decimalToBinaryPointDetailed(value, maxBits = 16) {
  const [i, f = ""] = assertDigits(String(value).replace(",", "."), 10, true).split(".");
  const intPart = toBin(Number(i || "0"));
  const fr = fracToBin(f, maxBits);
  return { text: fr.bits === "0" ? intPart : `${intPart}.${fr.bits}`, exact: fr.exact, periodStart: fr.periodStart, steps: fr.steps, intPart };
}

// "12.3125" o "12,3125" -> "1100.0101"
export function decimalToBinaryPoint(value, maxBits = 16) {
  return decimalToBinaryPointDetailed(value, maxBits).text;
}

// "1011.011" -> 11.375
export function binaryPointToDecimal(str) {
  const [i, f = ""] = assertDigits(String(str).replace(",", "."), 2, true).split(".");
  let v = fromBin(i || "0");
  for (let k = 0; k < f.length; k++) v += Number(f[k]) * 2 ** -(k + 1);
  return v;
}

// Passaggi: 1x2^3 + 0x2^2 ... + 0x2^-1 + 1x2^-2
export function binaryPointSteps(str) {
  const [i, f = ""] = assertDigits(String(str).replace(",", "."), 2, true).split(".");
  const terms = [];
  for (let k = 0; k < i.length; k++) terms.push({ bit: Number(i[k]), exp: i.length - 1 - k });
  for (let k = 0; k < f.length; k++) terms.push({ bit: Number(f[k]), exp: -(k + 1) });
  return { terms, total: binaryPointToDecimal(str) };
}

// --- Ottale / esadecimale: raggruppamento di bit -----------------------

const pad = (s, g) => s.padStart(Math.ceil(s.length / g) * g, "0");

export function binToGroups(bin, base) {
  const g = base === 8 ? 3 : 4;
  const padded = pad(assertDigits(bin, 2), g);
  const groups = [];
  for (let i = 0; i < padded.length; i += g) {
    const chunk = padded.slice(i, i + g);
    groups.push({ bits: chunk, digit: DIGITS[fromBin(chunk)] });
  }
  while (groups.length > 1 && groups[0].digit === "0") groups.shift();
  return groups;
}

export function groupsToBin(str, base) {
  const g = base === 8 ? 3 : 4;
  const chunks = [...assertDigits(str, base)].map((ch) => ({
    digit: ch,
    bits: DIGITS.indexOf(ch).toString(2).padStart(g, "0"),
  }));
  const joined = chunks.map((c) => c.bits).join("").replace(/^0+(?=.)/, "");
  return { chunks, bin: joined };
}

// --- Normalizzazione delle risposte dell'utente ------------------------

export function normalizeAnswer(s) {
  return String(s).trim().replace(/\s+/g, "").replace(/,/g, ".").toUpperCase();
}

// Per i binari accetta anche zeri iniziali ("0101" == "101").
export function sameNumberString(a, b) {
  const clean = (v) => {
    let t = normalizeAnswer(v);
    if (t.startsWith(".")) t = "0" + t;
    if (t.includes(".")) return t.replace(/^0+(?=\d)/, "").replace(/0+$/, "").replace(/\.$/, "");
    return t.replace(/^0+(?=.)/, "");
  };
  return clean(a) === clean(b);
}

// --- Passaggi in colonna (didattica) -----------------------------------

// Somma: un passo per colonna, da destra. `column` conta da 0 (unità).
export function addSteps(a, b) {
  const x = assertDigits(a, 2), y = assertDigits(b, 2);
  const len = Math.max(x.length, y.length);
  const xa = x.padStart(len, "0"), ya = y.padStart(len, "0");
  const steps = [];
  let carry = 0;
  for (let i = len - 1; i >= 0; i--) {
    const top = Number(xa[i]), bottom = Number(ya[i]);
    const sum = top + bottom + carry;
    const digit = sum % 2, carryOut = sum > 1 ? 1 : 0;
    const text = `${top} + ${bottom}${carry ? " + 1 (riporto)" : ""} = ${sum.toString(2)} → scrivo ${digit}${carryOut ? " e riporto 1" : ""}`;
    steps.push({ column: len - 1 - i, top, bottom, carryIn: carry, digit, carryOut, text });
    carry = carryOut;
  }
  if (carry) steps.push({ column: len, top: 0, bottom: 0, carryIn: 1, digit: 1, carryOut: 0, text: "Riporto finale: scrivo 1" });
  return steps;
}

// Sottrazione "come alla lavagna": se la cifra sopra non basta, si cerca a sinistra il primo 1.
// Quell'1 diventa 0, gli zeri attraversati diventano 1 e nella colonna corrente si hanno 2 (= 10 in binario).
export function subSteps(a, b) {
  const x = assertDigits(a, 2), y = assertDigits(b, 2);
  if (fromBin(x) < fromBin(y)) throw new RangeError("risultato negativo");
  const len = Math.max(x.length, y.length);
  const orig = [...x.padStart(len, "0")].map(Number);
  const cur = orig.slice();
  const low = [...y.padStart(len, "0")].map(Number);
  const weight = (i) => 2 ** (len - 1 - i);
  const steps = [];
  for (let i = len - 1; i >= 0; i--) {
    const w = weight(i);
    const changed = cur[i] !== orig[i];
    const head = `Colonna dei ${w}: ${changed ? `ora c'è ${cur[i]} (era ${orig[i]}) → ` : ""}`;
    let digit, text, chain = null;
    if (cur[i] >= low[i]) {
      digit = cur[i] - low[i];
      text = `${head}${cur[i]} − ${low[i]} = ${digit}`;
    } else {
      let k = i - 1;
      while (k >= 0 && cur[k] === 0) k--;
      const crossed = [];
      for (let j = k + 1; j < i; j++) crossed.push(j);
      cur[k] = 0;
      for (const j of crossed) cur[j] = 1;
      digit = 2 - low[i];
      chain = { from: len - 1 - k, crossed: crossed.map((j) => len - 1 - j) };
      const cross = crossed.length ? `, gli zeri attraversati (colonne dei ${crossed.map(weight).join(", ")}) diventano 1` : "";
      text = `${head}${cur[i]} − ${low[i]} non si può. Cerco a sinistra il primo 1: è nella colonna dei ${weight(k)}. Quell'1 diventa 0${cross}, e qui ho 2 (= 10 in binario): 2 − ${low[i]} = ${digit}`;
    }
    steps.push({ column: len - 1 - i, top: orig[i], bottom: low[i], digit, borrowOut: chain ? 1 : 0, chain, text });
  }
  return steps;
}

// Divisione lunga in binario, come a scuola: si prendono le prime cifre finché il divisore ci sta,
// poi si abbassa una cifra alla volta e nel quoziente si scrive 1 (ci sta) o 0 (non ci sta).
export function divSteps(a, b) {
  const x = assertDigits(a, 2), y = assertDigits(b, 2);
  const d = fromBin(y);
  if (d === 0) throw new RangeError("divisione per zero");
  const steps = [];
  let rem = 0, q = "", i = 0;
  while (i < x.length && rem < d) { rem = rem * 2 + Number(x[i]); i++; }
  if (rem < d) {
    steps.push({ bring: null, partial: toBin(rem), fits: false, remainder: toBin(rem), text: `${x} è più piccolo di ${y}: quoziente 0 e resto ${x}` });
    return { steps, quotient: "0", remainder: toBin(rem) };
  }
  steps.push({ bring: null, partial: toBin(rem), fits: true, remainder: toBin(rem - d), text: `Prendo le prime cifre finché ${y} ci sta: ${toBin(rem)}. Ci sta: scrivo 1 nel quoziente, ${toBin(rem)} − ${y} = ${toBin(rem - d)}` });
  q = "1";
  rem -= d;
  for (; i < x.length; i++) {
    rem = rem * 2 + Number(x[i]);
    const fits = rem >= d;
    const before = rem;
    if (fits) rem -= d;
    q += fits ? "1" : "0";
    steps.push({
      bring: x[i], partial: toBin(before), fits, remainder: toBin(rem),
      text: fits
        ? `Abbasso ${x[i]}: ${toBin(before)}. ${y} ci sta: scrivo 1 nel quoziente, ${toBin(before)} − ${y} = ${toBin(rem)}`
        : `Abbasso ${x[i]}: ${toBin(before)}. ${y} non ci sta: scrivo 0 nel quoziente, il resto è ${toBin(rem)}`,
    });
  }
  return { steps, quotient: q, remainder: toBin(rem) };
}
