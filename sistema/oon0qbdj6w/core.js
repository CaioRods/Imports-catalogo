// IMPRTS web — dados: login na conta da loja, banco (mesmos campos do app do Mac), sincronização e fotos.
export const CLOUD = {
  url: "https://evaeprbbctemcnltjuwn.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YWVwcmJiY3RlbWNubHRqdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTY4MTUsImV4cCI6MjEwNjE5MjgxNX0.IIhiVVFu4IdBm_Q8JN8GCftjW0r6wzrM0esHszjczVk",
};
export const DEMO = new URLSearchParams(location.search).has("demo");

// Mesmas colunas do SyncEngine.swift (se o banco ganhar coluna nova, mudar nos dois)
export const PCOLS = "id,code,category,model_id,color_id,name,storage,ram,chip,serial,battery_health,condition,parts,cost,price,status,notes,publish,created_at,updated_at,created_by,sold_at,sold_price,sold_by,buyer,buyer_phone,payment,warranty_days,label_printed_at,deleted,description,photos,cover,promo_price,promo_until";
export const RCOLS = "id,number,customer,phone,device,category,model_id,color_id,serial,problem,parts,budget,parts_cost,status,notes,passcode,created_at,updated_at,due_at,delivered_at,created_by,business,class_id,deleted";

export const ACCOUNTS = [
  { id: "rafael", title: "Rafael", role: "Dono", owner: true, pages: ["inicio", "estoque", "cadastrar", "servicos", "vendas", "orcamento", "clientes", "etiquetas", "valores", "ajustes"] },
  { id: "funcionario", title: "Funcionário", role: "Equipe", pages: ["inicio", "estoque", "cadastrar", "servicos", "vendas", "orcamento", "clientes", "etiquetas", "ajustes"] },
  { id: "caleb", title: "Caleb", role: "Técnico", pages: ["servicos", "orcamento", "ajustes"] },
];

