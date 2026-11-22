# Neon Bay — design

Direzione visiva per l'app che insegna il binario a Neri (16 anni). Questo file spiega le scelte
e come integrarle. I file veri sono qui accanto:

| File | Cosa c'è |
|---|---|
| `tokens.css` | Tutti i token su `:root`, tema chiaro + scuro |
| `components.css` | Componenti (richiede `tokens.css`) |
| `mascot/r0b-*.svg` | La mascotte R0b in 6 espressioni |
| `mascot/_build.py` | Generatore della mascotte (modifica qui, non a mano negli SVG) |
| `vault-door.svg` | Porta del caveau (boss), da mettere inline: volantino e bulloni si animano da CSS |
| `trophy.svg` | Trofeo del caveau (coppa con buco della serratura) |
| `map-sky.svg` | Skyline di Neon Bay per la testata della mappa (da mettere inline) |
| `preview.html` | Anteprima di tutto, interattiva. Con il server di David: `http://localhost:8765/design/preview.html` |

## 1. Direzione

**Neon Bay** è una città costiera di sera: cielo al tramonto, insegne al neon, una cassaforte
da aprire con i numeri. Il tono è da film di colpi alla *Ocean's*: si vince con codici e
ingegno, mai con violenza, armi o droga.

- **Originalità.** Niente rimandi visivi a giochi esistenti: niente font "da videogioco
  famoso", niente loghi in corsivo rosa, niente mappa o personaggi riconoscibili. Il tramonto
  neon è un linguaggio di genere (synthwave), non di un titolo.
- **Ironico ma non infantile.** Colori saturi solo dove servono (azione, esito, cifre). Il
  resto è un fondo calmo, notte viola o alba pesca. R0b parla come un complice, non come
  una maestra.
- **Il numero è l'eroe.** Le cifre sono sempre in monospazio con zero barrato e larghezze
  tabellari. Ogni base ha il suo colore.

## 2. Temi

Il tema segue `prefers-color-scheme`. Per forzarlo: `<html data-theme="light">` oppure `"dark"`.

- **Notte (scuro):** fondo `#140d2b`, accenti neon (rosa `#ff4fa3`, arancio `#ff9a3c`,
  viola `#a985ff`, ciano `#3ee6ff`). Le azioni principali hanno un leggero bagliore (`--glow`).
- **Alba (chiaro):** fondo `#fff7f2`. Gli stessi tinte sono scurite a "inchiostro" per
  restare leggibili; niente bagliore.
- **Cassaforte:** resta scura in entrambi i temi. È un oggetto, non un pannello.

### Token semantici (usa questi, non le primitive)

| Token | Uso | Chiaro | Scuro |
|---|---|---|---|
| `--c-bg` / `--c-bg-sky` | sfondo / gradiente cielo | `#fff7f2` | `#140d2b` |
| `--c-surface`, `--c-surface-2` | card, campi | `#fff`, `#ffeee5` | `#1e1540`, `#2a1f55` |
| `--c-border` | bordi | `#f6d9cf` | `#3d2f73` |
| `--c-text`, `--c-text-muted` | testo | `#241540`, `#64547e` | `#f4efff`, `#b8acd9` |
| `--c-primary` / `--c-on-primary` | azione principale | `#b8165f` / bianco | `#ff4fa3` / `#1a0614` |
| `--c-secondary` | spiegazioni, indizi, colonna attiva | `#6236c9` | `#a985ff` |
| `--c-accent` | etichette insegna | `#a34700` | `#ff9a3c` |
| `--c-digit` | cifre e risultati | `#00707f` | `#3ee6ff` |
| `--c-success` / `-bg` | giusto | `#0f7a48` | `#4ff0a8` |
| `--c-danger` / `-bg` | sbagliato | `#c0262f` | `#ff6b7a` |
| `--c-cash` | contanti $ | `#7d5a00` | `#ffd166` |
| `--c-wanted` / `-off` | stella ricercato accesa / spenta (contorno) | rosso / muted | rosso neon / `#b8acd9` |
| `--c-base-2/8/10/16` | colore di ogni base | ciano / viola / arancio / rosa | idem neon |
| `--c-carry` | riporti e prestiti | arancio | arancio neon |
| `--c-focus` | anello di focus | viola | ciano |

Ci sono anche spazi (`--sp-1…7`, base 4px), raggi (`--r-sm/md/lg/pill`), misure
(`--tap: 44px`, `--tap-lg: 56px`, `--gutter: 16px`, `--maxw: 34rem`), scala tipografica fluida
(`--fs-xs…--fs-num`) e durate (`--dur-fast/med/slow`). Con `prefers-reduced-motion` le durate
vanno a 0 e le animazioni si spengono.

**Contrasto, verificato con script (WCAG), in entrambi i temi:**

- Ogni colore di testo semantico è ≥4.5:1 su `bg`, `surface` e `surface-2`. Il minimo è
  `--c-success` su `surface-2` chiaro, 4.78:1.
- Sono ≥4.5:1 anche:
  - i testi su `success-bg` e `danger-bg`;
  - il titolo dell'indizio sulla sua tinta;
  - i riporti sulla pillola della catena;
  - le cifre sulle strisce delle colonne;
  - tutto il testo della cassaforte.
- Gli elementi UI sono ≥3:1: i contorni delle stelle spente e dei puntini di progresso. Le
  ruote spente della cassaforte si distinguono dal bordo chiaro, non dal riempimento.
- I badge delle basi tengono il testo in `--c-text` e mettono il colore su bordo e puntino:
  alcune tinte su fondo tinto scendevano sotto 4.5.

Se aggiungi coppie nuove (testo colorato su una tinta), verificale.

