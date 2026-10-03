# IMPRTS — Documento de passagem (para continuar o trabalho)

> Este arquivo é para outra pessoa ou IA continuar exatamente de onde o trabalho parou.
> Leia tudo antes de mexer. Última atualização: outubro de 2026.

---

## 1. O que é a IMPRTS

Loja que **compra, vende e conserta iPhones e MacBooks** (e agora drones DJI). Dono: **Rafael**.
Quem desenvolve: **Caio** (CaioRods no GitHub).

Existem **duas peças**:

| Peça | Onde está | O que é |
|---|---|---|
| **Sistema IMPRTS** (app de Mac) | No Mac do Caio: `~/Documents/IMPRTS` (não está neste repositório) | App nativo em Swift/AppKit que roda em todos os Macs da loja: estoque, cadastro, vendas, serviços, orçamentos, etiquetas, Siri própria |
| **Site / catálogo** | **Este repositório** | Site estático (HTML/CSS/JS puro) que mostra o estoque à venda, lendo direto do banco do sistema |

Os dois compartilham o mesmo banco: **Supabase**, projeto `evaeprbbctemcnltjuwn` (região São Paulo).

---

## 2. Estado atual (o que está pronto e o que falta)

### Pronto
- Site completo (landing cinematográfica + catálogo + página de produto), testado no celular e no computador, **lendo os produtos reais** da vitrine.
- Capas padronizadas de **todos os modelos e cores** do catálogo em `img/modelos/<modelo>/<cor>.webp`:
  - iPhones: **foto oficial da Apple** para todas as cores (iPhone 8 → 18 Pro Max, Air, Duo, 17e).
  - MacBooks: **foto oficial da Apple** do Air 2018 em diante, Pro com Touch Bar, Pro 14/16 (todas as gerações), Neo. Os MacBooks de **2015–2017** não existem mais no banco de imagens da Apple → usam **render 3D do próprio sistema**.
  - Drones DJI Avata / Avata 2 / Avata 360: **foto oficial da DJI**.
- No sistema (app de Mac), já programado mas **NÃO publicado** para as lojas: bloco **"No site"** no cadastro do produto — descrição para o cliente + várias fotos reais + escolha da capa (por padrão a capa é a foto oficial padronizada).

### Falta (em ordem)
1. **Banco:** aplicar `supabase/site.sql` no projeto `evaeprbbctemcnltjuwn` (cria `description`, `photos`, `cover` em `products`, a pasta pública de fotos `produtos` e recria a view `vitrine` com esses campos).
   - A conta do Supabase conectada ao assistente era outra (não tinha esse projeto). Precisa conectar a conta dona do projeto **ou** colar o SQL no SQL Editor do painel do Supabase.
2. **Só depois do passo 1:** publicar a versão nova do sistema (`./release.sh 1.20 "Site: descrição e fotos no cadastro"` dentro de `~/Documents/IMPRTS`). **Nunca publique antes**: o app passa a enviar as colunas novas e, se elas não existirem no banco, a sincronização de todos os Macs para.
3. **Vercel:** publicar este repositório (é estático, sem build). O Caio começou `npx vercel login`. Depois: `npx vercel deploy --prod` na raiz deste repo.
   - Se o endereço final for diferente de `https://imprts.vercel.app`, trocar a constante `SitePhotos.siteURL` em `Sources/Data/SitePhotos.swift` do sistema (o app busca a capa oficial no site).
4. **Contatos da loja** em `assets/config.js`: `whatsapp` (só números, com 55 + DDD), `instagram` (sem @), `endereco`, `cidade`. Sem o WhatsApp, o botão "Comprar pelo WhatsApp" não aparece.
5. Pedidos do Caio ainda abertos: ver seção 8.

---

## 3. Estrutura deste repositório

```
index.html            landing + catálogo (data-page="home")
produto.html          página do produto (?c=<código>) (data-page="product")
assets/style.css      todo o visual
assets/app.js         lógica (sem framework, sem dependências)
assets/config.js      URL + chave PÚBLICA do Supabase + contatos da loja
img/modelos/<modelo>/<cor>.webp   capa padronizada de cada modelo/cor (800×800, fundo transparente)
img/hero-1..3.webp    aparelhos do hero
img/pedra.webp, img/pedra-m.webp   fundo de caverna (gerado por tools/textura/pedra.swift)
img/logo.svg          logo do sistema
img/icon.png, img/placeholder.png, img/apple.svg
vercel.json           cleanUrls + cache das imagens
supabase/site.sql     alteração do banco para o site (ver passo 1)
tools/fotos-oficiais/ ferramentas que geram as capas (ver seção 6)
tools/textura/        gerador da textura de pedra
HANDOFF.md            este arquivo
```