export const S = {
  session: null, user: null, catalog: null,
  products: [], repairs: [], activity: [], kv: {},
  cursors: {}, loaded: false, online: navigator.onLine, lastSync: null, listeners: new Set(),
};
export function onChange(fn) { S.listeners.add(fn); return () => S.listeners.delete(fn); }
function emit() { S.listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// nome e foto dos perfis antes de entrar (o resto do banco só depois do PIN); guarda para abrir rápido
export async function loadProfiles() {
  const put = o => { for (const [id, v] of Object.entries(o || {})) S.kv["profile." + id] = { ...(S.kv["profile." + id] || {}), ...v }; };
  put(store.get("imprts.web.perfis"));
  if (DEMO) return;
  try {
    const r = await fetch("/api/sistema-entrar", { signal: AbortSignal.timeout(5000) });
    if (r.ok) { const o = await r.json(); store.set("imprts.web.perfis", o); put(o); }
  } catch {}
}

// ——— entrada: perfil + PIN, conferido no servidor (api/sistema-entrar.js), que devolve a sessão da conta da loja ———
// Devolve true se entrou, false se o PIN está errado; outros casos viram erro com a mensagem para a tela.
export async function entrar(conta, pin) {
  if (DEMO) { S.session = { email: "demo@imprts", access_token: "demo", expires_at: Date.now() + 1e9 }; store.set("imprts.web.session", S.session); return true; }
  const r = await fetch("/api/sistema-entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conta, pin }) });
  const j = await r.json().catch(() => ({}));
  if (r.ok) { saveSession(j); return true; }
  if (j.erro === "pin") return false;
  if (j.erro === "bloqueado") { const m = Math.ceil(j.segundos / 60); throw new Error(`Muitos PINs errados. Tente de novo em ${m >= 60 ? Math.ceil(m / 60) + " h" : m + " min"}.`); }
  if (j.erro === "sem-pin") throw new Error("Este perfil não tem PIN. Crie um PIN no Mac primeiro.");
  throw new Error(j.msg || "Não foi possível entrar agora");
}
function saveSession(j) {
  S.session = { email: j.user?.email || S.session?.email, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 };
  store.set("imprts.web.session", S.session);
}
export function restoreSession() { S.session = store.get("imprts.web.session"); return !!S.session; }
export function logout() {
  S.session = null; S.user = null; store.set("imprts.web.session", null); store.set("imprts.web.user", null);
  S.products = []; S.repairs = []; S.activity = []; S.kv = {}; S.cursors = {}; S.loaded = false;
}
let refreshing = null;
async function token() {
  if (DEMO) return "demo";
  if (!S.session) throw new Error("sem sessão");
  if (Date.now() < S.session.expires_at - 60000) return S.session.access_token;
  // acesso criado pelo servidor (sem renovação): venceu, pede o PIN de novo
  if (!S.session.refresh_token) { const e = new Error("Sessão expirada. Entre de novo."); e.auth = true; throw e; }
  refreshing = refreshing || (async () => {
    const r = await fetch(`${CLOUD.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: { apikey: CLOUD.key, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: S.session.refresh_token }),
    });
    if (!r.ok) { const e = new Error("Sessão expirada. Entre de novo."); e.auth = true; throw e; }
    saveSession(await r.json());
  })().finally(() => { refreshing = null; });
  await refreshing;
  return S.session.access_token;
}

export async function rest(method, path, body, prefer) {
  if (DEMO) return demoRest(method, path, body);
  const go = async () => fetch(`${CLOUD.url}/rest/v1/${path}`, {
    method,
    headers: { apikey: CLOUD.key, Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  let r = await go();
  if (r.status === 401 && S.session) { S.session.expires_at = 0; r = await go(); }
  if (!r.ok) { const t = await r.text(); const e = new Error(t || `Erro ${r.status}`); e.status = r.status; throw e; }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// ——— dados ———
export async function loadCatalog() {
  if (S.catalog) return S.catalog;
  S.catalog = await (await fetch("catalogo.json")).json();
  S.catalog.byId = Object.fromEntries(S.catalog.models.map(m => [m.id, m]));
  S.catalog.partById = Object.fromEntries(S.catalog.parts.map(p => [p.id, p]));
  return S.catalog;
}

function mergeRows(list, rows) {
  const idx = new Map(list.map((x, i) => [x.id, i]));
  for (const r of rows) { if (idx.has(r.id)) list[idx.get(r.id)] = r; else { idx.set(r.id, list.length); list.push(r); } }
}
const enc = s => encodeURIComponent(s);

export async function sync(full = false) {
  if (!S.session) return;
  const c = full ? {} : S.cursors;
  const q = (base, field) => base + (c[field] ? `&updated_at=gt.${enc(c[field])}` : "");
  const [p, r, kv, act] = await Promise.all([
    rest("GET", q(`products?select=${PCOLS}&order=updated_at.asc&limit=5000`, "p")),
    rest("GET", q(`repairs?select=${RCOLS}&order=updated_at.asc&limit=5000`, "r")),
    rest("GET", q(`kv?select=key,value,updated_at&order=updated_at.asc&limit=500`, "kv")),
    rest("GET", `activity?select=id,at,actor,kind,text,product_code&order=at.desc&limit=80`),
  ]);
  if (full) { S.products = []; S.repairs = []; }
  mergeRows(S.products, p); mergeRows(S.repairs, r);
  for (const row of kv) S.kv[row.key] = row.value;
  S.activity = act;
  const last = (rows, cur) => rows.length ? rows[rows.length - 1].updated_at : cur;
  S.cursors = { p: last(p, c.p), r: last(r, c.r), kv: last(kv, c.kv) };
  S.loaded = true; S.lastSync = new Date(); S.online = true;
  emit();
}
let timer = null;
export function startSync() {
  stopSync();
  const tick = () => sync().catch(e => { if (e.auth) { logout(); location.reload(); return; } S.online = navigator.onLine; emit(); });
  timer = setInterval(() => { if (!document.hidden) tick(); }, 15000);
  document.addEventListener("visibilitychange", onVis);
  addEventListener("online", tick);
}
function onVis() { if (!document.hidden) sync().catch(() => {}); }
export function stopSync() { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); }

// ——— gravações (iguais ao Store.swift do Mac) ———
const now = () => new Date().toISOString();
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }));

export async function logActivity(kind, text, code) {
  const a = { id: uuid(), at: now(), actor: S.user.id, kind, text, product_code: code ?? null };
  S.activity.unshift(a); emit();
  try { await rest("POST", "activity?on_conflict=id&columns=id,at,actor,kind,text,product_code", [a], "resolution=ignore-duplicates,return=minimal"); } catch (e) { console.warn(e); }
}

export async function createProduct(fields) {
  const p = { ...blankProduct(), ...fields, id: uuid(), created_at: now(), updated_at: now(), created_by: S.user.id };
  delete p.code;
  const cols = PCOLS.split(",").filter(c => c !== "code").join(",");
  const [back] = await rest("POST", `products?columns=${cols}`, [p], "return=representation");
  mergeRows(S.products, [back]); emit();
  logActivity("cadastro", `cadastrou ${back.name}`, back.code);
  return back;
}
export async function updateProduct(id, fields, note) {
  const body = { ...fields, updated_at: now() };
  const [back] = await rest("PATCH", `products?id=eq.${id}`, body, "return=representation");
  mergeRows(S.products, [back]); emit();
  if (note) logActivity(fields.status === "vendido" ? "venda" : "edicao", note, back.code);
  return back;
}
export async function createRepair(fields) {
  const r = { ...blankRepair(), ...fields, id: uuid(), created_at: now(), updated_at: now(), created_by: S.user.id };
  delete r.number;
  const cols = RCOLS.split(",").filter(c => c !== "number").join(",");
  const [back] = await rest("POST", `repairs?columns=${cols}`, [r], "return=representation");
  mergeRows(S.repairs, [back]); emit();
  logActivity(back.business === "caleb" ? "caleb" : "reparo", `abriu ordem de serviço para ${back.customer} · ${back.device}`, null);
  return back;
}
export async function updateRepair(id, fields, note) {
  const old = S.repairs.find(r => r.id === id) || {};
  const body = { ...fields, updated_at: now() };
  if (fields.status === "entregue" && !old.delivered_at && !fields.delivered_at) body.delivered_at = now();
  const [back] = await rest("PATCH", `repairs?id=eq.${id}`, body, "return=representation");
  mergeRows(S.repairs, [back]); emit();
  if (note) logActivity(back.business === "caleb" ? "caleb" : "reparo", note, null);
  return back;
}
export async function setKV(key, value) {
  S.kv[key] = value; emit();
  await rest("POST", "kv?on_conflict=key", [{ key, value }], "resolution=merge-duplicates,return=minimal");
}

// ——— fotos do site (pasta "produtos") ———
export function photoURL(path) { return `${CLOUD.url}/storage/v1/object/public/produtos/${path}`; }
export async function uploadPhoto(productId, blob) {
  const path = `${productId.toLowerCase()}/${uuid().slice(0, 12)}.jpg`;
  if (DEMO) return path;
  const r = await fetch(`${CLOUD.url}/storage/v1/object/produtos/${path}`, {
    method: "POST", headers: { apikey: CLOUD.key, Authorization: `Bearer ${await token()}`, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: blob,
  });
  if (!r.ok) throw new Error("Não foi possível enviar a foto");
  return path;
}
export async function removePhoto(path) {
  if (DEMO) return;
  try { await fetch(`${CLOUD.url}/storage/v1/object/produtos/${path}`, { method: "DELETE", headers: { apikey: CLOUD.key, Authorization: `Bearer ${await token()}` } }); } catch {}
}
export async function rpc(fn, args) { return rest("POST", `rpc/${fn}`, args); }

// ——— PIN (mesmo formato do Mac: "sal:sha256(sal+pin)") ———
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
export function pinOf(acct) { return (S.kv.pins || {})[acct] || ""; }
export async function checkPIN(acct, pin) {
  const stored = pinOf(acct); if (!stored) return true;
  const [salt, hash] = stored.split(":"); return (await sha256(salt + pin)) === hash;
}
export async function setPIN(acct, pin) {
  const salt = uuid().toUpperCase();
  const pins = { ...(S.kv.pins || {}), [acct]: pin ? `${salt}:${await sha256(salt + pin)}` : "" };
  await setKV("pins", pins);
}

// ——— modelos em branco ———
export function blankProduct() {
  return { category: "iphone", model_id: null, color_id: null, name: "", storage: null, ram: null, chip: null, serial: "", battery_health: null,
    condition: "seminovo", parts: {}, cost: null, price: null, status: "disponivel", notes: "", publish: true, sold_at: null, sold_price: null,
    sold_by: null, buyer: null, buyer_phone: null, payment: null, warranty_days: null, label_printed_at: null, deleted: false,
    description: "", photos: [], cover: null, promo_price: null, promo_until: null };
}
export function blankRepair() {
  return { customer: "", phone: "", device: "", category: "iphone", model_id: null, color_id: null, serial: "", problem: "", parts: {},
    budget: null, parts_cost: null, status: "recebido", notes: "", passcode: "", due_at: null, delivered_at: null, business: "imprts", class_id: null, deleted: false };
}

// ——— demonstração (?demo): dados de exemplo só na memória, para testar as telas ———
let demoSeq = { code: 31, number: 58 };
function demoRest(method, path, body) {
  const table = path.split("?")[0];
  if (method === "GET") {
    if (table === "products") return Promise.resolve(S.loaded ? [] : demoData.products());
    if (table === "repairs") return Promise.resolve(S.loaded ? [] : demoData.repairs());
    if (table === "kv") return Promise.resolve(S.loaded ? [] : demoData.kv());
    if (table === "activity") return Promise.resolve(S.activity.length ? S.activity : demoData.activity());
    return Promise.resolve([]);
  }
  if (table === "rpc/site_stats") return Promise.resolve(demoData.stats());
  if (method === "POST" && table === "products") return Promise.resolve(body.map(p => ({ ...p, code: demoSeq.code++ })));
  if (method === "POST" && table === "repairs") return Promise.resolve(body.map(r => ({ ...r, number: demoSeq.number++ })));
  if (method === "PATCH") {
    const id = (path.match(/id=eq\.([^&]+)/) || [])[1];
    const list = table === "products" ? S.products : S.repairs;
    const cur = list.find(x => x.id === id);
    return Promise.resolve([{ ...cur, ...body }]);
  }
  return Promise.resolve(null);
}
const demoData = {
  products() {
    const d = (n) => new Date(Date.now() - n * 864e5).toISOString();
    const P = (code, model, color, name, storage, batt, price, cost, extra = {}) => ({ ...blankProduct(), id: uuid(), code, category: model.startsWith("mb") ? "macbook" : "iphone",
      model_id: model, color_id: color, name, storage, battery_health: batt, price, cost, created_at: d(code % 20), updated_at: d(code % 20), created_by: "rafael", ...extra });
    return [
      P(30, "iphone-16-pro", "titanio-deserto", "iPhone 16 Pro 256 GB Titânio-deserto", "256 GB", 98, 6990, 5600, { promo_price: 6590 }),
      P(29, "iphone-15-pro-max", "titanio-natural", "iPhone 15 Pro Max 256 GB Titânio natural", "256 GB", 91, 6490, 5200, { parts: { bateria: "trocada" } }),
      P(28, "iphone-14", "meia-noite", "iPhone 14 128 GB Meia-noite", "128 GB", 77, 2390, 1800),
      P(27, "iphone-13", "azul", "iPhone 13 128 GB Azul", "128 GB", 64, 1990, 1500, { parts: { tela: "trocada", camFrontal: "defeito" } }),
      P(26, "iphone-11", "roxo", "iPhone 11 128 GB Roxo", "128 GB", 84, 1290, 900, { label_printed_at: null }),
      P(25, "iphone-15", "rosa", "iPhone 15 128 GB Rosa", "128 GB", 100, 3990, 3300, { condition: "novo" }),
      P(24, "iphone-12", "verde", "iPhone 12 64 GB Verde", "64 GB", 82, 1490, 1100, { status: "vendido", sold_at: d(0), sold_price: 1450, sold_by: "funcionario", payment: "pix", buyer: "Marina Costa" }),
      P(23, "iphone-13-pro", "azul-sierra", "iPhone 13 Pro 256 GB Azul-sierra", "256 GB", 88, 3690, 2900, { status: "vendido", sold_at: d(2), sold_price: 3600, sold_by: "rafael", payment: "credito", buyer: "João Lima" }),
      P(22, "iphone-xr", "coral", "iPhone XR 64 GB Coral", "64 GB", 81, 990, 650, { status: "reservado" }),
    ];
  },
  repairs() {
    const d = (n) => new Date(Date.now() - n * 864e5).toISOString();
    const R = (number, customer, device, problem, status, extra = {}) => ({ ...blankRepair(), id: uuid(), number, customer, phone: "18998765432", device, problem, status, budget: 450, created_at: d(number % 5), updated_at: d(number % 5), created_by: "caleb", ...extra });
    return [
      R(57, "Fernanda Luz", "iPhone 12", "Tela quebrada, touch falhando no canto", "pronto", { class_id: "c1" }),
      R(56, "Pedro Lima", "iPhone 13 Pro", "Bateria descarregando rápido", "em_reparo"),
      R(55, "Ana Souza", "iPhone 11", "Não carrega", "aguardando_peca"),
      R(54, "Lucas Prado", "iPhone XR", "Face ID parou", "recebido", { due_at: d(-1) }),
      R(53, "Carla Dias", "iPhone 14", "Troca de tampa traseira", "entregue", { delivered_at: d(1) }),
    ];
  },
  kv() {
    return [
      { key: "pins", value: { rafael: "", funcionario: "", caleb: "" }, updated_at: new Date().toISOString() },
      { key: "classes", value: [{ id: "c1", name: "Urgente", color: 0xff4d4f }, { id: "c2", name: "Garantia", color: 0x4c9dff }], updated_at: new Date().toISOString() },
      { key: "store", value: { whatsapp: "5518998126640", instagram: "rvrodriguess", address: "", warranty: 90 }, updated_at: new Date().toISOString() },
    ];
  },
  activity() {
    const t = (m) => new Date(Date.now() - m * 6e4).toISOString();
    return [
      { id: uuid(), at: t(12), actor: "funcionario", kind: "venda", text: "vendeu 024 · iPhone 12 64 GB Verde por R$ 1.450,00", product_code: 24 },
      { id: uuid(), at: t(55), actor: "rafael", kind: "cadastro", text: "cadastrou iPhone 16 Pro 256 GB Titânio-deserto", product_code: 30 },
      { id: uuid(), at: t(140), actor: "caleb", kind: "reparo", text: "abriu ordem de serviço para Pedro Lima · iPhone 13 Pro", product_code: null },
    ];
  },
  stats() {
    return { visitors: 214, sessions: 287, views: 642, avg_seconds: 156, mobile: 181, leads: 3,
      top: [{ code: 30, views: 120, clicks: 80, seconds: 70, people: 90, leads: 2 }, { code: 28, views: 95, clicks: 60, seconds: 52, people: 70, leads: 1 }, { code: 25, views: 61, clicks: 33, seconds: 40, people: 48, leads: 0 }],
      referrers: [{ from: "instagram", n: 132 }, { from: "direto", n: 51 }, { from: "whatsapp", n: 22 }],
      days: Array.from({ length: 7 }, (_, i) => ({ day: new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10), visitors: [22, 31, 18, 40, 27, 35, 41][i], views: 80 })),
      people: [{ id: "a", created_at: new Date(Date.now() - 36e5).toISOString(), name: "Maria Fernanda Souza", phone: "5518998765432", email: "maria@gmail.com", code: 30, product: "iPhone 16 Pro 256 GB Titânio-deserto", price: 6590, status: "novo", note: "", viewed: [28, 25], seconds: 412, visits: 3 }] };
  },
};
