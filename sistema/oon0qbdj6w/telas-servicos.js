// IMPRTS web — Serviços (ordens de serviço), Orçamento e tabela de Valores.
import { S, createRepair, updateRepair, setKV } from "./core.js?v=1791462120";
import { $, $$, esc, money, osNum, icon, toast, sheet, confirmSheet, go, topbar, model, chips, bindChips, parseMoney, moneyInput,
  fmtDate, fmtDateTime, ago, avatar, profile, phoneMask, digits, waLink, applicableParts, partName } from "./ui.js?v=1791462120";
import { run } from "./telas-estoque.js?v=1791462120";

const norm = s => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const isCaleb = () => S.user?.id === "caleb";
const visible = () => S.repairs.filter(r => !r.deleted && (isCaleb() || r.business !== "caleb"));
const GROUPS = [
  { id: "fila", title: "Fila", st: ["recebido", "diagnostico", "aguardando_peca"] },
  { id: "conserto", title: "Conserto", st: ["em_reparo"] },
  { id: "pronto", title: "Prontos", st: ["pronto"] },
  { id: "hist", title: "Histórico", st: ["entregue", "cancelado"] },
];
const stTitle = id => (S.catalog.repairStatuses.find(s => s.id === id) || {}).title || id;
const stColor = { recebido: "", diagnostico: "blue", aguardando_peca: "amber", em_reparo: "blue", pronto: "green", entregue: "", cancelado: "red" };
const classes = () => (Array.isArray(S.kv.classes) ? S.kv.classes : []);
const hex = n => "#" + Number(n || 0).toString(16).padStart(6, "0");

// ————————————————— Quadro —————————————————
const sv = { g: "fila", q: "", biz: "todos" };
export function servicos() {
  const counts = Object.fromEntries(GROUPS.map(g => [g.id, visible().filter(r => g.st.includes(r.status) && bizOK(r)).length]));
  return `<div class="screen">
    <div class="row between" style="padding-top:6px"><div class="big-title">Serviços</div><a class="icon-btn" href="#/os/nova" aria-label="Nova ordem">${icon("plus")}</a></div>
    <label class="search">${icon("search")}<input id="q" type="search" placeholder="Cliente, aparelho, OS…" value="${esc(sv.q)}" autocomplete="off"></label>
    ${isCaleb() ? `<div class="seg" id="biz" style="margin-bottom:10px">${[["todos", "Tudo"], ["imprts", "Loja"], ["caleb", "Por fora"]].map(([id, t]) => `<button class="${sv.biz === id ? "on" : ""}" data-v="${id}">${t}</button>`).join("")}</div>` : ""}
    <div class="seg" id="g">${GROUPS.map(g => `<button class="${sv.g === g.id ? "on" : ""}" data-v="${g.id}">${g.title}${counts[g.id] && g.id !== "hist" ? ` ${counts[g.id]}` : ""}</button>`).join("")}</div>
    <div id="lista" class="mt"></div></div>`;
}
const bizOK = r => sv.biz === "todos" || (r.business || "imprts") === sv.biz;
function osCard(r) {
  const cls = classes().find(c => c.id === r.class_id);
  const late = r.due_at && new Date(r.due_at) < Date.now() && !["pronto", "entregue", "cancelado"].includes(r.status);
  return `<a class="os-card" href="#/os/${r.id}" style="--cls:${cls ? hex(cls.color) : "transparent"}">
    <div class="top"><span class="code">${osNum(r.number)}</span><span class="who">${esc(r.customer || "Sem nome")}</span><span class="pill ${stColor[r.status] || ""}">${esc(stTitle(r.status))}</span></div>
    <div class="dev">${esc(r.device || "")}${r.budget != null ? ` · ${money(r.budget)}` : ""}${r.business === "caleb" ? ` · <span style="color:var(--amber)">por fora</span>` : ""}</div>
    ${r.problem ? `<div class="prob">${esc(r.problem)}</div>` : ""}
    <div class="row small muted" style="gap:8px">${cls ? `<span class="row" style="gap:5px"><span class="dot" style="background:${hex(cls.color)}"></span>${esc(cls.name)}</span>` : ""}
      ${r.due_at ? `<span style="${late ? "color:var(--red)" : ""}">${icon("clock", "xs")} ${fmtDate(r.due_at, { day: "2-digit", month: "2-digit" })}</span>` : ""}<span style="margin-left:auto">${ago(r.updated_at)}</span></div></a>`;
}
export function servicosBind(root) {
  const draw = () => {
    const g = GROUPS.find(x => x.id === sv.g);
    let l = visible().filter(r => g.st.includes(r.status) && bizOK(r));
    const q = norm(sv.q).trim();
    if (q) l = l.filter(r => q.split(/\s+/).every(w => norm(`${osNum(r.number)} ${r.number} ${r.customer} ${r.phone} ${r.device} ${r.serial} ${r.problem}`).includes(w)));
    l.sort((a, b) => sv.g === "hist" ? new Date(b.delivered_at || b.updated_at) - new Date(a.delivered_at || a.updated_at) : (b.number || 0) - (a.number || 0));
    $("#lista", root).innerHTML = l.length ? l.slice(0, 200).map(osCard).join("") : `<div class="empty">${icon("wrench")}<div>Nada em ${g.title.toLowerCase()}.</div></div>`;
  };
  $("#q", root).addEventListener("input", e => { sv.q = e.target.value; draw(); });
  $("#g", root).addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; sv.g = b.dataset.v; $$("#g button", root).forEach(x => x.classList.toggle("on", x === b)); draw(); });
  $("#biz", root)?.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; sv.biz = b.dataset.v; $$("#biz button", root).forEach(x => x.classList.toggle("on", x === b)); draw(); });
  draw();
}

