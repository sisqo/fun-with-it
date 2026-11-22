#!/usr/bin/env python3
"""Genera le espressioni di R0b (la mascotte, l'informatore di Neon Bay) partendo da un corpo unico.

Il corpo è identico in tutte le varianti: cambiano solo faccia (sullo schermo),
braccia, LED dell'antenna, nibble sul petto e un eventuale oggetto.
Così le espressioni si leggono come un solo personaggio.

Uso:  python3 design/mascot/_build.py      (riscrive i .svg accanto a questo file)

Colori: ogni riempimento usa style="fill: var(--mascot-…, <fallback>)", quindi
- inline nell'HTML il robot segue i token di tokens.css (dark/light automatico);
- dentro <img> usa i fallback, che funzionano su entrambi i temi.
Nessun id negli SVG: si possono mettere più mascotte inline nella stessa pagina.
"""
from pathlib import Path

INK = "var(--mascot-ink, #1a1030)"
BODY = "var(--mascot-body, #ece6f7)"
SHADE = "var(--mascot-shade, #c4b7e2)"
SCREEN = "var(--mascot-screen, #170f30)"
FACE = "var(--mascot-face, #3ee6ff)"
LED_ON = "var(--mascot-led, #ff4fa3)"
LED_OFF = "var(--mascot-led-off, #7d7396)"
WATER = "var(--mascot-water, #3ee6ff)"
GOLD = "var(--mascot-gold, #ffd166)"


def s(fill=None, stroke=None, width=None, extra=""):
    parts = []
    if fill:
        parts.append(f"fill:{fill}")
    else:
        parts.append("fill:none")
    if stroke:
        parts.append(f"stroke:{stroke}")
        parts.append(f"stroke-width:{width or 3}")
        parts.append("stroke-linecap:round;stroke-linejoin:round")
    if extra:
        parts.append(extra)
    return f'style="{";".join(parts)}"'


def arm(d):
    """Braccio: tubo spesso con contorno + mano tonda alla fine."""
    # contorno e riempimento (due tratti sovrapposti = tubo con bordo)
    end = d.split()[-2:]
    x, y = float(end[0]), float(end[1])
    return (
        f'<path d="{d}" {s(stroke=INK, width=9)}/>'
        f'<path d="{d}" {s(stroke=BODY, width=4)}/>'
        f'<circle cx="{x}" cy="{y}" r="5.5" {s(fill=BODY, stroke=INK, width=3)}/>'
    )


def nibble(bits):
    """4 LED sul petto: il robot 'pensa' in binario."""
    out = []
    for i, b in enumerate(bits):
        cx = 47 + i * 9
        out.append(
            f'<rect x="{cx - 3}" y="96" width="6" height="9" rx="2" '
            f'{s(fill=LED_ON if b == "1" else LED_OFF, stroke=INK, width=1.5)}/>'
        )
    return "".join(out)


def body(face, arms, bits="0000", led_on=True, antenna="M60 22 V10"):
    return (
        # ombra a terra
        f'<ellipse cx="60" cy="134" rx="30" ry="4" {s(fill=INK, extra="opacity:.18")}/>'
        # ruote/piedi
        f'<rect x="38" y="120" width="16" height="12" rx="4" {s(fill=SHADE, stroke=INK)}/>'
        f'<rect x="66" y="120" width="16" height="12" rx="4" {s(fill=SHADE, stroke=INK)}/>'
        # braccia dietro al busto
        + arms
        # busto
        + f'<rect x="32" y="82" width="56" height="40" rx="11" {s(fill=BODY, stroke=INK)}/>'
        f'<rect x="41" y="91" width="38" height="19" rx="5" {s(fill=SCREEN, stroke=INK, width=2)}/>'
        + nibble(bits)
        # collo
        + f'<rect x="52" y="75" width="16" height="8" rx="2" {s(fill=SHADE, stroke=INK)}/>'
        # antenna
        f'<path d="{antenna}" {s(stroke=INK, width=3)}/>'
        f'<circle cx="{antenna.split()[-1].lstrip("V") and _antenna_tip(antenna)[0]}" '
        f'cy="{_antenna_tip(antenna)[1]}" r="5" {s(fill=LED_ON if led_on else LED_OFF, stroke=INK, width=2.5)}/>'
        # testa
        f'<rect x="22" y="22" width="76" height="55" rx="15" {s(fill=BODY, stroke=INK)}/>'
        f'<rect x="17" y="40" width="6" height="18" rx="3" {s(fill=SHADE, stroke=INK, width=2.5)}/>'
        f'<rect x="97" y="40" width="6" height="18" rx="3" {s(fill=SHADE, stroke=INK, width=2.5)}/>'
        f'<rect x="31" y="30" width="58" height="39" rx="9" {s(fill=SCREEN, stroke=INK, width=2.5)}/>'
        # riflesso sullo schermo
        f'<path d="M37 36 h10" {s(stroke=FACE, width=2, extra="opacity:.35")}/>'
        + face
    )


def _antenna_tip(d):
    # d è "M60 22 V10" oppure "M60 22 Q.. ..  x y"
    toks = d.replace("V", " V ").split()
    if "V" in toks:
        return 60, float(toks[-1])
    return float(toks[-2]), float(toks[-1])


def svg(title, inner, view="0 0 120 140"):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img" '
        f'class="mascot">'
        f"<title>{title}</title>{inner}</svg>\n"
    )


F = lambda w=3.2: s(stroke=FACE, width=w)  # noqa: E731

ARMS_DOWN = arm("M34 92 Q22 100 22 114") + arm("M86 92 Q98 100 98 114")
ARMS_UP = arm("M34 90 Q20 80 16 64") + arm("M86 90 Q100 80 104 64")

