// IMPRTS web — Início, Estoque, produto, cadastro, venda e etiquetas.
import { S, createProduct, updateProduct, uploadPhoto, removePhoto, photoURL, logActivity, setKV } from "./core.js?v=1791577399";
import { $, $$, esc, money, code, icon, toast, sheet, confirmSheet, go, topbar, thumb, battery, priceHTML, promoOn, statusPill,
  model, colorOf, coverURL, autoName, applicableParts, partName, chips, bindChips, parseMoney, moneyInput, fmtDate, fmtDateTime, ago,
  avatar, profile, phoneMask, digits, waLink, luhnOK, catIcon } from "./ui.js?v=1791577399";

const norm = s => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const alive = () => S.products.filter(p => !p.deleted);
export const inStock = () => alive().filter(p => p.status !== "vendido");
const isOwner = () => !!S.user?.owner;
const storeWarranty = () => (S.kv.store && S.kv.store.warranty) || 90;

// ————————————————— Início —————————————————
export function inicio() {
  const stock = inStock();
  const value = stock.reduce((a, p) => a + (p.price || 0), 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  const sold = alive().filter(p => p.status === "vendido" && p.sold_at);
  const sToday = sold.filter(p => new Date(p.sold_at) >= today);
  const sMonth = sold.filter(p => new Date(p.sold_at) >= month);
  const sum = l => l.reduce((a, p) => a + (p.sold_price || 0), 0);
  const shop = S.repairs.filter(r => !r.deleted && r.business !== "caleb");
  const open = shop.filter(r => !["entregue", "cancelado"].includes(r.status));
  const ready = shop.filter(r => r.status === "pronto");
  const promos = stock.filter(promoOn);
  const noLabel = stock.filter(p => !p.label_printed_at).length;
  const hello = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";
  return `<div class="screen">
    <div class="row between" style="padding-top:6px">
      <div class="ellipsis"><div class="sub">${hello},</div><div class="big-title" style="margin:0">${esc(profile(S.user.id).name)}</div></div>
      <a href="#/ajustes">${avatar(S.user.id, "mini-av")}</a>
    </div>
    <div class="stats mt">
      <a class="stat" href="#/estoque"><div class="l">Em estoque</div><div class="n">${stock.length}</div><div class="x">${money(value)} em venda</div></a>
      <a class="stat" href="#/vendas"><div class="l">Vendas hoje</div><div class="n">${sToday.length}</div><div class="x">${money(sum(sToday))}</div></a>
      <a class="stat" href="#/vendas"><div class="l">No mês</div><div class="n">${sMonth.length}</div><div class="x">${money(sum(sMonth))}</div></a>
      <a class="stat" href="#/servicos"><div class="l">Serviços abertos</div><div class="n">${open.length}</div><div class="x">${ready.length} pronto${ready.length === 1 ? "" : "s"} para retirar</div></a>
    </div>
    ${noLabel ? `<a class="banner" href="#/etiquetas">${icon("label", "sm")}<span>${noLabel} produto${noLabel > 1 ? "s" : ""} sem etiqueta</span></a>` : ""}
    ${promos.length ? `<div class="section-title">Em promoção</div><div class="list">${promos.slice(0, 5).map(productCell).join("")}</div>` : ""}
    <div class="section-title">Atividade</div>
    <div class="list">${S.activity.slice(0, 12).map(a => `<div class="cell">${avatar(a.actor)}<div class="grow"><div class="t" style="white-space:normal">${esc(a.text)}</div><div class="s">${esc(profile(a.actor).name)} · ${ago(a.at)}</div></div></div>`).join("") || `<div class="empty">Nada ainda.</div>`}</div>
  </div>`;
}

// ————————————————— Estoque —————————————————
const est = { q: "", cat: "todos", st: "estoque" };
export function productCell(p) {
  return `<a class="cell" href="#/produto/${p.id}">${thumb(p)}
    <div class="grow"><div class="row" style="gap:6px"><span class="code">${code(p.code)}</span><span class="t">${esc(p.name)}</span></div>
      <div class="row mt-s" style="gap:8px;flex-wrap:wrap">${priceHTML(p)}${battery(p.battery_health)}${p.status !== "disponivel" ? statusPill(p.status) : ""}${promoOn(p) ? `<span class="pill gold">Promo</span>` : ""}</div></div>
    ${icon("chev", "sm chev")}</a>`;
}
export function estoque() {
  return `<div class="screen">
    <div class="row between" style="padding-top:6px"><div class="big-title">Estoque</div><a class="icon-btn" href="#/cadastrar" aria-label="Cadastrar">${icon("plus")}</a></div>
    <label class="search">${icon("search")}<input id="q" type="search" placeholder="Código, nome, IMEI, cor…" value="${esc(est.q)}" autocomplete="off" enterkeyhint="search"></label>
    <div class="chips" id="cats">${[["todos", "Todos"], ["iphone", "iPhone"], ["macbook", "MacBook"], ["ipad", "iPad"], ["outros", "Outros"]].map(([id, t]) => `<button class="chip ${est.cat === id ? "on" : ""}" data-v="${id}">${t}</button>`).join("")}</div>
    <div class="seg mt" id="st">${[["estoque", "Em estoque"], ["vendido", "Vendidos"], ["todos", "Todos"]].map(([id, t]) => `<button class="${est.st === id ? "on" : ""}" data-v="${id}">${t}</button>`).join("")}</div>
    <div id="lista" class="mt"></div></div>`;
}
export function estoqueBind(root) {
  const draw = () => {
    let l = alive();
    if (est.st === "estoque") l = l.filter(p => p.status !== "vendido"); else if (est.st === "vendido") l = l.filter(p => p.status === "vendido");
    if (est.cat === "outros") l = l.filter(p => !["iphone", "macbook", "ipad"].includes(p.category)); else if (est.cat !== "todos") l = l.filter(p => p.category === est.cat);
    const q = norm(est.q).trim();
    if (q) {
      const n = parseInt(q.replace("#", ""), 10);
      l = l.filter(p => (!isNaN(n) && p.code === n && /^#?\d+$/.test(q)) || q.split(/\s+/).every(w => norm(`${code(p.code)} ${p.name} ${p.serial} ${p.storage || ""} ${p.buyer || ""} ${p.notes}`).includes(w)));
    }
    l.sort((a, b) => (promoOn(b) - promoOn(a)) || ((est.st === "vendido" ? new Date(b.sold_at) - new Date(a.sold_at) : (b.code || 0) - (a.code || 0))));
    $("#lista", root).innerHTML = l.length ? `<div class="sub" style="margin:0 4px 8px">${l.length} produto${l.length > 1 ? "s" : ""}</div><div class="list">${l.slice(0, 300).map(productCell).join("")}</div>`
      : `<div class="empty">${icon("search")}<div>Nenhum produto ${est.q ? "encontrado" : "aqui"}.</div></div>`;
  };
  $("#q", root).addEventListener("input", e => { est.q = e.target.value; draw(); });
  $("#cats", root).addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; est.cat = b.dataset.v; $$("#cats .chip", root).forEach(x => x.classList.toggle("on", x === b)); draw(); });
  $("#st", root).addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; est.st = b.dataset.v; $$("#st button", root).forEach(x => x.classList.toggle("on", x === b)); draw(); });
  draw();
}