// ————————————————— Ordem de serviço —————————————————
let od = null;
export function os(id) {
  const editing = id && id !== "nova" ? S.repairs.find(r => r.id === id) : null;
  if (id !== "nova" && !editing) return `<div class="screen">${topbar({ title: "Serviço", back: "#/servicos" })}<div class="empty">Ordem não encontrada.</div></div>`;
  if (!od || od._for !== id) od = { ...(editing ? JSON.parse(JSON.stringify(editing)) : { category: "iphone", status: "recebido", parts: {}, business: isCaleb() ? "caleb" : "imprts" }), _for: id };
  const d = od, cat = S.catalog;
  const models = cat.models.filter(m => m.category === d.category && (d.category !== "android" || isCaleb()));
  const m = model(d.model_id);
  return `<div class="screen">${topbar({ title: editing ? osNum(editing.number) : "Nova ordem", back: "#/servicos" })}
    ${editing ? `<div class="sub center mt-s">Aberta em ${fmtDateTime(editing.created_at)} por ${esc(profile(editing.created_by).name)}</div>` : ""}
    <div class="form mt">
      ${editing ? `<div class="field"><span>Andamento</span>${chips("st", cat.repairStatuses, d.status)}</div>` : ""}
      ${isCaleb() ? `<div class="field"><span>Serviço</span>${chips("biz", [{ id: "imprts", title: "Da loja" }, { id: "caleb", title: "Por fora (só eu vejo)" }], d.business)}</div>` : ""}
      <label class="field"><span>Cliente</span><input class="input" id="cust" value="${esc(d.customer || "")}" autocomplete="off" autocapitalize="words" placeholder="Nome do cliente"></label>
      <label class="field"><span>Telefone (WhatsApp)</span><input class="input" id="phone" type="tel" inputmode="tel" value="${esc(phoneMask(d.phone || ""))}" placeholder="(18) 99999-9999"></label>
      <div class="field"><span>Aparelho</span>${chips("cat", cat.categories.filter(c => ["iphone", "macbook", "ipad", "watch", "airpods", "drone", "outro"].includes(c.id) || (isCaleb() && c.id === "android")), d.category, { wrap: false })}</div>
      ${models.length ? `<label class="field"><span>Modelo</span><select class="input" id="model"><option value="">Outro / não sei</option>${models.sort((a, b) => b.year - a.year).map(x => `<option value="${x.id}" ${x.id === d.model_id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>` : ""}
      <label class="field"><span>Descrição do aparelho</span><input class="input" id="dev" value="${esc(d.device || (m ? m.name : ""))}" placeholder="Ex.: iPhone 13 Pro azul"></label>
      <div class="grid2">
        <label class="field"><span>IMEI / série</span><input class="input" id="serial" value="${esc(d.serial || "")}" autocomplete="off"></label>
        <label class="field"><span>Senha do aparelho</span><input class="input" id="pass" value="${esc(d.passcode || "")}" autocomplete="off"></label>
      </div>
      <label class="field"><span>Problema relatado</span><textarea class="input" id="prob" rows="3">${esc(d.problem || "")}</textarea></label>
      <div class="field"><span>Peças a trocar / com defeito</span><div class="parts" id="parts">${applicableParts(d.category, m).map(p => partBtn(p, d.parts[p])).join("")}</div></div>
      <div class="grid2">
        <label class="field"><span>Valor do serviço</span><div class="money"><input class="input" id="budget" inputmode="decimal" value="${moneyInput(d.budget)}"></div></label>
        <label class="field"><span>Custo das peças</span><div class="money"><input class="input" id="pcost" inputmode="decimal" value="${moneyInput(d.parts_cost)}"></div></label>
      </div>
      <label class="field"><span>Prazo de entrega</span><input class="input" id="due" type="date" value="${d.due_at ? new Date(d.due_at).toISOString().slice(0, 10) : ""}"></label>
      ${classes().length ? `<div class="field"><span>Classe</span><div class="chips wrap" data-chips="cls">${[{ id: "", name: "Nenhuma" }, ...classes()].map(c => `<button type="button" class="chip ${(d.class_id || "") === c.id ? "on" : ""}" data-v="${c.id}">${c.id ? `<span class="dot" style="background:${hex(c.color)}"></span>` : ""}${esc(c.name)}</button>`).join("")}</div></div>` : ""}
      <label class="field"><span>Observações</span><textarea class="input" id="notes" rows="2">${esc(d.notes || "")}</textarea></label>
      <button class="btn metal" id="save">${icon("check", "sm")}${editing ? "Salvar" : "Abrir ordem de serviço"}</button>
      ${editing && editing.phone ? `<button class="btn wa" id="wa">${icon("wa", "sm")}Avisar cliente no WhatsApp</button>` : ""}
      ${editing ? `<button class="btn danger" id="del">${icon("trash", "sm")}Excluir ordem</button>` : ""}
    </div></div>`;
}
function partBtn(id, st) { return `<button type="button" class="part ${st || ""}" data-p="${id}"><span>${esc(partName(id))}</span>${st ? `<em>${st === "trocada" ? "TROCAR" : "DEFEITO"}</em>` : ""}</button>`; }
export function readyMessage(r) {
  const first = (r.customer || "").split(" ")[0];
  const brand = (S.kv["profile.caleb"] || {}).brand || "Caleb";
  const quem = r.business === "caleb" ? `Aqui é ${brand}` : "Aqui é da IMPRTS";
  if (r.status === "pronto") return `Olá ${first}! ${quem}. Seu ${r.device} está pronto para retirada${r.budget != null ? `. Valor: ${money(r.budget)}` : ""}. Pode vir buscar, te esperamos!`;
  if (r.status === "aguardando_peca") return `Olá ${first}! ${quem}. Seu ${r.device} está aguardando a chegada da peça. Assim que chegar te avisamos.`;
  return `Olá ${first}! ${quem}. Atualização do seu ${r.device}: ${stTitle(r.status).toLowerCase()}.`;
}
export function osBind(root, id, rerender) {
  const d = od;
  const keep = () => {
    const v = s => $(s, root)?.value;
    d.customer = v("#cust") ?? d.customer; d.phone = digits(v("#phone")); d.device = v("#dev") ?? d.device; d.serial = v("#serial") ?? d.serial;
    d.passcode = v("#pass") ?? d.passcode; d.problem = v("#prob") ?? d.problem; d.budget = parseMoney(v("#budget")); d.parts_cost = parseMoney(v("#pcost"));
    d.due_at = v("#due") ? new Date(v("#due") + "T18:00:00").toISOString() : null; d.notes = v("#notes") ?? d.notes;
  };
  $("#phone", root).addEventListener("input", e => e.target.value = phoneMask(e.target.value));
  bindChips(root, "st", v => d.status = v); bindChips(root, "biz", v => d.business = v); bindChips(root, "cls", v => d.class_id = v || null);
  bindChips(root, "cat", v => { keep(); d.category = v; d.model_id = null; rerender(); });
  $("#model", root)?.addEventListener("change", e => { keep(); d.model_id = e.target.value || null; const m = model(d.model_id); if (m) d.device = m.name; rerender(); });
  $("#parts", root).addEventListener("click", e => {
    const b = e.target.closest(".part"); if (!b) return;
    const k = b.dataset.p, cur = d.parts[k], next = !cur ? "trocada" : cur === "trocada" ? "defeito" : null;
    if (next) d.parts[k] = next; else delete d.parts[k];
    b.outerHTML = partBtn(k, next);
  });
  $("#save", root).onclick = async () => {
    keep();
    if (!d.customer.trim()) return toast("Coloque o nome do cliente", true);
    if (!d.device.trim()) return toast("Descreva o aparelho", true);
    const fields = { customer: d.customer.trim(), phone: d.phone || "", device: d.device.trim(), category: d.category, model_id: d.model_id || null, color_id: d.color_id || null,
      serial: (d.serial || "").trim(), problem: (d.problem || "").trim(), parts: d.parts, budget: d.budget, parts_cost: d.parts_cost, status: d.status,
      notes: d.notes || "", passcode: d.passcode || "", due_at: d.due_at, business: d.business || "imprts", class_id: d.class_id || null };
    const btn = $("#save", root); btn.disabled = true;
    const editing = id !== "nova" ? S.repairs.find(r => r.id === id) : null;
    let saved = null;
    const ok = await run(async () => {
      if (editing) {
        const note = editing.status !== fields.status ? `${osNum(editing.number)}: ${stTitle(editing.status)} → ${stTitle(fields.status)}` : `editou ${osNum(editing.number)}`;
        saved = await updateRepair(id, fields, note);
      } else saved = await createRepair(fields);
    }, editing ? "Ordem salva" : "Ordem de serviço aberta");
    btn.disabled = false;
    if (!ok) return;
    od = null;
    const becameReady = saved.status === "pronto" && (!editing || editing.status !== "pronto");
    go("os", saved.id);
    if (becameReady && saved.phone) {
      const link = waLink(saved.phone, readyMessage(saved));
      if (link && await confirmSheet("Avisar o cliente?", `${saved.customer.split(" ")[0]} recebe no WhatsApp que o aparelho está pronto.`, "Abrir WhatsApp")) location.href = link;
    }
  };
  $("#wa", root)?.addEventListener("click", () => { keep(); const l = waLink(d.phone, readyMessage({ ...S.repairs.find(r => r.id === id), ...d })); if (l) location.href = l; else toast("Telefone inválido", true); });
  $("#del", root)?.addEventListener("click", async () => {
    const r = S.repairs.find(x => x.id === id);
    if (await confirmSheet("Excluir esta ordem?", `${osNum(r.number)} · ${r.customer}`, "Excluir", true)) { if (await run(() => updateRepair(id, { deleted: true }, `excluiu ${osNum(r.number)}`), "Ordem excluída")) { od = null; go("servicos"); } }
  });
}
export function resetOS() { od = null; }

// ————————————————— Tabela de Valores (mesma regra do Mac) —————————————————
export const SERVICES = ["tela", "vidroTraseiro", "bateria", "conector", "camTraseira", "camFrontal", "faceid", "touchid", "altoFalante", "microfone", "botoes", "vibracall", "sinal", "wifi", "nfc", "carcaca", "placa"];
const BASE = { tela: 320, vidroTraseiro: 220, bateria: 170, conector: 170, camTraseira: 260, camFrontal: 180, faceid: 420, touchid: 240, altoFalante: 140, microfone: 140, botoes: 140, vibracall: 150, sinal: 290, wifi: 330, nfc: 350, carcaca: 420, placa: 480 };
const book = () => S.kv.pricebook || {};
const originalExtra = () => book().original ?? 35;
const compatDiscount = () => book().compat ?? 25;
function defaultPrice(m, part) {
  if (!m || m.category !== "iphone" || !m.parts.includes(part) || BASE[part] == null) return null;
  let f = 1 + Math.max(0, m.year - 2017) * 0.2; const n = m.name;
  if (n.includes("Pro Max")) f *= 1.32; else if (n.includes("Pro")) f *= 1.2; else if (n.includes("Plus") || n.includes("Max")) f *= 1.12;
  else if (n.includes("Air")) f *= 1.15; else if (n.includes("mini") || n.includes("SE") || n.includes("16e")) f *= 0.88;
  if (part === "tela" && (/iPhone 8\b/.test(n) || n.includes("SE"))) f *= 0.75;
  return Math.round(BASE[part] * f / 10) * 10 - 1;
}
export function basePrice(modelId, part) { const o = (book().overrides || {})[modelId]; if (o && o[part] != null) return o[part]; return defaultPrice(model(modelId), part); }
export function priceFor(modelId, part, q) {
  const b = basePrice(modelId, part); if (b == null) return null;
  if (q === "original") return Math.round(b * (1 + originalExtra() / 100) / 10) * 10 - 1;
  if (q === "compativel") return Math.round(b * (1 - compatDiscount() / 100) / 10) * 10 - 1;
  return b;
}
const vl = { model: null };
export function valores() {
  const iphones = S.catalog.models.filter(m => m.category === "iphone").sort((a, b) => b.year - a.year);
  vl.model = vl.model || iphones[0]?.id;
  const m = model(vl.model);
  const ov = (book().overrides || {})[vl.model] || {};
  return `<div class="screen">${topbar({ title: "Valores", back: "#/mais" })}
    <p class="sub mt" style="margin-left:4px">Preço de cada serviço com mão de obra (peça Premium). Original e Compatível saem da porcentagem abaixo. Vale para todos os Macs e celulares.</p>
    <label class="field mt"><span>Modelo</span><select class="input" id="m">${iphones.map(x => `<option value="${x.id}" ${x.id === vl.model ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
    <div class="list mt">${SERVICES.filter(s => m.parts.includes(s)).map(s => `<div class="cell"><div class="grow"><div class="t">${esc(partName(s))}</div>
      <div class="s">Original ${money(priceFor(vl.model, s, "original"))} · Compatível ${money(priceFor(vl.model, s, "compativel"))}</div></div>
      <div class="money" style="width:118px"><input class="input" data-s="${s}" inputmode="decimal" value="${moneyInput(basePrice(vl.model, s))}" style="min-height:40px;padding-top:8px;padding-bottom:8px;${ov[s] != null ? "border-color:rgba(255,255,255,.4)" : ""}"></div></div>`).join("")}</div>
    <div class="grid2 mt">
      <label class="field"><span>Original (+%)</span><input class="input" id="orig" inputmode="numeric" value="${originalExtra()}"></label>
      <label class="field"><span>Compatível (−%)</span><input class="input" id="comp" inputmode="numeric" value="${compatDiscount()}"></label>
    </div>
    <div class="actions mt"><button class="btn metal" id="save">${icon("check", "sm")}Salvar valores</button><button class="btn ghost" id="reset">Voltar ao padrão neste modelo</button></div></div>`;
}
export function valoresBind(root, rerender) {
  $("#m", root).addEventListener("change", e => { vl.model = e.target.value; rerender(); });
  $("#save", root).onclick = async () => {
    const b = JSON.parse(JSON.stringify(book())); b.overrides = b.overrides || {};
    const m = model(vl.model), cur = {};
    for (const inp of $$("[data-s]", root)) { const v = parseMoney(inp.value), s = inp.dataset.s; if (v != null && v !== defaultPrice(m, s)) cur[s] = v; }
    if (Object.keys(cur).length) b.overrides[vl.model] = cur; else delete b.overrides[vl.model];
    b.original = +$("#orig", root).value || 0; b.compat = +$("#comp", root).value || 0;
    if (await run(() => setKV("pricebook", b), "Valores salvos")) rerender();
  };
  $("#reset", root).onclick = async () => {
    const b = JSON.parse(JSON.stringify(book())); if (b.overrides) delete b.overrides[vl.model];
    if (await run(() => setKV("pricebook", b), "Modelo voltou ao padrão")) rerender();
  };
}

// ————————————————— Orçamento (imagem pronta para o WhatsApp) —————————————————
const QSERV = { bateria: "Troca de bateria", tela: "Troca de tela", faceid: "Reparo do Face ID", touchid: "Reparo do Touch ID / botão Home", camTraseira: "Troca da câmera traseira",
  camFrontal: "Troca da câmera frontal", altoFalante: "Troca do alto-falante", microfone: "Troca do microfone", conector: "Troca do conector de carga", vidroTraseiro: "Troca da tampa traseira",
  botoes: "Reparo dos botões", vibracall: "Troca do motor de vibração", sinal: "Reparo de sinal / antena", wifi: "Reparo de Wi‑Fi / Bluetooth", nfc: "Reparo do NFC (aproximação)",
  placa: "Reparo na placa", carcaca: "Troca da carcaça" };
const QEXP = { bateria: "Bateria nova com saúde 100%: volta a durar o dia todo.", tela: "Display completo com vidro, touch e brilho originais de fábrica.", faceid: "Recupera o desbloqueio e o Apple Pay pelo rosto.",
  touchid: "Recupera o desbloqueio pela digital e o botão Home.", camTraseira: "Fotos e vídeos nítidos de novo, com foco funcionando.", camFrontal: "Selfies, FaceTime e chamadas de vídeo funcionando.",
  altoFalante: "Som limpo e alto em músicas, vídeos e viva-voz.", microfone: "Quem está na ligação volta a te ouvir bem.", conector: "Porta de carga nova: carrega e conecta sem mau contato.",
  vidroTraseiro: "Vidro traseiro novo na cor original do aparelho.", botoes: "Botões de volume, silencioso e liga/desliga respondendo.", vibracall: "Vibração e respostas ao toque funcionando.",
  sinal: "Volta a pegar operadora, ligações e dados móveis.", wifi: "Volta a conectar no Wi‑Fi e em fones Bluetooth.", nfc: "Pagamento por aproximação e leitura de NFC funcionando de novo.",
  placa: "Diagnóstico e micro-solda de componentes na placa.", carcaca: "Estrutura nova, sem amassados, na cor original." };
const QUAL = [{ id: "premium", title: "Premium" }, { id: "original", title: "Original" }, { id: "compativel", title: "Compatível" }];
const QNOTE = { original: "Peça original.", premium: "Peça premium de alta qualidade.", compativel: "Peça compatível, melhor custo." };
let qd = null;
export function orcamento() {
  if (!qd) qd = { customer: "", phone: "", model_id: null, free: "", reported: "", items: [], deadline: "2 dias", warranty: 90, validity: 7, discount: 0, business: isCaleb() ? "caleb" : "imprts" };
  const iphones = S.catalog.models.filter(m => m.category === "iphone").sort((a, b) => b.year - a.year);
  const m = model(qd.model_id);
  const sub = qd.items.reduce((a, i) => a + (i.price || 0), 0), total = Math.max(0, sub - (qd.discount || 0));
  return `<div class="screen">
    <div class="row between" style="padding-top:6px"><div class="big-title">Orçamento</div>${qd.items.length || qd.customer ? `<button class="link-btn" id="clear">Limpar</button>` : ""}</div>
    <div class="form mt">
      ${isCaleb() ? `<div class="field"><span>Em nome de</span>${chips("biz", [{ id: "imprts", title: "IMPRTS" }, { id: "caleb", title: (S.kv["profile.caleb"] || {}).brand || "Caleb (por fora)" }], qd.business)}</div>` : ""}
      <div class="grid2"><label class="field"><span>Cliente</span><input class="input" id="cust" value="${esc(qd.customer)}" autocapitalize="words"></label>
        <label class="field"><span>Telefone</span><input class="input" id="phone" type="tel" inputmode="tel" value="${esc(phoneMask(qd.phone))}"></label></div>
      <label class="field"><span>Aparelho</span><select class="input" id="model"><option value="">Outro (escrever)</option>${iphones.map(x => `<option value="${x.id}" ${x.id === qd.model_id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      ${m ? "" : `<input class="input" id="free" placeholder="Ex.: MacBook Air M1, Samsung S22…" value="${esc(qd.free)}">`}
      <label class="field"><span>Defeito relatado</span><input class="input" id="rep" value="${esc(qd.reported)}"></label>
      <div class="field"><span>Serviços</span>
        <div class="list">${qd.items.map((it, i) => `<div class="cell"><div class="grow"><div class="t">${esc(it.title)}</div><div class="s">${it.partID && it.partID !== "placa" ? esc((QUAL.find(q => q.id === it.quality) || {}).title) : "Serviço"}</div></div>
          <span class="price">${money(it.price)}</span><button class="icon-btn" data-rm="${i}" aria-label="Remover">${icon("x", "sm")}</button></div>`).join("") || `<div class="empty" style="padding:22px">Nenhum serviço ainda.</div>`}</div>
        <button class="btn ghost mt-s" id="add">${icon("plus", "sm")}Adicionar serviço</button></div>
      <div class="grid2">
        <label class="field"><span>Prazo</span><input class="input" id="dl" value="${esc(qd.deadline)}"></label>
        <label class="field"><span>Desconto</span><div class="money"><input class="input" id="disc" inputmode="decimal" value="${qd.discount ? moneyInput(qd.discount) : ""}"></div></label>
      </div>
      <div class="field"><span>Garantia</span>${chips("war", [30, 90, 180].map(d => ({ id: d, title: d === 180 ? "6 meses" : d + " dias" })), qd.warranty)}</div>
      <div class="card pad row between"><span class="muted">Total</span><span class="price" style="font-size:22px">${money(total)}</span></div>
      <button class="btn metal" id="gen" ${qd.items.length ? "" : "disabled"}>${icon("share", "sm")}Gerar orçamento</button>
    </div></div>`;
}
export function orcamentoBind(root, rerender) {
  const keep = () => {
    const v = s => $(s, root)?.value;
    qd.customer = v("#cust") ?? qd.customer; qd.phone = digits(v("#phone")); qd.free = v("#free") ?? qd.free; qd.reported = v("#rep") ?? qd.reported;
    qd.deadline = v("#dl") ?? qd.deadline; qd.discount = parseMoney(v("#disc")) || 0;
  };
  $("#phone", root).addEventListener("input", e => e.target.value = phoneMask(e.target.value));
  bindChips(root, "biz", v => qd.business = v); bindChips(root, "war", v => qd.warranty = +v);
  $("#model", root).addEventListener("change", e => { keep(); qd.model_id = e.target.value || null; qd.items = qd.items.map(it => it.partID ? { ...it, price: priceFor(qd.model_id, it.partID, it.quality) ?? it.price } : it); rerender(); });
  $("#disc", root).addEventListener("change", () => { keep(); rerender(); });
  $("#clear", root)?.addEventListener("click", () => { qd = null; rerender(); });
  root.addEventListener("click", e => { const rm = e.target.closest("[data-rm]"); if (rm) { keep(); qd.items.splice(+rm.dataset.rm, 1); rerender(); } });
  $("#add", root).onclick = () => { keep(); addItemSheet(rerender); };
  $("#gen", root).onclick = async () => { keep(); await generateQuote(); };
}
function addItemSheet(rerender) {
  const m = model(qd.model_id);
  const parts = (m ? SERVICES.filter(s => m.parts.includes(s)) : SERVICES);
  let q = "premium";
  const list = () => parts.map(p => `<button class="cell" data-p="${p}"><div class="grow"><div class="t">${esc(QSERV[p] || partName(p))}</div></div><span class="val">${m ? money(priceFor(m.id, p, p === "placa" ? "premium" : q)) : ""}</span></button>`).join("");
  const { el, close } = sheet(`<h2>Adicionar serviço</h2>
    <div class="field"><span>Qualidade da peça</span>${chips("q", QUAL, q)}</div>
    <div class="list mt" id="ps">${list()}</div>
    <div class="section-title">Outro serviço</div>
    <div class="grid2"><input class="input" id="t" placeholder="Descrição"><div class="money"><input class="input" id="v" inputmode="decimal" placeholder="0,00"></div></div>
    <button class="btn ghost mt-s" id="man">Adicionar este</button>`);
  bindChips(el, "q", v => { q = v; $("#ps", el).innerHTML = list(); });
  $("#ps", el).addEventListener("click", e => {
    const b = e.target.closest("[data-p]"); if (!b) return;
    const p = b.dataset.p, qual = p === "placa" ? "premium" : q;
    qd.items.push({ partID: p, title: QSERV[p] || partName(p), quality: qual, price: m ? priceFor(m.id, p, qual) : null });
    close(); rerender();
  });
  $("#man", el).onclick = () => { const t = $("#t", el).value.trim(); if (!t) return toast("Descreva o serviço", true); qd.items.push({ title: t, price: parseMoney($("#v", el).value), manual: true }); close(); rerender(); };
}
async function generateQuote() {
  const key = qd.business === "caleb" ? "caleb" : "imprts";
  const counters = { imprts: 0, caleb: 0, ...(S.kv.quotes || {}) };
  const number = (counters[key] || 0) + 1;
  try { await setKV("quotes", { ...counters, [key]: number }); } catch {}
  const m = model(qd.model_id);
  const device = m ? m.name : (qd.free || "Aparelho");
  const sub = qd.items.reduce((a, i) => a + (i.price || 0), 0), disc = Math.min(sub, qd.discount || 0), total = Math.max(0, sub - disc);
  const brand = qd.business === "caleb" ? ((S.kv["profile.caleb"] || {}).brand || "Caleb") : "IMPRTS";
  // ——— imagem 1080 de largura, no estilo do sistema ———
  const W = 1080, rows = qd.items.length, H = 980 + rows * 128 + (qd.reported ? 120 : 0);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d"), F = "-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif";
  x.fillStyle = "#0a0a0b"; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, 0, 0, W / 2, 0, 700); g.addColorStop(0, "rgba(255,255,255,.08)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, W, 700);
  let y = 110;
  x.fillStyle = "#f4f4f5"; x.textAlign = "left"; x.font = `300 64px ${F}`; x.fillText(brand, 72, y);
  x.textAlign = "right"; x.font = `500 26px ${F}`; x.fillStyle = "#9c9ca3"; x.fillText(`ORÇAMENTO Nº ${String(number).padStart(4, "0")}`, W - 72, y - 30);
  x.font = `400 24px ${F}`; x.fillText(new Date().toLocaleDateString("pt-BR"), W - 72, y + 6);
  y += 70;
  const card = (top, h) => { x.fillStyle = "#141416"; x.beginPath(); x.roundRect(48, top, W - 96, h, 28); x.fill(); x.strokeStyle = "#26262a"; x.lineWidth = 2; x.stroke(); };
  card(y, 170); x.textAlign = "left";
  x.fillStyle = "#9c9ca3"; x.font = `500 22px ${F}`; x.fillText("CLIENTE", 84, y + 50); x.fillText("APARELHO", 560, y + 50);
  x.fillStyle = "#f4f4f5"; x.font = `600 34px ${F}`; x.fillText((qd.customer || "—").slice(0, 26), 84, y + 100); x.fillText(device.slice(0, 24), 560, y + 100);
  x.fillStyle = "#9c9ca3"; x.font = `400 24px ${F}`; x.fillText(qd.phone ? phoneMask(qd.phone) : "", 84, y + 140);
  y += 210;
  if (qd.reported) { card(y, 100); x.fillStyle = "#9c9ca3"; x.font = `500 22px ${F}`; x.fillText("DEFEITO RELATADO", 84, y + 42); x.fillStyle = "#f4f4f5"; x.font = `400 28px ${F}`; x.fillText(qd.reported.slice(0, 60), 84, y + 80); y += 120; }
  x.fillStyle = "#9c9ca3"; x.font = `500 22px ${F}`; x.fillText("SERVIÇOS", 84, y + 10); y += 30;
  for (const it of qd.items) {
    card(y, 112);
    x.fillStyle = "#f4f4f5"; x.font = `600 30px ${F}`; x.textAlign = "left"; x.fillText(it.title.slice(0, 40), 84, y + 48);
    const det = it.manual ? "Serviço técnico especializado." : ((QEXP[it.partID] || "Serviço técnico especializado.") + (it.partID && it.partID !== "placa" ? " " + QNOTE[it.quality] : ""));
    x.fillStyle = "#9c9ca3"; x.font = `400 21px ${F}`; x.fillText(det.slice(0, 74), 84, y + 84);
    x.textAlign = "right"; x.fillStyle = "#f4f4f5"; x.font = `600 32px ${F}`; x.fillText(money(it.price), W - 84, y + 48); x.textAlign = "left";
    y += 128;
  }
  y += 10; card(y, disc ? 210 : 150);
  x.fillStyle = "#9c9ca3"; x.font = `400 26px ${F}`; x.fillText("Subtotal", 84, y + 52); x.textAlign = "right"; x.fillText(money(sub), W - 84, y + 52); x.textAlign = "left";
  if (disc) { x.fillText("Desconto", 84, y + 100); x.textAlign = "right"; x.fillStyle = "#34c77b"; x.fillText("− " + money(disc), W - 84, y + 100); x.textAlign = "left"; }
  x.fillStyle = "#f4f4f5"; x.font = `700 44px ${F}`; x.fillText("Total", 84, y + (disc ? 172 : 118)); x.textAlign = "right"; x.fillText(money(total), W - 84, y + (disc ? 172 : 118)); x.textAlign = "left";
  y += (disc ? 210 : 150) + 40;
  x.fillStyle = "#9c9ca3"; x.font = `400 24px ${F}`;
  x.fillText(`Prazo: ${qd.deadline}  ·  Garantia: ${qd.warranty} dias  ·  Válido por ${qd.validity} dias`, 84, y);
  const st = S.kv.store || {};
  x.fillStyle = "#66666d"; x.font = `400 22px ${F}`; x.fillText([st.whatsapp ? "WhatsApp " + phoneMask(st.whatsapp) : "", st.instagram ? "@" + st.instagram : "", "importsbrasil.com"].filter(Boolean).join("  ·  "), 84, y + 46);
  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  const file = new File([blob], `orcamento-${String(number).padStart(4, "0")}.png`, { type: "image/png" });
  const text = `Orçamento ${brand} nº ${String(number).padStart(4, "0")}\n${device}\n` + qd.items.map(i => `• ${i.title}: ${money(i.price)}`).join("\n") + `\nTotal: ${money(total)}`;
  const { el } = sheet(`<h2>Orçamento nº ${String(number).padStart(4, "0")}</h2><p class="sub">Pronto para mandar ao cliente.</p>
    <img src="${URL.createObjectURL(blob)}" alt="" style="width:100%;border-radius:16px;border:1px solid var(--hair)">
    <div class="actions mt">${navigator.canShare && navigator.canShare({ files: [file] }) ? `<button class="btn metal" id="sh">${icon("share", "sm")}Compartilhar imagem</button>` : `<a class="btn metal" download="${file.name}" href="${URL.createObjectURL(blob)}">${icon("download", "sm")}Baixar imagem</a>`}
    ${qd.phone ? `<a class="btn wa" href="${waLink(qd.phone, text)}">${icon("wa", "sm")}Mandar texto no WhatsApp</a>` : ""}</div>`);
  $("#sh", el)?.addEventListener("click", () => navigator.share({ files: [file], title: `Orçamento ${String(number).padStart(4, "0")}` }).catch(() => {}));
}
