// Teoria a domande dei quartieri 1-3, ricavata dalla scheda della lezione 1 e dalle pagine 2-4, 19, 20 del libro.
// Ogni domanda ha la risposta giusta in PRIMA posizione: le opzioni vengono mescolate quando si costruisce la missione.
// Le battute stanno in `radio` (DJ Nibble), mai sul ragazzo.

import { shuffle } from "./questions.mjs";

export const LESSONS = {
  1: {
    title: "Robot e algoritmi",
    sub: "Istruzioni precise, dati e informazioni, pensiero computazionale",
    questions: [
      {
        prompt: "Quali caratteristiche devono avere le istruzioni da dare al robot che ha sete?",
        options: ["Precise, complete, ordinate e non ambigue", "Brevi e generali: il robot capisce le intenzioni", "Scritte bene in italiano, anche se sottintendono qualche passaggio"],
        explain: ["Per riempire un bicchiere il robot deve ricevere istruzioni precise, complete, ordinate e non ambigue."],
        radio: "Dire a un robot 'versa l'acqua' è come dire a un taxi 'portami dove devo andare'.",
      },
      {
        prompt: "Perché al robot non basta l'istruzione «versa l'acqua nel bicchiere»?",
        options: ["Sottintende troppi passaggi che la macchina non può inventare da sola", "Contiene una parola che il robot non può conoscere, come «acqua»", "È un'istruzione troppo breve: una macchina vuole frasi più lunghe"],
        explain: ["Una macchina non interpreta intenzioni né passaggi sottintesi: esegue soltanto istruzioni che è in grado di comprendere."],
        radio: "Il robot ha sete di istruzioni, non di acqua.",
      },
      {
        prompt: "Istruzioni corrette bastano sempre al robot?",
        options: ["No: devono anche essere espresse in un linguaggio adatto alla macchina", "Sì: se i passaggi sono giusti, il robot li capisce in qualsiasi lingua", "Sì, ma solo se il robot è abbastanza moderno da intuire le intenzioni"],
        explain: ["Anche istruzioni corrette devono essere espresse in un linguaggio che la macchina sa capire."],
        radio: "Parlare italiano a un circuito è come recitare poesie a un tostapane.",
      },
      {
        prompt: "Che cos'è un algoritmo?",
        options: ["Una sequenza di passi chiari che, eseguiti alla lettera, risolve un problema", "Un linguaggio con cui si scrivono i programmi per il computer", "Un programma già scritto che il computer esegue e salva in memoria"],
        explain: ["Un algoritmo è una sequenza di istruzioni (step) che, se eseguite alla lettera, permettono di risolvere un dato problema."],
        radio: "Una ricetta è un algoritmo. Quella della nonna, però, con 'quanto basta' non vale.",
      },
      {
        prompt: "«2010» e «Paola», da soli, sono...",
        options: ["Dati", "Informazioni", "Algoritmi"],
        explain: ["I dati sono numeri o sequenze di caratteri. «2010» e «Paola» presi da soli non dicono nulla di utile."],
        radio: "Un dato da solo è come un calzino spaiato: serve la coppia.",
      },
      {
        prompt: "«Paola è nata nel 2010, quindi so quanti anni ha»: che cos'è?",
        options: ["Un'informazione: una relazione tra dati che aumenta la mia conoscenza", "Un dato: un numero o una sequenza di caratteri", "Un algoritmo: una sequenza di passi per risolvere un problema"],
        explain: ["Le informazioni sono relazioni tra i dati. Mettendo insieme «Paola» e «2010» conosciamo l'età di Paola."],
        radio: "Le informazioni sono i dati che hanno trovato lavoro.",
      },
      {
        prompt: "Qual è l'ordine delle quattro fasi del pensiero computazionale?",
        options: [
          "Analisi del problema, astrazione, scomposizione, formulazione di algoritmi",
          "Scomposizione, analisi del problema, formulazione di algoritmi, astrazione",
          "Formulazione di algoritmi, analisi del problema, astrazione, scomposizione",
        ],
        explain: ["1 analisi del problema (cercare le regolarità), 2 astrazione, 3 scomposizione in sottoproblemi, 4 formulazione di algoritmi."],
        radio: "Prima si capisce il colpo, poi si scrive il piano. Mai il contrario.",
      },
      {
        prompt: "Che cos'è l'astrazione?",
        options: ["Isolare gli aspetti importanti del problema, trascurando le parti non essenziali", "Dividere il problema in sottoproblemi più piccoli", "Scrivere la soluzione in un linguaggio di programmazione"],
        explain: ["L'astrazione consiste nell'isolare gli aspetti importanti del problema e trascurare quelli non essenziali."],
        radio: "Sulla mappa del metrò non ci sono i tombini: questa è astrazione.",
      },
      {
        prompt: "Che cos'è la scomposizione del problema?",
        options: ["Dividere un problema complesso in sottoproblemi più piccoli e semplici", "Togliere i dettagli inutili", "Individuare le regolarità che lo caratterizzano"],
        explain: ["La scomposizione divide il problema in sottoproblemi più piccoli, quindi più semplici da affrontare."],
        radio: "Un colpo grosso è tanti colpetti messi in fila.",
      },
      {
        prompt: "Da che cosa deriva la parola «informatica»?",
        options: ["Dalla fusione di «informazione» e «automatica»", "Da «informazione» e «matematica»", "Da «informale» e «tecnica»"],
        explain: ["Informatica nasce da «informazione automatica»: l'elaborazione automatica di dati e informazioni."],
        radio: "Informazione + automatica: un po' come 'pigrizia + ingegno'.",
      },
      {
        prompt: "L'informatica è...",
        options: ["Una scienza alla base di molte tecnologie e applicazioni, non solo «saper programmare»", "Una tecnologia per costruire circuiti integrati e sistemi operativi, e nient'altro", "Un'applicazione informatica, come i videogiochi, i social network o i robot"],
        explain: ["Programmare è soltanto l'ultimo passo: prima ci sono l'analisi del problema e lo studio delle strategie per risolverlo."],
        radio: "Saper usare un computer sta all'informatica come saper guidare sta alla meccanica.",
      },
      {
        prompt: "Quale di questi è una TECNOLOGIA e non un'applicazione?",
        options: ["Wi-Fi", "Instagram", "TikTok"],
        explain: ["Wi-Fi e 5G sono tecnologie. Instagram, Netflix e TikTok sono applicazioni basate su quelle tecnologie."],
        radio: "Il Wi-Fi è la strada. Instagram è chi ci passa con la macchina fotografica.",
      },
      {
        prompt: "Quale di questi è un'APPLICAZIONE informatica?",
        options: ["Netflix", "5G", "Wi-Fi"],
        explain: ["Le applicazioni informatiche sfruttano le tecnologie: Netflix usa Internet, il 5G o il Wi-Fi per funzionare."],
        radio: "Se fa venire voglia di 'ancora un episodio', è un'applicazione.",
      },
      {
        prompt: "Perché in italiano «computer» si dice anche «elaboratore»?",
        options: ["Perché non esegue solo calcoli aritmetici: manipola simboli che rappresentano informazioni", "Perché serve soltanto a memorizzare dati e documenti, senza fare calcoli", "Perché «computer» è una parola inglese che in italiano non si può usare"],
        explain: ["Computer significa «calcolatore», ma la macchina elabora anche informazioni, non solo numeri."],
        radio: "Calcolatore suona da ragioniere. Elaboratore suona da regista.",
      },
      {
        prompt: "Che cosa indica la sigla ICT?",
        options: ["Information and Communication Technology", "Internet and Computer Tools", "Italian Computer Tutorial"],
        explain: ["IT = Information Technology. ICT = Information and Communication Technology: sottolinea l'integrazione tra reti telefoniche e computer."],
        radio: "ICT: la sigla che sta bene su ogni curriculum.",
      },
      {
        prompt: "Dopo aver formulato un algoritmo, che cosa fa il coding?",
        options: [
          "Individua le variabili, codifica l'algoritmo in un linguaggio di programmazione, esegue e controlla il risultato",
          "Analizza il problema, lo astrae e lo scompone in sottoproblemi più semplici",
          "Raccoglie i dati e li trasforma in informazioni utili per prendere decisioni",
        ],
        explain: ["Variabili → codifica in un linguaggio comprensibile al computer → esecuzione e verifica del risultato."],
        radio: "Il coding è dire al computer cosa fare, senza mai alzare la voce.",
      },
      {
        prompt: "Che cosa indicava un tempo la parola inglese «computers»?",
        options: ["Persone incaricate di eseguire calcoli, spesso donne", "Grandi macchine a schede perforate per i centri di ricerca", "Le prime calcolatrici elettroniche da tenere sulla scrivania"],
        explain: ["I computers erano persone pagate per fare calcoli lunghi e ripetitivi, per esempio nei centri di ricerca aeronautica."],
        radio: "Il computer più veloce del 1940 aveva un nome, un cognome e una matita.",
      },
    ],
  },

  2: {
    title: "Bit e byte",
    sub: "0 e 1, i valori con n bit, byte e multipli",
    questions: [
      {
        prompt: "Che cos'è un bit?",
        options: ["La più piccola unità di informazione: vale 0 oppure 1", "Un gruppo di otto byte, usato per misurare la memoria", "Una cifra del sistema decimale, da 0 fino a 9"],
        explain: ["Il bit può valere 0 o 1 ed è l'unità di informazione più piccola."],
        radio: "Un bit: l'unico lavoratore che ha solo due umori.",
      },
      {
        prompt: "Che cos'è un byte?",
        options: ["Un gruppo di 8 bit", "Un gruppo di 10 bit", "Un singolo bit molto grande"],
        explain: ["Un byte è un gruppo di 8 bit, per esempio 10010100 o 00110111."],
        radio: "Otto bit insieme fanno un byte: abbastanza per una lettera.",
      },
      {
        prompt: "Perché si dice che il computer «ha soltanto due dita»?",
        options: ["Perché ogni componente può assumere solo due stati: acceso (1) o spento (0)", "Perché i dati si scrivono usando soltanto due tasti della tastiera", "Perché i circuiti sanno contare soltanto fino al numero due"],
        explain: ["I dati sono rappresentati da corrente (1) oppure assenza di corrente (0): ogni componente ha due soli stati."],
        radio: "Due dita, ma tante posizioni: con 8 bit arriva a 255.",
      },
      {
        prompt: "Quanti valori diversi si possono rappresentare con 2 bit?",
        options: ["4", "2", "8"],
        explain: ["2 × 2 = 2² = 4 valori: 00, 01, 10, 11."],
        radio: "Due bit, quattro scelte: abbastanza per un quiz a risposta multipla.",
      },
      {
        prompt: "Quanti valori diversi si possono rappresentare con 8 bit (un byte)?",
        options: ["256", "255", "128"],
        explain: ["2⁸ = 256 valori diversi, che nei numeri interi vanno da 0 a 255."],
        radio: "256 valori, 0 compreso: lo zero conta, anche se non lo vedete mai nel registro di cassa.",
      },
      {
        prompt: "Qual è il numero intero più grande che sta in un byte?",
        options: ["255", "256", "128"],
        explain: ["Con 8 bit si va da 00000000 (0) a 11111111 (255): 256 valori in tutto, il più grande è 255."],
        radio: "Il 255 è il numero preferito di chi fa i conti con otto interruttori.",
      },
      {
        prompt: "Se a un numero di bit ne aggiungi uno, il numero di valori rappresentabili...",
        options: ["Raddoppia", "Aumenta di uno", "Resta uguale"],
        explain: ["n bit → 2ⁿ valori. Con n + 1 bit i valori sono 2ⁿ⁺¹ = il doppio."],
        radio: "Un bit in più e il parcheggio raddoppia. Peccato non valga per quello vero.",
      },
      {
        prompt: "Quanti kilobyte sono 1 megabyte (secondo il libro)?",
        options: ["1024", "8", "100"],
        explain: ["1 MB = 1024 kB = 2²⁰ byte. Ogni multiplo è 1024 volte il precedente."],
        radio: "Nel libro il chilo vale 1024. Al mercato, 1000: occhio a dove fate la spesa.",
      },
      {
        prompt: "Quale di queste unità è la PIÙ GRANDE?",
        options: ["Gigabyte", "Megabyte", "Kilobyte"],
        explain: ["kB < MB < GB < TB: ogni unità vale 1024 volte la precedente."],
        radio: "Un giga è mille e rotti volte un mega. Il rotto sono 24.",
      },
      {
        prompt: "Quanti byte occorrono, indicativamente, per memorizzare un carattere alfanumerico?",
        options: ["1 byte", "1 bit", "1 kilobyte"],
        explain: ["Il libro dice che un byte può codificare un carattere alfanumerico."],
        radio: "Una lettera pesa un byte. Un messaggio d'amore, qualche kB. Una rottura, un mega.",
      },
    ],
  },

  3: {
    title: "Sistemi posizionali",
    sub: "Base 10 e base 2, pesi, potenze",
    questions: [
      {
        prompt: "453 = (4 × 100) + (5 × 10) + (3 × 1). Che cosa mostra?",
        options: ["Il valore di una cifra dipende dalla cifra e dalla posizione che occupa", "Il valore di un numero è soltanto la somma delle sue cifre: 4 + 5 + 3", "Le cifre di un numero decimale valgono tutte uguale, in qualsiasi posizione"],
        explain: ["In un sistema posizionale ogni cifra vale la cifra stessa per il peso della sua posizione."],
        radio: "Nella fila al bar conta quando arrivi, non solo chi sei. Nei numeri uguale.",
      },
      {
        prompt: "Perché 427 e 247 sono numeri diversi, pur avendo le stesse cifre?",
        options: ["Perché le cifre occupano posizioni diverse e quindi hanno pesi diversi", "Perché uno dei due è scritto in decimale e l'altro in un'altra base", "Perché la cifra 4 vale sempre più della cifra 2, in qualsiasi posizione"],
        explain: ["Nel sistema decimale le posizioni valgono unità, decine, centinaia: 427 = 4 centinaia, 247 = 2 centinaia."],
        radio: "Stesse lettere, ordine diverso: 'Roma' e 'amor'. Con i numeri cambia anche il conto in banca.",
      },
      {
        prompt: "Quali sono i pesi delle posizioni in base 10, partendo da destra?",
        options: ["1, 10, 100, 1000…", "1, 2, 4, 8…", "1, 5, 10, 15…"],
        explain: ["Le potenze di 10: 10⁰, 10¹, 10², 10³… Ogni posizione vale 10 volte la precedente."],
        radio: "Dieci volte più di prima, ogni passo: l'aumento dei prezzi in tutta la città.",
      },
      {
        prompt: "Quali sono i pesi delle posizioni in base 2, partendo da destra?",
        options: ["1, 2, 4, 8, 16…", "1, 10, 100, 1000…", "1, 3, 9, 27…"],
        explain: ["Le potenze di 2: 2⁰, 2¹, 2², 2³… Ogni posizione vale il doppio della precedente."],
        radio: "Pesi 1, 2, 4, 8: i numeri che a scuola non vi hanno mai chiesto di imparare, e ora sì.",
      },
      {
        prompt: "Quante cifre diverse ha il sistema binario?",
        options: ["Due: 0 e 1", "Dieci: da 0 a 9", "Sedici: da 0 a F"],
        explain: ["La base indica quante cifre diverse sono disponibili: in base 2 sono 0 e 1."],
        radio: "Due cifre: non ci si può neanche lamentare del menù.",
      },
      {
        prompt: "Perché noi usiamo normalmente il sistema decimale?",
        options: ["Perché abbiamo dieci dita: è più semplice contare con le dita", "Perché il dieci è il numero più grande che un computer sa memorizzare", "Perché i circuiti elettronici distinguono dieci livelli di tensione"],
        explain: ["Il sistema decimale ha base 10 perché abbiamo dieci dita nelle mani."],
        radio: "Se avessimo avuto otto dita, vivremmo in ottale. E andrebbe benissimo.",
      },
      {
        prompt: "Quanto vale 101 scritto in base 2?",
        options: ["5", "101", "3"],
        explain: ["101₂ = (1 × 4) + (0 × 2) + (1 × 1) = 5."],
        radio: "101 in binario vale 5. Sul tabellone dei prezzi del porto, invece, vale 101 dollari.",
      },
      {
        prompt: "Che numero decimale rappresenta 10 in base 2?",
        options: ["2", "10", "1"],
        explain: ["10₂ = (1 × 2) + (0 × 1) = 2: lo stesso numero scritto in un altro modo."],
        radio: "Dieci è solo la maniera di scrivere 'due' quando hai solo due cifre.",
      },
      {
        prompt: "Come si indica la base quando bisogna distinguere due rappresentazioni?",
        options: ["In basso a destra del numero, come 101₂ o 73₁₀", "In alto a sinistra del numero, come un esponente: ²101", "Con un asterisco davanti al numero, come in *101"],
        explain: ["La base si scrive come pedice a destra del numero: 101₂ è diverso da 101₁₀."],
        radio: "Il pedice è la targa del numero: dice in che base è immatricolato.",
      },
      {
        prompt: "Quando si raggiunge una nuova potenza di 2 (2, 4, 8, 16…), per scrivere il numero in binario serve...",
        options: ["Una cifra in più", "Una cifra in meno", "Lo stesso numero di cifre"],
        explain: ["15 si scrive 1111 (4 cifre), 16 si scrive 10000 (5 cifre): a ogni nuova potenza di 2 serve una cifra in più."],
        radio: "Raggiungere una potenza di 2 è come finire le caselle del cruciverba: tocca aggiungerne una.",
      },
    ],
  },
};

// Missione di teoria su un quartiere: tutte le domande del pool (max `count`), con le opzioni mescolate.
export function buildLessonMission(rng, key, count = 8) {
  const lesson = LESSONS[key];
  if (!lesson) throw new RangeError(`quartiere sconosciuto: ${key}`);
  const picked = shuffle(rng, lesson.questions).slice(0, count);
  return picked.map((t, i) => ({
    id: i + 1,
    kind: "choice",
    prompt: t.prompt,
    options: shuffle(rng, t.options),
    answer: t.options[0],
    explain: t.explain,
    radio: t.radio,
  }));
}