## 3. Tipografia

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bungee&family=JetBrains+Mono:wght@500;700;800&display=swap">
```

| Ruolo | Font | Perché |
|---|---|---|
| Insegne (`--font-sign`) | Bungee | Lettering da insegna. Solo maiuscole, solo etichette brevi |
| UI (`--font-ui`) | Atkinson Hyperlegible | Nato per la leggibilità: 1, l e I sono ben distinti |
| Cifre (`--font-mono`) | JetBrains Mono + `font-feature-settings: var(--num-features)` | Zero barrato (0 ≠ O) e cifre tutte larghe uguali: le colonne restano allineate |

Ogni font ha un fallback di sistema: senza rete l'app resta usabile.

**Attenzione:** in Bungee lo 0 e la O sono identici. Niente cifre in `--font-sign`: il nome
della mascotte va scritto `R<span class="num">0</span>b`. Per un numero dentro il
testo usa `.num`, oppure `.n` se serve anche il pedice della base.

## 4. Mascotte: R0b, l'informatore

Un robottino con la faccia su uno schermo. Il corpo è identico in tutte le varianti; cambiano
solo la faccia, le braccia, il LED dell'antenna e il **nibble sul petto**: 4 LED che "pensano"
in binario (`1111` quando esulta, `0000` quando è giù).

| File | Quando |
|---|---|
| `r0b-neutro.svg` | Spiega, introduce, radio |
| `r0b-esulta.svg` | Risposta giusta, missione riuscita |
| `r0b-triste.svg` | Missione fallita (5 stelle) |
| `r0b-perplesso.svg` | Errore su un passaggio, "la verifica non torna" |
| `r0b-sete.svg` | Lezione 1: il robot che ha sete (bicchiere vuoto) |
| `r0b-podio.svg` | Fine quartiere, boss battuto |

- **Uso.** Funziona sia con `<img src>` sia incollato inline. Le espressioni non hanno `id`,
  quindi più mascotte nella stessa pagina non vanno in conflitto.
- **Colori.** Vengono da `var(--mascot-*, fallback)`. Inline si possono cambiare dai token,
  per esempio per le skin del negozio: basta ridefinire `--mascot-body` o `--mascot-face` su
  un contenitore.
- **Accessibilità.** Ogni SVG ha `role="img"` e un `<title>`. Se la mascotte è decorativa,
  usa `alt=""`.

## 5. Componenti

Le convenzioni: `.blocco`, `.blocco__parte`, `.blocco--variante`. Gli stati interattivi usano
gli attributi ARIA (`aria-pressed`, `disabled`); gli esiti usano `.is-correct` / `.is-wrong`.

### HUD: ricercato e contanti

```html
<div class="hud">
  <ul class="wanted" data-level="2" role="img" aria-label="Ricercato: 2 stelle su 5">
    <li><svg class="wanted__star is-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg></li>
    … 5 stelle in tutto …
  </ul>
  <span class="cash" aria-label="Contanti: 1250 dollari">$ 1.250 <span class="cash__delta">+50</span></span>
</div>
```

- **Stelle.** `.is-on` = accesa. `.is-new` sulla stella appena accesa la fa entrare con
  un'animazione. Con `data-level` a 4 o 5 le stelle pulsano piano. Le stelle spente sono solo
  contorno, ma visibile (≥3:1).
- **Progresso missione.** `.progress` con dentro `.progress__dot` (`.is-done`, `.is-current`).

### Domanda

- **Scelta multipla.** `.q` > `.q__kicker` (missione), `.q__prompt`, `.q__code` (numero
  grande) e la lista `.choices` > `.choice`. Gli esiti sono `.is-correct` / `.is-wrong`.
  Dentro ogni `.choice` ci sono le due icone `.choice__mark--ok` / `--ko`, mostrate in base
  allo stato: l'esito non è mai affidato solo al colore. Per risposte lunghe usa
  `.choices--stack`.
- **Risposta numerica.** `.answer` > `.answer__input` + `.btn.btn--primary`. Gli esiti vanno
  su `.answer` (`.is-correct` / `.is-wrong`).
  - Il campo ha font ≥16px, così iOS non zooma.
  - In base 2 e 10 usa `inputmode="numeric"`.
  - In base 16 usa un campo di testo con `autocapitalize="characters"`.

### Esercizio guidato a passaggi

```html
<article class="card">
  <h1 class="op-title"><span class="op-title__name">Addizione</span>
    <span><span class="n n--10">59<sub>10</sub></span> + <span class="n n--10">37<sub>10</sub></span></span>
    <span class="base base--2">in BIN <b>2</b></span></h1>
  <ol class="steps">
    <li class="step is-done"><span class="step__label">59 in binario</span><span class="step__result">111011</span></li>
    <li class="step is-current"><span class="step__label">…</span><span class="step__result">?</span>
      <!-- qui dentro, a tutta larghezza: .colop-wrap e/o form.answer --></li>
    <li class="step"><span class="step__label">Verifica in base 10</span><span class="step__result"></span></li>
  </ol>
</article>
```

Il numero del passaggio lo genera la CSS con un contatore. Su `.is-done` diventa ✓ verde, su
`.is-current` diventa un cerchio rosa.

### Operazione in colonna (`.colop`)

È un'unica griglia CSS con `--cols + 1` colonne: la prima è per il segno, le altre per le
cifre. Ogni riga ha **esattamente** `cols + 1` figli `<span>`; le celle vuote sono `<span></span>`.

```html
<div class="colop-wrap">
  <div class="colop" style="--cols:7; --tracks:8; --col:4" role="img" aria-label="111011 più 100101 …">
    <i class="colop__focus" aria-hidden="true"></i>      <!-- solo se c'è --col -->
    <span></span> … <span class="colop__carry">1</span> …  <!-- riga riporti -->
    <span></span> … <span class="colop__dig">1</span> …    <!-- a -->
    <span class="colop__op">+</span> … <span class="colop__dig">1</span> …  <!-- b -->
    <i class="colop__rule" aria-hidden="true"></i>
    <span></span> … <span class="colop__res is-blank"></span> … <span class="colop__res">0</span>
  </div>
