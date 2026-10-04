# Gera img/og.jpg (prévia do link no WhatsApp/Instagram): pedra + logo do site + iPhone do hero.
# Uso: python3 tools/og/gerar.py   (precisa do Pillow)
import re
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..") + "/"
W, H = 1200, 630
html = open(R + "index.html", encoding="utf-8").read()
d = re.search(r'<svg class="logo" viewBox="-2 -2 449.64 85.73"[^>]*><path fill="currentColor" d="([^"]+)"', html).group(1)

# caminho do logo (M/L/Q/Z) -> polígonos, preenchidos em par-ímpar (furos do P e do R)
def polys(d):
    toks = re.findall(r'[MLQZ]|-?[\d.]+', d)
    out, cur, i, pos, cmd = [], [], 0, (0, 0), None
    while i < len(toks):
        t = toks[i]
        if t in "MLQZ":
            cmd = t; i += 1
            if t == "Z":
                if cur: out.append(cur); cur = []
            continue
        if cmd == "M":
            if cur: out.append(cur)
            pos = (float(toks[i]), float(toks[i+1])); cur = [pos]; i += 2; cmd = "L"
        elif cmd == "L":
            pos = (float(toks[i]), float(toks[i+1])); cur.append(pos); i += 2
        elif cmd == "Q":
            c = (float(toks[i]), float(toks[i+1])); e = (float(toks[i+2]), float(toks[i+3])); i += 4
            for k in range(1, 9):
                s = k / 8
                cur.append(((1-s)**2*pos[0] + 2*(1-s)*s*c[0] + s*s*e[0], (1-s)**2*pos[1] + 2*(1-s)*s*c[1] + s*s*e[1]))
            pos = e
    if cur: out.append(cur)
    return out

def logo_mask(width, ss=4):
    sc = width / 449.64 * ss
    w, h = int(449.64 * sc) + 8, int(85.73 * sc) + 8
    m = Image.new("1", (w, h), 0)
    for p in polys(d):
        layer = Image.new("1", (w, h), 0)
        ImageDraw.Draw(layer).polygon([((x + 2) * sc, (y + 2) * sc) for x, y in p], fill=1)
        m = ImageChops.logical_xor(m, layer)
    return m.convert("L").resize((w // ss, h // ss), Image.LANCZOS)

bg = Image.new("RGB", (W, H), (0, 0, 0))
stone = Image.open(R + "img/pedra.webp").convert("RGB")
s = max(W / stone.width, H / stone.height)
stone = stone.resize((int(stone.width * s) + 1, int(stone.height * s) + 1), Image.LANCZOS)
stone = stone.crop(((stone.width - W) // 2, (stone.height - H) // 2, (stone.width - W) // 2 + W, (stone.height - H) // 2 + H))
bg = Image.blend(bg, stone, .4)
# luz no centro, escurecendo nas bordas
vig = Image.new("L", (W, H), 0)
ImageDraw.Draw(vig).ellipse((W*.5-380, H*.45-230, W*.5+380, H*.45+230), fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(140))
bg = Image.composite(bg, Image.new("RGB", (W, H)), vig)

# logo metálico (degradê vertical)
lw = 520
m = logo_mask(lw)
grad = Image.new("RGB", m.size)
gd = ImageDraw.Draw(grad)
stops = [(0, (255,255,255)), (.45, (201,201,206)), (.55, (141,141,148)), (1, (233,233,236))]
for y in range(m.size[1]):
    t = y / max(1, m.size[1]-1)
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if a <= t <= b:
            k = (t - a) / (b - a); gd.line([(0, y), (m.size[0], y)], fill=tuple(int(ca[j] + (cb[j]-ca[j])*k) for j in range(3))); break
lx = (W - m.size[0]) // 2
bg.paste(grad, (lx, 70), m)

# iPhone oficial do hero
ph = Image.open(R + "img/hero-1.webp").convert("RGBA")
ph = ph.resize((430, 430), Image.LANCZOS)
bg.paste(ph, ((W - 430) // 2, 185), ph)

bg.save(R + "img/og.jpg", "JPEG", quality=86, optimize=True, progressive=True)
print("ok", bg.size)
