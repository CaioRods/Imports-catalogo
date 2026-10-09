#!/usr/bin/env python3
"""Logo do catálogo (importsbrasil.com): IMPORTS com a maçã em laranja-cósmico (cor do iPhone 17 Pro Max)
e "CATÁLOGO" embaixo no logo grande do topo. O logo do sistema (app do Mac e /sistema) NÃO muda.
Aplica em index.html e produto.html: menu, topo, abertura e rodapé. Pode rodar de novo sem problema:
  python3 tools/catalogo/logo.py
As letras e a maçã saem do próprio index.html (a maçã é o caminho "plug" da abertura)."""
import os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
idx_path = os.path.join(ROOT, "index.html")
s = open(idx_path, encoding="utf-8").read()
M = re.search(r'<path class="plug" fill="#000" d="([^"]+)"', s).group(1)        # maçã
L = re.search(r'<clipPath id="intro-logo"><path d="([^"]+)"', s).group(1)       # letras

ORANGE = "#F26A21"   # laranja-cósmico (catálogo do sistema: iphone-17-pro-max)
# laranja "metálico", com as mesmas paradas do cromado das letras
ORANGE_STOPS = [(0, "#ffc08f"), (.18, "#ff9b52"), (.42, "#e8641f"), (.5, "#b8440f"), (.56, "#f07a2e"), (.72, "#ffa463"), (.86, "#e0611f"), (1, "#a83d0c")]
grad = lambda gid, extra="": f'<linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"{extra}>' + "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in ORANGE_STOPS) + "</linearGradient>"

# logo pequeno (menu e rodapé): letras na cor do texto, maçã laranja
small = (f'<svg class="logo logo-cat" viewBox="-2 -2 449.64 85.73" role="img" aria-label="IMPORTS Catálogo">'
         f'<path fill="currentColor" d="{L}"/><path fill="{ORANGE}" d="{M}"/></svg>')

# logo grande do topo: o mesmo cromado de antes nas letras, maçã laranja metálica e "CATÁLOGO" embaixo
VX, VY, VW, VH = -6, -6, 457.64, 142
LS = 12
TX, TY = 222.82 + LS / 2, 128
TEXT = (f'<text x="{TX}" y="{TY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, system-ui, Segoe UI, Roboto, sans-serif" '
        f'font-size="19" font-weight="500" letter-spacing="{LS}">CATÁLOGO</text>')

def hero_from(old):
    """Reaproveita o <defs> do logo atual (cromado, brilho, relevo) e troca só a maçã e o quadro."""
    defs = re.search(r"<defs>(.*?)</defs>", old, re.S).group(1)
    defs = re.sub(r'<clipPath id="letters">.*?</clipPath>', "", defs, flags=re.S)
    defs = re.sub(r'<linearGradient id="(laranja|chrome-t)".*?</linearGradient>', "", defs, flags=re.S)
    defs += grad("laranja")
    defs += (f'<linearGradient id="chrome-t" x1="0" y1="{TY - 15}" x2="0" y2="{TY + 2}" gradientUnits="userSpaceOnUse">'
             '<stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#9c9fa5"/><stop offset="1" stop-color="#e9eaed"/></linearGradient>')
    defs += f'<clipPath id="letters"><path d="{L}{M}"/></clipPath>'
    return (f'<svg class="logo logo-hero logo-cat" viewBox="{VX} {VY} {VW} {VH}" role="img" aria-label="IMPORTS Catálogo">\n<defs>{defs}</defs>\n'
            f'<g filter="url(#bevel)"><path d="{L}" fill="url(#chrome)" stroke="url(#chrome)" stroke-width="2.4" stroke-linejoin="round"/>'
            f'<path d="{M}" fill="url(#laranja)" stroke="url(#laranja)" stroke-width="2.4" stroke-linejoin="round"/></g>\n'
            f'<rect clip-path="url(#letters)" x="{VX}" y="{VY}" width="{VW}" height="94" fill="url(#shine)" style="mix-blend-mode:overlay"/>\n'
            f'<g fill="url(#chrome-t)">{TEXT}</g>\n</svg>')

SMALL_RE = r'<svg class="logo(?: logo-cat)?" viewBox="-2 -2 449\.64 85\.73" role="img" aria-label="IMPORTS(?: Catálogo)?">.*?</svg>'

def apply(path, hero=False):
    t = open(path, encoding="utf-8").read()
    t, n = re.subn(SMALL_RE, lambda m: small, t, flags=re.S)
    assert n >= 1, f"{path}: logo pequeno não encontrado"
    if hero:
        t, h = re.subn(r'<svg class="logo logo-hero(?: logo-cat)?".*?</svg>', lambda m: hero_from(m.group(0)), t, count=1, flags=re.S)
        assert h == 1, "logo do topo não encontrado"
        # abertura: a maçã que vira a "porta" do zoom fica laranja também
        if 'id="intro-laranja"' not in t:
            t = t.replace('<clipPath id="intro-logo">', grad("intro-laranja") + '<clipPath id="intro-logo">', 1)
        t = re.sub(r'<path class="silver" fill="url\(#intro-[a-z]+\)"', '<path class="silver" fill="url(#intro-laranja)"', t)
    open(path, "w", encoding="utf-8").write(t)
    print(os.path.basename(path), "logos trocados:", n, "+ topo" if hero else "")

apply(idx_path, hero=True)
apply(os.path.join(ROOT, "produto.html"))