</div>
```

**Variabili**
- `--cols` è il numero di cifre della riga più lunga, cioè `result.length` (o la riga più
  lunga dei `rows` nella moltiplicazione).
- `--tracks` = `cols + 1`. Impostalo da JS come intero: Safari non accetta in modo affidabile
  `calc()` come numero di ripetizioni in `repeat()`.
- `--col` è la colonna evidenziata contata **da destra** (1 = unità), lo stesso verso dei
  riporti. Senza `--col` non c'è evidenza.

**Dimensioni.** Le celle si adattano al contenitore (`cqi`) fino a 2.4rem. A 320px, con 9
colonne, restano circa 24px e il testo ~15px: niente scroll orizzontale. Le colonne alterne
sono a strisce partendo dalle unità.

**Stati delle celle**
- `.colop__res.is-blank` è la casella da riempire (tratteggiata).
- `.is-new` fa entrare la cifra appena scritta.
- `.is-wrong` sottolinea in rosso ondulato.
- La dimensione minima dei riporti è 11px.

**Dai tuoi dati (`q.column`) alla griglia**

| `op` | Righe da disegnare |
|---|---|
| `+` | riporti (`carries`), `a`, `b` con `+`, linea, `result`. Disegna solo i `1` dei riporti; gli `0` diventano celle vuote. |
| `−` | fila prestiti, `a`, `b` con `−`, linea, `result`. Regole sotto la tabella. |
| `×` | `a`, `b` con `×`, linea sottile (`.colop__rule.is-thin`), poi le righe di `rows` come `.colop__dig.is-partial`, con `+` nel segno dell'ultima. Gli **0 di spostamento ci sono già** nelle tue stringhe: disegnali come cifre vere con in più `.is-shift` (grigio, sottolineato a puntini). Poi linea e `result`. |
| `:` | La divisione lunga non va in colonna: usa `.steps` o la lista `.solution ol` con le frasi di `steps`. Il simbolo è sempre `:`. |

**Prestiti nella sottrazione.** Sopra ogni colonna toccata da un prestito va il valore che
quella cifra ha **adesso**, in binario:
`cifra originale − (1 se ha prestato) + (10 se ha ricevuto)`.

In una catena cambiano solo le colonne alle estremità; quelle in mezzo valgono 1.

| Colonna | Cosa succede | Valore sopra |
|---|---|---|
| ha prestato e basta | 1 → | `0` |
| in mezzo alla catena | ha ricevuto 10 e prestato 1 | `1` |
| ha solo ricevuto | | `10` |

Per esempio `1000 − 11` porta sopra `0 1 1 10`.

Come marcare le celle:
- ogni cifra di `a` che ha prestato prende `.colop__dig.is-lent` (barrata);
- ogni valore sopra è `<span class="colop__carry is-borrow">`;
- se la catena è più lunga di una colonna, le celle riporto coinvolte prendono `.is-chain`,
  con `.is-chain-start` sulla prima e `.is-chain-end` sull'ultima. Diventano una pillola unica.

Se `q.column` può darti direttamente questi valori per colonna (es. `borrowed: ["0","1","1","10"]`),
è più sicuro che ricavarli da `borrows` nel renderer.

Allinea tutte le stringhe **a destra**: riempi a sinistra con celle vuote fino a `--cols`.
Metti un `aria-label` testuale su `.colop`: le singole celle non hanno senso per uno screen
reader.

### Feedback

Ci sono due forme, con lo stesso contenuto:

- **Foglio dal basso** (default `.feedback`): resta incollato in fondo, è comodo per il
  pollice, si ferma al 75% dell'altezza e scorre dentro.
- **Nella card** (`.feedback.feedback--inline`): è come lo usa oggi il prototipo.

| Variante | Quando | Mascotte |
|---|---|---|
| `.feedback--ok` | giusto | esulta |
| `.feedback--ko` | sbagliato (accende una stella) | triste o perplesso |
| `.feedback--hint` | "La verifica non torna": è un indizio, quindi viola, niente rosso, niente vibrazione | perplesso |

**Struttura:** `img.feedback__mascot`, `p.feedback__title` (icona + testo), `p.feedback__text`,
poi a scelta:
- `ol.feedback__explain`: le righe di spiegazione del singolo passaggio sbagliato (il tuo
  `unit.explain`);
- `details.solution` > `summary` "Rifacciamolo insieme" + `.colop-wrap` + `ol` (il tuo
  `q.explain`). Il riquadro è neutro con bordo viola: è il compagno che ti rifà il conto,
  non il voto in rosso;
- `p.feedback__tip`: la riga piccola con la conseguenza ("+1 stella ricercato…");
- `.btn`, che prende il colore della variante.

**Tono dei testi:** prima cosa è successo ("hai scritto 1011110, cioè 94"), poi quanto manca
("ne mancano 2"), poi l'indizio. Il titolo `ko` non dice mai "Sbagliato!"; per esempio "Quasi.
Un riporto è scappato".

### Badge delle basi

```html
<span class="base base--2">BIN <b>2</b></span>  <span class="base base--8">OTT <b>8</b></span>
<span class="base base--10">DEC <b>10</b></span> <span class="base base--16">HEX <b>16</b></span>
<span class="n n--16">3B<sub>16</sub></span>   <!-- numero con pedice colorato -->
```

Il colore è sempre accompagnato da sigla e numero.

| Base | Colore |
|---|---|
| 2 | ciano, lo stesso delle cifre |
| 8 | viola |
| 10 | arancio |
| 16 | rosa |

### Progressi ("gioca e basta")

Il gioco sceglie le domande; le schermate mostrano soltanto dove si è arrivati. I nomi delle
classi sono quelli del prototipo (`.board`, `.chapter`, `.topic`, `.chip`): il tuo markup
funziona già. Togli le regole omonime da `css/style.css`, che altrimenti vincono perché si
caricano dopo.

**Chip di stato (`.chip--superato|toccato|bocciato|non-toccato`)**

Ogni stato si riconosce anche senza colore, da quattro segnali: icona, parola, riempimento e
tipo di bordo.

| Stato | Icona | Riempimento e bordo |
|---|---|---|
| Superato | ✓ | pieno verde |
| Toccato | cerchio mezzo pieno | bordo viola |
| Bocciato | ✕ | tinta rossa |
| Non toccato | cerchio vuoto | bordo tratteggiato |

**L'icona la disegna la CSS.** Nel chip scrivi solo la parola (`Superato`, `Toccato`,
`Bocciato`, `Non toccato`). I simboli ◐ e ○ non esistono nei font scelti: sui telefoni escono
minuscoli o diversi. Attenzione al tuo `CHIP[...].slice(2)`: con le sole parole va tolto.

**Capitolo (`.chapter`)**
- `.chapter__head` con il titolo e `.chapter__badge`: niente classe se non è iniziato
  (tratteggio), `.is-covered` per "Coperto" (bordo viola), `.is-complete` per "Superato"
  (pieno verde con ✓).
- `.chapter__bar` contiene fino a tre `<i>` con `style="width:%"`: `.is-passed` (pieno
  verde), `.is-touched` (viola a righe), `.is-failed` (rosso a puntini). I tre riempimenti si
  distinguono anche in bianco e nero. Il segmento `.is-failed` è nuovo: conviene mostrare
  quanti argomenti sono da ripassare.
- `.chapter__count` (facoltativo): "**4** toccati su 5 · **1** superato".

**Argomento (`.topic.topic--<stato>`)**
- Contiene il nome, il punteggio, il chip e `Allenati`.
- Sui **bocciati** `Allenati` è pieno, nel colore primario: è l'azione da fare.
- Sugli argomenti bloccati aggiungi `.is-locked` al `<li>`: nome in muted e "Si apre dopo: …"
  in corsivo.
- Su telefono il chip e il bottone stanno sulla stessa riga.

**Riepilogo numerico (`ul.stats`)**: quattro riquadri con il numero grande e l'etichetta
(superati, in corso, da ripassare, da toccare). Sta bene in home sotto "Gioca" e in cima ai
progressi; è un'alternativa più visiva alla riga di testo. Il riquadro "da ripassare" ha il
bordo rosso, "da toccare" il bordo tratteggiato.

**Linea dei capitoli (`ol.metro`)**: è la metropolitana della mappa, orizzontale e compatta.
Ha una fermata per capitolo e **non si tocca**: si guarda e basta.
- Stati della fermata (vedi anche "Capitoli in home" per `.is-perfect` e `.is-review`):
  - `.is-complete`: verde con la spilla ✓;
  - `.is-covered`: numero su viola pieno;
  - `.is-started`: numero col bordo viola;
  - `.is-new`: tratteggio, con il binario tratteggiato.
- `.is-hub` va su Operazioni: nodo più grande.
- Le etichette si alternano sotto e sopra il binario, così ognuna ha lo spazio di due colonne
  e a 320px non si spezzano. Tienile corte (circa 12 caratteri): Algoritmi, Codifica,
  Operazioni, Ottale / esa, Virgola.
- Metti un `aria-label` riassuntivo sull'`<ol>`.
- Starebbe bene sia in home sia in cima a "I miei progressi".

**Home**: `.home__play` è il tasto grande in insegna, con ▸. Sotto vanno `.stats` (o la riga
di testo) e, se c'è un bocciato, `Ripassa: …` come `.btn--ghost.btn--block`.

**Riepilogo di fine partita (`.topics--summary`)**

```html
<li class="topic topic--superato is-up">
  <div class="topic__main"><span class="topic__name">Addizione in binario</span>
    <span class="pips" role="img" aria-label="3 su 4 giuste"><i class="is-ok"></i><i class="is-ok"></i><i class="is-ko"></i><i class="is-ok"></i></span></div>
  <span class="topic__change"><span class="chip chip--toccato chip--was">Toccato</span>
    <span class="topic__arrow" aria-label="diventa">→</span><span class="chip chip--superato">Superato</span></span>
