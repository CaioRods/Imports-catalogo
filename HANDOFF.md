# Imports Brasil (IMPORTS): documento de passagem

> Para outra pessoa ou IA continuar **exatamente de onde o trabalho parou**, nos **dois sistemas**:
> o app de Mac da loja e o site. Leia tudo antes de mexer.
> Última atualização: 4 de outubro de 2026, fim do dia. App na versão **1.21 (build 29)**. Site no ar em **https://importsbrasil.com** (loja) e **https://importsbrasil.com/assistencia** (assistência técnica).
> O que mudou nesta data está resumido na **seção 7**.

---

## 1. Visão geral

A **Imports Brasil** **compra, vende e conserta** iPhones, MacBooks e drones DJI. A **assistência técnica do site é só de iPhone**.
- **Marca no texto: IMPORTS.** O logo é desenhado "IMPRTS", com a maçã no lugar do "O" (ver seção 2).
- Donos: **Rafael** (Instagram `rvrodriguess`) e **Caio** (`caio.riguess`). O Caio é quem desenvolve (GitHub `CaioRods`, assinatura **CRdevs**).
- WhatsApp da loja: **(18) 99812-6640** (`5518998126640`). Recebe os pedidos da loja **e** os da assistência (os da assistência chegam marcados como `IMPORTS ASSISTÊNCIA`).

| Peça | Onde está o código | Onde roda |
|---|---|---|
| **Sistema IMPRTS** (app nativo de Mac) | Mac do Caio: `~/Documents/IMPRTS`. **Não está no GitHub**; só subir se o Caio autorizar | Todos os Macs da loja (iMacs antigos e Macs novos), atualização automática |
| **Site / catálogo + assistência** | **Este repositório** (`CaioRods/Imports-catalogo`, branch `main`). Cópia de trabalho no Mac: `~/Documents/IMPRTS/site` | Vercel, domínio **importsbrasil.com** (também `imprts.vercel.app`). **Publica sozinho a cada push no `main`** |

```
 Macs da loja (app IMPRTS) ──REST/tempo real──►  Supabase (Postgres + Storage + Auth)
                                                    │  view "vitrine"   (chave pública, só leitura)
                                                    │  rpc site_track / site_lead (chave pública, só escrita validada)
 Site importsbrasil.com ◄───────────────────────────┘
        ├─► "Tenho interesse" ─► leads + ficha (imagem) ─► WhatsApp da loja
        └─► /assistencia: "Pedir orçamento" ─► relatório em texto ─► WhatsApp da loja (marcado IMPORTS ASSISTÊNCIA; não grava no banco)
 App ◄── rpc site_stats (tela Clientes: visitas, mais vistos, interessados)
```

**Banco:** Supabase, projeto **`evaeprbbctemcnltjuwn`** (São Paulo, plano gratuito). Endereço e chave **anon** (pública) estão em `assets/config.js` (site) e `Sources/Data/Settings.swift` (app).
- A conta do Supabase conectada ao assistente **não é** a dona do projeto. Para alterar o banco, gere o SQL e peça ao Caio para rodar em *SQL Editor → New query → Run*. Todos os SQL do projeto podem ser rodados mais de uma vez sem problema.

---

## 2. Regras e preferências do Caio (leia primeiro)

- **No texto, a marca é IMPORTS** ("IMPORTS Assistência", "Por que a IMPORTS", "IMPORTS Assistance", mensagens do WhatsApp). "IMPRTS" é só o desenho do logo, com a maçã no lugar do O. Nomes internos do código (`window.IMPRTS`, chaves `imprts.*`, o app de Mac "IMPRTS") continuam como estão.
- Fala **português do Brasil**, direto e informal. Quer **ver resultado**, sem explicação longa. Respostas curtas, em PT-BR.
- **Nunca pedir, usar nem repetir senhas** no chat (ele já mandou uma uma vez, e foi recusada).
- **Não fazer `git push` nem publicar versão do app sem ele pedir.** Quando ele pede, fazer na hora. Commits com nomes curtos.
- Tudo **preciso e real**: modelos, cores e capacidades só de fonte oficial (Apple Brasil, The Apple Wiki, DJI). Nunca inventar informação da loja (parcelamento, entrega, prazos de garantia, preços, lista de serviços…).
- Visual **premium, cinematográfico, estilo Apple**, na linguagem do sistema: preto fosco + branco + metal. **Detesta "cara de IA"** (gradiente roxo genérico, emojis, ícones cartunescos). **Sem emojis** em textos de divulgação.
- **Celular primeiro** no site: a maioria dos clientes compra pelo celular, muitos em **iPhone (Safari)**. Testar no tamanho de celular; o que só dá para ver no Safari, pedir para ele testar.
- Ajustes do app: só o que a equipe usa (nada de banco, chaves, URLs).
- **Testar antes de dizer que está pronto** e mostrar print. Se algo não deu para testar, dizer isso claramente.
- Cores da bateria (app e site): **verde 80% ou mais, amarelo 66–79%, vermelho 65% ou menos**.

