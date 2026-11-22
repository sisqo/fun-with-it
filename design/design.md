# Neon Bay — design

Direzione visiva per l'app che insegna il binario a Neri (16 anni). Questo file spiega le scelte
e come integrarle. I file veri sono qui accanto:

| File | Cosa c'è |
|---|---|
| `tokens.css` | Tutti i token su `:root`, tema chiaro + scuro |
| `components.css` | Componenti (richiede `tokens.css`) |
| `mascot/r0b-*.svg` | La mascotte R0b in 6 espressioni |
| `mascot/_build.py` | Generatore della mascotte (modifica qui, non a mano negli SVG) |
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

1. Mappa dei quartieri con le missioni come puntini. Operazioni è il quartiere centrale.
2. Card "lezione" per la teoria, con R0b "sete" nella lezione 1.
3. Caveau del boss.
4. Notifiche-badge stile feed.
5. Menu "smartphone".
6. Negozio (skin di R0b, auto, sfondi).