</li>
```

- **Pallini delle risposte.** `.pips` mostra un pallino per risposta: pieno con ✓ se giusta,
  vuoto con ✕ se sbagliata. Sostituisce "3 su 4 giuste", che resta nell'`aria-label`.
- **Cambio di stato.** `.topic__change` mostra lo stato di prima (`.chip--was`, più spento),
  la freccia e lo stato di dopo. Se lo stato non cambia, solo il chip.
- **Salito o sceso.** `.is-up` sul `<li>` aggiunge un contorno verde e fa entrare il chip
  nuovo con un piccolo salto; `.is-down` aggiunge un contorno rosso.
- **Ordine.** Prima quelli saliti, poi gli invariati, poi quelli scesi: si chiude con quello
  da sistemare.

### Capitoli in home: sei stati (`.course`)

La home ha un tasto solo, **Gioca**, e sotto l'elenco ordinato dei 7 capitoli (0–6) con lo
stato di ciascuno. Toccando un capitolo si apre il dettaglio: ogni card ha la freccia ›. Il
markup è quello di David: `button.course__item.course__item--<stato>` con `.course__n`,
`.course__main` (`.course__title`, `.course__detail`) e `.course__state.course__state--<stato>`
(icona + parola).

**Gerarchia:** i due stati "superato" sono pieni, il perfetto in più è oro; poi viene
l'attenzione (rosso tenue), poi il lavoro in corso (viola), poi il quieto (tratteggio).

| Stato | Card | Nodo | Pillola |
|---|---|---|---|
| `perfetto`, superato alla perfezione | bordo a gradiente oro-arancio, tinta oro, bagliore; titolo in oro | medaglione oro con stellina ★ nell'angolo | piena oro, ★ |
| `superato`, non alla perfezione | bordo verde | pieno verde | piena verde, ✓ |
| `da-ripassare` | tinta e bordo rossi | contorno rosso | contorno rosso, ! |
| `coperto` | bordo viola | **pieno** viola | contorno viola, cerchio mezzo pieno |
| `in-corso` | bordo viola | **contorno** viola | contorno viola, cerchio vuoto |
| `da-iniziare` | tratteggio, trasparente, senza ombra | tratteggiato | tratteggiata, cerchio tratteggiato |

- Le icone a pallino sono `.state-dot--half`, `--ring` e `--dash`. Le icone SVG (★ ✓ !) sono
  quelle di `STATE_ICON` in `app.js`.
- **Animazione.** `.is-new-state` sul `.course__item` perfetto fa saltare il medaglione una
  volta. Usalo quando il capitolo è appena diventato perfetto, per esempio tornando alla home
  dopo la partita.
- **Badge nei progressi.** `.chapter__badge` ha gli stessi stati:
  - `.is-perfect`: pieno oro con ★;
  - `.is-complete`: pieno verde con ✓;
  - `.is-review`: tinta rossa con !;
  - `.is-covered`: pieno viola;
  - `.is-started`: contorno viola;
  - nessuna classe: tratteggio.

**La metro in cima ai progressi (`ol.metro`, `--stops: 7`).**

Il nodo mostra **sempre il numero** del capitolo. Gli stati:

| Classe | Nodo | Spilla nell'angolo |
|---|---|---|
| `.is-perfect` | oro | ★ |
| `.is-complete` | verde | ✓ |
| `.is-review` | contorno rosso | ! |
| `.is-covered` | viola pieno | nessuna |
| `.is-started` | contorno viola | nessuna |
| `.is-new` | tratteggiato | nessuna |

Altre regole:
- `.is-hub` va su Operazioni.
- Le etichette si alternano sopra e sotto il binario. **Sotto i ~30rem di larghezza (7 fermate
  su telefono) si nascondono**: restano i numeri, l'elenco dei capitoli è subito sotto e
  l'`aria-label` dell'`<ol>` riassume tutto.
- Le etichette brevi suggerite sono Cassaforte, Algoritmi, Bit e byte, Dec → bin, Operazioni,
  Ottale / esa e Virgola.

### Traguardo in pausa (`.topic__was`, `.course__was`, `.chapter__was`)

Quando un argomento o un capitolo già superato scende di stato, resta una riga piccola:
"Superato il **19/11**: 3 errori recenti, rifai giuste le prossime per tornarci".

- **Tono:** il trofeo non si perde, è in pausa. Per questo c'è una **stella d'oro vuota**
  (solo contorno, il posto è tenuto) e la data è in oro.
- Il testo è in muted, **non corsivo**: il corsivo a 13px su telefono si legge male.
- Metti la data in `<b>` per farla diventare oro.

### Lezione (`.lesson`)

È la teoria in micro-pagine:
1. Scena: R0b con un fumetto, `.bubble` (la coda punta verso di lui). Nella lezione 1 R0b è
   `r0b-sete.svg`.
2. Contenuto (`.lesson__body`) con:
   - `.lesson__key`: la definizione da ricordare, in un riquadro viola;
   - `ol.algo`: un algoritmo scritto come istruzioni per il robot, numerate `01`, `02`…;
     `li.is-if` rientra i passi dentro un "se…", `li.is-highlight` evidenzia il passo di cui
     si parla.
3. Piede (`.lesson__foot`):
   - `.pager` con un puntino per pagina (`.is-done`, `.is-current`, allungato);
   - Indietro (ghost) e Avanti (primario).

L'ultima pagina può avere "Ho capito", che porta alle domande. Markup completo nel commento di
`components.css`.

### Combinazione sotto i pesi (`.ruler-form`)

Il markup è quello di David: `.ruler` con gli 8 `span.ruler__w` e poi gli 8
`input.ruler__cell`.
- **Layout.** Sotto i 26rem va in **2 file da 4**, un nibble per fila, con ogni peso sopra
  la sua cifra: 8 caselle in fila a 320px sarebbero larghe ~32px. Sopra i 26rem va in 1×8,
  con uno spazio tra i nibble. La posizione la fa la CSS, il markup non cambia.
- **Casella vuota.** È tratteggiata se ha `placeholder=" "`.
- **Esiti.** `.ruler-form.is-correct` (tutte verdi) e `.ruler__cell.is-wrong`, insieme a
  `.ruler-form.is-wrong`, per le singole cifre sbagliate.

### Struttura a capitoli

Il percorso è: home "Scegli un capitolo" → schermata del capitolo → teoria → domande → fine
partita.

**Home: il consigliato.** Basta lo `<span class="course__next">Consigliato</span>` nel titolo:
la card si accende da sola, con contorno e freccia rosa (`:has`). Il markup non cambia.

**Segno del caveau sulla card** (`span.course__vault`, primo figlio del `button`): un'etichetta
in alto a destra con icona e parola.

| Classe | Aspetto | Testo |
|---|---|---|
| `--ready` | chiave, oro, pulsa piano | "Caveau aperto" |
| `--won` | coppa | "Trofeo" |
| `--closed` | lucchetto, grigio | esiste, ma in home **consiglio di non mostrarlo**: sarebbe rumore su quasi tutte le card |

**Schermata del capitolo (`.chapter-page`)**, nell'ordine:
1. `button.chapter-page__back` "‹ Capitoli", piccolo, in alto.
2. `header.chapter-hero.chapter-hero--<stato>`, la testata. Contiene:
   - il medaglione `.chapter-hero__n`, con gli stessi sei stati della home, oro con ★ se
     perfetto;
   - `.chapter-hero__kicker` "Capitolo N" (o "Riscaldamento"), `.chapter-hero__title` e
     `.chapter-hero__src`;
   - `.chapter-hero__status` con `.chapter__badge` e `.chapter-hero__detail`;
   - `.chapter__bar`, e se servono `.chapter__count` e `.chapter__was`.
   
   Lo sfondo è il cielo dell'app.
3. `.chapter-cta` con:
   - `ol.flow`: "1 Teoria breve → 2 Domande", che spiega come funziona. Il passo attuale è
     `.is-current`; quello fatto è `.is-done` con ✓ al posto del numero.
   - il tasto grande `.btn--primary`: "Inizia il capitolo", "Continua con le domande" o
     "Rigioca il capitolo";
   - "Rivedi la teoria (N lezioni)" in ghost.
4. `section.chapter-vault.chapter-vault--closed|ready|won`, il caveau del capitolo. È scuro in
   entrambi i temi, come la cassaforte. Contiene `.chapter-vault__icon` (la porta inline,
   oppure la coppa se vinto), `.chapter-vault__title`, `.chapter-vault__text` ed
   eventualmente un `.btn`.

   | Stato | Aspetto | Testo |
   |---|---|---|
   | chiuso | tratteggio, porta spenta | "Supera il capitolo alla perfezione e il caveau si apre." |
   | da tentare | bordo e bagliore oro, tasto oro "Tenta il caveau" | "Tre passaggi, niente stelle: se non riesce, riprovi quando vuoi." |
   | vinto | coppa | "Trofeo conquistato il **22/11** · $ 500" |
5. `section.chapter-page__topics` con `h2` "Argomenti" e la lista `.topics` già usata. Il tasto
   "Lezione" (`[data-lesson]`) ha il bordo tratteggiato, per essere più leggero di "Allenati".
6. "Torna ai capitoli".

### Il caveau (boss) (`.boss`)

```html
<section class="boss" data-step="2">
  <header class="boss__head"><p class="boss__kicker">Caveau · Capitolo 4</p><h1 class="boss__title">La Torre dei Conti</h1></header>
  <div class="boss__stage">…vault-door.svg INLINE…</div>
  <ol class="boss__steps"><li class="is-done">Ruote</li><li class="is-current">Domanda</li><li>Combinazione</li></ol>
  <div class="boss__task">…la prova del passaggio: .vault, .q, .ruler-form…</div>
  <p class="boss__note">Nessuna stella in gioco. Se sbagli, il caveau resta lì.</p>