---

## 3. Banco de dados (Supabase)

SQL no app em `~/Documents/IMPRTS/backend/supabase/`. Os do site têm cópia em `supabase/` neste repositório.

| Arquivo | O que faz | Aplicado? |
|---|---|---|
| `schema.sql` | Tabelas do app: `products`, `repairs`, `activity`, `kv`, tempo real, funções da Siri/Alexa | Sim |
| `compartilhado.sql`, `contas-dos-macs.sql`, `tempo-real.sql`, `siri.sql` | Ajustes de acesso, contas dos Macs, tempo real, voz | Sim |
| `site.sql` | `products.description/photos/cover/promo_price/promo_until`, pasta pública `produtos`, view **`vitrine`** (com `promocao`) | Sim |
| `clientes.sql` | `site_events`, `leads`, funções `site_track(text)`, `site_lead(...)`, `site_stats(days)`, pasta `interesses` | Sim |
| **`banco-completo.sql`** (neste repositório) | **Todos os arquivos acima num só**, com as correções de 4/out/2026 (abaixo). **É o arquivo de referência daqui para frente**; não rodar mais os antigos (o `schema.sql` antigo reabre o acesso para qualquer conta logada) | O Caio colou e rodou em 4/out/2026. **Conferir** (ver seção 6) |

Correções do `banco-completo.sql`:
- **Só as contas da loja acessam os dados:** tabela `contas_loja` + função `eh_loja()` em todas as regras (antes, qualquer pessoa que criasse conta no Supabase via clientes, IMEI, custo, PINs e senhas de aparelho). Na primeira vez que roda, a lista é preenchida com as contas que já existiam.
- **Ficha do "Tenho interesse" volta a subir** (`lead_recente()`; a regra antiga nunca deixava o site enviar).
- **Trava contra robô:** `site_track` (600 eventos por visitante e 20 mil no total, por hora) e `site_lead` (5 por telefone e 100 no total, por hora).
- Rodar de novo não desfaz a trava de publicação do app (`updates`) nem troca a chave da Siri.

- **Conta nova da loja** (Mac novo com outra conta): depois de criar em Authentication, rode `insert into public.contas_loja (user_id, email) select id, email from auth.users where email = '<email>';`. Sem isso a conta entra mas não vê nada.
- **Cadastro do Supabase:** deixar desligado (*Authentication → Sign In / Providers → Allow new users to sign up*).
- **`vitrine`** (o que o site lê). Mostra só produtos com `publish = true`, não apagados, e vendidos há no máximo 7 dias. **Não expõe** custo, IMEI, cliente nem observações. A promoção só aparece enquanto vale. Roda com o dono da tabela de propósito (a chave pública só tem colunas seguras de `products`).
- **Regra de ouro do app:** `SyncEngine.productColumns` tem de bater **exatamente** com as colunas do banco. Coluna nova no app só depois de o SQL estar aplicado; senão a sincronização de **todos os Macs** para.
- **Pastas (Storage):**
  - `updates`: versões do app (só a conta da loja publica);
  - `produtos`: fotos reais dos aparelhos, enviadas pelo app;
  - `interesses`: fichas `<id do lead>.jpg`. O site só consegue subir a ficha nos 10 minutos depois do pedido.
- **Segurança do site:**
  - A chave pública só lê a `vitrine` e só escreve pelas funções `site_track` e `site_lead`, que validam tamanho, formato e limites.
  - Ler `leads` e `site_events` exige login de **conta da loja** (`contas_loja`).

---

## 4. O site (este repositório)

