#!/usr/bin/env python3
"""Versão em Python do estilizar.swift, para quando não há Mac à mão (Windows/Linux).
Mesmo padrão das capas: quadro 1200×1200 transparente, aparelho centralizado com o mesmo tamanho máximo
(84% da largura / 80% da altura), apoiado a 12% do chão, com sombra de contato suave; sai em WebP 800 px.
Só serve para imagem que JÁ vem sem fundo (PNG com transparência, como as da DJI). Precisa do Pillow.
Uso: python3 estilizar.py <entrada.png> <saida.webp>"""
import sys
from PIL import Image, ImageDraw, ImageFilter

if len(sys.argv) != 3:
    sys.exit("uso: estilizar.py entrada.png saida.webp")
src = Image.open(sys.argv[1]).convert("RGBA")

# caixa do conteúdo (pixels com alfa)
alpha = src.getchannel("A").point(lambda a: 255 if a > 20 else 0)
box = alpha.getbbox()
if not box:
    sys.exit("sem conteúdo")
content = src.crop(box)

S = 1200
cw, ch = content.size
scale = min(S * 0.84 / cw, S * 0.80 / ch)
dw, dh = round(cw * scale), round(ch * scale)
dx, bottom = (S - dw) // 2, round(S * 0.88)  # base do aparelho a 12% do chão
content = content.resize((dw, dh), Image.LANCZOS)

# sombra de contato, igual ao setShadow do Swift: halo desfocado (alfa .35 × .45) + a própria elipse (alfa .35)
ellipse = (dx + dw * 0.1, bottom - 8, dx + dw * 0.9, bottom + 14)
def layer(a, blur=0):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).ellipse(ellipse, fill=round(255 * a))
    if blur:
        m = m.filter(ImageFilter.GaussianBlur(blur))
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img.putalpha(m)
    return img

out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
out = Image.alpha_composite(out, layer(0.35 * 0.45, blur=20))
out = Image.alpha_composite(out, layer(0.35))
out.alpha_composite(content, (dx, bottom - dh))
out.resize((800, 800), Image.LANCZOS).save(sys.argv[2], "WEBP", quality=86, method=6)
print("ok", sys.argv[2])