</section>
```

- **Avanzamento.** `data-step="1|2|3"` fa girare il volantino della porta di 120° a ogni
  passaggio. I bulloni sono 8, come i bit, e se ne accendono 3, poi 6, poi tutti.
- **Vittoria.** `.is-open` porta il volantino a 360°, accende la spia verde e il bagliore
  oro. Sotto metti `figure.trophy.trophy--big` con `trophy.svg`, la coppa che entra con un
  salto, più R0b sul podio e "+ $ 500 e un trofeo nel profilo".
- **Ritirata o sconfitta.** Usa un `.feedback--hint`, non `--ko`: non si perde niente.
- **Bottoni ghost sul buio.** Dentro `.boss`, `.chapter-vault`, `.vault` e `.radio`,
  `.btn--ghost` è chiaro in automatico: testo chiaro, bordo visibile, focus ciano. Puoi
  togliere `.boss .lesson__skip .btn` da `style.css`.
- **La porta va messa inline** (contenuto di `vault-door.svg`), altrimenti la CSS non
  raggiunge il volantino e i bulloni. Non ha `id`.

**Trofei nel profilo.** `ul.trophies` è uno scaffale con un `li` per capitolo, ognuno con
`figure.trophy` > `svg.trophy__cup` (inline) + `figcaption` (`<b>Caveau 4</b>` e la data).
`.trophy.is-empty` mostra la sagoma grigia con "da aprire".

### Negozio (`.shop`)

I contanti finalmente si spendono, in skin di R0b e sfondi.

**Listino.** Si guadagnano $ 100 a risposta giusta e $ 500 a caveau; una partita da 10
domande vale fino a $ 1.000.

| Reparto | Oggetto | Prezzo | Quanto ci vuole |
|---|---|---|---|
| R0b | Classico (`.skin` nessuna) | gratis | è quella di partenza |
| R0b | Notte al neon (`.skin--notte`) | $ 400 | mezza partita: il primo acquisto arriva presto |
| R0b | Menta (`.skin--menta`) | $ 400 | |
| R0b | Tramonto (`.skin--tramonto`) | $ 800 | |
| R0b | Terminale (`.skin--terminale`) | $ 1.500 | |
| R0b | Oro 24 carati (`.skin--oro`) | $ 4.000 | il traguardo: circa 3 caveau più qualche partita |
| Sfondi | Tramonto sulla baia (nessun `data-bg`) | gratis | |
| Sfondi | Molo di notte (`data-bg="molo"`) | $ 300 | |
| Sfondi | Aurora (`data-bg="aurora"`) | $ 600 | |
| Sfondi | Griglia (`data-bg="griglia"`) | $ 600 | |
| Sfondi | Pioggia di bit (`data-bg="codice"`) | $ 1.500 | |
| Sfondi | Caveau d'oro (`data-bg="oro"`) | $ 3.000 | |

I prezzi sono una proposta: si cambiano solo nei dati, la CSS non li contiene.

**Skin.** Sono set di variabili `--mascot-*`, quindi funzionano **solo con R0b inline**,
come la porta del caveau. Metti `.skin--<nome>` su un contenitore alto (per esempio la
radice dell'app): tutte le copie di R0b la prendono, nei feedback, nella home e nelle
lezioni.

**Sfondi.** Metti `data-bg="<nome>"` su `<html>`.
- Cambiano solo il cielo in alto (`--c-bg-sky`), sfumato nel fondo del tema: le card restano
  sulle superfici normali, quindi il testo non perde contrasto.
- In scuro le tinte sono più tenui (`--sky-k: .55`). Verificato: i titoli rosa restano ≥3:1
  (testo grande) e il testo muted ≥4.5:1 su tutti gli sfondi.

**Schermata**

- `.shop__head` contiene il titolo e `.cash.shop__wallet`.
- `.shop__hint` è la riga "come si guadagna".
- Le schede `.tabs` sono `role="tablist"`, con `button.tabs__tab[aria-selected]`.
- `ul.shop__grid` ha 2 colonne su telefono. Ogni oggetto è `li.item.item--<stato>`:

```html
<li class="item item--buy">
  <span class="item__tag">Tuo</span>                    <!-- solo per equipped/owned -->
  <div class="item__preview">R0b inline dentro .skin--x  |  <span class="bg-swatch" data-bg="x"></span></div>
  <p class="item__name">Menta</p>
  <span class="item__price">$ 400</span>
  <button class="btn">Compra</button>
