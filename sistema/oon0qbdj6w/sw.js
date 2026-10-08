// IMPRTS web: guarda a "casca" do app para abrir rápido (os dados sempre vêm do banco).
const CACHE = "imprts-web-1791459951";
const SHELL = ["./", "index.html", "app.css?v=1791459951", "app.js?v=1791459951", "core.js?v=1791459951", "ui.js?v=1791459951", "telas-estoque.js?v=1791459951", "telas-servicos.js?v=1791459951", "telas-mais.js?v=1791459951", "catalogo.json", "icone-180.png", "icone-192.png", "icone-512.png", "manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;          // banco e fotos: sempre da rede
  // rede primeiro (pega a versão nova), cache se estiver sem internet
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && u.pathname.startsWith("/sistema/")) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