// ————————————————— Produto —————————————————
export function produto(id) {
  const p = S.products.find(x => x.id === id);
  if (!p) return `<div class="screen">${topbar({ title: "Produto", back: "#/estoque" })}<div class="empty">Produto não encontrado.</div></div>`;
  const parts = Object.entries(p.parts || {});
  // mesma ordem do site: capa escolhida, imagem oficial do modelo, depois as outras fotos
  const photos = Array.isArray(p.photos) ? p.photos : [], cover = p.cover && photos.includes(p.cover) ? p.cover : null;
  const u = coverURL(p);
  const photo = f => `<div class="hero-img photo"><img src="${esc(photoURL(f))}" alt="" loading="lazy"></div>`;
  const imgs = (cover ? [photo(cover)] : [])
    // imagem oficial que não existe: some se houver fotos, senão vira o ícone
    .concat(u ? [`<div class="hero-img"><img src="${esc(u)}" alt="" onerror="${photos.length ? "this.parentNode.remove()" : "this.parentNode.classList.add('noimg')"}">${catIcon(p.category)}</div>`] : [])
    .concat(photos.filter(f => f !== cover).map(photo));
  if (!imgs.length) imgs.push(`<div class="hero-img noimg">${catIcon(p.category)}</div>`);
  const rows = [
    ["Código", code(p.code)], ["Situação", statusPill(p.status)], ["Condição", (S.catalog.conditions.find(c => c.id === p.condition) || {}).title],
    ["Armazenamento", p.storage], ["Chip", p.chip], ["Memória", p.ram], ["Bateria", p.battery_health != null ? battery(p.battery_health) : null],
    ["IMEI / série", p.serial], ["Preço", p.price != null ? priceHTML(p) : null], isOwner() && p.cost != null ? ["Custo", money(p.cost)] : null,
    isOwner() && p.cost != null && (p.sold_price || p.price) ? ["Lucro", money((p.sold_price || p.price) - p.cost)] : null,
    ["No site", p.publish ? "Sim" : "Não"], ["Cadastrado", `${fmtDate(p.created_at)} · ${esc(profile(p.created_by).name)}`],
    p.label_printed_at ? ["Etiqueta", "impressa " + fmtDate(p.label_printed_at)] : ["Etiqueta", `<span class="pill amber">sem etiqueta</span>`],
  ].filter(r => r && r[1] != null && r[1] !== "");
  const sold = p.status === "vendido";
  return `<div class="screen">${topbar({ title: code(p.code), back: "#/estoque", right: `<a class="link-btn" href="#/editar/${p.id}">Editar</a>` })}
    <div class="gallery mt-s">${imgs.join("")}</div>
    <h1 style="font-size:22px;font-weight:600;letter-spacing:-.01em;margin:16px 0 4px">${esc(p.name)}</h1>
    <div class="row" style="flex-wrap:wrap;gap:8px">${priceHTML(p)}${promoOn(p) ? `<span class="pill gold">Promoção</span>${p.promo_until ? `<span class="sub small">até ${fmtDateTime(p.promo_until)}</span>` : ""}` : ""}</div>
    ${sold ? `<div class="card pad mt"><div class="sub small">Vendido em ${fmtDateTime(p.sold_at)} por ${esc(profile(p.sold_by).name)}</div>
      <div class="price" style="font-size:20px;margin-top:4px">${money(p.sold_price)}</div>
      <div class="sub small">${esc((S.catalog.payments.find(x => x.id === p.payment) || {}).title || "")}${p.buyer ? ` · ${esc(p.buyer)}` : ""}${p.buyer_phone ? ` · ${esc(phoneMask(p.buyer_phone))}` : ""}${p.warranty_days ? ` · garantia ${p.warranty_days} dias` : ""}</div></div>` : ""}
    <div class="actions mt ${sold ? "" : "two"}">
      ${sold ? `<button class="btn ghost" data-a="desfazer">${icon("undo", "sm")}Desfazer venda</button>` : `<button class="btn green" data-a="vender">${icon("sales", "sm")}Vender</button><button class="btn ghost" data-a="promo">${icon("promo", "sm")}${promoOn(p) ? "Promoção" : "Promoção"}</button>`}
    </div>
    <div class="list mt"><div class="kv">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join("")}</div></div>
    <div class="section-title">Peças</div>
    ${parts.length ? `<div class="chips wrap">${parts.map(([k, v]) => `<span class="pill ${v === "trocada" ? "green" : "red"}">${esc(partName(k))} · ${v === "trocada" ? "trocada" : "com defeito"}</span>`).join("")}</div>` : `<div class="sub" style="margin:0 4px">Todas originais.</div>`}
    ${p.notes ? `<div class="section-title">Observações</div><div class="card pad" style="white-space:pre-wrap">${esc(p.notes)}</div>` : ""}
    ${p.description ? `<div class="section-title">No site</div><div class="card pad" style="white-space:pre-wrap">${esc(p.description)}</div>` : ""}
    <div class="actions mt-l">
      ${p.publish && !sold ? `<button class="btn ghost" data-a="share">${icon("share", "sm")}Compartilhar link do site</button>` : ""}
      ${!sold && !p.label_printed_at ? `<button class="btn ghost" data-a="etiqueta">${icon("label", "sm")}Marcar etiqueta como impressa</button>` : ""}
      <button class="btn danger" data-a="excluir">${icon("trash", "sm")}Excluir produto</button>
    </div></div>`;
}
export function produtoBind(root, id) {
  const p = () => S.products.find(x => x.id === id);
  root.addEventListener("click", async e => {
    const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
    if (a === "vender") venderSheet(p());
    if (a === "promo") promoSheet(p());
    if (a === "desfazer" && await confirmSheet("Desfazer a venda?", `${code(p().code)} volta para o estoque.`, "Desfazer venda")) {
      await run(() => updateProduct(id, { status: "disponivel", sold_at: null, sold_price: null, sold_by: null, payment: null, buyer: null, buyer_phone: null }, `desfez a venda de ${code(p().code)}`), "Venda desfeita");
    }
    if (a === "excluir" && await confirmSheet("Excluir este produto?", `${code(p().code)} · ${p().name}`, "Excluir", true)) {
      await run(() => updateProduct(id, { deleted: true }, `excluiu ${code(p().code)} · ${p().name}`), "Produto excluído"); go("estoque");
    }
    if (a === "etiqueta") await run(async () => { await updateProduct(id, { label_printed_at: new Date().toISOString() }); logActivity("etiqueta", `imprimiu a etiqueta do ${code(p().code)}`, null); }, "Etiqueta marcada");
    if (a === "share") {
      const url = `https://importsbrasil.com/produto?c=${p().code}`;
      if (navigator.share) navigator.share({ title: p().name, url }).catch(() => {}); else { navigator.clipboard?.writeText(url); toast("Link copiado"); }
    }
  });
}
export async function run(fn, ok) {
  try { await fn(); if (ok) toast(ok); return true; }
  catch (e) { console.error(e); toast(e.message && e.message.length < 120 ? e.message : "Não foi possível salvar. Confira a internet.", true); return false; }
}