</li>
```

| Stato | Bordo | Etichetta | Azione |
|---|---|---|---|
| `item--equipped` | verde | "✓ In uso" | tasto disabilitato "In uso" |
| `item--owned` | normale | "Tuo" | tasto ghost "Usa" |
| `item--buy` (te lo puoi permettere) | normale | | prezzo in oro, tasto oro "Compra" |
| `item--locked` (troppo caro) | normale | | anteprima un po' spenta; `.item__bar` (quanto hai del prezzo) e `.item__gap` "Ti mancano `<b>$ 250</b>`" |

**Acquisto.**
1. Chiedi conferma con `dialog.confirm`: "Comprare Menta per $ 400?".
2. Metti `.is-bought` sulla card, che fa un piccolo salto.
3. Aggiorna `.cash` (hai già il conteggio).
4. Se vuoi, mostra R0b `esulta` con la skin nuova.

### Radio in auto (`.radio`)

**Radio Overflow, 101.1010 FM.** La frequenza è un indovinello: 101.1010₂ = 5,625₁₀, una
frequenza dove non trasmette nessuno, "per questo non ci trova nessuno". Il DJ è **DJ
Nibble**: lo si sente e basta, quindi niente nuovo personaggio da disegnare. Il nome è un
suggerimento; si cambia nel testo.

**Versione piena**: un'autoradio scura in entrambi i temi, come la cassaforte. La si usa tra
una domanda e l'altra, nella home e a fine missione.

```html
<aside class="radio" aria-label="Radio Overflow, 101.1010 FM">
  <div class="radio__dial">
    <svg class="radio__eq" viewBox="0 0 20 16" aria-hidden="true"><rect x="1" y="2" width="3" height="14" rx="1"/><rect x="6" y="2" width="3" height="14" rx="1"/><rect x="11" y="2" width="3" height="14" rx="1"/><rect x="16" y="2" width="3" height="14" rx="1"/></svg>
    <span class="radio__freq">101.1010<small>FM</small></span>
    <span class="radio__name">Radio Overflow</span>
    <span class="radio__live">In onda</span>
  </div>
  <p class="radio__line"><b class="radio__dj">DJ Nibble</b>Testo della battuta…</p>
