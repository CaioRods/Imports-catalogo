/* IMPRTS Assistência — tema claro/escuro e o montador de orçamento (iPhone → problema → detalhes → WhatsApp). */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ——— tema: segue o celular; o botão troca e o site lembra ——— */
  const paintBar = () => $('meta[name="theme-color"]')?.setAttribute("content", root.dataset.theme === "light" ? "#ffffff" : "#000000");
  paintBar();
  $$("[data-theme-btn]").forEach(b => b.addEventListener("click", () => {
    const t = root.dataset.theme === "dark" ? "light" : "dark";
    const swap = () => { root.dataset.theme = t; paintBar(); };
    // troca com um fade suave da tela inteira quando o navegador permite
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(swap).ready.catch(() => {});
    else swap();
    try { localStorage.setItem("imprts.tema", t); } catch {}
  }));

  /* ——— 1. qual é o seu iPhone? ——— */
  const check = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2.5 6.2 2.3 2.3 4.7-5"/></svg>';
  const models = window.IMPRTS_IPHONES || [];
  $("#models").innerHTML = models.map(m => `
    <button class="m" role="option" aria-selected="false" data-name="${esc(m.name)}">
      <span class="ok">${check}</span><span class="pic"><img src="${esc(m.img)}?v=3" alt="" loading="lazy" decoding="async"></span>
      <b>${esc(m.name)}</b><small>${m.year}</small></button>`).join("")
    + `<button class="m unknown" role="option" aria-selected="false" data-name="iPhone (não sei o modelo)"><span class="ok">${check}</span><span class="pic">?</span><b>Não sei o modelo</b><small>a loja ajuda</small></button>`;

  /* ——— 2. o que está acontecendo? (o cliente marca; não é lista de preço) ——— */
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

  /* ——— estado + barra de resumo ——— */
  let model = null;
  const issues = new Set();
  const bar = $("#bar"), go = $("#bar-go");
  // a barra aparece enquanto o montador está na tela (ou quando já tem iPhone escolhido)
  let inView = false;
  const showBar = () => bar.classList.toggle("show", inView || (!!model && scrollY > innerHeight * .6));
  function sync() {
    $("#bar-m").textContent = model || "Escolha o seu iPhone";
    $("#bar-p").textContent = issues.size ? [...issues].join(" · ") : model ? "Agora marque o que está acontecendo" : "Depois marque o que está acontecendo";
    go.disabled = !model;
    $("#s1").classList.toggle("done", !!model);
    $("#s2").classList.toggle("done", issues.size > 0);
    showBar();
  }
  $$("#models .m").forEach(b => b.addEventListener("click", () => {
    const on = !b.classList.contains("on");
    $$("#models .m").forEach(x => { x.classList.remove("on"); x.setAttribute("aria-selected", "false"); });
    b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on));
    model = on ? b.dataset.name : null;
    sync();
  }));
  $$("#probs .pb").forEach(b => b.addEventListener("click", () => {
    const on = !issues.has(b.dataset.p);
    on ? issues.add(b.dataset.p) : issues.delete(b.dataset.p);
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
    sync();
  }));
  sync();

  new IntersectionObserver(es => { inView = es[0].isIntersecting; showBar(); }, { rootMargin: "0px 0px -35% 0px" }).observe($("#orcamento"));
  addEventListener("scroll", showBar, { passive: true });

  go.addEventListener("click", () => {
    if (!model) return;
    const details = $("#det").value.trim();
    window.IMPRTS_UI.form(go, f => f.quote({ model, issues: [...issues], details }));
  });
})();