FACES = {
    "neutro": (
        f'<rect x="42" y="42" width="8" height="11" rx="2.5" {s(fill=FACE)}/>'
        f'<rect x="70" y="42" width="8" height="11" rx="2.5" {s(fill=FACE)}/>'
        f'<path d="M51 60 H69" {F()}/>'
    ),
    "esulta": (
        f'<path d="M41 51 Q46 42 51 51" {F(3.6)}/>'
        f'<path d="M69 51 Q74 42 79 51" {F(3.6)}/>'
        f'<path d="M47 56 Q60 68 73 56 Z" {s(fill=FACE, stroke=FACE, width=2.5)}/>'
    ),
    "perplesso": (
        f'<rect x="42" y="43" width="8" height="10" rx="2.5" {s(fill=FACE)}/>'
        f'<rect x="71" y="45" width="6" height="6" rx="2" {s(fill=FACE)}/>'
        f'<path d="M68 38 L80 35" {F(2.6)}/>'
        f'<path d="M49 61 l4 -3 l4 3 l4 -3 l4 3 l4 -3" {F(2.6)}/>'
    ),
    "triste": (
        f'<path d="M41 48 L51 43" {F(2.6)}/>'
        f'<path d="M79 48 L69 43" {F(2.6)}/>'
        f'<rect x="42" y="49" width="8" height="6" rx="2.5" {s(fill=FACE)}/>'
        f'<rect x="70" y="49" width="8" height="6" rx="2.5" {s(fill=FACE)}/>'
        f'<path d="M50 64 Q60 56 70 64" {F()}/>'
        # lacrima
        f'<path d="M46 57 Q42.5 62 46 64.5 Q49.5 62 46 57 Z" {s(fill=WATER)}/>'
    ),
    "sete": (
        f'<path d="M41 47 H51" {F()}/>'
        f'<path d="M69 47 H79" {F()}/>'
        f'<rect x="41" y="44" width="10" height="3" {s(fill=FACE, extra="opacity:.5")}/>'
        f'<rect x="69" y="44" width="10" height="3" {s(fill=FACE, extra="opacity:.5")}/>'
        f'<path d="M51 58 Q60 54 69 58 Q60 64 51 58 Z" {s(fill=FACE)}/>'
        f'<path d="M58 61 Q60 66 62 61" {s(fill=FACE, stroke=FACE, width=2)}/>'
    ),
}

GLASS_EMPTY = (
    # bicchiere vuoto in mano (braccio destro alzato davanti)
    f'<path d="M98 84 L101 106 H111 L114 84 Z" {s(fill="var(--mascot-glass, #ffffff)", stroke=INK, width=2.5, extra="fill-opacity:.55")}/>'
    f'<path d="M100 101 H112" {s(stroke=WATER, width=1.8, extra="opacity:.6")}/>'
)

QUESTION = (
    f'<path d="M103 10 Q103 3 109 3 Q115 3 115 9 Q115 13 109 15 V19" {s(stroke=LED_ON, width=3.2)}/>'
    f'<circle cx="109" cy="25" r="2.2" {s(fill=LED_ON)}/>'
)

SPARKS = (
    f'<path d="M8 40 l4 4 M8 44 l4 -4" {s(stroke=GOLD, width=2.5)}/>'
    f'<path d="M108 30 l5 5 M108 35 l5 -5" {s(stroke=GOLD, width=2.5)}/>'
    f'<circle cx="14" cy="24" r="2.2" {s(fill=GOLD)}/>'
    f'<circle cx="112" cy="48" r="2" {s(fill=GOLD)}/>'
)

VARIANTS = {
    "neutro": ("R0b, neutro", body(FACES["neutro"], ARMS_DOWN, "0101")),
    "esulta": (
        "R0b esulta",
        SPARKS + body(FACES["esulta"], ARMS_UP, "1111"),
    ),
    "perplesso": (
        "R0b perplesso",
        QUESTION
        + body(
            FACES["perplesso"],
            arm("M34 92 Q22 100 22 114") + arm("M86 90 Q104 84 106 62 Q106 50 100 44"),
            "1010",
            antenna="M60 22 Q60 14 66 10",
        ),
    ),
    "triste": (
        "R0b triste",
        body(
            FACES["triste"],
            arm("M35 94 Q30 106 32 120") + arm("M85 94 Q90 106 88 120"),
            "0000",
            led_on=False,
            antenna="M60 22 Q60 14 52 12",
        ),
    ),
    "sete": (
        "R0b ha sete",
        body(
            FACES["sete"],
            arm("M34 92 Q22 100 22 114") + arm("M86 92 Q98 96 104 90"),
            "0001",
        )
        + GLASS_EMPTY,
    ),
}


def podio():
    robot = SPARKS + body(FACES["esulta"], ARMS_UP, "1111")
    stand = (
        f'<rect x="10" y="140" width="100" height="42" rx="6" {s(fill=GOLD, stroke=INK)}/>'
        f'<rect x="10" y="140" width="100" height="8" rx="4" {s(fill="#ffffff", extra="opacity:.35")}/>'
        # "1" disegnato, niente font
        f'<path d="M54 156 L61 151 V174 M54 174 H68" {s(stroke=INK, width=4)}/>'
    )
    return svg("R0b sul podio", f'<g transform="translate(0 8)">{robot}</g>' + stand, "0 0 120 184")


def main():
    here = Path(__file__).parent
    for name, (title, inner) in VARIANTS.items():
        (here / f"r0b-{name}.svg").write_text(svg(title, inner))
    (here / "r0b-podio.svg").write_text(podio())


if __name__ == "__main__":
    main()