</aside>
```

L'equalizzatore si muove piano. Con `prefers-reduced-motion` si ferma, e si ferma anche il
puntino "In onda".

**Versione compatta**: l'ultima riga di **ogni** `.feedback`, prima del bottone. Prende tutta
la larghezza della griglia del feedback.

```html
<p class="radio radio--compact"><svg class="radio__eq" …stesso svg…></svg>
  <span class="radio__freq">101.1010</span><span class="radio__line">Testo…</span></p>
```

È volutamente calma: sfondo della superficie, bordo ciano, testo muted, equalizzatore fermo.
Un feedback deve far leggere prima l'esito; la battuta viene dopo. Su telefono stretto il
testo va a capo sotto la frequenza. I due puntini dopo il nome del DJ li mette la CSS.

**Tono delle battute:** una riga, massimo due. Ironiche, mai sul ragazzo: si scherza sui
computer, sulla città e sul DJ stesso. Per esempio: "Anche i computer sbagliano. Solo, molto
più in fretta."

### Mappa dei quartieri (`.map`)

> **Dopo la svolta "gioca e basta" non è più il menu.** Il gioco sceglie le domande. L'idea
> della metro vive in `ol.metro` (vedi Progressi). La `.map` qui sotto resta disponibile come
> vista estesa dei capitoli, con le card come `<div>` invece di `<button>`.

È la schermata di scelta, disegnata come una linea della metro al neon. Ogni quartiere è una
fermata con la sua card. Funziona in una colonna sola, la stessa su telefono e computer, e si
legge dall'alto verso il basso come un percorso.

```html
<svg class="map-sky" …>…contenuto di map-sky.svg, inline…</svg>
<ol class="map">
  <li class="stop stop--start is-done">…</li>
  <li class="stop is-open is-here">
    <span class="stop__node" aria-hidden="true">3</span>          <!-- numero, ✓ o lucchetto -->
    <button class="stop__card" type="button" aria-label="Quartiere 3: Piazza delle Posizioni, … 2 missioni su 4">
      <span class="stop__kicker">Quartiere 3</span>
      <span class="stop__name">Piazza delle Posizioni</span>
      <span class="stop__topic">Sistemi posizionali</span>
      <span class="stop__dots" aria-hidden="true"><i class="dot is-done"></i><i class="dot is-current"></i><i class="dot"></i><i class="dot is-boss"></i></span>
      <span class="stop__meta">2 missioni su 4</span>
    </button>
    <span class="stop__here">Sei qui</span>
  </li>
  <li class="stop stop--hub is-open">… <span class="stop__badge">Il centro della città</span> come primo figlio della card …</li>
  <li class="stop is-locked">… <button class="stop__card" aria-disabled="true"> …</li>
