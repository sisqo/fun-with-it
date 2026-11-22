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
  assert.equal(T.LESSON_PAGES["istruzioni-robot"][0].algo.length, 7);
});

test("fatti numerici delle lezioni, verificati a parte", () => {
  assert.match(flat("addizione"), /1011 \+ 110, cioè 11 \+ 6/);
  assert.match(flat("addizione"), /Risultato: 10001\./);
  assert.match(flat("addizione"), /11 \+ 6 = 17, e 10001 in decimale fa 17/);
  assert.match(flat("addizione"), /1 \+ 1 = 10: scrivo 0 e riporto 1/);
  assert.match(flat("sottrazione"), /110 − 1, cioè 6 − 1/);
  assert.match(flat("sottrazione"), /1000 − 11, cioè 8 − 3/);
  assert.equal((flat("sottrazione").match(/Risultato: 101, cioè 5\./g) || []).length, 2);
  assert.match(flat("moltiplicazione"), /111 × 101, cioè 7 × 5/);
  assert.match(flat("moltiplicazione"), /100011 in decimale fa 35, ed è proprio 7 × 5/);
  assert.match(flat("divisione"), /111100 : 110, cioè 60 : 6/);
  assert.match(flat("divisione"), /Quoziente 1010, resto 0\. Verifica: 10 × 6 \+ 0 = 60/);
  assert.match(flat("dec-bin"), /1001101/);           // 77
  assert.match(flat("dec-bin"), /77 − 64 = 13; 13 − 8 = 5; 5 − 4 = 1; 1 − 1 = 0/);
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

// ---------- Correzioni della nona revisione ----------

test("istruzioni per il robot: la prima pagina non contiene l'istruzione ambigua che la seconda dichiara insufficiente", () => {
  const [p1, p2] = T.LESSON_PAGES["istruzioni-robot"];
  assert.ok(p1.algo.every((a) => !/^Versa l'acqua nel bicchiere/.test(a.t)), "la pagina 1 deve avere solo passi precisi");
  assert.ok(p1.algo.length >= 6);
  assert.match(p2.bubble, /E se scrivessi solo «versa l'acqua nel bicchiere»/);
  assert.ok(p2.algo[0].hl && /Versa l'acqua nel bicchiere/.test(p2.algo[0].t));
});

test("divisione: ogni cifra del quoziente è 0 o 1 (non il quoziente intero), e i passi sono nell'ordine giusto", () => {
  const [p1] = T.LESSON_PAGES.divisione;
  assert.match(p1.bubble, /ogni cifra del quoziente è 0 o 1/);
  assert.doesNotMatch(p1.bubble, /il quoziente è solo 0 o 1/);
  assert.equal(p1.algo.length, 5);
  assert.match(p1.algo[0].t, /Prendi le prime cifre finché il divisore ci sta/);
  assert.match(p1.algo[1].t, /^Abbassa la cifra dopo/);
  assert.match(p1.algo[2].t, /Sì: scrivi 1 e sottrai\. No: scrivi 0/);
  assert.match(p1.algo[3].t, /Ripeti/);
  assert.match(p1.algo[4].t, /resto/);
});

test("moltiplicazione: lo spostamento è spiegato bene e l'esempio ha uno 0 e riporti", () => {
  const [p1, p2] = T.LESSON_PAGES.moltiplicazione;
  assert.match(p1.algo[1].t, /tante posizioni quante sono le cifre alla sua destra: la prima non si sposta, la seconda di 1, la terza di 2/);
  assert.doesNotMatch(flat("moltiplicazione"), /per ogni cifra$/m);
  assert.match(p2.bubble, /111 × 101/);
  assert.match(p2.bubble, /anche uno 0/);
  assert.ok(p2.algo.some((a) => /cifra 0/.test(a.t) && /zeri/.test(a.t)), "la riga dello 0 si vede");
  const rows = E.mulBinary("111", "101");
  assert.equal(rows.result, "100011");
  // la somma 111 + 11100 ha riporti: la difficoltà vera
  assert.ok(E.addBinary("111", "11100").carries.includes("1"));
});

test("sistemi posizionali: il valore dipende dalla cifra E dalla posizione", () => {
  assert.match(flat("sistemi-posizionali"), /il valore di una cifra dipende dalla cifra stessa e dalla posizione che occupa/);
  assert.doesNotMatch(flat("sistemi-posizionali"), /una cifra vale per la posizione/);
});

test("da binario a decimale: gli zeri tengono il posto", () => {
  assert.match(flat("bin-dec"), /Gli zeri non aggiungono niente alla somma, ma tengono il posto/);
  assert.doesNotMatch(flat("bin-dec"), /Gli zeri non contano/);
});

test("coding, benvenuto neutro, ottale-esadecimale, errore tipico, prestiti, resto dei pesi", () => {
  assert.match(flat("algoritmo-pensiero"), /scrivere l'algoritmo in un linguaggio che il computer capisce/);
  assert.doesNotMatch(flat("algoritmo-pensiero"), /come parlare con il computer/);
  assert.match(flat("cassaforte"), /Ti do il benvenuto a Neon Bay/);
  assert.doesNotMatch(flat("cassaforte"), /Benvenuto a/);
  assert.match(flat("ott-esa"), /ogni cifra corrisponde a un gruppo di 3 bit/);
  assert.match(flat("ott-esa"), /ogni cifra corrisponde a un gruppo di 4 bit/);
  assert.doesNotMatch(flat("ott-esa"), /ogni cifra vale/);
  assert.match(flat("ott-esa"), /351₈ = 11101001 = E9₁₆/);
  assert.match(flat("addizione"), /di solito è un riporto sbagliato/);
  assert.doesNotMatch(flat("addizione"), /hai sbagliato un riporto/);
  assert.match(T.LESSON_PAGES.sottrazione[0].bubble, /Si sottrae colonna per colonna da destra, come in decimale; quando non si può, si chiede in prestito/);
  assert.doesNotMatch(flat("sottrazione"), /come sommare, ma con i prestiti/);
  assert.equal(E.groupsToBin("351", 8).bin, "11101001");
  assert.equal(E.binToGroups("11101001", 16).map((g) => g.digit).join(""), "E9");
});

test("'informazione automatica' e 'elaborare' sono nell'argomento informatica; i dati hanno una pagina", () => {
  assert.equal(T.LESSON_PAGES["dati-informazioni"].length, 1);
  assert.match(flat("informatica-termini"), /Informatica viene da «informazione automatica»/);
  assert.match(flat("informatica-termini"), /Elaborare dati e informazioni significa compiere operazioni/);
  assert.doesNotMatch(flat("dati-informazioni"), /informazione automatica/);
  assert.equal(T.LESSON_PAGES["informatica-termini"].length, 3);
});

test("introPlan: teoria iniziale breve", () => {
  // più argomenti di partenza: solo la prima pagina di ciascuno
  assert.deepEqual(T.introPlan(["istruzioni-robot", "dati-informazioni"]), [{ topic: "istruzioni-robot", until: 0 }, { topic: "dati-informazioni", until: 0 }]);
  assert.deepEqual(T.introPlan(["bit-byte", "sistemi-posizionali"]), [{ topic: "bit-byte", until: 0 }, { topic: "sistemi-posizionali", until: 0 }]);
  assert.deepEqual(T.introPlan(["dec-bin", "bin-dec"]), [{ topic: "dec-bin", until: 0 }, { topic: "bin-dec", until: 0 }]);
  // un solo argomento di partenza: la sua lezione intera
  assert.deepEqual(T.introPlan(["addizione"]), [{ topic: "addizione", until: 2 }]);
  assert.deepEqual(T.introPlan(["cassaforte"]), [{ topic: "cassaforte", until: 2 }]);
  assert.deepEqual(T.introPlan(["ott-esa"]), [{ topic: "ott-esa", until: 1 }]);
  assert.deepEqual(T.introPlan([]), []);
  // per ogni capitolo, la teoria iniziale non supera 3 pagine
  for (const ch of G.CHAPTERS) {
    const plan = T.introPlan(G.initialTopics(ch.id).map((t) => t.id));
    const total = plan.reduce((a, it) => a + it.until + 1, 0);
    assert.ok(total >= 1 && total <= 3, `${ch.id}: ${total} pagine di teoria iniziale`);
  }
});
