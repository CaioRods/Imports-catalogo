#!/usr/bin/env python3
"""Procura a foto oficial (Apple Store) de cada MacBook do catálogo, por cor.
Grava em encontradas.json (mesmo arquivo dos iPhones)."""
import json, os, sys, urllib.request, concurrent.futures as cf

BASE = "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
HERE = os.path.dirname(os.path.abspath(__file__))

COLOR = {
    "prateado": ["silver"], "cinza-espacial": ["spacegray", "space-gray", "space", "sg"], "dourado": ["gold"],
    "ouro-rosa": ["rosegold", "rose-gold"], "meia-noite": ["midnight"], "estelar": ["starlight"],
    "preto-espacial": ["spaceblack", "space-black"], "azul-ceu": ["skyblue", "sky-blue"],
    "blush": ["blush"], "amarelo-citrico": ["citrus"], "indigo": ["indigo"],
}

def slugs(mid):
    if mid.startswith("neo"): return ["macbook-neo", "mbneo", "macbook-neo-13"]
    if mid.startswith("mba-15"):
        chip = mid.split("-")[-1]
        return ["mba15", f"mba15-{chip}", "macbook-air-15"]
    if mid.startswith("mba-13-m"):
        chip = mid.split("-")[-1]
        return ["mba13", f"mba13-{chip}", f"macbook-air-{chip}", "macbook-air-13"]
    if mid == "mba-m1": return ["macbook-air", "mba13-m1", "mba-m1"]
    if mid.startswith("mba-"): return ["macbook-air", "mba13", "mba"]
    if mid.startswith("mb-12"): return ["macbook", "mb12", "macbook-12"]
    if mid.startswith("mbp-14") or mid.startswith("mbp-16"):
        size = mid.split("-")[1]
        chip = mid.split("-")[-1]
        out = [f"mbp{size}", f"mbp{size}-{chip}"]
        if mid == "mbp-16-2019": out += ["mbp16touch", "mbp16"]
        return out
    if mid.startswith("mbp-13"):
        return ["mbp13touch", "mbp13", "mbp-13", "mbp", "mbp13-m2", "mbp13-m1"]
    if mid.startswith("mbp-15"):
        return ["mbp15touch", "mbp15", "mbp-15"]
    return [mid]

def stamps(year):
    out = []
    for y in (year, year + 1, year - 1, year + 2):
        for m in (10, 11, 6, 1, 3, 5, 7, 9, 4, 12, 2, 8):
            out.append(f"{y}{m:02d}")
    return out

def candidates(model):
    for color in model["colors"]:
        names = []
        for slug in slugs(model["id"]):
            for cn in COLOR.get(color, [color]):
                for st in stamps(model["year"]):
                    names.append(f"{slug}-{cn}-select-{st}")
                for y in (model["year"], model["year"] + 1):
                    names.append(f"{slug}-{cn}-select-{y}")
                    names.append(f"{slug}-{cn}-cto-hero-{y}")
        yield color, list(dict.fromkeys(names))

def exists(name):
    req = urllib.request.Request(BASE + name + "?wid=200&hei=200&fmt=png-alpha", method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status == 200
    except Exception:
        return False

def main():
    models = json.load(open(os.path.join(HERE, "macs.json")))
    only = set(sys.argv[1:])
    out_file = os.path.join(HERE, "encontradas.json")
    found = json.load(open(out_file)) if os.path.exists(out_file) else {}
    with cf.ThreadPoolExecutor(48) as pool:
        for m in models:
            if only and m["id"] not in only:
                continue
            for color, names in candidates(m):
                key = f"{m['id']}/{color}"
                if key in found:
                    continue
                hit = None
                for i in range(0, len(names), 96):
                    batch = names[i:i + 96]
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
