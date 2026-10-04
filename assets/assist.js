/* IMPRTS Assistência — tema claro/escuro e o montador de orçamento
   (busca do iPhone com foto → problemas → detalhes → relatório no WhatsApp da IMPRTS Assistência). */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ——— tema: segue o celular; o botão troca e o site lembra ——— */
  const paintBar = () => $('meta[name="theme-color"]')?.setAttribute("content", root.dataset.theme === "light" ? "#ffffff" : "#000000");
  paintBar();
  $$("[data-theme-btn]").forEach(b => b.addEventListener("click", () => {
    const t = root.dataset.theme === "dark" ? "light" : "dark";
    const swap = () => { root.dataset.theme = t; paintBar(); };
    if (document.startViewTransition && !calm) document.startViewTransition(swap).ready.catch(() => {});
    else swap();
    try { localStorage.setItem("imprts.tema", t); } catch {}
  }));

  /* ——— cores: nome em português e a amostra (só para a bolinha) ——— */
  const WORD = { red: "(PRODUCT)RED", titanio: "titânio", salvia: "sálvia", cosmico: "cósmico", pacifico: "pacífico", bordo: "bordô", ceu: "céu", nevoa: "névoa", palido: "pálido" };
  const colorName = id => { const t = id.split("-").map(w => WORD[w] || w).join(" "); return t.charAt(0).toUpperCase() + t.slice(1); };
  const SWATCH = { dourado: "#e3c9a0", prateado: "#e3e4e5", "cinza-espacial": "#5f6064", red: "#c8102e", preto: "#232323", branco: "#f2f1ed", azul: "#4a78a8",
    amarelo: "#f3d466", coral: "#f2735e", roxo: "#b9a6d8", verde: "#a8d5ba", "verde-meia-noite": "#4e5851", grafite: "#54524f", "azul-pacifico": "#2f4d5c",
    estelar: "#f0e9df", "meia-noite": "#2b2f36", rosa: "#f6d0cc", "azul-sierra": "#9bb5ce", "verde-alpino": "#576856", "roxo-profundo": "#5a4e62",
    "preto-espacial": "#403e3d", "titanio-natural": "#bab4a9", "titanio-azul": "#3f4655", "titanio-branco": "#e5e3dd", "titanio-preto": "#3c3c3d",
    "titanio-deserto": "#c5a98c", ultramarino: "#8293e8", "verde-acinzentado": "#b0d3cf", "azul-ceu": "#c9dbe8", "dourado-claro": "#f0e3c4",
    "branco-nuvem": "#f5f5f2", lavanda: "#d7cde6", salvia: "#c5cfb0", "azul-nevoa": "#b9c8d9", "laranja-cosmico": "#e8762c", "azul-profundo": "#2e3a55",
    glacial: "#dfe7ec", bordo: "#6d2232", "rosa-palido": "#f4dcd8", "ceu-noturno": "#2a3348", "branco-estrela": "#f4f3ee" };

  /* ——— 1. busca do iPhone ——— */
  const UNKNOWN = { id: "?", name: "Não sei o modelo", year: "a loja ajuda a descobrir", img: "", colors: [] };
  const MODELS = [...(window.IMPRTS_IPHONES || []), UNKNOWN];
  const norm = s => String(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/iphone/g, "").replace(/\s+/g, " ").trim();
  const find = $("#find"), sug = $("#sug"), clear = $("#find-x"), picked = $("#picked");
  let model = null, color = null, active = -1, shown = [];

  function search(q) {
    const n = norm(q);
    if (!n) return MODELS;
    const words = n.split(" ");
    const hit = MODELS.filter(m => m === UNKNOWN || words.every(w => norm(m.name).includes(w)));
    // quem começa com o que foi digitado vem primeiro ("15" → 15, 15 Plus, 15 Pro…, depois o resto)
    return hit.sort((a, b) => ((a === UNKNOWN) - (b === UNKNOWN)) || (norm(b.name).startsWith(n) - norm(a.name).startsWith(n)));
  }
  function list(q) {
    shown = search(q); active = -1;
    sug.innerHTML = shown.map((m, i) => `<li role="option" id="sg${i}" data-i="${i}">
        <span class="th">${m.img ? `<img src="${esc(m.img)}?v=3" alt="" loading="lazy" decoding="async">` : "?"}</span>
        <span class="tx"><b>${esc(m.name)}</b><small>${esc(m.year)}</small></span></li>`).join("");
    sug.hidden = false; find.setAttribute("aria-expanded", "true");
    $$("li", sug).forEach(li => li.addEventListener("pointerdown", e => { e.preventDefault(); pick(shown[+li.dataset.i]); }));
  }
  function close() { sug.hidden = true; find.setAttribute("aria-expanded", "false"); find.removeAttribute("aria-activedescendant"); }
  function move(d) {
    if (sug.hidden) list(find.value);
    active = (active + d + shown.length) % shown.length;
    $$("li", sug).forEach((li, i) => li.classList.toggle("on", i === active));
    const li = $(`#sg${active}`); li?.scrollIntoView({ block: "nearest" }); find.setAttribute("aria-activedescendant", li ? li.id : "");
  }
  find.addEventListener("focus", () => list(find.value));
  find.addEventListener("input", () => { clear.hidden = !find.value; list(find.value); });
  find.addEventListener("blur", () => setTimeout(close, 120));
  find.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); const m = shown[active >= 0 ? active : 0]; if (m) pick(m); }
    else if (e.key === "Escape") close();
  });
  clear.addEventListener("click", () => { find.value = ""; clear.hidden = true; find.focus(); });

  // escolheu: a foto oficial entra animada, com as cores daquele modelo
  function pick(m) {
    model = m; color = m.colors[0] || null;
    find.value = m === UNKNOWN ? "" : m.name; clear.hidden = !find.value; close(); find.blur();
    $("#pk-name").textContent = m.name;
    $("#pk-year").textContent = m.year;
    $("#pk-colors").innerHTML = m.colors.map(c => `<button role="radio" aria-checked="false" data-c="${c}" aria-label="${esc(colorName(c))}" style="--sw:${SWATCH[c] || "#999"}"></button>`).join("");
    $$("#pk-colors button").forEach(b => b.addEventListener("click", () => { color = b.dataset.c; paint(); sync(); }));
    picked.classList.toggle("unknown", m === UNKNOWN);
    picked.hidden = false;
    paint();
    sync();
    if (!calm) picked.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function paint() {
    const img = $("#pk-img");
    $$("#pk-colors button").forEach(b => { const on = b.dataset.c === color; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    $("#pk-cname").textContent = color ? colorName(color) : "";
    if (model === UNKNOWN) { img.removeAttribute("src"); img.classList.remove("in"); return; }
    img.classList.remove("in"); void img.offsetWidth;            // recomeça a animação de entrada da foto
    img.onload = () => img.classList.add("in");
    img.src = `img/modelos/${model.id}/${color}.webp?v=3`;
    if (img.complete) img.classList.add("in");
  }
  $("#pk-change").addEventListener("click", () => { find.value = ""; clear.hidden = true; find.focus(); });

  /* ——— 2. o que está acontecendo? (o cliente marca; não é lista de serviço nem de preço) ——— */
  const I = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const phone = '<rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/>';
  const PROBS = [
    ["Tela quebrada", I(phone + '<path d="m9.5 6 2.5 4-2 2 3 5"/>')],
    ["Tela sem imagem ou toque", I(phone + '<path d="M9 9l6 6M15 9l-6 6"/>')],
    ["Bateria", I('<rect x="2.5" y="7.5" width="17" height="9" rx="2.5"/><path d="M21.5 10.5v3"/><path d="M5.5 10.5v3"/>')],
    ["Não carrega", I('<path d="M13 2.5 6 13.5h5.5L10.5 21.5l7-11h-5.5z"/>')],
    ["Câmera", I('<path d="M4 8h3l1.6-2.5h6.8L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8Z"/><circle cx="12" cy="13" r="3.4"/>')],
    ["Face ID", I('<path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"/><path d="M9 9.5v1M15 9.5v1M12 9.5V13h-1M9.5 16a3.5 3.5 0 0 0 5 0"/>')],
    ["Som ou microfone", I('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>')],
    ["Tampa traseira", I(phone + '<rect x="8.5" y="4.5" width="4" height="4" rx="1.2"/>')],
    ["Molhou", I('<path d="M12 3s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.4 12 3 12 3Z"/>')],
    ["Não liga", I('<path d="M12 3v8"/><path d="M6.6 6.6a7.5 7.5 0 1 0 10.8 0"/>')],
    ["Outro", I('<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>')],
  ];
  $("#probs").innerHTML = PROBS.map(([t, ic]) => `<button class="pb" aria-pressed="false" data-p="${esc(t)}">${ic}${esc(t)}</button>`).join("");
  const issues = new Set();
  $$("#probs .pb").forEach(b => b.addEventListener("click", () => {
    const on = !issues.has(b.dataset.p);
    on ? issues.add(b.dataset.p) : issues.delete(b.dataset.p);
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
    sync();
  }));

  /* ——— barra de resumo + envio ——— */
  const bar = $("#bar"), go = $("#bar-go");
  let inView = false;
  const label = () => model ? (model === UNKNOWN ? "iPhone (não sei o modelo)" : model.name + (color ? ` · ${colorName(color)}` : "")) : "";
  const showBar = () => bar.classList.toggle("show", inView || (!!model && scrollY > innerHeight * .6));
  function sync() {
    $("#bar-m").textContent = label() || "Escolha o seu iPhone";
    $("#bar-p").textContent = issues.size ? [...issues].join(" · ") : model ? "Agora marque o que está acontecendo" : "Depois marque o que está acontecendo";
    go.disabled = !model;
    $("#s1").classList.toggle("done", !!model);
    $("#s2").classList.toggle("done", issues.size > 0);
    showBar();
  }
  new IntersectionObserver(es => { inView = es[0].isIntersecting; showBar(); }, { rootMargin: "0px 0px -35% 0px" }).observe($("#orcamento"));
  addEventListener("scroll", showBar, { passive: true });
  sync();

  go.addEventListener("click", () => {
    if (!model) return;
    const img = model === UNKNOWN ? "" : `img/modelos/${model.id}/${color}.webp?v=3`;
    window.IMPRTS_UI.form(go, f => f.quote({ model: label(), img, issues: [...issues], details: $("#det").value.trim() }));
  });
})();