### Estrutura
```
index.html            loja: abertura da marca + catálogo (data-page="home")
produto.html          página do produto (?c=<código>) (data-page="product")
assistencia.html      IMPORTS Assistência, só iPhone (data-page="assist", html data-site="assist")
assets/style.css      visual da loja + peças comuns (menu, janela, rodapé, abertura, transições)
assets/assist.css     visual da assistência (design Apple, temas claro e escuro)
assets/app.js         catálogo, produto, promoções, selos, métricas, conta, transições (sem framework)
assets/assist.js      assistência: tema, busca do iPhone, problemas, barra de resumo
assets/iphones.js     lista de iPhones da busca (gerada; não editar à mão)
assets/interesse.js   janelas: "Tenho interesse" (ficha), "Sua conta" e "Pedir orçamento" (carrega só no 1º toque)
assets/config.js      Supabase (URL + chave pública), WhatsApp, Instagrams, endereço do site
api/ficha.js          função da Vercel: /i/<código>/<id> → página com og:image = ficha (prévia no WhatsApp) → produto
vercel.json           cleanUrls (/assistencia, /produto), cache das imagens, rota /i/...
img/modelos/<modelo>/<cor>.webp   capa oficial padronizada de cada modelo/cor (294 imagens)
img/og.jpg            prévia do link do site (WhatsApp/Instagram), gerada por tools/og/gerar.py
img/apple-assist.svg  maçã com as ferramentas (transição e fundo da assistência)
img/pedra.webp, img/pedra-m.webp  fundo de caverna (tools/textura/pedra.swift)
img/logo.svg, img/apple.svg, img/hero-*.webp, img/icon.png, img/placeholder.png
supabase/             SQL do site; banco-completo.sql é o de referência
tools/fotos-oficiais/ busca e estilização das capas oficiais (estilizar.swift no Mac, estilizar.py fora dele)
tools/assistencia/    logo da assistência (maca.py → logos.py → aplicar.py) e lista de iPhones (iphones.py)
tools/og/             gerador da imagem de prévia do link
tools/textura/        gerador da textura de pedra
```

### Publicar
- **Vercel**: projeto `imprts` (conta do Caio). Domínio **importsbrasil.com** ligado pelo Caio. **Cada push no `main` publica sozinho** em ~30 s (não precisa mais do `npx vercel deploy`). O `www.` ainda não responde.
- Fluxo:
  1. Editar (no Mac: `~/Documents/IMPRTS/site`, ou direto num clone do repositório).
  2. **Atenção:** em 4/out/2026 tudo foi feito num clone do repositório, não na pasta do Mac. Antes de editar no Mac, rode `git pull` na cópia git e copie os arquivos para `~/Documents/IMPRTS/site`; senão o próximo `rsync` da pasta para a cópia git **apaga o que foi feito**.
  3. Commit e push (só quando o Caio pedir).
- **Cache:** os `<link>`/`<script>` usam `?v=<timestamp>`. Ao mudar CSS ou JS, troque o número nas três páginas:
  `sed -i -E "s/(assets\/(app|config|iphones|assist)\.js|assets\/(style|assist)\.css)\?v=[0-9]+/\1?v=$(date +%s)/g" index.html produto.html assistencia.html`
  As capas usam `?v=COVERS_V` (em `app.js`); aumente-o ao regerar capas.
- **Títulos da janela:** "Imports Brasil", "<aparelho> · Imports Brasil" e "Imports Assistência".

### Menu (todas as páginas)
- Cápsula de vidro flutuante (`.nav` no `style.css`), página atual em pílula (`aria-current="page"`), brilho fino passando na borda, encolhe ao rolar.
- Links: Loja · Catálogo · Assistência · Contato + **conta** (e **tema**, só na assistência). No celular some o que não cabe (`hide-m`); os tamanhos de celular ficam no fim do `style.css`.

### Loja: funcionalidades
- **Abertura da marca** (1ª tela de cada visita, `sessionStorage imprts.intro`): o logo cromado surge no centro; a maçã prateada perde o preenchimento e vira a janela para o site; o conjunto cresce a partir da maçã (zoom suave, `70^(t^2,6)`, ~2,5 s) até ela tomar a tela, com os iPhones do topo já subindo dentro dela (`--intro`). É um SVG só (fundo preto com a maçã recortada + letras).
  - **iPhone/Safari:** o brilho passa só pelas letras e some junto com o prateado; no fim do zoom o `app.js` **remove a cortina da página** (só no `animationend` do próprio `.zoom`, com garantia de 3,2 s). Sem isso ficava um véu branco no iPhone.
