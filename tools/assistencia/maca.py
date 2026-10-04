#!/usr/bin/env python3
r"""Desenha a maçã da IMPRTS Assistência: a mesma maçã do logo com uma chave fixa (diagonal \) e uma
chave de fenda (diagonal /) formando um X centrado na maçã, saindo para fora dela. Tudo vira UM vetor
(união real das formas: sem sobreposição, sem borda). Precisa do shapely (pip install shapely).
Gera: tools/assistencia/maca.json (caminho no espaço do logo) e img/apple-assist.svg (só a maçã).
Uso: python3 tools/assistencia/maca.py"""
import json, math, os, re
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union
from shapely import affinity

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
d = re.search(r'<svg class="logo" viewBox="-2 -2 449\.64 85\.73"[^>]*><path fill="currentColor" d="([^"]+)"', html).group(1)
subs = re.findall(r"M[^M]+", d)
apple_d = [s for s in subs if s.startswith("M227.54 19.76") or s.startswith("M224.64 13.07")]
GAP = 9.0  # quanto IMP e RTS se afastam da maçã (só no logo da Assistência)
def shift(sub, dx):
    out, i, t = [], 0, re.findall(r"[MLQZ]|-?\d+(?:\.\d+)?", sub)
    while i < len(t):
        if t[i] in "MLQZ":
            out.append(t[i]); i += 1
            continue
        out.append(f"{float(t[i]) + dx:.2f} {t[i + 1]}"); i += 2
    return "".join(x if x in "MLQZ" else x + " " for x in out).replace(" M", "M").replace(" L", "L").replace(" Q", "Q").replace(" Z", "Z").strip()
first_x = lambda sub: float(re.findall(r"-?\d+(?:\.\d+)?", sub)[0])
letters_d = "".join(shift(s, -GAP if first_x(s) < 180 else GAP) for s in subs if s not in apple_d)

def flatten(sub, n=24):
    """subcaminho M/L/Q/Z → lista de pontos"""
    t = re.findall(r"[MLQZ]|-?\d+(?:\.\d+)?", sub)
    pts, i, cmd, cur = [], 0, None, (0.0, 0.0)
    while i < len(t):
        if t[i] in "MLQZ":
            cmd = t[i]; i += 1
            continue
        if cmd in ("M", "L"):
            cur = (float(t[i]), float(t[i + 1])); pts.append(cur); i += 2
        elif cmd == "Q":
            c = (float(t[i]), float(t[i + 1])); e = (float(t[i + 2]), float(t[i + 3])); i += 4
            for k in range(1, n + 1):
                s = k / n
                pts.append(((1 - s) ** 2 * cur[0] + 2 * (1 - s) * s * c[0] + s * s * e[0],
                            (1 - s) ** 2 * cur[1] + 2 * (1 - s) * s * c[1] + s * s * e[1]))
            cur = e
    return Polygon(pts).buffer(0)

apple = unary_union([flatten(s) for s in apple_d])
body = flatten(apple_d[0])
minx, miny, maxx, maxy = body.bounds
C = ((minx + maxx) / 2, (miny + maxy) / 2)  # centro do X: meio do corpo da maçã

# ——— ferramentas, desenhadas deitadas (eixo u = comprimento, v = largura), centradas em (0, 0) ———
# chave fixa de boca dupla: cabo afinando no meio + cabeça redonda com a boca aberta em cada ponta
HEAD_AT, HEAD_R, JAW_W = 46.0, 8.6, 7.4   # cabeças bem para fora da maçã (a borda dela fica a ~31 do centro)
def wrench():
    shaft = Polygon([(-HEAD_AT, -3.9), (0, -3.0), (HEAD_AT, -3.9), (HEAD_AT, 3.9), (0, 3.0), (-HEAD_AT, 3.9)])
    parts = [shaft]
    for side, tilt in ((1, 15), (-1, -15)):
        head = affinity.translate(Point(0, 0).buffer(HEAD_R), side * HEAD_AT, 0)
        # boca: entra pela ponta até passar um pouco do centro da cabeça, fundo redondo, inclinada 15°
        slot = box(-0.5, -JAW_W / 2, HEAD_R + 4, JAW_W / 2).union(Point(-0.5, 0).buffer(JAW_W / 2))
        slot = affinity.rotate(slot, tilt, origin=(0, 0))
        if side < 0:
            slot = affinity.scale(slot, -1, 1, origin=(0, 0))
        parts.append(head.difference(affinity.translate(slot, side * HEAD_AT, 0)))
    return unary_union(parts)

# chave de fenda: cabo arredondado (em cima à esquerda, todo para fora da maçã), anel, haste e ponta chata
def screwdriver():
    handle = box(-54, -3.9, -36, 3.9).buffer(2.1, join_style=1)   # cabo de -56 a -34, cantos redondos
    ferrule = box(-36, -3.6, -31, 3.6)
    shaft = box(-31.5, -2.0, 43, 2.0)
    tip = Polygon([(42.5, -2.0), (47, -3.0), (50, -3.0), (50, 3.0), (47, 3.0), (42.5, 2.0)])
    return unary_union([handle, ferrule, shaft, tip])

def place(shape, angle_deg):
    return affinity.translate(affinity.rotate(shape, angle_deg, origin=(0, 0)), C[0], C[1])

wr = place(wrench(), 45)         # "\" : bocas em cima à esquerda e embaixo à direita (y do SVG cresce para baixo)
sd = place(screwdriver(), 135)   # "/" : cabo em cima à direita, ponta embaixo à esquerda
# fecha as frestas finas onde as ferramentas encostam na maçã (sem arredondar os cantos visíveis)
mark = unary_union([apple, wr, sd]).buffer(0.45, join_style=1).buffer(-0.45, join_style=1).simplify(0.015, preserve_topology=True)

def to_path(geom):
    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    out = []
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            c = list(ring.coords)[:-1]
            out.append("M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in c) + "Z")
    return "".join(out)

mark_d = to_path(mark)
bx = mark.bounds
json.dump({"mark": mark_d, "letters": letters_d, "bounds": bx, "center": C}, open(os.path.join(HERE, "maca.json"), "w"))
pad = 1
vb = f"{bx[0]-pad:.2f} {bx[1]-pad:.2f} {bx[2]-bx[0]+2*pad:.2f} {bx[3]-bx[1]+2*pad:.2f}"
open(os.path.join(ROOT, "img", "apple-assist.svg"), "w", encoding="utf-8").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><path fill="#000" fill-rule="evenodd" d="{mark_d}"/></svg>\n')
print("ok · limites", [round(v, 1) for v in bx], "· centro", [round(v, 1) for v in C], "· partes", mark.geom_type,
      len(mark.geoms) if hasattr(mark, "geoms") else 1)
