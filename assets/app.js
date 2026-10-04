/* IMPORTS — catálogo ligado ao sistema (vitrine pública do Supabase). Sem dependências. */
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
  // Aparelhos que o sistema ainda não tem no catálogo de modelos vêm sem model_id (categoria "outro"):
  // a capa é achada pelo nome. Quando o modelo entrar no catálogo do app, a linha daqui pode sair.
  const BY_NAME = [[/\bph(antom|amton)\s*4\b/i, "dji-phantom-4"]];
  const modelOf = p => p.model_id || (BY_NAME.find(([re]) => re.test(p.name || "")) || [])[1];
  const official = p => modelOf(p) && p.color_id ? `img/modelos/${modelOf(p)}/${p.color_id}.webp?v=${COVERS_V}` : "";
  // grupos do catálogo, nesta ordem (drone cadastrado como "outro" vai para Drones pelo nome)
  const GROUPS = [["iphone", "iPhone"], ["macbook", "MacBook"], ["ipad", "iPad"], ["watch", "Apple Watch"], ["airpods", "AirPods"],
    ["android", "Celulares"], ["drone", "Drones"], ["acessorio", "Acessórios"], ["outro", "Outros"]];
  const groupOf = p => p.category === "outro" && /\b(drone|dji|ph(antom|amton)|mavic|avata)\b/i.test(p.name || "") ? "drone" : (GROUPS.some(([k]) => k === p.category) ? p.category : "outro");

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
    const data = await r.json();
    if (query.startsWith("&order")) { try { sessionStorage.setItem(CACHE, JSON.stringify(data)); } catch {} }
    return data;
  }
  const CACHE = "imprts.vitrine";
  const cached = () => { try { return JSON.parse(sessionStorage.getItem(CACHE)); } catch { return null; } };

  function wa(text) {
    if (!C.whatsapp) return null;
    return `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}`;
  }
  function waIcon() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a17 17 0 0 1-1.7-.6 13.3 13.3 0 0 1-5.1-4.5c-.4-.5-1.2-1.6-1.2-3.1s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.2.1.8-.1 1.4Z"/></svg>';
  }


  /* ——— selos IMPORTS: emblema metálico + texto, na horizontal ——— */
  let sealN = 0;
  const SEALS = {
    assist: { gold: true, title: "IMPORTS Assistance", text: "3 meses sem mão de obra",
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

  /* ——— métricas (o que o painel Clientes do sistema mostra) ——— */
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const store = (s, k) => { try { let v = s.getItem(k); if (!v) s.setItem(k, v = rid()); return v; } catch { return rid(); } };
  const visitor = store(localStorage, "imprts.v"), session = store(sessionStorage, "imprts.s");
  const base = { v: visitor, s: session, d: matchMedia("(pointer: coarse)").matches ? "celular" : "computador" };
  const queue = [];
  const trackURL = `${C.supabaseURL}/rest/v1/rpc/site_track`;
  const track = (k, extra = {}) => { queue.push({ ...base, k, ...extra }); if (queue.length >= 25) flush(); };
  function flush(leaving) {
    if (!queue.length) return;
    const body = JSON.stringify(queue.splice(0, 60));
    if (leaving && navigator.sendBeacon) { navigator.sendBeacon(`${trackURL}?apikey=${C.supabaseKey}`, new Blob([body], { type: "text/plain" })); return; }
    fetch(trackURL, { method: "POST", headers: { apikey: C.supabaseKey, Authorization: `Bearer ${C.supabaseKey}`, "Content-Type": "text/plain" }, body }).catch(() => {});
  }
  setInterval(flush, 15000);
  // tempo com a página visível (para no fundo; conta de novo ao voltar)
  let pageCode = null, shownAt = document.hidden ? null : Date.now();
  function spent() {
    if (shownAt == null) return;
    const t = Math.round((Date.now() - shownAt) / 1000);
    shownAt = null;
    if (t >= 2) track("tempo", { c: pageCode, t });
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { spent(); flush(true); } else shownAt = Date.now(); });
  addEventListener("pagehide", () => { spent(); flush(true); });
  function referrer() {
    const u = new URLSearchParams(location.search).get("utm_source");
    if (u) return u.toLowerCase();
    try {
      const h = new URL(document.referrer).hostname.replace(/^(www|l|m|lm)\./, "");
      if (!h || h === location.hostname) return "";
      return /instagram/.test(h) ? "instagram" : /facebook|fb\./.test(h) ? "facebook" : /google/.test(h) ? "google" : /whatsapp|wa\.me/.test(h) ? "whatsapp" : h;
    } catch { return ""; }
  }
  function visit() {
    try { if (sessionStorage.getItem("imprts.visit")) return; sessionStorage.setItem("imprts.visit", 1); } catch {}
    track("visita", { r: referrer() });
  }

  /* ——— promoção ——— */
  // A vitrine já zera a promoção vencida; a checagem aqui cobre quem deixou a página aberta.
  const now = p => promo(p) ? p.promo_price : p.price; // preço que vale agora
  const promo = p => !!(!p.vendido && p.promocao && p.promo_price != null && (!p.promo_until || new Date(p.promo_until) > Date.now()));
  function left(until) {
    const ms = new Date(until) - Date.now();
    if (ms <= 0) return "Encerrada";
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    const two = n => String(n).padStart(2, "0");
    return d ? `${d}d ${h}h ${two(m)}m` : `${two(h)}:${two(m)}:${two(s)}`;
  }
  function priceHTML(p) {
    if (!promo(p)) return `<div class="price">${money(p.price)}</div>`;
    const off = p.price ? Math.round((1 - p.promo_price / p.price) * 100) : 0;
    return `<div class="price promo">${p.price ? `<s>${money(p.price)}</s>` : ""}<span>${money(p.promo_price)}</span>${off > 0 ? `<em>-${off}%</em>` : ""}</div>`;
  }
  function tickCountdowns() {
    document.querySelectorAll("[data-until]").forEach(el => {
      const t = left(el.dataset.until);
      if (t === "Encerrada" && !el.dataset.done) { el.dataset.done = 1; setTimeout(() => location.reload(), 1500); }
      el.querySelector("b").textContent = t;
    });
  }
  setInterval(tickCountdowns, 1000);

  /* ——— página inicial ——— */
  function card(p, instant) {
    const imgs = images(p);
    const first = imgs[0];
    const days = (Date.now() - new Date(p.created_at)) / 864e5;
    const el = document.createElement("a");
    el.className = "card reveal" + (instant ? " in" : "") + (p.vendido ? " sold" : "") + (promo(p) ? " on-promo" : "");
    el.href = `produto.html?c=${p.code}`;
    el.dataset.code = p.code;
    el.addEventListener("click", () => { track("clique", { c: p.code }); flyFrom(p.code); });
    el.innerHTML = `
      <div class="pic"><img loading="lazy" decoding="async" class="${first.photo ? "photo" : ""}" src="${esc(first.src)}" alt="${esc(p.name)}"></div>
      <span class="code">${code(p.code)}</span>
      ${promo(p) ? '<span class="badge-promo">Promoção</span>' : !p.vendido && days < 7 ? '<span class="badge-new">Novo</span>' : ""}
      ${p.vendido ? '<span class="sold-tag">VENDIDO</span>' : ""}
      <div class="info">
        <div class="name">${esc(p.name)}</div>
        <div class="tags">${p.storage ? `<span class="tag">${esc(p.storage)}</span>` : ""}<span class="tag">${esc(CONDITION[p.condition] || "")}</span></div>
        ${p.battery_health ? `<div class="batt ${p.battery_health <= 65 ? "low" : p.battery_health < 80 ? "mid" : ""}"><b><i style="width:${Math.max(8, Math.min(100, p.battery_health)) * .17}px"></i></b>Bateria ${p.battery_health}%</div>` : ""}
        ${priceHTML(p)}
        ${promo(p) && p.promo_until ? `<div class="countdown" data-until="${esc(p.promo_until)}">Termina em <b>${left(p.promo_until)}</b></div>` : ""}
      </div>`;
    el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(); el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px"); });
    const img = $("img", el);
    img.onerror = () => { if (!img.dataset.fb) { img.dataset.fb = 1; img.className = ""; img.src = "img/placeholder.png"; } };
    return el;
  }

  // parallax do topo (aparelhos descem e somem devagar ao rolar)
  function heroParallax() {
    const stage = $(".stage");
    if (stage && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      addEventListener("scroll", () => {
        const y = Math.min(scrollY, innerHeight);
        stage.style.transform = `translateY(${y * .18}px) scale(${1 + y / innerHeight * .08})`;
        stage.style.opacity = String(1 - y / innerHeight * .9);
      }, { passive: true });
    }
  }

  async function home() {
    navShadow();
    revealOnScroll();
    heroParallax();
    const grid = $("#grid");
    let all = cached();
    let cat = "todos", q = "", sort = "novos";
    const render = instant => {
      let list = all.filter(p => cat === "todos" || (cat === "outros" ? !["iphone", "macbook", "drone"].includes(groupOf(p)) : groupOf(p) === cat));
      if (q) {
        const n = q.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
        list = list.filter(p => `${p.name} ${code(p.code)} ${p.storage || ""}`.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(n));
      }
      const sorters = {
        novos: (a, b) => (a.vendido - b.vendido) || (promo(b) - promo(a)) || (b.code - a.code),
        menor: (a, b) => (a.vendido - b.vendido) || (promo(b) - promo(a)) || ((now(a) ?? 1e12) - (now(b) ?? 1e12)),
        maior: (a, b) => (a.vendido - b.vendido) || (promo(b) - promo(a)) || ((now(b) ?? 0) - (now(a) ?? 0)),
        bateria: (a, b) => (a.vendido - b.vendido) || (promo(b) - promo(a)) || ((b.battery_health ?? 0) - (a.battery_health ?? 0)),
      };
      list.sort(sorters[sort]);
      grid.innerHTML = "";
      if (!list.length) { grid.innerHTML = '<p class="empty">Nada encontrado com esse filtro.</p>'; return; }
      // agrupado por tipo (iPhone, MacBook, Drones…); com um grupo só, sem título
      const groups = GROUPS.map(([k, label]) => [label, list.filter(p => groupOf(p) === k)]).filter(([, items]) => items.length);
      for (const [label, items] of groups) {
        if (groups.length > 1) {
          const h = document.createElement("h3");
          const n = items.filter(p => !p.vendido).length;
          h.className = "group-title reveal";
          h.innerHTML = `${esc(label)}${n ? `<span>${n} ${n > 1 ? "disponíveis" : "disponível"}</span>` : ""}`;
          grid.appendChild(h);
        }
        items.forEach((p, i) => { const c = card(p, instant); c.style.transitionDelay = `${Math.min(i % 8, 7) * 60}ms`; grid.appendChild(c); });
      }
      if (instant) $$(".group-title", grid).forEach(h => h.classList.add("in"));
      revealOnScroll();
    };
    $$(".chip").forEach(b => b.addEventListener("click", () => { $$(".chip").forEach(x => x.classList.remove("on")); b.classList.add("on"); cat = b.dataset.cat; reflow(() => render(true)); }));
    $("#q").addEventListener("input", e => { q = e.target.value.trim(); render(true); });
    $("#sort").addEventListener("change", e => { sort = e.target.value; reflow(() => render(true)); });
    if (all) {
      // volta de um produto / segunda visita: catálogo na hora (a rolagem volta para onde estava)
      $("#count").textContent = all.filter(p => !p.vendido).length;
      render(true);
    } else grid.innerHTML = '<div class="skeleton"></div>'.repeat(8);
    try {
      const fresh = await vitrine("&order=code.desc");
      if (!all) { all = fresh; countUp($("#count"), all.filter(p => !p.vendido).length); render(); }
      else if (JSON.stringify(fresh) !== JSON.stringify(all)) { all = fresh; $("#count").textContent = all.filter(p => !p.vendido).length; render(true); }
    } catch (e) { if (!all) { grid.innerHTML = '<p class="empty">Não foi possível carregar o catálogo agora. Tente de novo em instantes.</p>'; return; } }
    // atualiza sozinho (venda feita na loja some/aparece "Vendido")
    // (só com a aba visível e só redesenha se algo mudou, para a grade não piscar)
    setInterval(async () => {
      if (document.hidden) return;
      try {
        const fresh = await vitrine("&order=code.desc");
        if (JSON.stringify(fresh) === JSON.stringify(all)) return;
        all = fresh; $("#count").textContent = all.filter(p => !p.vendido).length; render(true);
      } catch {}
    }, 60000);
  }

  /* ——— assistência técnica ——— */
  function assist() {
    navShadow();
    revealOnScroll();
    heroParallax();
    $$("[data-quote]").forEach(b => b.addEventListener("click", () => withForm(b, f => f.quote(b.dataset.quote || ""))));
  }

  /* ——— página do produto ——— */
  async function product() {
    navShadow();
    const c = new URLSearchParams(location.search).get("c");
    const root = $("#product");
    const hit = (cached() || []).find(x => String(x.code) === c);
    if (hit) show(hit, true);
    let p;
    try { [p] = await vitrine(`&code=eq.${encodeURIComponent(c)}`); } catch {}
    if (!p && !hit) { root.innerHTML = '<p class="empty">Produto não encontrado. <a href="./#catalogo" style="text-decoration:underline">Ver o catálogo</a></p>'; return; }
    if (p && (!hit || JSON.stringify(p) !== JSON.stringify(hit))) show(p, !hit);
    p = p || hit;
    track("produto", { c: p.code });
  }

  function show(p, first) {
    const root = $("#product");
    document.title = `${p.name} · Imports Brasil`;
    const imgs = images(p);
    const parts = Object.entries(p.parts || {});
    const specs = [
      ["Condição", CONDITION[p.condition]],
      ["Armazenamento", p.storage],
      ["Chip", p.chip], ["Memória", p.ram],
      ["Saúde da bateria", p.battery_health ? `<span class="batt ${p.battery_health <= 65 ? "low" : p.battery_health < 80 ? "mid" : ""}" style="margin:0;justify-content:flex-end"><b><i style="width:${Math.max(8, Math.min(100, p.battery_health)) * .17}px"></i></b>${p.battery_health}%</span>` : null],
      ["Categoria", CATEGORY[groupOf(p)]],
      ["Código", code(p.code)],
    ].filter(([, v]) => v);
    root.innerHTML = `
      <a class="back" href="./#catalogo">‹ Catálogo</a>
      <div class="product-grid">
        <div class="gallery">
          <div class="slides">${imgs.map((i, k) => `<div class="slide"><img class="${i.photo ? "photo" : ""}" src="${esc(i.src)}" alt="${esc(p.name)}"${k ? "" : ' style="view-transition-name:device"'}></div>`).join("")}</div>
          <div class="dots">${imgs.length > 1 ? imgs.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("") : ""}</div>
          <div class="thumbs">${imgs.length > 1 ? imgs.map((i, k) => `<button class="${k ? "" : "on"}"><img class="${i.photo ? "" : "official"}" src="${esc(i.src)}" alt=""></button>`).join("") : ""}</div>
        </div>
        <div class="pinfo${first ? " enter" : ""}">
          ${p.vendido ? '<span class="status" style="color:var(--dim)"><i></i>Vendido</span>' : '<span class="status"><i></i>Disponível na loja</span>'}
          <h1>${esc(p.name)}</h1>
          ${promo(p) ? `<div class="promo-head"><span class="badge-promo">Promoção</span>${p.promo_until ? `<span class="countdown" data-until="${esc(p.promo_until)}">Termina em <b>${left(p.promo_until)}</b></span>` : ""}</div>` : ""}
          ${priceHTML(p)}
          <div class="buybar">
            <div class="p">${money(now(p))}</div>
            ${!p.vendido ? `<button class="btn wa want">${waIcon()} Tenho interesse</button>` : ""}
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
    pageCode = p.code;
    $$(".pinfo.enter > *", root).forEach((el, i) => el.style.setProperty("--i", i));
    // "‹ Catálogo": se veio do catálogo, volta pelo histórico (mesma rolagem e a foto volta para o cartão)
    $(".back", root).addEventListener("click", e => {
      let from = null; try { from = new URL(document.referrer); } catch {}
      if (from && from.origin === location.origin && /^\/(index(\.html)?)?$/.test(from.pathname) && history.length > 1) { e.preventDefault(); history.back(); }
    });
    $$(".want", root).forEach(b => b.addEventListener("click", () => want(p, b)));
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

  /* ——— transições (View Transitions: a maçã do logo abre a próxima tela; sem suporte, troca normal) ——— */
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // a foto do aparelho "voa" do cartão para a galeria (e volta): só ela leva o nome "device"
  function flyFrom(c) {
    $$(".card .pic img").forEach(i => { i.style.viewTransitionName = ""; });
    const img = $(`.card[data-code="${c}"] .pic img`);
    if (img) img.style.viewTransitionName = "device";
  }
  // saindo: lembra de onde veio e qual aparelho estava aberto
  addEventListener("pageswap", e => {
    if (!e.viewTransition) return;
    try { sessionStorage.setItem("imprts.vt", JSON.stringify({ from: document.body.dataset.page, code: pageCode })); } catch {}
  });
  // chegando: ida (a maçã abre) ou volta do produto para o catálogo (a maçã fecha)
  addEventListener("pagereveal", e => {
    let prev = null;
    try { prev = JSON.parse(sessionStorage.getItem("imprts.vt")); sessionStorage.removeItem("imprts.vt"); } catch {}
    if (!e.viewTransition) return;
    const back = document.body.dataset.page === "home" && prev && prev.from === "product";
    if (back && prev.code != null) flyFrom(prev.code);
    const html = document.documentElement;
    html.classList.add(back ? "vt-back" : "vt-page");
    html.dataset.vt = back ? "volta" : "ida"; // última transição (ajuda a conferir)
    e.viewTransition.ready.catch(() => {}); // o navegador pode desistir (aba em segundo plano): troca normal
    e.viewTransition.finished.finally(() => html.classList.remove("vt-back", "vt-page"));
  });
  // filtros/ordem: os cartões deslizam para o lugar novo
  function reflow(update) {
    if (!document.startViewTransition || calm) return update();
    const html = document.documentElement;
    const name = () => $$("#grid .card").forEach(c => { c.style.viewTransitionName = "k" + c.dataset.code; });
    name(); html.classList.add("vt-filter");
    const t = document.startViewTransition(() => { update(); name(); });
    t.ready.catch(() => {});
    t.finished.finally(() => { html.classList.remove("vt-filter"); $$("#grid .card").forEach(c => { c.style.viewTransitionName = ""; }); });
  }

  /* ——— "Tenho interesse" e a conta (o formulário só carrega no primeiro toque) ——— */
  let interesse;
  function withForm(b, fn) {
    if (window.IMPRTS_INTERESSE) return fn(window.IMPRTS_INTERESSE);
    b.classList.add("busy");
    interesse = interesse || new Promise((ok, no) => {
      const s = document.createElement("script");
      s.src = "assets/interesse.js?v=" + (document.querySelector('script[src*="app.js"]')?.src.split("v=")[1] || "1");
      s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
    interesse.then(() => { b.classList.remove("busy"); fn(window.IMPRTS_INTERESSE); }).catch(() => { b.classList.remove("busy"); interesse = null; });
  }
  const want = (p, b) => withForm(b, f => f.open(p));

  /* ——— conta neste celular: nome, telefone e e-mail ficam guardados no aparelho ——— */
  const CONTA = "imprts.cliente";
  const conta = () => { try { const c = JSON.parse(localStorage.getItem(CONTA)); return c && c.name && c.phone ? c : null; } catch { return null; } };
  const initials = name => name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join("").toUpperCase();
  function contaBtn() {
    const c = conta();
    $$("[data-conta]").forEach(b => {
      b.classList.toggle("on", !!c);
      b.innerHTML = c ? esc(initials(c.name)) : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4.1-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></svg>';
      b.setAttribute("aria-label", c ? `Sua conta: ${c.name}` : "Salvar seus dados neste celular");
    });
  }
  addEventListener("imprts:conta", contaBtn);
  addEventListener("storage", e => { if (e.key === CONTA) contaBtn(); });
  window.IMPRTS_UI = { money, esc, code, images, promo, now, wa, waIcon, flush, visitor, CONDITION, PARTS, form: (b, fn) => withForm(b, fn) };

  function contacts() {
    $$("[data-wa]").forEach(a => { const l = wa(a.dataset.waText || "Olá! Vim pelo site da IMPORTS."); if (l) a.href = l; else a.style.display = "none"; });
    $$("[data-igs]").forEach(box => {
      box.innerHTML = (C.instagrams || []).map(u => `<a href="https://instagram.com/${esc(u)}" target="_blank" rel="noopener">@${esc(u)}</a>`).join("");
    });
    $$("[data-wa-label]").forEach(a => { if (C.whatsappLabel) a.textContent = "WhatsApp " + C.whatsappLabel; });
    $$("[data-addr]").forEach(a => { if (C.endereco) a.textContent = C.endereco; else a.style.display = "none"; });
    $$("[data-wa-icon]").forEach(s => s.innerHTML = waIcon());
    $$("[data-year]").forEach(s => s.textContent = new Date().getFullYear());
  }

  // roda assim que o script executa (já com a página lida): a tela nasce desenhada com o cache,
  // e a transição entre telas captura o aparelho no lugar certo
  const init = () => {
    // abertura da marca: ao terminar o zoom, a cortina sai da página (no iPhone o "esconder" por CSS pode falhar
    // e deixar um véu por cima da tela)
    const curtain = $(".intro-curtain");
    if (curtain && document.documentElement.classList.contains("intro")) {
      const done = () => curtain.remove();
      $(".intro-curtain .zoom")?.addEventListener("animationend", done, { once: true });
      setTimeout(done, 3000);
    }
    contacts();
    contaBtn();
    $$("[data-conta]").forEach(b => b.addEventListener("click", () => withForm(b, f => f.account())));
    visit();
    renderSeals();
    if (document.body.dataset.page === "home") home();
    if (document.body.dataset.page === "product") product();
    if (document.body.dataset.page === "assist") assist();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
