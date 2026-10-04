# Imports Brasil (IMPRTS): documento de passagem

> Para outra pessoa ou IA continuar **exatamente de onde o trabalho parou**, nos **dois sistemas**:
> o app de Mac da loja e o site. Leia tudo antes de mexer.
> Última atualização: 4 de outubro de 2026. App na versão **1.21 (build 29)**. Site no ar em **https://importsbrasil.com**.

---

## 1. Visão geral

A **Imports Brasil** (marca **IMPRTS**, com a maçã no lugar do "O") **compra, vende e conserta** iPhones, MacBooks e drones DJI.
- Donos: **Rafael** (Instagram `rvrodriguess`) e **Caio** (`caio.riguess`). O Caio é quem desenvolve (GitHub `CaioRods`, assinatura **CRdevs**).
- WhatsApp da loja: **(18) 99812-6640** (`5518998126640`).

| Peça | Onde está o código | Onde roda |
|---|---|---|
| **Sistema IMPRTS** (app nativo de Mac) | Mac do Caio: `~/Documents/IMPRTS`. **Não está no GitHub**; só subir se o Caio autorizar | Todos os Macs da loja (iMacs antigos e Macs novos), atualização automática |
| **Site / catálogo** | **Este repositório** (`CaioRods/Imports-catalogo`). Cópia de trabalho no Mac: `~/Documents/IMPRTS/site` | Vercel, domínio **importsbrasil.com** (também `imprts.vercel.app`) |

```
 Macs da loja (app IMPRTS) ──REST/tempo real──►  Supabase (Postgres + Storage + Auth)
                                                    │  view "vitrine"   (chave pública, só leitura)
                                                    │  rpc site_track / site_lead (chave pública, só escrita validada)
 Site importsbrasil.com ◄───────────────────────────┘
        └─► "Tenho interesse" ─► leads + ficha (imagem) ─► WhatsApp da loja
 App ◄── rpc site_stats (tela Clientes: visitas, mais vistos, interessados)
```

**Banco:** Supabase, projeto **`evaeprbbctemcnltjuwn`** (São Paulo, plano gratuito). Endereço e chave **anon** (pública) estão em `assets/config.js` (site) e `Sources/Data/Settings.swift` (app).
- A conta do Supabase conectada ao assistente **não é** a dona do projeto. Para alterar o banco, gere o SQL e peça ao Caio para rodar em *SQL Editor → New query → Run*. Todos os SQL do projeto podem ser rodados mais de uma vez sem problema.

---

## 2. Regras e preferências do Caio (leia primeiro)

- Fala **português do Brasil**, direto e informal. Quer **ver resultado**, sem explicação longa. Respostas curtas, em PT-BR.
- **Nunca pedir, usar nem repetir senhas** no chat (ele já mandou uma uma vez, e foi recusada).
- **Não fazer `git push` nem publicar versão do app sem ele pedir.** Quando ele pede, fazer na hora.
- Tudo **preciso e real**: modelos, cores e capacidades só de fonte oficial (Apple Brasil, The Apple Wiki, DJI). Nunca inventar informação da loja (parcelamento, entrega, prazos de garantia…).
- Visual **premium, cinematográfico, estilo Apple**, na linguagem do sistema: preto fosco + branco + metal. **Detesta "cara de IA"** (gradiente roxo genérico, emojis, ícones cartunescos). **Sem emojis** em textos de divulgação.
- **Celular primeiro** no site: a maioria dos clientes compra pelo celular.
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

- **`vitrine`** (o que o site lê). Mostra só produtos com `publish = true`, não apagados, e vendidos há no máximo 7 dias. **Não expõe** custo, IMEI, cliente nem observações. A promoção só aparece enquanto vale.
- **Regra de ouro do app:** `SyncEngine.productColumns` tem de bater **exatamente** com as colunas do banco. Coluna nova no app só depois de o SQL estar aplicado; senão a sincronização de **todos os Macs** para.
- **Pastas (Storage):**
  - `updates`: versões do app;
  - `produtos`: fotos reais dos aparelhos, enviadas pelo app;
  - `interesses`: fichas `<id do lead>.jpg`. O site só consegue subir a ficha nos 10 minutos depois do pedido.
