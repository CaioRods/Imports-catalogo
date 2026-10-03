#!/bin/bash
# Gera as capas oficiais padronizadas do site a partir de encontradas.json.
# Uso: ./gerar.sh   (só gera as que ainda não existem; apague a pasta para refazer)
set -e
cd "$(dirname "$0")"
OUT=../../img/modelos
TMP=$(mktemp -d)
B="https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is"
python3 -c "import json; [print(k, v) for k, v in json.load(open('encontradas.json')).items()]" | while read key name; do
  dest="$OUT/$key.webp"
  [ -f "$dest" ] && continue
  mkdir -p "$(dirname "$dest")"
  curl -sf "$B/$name?wid=1600&hei=1600&fmt=png-alpha" -o "$TMP/src.png" || { echo "falhou $key"; continue; }
  ./estilizar "$TMP/src.png" "$TMP/out.png" && sips -Z 800 "$TMP/out.png" --out "$TMP/small.png" >/dev/null \
    && python3 -c "from PIL import Image; Image.open('$TMP/small.png').save('$dest', 'WEBP', quality=86, method=6)" && echo "ok $key"
done
rm -rf "$TMP"