// ————————————————— Vender —————————————————
function venderSheet(p) {
  const price = promoOn(p) ? p.promo_price : p.price;
  const { el, close } = sheet(`<h2>Vender ${code(p.code)}</h2><p class="sub">${esc(p.name)}</p>
    <div class="form">
      <label class="field"><span>Valor da venda</span><div class="money"><input class="input" id="v" inputmode="decimal" value="${moneyInput(price)}"></div></label>
      <div class="field"><span>Pagamento</span>${chips("pay", S.catalog.payments, "pix")}</div>
      <label class="field"><span>Cliente (opcional)</span><input class="input" id="b" autocomplete="name" placeholder="Nome do cliente"></label>
      <label class="field"><span>Telefone (opcional)</span><input class="input" id="ph" type="tel" inputmode="tel" placeholder="(18) 99999-9999"></label>
      <div class="field"><span>Garantia</span>${chips("gar", [30, 90, 180, 365].map(d => ({ id: d, title: d === 180 ? "6 meses" : d === 365 ? "1 ano" : d + " dias" })), storeWarranty())}</div>
      <button class="btn metal" id="ok">${icon("check", "sm")}Confirmar venda</button>
    </div>`);
  let pay = "pix", gar = storeWarranty();
  bindChips(el, "pay", v => pay = v); bindChips(el, "gar", v => gar = +v);
  $("#ph", el).addEventListener("input", e => e.target.value = phoneMask(e.target.value));
  $("#ok", el).onclick = async () => {
    const v = parseMoney($("#v", el).value);
    $("#ok", el).disabled = true;
    const buyer = $("#b", el).value.trim(), phone = digits($("#ph", el).value);
    const ok = await run(() => updateProduct(p.id, { status: "vendido", sold_at: new Date().toISOString(), sold_price: v ?? p.price, sold_by: S.user.id, payment: pay,
      buyer: buyer || null, buyer_phone: phone || null, warranty_days: gar }, `vendeu ${code(p.code)} · ${p.name} por ${money(v ?? p.price)}`), "Venda registrada");
    close();
    if (ok && phone) {
      const msg = `Olá${buyer ? " " + buyer.split(" ")[0] : ""}! Obrigado pela compra na IMPRTS.\n\n${p.name}\nCódigo: ${code(p.code)}\nValor: ${money(v ?? p.price)}\nGarantia: ${gar} dias${["iphone", "android"].includes(p.category) ? "\nIMPRTS Assistance: 3 meses sem custo de mão de obra" : ""}`;
      const link = waLink(phone, msg);
      if (link && await confirmSheet("Enviar o recibo?", "Abre o WhatsApp do cliente com o resumo da compra.", "Abrir WhatsApp")) location.href = link;
    }
  };
}

