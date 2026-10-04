/* IMPRTS — "Tenho interesse": dados do cliente → ficha (imagem) → registro no sistema → WhatsApp da loja.
   Carregado só quando o cliente toca no botão (não pesa no catálogo). */
(() => {
  const C = window.IMPRTS;
  const U = window.IMPRTS_UI;
  const { money, esc, code } = U;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const KEY = "imprts.cliente";

  const onlyDigits = s => String(s || "").replace(/\D/g, "");
  function maskPhone(v) {
    const d = onlyDigits(v).replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  const saved = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };

  /* ——— ficha (imagem 1080×1350) ——— */
  const loadImg = src => new Promise(ok => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });

  function roundRect(x, c, y, w, h, r) {
    x.beginPath(); x.moveTo(c + r, y); x.arcTo(c + w, y, c + w, y + h, r); x.arcTo(c + w, y + h, c, y + h, r);
    x.arcTo(c, y + h, c, y, r); x.arcTo(c, y, c + w, y, r); x.closePath();
  }
  function wrap(x, text, maxW) {
    const words = text.split(" "), lines = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  function partsText(parts) {
    if (!parts.length) return "Originais";
    const t = parts.filter(([, v]) => v === "trocada").length, d = parts.length - t;
    return t && d ? `${t} troc. · ${d} def.` : t ? `${t} trocada${t > 1 ? "s" : ""}` : `${d} c/ defeito`;
  }

  async function renderCard(p, client) {
    const W = 1080, H = 1350, F = getComputedStyle(document.body).fontFamily;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    const [stone, cover] = await Promise.all([loadImg("img/pedra-m.webp"), loadImg(U.images(p)[0].src)]);

    // fundo: pedra escura com luz no centro
    x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
    if (stone) { x.globalAlpha = .55; const s = Math.max(W / stone.width, H / stone.height); x.drawImage(stone, (W - stone.width * s) / 2, (H - stone.height * s) / 2, stone.width * s, stone.height * s); x.globalAlpha = 1; }
    let g = x.createRadialGradient(W / 2, 470, 40, W / 2, 470, 760);
    g.addColorStop(0, "rgba(255,255,255,.13)"); g.addColorStop(.45, "rgba(0,0,0,.35)"); g.addColorStop(1, "rgba(0,0,0,.92)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // logo IMPRTS metálico
    const d = document.querySelector("svg.logo path")?.getAttribute("d");
    if (d) {
      const lw = 300, s = lw / 449.64;
      x.save(); x.translate((W - lw) / 2, 70); x.scale(s, s);
      const m = x.createLinearGradient(0, 0, 0, 82);
      m.addColorStop(0, "#ffffff"); m.addColorStop(.45, "#c9c9ce"); m.addColorStop(.55, "#8d8d94"); m.addColorStop(1, "#e9e9ec");
      x.fillStyle = m; x.fill(new Path2D(d)); x.restore();
    }
    x.font = `600 21px ${F}`; x.fillStyle = "rgba(255,255,255,.5)"; x.textAlign = "center";
    x.letterSpacing = "6px";
    x.fillText("FICHA DE INTERESSE", W / 2, 186);
    x.letterSpacing = "0px";

    // aparelho (menor quando o nome ocupa 2 linhas ou tem preço riscado, para caber tudo)
    const promo = U.promo(p);
    x.font = `600 54px ${F}`;
    const nameLines = wrap(x, p.name, W - 180).slice(0, 2);
    const box = 560 - (nameLines.length - 1) * 64 - (promo && p.price ? 32 : 0);
    if (cover) {
      const s = Math.min(box / cover.width, box / cover.height);
      const w = cover.width * s, h = cover.height * s;
      x.save();
      if (U.images(p)[0].photo) { roundRect(x, (W - w) / 2, 215 + (box - h) / 2, w, h, 36); x.clip(); }
      x.drawImage(cover, (W - w) / 2, 215 + (box - h) / 2, w, h);
      x.restore();
    }
    if (promo) {
      x.font = `800 24px ${F}`;
      const t = "PROMOÇÃO", tw = x.measureText(t).width + 44;
      const pg = x.createLinearGradient(0, 228, 0, 272); pg.addColorStop(0, "#ffd27a"); pg.addColorStop(1, "#f5a524");
      x.fillStyle = pg; roundRect(x, W - 90 - tw, 228, tw, 46, 23); x.fill();
      x.fillStyle = "#1a0d00"; x.fillText(t, W - 90 - tw / 2, 260);
    }
    x.font = `700 27px ui-monospace, Menlo, monospace`; x.fillStyle = "rgba(255,255,255,.55)"; x.textAlign = "left";
    x.fillText(code(p.code), 90, 260);

    // nome e preço
    x.textAlign = "center"; x.fillStyle = "#fff"; x.font = `600 54px ${F}`;
    let y = 215 + box + 75;
    for (const l of nameLines) { x.fillText(l, W / 2, y); y += 64; }
    y += 12;
    if (promo && p.price) {
      x.font = `500 32px ${F}`; x.fillStyle = "rgba(255,255,255,.45)";
      const old = money(p.price), ow = x.measureText(old).width;
      x.fillText(old, W / 2, y);
      x.strokeStyle = "rgba(255,90,90,.9)"; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2 - ow / 2, y - 11); x.lineTo(W / 2 + ow / 2, y - 11); x.stroke();
      y += 70;
    } else y += 38;
    x.font = `700 70px ${F}`; x.fillStyle = promo ? "#ffc35a" : "#fff";
    x.fillText(money(U.now(p)), W / 2, y);

    // dados do aparelho
    const parts = Object.entries(p.parts || {});
    const batt = p.battery_health;
    const specs = [
      ["Condição", U.CONDITION[p.condition] || "—"],
      p.storage ? ["Armazenamento", p.storage] : p.chip ? ["Chip", p.chip] : null,
      batt ? ["Bateria", `${batt}%`, batt <= 65 ? "#ff5b5b" : batt < 80 ? "#ffc35a" : "#34c77b"] : null,
      ["Peças", partsText(parts)],
    ].filter(Boolean);
    y += 46;
    const cw = (W - 180 - (specs.length - 1) * 16) / specs.length;
    specs.forEach(([k, v, col], i) => {
      const cx = 90 + i * (cw + 16);
      x.fillStyle = "rgba(255,255,255,.06)"; roundRect(x, cx, y, cw, 112, 22); x.fill();
      x.strokeStyle = "rgba(255,255,255,.1)"; x.lineWidth = 1.5; x.stroke();
      x.font = `500 21px ${F}`; x.fillStyle = "rgba(255,255,255,.5)"; x.fillText(k, cx + cw / 2, y + 42);
      x.font = `600 28px ${F}`; x.fillStyle = col || "#fff";
      let t = v; while (x.measureText(t).width > cw - 24 && t.length > 3) t = t.slice(0, -2) + "…";
      x.fillText(t, cx + cw / 2, y + 84);
    });
    y += 112;
    if (["iphone", "android"].includes(p.category)) {
      x.font = `600 23px ${F}`; x.fillStyle = "#ffc35a";
      x.fillText("IMPRTS Assistance · 3 meses de assistência sem custo de mão de obra", W / 2, y + 44);
    }

    // cliente
    const by = H - 130;
    x.fillStyle = "rgba(255,255,255,.07)"; roundRect(x, 90, by, W - 180, 96, 24); x.fill();
    x.textAlign = "left"; x.font = `500 21px ${F}`; x.fillStyle = "rgba(255,255,255,.5)";
    x.fillText("INTERESSADO", 124, by + 38);
    x.font = `600 28px ${F}`; x.fillStyle = "#fff";
    let nm = client.name; while (x.measureText(nm).width > 520 && nm.length > 3) nm = nm.slice(0, -2) + "…";
    x.fillText(nm, 124, by + 74);
    x.textAlign = "right"; x.font = `500 21px ${F}`; x.fillStyle = "rgba(255,255,255,.5)";
    x.fillText(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }), W - 124, by + 38);
    x.font = `600 28px ${F}`; x.fillStyle = "#fff"; x.fillText(maskPhone(client.phone), W - 124, by + 74);
    return cv;
  }

  /* ——— envio ——— */
  async function rpc(fn, args) {
    const r = await fetch(`${C.supabaseURL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: C.supabaseKey, Authorization: `Bearer ${C.supabaseKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  async function upload(id, blob) {
    const r = await fetch(`${C.supabaseURL}/storage/v1/object/interesses/${id}.jpg`, {
      method: "POST",
      headers: { apikey: C.supabaseKey, Authorization: `Bearer ${C.supabaseKey}`, "Content-Type": "image/jpeg", "x-upsert": "false" },
      body: blob,
    });
    return r.ok;
  }
  const withTimeout = (p, ms) => Promise.race([p, new Promise(ok => setTimeout(() => ok(null), ms))]);

  function message(p, client, link) {
    const parts = Object.entries(p.parts || {});
    const lines = [
      "Olá, IMPRTS! Tenho interesse neste aparelho que vi no site:",
      "",
      `*${p.name}*`,
      `Código: ${code(p.code)}`,
      U.promo(p) ? `Preço: ${money(p.promo_price)} (promoção, de ${money(p.price)})` : `Preço: ${money(p.price)}`,
      `Condição: ${U.CONDITION[p.condition] || "-"}`,
      p.storage ? `Armazenamento: ${p.storage}` : null,
      p.chip ? `Chip: ${p.chip}` : null,
      p.battery_health ? `Saúde da bateria: ${p.battery_health}%` : null,
      parts.length ? `Peças: ${parts.map(([k, v]) => `${U.PARTS[k] || k} ${v === "trocada" ? "trocada" : "com defeito"}`).join(", ")}` : "Peças: todas originais",
      "",
      "*Meus dados*",
      `Nome: ${client.name}`,
      `Telefone: ${maskPhone(client.phone)}`,
      client.email ? `E-mail: ${client.email}` : null,
      link ? "" : null,
      link ? `Ficha do produto: ${link}` : null,
    ];
    return lines.filter(l => l !== null).join("\n");
  }

  /* ——— conta neste celular: os dados ficam guardados no aparelho e preenchem o "Tenho interesse" ——— */
  const clean = c => ({ name: String(c.name || "").trim().replace(/\s+/g, " "), phone: onlyDigits(c.phone).replace(/^55(?=\d{10,11}$)/, ""), email: String(c.email || "").trim() });
  function check(c) {
    if (c.name.split(" ").length < 2 || c.name.length < 5) return "Digite o nome completo (nome e sobrenome).";
    if (c.phone.length < 10 || c.phone.length > 11) return "Confira o telefone com DDD.";
    if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return "Confira o e-mail ou deixe em branco.";
    return "";
  }
  const account0 = () => { const c = clean(saved()); return check(c) ? null : c; }; // conta completa ou nada
  const changed = () => dispatchEvent(new Event("imprts:conta")); // atualiza o botão da conta no menu
  function store(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {} changed(); }
  function forget() { try { localStorage.removeItem(KEY); } catch {} changed(); }
  const fields = s => `
    <label>Nome completo<input name="name" autocomplete="name" placeholder="Seu nome e sobrenome" value="${esc(s.name || "")}" required></label>
    <label>Telefone (WhatsApp)<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(18) 99999-9999" value="${esc(maskPhone(s.phone || ""))}" required></label>
    <label>Gmail <span>(opcional)</span><input name="email" type="email" inputmode="email" autocomplete="email" placeholder="voce@gmail.com" value="${esc(s.email || "")}"></label>`;

  /* ——— janela (folha de baixo no celular, janela central no computador) ——— */
  function sheet(inner) {
    const el = document.createElement("div");
    el.className = "sheet-bg";
    el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t"><button class="sheet-x" aria-label="Fechar">×</button>${inner}</div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add("noscroll");
    requestAnimationFrame(() => el.classList.add("on"));
    const onKey = e => { if (e.key === "Escape") close(); };
    const close = () => { removeEventListener("keydown", onKey); el.classList.remove("on"); document.documentElement.classList.remove("noscroll"); setTimeout(() => el.remove(), 320); };
    el.addEventListener("click", e => { if (e.target === el) close(); });
    $(".sheet-x", el).onclick = close;
    addEventListener("keydown", onKey);
    const f = n => $(`input[name=${n}]`, el);
    f("phone")?.addEventListener("input", e => { e.target.value = maskPhone(e.target.value); });
    const read = () => clean({ name: f("name").value, phone: f("phone").value, email: f("email").value });
    const err = (where, t) => { const e = $(`${where} .sheet-err`, el); e.textContent = t; e.hidden = !t; };
    return { el, close, f, read, err };
  }

  /* ——— "Sua conta": ver, alterar ou apagar os dados deste celular ——— */
  function account() {
    const s = account0();
    const { el, close, f, read, err } = sheet(`
      <div class="acc">
        <h2 id="sheet-t">${s ? "Sua conta" : "Seus dados"}</h2>
        <p class="sheet-sub">Ficam guardados só neste celular. Assim, no <b>Tenho interesse</b>, você não precisa digitar de novo.</p>
        ${fields(s || saved())}
        <p class="sheet-err" hidden></p>
        <button class="btn metal save">Salvar</button>
        ${s ? '<button class="btn forget">Sair deste celular</button>' : ""}
        <p class="sheet-note">Seus dados são usados só pela IMPRTS para falar com você.</p>
      </div>`);
    if (!s) setTimeout(() => f("name").focus(), 350);
    $(".save", el).onclick = () => {
      const c = read(), e = check(c);
      if (e) return err(".acc", e);
      store(c); close();
    };
    const fg = $(".forget", el);
    if (fg) fg.onclick = () => { forget(); close(); };
  }

  /* ——— "Tenho interesse": com conta salva vai direto para a ficha ——— */
  function open(p) {
    const s = account0();
    const { el, close, f, read, err } = sheet(`
        <div class="sh-step s1"${s ? " hidden" : ""}>
          <h2 id="sheet-t">Tenho interesse</h2>
          <p class="sheet-sub">Deixe seus dados e a IMPRTS recebe a ficha completa do <b>${esc(p.name)}</b> no WhatsApp. Eles ficam guardados neste celular para as próximas vezes.</p>
          ${fields(s || saved())}
          <p class="sheet-err" hidden></p>
          <button class="btn metal go">Continuar</button>
          <p class="sheet-note">Seus dados são usados só pela IMPRTS para falar com você sobre este aparelho.</p>
        </div>
        <div class="sh-step s2" hidden>
          <h2>Confirmar interesse?</h2>
          <p class="sheet-sub">Esta ficha e os seus dados vão para o WhatsApp da IMPRTS.</p>
          <p class="sheet-who"></p>
          <div class="ficha"><div class="ficha-load"></div></div>
          <p class="sheet-err" hidden></p>
          <div class="sheet-row"><button class="btn back">${s ? "Cancelar" : "Voltar"}</button><button class="btn wa send">${U.waIcon()} Confirmar e enviar</button></div>
        </div>`);

    let client, card;
    async function confirm(c) {
      client = c; card = null;
      $(".s1", el).hidden = true; $(".s2", el).hidden = false;
      $(".sheet-who", el).innerHTML = `Enviando como <b>${esc(c.name)}</b> · ${esc(maskPhone(c.phone))} <button class="linkbtn edit">Alterar</button>`;
      $(".edit", el).onclick = edit;
      const box = $(".ficha", el);
      box.innerHTML = '<div class="ficha-load"></div>';
      const cv = await renderCard(p, c);
      if (client !== c) return; // mudou os dados enquanto desenhava
      card = cv; card.className = "ficha-img";
      box.innerHTML = ""; box.appendChild(card);
    }
    function edit() {
      $(".s2", el).hidden = true; $(".s1", el).hidden = false;
      setTimeout(() => f("name").focus(), 50);
    }

    $(".go", el).onclick = () => {
      const c = read(), e = check(c);
      if (e) return err(".s1", e);
      err(".s1", "");
      store(c);
      confirm(c);
    };
    // "Cancelar" quando já abriu na ficha (conta salva); "Voltar" quando veio dos dados
    $(".back", el).onclick = () => (s ? close() : edit());
    if (s) confirm(s); else setTimeout(() => (f("name").value ? f("phone") : f("name")).focus(), 350);

    $(".send", el).onclick = async e => {
      const b = e.currentTarget;
      if (b.disabled || !card) return;
      b.disabled = true; b.classList.add("busy"); b.lastChild.textContent = " Enviando…";
      let id = null, link = null, wait = 0;
      try {
        id = await withTimeout(rpc("site_lead", { p_name: client.name, p_phone: "55" + client.phone, p_email: client.email || null, p_visitor: U.visitor, p_code: p.code }), 6000);
      } catch (x) {
        // dá tempo de ler o aviso antes de abrir o WhatsApp
        if (String(x).includes("muitos pedidos")) { err(".s2", "Você já enviou vários pedidos agora. Fale direto pelo WhatsApp da loja."); wait = 2500; }
      }
      if (wait) await new Promise(ok => setTimeout(ok, wait));
      if (id) {
        const blob = await new Promise(ok => { try { card.toBlob(ok, "image/jpeg", .86); } catch { ok(null); } });
        const ok = blob && await withTimeout(upload(id, blob), 8000);
        if (ok) link = C.site ? `${C.site}/i/${p.code}/${id}` : `${C.supabaseURL}/storage/v1/object/public/interesses/${id}.jpg`;
      }
      U.flush();
      const url = U.wa(message(p, client, link));
      b.lastChild.textContent = " Abrindo o WhatsApp…";
      if (url) location.href = url;
      setTimeout(close, 1200);
    };
  }

  /* ——— assistência (só iPhone): confirma o pedido de orçamento montado na página e abre o WhatsApp ———
     pre = { model: "iPhone 13 Pro · Grafite", img: "img/modelos/…webp", issues: ["Tela quebrada", …], details: "…" }
     O relatório sai marcado como IMPRTS ASSISTÊNCIA, para a loja separar dos pedidos da loja normal. */
  function quote(pre) {
    pre = pre && typeof pre === "object" ? pre : {};
    const s = account0();
    const issues = Array.isArray(pre.issues) ? pre.issues : [];
    const { el, close, f, read, err } = sheet(`
      <div class="qt">
        <h2 id="sheet-t">Pedir orçamento</h2>
        <p class="sheet-sub">Confira o relatório. Ele chega no WhatsApp da loja marcado como <b>IMPRTS Assistência</b>.</p>
        <div class="qt-sum">
          <span class="qt-tag">IMPRTS Assistência · relatório do iPhone</span>
          ${pre.img ? `<img src="${esc(pre.img)}" alt="">` : ""}
          <span class="qt-dev">${esc(pre.model || "iPhone")}</span>
          <span class="qt-iss">${issues.length ? issues.map(esc).join(" · ") : "Problema descrito abaixo"}</span>
        </div>
        <label>Quer contar mais? <span>(opcional)</span><textarea name="issue" rows="3" placeholder="Ex.: caiu e a tela ficou preta, bateria acaba antes do almoço">${esc(pre.details || "")}</textarea></label>
        <p class="sheet-who"${s ? "" : " hidden"}></p>
        <div class="who-fields"${s ? " hidden" : ""}>${fields(s || saved())}</div>
        <p class="sheet-err" hidden></p>
        <button class="btn wa send">${U.waIcon()} Enviar pelo WhatsApp</button>
        <p class="sheet-note">Seus dados ficam guardados neste celular e são usados só pela IMPRTS para falar com você.</p>
      </div>`);
    const who = $(".sheet-who", el), box = $(".who-fields", el);
    if (s) {
      who.innerHTML = `Enviando como <b>${esc(s.name)}</b> · ${esc(maskPhone(s.phone))} <button class="linkbtn edit">Alterar</button>`;
      $(".edit", el).onclick = () => { who.hidden = true; box.hidden = false; f("name").focus(); };
    } else setTimeout(() => f("name").focus(), 350);

    $(".send", el).onclick = () => {
      const details = $("textarea[name=issue]", el).value.trim();
      if (!issues.length && details.length < 3) return err(".qt", "Conte o que está acontecendo com o iPhone.");
      const c = box.hidden ? s : read(), e = check(c);
      if (e) { who.hidden = true; box.hidden = false; return err(".qt", e); }
      err(".qt", "");
      store(c);
      const text = [
        "*IMPRTS ASSISTÊNCIA · PEDIDO DE ORÇAMENTO*",
        "Relatório do iPhone enviado pelo site",
        "",
        `*iPhone:* ${pre.model || "iPhone"}`,
        issues.length ? `*Problemas:* ${issues.join(", ")}` : null,
        details ? `*Detalhes:* ${details}` : null,
        "",
        "*Cliente*",
        `Nome: ${c.name}`,
        `Telefone: ${maskPhone(c.phone)}`,
        c.email ? `E-mail: ${c.email}` : null,
        "",
        `_Enviado pela página da IMPRTS Assistência${C.site ? ` (${C.site.replace(/^https?:\/\//, "")}/assistencia)` : ""}_`,
      ].filter(l => l !== null).join("\n");
      U.flush();
      const url = U.wa(text);
      if (url) location.href = url;
      setTimeout(close, 900);
    };
  }

  window.IMPRTS_INTERESSE = { open, account, quote };
})();
