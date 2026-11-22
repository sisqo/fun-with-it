import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "../js/teach.mjs";
import * as G from "../js/progress.mjs";
import * as E from "../js/engine.mjs";

const MASCOTS = new Set(["neutro", "esulta", "triste", "perplesso", "sete", "podio"]);
const texts = (pg) => [pg.bubble, ...(pg.paras ?? []), ...(pg.key ? [pg.key] : []), ...(pg.algo ?? []).map((a) => a.t)];
const flat = (id) => T.LESSON_PAGES[id].flatMap(texts).join(" ");

test("ogni argomento ha una lezione", () => {
  for (const t of G.TOPICS) assert.ok(T.hasLesson(t.id), `${t.id} senza lezione`);
  for (const id of Object.keys(T.LESSON_PAGES)) assert.ok(G.topicById[id], `lezione per un argomento inesistente: ${id}`);
  assert.equal(T.lessonFor("inventato"), null);
  assert.equal(T.hasLesson("inventato"), false);
});

test("pagine ben formate: fumetto, mascotte esistente, nessun valore rotto", () => {
  for (const [id, pages] of Object.entries(T.LESSON_PAGES)) {
    assert.ok(pages.length >= 1 && pages.length <= 4, `${id}: ${pages.length} pagine`);
    pages.forEach((pg, i) => {
      assert.ok(pg.bubble && pg.bubble.length >= 20 && pg.bubble.length <= 170, `${id} p${i + 1}: fumetto di ${pg.bubble?.length} caratteri`);
      assert.ok(MASCOTS.has(pg.mascot ?? "neutro"), `${id} p${i + 1}: mascotte ${pg.mascot}`);
      assert.ok(fs.existsSync(new URL(`../design/mascot/r0b-${pg.mascot ?? "neutro"}.svg`, import.meta.url)), `${id}: file mascotte mancante`);
      assert.ok(pg.paras || pg.algo || pg.key, `${id} p${i + 1}: pagina senza contenuto`);
      for (const t of texts(pg)) assert.doesNotMatch(t, /undefined|NaN|\[object|null/, `${id} p${i + 1}: «${t}»`);
      for (const a of pg.algo ?? []) assert.ok(typeof a.t === "string" && a.t.length > 2);
      assert.ok((pg.algo ?? []).length <= 8, `${id} p${i + 1}: troppi passi`);
    });
  }
});

test("la prima lezione è con R0b assetato (scheda della lezione 1)", () => {
  assert.equal(T.LESSON_PAGES["istruzioni-robot"][0].mascot, "sete");
  assert.match(T.LESSON_PAGES["istruzioni-robot"][0].key, /precise, complete, ordinate e non ambigue/);
  assert.equal(T.LESSON_PAGES["istruzioni-robot"][0].algo.length, 5);
});

test("fatti numerici delle lezioni, verificati a parte", () => {
  assert.match(flat("addizione"), /1011 \+ 110, cioè 11 \+ 6/);
  assert.match(flat("addizione"), /Risultato: 10001\./);
  assert.match(flat("addizione"), /11 \+ 6 = 17, e 10001 in decimale fa 17/);
  assert.match(flat("addizione"), /1 \+ 1 = 10: scrivo 0 e riporto 1/);
  assert.match(flat("sottrazione"), /110 − 1, cioè 6 − 1/);
  assert.match(flat("sottrazione"), /1000 − 11, cioè 8 − 3/);
  assert.equal((flat("sottrazione").match(/Risultato: 101, cioè 5\./g) || []).length, 2);
  assert.match(flat("moltiplicazione"), /101 × 11, cioè 5 × 3/);
  assert.match(flat("moltiplicazione"), /1111 in decimale fa 15, ed è proprio 5 × 3/);
  assert.match(flat("divisione"), /111100 : 110, cioè 60 : 6/);
  assert.match(flat("divisione"), /Quoziente 1010, resto 0\. Verifica: 10 × 6 \+ 0 = 60/);
  assert.match(flat("dec-bin"), /1001101/);           // 77
  assert.match(flat("dec-bin"), /64 \+ 8 \+ 4 \+ 1 = 77/);
  assert.match(flat("dec-bin"), /10110/);             // 22
  assert.match(flat("bin-dec"), /11010 = .* = 26/);
  assert.match(flat("bit-necessari"), /255 si scrive con 8 bit.*256 ne vuole 9.*1000 servono 10 bit/);
  assert.match(flat("bit-valori"), /8 bit → 256/);
  assert.match(flat("sistemi-posizionali"), /101 in base 2 .* = 5/);
  assert.match(flat("ott-esa"), /11100111/);          // 347 ottale
  assert.match(flat("ott-esa"), /101110100000/);      // BA0
  assert.match(flat("virgola"), /12,3125 in binario si scrive 1100,0101/);
  assert.match(flat("virgola"), /= 11,375\./);
  assert.match(flat("ops-basi"), /58 \+ 32 = 90 = 5A₁₆/);
  assert.match(flat("confronto-basi"), /10110₂ \(22\), 56₈ \(46\), 3A₁₆ \(58\), 128₁₀/);
  assert.equal(E.groupsToBin("347", 8).bin, "11100111");
});

test("le lezioni non rivelano la soluzione di un esercizio guidato diverso da quello di esempio", () => {
  // gli esempi sono fissi (11+6, 6−1, 8−3, 5×3, 60:6): le domande usano numeri casuali; qui basta che non siano i valori dei compiti
  const all = Object.keys(T.LESSON_PAGES).map(flat).join(" ");
  for (const homework of ["23 + 7", "41 + 29", "45 − 14", "11 × 7", "27 + 19", "64 − 13", "15 × 15"]) assert.ok(!all.includes(homework), homework);
});

test("tono: nessun rimprovero e nessuna battuta su alcol o violenza", () => {
  const all = Object.keys(T.LESSON_PAGES).map(flat).join(" ").toLowerCase();
  for (const bad of [/\bbirr/, /\balcol/, /\barm[ai]\b/, /\bsparar/, /\bstupid/, /sbagliato!/, /\bdroga/]) assert.doesNotMatch(all, bad);
});