**Versão dos arquivos:** os `<link>`/`<script>` usam `?v=<timestamp>` para furar o cache. Ao mudar CSS/JS, troque o número (ex.: `sed -E "s#assets/(style\.css|config\.js|app\.js)(\?v=[0-9]+)?#assets/\1?v=$(date +%s)#g"`).

---

## 4. Como o site lê os dados

- Lê a **view pública `vitrine`** via REST do Supabase com a **chave anon** (pública, pode ficar no código):
  `GET {supabaseURL}/rest/v1/vitrine?select=*&order=code.desc` com headers `apikey` e `Authorization: Bearer <anon>`.
- A view **não** expõe custo, IMEI/série, cliente, observações internas. Só produtos com `publish = true` ("Mostrar no site" no sistema), não apagados, e vendidos há no máximo 7 dias (aparecem com selo "Vendido").
- O catálogo se atualiza sozinho a cada 60 s.
- Campos usados: `id, code, category, model_id, color_id, name, storage, ram, chip, battery_health, condition, parts, price, vendido, status, created_at, updated_at, sold_at` + (depois do passo 1) `description, photos, cover`.
- **Imagens do produto** (`images()` em `app.js`): se `cover` for uma das `photos`, ela vem primeiro; senão a **capa oficial** `img/modelos/<model_id>/<color_id>.webp`; depois as fotos reais (`{supabaseURL}/storage/v1/object/public/produtos/<caminho>`).
- `model_id`/`color_id` são os mesmos ids do catálogo do sistema (ex.: `iphone-17-pro` / `laranja-cosmico`).
- `parts` = `{ "<peça>": "trocada" | "defeito" }` (ids em `PARTS` no `app.js`). O site mostra as peças trocadas/com defeito por transparência.
- `condition`: `novo | seminovo | vitrine | usado | pecas`.

---

## 5. Design (site)

**Regra geral: mesma linguagem do sistema** — preto fosco, branco e metal; muito espaço; tipografia leve; nada de "cara de IA" (sem gradientes roxos genéricos, sem emojis, sem ícones cartunescos).

- Paleta (`:root` em `style.css`): fundo `#000`, painéis `#0b0b0d`/`#111113`, texto `#f4f4f5`, texto secundário `#9c9ca3`, apagado `#5e5e65`, verde `#34c77b`, âmbar `#f2b84b`, vermelho `#ff4d4f`, metal = gradiente prata.
- Tipografia: system-ui (SF Pro nos aparelhos Apple).
- **Logo IMPRTS = o MESMO do sistema** (letras finas SF + a maçã no lugar do "O", na proporção certa, sem esticar). Ele é exportado do app em caminhos vetoriais (`IMPRTS --export-wordmark <arquivo>` no build de desenvolvimento) e está embutido como SVG no HTML (`svg.logo`; arquivo solto em `img/logo.svg`). Não trocar por fonte da web.
  - No hero (`svg.logo-hero`): **cromado realista** — gradiente com faixas claras/escuras, contorno fino para engrossar um pouco, relevo com luz especular (filtro SVG `bevel`) e um brilho que passa **só dentro das letras** (`clipPath`).
- **Foco em celular** (a maioria dos clientes compra pelo celular): grade de 2 colunas no celular, 3 no tablet, 4 no computador; barra de compra fixa embaixo na página do produto; nada pode depender de hover.
- **Fundo = parede de caverna**: pedras cinza-escuras (`img/pedra.webp` / `img/pedra-m.webp` no celular), **muito escuro**, com **pouquíssima luz só no centro**, escurecendo até o preto ao descer a página (`.cave`, `.cave-light`, `.cave::after` no CSS). Pedido do Caio: "mais pedregoso, mais escuro, pouquíssima iluminação".
  - A textura é gerada por código, sem imagem de terceiros: `tools/textura/pedra.swift` (`swiftc -O pedra.swift -o pedra && ./pedra saida.png 1800 1200`), depois convertida para WebP (qualidade ~70).
