#!/usr/bin/env python3
"""Gera assets/iphones.js (lista do "Qual é o seu iPhone?" da assistência) a partir do catálogo oficial
tools/fotos-oficiais/iphones.json: nome, ano e a capa de uma cor que exista em img/modelos/.
Do mais novo ao mais antigo; no mesmo ano, Pro Max > Pro > Air/Plus > normal > "e".
Uso: python3 tools/assistencia/iphones.py   (rodar de novo quando entrar modelo novo no catálogo)"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
cat = json.load(open(os.path.join(ROOT, "tools", "fotos-oficiais", "iphones.json"), encoding="utf-8"))

def tier(i):
    return 5 if i.endswith("pro-max") else 4 if i.endswith("-pro") else 3 if i.endswith(("plus", "air", "duo")) else 1 if i.endswith("e") or "-se" in i else 2

out = []
for m in cat:
    folder = os.path.join(ROOT, "img", "modelos", m["id"])
    # preferência de cor para a capa: as escuras/neutras primeiro (ficam bem nos dois temas)
    pref = ["titanio-natural", "titanio-preto", "preto", "meia-noite", "grafite", "preto-espacial", "cinza-espacial", "azul-profundo", "prateado"]
    colors = [c for c in pref if c in m["colors"]] + [c for c in m["colors"] if c not in pref]
    cover = next((c for c in colors if os.path.exists(os.path.join(folder, c + ".webp"))), None)
    if cover:
        out.append({"id": m["id"], "name": m["name"], "year": m["year"], "img": f"img/modelos/{m['id']}/{cover}.webp"})
out.sort(key=lambda m: (-m["year"], -tier(m["id"]), m["name"]))
js = ("/* gerado por tools/assistencia/iphones.py — não editar à mão */\nwindow.IMPRTS_IPHONES = "
      + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
open(os.path.join(ROOT, "assets", "iphones.js"), "w", encoding="utf-8", newline="\n").write(js)
print(len(out), "modelos ·", ", ".join(m["name"] for m in out[:6]), "…", out[-1]["name"])
