#!/usr/bin/env python3
"""Coloca no assistencia.html os desenhos gerados por logos.py (logo do menu, logo cromado do topo e
cortina da abertura), sem mexer no resto da página.
Fluxo para mudar a maçã: python3 maca.py && python3 logos.py && python3 aplicar.py (de dentro desta pasta
ou da raiz do site)."""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "..", "..", "assistencia.html")
read = lambda n: open(os.path.join(HERE, n), encoding="utf-8").read()
s = open(PAGE, encoding="utf-8").read()

swaps = [
    (r'<svg class="logo logo-assist".*?</svg>', read("logo-nav.svg")),
    (r'<svg class="logo logo-hero logo-assist".*?</svg>', read("logo-hero.svg")),
    (r'<div class="intro-curtain".*?</svg></div></div>', read("intro.svg")),
]
for pat, new in swaps:
    s, n = re.subn(pat, lambda m: new, s, count=1, flags=re.S)
    assert n == 1, "não achei: " + pat[:40]
open(PAGE, "w", encoding="utf-8").write(s)
print("ok")