</ol>
```

**Stati della fermata**

| Classe | Significato | Aspetto |
|---|---|---|
| `.is-done` | completato | nodo verde con ✓, binario verde |
| `.is-open` | disponibile | nodo rosa con il numero, card con bordo rosa |
| `.is-locked` | bloccato | nodo e card tratteggiati, binario a trattini |
| `.is-here` | dove si trova Neri | anello che pulsa piano sul nodo, più l'etichetta `.stop__here` "Sei qui" |

Il binario non si spezza: ogni fermata disegna il proprio tratto in arrivo, colorato col suo
stato.

**Varianti**
- `.stop--hub` è **Operazioni**, lo snodo: nodo più grande, card con bordo a gradiente
  tramonto, nome in insegna e badge `.stop__badge`. Pesa visivamente più di tutte.
- `.stop--start` è "Parti da qui", la serie di casseforti di riscaldamento: card su
  `surface-2`, più sobria.

**Puntini e tocco**
- I puntini (`.dot`) sono **indicatori**, non tasti: è la card intera che si tocca. Stati:
  `.is-done`, `.is-current`, normale da fare. `.is-boss` è un rombo, il caveau finale.
- Il tocco sulla card apre l'elenco delle missioni del quartiere. Si possono riusare
  `.choices` o `.steps`.
- Sulle fermate bloccate usa `aria-disabled="true"`, non `disabled`: così il tocco può
  ancora dire "Si apre dopo …".

**Nomi proposti** (il tema va sotto, in `.stop__topic`): Il Garage (Parti da qui), Molo dei
Robot, Vicolo dei Bit, Piazza delle Posizioni, **Il Ponte** (decimale ⇄ binario, un ponte tra
due basi), **Torre dei Conti** (operazioni), **Faro Sedici** (ottale ed esadecimale),
Lungomare (virgola e confronti). Lo skyline di `map-sky.svg` contiene il ponte, la torre al
centro e il faro.

### Cassaforte a 8 ruote (`.vault`)

Ora è un componente di supporto.

- **Struttura.** `.vault__lcd` mostra il totale e `.vault__sum` la somma scritta
  (`128 + 64 + …`). La lista `.vault__dials` contiene i `button.dial[aria-pressed]` con
  `.dial__weight` e `.dial__wheel > .dial__track > span 0 + span 1`: la ruota "rulla"
  dall'1 allo 0.
- **Layout.** Sotto i 26rem di contenitore va in **2 file da 4**, cioè un nibble per fila.
  Serve per i tap target: 8 tasti da 44px non stanno in 320–360px. Utile anche dopo: nel
  quartiere 6 ogni fila è una cifra esadecimale. Sopra i 26rem va in 1×8, con uno spazio tra
  i due nibble.
- **Stato.** `.vault.is-open` quando il codice è giusto.
- **Codice.** `.vault__code` mostra il codice in binario sotto il display: "Codice binario:
  `<b>0100 0101</b>`", diviso in nibble.
- **Ruote bloccate.** Le ruote `:disabled` (domande "leggi la cassaforte", o dopo la
  risposta) hanno il bordo tratteggiato e non rullano: si capisce che non si girano.

### Varie

- **Campo per i nomi.** `.answer__input.answer__input--text` usa il font dell'interfaccia e il
  colore del testo. `.answer__input` da solo è pensato per le cifre (mono, ciano, spaziato).
- **Bottoni di pericolo.** `.btn--danger` è pieno; `.btn--danger-outline` è col bordo e
  funziona anche senza `.btn--ghost`.
- **Conferma.** `dialog.confirm` > `form[method=dialog]` > `.confirm__title`,
  `.confirm__text`, `.confirm__actions`. Su telefono i bottoni vanno uno per riga, con
  "Annulla" in basso, vicino al pollice, e col focus.

## 6. Dal prototipo ai miei nomi

| Prototipo (`css/style.css`) | Design |
|---|---|
| `--bg --surface --text --muted` | `--c-bg --c-surface --c-text --c-text-muted` |
| `--accent --accent-2` | `--c-primary --c-secondary` (i bottoni sono pieni, non più a gradiente) |
| `--ok --bad --star` | `--c-success --c-danger --c-wanted` |
| `--radius --tap` | `--r-lg` (card) / `--r-md` (bottoni, campi), `--tap` |
| `.stars .star.on` | `.wanted .wanted__star.is-on` (SVG, non il carattere ★) |
| `.progress > i` | `.progress .progress__dot` (puntini per domanda) — oppure tieni la barra, ma colorala con `--c-primary` |
| `.card .prompt` | `.card` / `.q .q__prompt` |
| `.choice.right / .wrong` | `.choice.is-correct / .is-wrong` (+ icone `.choice__mark`) |
| `.row` + `input[type=text]` | `form.answer` > `.answer__input` + `.btn--primary` |
| `.btn` / `.btn.ghost` | `.btn.btn--primary` / `.btn.btn--ghost` |
| `.safe .sw` / `.sum` | `.vault .dial` / `.vault__lcd` + `.vault__sum` |
| `.steps .done / .cur` | `.steps .step.is-done / .is-current` (+ `.step__label`, `.step__result`) |
| `.feedback.ok / .bad` | `.feedback.feedback--ok / --ko` (+ `--inline`, `--hint`) |
| `.feedback ol` | `ol.feedback__explain` (un passaggio) / `details.solution ol` (tutto) |
| `.radio` / `.feedback__tip` con 📻 | `p.radio.radio--compact` dentro `.feedback` (vedi "Radio in auto") |
| `.step__body`, `.step.is-done.is-wrong`, `.answer.is-hint` | adottate in `components.css`: puoi toglierle da `style.css` |
| emoji 🤖 🏆 🚔 | `r0b-neutro.svg`, `r0b-podio.svg`, `r0b-triste.svg` |

## 7. Ancora da fare

Nell'ordine di David:

1. Notifiche-badge stile feed.
2. Menu "smartphone".
3. Negozio: le auto nel garage (skin e sfondi sono fatti).
