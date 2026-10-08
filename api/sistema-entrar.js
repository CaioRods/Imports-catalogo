// Entrada do sistema do celular só com perfil + PIN.
// O servidor fala com o banco usando um segredo guardado na Vercel (nunca no site), de um destes jeitos:
//   IMPRTS_JWT_SECRET: a "JWT Secret" (legada) do projeto no Supabase. Não precisa de conta: o servidor
//     cria um acesso de 12 horas em nome da conta da loja mais antiga de contas_loja (a dos Macs).
//     Quando vence, o celular pede o PIN de novo. Se estiver definida, vale mais que e-mail e senha.
//   IMPRTS_EMAIL + IMPRTS_SENHA: e-mail e senha de uma conta da loja (alternativa).
// O PIN é conferido aqui, com a trava de erros do banco (pin_reservar), e só com o PIN certo o celular
// recebe o acesso.
const crypto = require("crypto");
const SUPABASE = "https://evaeprbbctemcnltjuwn.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YWVwcmJiY3RlbWNubHRqdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTY4MTUsImV4cCI6MjEwNjE5MjgxNX0.IIhiVVFu4IdBm_Q8JN8GCftjW0r6wzrM0esHszjczVk";
const CONTAS = ["rafael", "funcionario", "caleb"];
const HORAS = 12;

// tira espaço e aspas que às vezes vão junto ao colar na Vercel
const limpa = v => String(v || "").trim().replace(/^["']|["']$/g, "");
class Config extends Error {}

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
async function rpc(token, fn, args) {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, {
    method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const b64 = o => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
function jwt(secret, claims) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: "HS256", typ: "JWT" }) + "." + b64({ iss: `${SUPABASE}/auth/v1`, iat: now, ...claims });
  return body + "." + crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

// Acesso da conta da loja: { access_token, refresh_token?, expires_in, email }
async function sessao() {
  const secret = limpa(process.env.IMPRTS_JWT_SECRET), email = limpa(process.env.IMPRTS_EMAIL), senha = limpa(process.env.IMPRTS_SENHA);
  if (secret) {
    const now = Math.floor(Date.now() / 1000);
    const admin = jwt(secret, { role: "service_role", exp: now + 60 });
    const r = await fetch(`${SUPABASE}/rest/v1/contas_loja?select=user_id,email&order=added_at.asc&limit=1`,
      { headers: { apikey: ANON, Authorization: `Bearer ${admin}` } });
    if (r.status === 401) throw new Config("A chave do servidor não confere com o banco (IMPRTS_JWT_SECRET)");
    if (!r.ok) throw new Error(`contas_loja: ${r.status} ${await r.text()}`);
    const c = (await r.json())[0];
    if (!c) throw new Config("Nenhuma conta da loja em contas_loja");
    const exp = now + HORAS * 3600;
    return { access_token: jwt(secret, { aud: "authenticated", role: "authenticated", sub: c.user_id, email: c.email, exp }), expires_in: HORAS * 3600, email: c.email };
  }
  if (!email || !senha) throw new Config("Servidor sem a chave do banco configurada");
  const r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: senha }),
  });
  const s = await r.json().catch(() => ({}));
  if (!r.ok) throw new Config(`A conta da loja no servidor não entrou (${s.error_code || s.error || r.status})`);
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in, email: s.user?.email };
}

// GET: só nome e foto dos perfis, para a tela "Quem está usando?" antes de entrar
async function perfis(res) {
  try {
    const s = await sessao();
    const keys = CONTAS.map(c => `"profile.${c}"`).join(",");
    const r = await fetch(`${SUPABASE}/rest/v1/kv?key=in.(${encodeURIComponent(keys)})&select=key,value`, { headers: { apikey: ANON, Authorization: `Bearer ${s.access_token}` } });
    if (!r.ok) throw new Error(`kv: ${r.status}`);
    const out = {};
    for (const row of await r.json()) { const v = row.value || {}; out[row.key.slice(8)] = { name: v.name || null, photo: v.photo || null }; }
    return reply(res, 200, out);
  } catch (e) {
    console.error(e);
    return reply(res, 500, { erro: "servidor" });
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") return perfis(res);
  if (req.method !== "POST") return reply(res, 405, { erro: "metodo" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const conta = String(body?.conta || ""), pin = String(body?.pin || "");
  if (!CONTAS.includes(conta) || !/^\d{4}$/.test(pin)) return reply(res, 400, { erro: "dados" });

  try {
    const s = await sessao();

    const espera = await rpc(s.access_token, "pin_reservar", { p_conta: conta });
    if (espera > 0) return reply(res, 429, { erro: "bloqueado", segundos: espera });

    const k = await fetch(`${SUPABASE}/rest/v1/kv?key=eq.pins&select=value`, { headers: { apikey: ANON, Authorization: `Bearer ${s.access_token}` } });
    if (!k.ok) throw new Error(`kv: ${k.status}`);
    const guardado = String(((await k.json())[0]?.value || {})[conta] || "");
    // perfil sem PIN não entra por aqui: sem PIN, qualquer um entraria
    if (!guardado.includes(":")) return reply(res, 403, { erro: "sem-pin" });
    const [sal, hash] = guardado.split(":");
    const meu = crypto.createHash("sha256").update(sal + pin).digest("hex");
    if (meu.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(meu), Buffer.from(hash))) return reply(res, 401, { erro: "pin" });

    await rpc(s.access_token, "pin_acertou", { p_conta: conta });
    return reply(res, 200, { access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in, user: { email: s.email } });
  } catch (e) {
    console.error(e);
    if (e instanceof Config) return reply(res, 500, { erro: "config", msg: e.message });
    return reply(res, 500, { erro: "servidor", msg: "Não foi possível entrar agora" });
  }
};