- **Segurança do site:**
  - A chave pública só lê a `vitrine` e só escreve pelas funções `site_track` e `site_lead`, que validam tamanho, formato e limite de 5 pedidos por telefone por hora.
  - Ler `leads` e `site_events` exige login, que só os Macs da loja têm.

---

## 4. O site (este repositório)

### Estrutura
```
index.html            landing + catálogo (data-page="home")
produto.html          página do produto (?c=<código>) (data-page="product")
assets/style.css      todo o visual
assets/app.js         catálogo, produto, promoções, selos, métricas (sem framework)
assets/interesse.js   "Tenho interesse": formulário, ficha em canvas, envio (carrega só no 1º toque)
assets/config.js      Supabase (URL + chave pública), WhatsApp, Instagrams, endereço do site
api/ficha.js          função da Vercel: /i/<código>/<id> → página com og:image = ficha (prévia no WhatsApp) → produto
vercel.json           cleanUrls, cache das imagens, rota /i/...
img/modelos/<modelo>/<cor>.webp   capa oficial padronizada de cada modelo/cor (293 combinações)
img/pedra.webp, img/pedra-m.webp  fundo de caverna (tools/textura/pedra.swift)
img/logo.svg, img/hero-*.webp, img/icon.png, img/placeholder.png
supabase/             cópias dos SQL do site
tools/fotos-oficiais/ busca e estilização das capas oficiais
tools/textura/        gerador da textura de pedra
```

### Publicar
- **Vercel**: projeto `imprts` (conta do Caio, já logada neste Mac). Domínio **importsbrasil.com** ligado pelo Caio. O `www.` ainda não responde; se ele quiser, adicionar `www.importsbrasil.com` no painel da Vercel.
- Fluxo:
  1. Editar em `~/Documents/IMPRTS/site`.
  2. Copiar para a cópia git (`rsync -a --exclude .git --exclude img/modelos …`).
  3. Commit e push (só quando o Caio pedir).
  4. `npx vercel deploy --prod --yes --name imprts` na raiz.
- **Cache:** os `<link>`/`<script>` usam `?v=<timestamp>`. Ao mudar CSS ou JS, troque o número com `sed -E "s/(assets\/(app|config)\.js|assets\/style\.css)\?v=[0-9]+/\1?v=$(date +%s)/g" index.html produto.html`. As capas usam `?v=COVERS_V` (em `app.js`); aumente-o ao regerar capas.
- **Título da janela:** "Imports Brasil". Na página de produto fica "<nome do aparelho> · Imports Brasil".

### Funcionalidades
- **Landing cinematográfica:**
  - logo cromado, a frase "Seu próximo iPhone, com procedência.";
  - aparelhos oficiais flutuando e parallax;
  - contador de aparelhos em estoque;
  - selos no fim da página.
- **Catálogo:**
  - filtros (Todos, iPhone, MacBook, Outros), busca e ordenação (Mais novos, Menor e Maior preço, Bateria);
  - atualiza sozinho a cada 60 s;
  - **produto em promoção vem sempre primeiro**;
  - selo "Novo" (menos de 7 dias) e "VENDIDO" (até 7 dias);
  - barra de bateria colorida.
- **Promoção:**
  - cartão com borda dourada e etiqueta "PROMOÇÃO";
  - preço antigo riscado, preço novo em dourado com "-X%";
  - contagem regressiva "Termina em…"; ao acabar, a página recarrega.
- **Página do produto:**
  - galeria: capa oficial + até 4 fotos reais;
  - preço, selos (IMPRTS Assistance, Bateria certificada, Peças verificadas), descrição;
  - ficha técnica e peças trocadas ou com defeito;
  - barra fixa embaixo com **"Tenho interesse"**.
- **Tenho interesse** (`assets/interesse.js`):
  1. **Nome completo** e **telefone** são obrigatórios, **Gmail** é opcional. Os dados ficam lembrados no navegador.
  2. Prévia da **ficha** (1080×1350):
     - fundo de pedra e logo metálico;
     - foto do aparelho, preço ou promoção;
     - condição, armazenamento, bateria colorida e peças;
     - selo IMPRTS Assistance, dados do cliente e data.
  3. **Confirmar e enviar**:
     - a `rpc site_lead` grava o interessado;
     - a ficha sobe para `interesses/<id>.jpg`;
     - o WhatsApp da loja abre com o relatório completo em texto e o link `https://importsbrasil.com/i/<código>/<id>`, cuja prévia mostra a ficha.
  4. Se o banco falhar, o WhatsApp abre mesmo assim, sem o link.
