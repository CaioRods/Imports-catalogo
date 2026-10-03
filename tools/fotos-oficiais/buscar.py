#!/usr/bin/env python3
"""Procura, no banco de imagens da Apple Store, a foto oficial de cada iPhone do catálogo (por cor).
Testa os padrões de nome usados pela Apple em cada época e grava o que achou em encontradas.json."""
import json, os, sys, itertools, urllib.request, concurrent.futures as cf

BASE = "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
HERE = os.path.dirname(os.path.abspath(__file__))

# id da cor no catálogo → nomes em inglês usados pela Apple (pode ter mais de um)
COLOR = {
    "dourado": ["gold"], "prateado": ["silver"], "cinza-espacial": ["spacegray", "space-gray", "spgray", "gray"],
    "red": ["red", "productred", "product-red"], "preto": ["black"], "branco": ["white"], "azul": ["blue"],
    "amarelo": ["yellow"], "coral": ["coral"], "roxo": ["purple"], "verde": ["green"],
    "verde-meia-noite": ["midnightgreen", "midnight-green"], "grafite": ["graphite"],
    "azul-pacifico": ["pacificblue", "pacific-blue"], "estelar": ["starlight"], "meia-noite": ["midnight"],
    "rosa": ["pink"], "azul-sierra": ["sierrablue", "sierra-blue"], "verde-alpino": ["alpinegreen", "alpine-green"],
    "roxo-profundo": ["deeppurple", "deep-purple"], "preto-espacial": ["spaceblack", "space-black"],
    "titanio-natural": ["naturaltitanium"], "titanio-azul": ["bluetitanium"], "titanio-branco": ["whitetitanium"],
    "titanio-preto": ["blacktitanium"], "titanio-deserto": ["deserttitanium"], "ultramarino": ["ultramarine"],
    "verde-acinzentado": ["teal"], "azul-ceu": ["skyblue", "sky-blue"], "dourado-claro": ["lightgold", "light-gold"],
    "branco-nuvem": ["cloudwhite", "cloud-white"], "lavanda": ["lavender"], "salvia": ["sage"],
    "azul-nevoa": ["mistblue", "mist-blue"], "laranja-cosmico": ["cosmicorange", "cosmic-orange"],
    "azul-profundo": ["deepblue", "deep-blue"], "glacial": ["glacier"], "bordo": ["burgundy"],
    "rosa-palido": ["softpink", "soft-pink", "pink"], "ceu-noturno": ["nightsky", "night-sky"],
    "branco-estrela": ["starwhite", "star-white"],
}
# tamanho de tela usado no nome dos Pro (a partir do 15 Pro)
SIZE = {
    "iphone-15-pro": ["6-1inch"], "iphone-15-pro-max": ["6-7inch"], "iphone-16-pro": ["6-3inch"],
    "iphone-16-pro-max": ["6-9inch"], "iphone-17-pro": ["6-3inch"], "iphone-17-pro-max": ["6-9inch"],
    "iphone-18-pro": ["6-3inch"], "iphone-18-pro-max": ["6-9inch"],
    "iphone-13-pro": ["6-1inch"], "iphone-13-pro-max": ["6-7inch"], "iphone-14-pro": ["6-1inch"], "iphone-14-pro-max": ["6-7inch"],
}
SLUG = {"iphone-se-2": ["iphone-se", "iphone-se-2nd-gen"], "iphone-se-3": ["iphone-se", "iphone-se-3rd-gen"],
        "iphone-11": ["iphone11", "iphone-11"], "iphone-11-pro": ["iphone-11-pro"], "iphone-11-pro-max": ["iphone-11-pro-max"],
        "iphone-xr": ["iphone-xr"], "iphone-duo": ["iphone-duo"],
        # Pro Max: a Apple costuma usar o nome do Pro com o tamanho maior
        "iphone-12-pro-max": ["iphone-12-pro-max", "iphone-12-pro"], "iphone-13-pro-max": ["iphone-13-pro-max", "iphone-13-pro"],
        "iphone-14-pro-max": ["iphone-14-pro-max", "iphone-14-pro"], "iphone-15-pro-max": ["iphone-15-pro-max", "iphone-15-pro"],
        "iphone-16-pro-max": ["iphone-16-pro-max", "iphone-16-pro"], "iphone-17-pro-max": ["iphone-17-pro-max", "iphone-17-pro"],
        "iphone-18-pro-max": ["iphone-18-pro-max", "iphone-18-pro"],
        "iphone-8": ["iphone8", "iphone-8"], "iphone-8-plus": ["iphone8plus", "iphone-8-plus", "iphone8-plus"],
        "iphone-x": ["iphone-x", "iphonex"], "iphone-xs": ["iphone-xs", "iphonexs"], "iphone-xs-max": ["iphone-xs-max", "iphonexsmax"],
        "iphone-12-pro": ["iphone-12-pro"]}

def months(year):
    out = []
    for y in (year - 1, year, year + 1, year + 2):
        for m in (9, 10, 3, 4, 5, 7, 11, 12, 1, 2, 6, 8):
            out.append(f"{y}{m:02d}")
    return out

def candidates(model):
    mid, year = model["id"], model["year"]
    for color in model["colors"]:
        names = []
        for slug in SLUG.get(mid, [mid]):
            for cn in COLOR.get(color, [color]):
                for ym in months(year):
                    for size in SIZE.get(mid, [None]):
                        if size:
                            names.append(f"{slug}-finish-select-{ym}-{size}-{cn}")
                        names.append(f"{slug}-finish-select-{ym}-{cn}")
                    names.append(f"{slug}-{cn}-select-{ym}")
                for y in (year, year + 1):
                    names.append(f"{slug}-{cn}-select-{y}")
                    names.append(f"{slug.replace('-', '')}-{cn}-select-{y}")
        yield color, list(dict.fromkeys(names))

def exists(name):
    req = urllib.request.Request(BASE + name + "?wid=200&hei=200&fmt=png-alpha", method="HEAD",
                                 headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status == 200
    except Exception:
        return False

def main():
    models = json.load(open(os.path.join(HERE, "iphones.json")))
    only = set(sys.argv[1:])
    out_file = os.path.join(HERE, "encontradas.json")
    found = json.load(open(out_file)) if os.path.exists(out_file) else {}
    with cf.ThreadPoolExecutor(32) as pool:
        for m in models:
            if only and m["id"] not in only:
                continue
            for color, names in candidates(m):
                key = f"{m['id']}/{color}"
                if key in found:
                    continue
                hit = None
                # em lotes, para parar no primeiro que existir
                for i in range(0, len(names), 64):
                    batch = names[i:i + 64]
                    res = list(pool.map(exists, batch))
                    if any(res):
                        hit = batch[res.index(True)]
                        break
                print(("OK  " if hit else "--  ") + key + ("  " + hit if hit else ""), flush=True)
                if hit:
                    found[key] = hit
                    json.dump(found, open(out_file, "w"), indent=1)

if __name__ == "__main__":
    main()
