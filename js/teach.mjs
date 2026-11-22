// Lezioni in micro-pagine (scena con R0b e fumetto, poi il contenuto), una per argomento.
// Si vedono la prima volta che un argomento compare, e si possono rivedere dai progressi.
// Fonti: scheda della lezione 1 e libro (cap. 1 e 2) per teoria e conversioni. Per le operazioni, l'ottale/esadecimale
// e la virgola gli allegati elencano solo gli esercizi: le spiegazioni sono scritte qui, con esempi calcolati dal motore.
//
// pagina = { bubble, mascot?, paras?: [testo], key?: testo, algo?: [{ t, hl?, iff? }] }

import * as E from "./engine.mjs";

const bin = (n) => E.toBin(n);
const wSteps = (n) => E.weightSteps(n).filter((s) => s.bit).map((s) => s.weight).join(" + ");

// ---------- esempi calcolati dal motore ----------
const ADD = { a: bin(11), b: bin(6) };            // 1011 + 110
const addRes = E.addBinary(ADD.a, ADD.b);
const addSteps = E.addSteps(ADD.a, ADD.b);
const SUB = { a: bin(6), b: bin(1) };             // 110 - 1: un prestito semplice
const subSteps = E.subSteps(SUB.a, SUB.b);
const SUBC = { a: bin(8), b: bin(3) };            // 1000 - 11: prestito a catena attraverso gli zeri
const subChain = E.subSteps(SUBC.a, SUBC.b);
const MUL = { a: bin(5), b: bin(3) };             // 101 x 11
const mulRes = E.mulBinary(MUL.a, MUL.b);
const DIV = { a: bin(60), b: bin(6) };            // 111100 : 110
const divRes = E.divSteps(DIV.a, DIV.b);
const frac = E.decimalToBinaryPointDetailed("12,3125");