// ————————————————— Promoção —————————————————
function promoSheet(p) {
  const on = promoOn(p);
  const opts = [{ id: "0", title: "Sem prazo" }, { id: "1", title: "24 horas" }, { id: "3", title: "3 dias" }, { id: "7", title: "7 dias" }, { id: "x", title: "Escolher data" }];
  const { el, close } = sheet(`<h2>Promoção</h2><p class="sub">Fica em destaque no site, sempre primeiro, com o preço antigo riscado.</p>
    <div class="form">
      <label class="field"><span>Preço promocional</span><div class="money"><input class="input" id="pp" inputmode="decimal" value="${moneyInput(on ? p.promo_price : p.price ? Math.round(p.price * 0.9) : null)}"></div><span class="hint" id="info"></span></label>
      <div class="field"><span>Dura até</span>${chips("dur", opts, on && p.promo_until ? "x" : "0")}</div>
      <input class="input ${on && p.promo_until ? "" : "hide"}" id="dt" type="datetime-local" value="${on && p.promo_until ? new Date(new Date(p.promo_until) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : ""}">
      <button class="btn metal" id="ok">${icon("check", "sm")}${on ? "Salvar promoção" : "Ativar promoção"}</button>
      ${on ? `<button class="btn danger" id="end">Encerrar promoção</button>` : ""}
    </div>`);
  let dur = on && p.promo_until ? "x" : "0";
  const info = () => {
    const n = parseMoney($("#pp", el).value), o = p.price;
    const h = $("#info", el);
    if (n != null && o) { h.className = n >= o ? "hint err" : "hint"; h.textContent = n >= o ? "Precisa ser menor que o preço de venda." : `De ${money(o)} por ${money(n)} (${Math.round((1 - n / o) * 100)}% de desconto).`; }
  };
  bindChips(el, "dur", v => { dur = v; $("#dt", el).classList.toggle("hide", v !== "x"); });
  $("#pp", el).addEventListener("input", info); info();
  $("#ok", el).onclick = async () => {
    const n = parseMoney($("#pp", el).value);
    if (n == null || (p.price && n >= p.price)) return toast("Confira o preço promocional", true);
    let until = null;
    if (dur === "x") { if (!$("#dt", el).value) return toast("Escolha a data", true); until = new Date($("#dt", el).value).toISOString(); }
    else if (dur !== "0") until = new Date(Date.now() + (+dur) * 864e5).toISOString();
    if (await run(() => updateProduct(p.id, { promo_price: n, promo_until: until }, `colocou ${code(p.code)} em promoção por ${money(n)}`), "Promoção ativa")) close();
  };
  $("#end", el) && ($("#end", el).onclick = async () => { if (await run(() => updateProduct(p.id, { promo_price: null, promo_until: null }, `encerrou a promoção de ${code(p.code)}`), "Promoção encerrada")) close(); });
}