- **Limite do WhatsApp:** não existe como o site anexar uma imagem numa mensagem para um número específico. Por isso a ficha vai como link com prévia.
- **Métricas** (`app.js`, bloco "métricas"):
  - o visitante é um id aleatório guardado no `localStorage`; a sessão fica no `sessionStorage`;
  - eventos: `visita` (com origem: instagram, facebook, google, whatsapp, direto ou `utm_source`), `produto` (abriu), `clique` (no catálogo) e `tempo` (segundos com a página visível);
  - os eventos vão em lote para `site_track`, em texto puro; ao sair da página, vão por `sendBeacon` com `?apikey=`.
- **Rodapé:** WhatsApp, os dois Instagrams, "© Imports Brasil. Todos os direitos reservados." e a assinatura **CRdevs** em branco ("CR" bem grosso), que leva a `instagram.com/caio.riguess`.

### Design do site
- **Mesma linguagem do sistema.** Paleta em `:root`:
  - fundo `#000`, painéis `#0b0b0d`;
  - texto `#f4f4f5`, secundário `#9c9ca3`, apagado `#5e5e65`;
  - verde `#34c77b`, âmbar `#f2b84b`/dourado `#ffc35a` (promoção), vermelho `#ff4d4f`.
- **Fonte:** system-ui (SF Pro nos aparelhos Apple).
- **Logo = o MESMO do sistema**, em vetores exportados do app (`IMPRTS --export-wordmark`, build de desenvolvimento) e embutidos como SVG. Não trocar por fonte da web nem esticar a maçã.
  - No hero ele é **cromado**: gradiente, filtro `bevel` e brilho recortado nas letras.
- **Fundo de caverna:** pedras cinza-escuras, muito escuro, pouquíssima luz só no centro, escurecendo ao descer.
- **NUNCA** colocar camada sobre o quadro inteiro (`mix-blend-mode`, `-webkit-box-reflect`, `filter: drop-shadow` nas imagens do hero): no Chrome isso revela uma caixa retangular, e o Caio odiou.
- URLs dentro de variáveis CSS resolvem a partir de `assets/`; por isso a máscara do reflexo fica inline no HTML.
- **Selos:** horizontais e simples (emblema metálico + título + uma linha). No celular, 2 por linha.
  - **IMPRTS Assistance** = 3 meses de assistência **sem cobrar mão de obra** em todo celular comprado.
  - Não criar selos novos sem o Caio dizer quais a loja tem.
- **Celular:** grade de 2 colunas, nada dependendo de hover. O formulário abre como folha de baixo; no computador, como janela central.

### Capas oficiais (`tools/fotos-oficiais/`)
- **Busca:** `buscar.py` (iPhones) e `buscar_macs.py` (Macs) testam os nomes do banco de imagens da Apple Store e gravam em `encontradas.json`.
- **Estilização:** `estilizar.swift` tira o fundo com preenchimento a partir das bordas (**não usar o Vision**, ele come aparelho claro), centraliza e põe sombra.
- **Geração:** `gerar.sh` gera WebP de 800 px. **Não usar PNG quantizado**, porque cria faixas.
- **Drones:** fotos oficiais da DJI.
- **Sem foto oficial** (MacBook 12" 2015–17, Air 2015): usa o render 3D do app (`--render-covers`).
- **Modelo novo:**
  1. Exportar o json.
  2. Rodar a busca e o `gerar.sh`.
  3. Conferir as imagens.
  4. Aumentar `COVERS_V`.

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

- O `SitePhotos.siteURL` do app ainda aponta para `https://imprts.vercel.app`, que continua funcionando. Pode virar `https://importsbrasil.com` na próxima versão.
- `www.importsbrasil.com` não está configurado.
- `assets/config.js`: `endereco` e `cidade` estão vazios. Preencher quando o Caio passar.
- Outros selos de certificação da loja: perguntar quais.
- Tela Clientes: falta notificação em tempo real de novo interessado (ideia).
- Ideias para o site: página por categoria, prévia (Open Graph) por produto, PWA, filtro por faixa de preço, comparação entre aparelhos.
- Limpeza: `site_events` cresce sem parar. Se ficar grande, apagar eventos com mais de 180 dias.