- **Transições entre telas** (View Transitions; Chrome e Safari do iOS 18.2+; nos outros a página troca normal):
  - abrir produto: a maçã do logo cresce do centro revelando a página e a foto do aparelho voa do cartão para a galeria;
  - voltar ("‹ Catálogo" usa o histórico quando veio do catálogo): o produto se fecha na maçã e a foto volta para o cartão, na mesma rolagem;
  - filtros: os cartões deslizam para o lugar novo;
  - para a foto voar, a tela nova nasce desenhada: catálogo em cache na sessão (`imprts.vitrine`), `app.js` com `blocking="render"` e `init` rodando assim que executa. `html[data-vt]` guarda a última transição ("ida"/"volta").
- **Catálogo:**
  - **agrupado por tipo**: iPhone, MacBook, Drones (e iPad, Apple Watch, Celulares, Acessórios, Outros quando houver), cada grupo com título e quantidade disponível;
  - filtros Todos · iPhone · MacBook · **Drones** · Outros, busca e ordenação (Mais novos, Menor e Maior preço, Bateria);
  - atualiza sozinho a cada 60 s (só com a aba visível e só se algo mudou);
  - produto em promoção vem primeiro dentro do grupo; selo "Novo" (menos de 7 dias) e "VENDIDO" (até 7 dias); barra de bateria colorida.
  - Drone cadastrado como "outro" vai para Drones pelo nome (`groupOf` em `app.js`).
- **Promoção:** cartão com borda dourada e etiqueta "PROMOÇÃO"; preço antigo riscado, novo em dourado com "-X%"; contagem "Termina em…"; ao acabar, a página recarrega.
- **Página do produto:** galeria (capa oficial + até 4 fotos reais); preço, selos (IMPORTS Assistance, Bateria certificada, Peças verificadas), descrição; ficha técnica e peças trocadas/com defeito; informações entram em sequência; barra fixa embaixo com **"Tenho interesse"**.
- **Conta neste celular** (botão redondo no menu, com as iniciais):
  - nome, telefone e e-mail ficam no `localStorage` (`imprts.cliente`), só no aparelho, sem senha e sem servidor;
  - com conta salva, "Tenho interesse" e "Pedir orçamento" pulam os dados ("Enviando como… Alterar");
  - "Sua conta" deixa alterar ou "Sair deste celular".
- **Tenho interesse** (`assets/interesse.js`):
  1. Nome completo e telefone obrigatórios, Gmail opcional (ou a conta salva).
  2. Prévia da **ficha** (1080×1350): pedra, logo metálico, foto, preço/promoção, condição, armazenamento, bateria, peças, IMPORTS Assistance, cliente e data.
  3. Confirmar: `rpc site_lead` grava o interessado; a ficha sobe para `interesses/<id>.jpg`; o WhatsApp da loja abre com o relatório e o link `https://importsbrasil.com/i/<código>/<id>` (prévia = ficha).
  4. Se o banco falhar, o WhatsApp abre mesmo assim, sem o link. Se aparecer "muitos pedidos", o aviso fica 2,5 s antes de abrir o WhatsApp.
- **Prévia do link do site:** `og:image` absoluto (`https://importsbrasil.com/img/og.jpg`), imagem 1200×630.
- **Limite do WhatsApp:** o site não consegue anexar imagem numa mensagem para um número; por isso a ficha vai como link com prévia.
- **Métricas** (`app.js`, bloco "métricas"): visitante = id aleatório no `localStorage`, sessão no `sessionStorage`; eventos `visita` (com origem), `produto`, `clique`, `tempo`; vão em lote para `site_track` (ao sair, por `sendBeacon` com `?apikey=`).
- **Rodapé:** WhatsApp, os dois Instagrams, "© Imports Brasil. Todos os direitos reservados." e a assinatura **CRdevs** ("CR" bem grosso), que leva a `instagram.com/caio.riguess`.

### IMPORTS Assistência (`assistencia.html`, importsbrasil.com/assistencia) — **só iPhone**
- **Design próprio, estilo Apple** (vem da ideia guardada no branch `ideia-redesign`): tema **claro e escuro** (segue o celular; botão no menu; `localStorage imprts.tema`), fonte SF, blocos arredondados, botões em pílula. CSS em `assets/assist.css` (os tokens dos dois temas também ajustam menu, janela e rodapé); lógica em `assets/assist.js`.
- **Logo:** o mesmo desenho do logo com "ASSISTÊNCIA" embaixo; na maçã, **chave fixa** na diagonal "\\" (bocas em cima à esquerda e embaixo à direita) e **chave de fenda** na "/" (cabo em cima à direita, ponta embaixo à esquerda), em X, saindo da maçã; maçã + ferramentas = **um vetor só** (união real, sem borda). As letras ficam um pouco mais afastadas da maçã. O cromado vira grafite no tema claro.
  - Gerado por `tools/assistencia/`: `maca.py` (desenha a maçã; precisa do `shapely`: `pip install shapely`) → `logos.py` (logo do menu, logo do topo, cortina da abertura) → `aplicar.py` (troca só esses desenhos no `assistencia.html`).