// ————————————————— Cadastrar / Editar —————————————————
let draft = null;
export function editor(id) {
  const editing = id ? S.products.find(x => x.id === id) : null;
  if (!draft || draft._for !== (id || "novo")) draft = { ...(editing ? JSON.parse(JSON.stringify(editing)) : { category: "iphone", condition: "seminovo", status: "disponivel", publish: true, parts: {}, photos: [], description: "", notes: "", serial: "" }), _for: id || "novo" };
  const d = draft, cat = S.catalog;
  const models = cat.models.filter(m => m.category === d.category);
  const m = model(d.model_id);
  const head = topbar({ title: editing ? `Editar ${code(editing.code)}` : "Cadastrar", back: editing ? `#/produto/${editing.id}` : "#/estoque" });
  const catField = `<div class="field"><span>O que vai cadastrar?</span>${chips("cat", cat.categories.filter(c => c.id !== "android" || d.category === "android"), d.category, { wrap: false })}</div>`;
  // 1º passo: escolher o modelo pela foto (com busca), em vez de uma lista comprida
  if (models.length && (!m || d._picking)) {
    const title = (cat.categories.find(c => c.id === d.category) || {}).title || "aparelho";
    return `<div class="screen">${head}<div class="form mt">${catField}
      <div class="picker"><div class="pick-title">Qual ${esc(title)}?</div>
        <label class="search">${icon("search")}<input id="mq" type="search" placeholder="Buscar (ex.: 13 pro max)" autocomplete="off" enterkeyhint="search"></label>
        ${groupModels(models).map(([g, list]) => `<div class="pick-group"><div class="section-title">${esc(g)}</div><div class="models">${list.map((x, i) => `<button type="button" class="mcard ${x.id === d.model_id ? "on" : ""}" data-m="${x.id}" data-q="${esc(normQ(x.name))}" style="--i:${i}"><span class="mimg">${x.colors[0] ? `<img loading="lazy" alt="" src="/img/modelos/${x.id}/${x.colors[0].id}.webp?v=3" onerror="this.remove()">` : ""}</span><span class="mname">${esc(x.name)}</span></button>`).join("")}</div></div>`).join("")}
        <p class="sub small center hide" id="mnone">Nenhum modelo com esse nome.</p>
        ${m ? `<button type="button" class="btn ghost" id="pickCancel">Manter ${esc(m.name)}</button>` : ""}
      </div></div></div>`;
  }
  const storages = m ? m.storages : cat.genericStorages;
  const parts = applicableParts(d.category, m);
  const imei = d.serial ? luhnOK(d.serial) : null;
  const color = m?.colors.find(c => c.id === d.color_id);
  const cover = coverURL(d);
  const bh = d.battery_health;
  const battCls = bh == null ? "" : bh >= 85 ? "good" : bh >= 80 ? "ok" : "low";
  return `<div class="screen">${head}
    <div class="form mt">
      ${m ? `<div class="hero-dev">
        <div class="hero-img">${cover ? `<img src="${esc(cover)}" alt="" onerror="this.remove()">` : ""}</div>
        <div class="hero-info"><div class="hero-name">${esc(m.name)}</div>
          <div class="sub small">${[color?.name, d.storage].filter(Boolean).map(esc).join(" · ") || "Escolha a cor e a capacidade"}</div>
          <button type="button" class="btn small ghost" id="swapModel">${icon("edit", "sm")}Trocar modelo</button></div>
      </div>` : catField}
      <div class="section-title">Aparelho</div>
      ${m && m.colors.length ? `<div class="field"><span>Cor${color ? ` · <b style="color:var(--text);font-weight:500">${esc(color.name)}</b>` : ""}</span><div class="swatches" id="colors">${m.colors.map(c => `<button type="button" class="sw ${c.id === d.color_id ? "on" : ""}" data-v="${c.id}" aria-label="${esc(c.name)}"><i style="background:${c.hex}"></i></button>`).join("")}</div></div>` : ""}
      ${m && m.chips ? `<div class="field"><span>Chip</span>${chips("chip", m.chips.map(x => ({ id: x, title: x })), d.chip)}</div><div class="field"><span>Memória</span>${chips("ram", m.rams.map(x => ({ id: x, title: x })), d.ram)}</div>` : ""}
      <div class="field"><span>Capacidade</span>${chips("sto", storages.map(x => ({ id: x, title: x })), d.storage)}</div>
      <label class="field"><span>IMEI ou número de série</span><input class="input" id="serial" value="${esc(d.serial || "")}" autocapitalize="characters" autocomplete="off" placeholder="Disque *#06# no aparelho"><span class="hint ${imei === false ? "err" : ""}" id="imeiHint">${imei === false ? "IMEI inválido — confira os dígitos" : imei ? "IMEI confere ✓" : ""}</span></label>
      <div class="section-title">Estado</div>
      <div class="field"><span>Condição</span>${chips("cond", cat.conditions, d.condition)}</div>
      <div class="field"><span>Saúde da bateria</span>
        <div class="batt-pick ${battCls}" id="battBox"><input type="range" id="battR" min="50" max="100" step="1" value="${bh ?? 100}" class="${bh == null ? "unset" : ""}">
          <label class="batt-num"><input class="input" id="batt" inputmode="numeric" maxlength="3" value="${bh ?? ""}" placeholder="—"><span>%</span></label></div>
        <span class="hint" id="battHint">${bh == null ? "Arraste ou digite (Ajustes → Bateria → Saúde)" : bh < 80 ? "Abaixo de 80%: o iPhone mostra “Manutenção”" : ""}</span></div>
      <div class="field"><span>Peças <span style="color:var(--faint)">· toque: trocada → com defeito → original</span></span>
        <div class="parts" id="parts">${parts.map(id => partBtn(id, d.parts[id])).join("")}</div></div>
      <div class="section-title">Preço</div>
      <div class="grid2">
        <label class="field"><span>Venda</span><div class="money"><input class="input" id="price" inputmode="decimal" value="${moneyInput(d.price)}"></div></label>
        ${isOwner() ? `<label class="field"><span>Custo (só o dono vê)</span><div class="money"><input class="input" id="cost" inputmode="decimal" value="${moneyInput(d.cost)}"></div></label>` : "<div></div>"}
      </div>
      ${editing && editing.status !== "vendido" ? `<div class="field"><span>Situação</span>${chips("status", [{ id: "disponivel", title: "Disponível" }, { id: "reservado", title: "Reservado" }, { id: "reparo", title: "Em reparo" }], d.status)}</div>` : ""}
      <div class="section-title">Site e etiqueta</div>
      <label class="field"><span>Nome</span><input class="input" id="name" value="${esc(d.name || autoName(d.category, m, color, d.storage))}"></label>
      <div class="toggle"><span>Mostrar no site</span><label class="switch"><input type="checkbox" id="pub" ${d.publish ? "checked" : ""}><span></span></label></div>
      <label class="field"><span>Descrição para o cliente</span><textarea class="input" id="desc" rows="3" placeholder="Ex.: muito conservado, sem marcas, acompanha cabo.">${esc(d.description || "")}</textarea></label>
      <div class="field"><span>Fotos (até 5 com a capa oficial, que é fixa)</span><div class="photos" id="photos">${photosHTML(d)}</div>
        <input type="file" id="file" accept="image/*" class="hide"></div>
      <label class="field"><span>Observações (só no sistema)</span><textarea class="input" id="notes" rows="2">${esc(d.notes || "")}</textarea></label>
      <div class="save-bar"><button class="btn metal" id="save">${icon("check", "sm")}${editing ? "Salvar alterações" : "Cadastrar produto"}</button></div>
      ${editing ? "" : `<p class="sub small center" style="margin:-6px 0 0">O código da etiqueta é gerado pelo sistema ao salvar.</p>`}
    </div></div>`;
}
const normQ = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
function groupModels(models) {
  const g = new Map();
  for (const m of [...models].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name))) {
    const k = m.category === "android" ? m.brand : String(m.year);
    if (!g.has(k)) g.set(k, []); g.get(k).push(m);
  }
  return [...g];
}
function partBtn(id, st) { return `<button type="button" class="part ${st || ""}" data-p="${id}"><span>${esc(partName(id))}</span>${st ? `<em>${st === "trocada" ? "TROCADA" : "DEFEITO"}</em>` : ""}</button>`; }
function photosHTML(d) {
  const u = coverURL(d);
  const tiles = [`<div class="cover">${u ? `<img src="${esc(u)}" alt="" onerror="this.remove()">` : ""}<span class="tag">CAPA</span></div>`];
  (d.photos || []).forEach((f, i) => tiles.push(`<div><img src="${esc(f.startsWith("blob:") ? f : photoURL(f))}" alt=""><span class="tag">${i + 2}/5</span><button type="button" class="del" data-del="${i}" aria-label="Remover">${icon("x", "xs")}</button></div>`));
  if ((d.photos || []).length < 4) tiles.push(`<button type="button" class="add" id="addPhoto">${icon("camera")}<span>Adicionar</span></button>`);
  return tiles.join("");
}
export function editorBind(root, id, rerender) {
  const d = draft;
  const keep = () => {   // guarda o que foi digitado antes de redesenhar
    const has = s => !!$(s, root), v = s => $(s, root)?.value;
    if (has("#batt")) d.battery_health = v("#batt") ? Math.min(100, parseInt(v("#batt"), 10)) || null : null;
    if (has("#serial")) d.serial = v("#serial");
    if (has("#price")) d.price = parseMoney(v("#price"));
    if (has("#cost")) d.cost = parseMoney(v("#cost"));
    if (has("#name")) d.name = v("#name");
    if (has("#notes")) d.notes = v("#notes");
    if (has("#desc")) d.description = v("#desc");
    if (has("#pub")) d.publish = $("#pub", root).checked;
  };
  const renameAuto = () => { const m = model(d.model_id); d.name = autoName(d.category, m, m?.colors.find(c => c.id === d.color_id), d.storage); };
  const pickModel = mid => {
    keep(); d.model_id = mid || null; d._picking = false;
    const m = model(d.model_id); d.color_id = m?.colors[0]?.id || null;
    if (m?.chips) { d.chip = m.chips[0]; d.ram = m.rams[0]; }
    if (m && d.storage && !m.storages.includes(d.storage)) d.storage = null;
    if (m && !d.storage && m.storages.length === 1) d.storage = m.storages[0];
    renameAuto(); rerender(); scrollTo(0, 0);
  };
  bindChips(root, "cat", v => { keep(); d.category = v; d.model_id = null; d.color_id = null; d.chip = null; d.ram = null; d._picking = false; renameAuto(); rerender(); });
  // escolha do modelo
  const picker = $(".picker", root);
  if (picker) {
    picker.addEventListener("click", e => { const b = e.target.closest(".mcard"); if (b) pickModel(b.dataset.m); });
    $("#pickCancel", root) && ($("#pickCancel", root).onclick = () => { d._picking = false; rerender(); });
    $("#mq", root).addEventListener("input", e => {
      const words = normQ(e.target.value).replace(/^iphone ?/, "").split(" ").filter(Boolean);
      let any = false;
      $$(".pick-group", root).forEach(g => {
        let n = 0;
        $$(".mcard", g).forEach(c => { const ok = words.every(w => c.dataset.q.includes(w)); c.classList.toggle("hide", !ok); if (ok) n++; });
        g.classList.toggle("hide", !n); if (n) any = true;
      });
      $("#mnone", root).classList.toggle("hide", any);
    });
    return;
  }
  $("#swapModel", root) && ($("#swapModel", root).onclick = () => { keep(); d._picking = true; rerender(); scrollTo(0, 0); });
  $("#colors", root)?.addEventListener("click", e => { const b = e.target.closest(".sw"); if (!b) return; keep(); d.color_id = b.dataset.v; renameAuto(); rerender(); });
  // bateria: barra e número andam juntos
  const battR = $("#battR", root), battI = $("#batt", root);
  const battShow = v => {
    const box = $("#battBox", root), h = $("#battHint", root);
    box.className = "batt-pick " + (v == null ? "" : v >= 85 ? "good" : v >= 80 ? "ok" : "low");
    h.textContent = v == null ? "Arraste ou digite (Ajustes → Bateria → Saúde)" : v < 80 ? "Abaixo de 80%: o iPhone mostra “Manutenção”" : "";
  };
  battR.addEventListener("input", () => { battR.classList.remove("unset"); battI.value = battR.value; battShow(+battR.value); });
  battI.addEventListener("input", () => { const v = parseInt(battI.value, 10); if (v >= 1 && v <= 100) { battR.value = Math.max(50, v); battR.classList.remove("unset"); battShow(v); } else battShow(null); });
  bindChips(root, "chip", v => d.chip = v); bindChips(root, "ram", v => d.ram = v);
  bindChips(root, "sto", v => { keep(); d.storage = v; renameAuto(); $("#name", root).value = d.name; });
  bindChips(root, "cond", v => d.condition = v); bindChips(root, "status", v => d.status = v);
  $("#serial", root).addEventListener("input", e => { const ok = luhnOK(e.target.value); const h = $("#imeiHint", root); h.textContent = ok === false ? "IMEI inválido — confira os dígitos" : ok ? "IMEI confere ✓" : ""; h.className = "hint" + (ok === false ? " err" : ok ? " ok" : ""); });
  $("#parts", root).addEventListener("click", e => {
    const b = e.target.closest(".part"); if (!b) return;
    const k = b.dataset.p, cur = d.parts[k], next = !cur ? "trocada" : cur === "trocada" ? "defeito" : null;
    if (next) d.parts[k] = next; else delete d.parts[k];
    b.outerHTML = partBtn(k, next);
  });
  const photos = $("#photos", root);
  photos.addEventListener("click", async e => {
    const del = e.target.closest("[data-del]");
    if (del) { keep(); const [f] = d.photos.splice(+del.dataset.del, 1); (d._removed = d._removed || []).push(f); photos.innerHTML = photosHTML(d); return; }
    if (e.target.closest("#addPhoto")) $("#file", root).click();
  });
  $("#file", root).addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    const blob = await cropSheet(f); if (!blob) return;
    keep(); d._new = d._new || []; const url = URL.createObjectURL(blob); d._new.push({ url, blob }); d.photos.push(url); photos.innerHTML = photosHTML(d);
  });
  $("#save", root).onclick = async () => {
    keep();
    if (!d.name.trim()) return toast("Dê um nome ao produto", true);
    if (d.battery_health != null && (d.battery_health < 1 || d.battery_health > 100)) return toast("Bateria entre 1 e 100%", true);
    const btn = $("#save", root); btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>Salvando…`;
    const fields = { category: d.category, model_id: d.model_id, color_id: d.color_id, name: d.name.trim(), storage: d.storage || null, ram: d.ram || null, chip: d.chip || null,
      serial: (d.serial || "").trim(), battery_health: d.battery_health, condition: d.condition, parts: d.parts, price: d.price, notes: d.notes || "", publish: !!d.publish,
      description: (d.description || "").trim(), status: d.status || "disponivel" };
    if (isOwner()) fields.cost = d.cost;
    const ok = await run(async () => {
      let p = id ? S.products.find(x => x.id === id) : null;
      if (!p) p = await createProduct({ ...fields, photos: [] });
      // fotos novas sobem com o id do produto
      const final = [];
      for (const f of d.photos) {
        const n = (d._new || []).find(x => x.url === f);
        final.push(n ? await uploadPhoto(p.id, n.blob) : f);
      }
      const changed = id ? `editou ${code(p.code)} · ${fields.name}` : null;
      await updateProduct(p.id, { ...fields, photos: final }, changed);
      for (const f of d._removed || []) if (!f.startsWith("blob:")) removePhoto(f);
      draft = null; go("produto", p.id);
    }, id ? "Alterações salvas" : "Produto cadastrado");
    if (!ok) { btn.disabled = false; btn.innerHTML = `${icon("check", "sm")}${id ? "Salvar alterações" : "Cadastrar produto"}`; }
  };
}
export function resetDraft() { draft = null; }

// ————————————————— Recorte da foto (quadrado, arrastar e pinçar) —————————————————
function cropSheet(file) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const { el, close } = sheet(`<h2>Ajustar foto</h2><p class="sub">Arraste para posicionar e pince (ou use a barra) para dar zoom.</p>
        <div class="crop"><canvas id="cv" width="1200" height="1200"></canvas></div>
        <input type="range" id="z" min="1" max="5" step="0.01" value="1" style="width:100%;margin:16px 0;accent-color:#f4f4f5">
        <div class="actions two"><button class="btn ghost" id="cancel">Cancelar</button><button class="btn metal" id="use">Usar foto</button></div>`);
      const cv = $("#cv", el), ctx = cv.getContext("2d"), S0 = 1200;
      let zoom = 1, ox = 0, oy = 0;
      const base = S0 / Math.min(img.width, img.height);
      const clamp = () => { const w = img.width * base * zoom, h = img.height * base * zoom; const mx = Math.max(0, (w - S0) / 2), my = Math.max(0, (h - S0) / 2); ox = Math.min(mx, Math.max(-mx, ox)); oy = Math.min(my, Math.max(-my, oy)); };
      const draw = () => { clamp(); const w = img.width * base * zoom, h = img.height * base * zoom; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, S0, S0); ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, S0 / 2 - w / 2 + ox, S0 / 2 - h / 2 + oy, w, h); };
      const scale = () => S0 / cv.getBoundingClientRect().width;
      const pts = new Map(); let last = null, pinch = null;
      cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: zoom }; } });
      cv.addEventListener("pointermove", e => {
        if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const nz = Math.min(5, Math.max(1, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); ox *= nz / zoom; oy *= nz / zoom; zoom = nz; $("#z", el).value = zoom; }
        else if (pts.size === 1 && last) { const k = scale(); ox += (e.clientX - last[0]) * k; oy += (e.clientY - last[1]) * k; last = [e.clientX, e.clientY]; }
        draw();
      });
      const up = e => { pts.delete(e.pointerId); pinch = null; last = pts.size ? [...pts.values()][0] : null; };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      $("#z", el).addEventListener("input", e => { const nz = +e.target.value; ox *= nz / zoom; oy *= nz / zoom; zoom = nz; draw(); });
      draw();
      $("#cancel", el).onclick = () => { close(); resolve(null); };
      $("#use", el).onclick = () => {
        const out = document.createElement("canvas"); out.width = out.height = 1600;
        const o = out.getContext("2d"); o.imageSmoothingQuality = "high"; o.drawImage(cv, 0, 0, 1600, 1600);
        out.toBlob(b => { close(); resolve(b); }, "image/jpeg", 0.84);
      };
    };
    img.onerror = () => { toast("Não consegui abrir essa imagem", true); resolve(null); };
    img.src = URL.createObjectURL(file);
  });
}

// ————————————————— Etiquetas —————————————————
export function etiquetas() {
  const l = inStock().filter(p => !p.label_printed_at).sort((a, b) => (b.code || 0) - (a.code || 0));
  return `<div class="screen">${topbar({ title: "Etiquetas", back: "#/mais" })}
    <p class="sub mt" style="margin-left:4px">Produtos sem etiqueta. A impressão é feita no Mac (a impressora de etiquetas fica ligada nele); aqui você marca o que já foi etiquetado.</p>
    ${l.length ? `<div class="list mt">${l.map(p => `<label class="cell">${thumb(p)}<div class="grow"><div class="row" style="gap:6px"><span class="code">${code(p.code)}</span><span class="t">${esc(p.name)}</span></div><div class="s">${money(p.price)}</div></div>
      <input type="checkbox" class="pick" value="${p.id}" style="width:22px;height:22px;accent-color:#34c77b"></label>`).join("")}</div>
      <div class="actions mt"><button class="btn metal" id="mark">${icon("check", "sm")}Marcar selecionadas como impressas</button><button class="btn ghost" id="all">Selecionar todas</button></div>`
      : `<div class="empty">${icon("label")}<div>Todos os produtos já têm etiqueta.</div></div>`}</div>`;
}
export function etiquetasBind(root) {
  $("#all", root)?.addEventListener("click", () => $$(".pick", root).forEach(c => c.checked = true));
  $("#mark", root)?.addEventListener("click", async () => {
    const ids = $$(".pick", root).filter(c => c.checked).map(c => c.value);
    if (!ids.length) return toast("Selecione pelo menos um", true);
    await run(async () => {
      const at = new Date().toISOString();
      for (const id of ids) await updateProduct(id, { label_printed_at: at });
      logActivity("etiqueta", ids.length === 1 ? `imprimiu a etiqueta do ${code(S.products.find(p => p.id === ids[0])?.code)}` : `imprimiu ${ids.length} etiquetas`, null);
    }, ids.length === 1 ? "Etiqueta marcada" : `${ids.length} etiquetas marcadas`);
  });
}
