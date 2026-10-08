// IMPRTS web — peças de interface reaproveitadas pelas telas.
import { S } from "./core.js?v=1791454889";

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const money = v => v == null || v === "" || isNaN(v) ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const code = n => n == null ? "···" : String(n).padStart(3, "0");
export const osNum = n => n == null ? "OS ····" : "OS " + String(n).padStart(4, "0");
export function parseMoney(s) {
  if (s == null) return null;
  const t = String(s).replace(/[^\d,.-]/g, "");
  if (!t) return null;
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return isFinite(n) ? n : null;
}
export const moneyInput = v => v == null ? "" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function fmtDate(d, opts = { dateStyle: "short" }) { if (!d) return "—"; return new Date(d).toLocaleString("pt-BR", opts); }
export function fmtDateTime(d) { return fmtDate(d, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
export function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 172800) return "ontem";
  return fmtDate(d, { day: "2-digit", month: "short" });
}
export const digits = s => String(s || "").replace(/\D/g, "");
export function phoneMask(v) {
  const d = digits(v).replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export function waLink(phone, text) {
  let d = digits(phone); if (d.length < 10) return null;
  if (!d.startsWith("55")) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
export function luhnOK(s) {
  const d = digits(s); if (d.length !== 15) return null;
  let sum = 0;
  for (let i = 0; i < 15; i++) { let n = +d[14 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }
  return sum % 10 === 0;
}

// ——— ícones (traço fino, mesmo estilo do sistema) ———
const P = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  stock: '<path d="m12 3 8.5 4.5L12 12 3.5 7.5z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  sales: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  quote: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20.5a6 6 0 0 1 12 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.5a6 6 0 0 1 3.5 6"/>',
  label: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M10 10v4M12.5 10v4M15 10v4M17.5 10v4"/>',
  prices: '<circle cx="12" cy="12" r="9"/><path d="M15 9.2c-.6-1-1.7-1.6-3-1.6-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.7-3.2-1.8M12 6v2M12 16.5v2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1"/>',
  logout: '<path d="M10 4H5v16h5"/><path d="M9.5 12H20M16 8l4 4-4 4"/>',
  wa: '<path d="M12 3a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.9-1.1A8.5 8.5 0 1 0 12 3z"/><path d="M9 8.5c.2 2.7 3.6 6.4 6.5 6.6.6-.1 1.2-.8 1.2-1.4l-1.8-1-1 .8c-1-.4-2.3-1.6-2.8-2.8l.8-1-1-1.8c-.6 0-1.3.6-1.4 1.2z"/>',
  camera: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>',
  trash: '<path d="M4 6.5h16M9.5 6.5l.5-3h4l.5 3M6 6.5l1 14h10l1-14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v8h14v-8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  laptop: '<rect x="4.5" y="5" width="15" height="10" rx="1.2"/><path d="M2.5 18.5h19"/>',
  drone: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 8l2.5 2.5M16 8l-2.5 2.5M8 16l2.5-2.5M16 16l-2.5-2.5"/><rect x="10" y="10" width="4" height="4" rx="1"/>',
  box: '<path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z"/><path d="M4 7.5 12 11l8-3.5M12 11v9"/>',
  promo: '<path d="m3 12 9-9h7a2 2 0 0 1 2 2v7l-9 9z"/><circle cx="16" cy="8" r="1.4"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.8-8.9 6 6 0 0 1 11.6 1.4A3.8 3.8 0 0 1 17.5 18.5z"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  download: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19h14"/>',
};
export const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
export const catIcon = c => icon(c === "macbook" ? "laptop" : c === "drone" ? "drone" : ["iphone", "android"].includes(c) ? "phone" : "box");

// ——— avisos e folhas ———
let toastT;
export function toast(msg, err = false) {
  const t = $("#toast"); t.textContent = msg; t.className = err ? "on err" : "on";
  clearTimeout(toastT); toastT = setTimeout(() => t.className = err ? "err" : "", 2600);
}
export function sheet(html, { onOpen } = {}) {
  const bg = document.createElement("div");
  bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  $("#sheets").appendChild(bg);
  document.documentElement.style.overflow = "hidden";
  requestAnimationFrame(() => requestAnimationFrame(() => bg.classList.add("on")));
  const close = () => {
    bg.classList.remove("on");
    setTimeout(() => { bg.remove(); if (!$("#sheets").children.length) document.documentElement.style.overflow = ""; }, 320);
  };
  bg.addEventListener("click", e => { if (e.target === bg) close(); });
  // arrastar para baixo pela alça fecha
  let y0 = null; const sh = $(".sheet", bg);
  sh.addEventListener("touchstart", e => { if (sh.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener("touchmove", e => { if (y0 != null && e.touches[0].clientY - y0 > 0 && sh.scrollTop <= 0) sh.style.transform = `translateY(${e.touches[0].clientY - y0}px)`; }, { passive: true });
  sh.addEventListener("touchend", e => { if (y0 == null) return; const dy = (e.changedTouches[0].clientY - y0); sh.style.transform = ""; y0 = null; if (dy > 110) close(); });
  onOpen && onOpen(bg, close);
  return { el: bg, close };
}
export function confirmSheet(title, text, okLabel, danger = false) {
  return new Promise(res => {
    const { el, close } = sheet(`<h2>${esc(title)}</h2><p class="sub">${esc(text)}</p>
      <div class="actions"><button class="btn ${danger ? "danger" : "metal"}" data-ok>${esc(okLabel)}</button><button class="btn ghost" data-no>Cancelar</button></div>`);
    $("[data-ok]", el).onclick = () => { close(); res(true); };
    $("[data-no]", el).onclick = () => { close(); res(false); };
  });
}

// ——— navegação (#/tela/param) ———
export const route = () => { const h = location.hash.replace(/^#\/?/, "").split("/"); return { page: h[0] || "", arg: h[1] ? decodeURIComponent(h[1]) : null }; };
export const go = (page, arg) => { location.hash = "#/" + page + (arg != null ? "/" + encodeURIComponent(arg) : ""); };

// ——— produto ———
export function model(id) { return S.catalog?.byId[id] || null; }
export function colorOf(p) { const m = model(p.model_id); return m?.colors.find(c => c.id === p.color_id) || null; }
export function coverURL(p) { return p.model_id && p.color_id ? `/img/modelos/${p.model_id}/${p.color_id}.webp?v=3` : ""; }
export function thumb(p, cls = "thumb") {
  const u = coverURL(p);
  // sem foto (ou se ela não carregar) aparece o ícone da categoria
  return `<div class="${cls}${u ? "" : " noimg"}">${u ? `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg')">` : ""}${catIcon(p.category)}</div>`;
}
export function battery(b) {
  if (b == null) return "";
  const cls = b <= 65 ? "low" : b < 80 ? "mid" : "ok";
  return `<span class="batt ${cls}"><b><i style="width:${Math.max(10, Math.min(100, b))}%"></i></b>${b}%</span>`;
}
export const promoOn = p => p.promo_price != null && (!p.promo_until || new Date(p.promo_until) > Date.now()) && p.status !== "vendido";
export function priceHTML(p) {
  if (promoOn(p)) return `<span class="price promo">${money(p.promo_price)}</span> <span class="strike">${money(p.price)}</span>`;
  return `<span class="price">${money(p.price)}</span>`;
}
export const STATUS = { disponivel: ["Disponível", "green"], reservado: ["Reservado", "amber"], reparo: ["Em reparo", "blue"], vendido: ["Vendido", ""] };
export function statusPill(s) { const [t, c] = STATUS[s] || [s, ""]; return `<span class="pill ${c}">${esc(t)}</span>`; }
export function autoName(category, m, color, storage) {
  const parts = [m ? m.name : (S.catalog.categories.find(c => c.id === category)?.title || "Produto")];
  if (storage) parts.push(storage);
  if (color) parts.push(color.name);
  return parts.join(" ");
}
export function applicableParts(category, m) {
  if (m) return m.parts;
  const all = S.catalog.parts.map(p => p.id);
  const no = { macbook: ["faceid", "vidroTraseiro", "sinal", "vibracall", "helices", "motor", "gimbal", "nfc"], android: ["faceid", "touchid", "teclado", "trackpad", "dobradica", "helices", "motor", "gimbal"],
    ipad: ["faceid", "teclado", "trackpad", "dobradica", "vibracall", "helices", "motor", "gimbal", "nfc"] }[category] || ["teclado", "trackpad", "dobradica", "helices", "motor", "gimbal"];
  return all.filter(id => !no.includes(id));
}
export function partName(id) { return S.catalog?.partById[id]?.name || id; }

// ——— perfis ———
export function profile(acct) {
  const a = (S.kv["profile." + acct] || {});
  return { name: a.name || ({ rafael: "Rafael", funcionario: "Funcionário", caleb: "Caleb" }[acct] || acct), photo: a.photo ? `data:image/jpeg;base64,${a.photo}` : null, ...a };
}
export function avatar(acct, cls = "mini-av") {
  const p = profile(acct);
  return `<span class="${cls}">${p.photo ? `<img src="${p.photo}" alt="">` : esc(p.name.slice(0, 1))}</span>`;
}

// ——— campos ———
export function chips(name, options, value, { wrap = true } = {}) {
  return `<div class="chips ${wrap ? "wrap" : ""}" data-chips="${name}">${options.map(o => `<button type="button" class="chip ${String(o.id) === String(value) ? "on" : ""}" data-v="${esc(o.id)}">${esc(o.title)}</button>`).join("")}</div>`;
}
export function bindChips(root, name, onPick) {
  const box = $(`[data-chips="${name}"]`, root); if (!box) return;
  box.addEventListener("click", e => {
    const b = e.target.closest(".chip"); if (!b) return;
    $$(".chip", box).forEach(x => x.classList.toggle("on", x === b));
    onPick(b.dataset.v);
  });
}
export function topbar({ title = "", back = null, right = "" } = {}) {
  return `<header class="topbar"><div class="row">
    <div class="side">${back ? `<a class="back" href="${back}">${icon("back")}Voltar</a>` : ""}</div>
    <div class="title">${esc(title)}</div><div class="side right">${right}</div></div></header>`;
}
export function watchScroll() {
  const tb = $(".topbar"); if (!tb) return;
  const f = () => tb.classList.toggle("scrolled", scrollY > 4);
  removeEventListener("scroll", watchScroll._f || (() => {})); watchScroll._f = f;
  addEventListener("scroll", f, { passive: true }); f();
}