- **Topo:** "Assistência para iPhone." e um iPhone oficial "respirando" na frente de uma maçã-com-ferramentas gigante e sutil que balança devagar.
- **Montador de orçamento:**
  1. **Busca de iPhone** com todos os modelos (41 opções: iPhone X ao 18 Pro Max + "Não sei o modelo"); sem acento e sem precisar escrever "iPhone"; setas/Enter no computador. Ao escolher, a **foto oficial** entra animada e dá para **trocar a cor** (a foto troca junto). Lista em `assets/iphones.js`, gerada por `tools/assistencia/iphones.py` a partir de `tools/fotos-oficiais/iphones.json` (rodar de novo quando entrar modelo novo).
     - **No celular a lista é parte da página** (rola com a página, mesmo com o teclado fechado); só escolhe no **toque** (arrastar só rola); fecha ao escolher, ao tocar fora ou com Esc; tocar no campo sempre reabre. Ao escolher, a página volta para a busca com a foto logo abaixo. No computador é uma caixa suspensa.
  2. **"O que está acontecendo?"**: sintomas que o cliente marca (tela, bateria, não carrega, câmera, Face ID…). **Não é lista de serviço nem de preço.**
  3. Detalhes (opcional).
  - Uma **barra flutuante** resume ("iPhone 13 Pro · Dourado · Tela quebrada") e abre a confirmação (`quote()` em `interesse.js`, com a foto e a conta salva).
- **Relatório no WhatsApp marcado como Assistência** (para separar da loja normal): começa com `*IMPORTS ASSISTÊNCIA · PEDIDO DE ORÇAMENTO*`, traz iPhone + cor, problemas, detalhes e cliente, e termina com "Enviado pela página da IMPORTS Assistência (importsbrasil.com/assistencia)". Vai para o mesmo número da loja. **Não grava no banco.**
- Blocos (IMPORTS Assistance 3 meses, conserto na loja pela equipe, orçamento pelo WhatsApp) e "Como funciona" em 3 passos. Sem preços nem prazos.
- Abertura e transições iguais às da loja, com a maçã das ferramentas como janela (`html[data-site="assist"]` no CSS).

### Design da loja
- **Mesma linguagem do sistema.** Paleta em `:root`: fundo `#000`, painéis `#0b0b0d`; texto `#f4f4f5`, secundário `#9c9ca3`, apagado `#5e5e65`; verde `#34c77b`, âmbar `#f2b84b`/dourado `#ffc35a` (promoção), vermelho `#ff4d4f`.
- **Fonte:** system-ui (SF Pro nos aparelhos Apple).
- **Logo = o MESMO do sistema**, em vetores exportados do app (`IMPRTS --export-wordmark`) e embutidos como SVG. Não trocar por fonte da web nem esticar a maçã. No topo ele é **cromado**: gradiente, filtro `bevel` e brilho recortado nas letras.
- **Fundo de caverna:** pedras cinza-escuras, muito escuro, pouquíssima luz só no centro, escurecendo ao descer.
- **NUNCA** colocar camada sobre o quadro inteiro (`mix-blend-mode`, `-webkit-box-reflect`, `filter: drop-shadow` nas imagens do topo): no Chrome isso revela uma caixa retangular, e o Caio odiou.
- URLs dentro de variáveis CSS resolvem a partir de `assets/`; por isso a máscara do reflexo fica inline no HTML.
- **Selos:** horizontais e simples (emblema metálico + título + uma linha). No celular, 2 por linha.
  - **IMPORTS Assistance** = 3 meses de assistência **sem cobrar mão de obra** em todo celular comprado.
  - Não criar selos novos sem o Caio dizer quais a loja tem.
- **Celular:** grade de 2 colunas, nada dependendo de hover. As janelas abrem como folha de baixo; no computador, como janela central.
- `[hidden]` precisa vencer regras de `display` (ex.: `.q-picked[hidden] { display: none }`); senão o elemento aparece vazio.