- Hero cinematográfico: logo cromado, frase "Seu próximo iPhone, com procedência.", aparelhos oficiais subindo em sequência e flutuando, brilho laranja atrás do central, feixes de luz suaves, reflexo de luz que passa **recortado no formato de cada aparelho** (máscara com a própria imagem, definida inline no HTML), parallax ao rolar.
  - No celular a ordem é: legenda curta → logo → frase → aparelhos grandes → texto → botão em largura total.
  - **NUNCA** colocar camada que cubra o quadro inteiro (reflexo, granulado com `mix-blend-mode`, `-webkit-box-reflect`, `filter: drop-shadow` nos aparelhos): no Chrome isso revela uma caixa retangular. O Caio odiou isso.
  - URLs em variáveis CSS são resolvidas a partir de `assets/` — por isso a máscara do reflexo é definida inline no HTML.
- **Selos IMPRTS** (no fim da página e na página de produto): horizontais e simples — emblema metálico serrilhado com ícone + título + uma linha. No celular ficam **lado a lado** (2 por linha), menores. Código em `app.js` (`SEALS`, `emblem()`, `sealBadge()`), CSS `.badge`.
  - **IMPRTS Assistance** (dourado): todo celular comprado na IMPRTS tem **3 meses de assistência sem cobrar mão de obra** (informação do Caio).
  - Bateria certificada, Peças verificadas, Estoque real: só afirmam o que o sistema realmente faz. O Caio disse que a loja tem "outros selos de certificação" — **perguntar quais** antes de criar novos; não inventar prazos (a garantia padrão não está definida).
- Cartão de produto: capa sobre brilho radial, código no canto (`000`), selo "Novo" (< 7 dias), etiquetas (capacidade, condição), barra de bateria colorida (verde ≥ 88%, âmbar ≥ 80%, vermelho abaixo), preço.
- **Não inventar informação da loja**: nada de "parcelamos em 12×", "entregamos em todo o Brasil" etc. sem o Caio confirmar.

## 6. Capas padronizadas (fotos oficiais)

Ferramentas em `tools/fotos-oficiais/`:
- `iphones.json`, `macs.json`: modelos e cores do catálogo (exportados do sistema).
- `buscar.py` (iPhones) e `buscar_macs.py` (MacBooks): testam os padrões de nome do banco de imagens da Apple Store (`https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/<nome>?wid=1600&hei=1600&fmt=png-alpha`) e gravam o que acham em `encontradas.json` (`"<modelo>/<cor>": "<nome-da-imagem>"`). Padrões que funcionam (exemplos):
  - `iphone-13-finish-select-202207-midnight`, `iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium`, `iphone11-purple-select-2019`, `iphone-12-pro-graphite-hero`, `iphone-13-mini-green-select`
  - `mba13-midnight-select-202402`, `mbp14-spaceblack-select-202410`, `macbook-neo-citrus-cto-hero-202603`
- `estilizar.swift` (compilar: `swiftc -O estilizar.swift -o estilizar`): tira o fundo (preenchimento a partir das bordas pela cor do fundo, com borda suave — **não usar o Vision**, ele come aparelhos claros), recorta, centraliza num quadro 1200×1200 transparente com o aparelho sempre do mesmo tamanho e põe sombra de contato.
- `gerar.sh`: baixa cada imagem de `encontradas.json`, estiliza, reduz para 800 px e salva em WebP (qualidade 86) em `img/modelos/<modelo>/<cor>.webp`. Só gera as que faltam.
- **Não quantizar PNG** (cria faixas nos gradientes das telas). Usar WebP.
- As URLs das capas têm `?v=<COVERS_V>` (em `app.js`). **Ao regerar capas, aumentar `COVERS_V`**, senão os celulares continuam mostrando a imagem antiga do cache.
- Drones: fotos oficiais da DJI (`www-cdn.djiits.com/cms/uploads/<id>@640*640.png`) passadas pelo mesmo `estilizar`.
- Sem foto oficial: o sistema gera um render 3D (`IMPRTS --render-covers <pasta>`, só no build de desenvolvimento) que passa pelo mesmo `estilizar`.
- Ao adicionar um modelo novo no sistema: exportar de novo o json, rodar a busca, `gerar.sh`, e conferir uma prancha de miniaturas antes de publicar.

