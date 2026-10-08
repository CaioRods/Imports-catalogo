// IMPRTS web — Vendas, Clientes, Mais, Ajustes e a entrada (login, perfil e PIN).
import { S, ACCOUNTS, logout, pinOf, checkPIN, setPIN, rpc, rest, setKV, DEMO } from "./core.js?v=1791462120";
import { $, $$, esc, money, code, icon, toast, sheet, confirmSheet, go, topbar, thumb, fmtDate, fmtDateTime, ago, avatar, profile, phoneMask, digits, waLink, model } from "./ui.js?v=1791462120";
import { run } from "./telas-estoque.js?v=1791462120";

const isOwner = () => !!S.user?.owner;

// ————————————————— Vendas —————————————————
const vd = { p: "mes" };
const PERIODS = [["hoje", "Hoje"], ["7", "7 dias"], ["mes", "Mês"], ["ano", "Ano"], ["tudo", "Tudo"]];
function since(p) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (p === "hoje") return d; if (p === "7") return new Date(Date.now() - 7 * 864e5);
  if (p === "mes") return new Date(d.getFullYear(), d.getMonth(), 1); if (p === "ano") return new Date(d.getFullYear(), 0, 1);
  return new Date(0);
}
const soldIn = p => S.products.filter(x => !x.deleted && x.status === "vendido" && x.sold_at && new Date(x.sold_at) >= since(p)).sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at));
export function vendas() {
  const l = soldIn(vd.p);
  const rev = l.reduce((a, x) => a + (x.sold_price || 0), 0);
  const prof = l.reduce((a, x) => a + (x.cost != null && x.sold_price != null ? x.sold_price - x.cost : 0), 0);
  const by = (k, f) => Object.entries(l.reduce((m, x) => { const key = x[k] || "—"; m[key] = (m[key] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="pill">${esc(f(k))} · ${n}</span>`).join("");
  return `<div class="screen">${topbar({ title: "Vendas", back: "#/mais", right: l.length ? `<button class="link-btn" id="csv">Planilha</button>` : "" })}
    <div class="seg mt" id="per">${PERIODS.map(([id, t]) => `<button class="${vd.p === id ? "on" : ""}" data-v="${id}">${t}</button>`).join("")}</div>
    <div class="stats mt">
      <div class="stat"><div class="l">Vendas</div><div class="n">${l.length}</div></div>
      <div class="stat"><div class="l">Faturamento</div><div class="n">${money(rev)}</div></div>
      ${isOwner() ? `<div class="stat"><div class="l">Lucro</div><div class="n">${money(prof)}</div></div>` : ""}
      <div class="stat"><div class="l">Ticket médio</div><div class="n">${l.length ? money(rev / l.length) : "—"}</div></div>
    </div>
    ${l.length ? `<div class="chips wrap mt">${by("sold_by", k => profile(k).name)}${by("payment", k => (S.catalog.payments.find(p => p.id === k) || {}).title || k)}</div>` : ""}
    <div class="list mt">${l.map(x => `<a class="cell" href="#/produto/${x.id}">${thumb(x)}<div class="grow"><div class="row" style="gap:6px"><span class="code">${code(x.code)}</span><span class="t">${esc(x.name)}</span></div>
      <div class="s">${fmtDateTime(x.sold_at)} · ${esc(profile(x.sold_by).name)}${x.buyer ? ` · ${esc(x.buyer)}` : ""}</div></div><span class="price">${money(x.sold_price)}</span></a>`).join("") || `<div class="empty">${icon("sales")}<div>Nenhuma venda no período.</div></div>`}</div></div>`;
}
export function vendasBind(root, rerender) {
  $("#per", root).addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; vd.p = b.dataset.v; rerender(); });
  $("#csv", root)?.addEventListener("click", () => {
    const l = soldIn(vd.p);
    const head = ["codigo", "produto", "imei_serie", "data", "valor", "pagamento", "vendedor", "cliente", "telefone"].concat(isOwner() ? ["custo", "lucro"] : []);
    const f = v => v == null ? "" : String(v).replace(".", ",");
    const lines = l.map(x => [code(x.code), x.name, x.serial, fmtDateTime(x.sold_at), f(x.sold_price), (S.catalog.payments.find(p => p.id === x.payment) || {}).title || "", profile(x.sold_by).name, x.buyer || "", x.buyer_phone || ""]
      .concat(isOwner() ? [f(x.cost), x.cost != null && x.sold_price != null ? f(x.sold_price - x.cost) : ""] : []).map(c => String(c).replace(/;/g, ",")).join(";"));
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\n")], { type: "text/csv" });
    const file = new File([blob], "vendas-imprts.csv", { type: "text/csv" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file] }).catch(() => {});
    else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); }
  });
}

// ————————————————— Clientes (site) —————————————————
const cl = { days: 7, data: null, err: null };
export function clientes() {
  const j = cl.data;
  const dur = s => !s ? "—" : s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}`;
  const body = cl.err ? `<div class="empty">${esc(cl.err)}</div>` : !j ? `<div class="skel" style="height:220px;margin-top:16px"></div>` : `
    <div class="stats mt">
      <div class="stat"><div class="l">Visitantes</div><div class="n">${j.visitors}</div><div class="x">${j.sessions} visitas</div></div>
      <div class="stat"><div class="l">Produtos abertos</div><div class="n">${j.views}</div></div>
      <div class="stat"><div class="l">Tempo médio</div><div class="n">${dur(j.avg_seconds)}</div><div class="x">por visita</div></div>
      <div class="stat"><div class="l">Interessados</div><div class="n">${j.leads}</div><div class="x">${j.visitors ? Math.round(j.mobile / j.visitors * 100) : 0}% pelo celular</div></div>
    </div>
    <div class="section-title">Visitas por dia</div>
    <div class="card pad"><div class="bars">${(j.days || []).map(d => `<i style="height:${Math.max(3, d.visitors / Math.max(1, ...j.days.map(x => x.visitors)) * 100)}%"></i>`).join("")}</div></div>
    <div class="section-title">Mais vistos</div>
    <div class="list">${(j.top || []).slice(0, 10).map(t => { const p = S.products.find(x => x.code === t.code) || { category: "iphone", name: "Produto " + code(t.code) }; const mx = Math.max(1, ...(j.top || []).map(x => x.views));
      return `<a class="cell" ${p.id ? `href="#/produto/${p.id}"` : ""}>${thumb(p)}<div class="grow"><div class="t">${esc(p.name)}</div><div class="s" style="${t.leads ? "color:var(--amber)" : ""}">${t.views} vistas · ${t.people} pessoas${t.leads ? ` · ${t.leads} interessado${t.leads > 1 ? "s" : ""}` : ""}</div><div class="meter"><i style="width:${t.views / mx * 100}%"></i></div></div></a>`; }).join("") || `<div class="empty">Sem visitas no período.</div>`}</div>
    <div class="section-title">De onde vêm</div>
    <div class="list">${(j.referrers || []).map(r => `<div class="cell"><div class="grow t">${esc({ direto: "Direto (link ou digitado)", instagram: "Instagram", facebook: "Facebook", google: "Google", whatsapp: "WhatsApp" }[r.from] || r.from)}</div><span class="val">${r.n}</span></div>`).join("") || `<div class="empty">—</div>`}</div>
    <div class="section-title">Interessados</div>
    ${(j.people || []).map(p => `<div class="card pad" style="margin-bottom:10px">
      <div class="row between"><div class="ellipsis"><div style="font-weight:600">${esc(p.name)}</div><div class="sub small">${esc(phoneMask(p.phone))}${p.email ? " · " + esc(p.email) : ""}</div></div><span class="sub small nowrap">${ago(p.created_at)}</span></div>
      <div class="sub small mt-s">Interesse: <b style="color:var(--text);font-weight:500">${esc(p.product || "Produto")}</b>${p.price ? ` · ${money(p.price)}` : ""}</div>
      ${(p.viewed || []).length ? `<div class="sub small">Também viu: ${(p.viewed || []).filter(c => c !== p.code).slice(0, 4).map(c => esc((S.products.find(x => x.code === c) || {}).name || code(c))).join(", ")}</div>` : ""}
      <div class="chips wrap mt-s" data-lead="${p.id}">${[["novo", "Novo"], ["contatado", "Contatado"], ["vendido", "Vendido"], ["perdido", "Perdido"]].map(([id, t]) => `<button class="chip ${p.status === id ? "on" : ""}" data-v="${id}">${t}</button>`).join("")}</div>
      <a class="btn wa small mt-s" style="width:100%" href="${waLink(p.phone, `Olá, ${p.name.split(" ")[0]}! Aqui é da IMPRTS, sobre o ${p.product || "aparelho"} que você viu no nosso site.`)}">${icon("wa", "sm")}WhatsApp</a></div>`).join("") || `<div class="empty">Ainda ninguém tocou em “Tenho interesse” no site.</div>`}`;
  return `<div class="screen">${topbar({ title: "Clientes", back: "#/mais" })}
    <div class="seg mt" id="days">${[[1, "Hoje"], [7, "7 dias"], [30, "30 dias"], [90, "90 dias"]].map(([d, t]) => `<button class="${cl.days === d ? "on" : ""}" data-v="${d}">${t}</button>`).join("")}</div>${body}</div>`;
}
export function clientesBind(root, rerender) {
  const load = async () => { cl.err = null; try { cl.data = await rpc("site_stats", { days: cl.days }); } catch (e) { cl.err = "Não foi possível carregar agora."; } rerender(); };
  $("#days", root).addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; cl.days = +b.dataset.v; cl.data = null; rerender(); load(); });
  root.addEventListener("click", async e => {
    const b = e.target.closest("[data-lead] .chip"); if (!b) return;
    const id = b.parentNode.dataset.lead, st = b.dataset.v;
    $$(".chip", b.parentNode).forEach(x => x.classList.toggle("on", x === b));
    try { if (!DEMO) await rest("PATCH", `leads?id=eq.${id}`, { status: st }); const p = cl.data.people.find(x => x.id === id); if (p) p.status = st; } catch { toast("Não deu para salvar agora", true); }
  });
  if (!cl.data && !cl.err) load();
}

// ————————————————— Mais —————————————————
export function mais() {
  const pages = S.user.pages;
  const item = (id, ic, t, s) => pages.includes(id) ? `<a class="cell" href="#/${id}">${icon(ic)}<div class="grow"><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ""}</div>${icon("chev", "sm chev")}</a>` : "";
  return `<div class="screen"><div class="big-title" style="padding-top:6px">Mais</div>
    <div class="list mt">${[item("vendas", "sales", "Vendas", "Faturamento, lucro e planilha"), item("orcamento", "quote", "Orçamento", "Gera a imagem para o cliente"),
      item("clientes", "users", "Clientes", "Visitas do site e interessados"), item("etiquetas", "label", "Etiquetas", "O que falta etiquetar"),
      item("valores", "prices", "Valores", "Tabela de preços de serviço"), item("ajustes", "settings", "Ajustes", "Perfil, PIN e conta")].join("")}</div>
    <a class="cell list mt" href="https://importsbrasil.com" target="_blank" rel="noopener">${icon("globe")}<div class="grow"><div class="t">Abrir o site</div><div class="s">importsbrasil.com</div></div>${icon("chev", "sm chev")}</a></div>`;
}

// ————————————————— Ajustes —————————————————
export function ajustes() {
  const p = profile(S.user.id);
  const st = S.kv.store || {};
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  return `<div class="screen">${S.user.pages.includes("inicio") ? topbar({ title: "Ajustes", back: "#/mais" }) : `<div class="big-title" style="padding-top:6px">Ajustes</div>`}
    <div class="card pad row mt">${avatar(S.user.id, "mini-av")}<div class="grow"><div style="font-weight:600">${esc(p.name)}</div><div class="sub small">${esc(S.user.role)} · ${esc(S.session?.email || "")}</div></div></div>
    <div class="list mt">
      <button class="cell" id="pin">${icon("lock")}<div class="grow t">${pinOf(S.user.id) ? "Trocar meu PIN" : "Criar um PIN"}</div>${icon("chev", "sm chev")}</button>
      <button class="cell" id="swap">${icon("users")}<div class="grow t">Trocar de perfil</div>${icon("chev", "sm chev")}</button>
    </div>
    ${isOwner() ? `<div class="section-title">Loja</div><div class="form">
      <label class="field"><span>WhatsApp da loja</span><input class="input" id="wa" type="tel" inputmode="tel" value="${esc(phoneMask(st.whatsapp || ""))}"></label>
      <label class="field"><span>Instagram (sem @)</span><input class="input" id="ig" value="${esc(st.instagram || "")}" autocapitalize="off"></label>
      <label class="field"><span>Endereço</span><input class="input" id="addr" value="${esc(st.address || "")}"></label>
      <button class="btn ghost" id="saveStore">Salvar dados da loja</button></div>` : ""}
    ${standalone ? "" : `<div class="section-title">Instalar no iPhone</div><div class="card pad small" style="line-height:1.6">No Safari, toque em <b>Compartilhar</b> ${icon("share", "xs")} e depois em <b>Adicionar à Tela de Início</b>. O IMPRTS fica com ícone e abre em tela cheia, como um app.</div>`}
    <div class="section-title">Sincronização</div>
    <div class="card pad small muted">${S.lastSync ? `Atualizado ${ago(S.lastSync)} · ${S.products.filter(x => !x.deleted).length} produtos · ${S.repairs.filter(x => !x.deleted).length} serviços` : "Conectando…"}<br>O que muda aqui aparece nos Macs da loja (e vice-versa) em segundos.</div>
    <div class="actions mt-l"><button class="btn danger" id="out">${icon("logout", "sm")}Sair da conta da loja neste celular</button></div>
    <p class="sub small center mt">IMPRTS web · mesma base do sistema do Mac</p></div>`;
}
export function ajustesBind(root, rerender, onSwap) {
  $("#pin", root).onclick = () => pinSheet(rerender);
  $("#swap", root).onclick = onSwap;
  $("#out", root).onclick = async () => { if (await confirmSheet("Sair deste celular?", "Para voltar, é só escolher o perfil e digitar o PIN de novo.", "Sair", true)) { logout(); location.hash = ""; location.reload(); } };
  $("#saveStore", root)?.addEventListener("click", () => run(() => setKV("store", { ...(S.kv.store || {}), whatsapp: digits($("#wa", root).value) ? "55" + digits($("#wa", root).value).replace(/^55/, "") : "", instagram: $("#ig", root).value.trim().replace(/^@/, ""), address: $("#addr", root).value.trim() }), "Dados da loja salvos"));
  $("#wa", root)?.addEventListener("input", e => e.target.value = phoneMask(e.target.value));
}
function pinSheet(done) {
  const { el, close } = sheet(`<h2>${pinOf(S.user.id) ? "Trocar PIN" : "Criar PIN"}</h2><p class="sub">4 números. Vale também nos Macs da loja.</p>
    <div class="form">${pinOf(S.user.id) ? `<label class="field"><span>PIN atual</span><input class="input" id="a" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>` : ""}
    <label class="field"><span>Novo PIN</span><input class="input" id="b" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label>
    <button class="btn metal" id="ok">Salvar PIN</button></div>`);
  $("#ok", el).onclick = async () => {
    if ($("#a", el) && !(await checkPIN(S.user.id, $("#a", el).value))) return toast("PIN atual incorreto", true);
    const n = $("#b", el).value.replace(/\D/g, ""); if (n.length !== 4) return toast("O PIN precisa ter 4 números", true);
    if (await run(() => setPIN(S.user.id, n), "PIN salvo")) { close(); done(); }
  };
}

// ————————————————— Entrada: perfil → PIN —————————————————
const LOGO = `<svg class="logo" viewBox="-2 -2 449.64 85.73" role="img" aria-label="IMPRTS"><path fill="currentColor" d="M0.00 79.27L0.00 8.81L6.64 8.81L6.64 79.27ZM28.78 79.27L28.78 8.81L36.40 8.81L62.59 70.90L62.85 70.90L89.03 8.81L96.65 8.81L96.65 79.27L90.41 79.27L90.41 21.30L87.24 21.30L94.72 10.33L65.61 79.27L59.82 79.27L30.72 10.33L38.19 21.30L35.02 21.30L35.02 79.27ZM122.12 52.69L122.12 46.75L141.22 46.75Q149.39 46.75 154.00 42.49Q158.61 38.23 158.61 30.79L158.61 30.69Q158.61 23.20 154.00 18.97Q149.39 14.74 141.22 14.74L122.12 14.74L122.12 8.81L142.76 8.81Q149.49 8.81 154.57 11.52Q159.65 14.24 162.51 19.16Q165.38 24.07 165.38 30.63L165.38 30.72Q165.38 37.27 162.51 42.22Q159.65 47.17 154.57 49.93Q149.49 52.69 142.76 52.69ZM118.80 79.27L118.80 8.81L125.43 8.81L125.43 79.27ZM265.40 79.27L265.40 8.81L290.26 8.81Q297.14 8.81 302.19 11.34Q307.25 13.88 310.01 18.51Q312.78 23.13 312.78 29.42L312.78 29.52Q312.78 36.95 308.76 42.21Q304.74 47.47 297.68 49.34L314.78 79.27L307.01 79.27L290.82 50.37Q290.50 50.39 290.10 50.40Q289.70 50.42 289.36 50.42L272.03 50.42L272.03 79.27ZM272.03 44.51L289.73 44.51Q297.40 44.51 301.68 40.61Q305.95 36.70 305.95 29.65L305.95 29.55Q305.95 22.58 301.55 18.66Q297.15 14.74 289.46 14.74L272.03 14.74ZM350.84 79.27L350.84 14.81L327.55 14.81L327.55 8.81L380.77 8.81L380.77 14.81L357.48 14.81L357.48 79.27ZM420.32 80.38Q412.86 80.38 407.17 77.99Q401.47 75.61 398.13 71.22Q394.79 66.84 394.35 60.89L394.31 60.22L400.94 60.22L401.02 60.89Q401.53 64.95 404.07 67.95Q406.62 70.95 410.86 72.59Q415.10 74.24 420.66 74.24Q426.18 74.24 430.27 72.59Q434.36 70.94 436.62 67.91Q438.87 64.88 438.87 60.82L438.87 60.77Q438.87 55.56 435.32 52.47Q431.77 49.37 423.60 47.53L415.88 45.80Q409.06 44.27 404.68 41.74Q400.30 39.20 398.18 35.51Q396.06 31.81 396.06 26.82L396.06 26.76Q396.10 21.16 399.19 16.88Q402.28 12.59 407.69 10.14Q413.10 7.70 420.05 7.70Q426.86 7.70 432.19 10.15Q437.52 12.60 440.71 16.98Q443.90 21.37 444.32 27.16L444.37 27.85L437.74 27.85L437.65 27.20Q437.15 23.05 434.82 20.07Q432.49 17.09 428.69 15.46Q424.89 13.83 419.89 13.83Q414.81 13.83 410.97 15.44Q407.12 17.05 404.98 19.91Q402.83 22.77 402.83 26.59L402.83 26.66Q402.83 29.94 404.40 32.41Q405.98 34.89 409.25 36.62Q412.53 38.35 417.65 39.51L425.37 41.23Q432.58 42.83 437.04 45.35Q441.50 47.87 443.57 51.57Q445.64 55.27 445.64 60.47L445.64 60.52Q445.64 66.56 442.54 71.02Q439.44 75.49 433.75 77.93Q428.06 80.38 420.32 80.38ZM227.54 19.76Q228.70 19.76 231.49 20.13Q234.28 20.50 237.63 22.21Q240.98 23.92 243.71 27.88Q243.56 28.03 242.19 29.01Q240.82 29.98 239.13 31.86Q237.44 33.73 236.18 36.60Q234.91 39.47 234.91 43.42Q234.91 47.95 236.52 51.12Q238.13 54.28 240.26 56.20Q242.40 58.12 244.06 59.02Q245.72 59.92 245.82 59.97Q245.77 60.18 244.48 63.71Q243.19 67.24 240.24 71.56Q237.66 75.30 234.68 78.47Q231.70 81.63 227.54 81.63Q224.74 81.63 222.95 80.81Q221.16 79.99 219.26 79.18Q217.37 78.36 214.15 78.36Q211.04 78.36 208.96 79.20Q206.88 80.05 205.01 80.89Q203.14 81.73 200.61 81.73Q196.76 81.73 193.86 78.68Q190.97 75.62 187.91 71.35Q184.38 66.29 181.88 58.99Q179.37 51.70 179.37 44.27Q179.37 36.31 182.38 30.91Q185.38 25.51 190.10 22.74Q194.81 19.97 199.87 19.97Q202.56 19.97 204.93 20.84Q207.30 21.71 209.38 22.61Q211.46 23.50 213.15 23.50Q214.78 23.50 216.95 22.55Q219.11 21.61 221.79 20.68Q224.48 19.76 227.54 19.76ZM224.64 13.07Q222.58 15.55 219.47 17.21Q216.37 18.87 213.57 18.87Q212.99 18.87 212.47 18.76Q212.41 18.60 212.36 18.18Q212.31 17.76 212.31 17.28Q212.31 14.12 213.68 11.15Q215.05 8.17 216.79 6.22Q219.00 3.58 222.37 1.84Q225.75 0.11 228.80 0.00Q228.96 0.68 228.96 1.63Q228.96 4.80 227.75 7.77Q226.54 10.75 224.64 13.07Z"/></svg>`;
export function profileScreen(onPick) {
  const root = $("#app");
  root.innerHTML = `<div class="gate">${LOGO}<div class="sub">Quem está usando?</div>
    <div class="avatars">${ACCOUNTS.map(a => `<button class="avatar" data-a="${a.id}">${avatar(a.id, "ph")}<span>${esc(profile(a.id).name)}</span><small>${esc(a.role)}</small></button>`).join("")}</div></div>`;
  $(".avatars", root).onclick = e => { const b = e.target.closest("[data-a]"); if (b) onPick(ACCOUNTS.find(a => a.id === b.dataset.a)); };
}
// check: confere o PIN (padrão: com o banco já carregado; na entrada, no servidor). Erro vira aviso na tela.
export function pinScreen(acct, onOK, onBack, check = checkPIN) {
  const root = $("#app"); let pin = "", busy = false;
  root.innerHTML = `<div class="gate"><div class="avatar">${avatar(acct.id, "ph")}</div><div style="font-size:20px;font-weight:600;margin-top:12px">${esc(profile(acct.id).name)}</div><div class="sub">Digite seu PIN</div>
    <div class="dots" id="dots">${"<i></i>".repeat(4)}</div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-k="${n}">${n}</button>`).join("")}<button class="key txt" data-k="back">Voltar</button><button class="key" data-k="0">0</button><button class="key txt" data-k="del">Apagar</button></div></div>`;
  const dots = () => $$("#dots i", root).forEach((d, i) => d.classList.toggle("on", i < pin.length));
  root.querySelector(".keypad").onclick = async e => {
    const k = e.target.closest("[data-k]")?.dataset.k; if (!k) return;
    if (busy) return;
    if (k === "back") return onBack();
    if (k === "del") { pin = pin.slice(0, -1); return dots(); }
    if (pin.length >= 4) return;
    pin += k; dots();
    if (pin.length === 4) {
      busy = true;
      let ok = false;
      try { ok = await check(acct.id, pin); } catch (err) { toast(err.message, true); }
      if (ok) return onOK();
      const d = $("#dots", root); d.classList.add("shake"); navigator.vibrate?.(80); setTimeout(() => { d.classList.remove("shake"); pin = ""; busy = false; dots(); }, 450);
    }
  };
}