### Capas oficiais (`tools/fotos-oficiais/`)
- **Busca:** `buscar.py` (iPhones) e `buscar_macs.py` (Macs) testam os nomes do banco de imagens da Apple Store e gravam em `encontradas.json`.
- **Estilização:** `estilizar.swift` tira o fundo com preenchimento a partir das bordas (**não usar o Vision**, ele come aparelho claro), centraliza e põe sombra. **Sem Mac:** `estilizar.py` faz o mesmo enquadramento e sombra em Python (Pillow), para imagens que já vêm sem fundo (ex.: DJI). Uso: `python3 tools/fotos-oficiais/estilizar.py entrada.png img/modelos/<modelo>/<cor>.webp`.
- **Geração:** `gerar.sh` gera WebP de 800 px. **Não usar PNG quantizado**, porque cria faixas.
- **Drones:** fotos oficiais da DJI.
  - **Phantom 4** (`img/modelos/dji-phantom-4/branco.webp`, da loja oficial da DJI): o app ainda não tem esse modelo no catálogo, então o produto vem como categoria "outro" e sem `model_id`. O site acha a capa pelo nome (`BY_NAME` em `app.js`) e o põe no grupo Drones. Quando o Phantom 4 entrar no `DroneCatalog` do app com o id `dji-phantom-4`, essa linha pode sair.
