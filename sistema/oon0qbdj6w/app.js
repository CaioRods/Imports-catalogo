// IMPRTS web — entrada, navegação e barra de abas.
import { S, ACCOUNTS, DEMO, restoreSession, loadCatalog, sync, startSync, onChange, logout, pinOf } from "./core.js?v=1791417342";
import { $, icon, route, go, toast, watchScroll } from "./ui.js?v=1791417342";
import * as E from "./telas-estoque.js?v=1791417342";
import * as V from "./telas-servicos.js?v=1791417342";
import * as M from "./telas-mais.js?v=1791417342";

const KEEP_PIN_HOURS = 8;
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

// telas: [desenhar, ligar eventos, redesenha sozinha quando chegam dados?, aba]
const SCREENS = {
  inicio: [E.inicio, null, true, "inicio"],
  estoque: [E.estoque, E.estoqueBind, true, "estoque"],
  produto: [E.produto, E.produtoBind, true, "estoque"],
  cadastrar: [() => E.editor(null), (r, a, re) => E.editorBind(r, null, re), false, "cadastrar"],
  editar: [E.editor, E.editorBind, false, "estoque"],
  etiquetas: [E.etiquetas, E.etiquetasBind, true, "mais"],
  servicos: [V.servicos, V.servicosBind, true, "servicos"],
  os: [V.os, V.osBind, false, "servicos"],
  orcamento: [V.orcamento, V.orcamentoBind, false, "orcamento"],
  valores: [V.valores, V.valoresBind, false, "mais"],
  vendas: [M.vendas, M.vendasBind, true, "mais"],
  clientes: [M.clientes, M.clientesBind, false, "mais"],
  ajustes: [M.ajustes, (r, a, re) => M.ajustesBind(r, re, chooseProfile), false, "ajustes"],
  mais: [M.mais, null, false, "mais"],
};
// permissão: telas de detalhe herdam da lista
const NEEDS = { produto: "estoque", editar: "cadastrar", os: "servicos", mais: "mais" };
const allowed = page => page === "mais" ? S.user.pages.includes("inicio") : S.user.pages.includes(NEEDS[page] || page);

function tabs() {
  const normal = [["inicio", "home", "Início"], ["estoque", "stock", "Estoque"], ["cadastrar", "plus", ""], ["servicos", "wrench", "Serviços"], ["mais", "more", "Mais"]];
  const caleb = [["servicos", "wrench", "Serviços"], ["orcamento", "quote", "Orçamento"], ["ajustes", "settings", "Ajustes"]];
  return S.user.pages.includes("inicio") ? normal : caleb;
}
function tabbar(active) {
  return `<nav class="tabbar">${tabs().map(([id, ic, t]) => id === "cadastrar"
    ? `<a class="tab" href="#/cadastrar" aria-label="Cadastrar"><span class="plus">${icon("plus")}</span></a>`
    : `<a class="tab ${active === id ? "on" : ""}" href="#/${id}">${icon(ic)}<span>${t}</span></a>`).join("")}</nav>`;
}

let current = { page: null, arg: null }, lastPage = null;
function render(fromData = false) {
  if (!S.user) return;
  let { page, arg } = route();
  if (!page || !SCREENS[page] || !allowed(page)) { page = S.user.pages[0]; arg = null; history.replaceState(null, "", "#/" + page); }
  const [draw, bind, live, tab] = SCREENS[page];
  if (fromData) {
    // não mexe em formulário aberto nem em campo sendo digitado
    if (!live || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) return;
    if ($("#sheets").children.length) return;
  }
  // abrir o cadastro/edição vindo de outra tela começa do zero
  if (!fromData && (page === "cadastrar" || page === "editar") && lastPage !== page) E.resetDraft();
  if (!fromData && page === "os" && (lastPage !== "os" || current.arg !== arg)) V.resetOS();
  const sameScreen = current.page === page && current.arg === arg;
  const y = scrollY;
  const app = $("#app");
  app.innerHTML = draw(arg) + tabbar(tab);
  const screen = app.firstElementChild;
  const rerender = () => render(false);
  bind && bind(screen, arg, rerender);
  if (fromData || sameScreen) scrollTo(0, y); else scrollTo(0, 0);
  watchScroll();
  lastPage = page; current = { page, arg };
}

async function enter(acct) {
  S.user = acct;
  store.set("imprts.web.user", { id: acct.id, at: Date.now() });
  startSync();
  render();
}
function chooseProfile() {
  S.user = null; store.set("imprts.web.user", null);
  M.profileScreen(acct => {
    if (!pinOf(acct.id)) return enter(acct);
    M.pinScreen(acct, () => enter(acct), chooseProfile);
  });
}

async function afterLogin() {
  $("#app").innerHTML = `<div class="gate"><div class="spinner"></div><div class="sub mt">Carregando o estoque…</div></div>`;
  try { await sync(true); }
  catch (e) {
    if (e.auth || e.status === 401) { logout(); return M.loginScreen(afterLogin); }
    $("#app").innerHTML = `<div class="gate"><div class="sub">Sem conexão com o banco agora.</div><button class="btn ghost mt" style="max-width:240px" onclick="location.reload()">Tentar de novo</button></div>`;
    return;
  }
  const saved = store.get("imprts.web.user");
  const acct = saved && ACCOUNTS.find(a => a.id === saved.id);
  if (acct && Date.now() - saved.at < KEEP_PIN_HOURS * 36e5) return enter(acct);
  chooseProfile();
}

async function boot() {
  if ("serviceWorker" in navigator && !DEMO) navigator.serviceWorker.register("sw.js").catch(() => {});
  try { await loadCatalog(); } catch { $("#app").innerHTML = `<div class="gate"><div class="sub">Não foi possível abrir. Confira a internet.</div></div>`; return; }
  addEventListener("hashchange", () => render(false));
  onChange(() => render(true));
  addEventListener("offline", () => toast("Sem internet: as mudanças não vão salvar até voltar", true));
  // usar o app renova o tempo do PIN
  addEventListener("pointerdown", () => { if (S.user) store.set("imprts.web.user", { id: S.user.id, at: Date.now() }); }, { passive: true });
  if (DEMO) { await (await import("./core.js?v=1791417342")).login("demo@imprts", "demo"); return afterLogin(); }
  if (restoreSession()) afterLogin(); else M.loginScreen(afterLogin);
}
boot();
