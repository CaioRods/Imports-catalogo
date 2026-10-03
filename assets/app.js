/* IMPRTS — catálogo ligado ao sistema (vitrine pública do Supabase). Sem dependências. */
(() => {
  const C = window.IMPRTS;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const CONDITION = { novo: "Novo lacrado", seminovo: "Seminovo", vitrine: "Vitrine", usado: "Usado", pecas: "Para peças" };
  const CATEGORY = { iphone: "iPhone", macbook: "MacBook", ipad: "iPad", watch: "Apple Watch", airpods: "AirPods", android: "Celular", drone: "Drone", acessorio: "Acessório", outro: "Outro" };
  const PARTS = {
    bateria: "Bateria", tela: "Tela", faceid: "Face ID", touchid: "Touch ID", camTraseira: "Câmera traseira", camFrontal: "Câmera frontal",
    altoFalante: "Alto-falante", microfone: "Microfone", conector: "Conector", vidroTraseiro: "Tampa traseira", botoes: "Botões",
    vibracall: "Vibracall", sinal: "Sinal", wifi: "Wi-Fi/BT", nfc: "NFC", placa: "Placa", carcaca: "Carcaça", teclado: "Teclado",
    trackpad: "Trackpad", dobradica: "Dobradiça", helices: "Hélices", motor: "Motor", gimbal: "Câmera/gimbal",
  };

  const money = v => v == null ? "Consulte" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const code = n => n == null ? "" : String(n).padStart(3, "0");
  const storage = (b, p) => `${C.supabaseURL}/storage/v1/object/public/${b}/${p}`;
  const COVERS_V = 3; // trocar quando as capas forem regeradas (fura o cache dos celulares)
  const official = p => p.model_id && p.color_id ? `img/modelos/${p.model_id}/${p.color_id}.webp?v=${COVERS_V}` : "";

  /** Imagens do produto: capa primeiro (oficial ou a foto escolhida), depois as fotos reais. */
  function images(p) {
    const photos = Array.isArray(p.photos) ? p.photos : [];
    const off = official(p);
    const list = [];
    if (p.cover && photos.includes(p.cover)) list.push({ src: storage("produtos", p.cover), photo: true });
    if (off) list.push({ src: off, photo: false });
    for (const f of photos) if (f !== p.cover) list.push({ src: storage("produtos", f), photo: true });
    if (!list.length) list.push({ src: "img/placeholder.png", photo: false });
    return list;
  }

  async function vitrine(query = "") {
    const url = `${C.supabaseURL}/rest/v1/vitrine?select=*${query}`;
    const r = await fetch(url, { headers: { apikey: C.supabaseKey, Authorization: `Bearer ${C.supabaseKey}` } });
    if (!r.ok) throw new Error("vitrine " + r.status);
    return r.json();
  }

  function wa(text) {
    if (!C.whatsapp) return null;
    return `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}`;
  }
  function waIcon() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a17 17 0 0 1-1.7-.6 13.3 13.3 0 0 1-5.1-4.5c-.4-.5-1.2-1.6-1.2-3.1s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.8-.1 1.4Z"/></svg>';
  }


  /* ——— selos IMPRTS: emblema metálico + texto, na horizontal ——— */
  let sealN = 0;
  const SEALS = {
    assist: { gold: true, title: "IMPRTS Assistance", text: "3 meses sem mão de obra",
      icon: '<path d="M27 15.5a5.5 5.5 0 0 0-7.3 6.9L13 29.1l2.9 2.9 6.7-6.7a5.5 5.5 0 0 0 6.9-7.3l-3.2 3.2-2.7-.7-.7-2.7z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>' },
    bateria: { title: "Bateria certificada", text: "Saúde medida no cabo",
      icon: '<rect x="12" y="17" width="19" height="10" rx="2.5" fill="none" stroke="#fff" stroke-width="1.8"/><rect x="31.5" y="20" width="2" height="4" rx="1" fill="#fff"/><rect x="14.5" y="19.5" width="11" height="5" rx="1" fill="#34c77b"/>' },
    pecas: { title: "Peças verificadas", text: "Tela, câmeras e Face ID",
      icon: '<path d="M22 11.5l8 3v6c0 5.2-3.4 8.6-8 10.3-4.6-1.7-8-5.1-8-10.3v-6z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M18.5 21.2l2.5 2.5 4.8-5" fill="none" stroke="#34c77b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' },
    estoque: { title: "Estoque real", text: "Atualizado na hora",
      icon: '<circle cx="22" cy="22" r="4" fill="#34c77b"/><circle cx="22" cy="22" r="7" fill="none" stroke="#34c77b" stroke-width="1.6"><animate attributeName="r" values="5;11" dur="2s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values=".8;0" dur="2s" repeatCount="indefinite"/></circle>' },
  };
  function emblem(kind) {
    const k = SEALS[kind], n = ++sealN;
    const stops = k.gold ? [[0, "#fff4cf"], [.45, "#c9a55a"], [.55, "#7d5e24"], [.75, "#f1d58f"], [1, "#a07c35"]]
                         : [[0, "#ffffff"], [.45, "#b9bbbf"], [.55, "#5f6267"], [.75, "#e7e8ea"], [1, "#86898e"]];
    const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, r = i % 2 ? 19.6 : 21.4; pts.push(`${(22 + r * Math.cos(a)).toFixed(2)},${(22 + r * Math.sin(a)).toFixed(2)}`); }
    return `<svg class="emblem${k.gold ? " gold" : ""}" viewBox="0 0 44 44" aria-hidden="true"><defs>
      <linearGradient id="em${n}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>
      <radialGradient id="ed${n}" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#2a2b2f"/><stop offset="1" stop-color="#0a0a0c"/></radialGradient></defs>
      <polygon points="${pts.join(" ")}" fill="url(#em${n})"/><circle cx="22" cy="22" r="17.2" fill="url(#ed${n})"/>
      <circle cx="22" cy="22" r="15.6" fill="none" stroke="url(#em${n})" stroke-width=".7" opacity=".8"/>${k.icon}</svg>`;
  }
  function sealBadge(kind) {
    const k = SEALS[kind];
    return `<div class="badge${k.gold ? " gold" : ""}">${emblem(kind)}<div class="bt"><b>${k.title}</b><span>${k.text}</span></div></div>`;
  }
  function renderSeals() {
    $$("[data-seal]").forEach(el => { if (SEALS[el.dataset.seal]) el.outerHTML = sealBadge(el.dataset.seal); });
  }

  /* ——— efeitos ——— */
  function revealOnScroll() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    $$(".reveal").forEach(el => io.observe(el));
  }
  function navShadow() {
    const nav = $(".nav");
    const f = () => nav && nav.classList.toggle("scrolled", scrollY > 10);
    addEventListener("scroll", f, { passive: true }); f();
  }

  function countUp(el, to) {
    if (!el) return;
    const t0 = performance.now(), d = 900;
    const step = t => { const k = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ——— página inicial ——— */
  function card(p) {
    const imgs = images(p);
    const first = imgs[0];
    const days = (Date.now() - new Date(p.created_at)) / 864e5;
    const el = document.createElement("a");
    el.className = "card reveal" + (p.vendido ? " sold" : "");
    el.href = `produto.html?c=${p.code}`;
    el.innerHTML = `
      <div class="pic"><img loading="lazy" decoding="async" class="${first.photo ? "photo" : ""}" src="${esc(first.src)}" alt="${esc(p.name)}"></div>
      <span class="code">${code(p.code)}</span>
      ${!p.vendido && days < 7 ? '<span class="badge-new">Novo</span>' : ""}
      ${p.vendido ? '<span class="sold-tag">VENDIDO</span>' : ""}
      <div class="info">
        <div class="name">${esc(p.name)}</div>
        <div class="tags">${p.storage ? `<span class="tag">${esc(p.storage)}</span>` : ""}<span class="tag">${esc(CONDITION[p.condition] || "")}</span></div>
        ${p.battery_health ? `<div class="batt ${p.battery_health < 80 ? "low" : p.battery_health < 88 ? "mid" : ""}"><b><i style="width:${Math.max(8, Math.min(100, p.battery_health)) * .17}px"></i></b>Bateria ${p.battery_health}%</div>` : ""}
        <div class="price">${money(p.price)}</div>
      </div>`;
    el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px"); });
    const img = $("img", el);
    img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = 1; img.className = ""; img.src = "img/placeholder.png"; } };
    return el;
  }

  async function home() {
    navShadow();
    revealOnScroll();
    // parallax do hero
    const stage = $(".stage");
    if (stage && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      addEventListener("scroll", () => {
        const y = Math.min(scrollY, innerHeight);
        stage.style.transform = `translateY(${y * .18}px) scale(${1 + y / innerHeight * .08})`;
        stage.style.opacity = String(1 - y / innerHeight * .9);
      }, { passive: true });
    }
    const grid = $("#grid");
    grid.innerHTML = '<div class="skeleton"></div>'.repeat(8);
    let all = [];
    try { all = await vitrine("&order=code.desc"); } catch (e) { grid.innerHTML = '<p class="empty">Não foi possível carregar o catálogo agora. Tente de novo em instantes.</p>'; return; }
    countUp($("#count"), all.filter(p => !p.vendido).length);

    let cat = "todos", q = "", sort = "novos";
    const render = () => {
      let list = all.filter(p => cat === "todos" || (cat === "outros" ? !["iphone", "macbook"].includes(p.category) : p.category === cat));
      if (q) {
        const n = q.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
        list = list.filter(p => `${p.name} ${code(p.code)} ${p.storage || ""}`.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(n));
      }
      const sorters = {
        novos: (a, b) => (a.vendido - b.vendido) || (b.code - a.code),
        menor: (a, b) => (a.vendido - b.vendido) || ((a.price ?? 1e12) - (b.price ?? 1e12)),
        maior: (a, b) => (a.vendido - b.vendido) || ((b.price ?? 0) - (a.price ?? 0)),
        bateria: (a, b) => (a.vendido - b.vendido) || ((b.battery_health ?? 0) - (a.battery_health ?? 0)),
      };
      list.sort(sorters[sort]);
      grid.innerHTML = "";
      if (!list.length) { grid.innerHTML = '<p class="empty">Nada encontrado com esse filtro.</p>'; return; }
      list.forEach((p, i) => { const c = card(p); c.style.transitionDelay = `${Math.min(i % 8, 7) * 60}ms`; grid.appendChild(c); });
      revealOnScroll();
    };
    $$(".chip").forEach(b => b.addEventListener("click", () => { $$(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on"); cat = b.dataset.cat; render(); }));
    $("#q").addEventListener("input", e => { q = e.target.value.trim(); render(); });
    $("#sort").addEventListener("change", e => { sort = e.target.value; render(); });
    render();
    // atualiza sozinho (venda feita na loja some/aparece "Vendido")
    setInterval(async () => { try { all = await vitrine("&order=code.desc"); $("#count").textContent = all.filter(p => !p.vendido).length; render(); } catch {} }, 60000);
  }

  /* ——— página do produto ——— */
  async function product() {
    navShadow();
    const c = new URLSearchParams(location.search).get("c");
    const root = $("#product");
    let p;
    try { [p] = await vitrine(`&code=eq.${encodeURIComponent(c)}`); } catch {}
    if (!p) { root.innerHTML = '<p class="empty">Produto não encontrado. <a href="./#catalogo" style="text-decoration:underline">Ver o catálogo</a></p>'; return; }
    document.title = `${p.name} · IMPRTS`;
    const imgs = images(p);
    const parts = Object.entries(p.parts || {});
    const specs = [
      ["Condição", CONDITION[p.condition]],
      ["Armazenamento", p.storage],
      ["Chip", p.chip], ["Memória", p.ram],
      ["Saúde da bateria", p.battery_health ? `<span class="batt ${p.battery_health < 80 ? "low" : p.battery_health < 88 ? "mid" : ""}" style="margin:0;justify-content:flex-end"><b><i style="width:${Math.max(8, Math.min(100, p.battery_health)) * .17}px"></i></b>${p.battery_health}%</span>` : null],
      ["Categoria", CATEGORY[p.category]],
      ["Código", code(p.code)],
    ].filter(([, v]) => v);
    const msg = `Olá! Tenho interesse no ${p.name} (código ${code(p.code)}) que vi no site.`;
    const link = wa(msg);
    root.innerHTML = `
      <a class="back" href="./#catalogo">‹ Catálogo</a>
      <div class="product-grid">
        <div class="gallery">
          <div class="slides">${imgs.map(i => `<div class="slide"><img class="${i.photo ? "photo" : ""}" src="${esc(i.src)}" alt="${esc(p.name)}"></div>`).join("")}</div>
          <div class="dots">${imgs.length > 1 ? imgs.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("") : ""}</div>
          <div class="thumbs">${imgs.length > 1 ? imgs.map((i, k) => `<button class="${k ? "" : "on"}"><img class="${i.photo ? "" : "official"}" src="${esc(i.src)}" alt=""></button>`).join("") : ""}</div>
        </div>
        <div class="pinfo">
          ${p.vendido ? '<span class="status" style="color:var(--dim)"><i></i>Vendido</span>' : '<span class="status"><i></i>Disponível na loja</span>'}
          <h1>${esc(p.name)}</h1>
          <div class="price">${money(p.price)}</div>
          <div class="buybar">
            <div class="p">${money(p.price)}</div>
            ${link && !p.vendido ? `<a class="btn wa" href="${link}" target="_blank" rel="noopener">${waIcon()} Comprar pelo WhatsApp</a>` : ""}
          </div>
          <div class="badges pbadges">${["iphone", "android"].includes(p.category) ? '<i data-seal="assist"></i>' : ""}${p.battery_health ? '<i data-seal="bateria"></i>' : ""}<i data-seal="pecas"></i></div>
          ${p.description ? `<h3 class="kicker" style="margin-top:34px">Sobre este aparelho</h3><div class="desc">${esc(p.description)}</div>` : ""}
          <dl class="specs">${specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${k === "Saúde da bateria" ? v : esc(v)}</dd></div>`).join("")}</dl>
          <h3 class="kicker">Peças</h3>
          ${parts.length ? `<div class="parts">${parts.map(([k, v]) => `<span class="${v === "trocada" ? "t" : "d"}">${esc(PARTS[k] || k)} ${v === "trocada" ? "trocada" : "com defeito"}</span>`).join("")}</div>`
                        : '<p class="sub" style="font-size:15px">Todas as peças originais, verificadas na loja.</p>'}
        </div>
      </div>`;
    renderSeals();
    // galeria: pontos e miniaturas acompanham o deslize
    const slides = $(".slides", root);
    const dots = $$(".dots i", root), thumbs = $$(".thumbs button", root);
    slides.addEventListener("scroll", () => {
      const i = Math.round(slides.scrollLeft / slides.clientWidth);
      dots.forEach((d, k) => d.classList.toggle("on", k === i));
      thumbs.forEach((t, k) => t.classList.toggle("on", k === i));
    }, { passive: true });
    thumbs.forEach((t, k) => t.addEventListener("click", () => slides.scrollTo({ left: k * slides.clientWidth, behavior: "smooth" })));
    $$("img", root).forEach(img => img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = 1; img.src = "img/placeholder.png"; } });
  }

  function contacts() {
    $$("[data-wa]").forEach(a => { const l = wa("Olá! Vim pelo site da IMPRTS."); if (l) a.href = l; else a.style.display = "none"; });
    $$("[data-ig]").forEach(a => { if (C.instagram) { a.href = `https://instagram.com/${C.instagram}`; a.textContent = "@" + C.instagram; } else a.style.display = "none"; });
    $$("[data-addr]").forEach(a => { if (C.endereco) a.textContent = C.endereco; else a.style.display = "none"; });
    $$("[data-wa-icon]").forEach(s => s.innerHTML = waIcon());
    $$("[data-year]").forEach(s => s.textContent = new Date().getFullYear());
  }

  document.addEventListener("DOMContentLoaded", () => {
    contacts();
    renderSeals();
    if (document.body.dataset.page === "home") home();
    if (document.body.dataset.page === "product") product();
  });
})();