export const LESSON_PAGES = {
  cassaforte: [
    { bubble: "Benvenuto a Neon Bay. Qui un caveau non si apre con una password: si apre con la somma giusta.", mascot: "neutro",
      paras: ["La cassaforte ha 8 ruote. Ogni ruota ha un peso: 128, 64, 32, 16, 8, 4, 2, 1.", "Ruota accesa = 1: aggiunge il suo peso. Ruota spenta = 0: non aggiunge niente."],
      key: "Il display segna la somma dei pesi delle ruote accese." },
    { bubble: "Guarda i pesi: ogni ruota vale il doppio di quella alla sua destra.", mascot: "neutro",
      paras: [`Per fare ${69}: ${wSteps(69)}. Si accendono le ruote 64, 4 e 1.`, `Le 8 ruote, da sinistra a destra, diventano il codice ${E.toBin(69).padStart(8, "0").replace(/(.{4})(.{4})/, "$1 $2")}.`],
      key: "Il codice binario è la cassaforte scritta con cifre: 1 = ruota accesa, 0 = ruota spenta." },
    { bubble: "Con 8 ruote ci sono 256 combinazioni. Da 0 a 255, e questo caveau ne apre una sola.", mascot: "esulta",
      paras: ["Provaci: accendi le ruote giuste finché il display segna il numero richiesto. Se sbagli, niente drammi: si riprova."] },
  ],

  "istruzioni-robot": [
    { bubble: "Ho sete. Ma so fare solo quello che mi scrivi, un passo alla volta.", mascot: "sete",
      paras: ["Per farmi riempire un bicchiere devi darmi istruzioni giuste. Ecco come si fa:"],
      algo: [{ t: "Prendi il bicchiere." }, { t: "Capovolgilo e posalo sulla cattedra." }, { t: "Prendi la bottiglia con una mano." }, { t: "Con l'altra mano svita il tappo ruotando in senso antiorario." }, { t: "Versa l'acqua nel bicchiere." }],
      key: "Le istruzioni per una macchina devono essere precise, complete, ordinate e non ambigue." },
    { bubble: "«Versa l'acqua nel bicchiere» da sola non mi basta: sottintende troppi passaggi.", mascot: "perplesso",
      paras: ["Una macchina non indovina le intenzioni e non inventa i passaggi mancanti: esegue soltanto istruzioni che è in grado di comprendere."],
      algo: [{ t: "Versa l'acqua nel bicchiere.", hl: true }, { t: "…ma prima? Prendere la bottiglia, svitare il tappo, inclinarla…", iff: true }] },
    { bubble: "Anche istruzioni giuste devono essere nella mia lingua.", mascot: "neutro",
      paras: ["Un computer elabora le informazioni con circuiti elettronici che distinguono due stati, che chiamiamo 0 e 1.", "Tutte le istruzioni vanno scritte con quell'alfabeto di due soli simboli."],
      key: "Un circuito digitale ha a disposizione due simboli: 0 e 1." },
  ],

  "dati-informazioni": [
    { bubble: "Un dato da solo non dice niente. Due dati messi in relazione, invece, sì.", mascot: "neutro",
      paras: ["«2010» e «Paola» sono dati: numeri o sequenze di caratteri.", "«Paola è nata nel 2010» è un'informazione: ora so anche quanti anni ha."],
      key: "Dati = numeri o caratteri. Informazioni = relazioni tra dati che aumentano la nostra conoscenza." },
    { bubble: "Informatica, da «informazione automatica»: far lavorare le macchine su dati e informazioni.", mascot: "esulta",
      paras: ["Elaborare dati e informazioni significa compiere operazioni su di essi: archiviarli, organizzarli o trasformarli in altri dati o informazioni."] },
  ],

  "algoritmo-pensiero": [
    { bubble: "Un algoritmo è una ricetta senza «quanto basta».", mascot: "neutro",
      paras: ["Una sequenza di passi chiari che, eseguiti alla lettera, risolve un problema."],
      key: "Algoritmo = sequenza di istruzioni (step) chiare ed eseguibili da una persona o da una macchina." },
    { bubble: "Per trovare un algoritmo si ragiona in quattro fasi, sempre in questo ordine.", mascot: "neutro",
      algo: [{ t: "Analisi del problema: cerca le regolarità (pattern)." }, { t: "Astrazione: tieni solo gli aspetti importanti." }, { t: "Scomposizione: dividi in sottoproblemi più semplici." }, { t: "Formulazione di algoritmi: scrivi i passi." }],
      key: "È il pensiero computazionale: ragionare su problemi complessi per risolverli in modo automatico." },
    { bubble: "Poi arriva il coding: dire all'algoritmo come parlare con il computer.", mascot: "esulta",
      paras: ["Si individuano le variabili, si scrive l'algoritmo in un linguaggio di programmazione, poi si esegue e si controlla il risultato."] },
  ],

  "informatica-termini": [
    { bubble: "Informatica non vuol dire «saper usare il computer».", mascot: "neutro",
      paras: ["È una scienza alla base di molte tecnologie e applicazioni. Programmare è solo l'ultimo passo: prima si analizza il problema."],
      key: "Tecnologie: Wi-Fi, 5G. Applicazioni: Netflix, Instagram, TikTok." },
    { bubble: "In italiano il computer è anche l'elaboratore: non fa solo calcoli.", mascot: "esulta",
      paras: ["Manipola simboli che rappresentano informazioni. IT = Information Technology. ICT = Information and Communication Technology: sottolinea l'unione tra reti telefoniche e computer."] },
  ],

  storia: [
    { bubble: "Prima dei computer elettronici, i computers erano persone.", mascot: "neutro",
      paras: ["Erano pagate per fare calcoli lunghi e ripetitivi, spesso donne, per esempio nei centri di ricerca aeronautica. Poi servì una macchina per fare tutti quei conti."] },
    { bubble: "Tre idee hanno fatto nascere l'informatica moderna.", mascot: "esulta",
      algo: [{ t: "Leibniz, ’600: calcolare con le sole cifre 0 e 1 (sistema binario)." }, { t: "Boole, ’800: un'algebra per le operazioni logiche, con VERO e FALSO." }, { t: "Shannon, anni ’30 del ’900: la logica di Boole con circuiti a interruttori e relè." }],
      key: "L'ENIAC, invece, usava il sistema decimale: i computer non sono sempre stati binari." },
  ],

  "bit-byte": [
    { bubble: "Il computer ha soltanto due dita: acceso (1) o spento (0).", mascot: "neutro",
      paras: ["Ogni componente può avere solo due stati: corrente (1) oppure niente corrente (0)."],
      key: "Bit = la più piccola unità di informazione (0 o 1). Byte = un gruppo di 8 bit." },
    { bubble: "Per misurare la memoria, ogni unità vale 1024 volte la precedente.", mascot: "esulta",
      paras: ["1 kB = 1024 byte. 1 MB = 1024 kB. 1 GB = 1024 MB. 1 TB = 1024 GB.", "Un byte può codificare un carattere, come una lettera o una cifra."] },
  ],

  "bit-valori": [
    { bubble: "Ogni bit in più raddoppia le combinazioni.", mascot: "neutro",
      paras: [`1 bit → ${2 ** 1} valori. 2 bit → ${2 ** 2}. 3 bit → ${2 ** 3}. 8 bit → ${2 ** 8}.`, "Con n bit si rappresentano 2 × 2 × … × 2 (n volte) = 2ⁿ valori."],
      key: "Un byte (8 bit) rappresenta 256 valori, quindi i numeri interi da 0 a 255." },
  ],

  "sistemi-posizionali": [
    { bubble: "Lo stesso numero si può scrivere in basi diverse, ma la quantità non cambia.", mascot: "neutro",
      paras: ["In un sistema posizionale una cifra vale per la posizione che occupa: 453 = (4 × 100) + (5 × 10) + (3 × 1).", "Per questo 427 e 247 sono numeri diversi, anche se hanno le stesse cifre."],
      key: "La base dice quante cifre diverse ci sono. I pesi sono le potenze della base." },
    { bubble: "In base 10 i pesi sono 1, 10, 100… In base 2 sono 1, 2, 4, 8…", mascot: "esulta",
      paras: [`101 in base 2 = (1 × 4) + (0 × 2) + (1 × 1) = ${E.fromBin("101")}. Si scrive 101₂ per distinguerlo da 101₁₀.`, "Noi usiamo la base 10 perché abbiamo dieci dita."] },
  ],

  "dec-bin": [
    { bubble: "Per passare dal decimale al binario ci sono due metodi. Il primo: i pesi.", mascot: "neutro",
      paras: [`Prendi ${77}. Parti dal peso più grande che ci sta e togli: ${wSteps(77).split(" + ").join(", ")}.`, `Pesi usati: ${wSteps(77)} = 77. Scrivi 1 sotto i pesi usati e 0 sotto gli altri: ${bin(77)}.`],
      key: "Peso che ci sta in quello che resta → 1 e toglilo. Non ci sta → 0." },
    { bubble: "Il secondo metodo: dividere per 2 e leggere i resti dal basso verso l'alto.", mascot: "esulta",
      algo: E.divisionSteps(22).map((s) => ({ t: `${s.dividend} : 2 = ${s.quotient} con resto ${s.remainder}` })),
      paras: [`I resti dal basso verso l'alto danno ${bin(22)}.`], key: "Controprova sempre: riconverti in decimale e deve tornare il numero di partenza." },
  ],

  "bin-dec": [
    { bubble: "Dal binario al decimale: si sommano i pesi dove c'è un 1.", mascot: "neutro",
      paras: [`11010 = (1 × 16) + (1 × 8) + (0 × 4) + (1 × 2) + (0 × 1) = ${E.fromBin("11010")}.`, "Gli zeri non contano: le posizioni con 0 non aggiungono niente."],
      key: "Pesi da destra: 1, 2, 4, 8, 16, 32, 64, 128…" },
  ],

  "bit-necessari": [
    { bubble: "Quanti bit servono? Dipende da quando raggiungi una nuova potenza di 2.", mascot: "neutro",
      paras: [`255 si scrive con ${E.bitsNeeded(255)} bit (${bin(255)}). 256 ne vuole ${E.bitsNeeded(256)} (${bin(256)}).`, `Per 1000 servono ${E.bitsNeeded(1000)} bit: ${bin(1000)}.`],
      key: "Ogni volta che raggiungi una nuova potenza di 2 (2, 4, 8, 16…) serve un bit in più." },
  ],

  addizione: [
    { bubble: "Sommare in binario è facile: ci sono solo quattro casi.", mascot: "neutro",
      algo: [{ t: "0 + 0 = 0" }, { t: "0 + 1 = 1" }, { t: "1 + 1 = 10: scrivo 0 e riporto 1" }, { t: "1 + 1 + 1 = 11: scrivo 1 e riporto 1" }],
      key: "Si somma colonna per colonna, da destra, come alle elementari. Solo che il 2 si scrive 10." },
    { bubble: `Proviamo: ${ADD.a} + ${ADD.b}, cioè ${E.fromBin(ADD.a)} + ${E.fromBin(ADD.b)}.`, mascot: "esulta",
      algo: [...addSteps.map((s, i) => ({ t: s.text.startsWith("Riporto finale") ? s.text : `${E.colName(2 ** s.column)}: ${s.text}`, hl: i === 0 })), { t: `Risultato: ${addRes.result}.` }] },
    { bubble: "Fai sempre tre mosse: converti, opera in binario, verifica in decimale.", mascot: "perplesso",
      paras: [`Verifica: ${E.fromBin(ADD.a)} + ${E.fromBin(ADD.b)} = ${E.fromBin(ADD.a) + E.fromBin(ADD.b)}, e ${addRes.result} in decimale fa ${E.fromBin(addRes.result)}. Se non torna, l'errore è nell'operazione in binario.`],
      key: "Se la verifica non torna, hai sbagliato un riporto: rifai la somma colonna per colonna." },
  ],

  sottrazione: [
    { bubble: "Sottrarre è come sommare, ma con i prestiti.", mascot: "neutro",
      algo: [{ t: "0 − 0 = 0" }, { t: "1 − 0 = 1" }, { t: "1 − 1 = 0" }, { t: "0 − 1 non si può: chiedo in prestito", hl: true }],
      key: "Quando in una colonna non si può sottrarre, si cerca a sinistra il primo 1: quello presta." },
    { bubble: `Un prestito semplice: ${SUB.a} − ${SUB.b}, cioè ${E.fromBin(SUB.a)} − ${E.fromBin(SUB.b)}.`, mascot: "esulta",
      algo: [...subSteps.map((s) => ({ t: s.text, hl: s.chain != null })), { t: `Risultato: ${E.subBinary(SUB.a, SUB.b).result}, cioè ${E.fromBin(SUB.a) - E.fromBin(SUB.b)}.` }, { t: "Verifica in decimale: 6 − 1 = 5." }] },
    { bubble: `Il prestito può attraversare degli zeri: ${SUBC.a} − ${SUBC.b}, cioè ${E.fromBin(SUBC.a)} − ${E.fromBin(SUBC.b)}.`, mascot: "perplesso",
      algo: [...subChain.map((s) => ({ t: s.text, hl: s.chain != null })), { t: `Risultato: ${E.subBinary(SUBC.a, SUBC.b).result}, cioè ${E.fromBin(SUBC.a) - E.fromBin(SUBC.b)}.` }],
      key: "Il primo 1 a sinistra diventa 0, gli zeri che attraversi diventano 1, e nella colonna dove manca hai 10 (cioè 2)." },
  ],

  moltiplicazione: [
    { bubble: "Moltiplicare in binario è copiare e sommare.", mascot: "neutro",
      algo: [{ t: "× 0 = una riga di zeri" }, { t: "× 1 = copio il numero, spostato a sinistra di una posizione per ogni cifra" }, { t: "Alla fine sommo le righe, colonna per colonna" }],
      key: "Per ogni 1 del moltiplicatore scrivi una riga con il primo numero, spostata a sinistra." },
    { bubble: `Proviamo: ${MUL.a} × ${MUL.b}, cioè ${E.fromBin(MUL.a)} × ${E.fromBin(MUL.b)}.`, mascot: "esulta",
      algo: mulRes.rows.map((r, i) => ({ t: `Riga ${i + 1}: ${r}${i ? " (spostata di " + i + ")" : ""}` })).concat([{ t: `Somma: ${mulRes.partials.at(-1)}`, hl: true }, { t: `${mulRes.result} in decimale fa ${E.fromBin(mulRes.result)}, ed è proprio ${E.fromBin(MUL.a)} × ${E.fromBin(MUL.b)}.` }]) },
  ],

  divisione: [
    { bubble: "La divisione in binario è quella lunga delle elementari, ma più facile: il quoziente è solo 0 o 1.", mascot: "neutro",
      algo: [{ t: "Prendi le prime cifre finché il divisore ci sta." }, { t: "Se ci sta: scrivi 1 nel quoziente e sottrai." }, { t: "Abbassa la cifra dopo." }, { t: "Se non ci sta: scrivi 0 nel quoziente." }, { t: "Alla fine, quello che resta è il resto." }],
      key: "Verifica: quoziente × divisore + resto deve dare il dividendo." },
    { bubble: `Esempio: ${DIV.a} : ${DIV.b}, cioè ${E.fromBin(DIV.a)} : ${E.fromBin(DIV.b)}.`, mascot: "esulta",
      algo: [...divRes.steps.map((s, i) => ({ t: s.text, hl: i === 0 })), { t: `Quoziente ${divRes.quotient}, resto ${divRes.remainder}. Verifica: ${E.fromBin(divRes.quotient)} × ${E.fromBin(DIV.b)} + ${E.fromBin(divRes.remainder)} = ${E.fromBin(DIV.a)}.` }] },
  ],

  "ott-esa": [
    { bubble: "Ottale ed esadecimale sono il binario con le cifre raggruppate.", mascot: "neutro",
      paras: ["Ottale (base 8): ogni cifra vale 3 bit. Esadecimale (base 16): ogni cifra vale 4 bit.", "Le cifre esadecimali oltre il 9 sono lettere: A = 10, B = 11, C = 12, D = 13, E = 14, F = 15."],
      key: "Da base 8 o 16 a binario: ogni cifra diventa il suo gruppo di bit. Dal binario: raggruppa da destra." },
    { bubble: "Esempio: 347 in ottale e BA0 in esadecimale.", mascot: "esulta",
      algo: E.groupsToBin("347", 8).chunks.map((c) => ({ t: `${c.digit} → ${c.bits}` })).concat([{ t: `347₈ = ${E.groupsToBin("347", 8).bin}`, hl: true }]),
      paras: [`BA0₁₆ = ${E.groupsToBin("BA0", 16).chunks.map((c) => `${c.digit} → ${c.bits}`).join(", ")} = ${E.groupsToBin("BA0", 16).bin}.`, "Da binario a esadecimale: raggruppa da destra a gruppi di 4, riempiendo con zeri a sinistra se serve."] },
  ],

  "ops-basi": [
    { bubble: "Per calcolare in ottale o in esadecimale non serve inventare niente di nuovo.", mascot: "neutro",
      algo: [{ t: "Porta i numeri in base 10." }, { t: "Fai l'operazione." }, { t: "Riporta il risultato nella base richiesta." }],
      paras: [`Esempio: 3A₁₆ + 20₁₆ = ${E.fromBase("3A", 16)} + ${E.fromBase("20", 16)} = ${E.fromBase("3A", 16) + E.fromBase("20", 16)} = ${E.toBase(E.fromBase("3A", 16) + E.fromBase("20", 16), 16)}₁₆.`],
      key: "Cambiare base non cambia la quantità, solo il modo di scriverla." },
  ],

  virgola: [
    { bubble: "I numeri con la virgola si convertono a metà: prima la parte intera, poi quella dopo la virgola.", mascot: "neutro",
      paras: [`${12},3125: la parte intera 12 diventa ${bin(12)} (con i pesi o le divisioni).`, "Per la parte dopo la virgola si moltiplica per 2 e si prende la cifra prima della virgola."],
      algo: frac.steps.map((s) => ({ t: `${s.from.replace(".", ",")} × 2 = ${s.doubled.replace(".", ",")} → cifra ${s.bit}` })),
      key: `12,3125 in binario si scrive ${frac.text.replace(".", ",")}.` },
    { bubble: "Dopo la virgola i pesi sono metà, un quarto, un ottavo…", mascot: "esulta",
      paras: [`1011,011 = 8 + 0 + 2 + 1 + 0 + 1/4 + 1/8 = ${String(E.binaryPointToDecimal("1011.011")).replace(".", ",")}.`],
      key: "Dopo la virgola i pesi sono 1/2, 1/4, 1/8: cioè 2⁻¹, 2⁻², 2⁻³." },
  ],

  "confronto-basi": [
    { bubble: "Per confrontare numeri scritti in basi diverse li porti tutti in base 10.", mascot: "neutro",
      paras: [`128 (base 10) = 128. 3A (base 16) = ${E.fromBase("3A", 16)}. 10110 (base 2) = ${E.fromBin("10110")}. 56 (base 8) = ${E.fromBase("56", 8)}.`, `In ordine crescente: 10110₂ (22), 56₈ (46), 3A₁₆ (58), 128₁₀.`],
      key: "Cifre uguali in basi diverse sono numeri diversi: conta sempre la base." },
  ],
};

export const hasLesson = (topicId) => Array.isArray(LESSON_PAGES[topicId]) && LESSON_PAGES[topicId].length > 0;
export const lessonFor = (topicId) => (hasLesson(topicId) ? LESSON_PAGES[topicId] : null);
