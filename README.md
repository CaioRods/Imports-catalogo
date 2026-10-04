# IMPORTS — site da Imports Brasil

Site da IMPORTS (iPhone, Mac e assistência técnica), no ar em **https://importsbrasil.com**:
- **Loja** (`index.html`, `produto.html`): abertura da marca + catálogo ligado em tempo real ao sistema da loja, agrupado por tipo, com "Tenho interesse" pelo WhatsApp.
- **IMPORTS Assistência** (`assistencia.html`, `/assistencia`): só iPhone, design Apple claro/escuro, busca do modelo com foto oficial e pedido de orçamento pelo WhatsApp.

Estático (HTML/CSS/JS puro, sem build). Cada push no `main` publica sozinho na Vercel. Para rodar localmente: `python3 -m http.server 5173`.

**Antes de mexer, leia o [HANDOFF.md](HANDOFF.md)** — explica o sistema, o banco, o design, as ferramentas, as preferências e o que mudou por último.