- **Sem foto oficial** (MacBook 12" 2015–17, Air 2015): usa o render 3D do app (`--render-covers`).
- **Modelo novo:** exportar o json → busca + `gerar.sh` → conferir as imagens → aumentar `COVERS_V` → (iPhone) rodar `tools/assistencia/iphones.py` para entrar na busca da assistência.

---

## 5. O sistema IMPRTS (app de Mac)

### Técnica
- **Swift + AppKit desenhado à mão.** Sem SwiftUI, sem storyboard, sem SF Symbols: ícones e aparelhos são desenhados em Core Graphics.
- Roda no **macOS 10.13 ou mais novo** (a loja tem iMacs 2011, 2012 e 2015) e é universal (Intel + Apple Silicon). Antes de usar uma API, confira se ela existe no 10.13 ou proteja com `#available`.
- **XcodeGen:** `project.yml`. Depois de criar um arquivo, rode `xcodegen generate`.
- **Build de teste:**
  ```
  xcodebuild -project IMPRTS.xcodeproj -scheme IMPRTS -configuration Debug -destination 'generic/platform=macOS' -derivedDataPath ~/Library/Caches/IMPRTS-build-dbg build
  ```
- **Publicar para todos os Macs:** `./release.sh <versão> "<o que mudou>"`.
  - Compila, instala em `/Applications` e envia para a pasta `updates`. Os Macs se atualizam sozinhos, conferindo o SHA-256.
  - A conta de envio fica no Chaveiro (`IMPRTS-release`) e em `.release-email`. **Nunca** publicar esses arquivos.
- **iCloud:** a pasta Documentos está no iCloud e o disco anda cheio, então arquivos viram "dataless".
  - Antes de compilar ou usar git, rode `find Sources -flags +dataless -exec cat {} \; >/dev/null`.
  - O `release.sh` para se `.release-email` estiver fora do Mac.
- **Testar sem mexer no banco real** (build debug; abrir sempre com `open -n`, porque executar direto morre por permissão):
  ```
  open -n "$APP" --env IMPRTS_DATA_DIR=<pasta temporária> --env IMPRTS_AUTOLOGIN=rafael --env IMPRTS_PAGE=<n> --args -ApplePersistenceIgnoreState YES
  ```
  - Páginas especiais em `Sources/App/DebugDemo.swift`:
    - 99: editar produto (com `IMPRTS_PROMO=1`, abre a promoção);
    - 89 + `IMPRTS_CAPTURE=<pasta>`: tira foto das telas Clientes, Estoque em modo Fotos e Ajustes, sem precisar de acesso à tela;
    - 90: roteiro completo de capturas;
    - 91 e 92: Siri.
  - O app de teste usa o **mesmo bundle id** (`com.imprts.app`) e as mesmas preferências do app de verdade. Não deixe preferência alterada.

### Arquivos principais (`Sources/`)
| Pasta | Conteúdo |
|---|---|
| `App/` | `AppDelegate` (janela, menus, entrar/sair), `main.swift` (comandos de desenvolvimento: `--export-wordmark`, `--render-covers`, `--render-3d`), `DebugDemo` (modo demo), `AlexaLink`, `Build` |
| `Data/` | `Models` (Product, RepairOrder, Activity, contas e telas permitidas), `Store` (JSON local + backups), `SyncEngine` (REST Supabase, `productColumns`, upload), `Realtime`, `Settings` (preferências), `SitePhotos` (capas oficiais via CDN jsDelivr do repositório + fotos reais), `IPhoneReader` + `PartNumbers` (leitura pelo cabo), `Updater` |
| `Catalog/` | Catálogo de modelos reais: `IPhoneCatalog`, `MacCatalog`, `DroneCatalog`, `AndroidCatalog`, `Parts` |
| `Render/` | `DeviceArt` (imagem 2D vetorial ou **foto** conforme os Ajustes), `DeviceStage` (palco 3D SceneKit que gira com o mouse), `Device3D`, renderers de iPhone/Mac/Android |
| `Screens/` | `Shell` (barra lateral, `PageID`), `OverviewPage`, `StockPage` (+ `StockPrefs`), `ProductEditorPage` (cadastro, promoção, "No site"), `SitePhotoStrip` + `PhotoCropSheet` (fotos com recorte/zoom), `ServicesPage`/`RepairsPage`/`RequestsPage`, `SalesPage`, **`ClientsPage`**, `LabelsPage`, `SettingsPage`, `ProfilePage`, `LoginView`, `PairSheet` |
| `Quote/` | Orçamento (gera imagem) e tabela de Valores (só do dono) |
| `Siri/` | Siri própria: entende frases em PT-BR, dá baixa em venda, faz orçamento; borda colorida estilo Apple Intelligence |
| `Theme/` | `Theme` (cores, fontes, helpers `label/hstack/vstack`), `Components` (Button, Card, ChipGroup, Field, Toast…), `Icons` (desenhados), `Wordmark` (logo), `Skeleton` |

### Contas e telas
- **Rafael** (dono): Visão geral, Estoque, Cadastrar, Serviços, Orçamento, Vendas, **Clientes**, Etiquetas, Valores, Ajustes.
- **Funcionário**: as mesmas, menos Valores.
- **Caleb** (técnico): Serviços, Orçamento, Ajustes. Tem serviços "por fora" que só ele vê.
- **Alexa / Siri**: só voz.
- Cada conta tem PIN de 4 dígitos, que vale só no Mac onde foi definido.

### Funcionalidades
- **Leitura do iPhone pelo cabo** (libimobiledevice embutido): modelo, **cor exata pelo número de peça da Apple**, capacidade, IMEI, bateria e checagem de peças, NFC incluído.
  - Peça só é marcada "trocada" com prova. Módulo que não responde é marcado "defeito".
  - Na troca de tela, a câmera frontal e o Face ID são **realocados** e continuam originais.
  - O produto só é registrado ao tocar em **Confirmar cadastro**.
- **Estoque:**
  - lista, grade ou vitrine; ordenar e agrupar; "Virar celulares" (de costas);
  - aviso de produto parado;
  - bateria colorida.
- **Cadastro:**
  - palco 3D;
  - bloco **No site**: descrição + até 4 fotos reais com **recorte e zoom** (total de 5 com a capa oficial fixa), enviadas para `produtos`;
  - **Promoção**: preço + prazo (Sem prazo, 24 h, 3 dias, 7 dias ou data e hora escolhidas).
- **Clientes** (`ClientsPage`, uma chamada à `rpc site_stats`):
  - visitantes, produtos abertos, tempo médio, interessados e % pelo celular;
  - períodos: Hoje, 7, 30 ou 90 dias;
  - ranking dos mais vistos, visitas por dia, origem das visitas;
  - lista de interessados: produto, o que mais viram, tempo no site, andamento (Novo, Contatado, Vendido, Perdido, salvo em `leads.status`) e botão WhatsApp.
- **Ajustes → Visual dos aparelhos** (`Settings.deviceLook`): **3D** (padrão), **2D** (desenho vetorial) ou **Fotos**.
  - Fotos usa as capas do catálogo, baixadas de `cdn.jsdelivr.net/gh/CaioRods/Imports-catalogo@main/img/modelos/...`. Elas ficam guardadas em `Application Support/IMPRTS/FotosSite`.
  - Sem foto, ou em macOS sem WebP, o aparelho aparece em 2D.
- Vendas (com exportação para planilha), Serviços (quadro fila/conserto/pronto), Orçamento em imagem, Etiquetas, Siri, atualização automática.

### Versões recentes
- **1.19**: modelos novos (iPhone 17e/18/Duo, MacBook Neo/M5, DJI Avata), 3D, Organizar estoque.
- **1.20**: fotos do site com recorte, promoções, cores da bateria.
- **1.21**: tela Clientes, Visual dos aparelhos (3D/2D/Fotos).


---

## 6. Pendências e ideias

**Conferir (segurança, prioridade):**
- No Supabase, confirmar que o `banco-completo.sql` rodou sem erro e que a lista final de `contas_loja` só tem contas da loja. Se tiver e-mail estranho, apagar em *Authentication → Users*.
- Confirmar que o **cadastro de contas novas está desligado** (*Authentication → Sign In / Providers → Allow new users to sign up*). Em 4/out/2026 ele estava **ligado**.
- A senha da conta dos Macs vai dentro do app: quem tiver uma cópia do app tem acesso ao banco. Pensar numa próxima versão do app.

**Site:**
- Pedidos da assistência não ficam registrados no sistema (só vão para o WhatsApp). Ideia: função `site_assist` no banco para aparecerem na tela Clientes, separados dos interessados da loja.
- Se o Caio passar, colocar **serviços e/ou preços** da assistência (hoje não há nenhum, para não inventar).
- O selo "Peças verificadas: Tela, câmeras e Face ID" aparece também em drone (que não tem Face ID). Perguntar se troca o texto para drones.
- `www.importsbrasil.com` não está configurado.
- `assets/config.js`: `endereco` e `cidade` vazios. Preencher quando o Caio passar.
- LGPD: o site liga o id do visitante ao nome/telefone do lead. Fazer uma página curta de privacidade (o texto precisa vir da loja).
- Outros selos de certificação da loja: perguntar quais.
- Ideias: página por categoria, prévia (Open Graph) por produto, PWA, filtro por faixa de preço, comparação entre aparelhos, "acompanhar o conserto" pelo número da OS.
- Limpeza: `site_events` cresce sem parar. Se ficar grande, apagar eventos com mais de 180 dias.

**App:**
- O `SitePhotos.siteURL` ainda aponta para `https://imprts.vercel.app` (continua funcionando). Pode virar `https://importsbrasil.com`.
- Colocar o **Phantom 4** no `DroneCatalog` (id `dji-phantom-4`, cor `branco`) e corrigir o produto 026 no sistema: nome "drone phamton 4 branco" e categoria "outro" → "Phantom 4" e categoria Drone. Vários produtos estão com nome em minúsculo ("macbook neo prata").
- Tela Clientes: notificação em tempo real de novo interessado (ideia).

**Ideia guardada (redesign):** o branch `ideia-redesign` (pasta `_preview/`: `direcao.html` e `produto.html`) tem uma prévia do site inteiro em design Apple, claro e escuro, com iPhones primeiro e animações contínuas. A assistência já usa essa linguagem. **Esse branch não foi enviado ao GitHub**: só existe no clone usado em 4/out/2026. Se quiser guardar, pedir o push do branch.

---

## 7. O que mudou em 4 de outubro de 2026 (site)

1. **Segurança do banco:** análise completa e `supabase/banco-completo.sql` (todos os SQL num só, com `contas_loja`, ficha voltando a subir e trava contra robô). Ver seção 3.
2. **Prévia do link** (`img/og.jpg`), catálogo sem piscar, janela do interesse sem vazamento de eventos.
3. **Catálogo agrupado** (iPhone, MacBook, Drones…) + filtro Drones + **capa oficial do Phantom 4** (`estilizar.py` para fazer capas sem Mac).
4. **Conta neste celular** (nome, telefone, e-mail guardados no aparelho; botão com as iniciais no menu).
5. **Transições cinematográficas** com a maçã do logo e a foto voando do cartão para a página; **abertura da marca** com zoom suave a partir da maçã.
6. **Menu novo** em cápsula de vidro, igual em todas as páginas.
7. **IMPORTS Assistência** (`/assistencia`): só iPhone, design Apple claro/escuro, logo com chave fixa e chave de fenda, busca de iPhone com foto e cor, sintomas, relatório no WhatsApp marcado como `IMPORTS ASSISTÊNCIA`.
8. **Texto da marca corrigido para IMPORTS** em todo o site.
9. **Correções no iPhone:** lista da busca rolando com a página e sem fechar ao baixar o teclado; véu branco depois da abertura (brilho só nas letras + cortina removida no fim do zoom).