---

## 7. O sistema (app de Mac) — o que precisa saber

Código em `~/Documents/IMPRTS` (projeto **XcodeGen**: `project.yml` → `xcodegen generate`). Não está no GitHub (repositório público — enviar só se o Caio autorizar).

- **Plataforma:** macOS **10.13** ou mais novo (a loja tem iMac 2011/2012/2015 e MacBooks novos). Swift + **AppKit desenhado à mão** (sem SwiftUI, sem storyboard). Universal (Intel + Apple Silicon).
- **Dados:** JSON local em `~/Library/Application Support/IMPRTS/imprts.json` (backup diário em `Backups/`) + sincronização com o Supabase (`Sources/Data/SyncEngine.swift`, REST + tempo real). Funciona offline.
- **Publicar versão:** `./release.sh <versão> "<o que mudou>"` — compila, instala em `/Applications`, envia para a pasta pública `updates` do Supabase; todos os Macs se atualizam sozinhos (conferem SHA-256). A conta de envio fica no Chaveiro (`IMPRTS-release`) e em `.release-email`/`.device-email` (**nunca** publicar esses arquivos).
- **Cuidado com o iCloud:** a pasta Documentos está no iCloud e, com o disco cheio, o macOS tira arquivos do Mac (ficam "dataless"). Antes de compilar: `find Sources -flags +dataless` e, se houver, ler os arquivos para baixar de volta. O `release.sh` já para se `.release-email` estiver fora do Mac.
- **Telas:** Visão geral, Estoque (lista/grade/vitrine, ordenar, agrupar, celulares de costas), Cadastrar (com palco 3D em SceneKit que gira com o mouse), Serviços, Orçamento, Vendas, Etiquetas, Valores, Ajustes (sem nada técnico/banco — pedido do Caio).
- **Leitura de iPhone pelo cabo** (`Sources/Data/IPhoneReader.swift`, libimobiledevice embutido): modelo, **cor exata pelo número de peça da Apple** (`Sources/Data/PartNumbers.swift`, tabela de todos os iPhones), capacidade, IMEI, bateria e verificação de peças:
  - Tela trocada **só** com prova (`Panel_ID` presente e vazio). Modelos sem `Panel_ID` (ex.: 14 Pro Max) → só aviso para conferir.
  - Face ID decidido pelo chip de segurança (`FDRValidated`).
  - Na troca de tela, câmera frontal e Face ID são realocados: continuam originais (não marcar como trocados).
  - Leitura interrompida não marca nada. Só registra o produto ao tocar em **Confirmar cadastro**.
- **Catálogo** (`Sources/Catalog/`): todos os iPhones do 8 ao 18 Pro Max + Air + **Duo** (dobrável) + 17e, MacBooks 2015 → M5 Pro/Max + **Neo**, drones DJI Avata (a "capacidade" do drone é o **kit/combo**). Regra: **nenhum modelo recebe cor ou capacidade que não existiu** (fontes: Apple Brasil, The Apple Wiki, DJI).
- **Siri própria** (voz, borda colorida estilo Apple Intelligence) e atalhos para a Siri do iPhone.

## 8. Preferências do Caio (importante)

- Fala **português do Brasil**, direto. Gosta de ver resultado, não de explicação longa.
- Quer tudo **preciso e real**: dados de modelos/cores/capacidades sempre de fonte oficial; nada inventado.
- Visual **premium, cinematográfico, no estilo Apple** e no estilo do próprio sistema (preto/metal). Detesta "cara de IA".
- Sem emojis nos textos de divulgação.
- Prioridade para **celular** no site.
- Ajustes do sistema: só o que a equipe usa (nada de banco, chaves, URLs).
- Sempre testar antes de dizer que está pronto; mostrar print.
- Nunca pedir nem usar senhas no chat.

### Pedidos em aberto / ideias
- Publicar o site (Vercel) e ligar domínio próprio, se houver.
- Aplicar `site.sql` e publicar a versão do sistema com fotos/descrição.
- Preencher contatos em `assets/config.js`.
- Possíveis melhorias: página por categoria, compartilhamento do produto (Open Graph por produto exige servidor/edge), PWA, filtro por faixa de preço, comparação entre aparelhos.
