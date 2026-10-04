#!/usr/bin/env python3
"""Gera os SVGs do logo IMPORTS Assistência (o cromado do topo troca de cor pelo tema: variáveis --ch0…--ch7, --ct0…--ct2) a partir de tools/assistencia/maca.json (rode maca.py antes).
Imprime/grava os pedaços usados pela página assistencia.html:
  tools/assistencia/logo-nav.svg   — logo pequeno do menu (uma cor, currentColor)
  tools/assistencia/logo-hero.svg  — logo cromado do topo (mesmos efeitos do logo da loja)
  tools/assistencia/intro.svg      — cortina da abertura (fundo preto com a maçã recortada)
e a origem do zoom da abertura (centro da maçã em % do quadro)."""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
j = json.load(open(os.path.join(HERE, "maca.json")))
L, M = j["letters"], j["mark"]
cx, cy = j["center"]

# quadro: letras afastadas (≈ -11…457) + maçã com ferramentas (até y≈92) + "ASSISTÊNCIA" embaixo
VX, VY, VW, VH = -14.0, -4.0, 474.0, 136.0
VB = f"{VX} {VY} {VW} {VH}"
TX, TY = 222.0 + 4.5, 124.0  # centro do texto (+ metade do espaçamento das letras, que sobra no fim)
TEXT = f'<text x="{TX}" y="{TY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, system-ui, Segoe UI, Roboto, sans-serif" font-size="17" font-weight="500" letter-spacing="9">ASSISTÊNCIA</text>'

nav = f'<svg class="logo logo-assist" viewBox="{VX} {VY} {VW} 98" role="img" aria-label="IMPORTS Assistência"><path fill="currentColor" d="{L}{M}"/></svg>'

hero = f'''<svg class="logo logo-hero logo-assist" viewBox="{VB}" role="img" aria-label="IMPORTS Assistência">
<defs>
<linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ch0, #ffffff)"/><stop offset="0.18" style="stop-color:var(--ch1, #e9eaed)"/><stop offset="0.42" style="stop-color:var(--ch2, #8d9096)"/><stop offset="0.5" style="stop-color:var(--ch3, #5d6066)"/><stop offset="0.56" style="stop-color:var(--ch4, #c9cbcf)"/><stop offset="0.72" style="stop-color:var(--ch5, #f5f6f7)"/><stop offset="0.86" style="stop-color:var(--ch6, #a3a6ab)"/><stop offset="1" style="stop-color:var(--ch7, #6e7176)"/></linearGradient>
<linearGradient id="chrome-t" x1="0" y1="{TY - 14}" x2="0" y2="{TY + 2}" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--ct0, #ffffff)"/><stop offset=".55" style="stop-color:var(--ct1, #9c9fa5)"/><stop offset="1" style="stop-color:var(--ct2, #e9eaed)"/></linearGradient>
<linearGradient id="shine" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
<animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0;1 0" keyTimes="0;.55;1" dur="6s" begin="1.6s" repeatCount="indefinite"/>
</linearGradient>
<filter id="bevel" x="-5%" y="-20%" width="110%" height="150%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="b"/>
<feSpecularLighting in="b" surfaceScale="2.6" specularConstant=".9" specularExponent="22" lighting-color="#ffffff" result="s"><fePointLight x="156" y="-140" z="160"/></feSpecularLighting>
<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
<feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".55" k4="0" result="lit"/>
<feDropShadow in="lit" dx="0" dy="3" stdDeviation="4" flood-color="#000" style="flood-opacity:var(--logo-shadow, .75)"/>
</filter>
<clipPath id="letters"><path d="{L}{M}"/></clipPath>
</defs>
<g filter="url(#bevel)"><path d="{L}{M}" fill="url(#chrome)" stroke="url(#chrome)" stroke-width="2.4" stroke-linejoin="round"/></g>
<rect clip-path="url(#letters)" x="{VX}" y="{VY}" width="{VW}" height="100" fill="url(#shine)" style="mix-blend-mode:overlay"/>
<g fill="url(#chrome-t)">{TEXT}</g>
</svg>'''

big = "M-30000 -30000H30000V30000H-30000Z"
intro = f'''<div class="intro-curtain" aria-hidden="true"><div class="zoom"><svg viewBox="{VB}">
<defs>
<linearGradient id="intro-chrome" x1="0" y1="0" x2="0" y2="82" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".42" stop-color="#8d9096"/><stop offset=".5" stop-color="#5d6066"/><stop offset=".72" stop-color="#f5f6f7"/><stop offset="1" stop-color="#8d9096"/></linearGradient>
<linearGradient id="intro-shine" x1="0" y1="0" x2="1" y2="0"><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/>
<animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0" dur="1.1s" begin=".2s" fill="freeze"/></linearGradient>
<clipPath id="intro-logo"><path d="{L}"/></clipPath>
</defs>
<path class="wall" fill="#000" fill-rule="evenodd" d="{big}{M}"/>
<path class="plug" fill="#000" d="{M}"/>
<g class="ink"><path fill="url(#intro-chrome)" d="{L}"/><path class="silver" fill="url(#intro-chrome)" d="{M}"/>
<rect class="shine" clip-path="url(#intro-logo)" x="{VX}" y="{VY}" width="{VW}" height="100" fill="url(#intro-shine)"/>
<g fill="#c9cbcf">{TEXT}</g></g>
</svg></div></div>'''

for name, s in (("logo-nav.svg", nav), ("logo-hero.svg", hero), ("intro.svg", intro)):
    open(os.path.join(HERE, name), "w", encoding="utf-8").write(s)
print("origem do zoom: %.2f%% %.2f%%" % ((cx - VX) / VW * 100, (cy - VY) / VH * 100))
