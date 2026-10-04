// Link enviado no WhatsApp: mostra a ficha (imagem) na prévia do link e leva ao produto.
// /i/<código>/<id do interessado>
const SUPABASE = "https://evaeprbbctemcnltjuwn.supabase.co";

module.exports = function handler(req, res) {
  const code = String(req.query.code || "").replace(/\D/g, "").slice(0, 6);
  const id = String(req.query.id || "").toLowerCase();
  if (!code || !/^[0-9a-f-]{36}$/.test(id)) { res.statusCode = 302; res.setHeader("Location", "/"); return res.end(); }
  const img = `${SUPABASE}/storage/v1/object/public/interesses/${id}.jpg`;
  const to = `/produto?c=${code}`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Ficha do produto · Imports Brasil</title>
<meta property="og:title" content="Ficha do produto · Imports Brasil">
<meta property="og:description" content="Interesse enviado pelo site da Imports Brasil.">
<meta property="og:image" content="${img}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1080"><meta property="og:image:height" content="1350">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${to}">
<style>body{background:#000;color:#fff;font:15px -apple-system,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}img{max-width:min(92vw,420px);border-radius:18px}</style>
</head><body><a href="${to}"><img src="${img}" alt="Ficha do produto"></a></body></html>`);
}
