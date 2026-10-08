// Entrada do sistema do celular só com perfil + PIN.
// O e-mail e a senha da conta da loja ficam aqui no servidor (variáveis IMPRTS_EMAIL e IMPRTS_SENHA
// na Vercel), nunca no site. O PIN é conferido aqui, com a trava de erros do banco (pin_reservar),
// e só com o PIN certo o celular recebe a sessão da conta da loja.
const crypto = require("crypto");
const SUPABASE = "https://evaeprbbctemcnltjuwn.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YWVwcmJiY3RlbWNubHRqdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MTY4MTUsImV4cCI6MjEwNjE5MjgxNX0.IIhiVVFu4IdBm_Q8JN8GCftjW0r6wzrM0esHszjczVk";
const CONTAS = ["rafael", "funcionario", "caleb"];

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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { erro: "metodo" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const conta = String(body?.conta || ""), pin = String(body?.pin || "");
  if (!CONTAS.includes(conta) || !/^\d{4}$/.test(pin)) return reply(res, 400, { erro: "dados" });

  const email = process.env.IMPRTS_EMAIL, senha = process.env.IMPRTS_SENHA;
  if (!email || !senha) return reply(res, 500, { erro: "config", msg: "Servidor sem a conta da loja configurada" });

  try {
    const r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: senha }),
    });
    const s = await r.json().catch(() => ({}));
    if (!r.ok) { console.error("login da loja falhou", r.status, s); return reply(res, 500, { erro: "config", msg: "A conta da loja no servidor não entrou" }); }

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
    return reply(res, 200, { access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in, user: { email: s.user?.email } });
  } catch (e) {
    console.error(e);
    return reply(res, 500, { erro: "servidor", msg: "Não foi possível entrar agora" });
  }
};
