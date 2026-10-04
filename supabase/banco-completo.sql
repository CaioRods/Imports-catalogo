-- IMPRTS · banco completo (app dos Macs + site), num arquivo só.
-- Junta schema.sql, compartilhado.sql, contas-dos-macs.sql, tempo-real.sql, siri.sql, site.sql e clientes.sql,
-- já com as correções de 4/out/2026. Seguro rodar mais de uma vez: só cria o que falta e troca regras e funções.
-- Roda tudo de uma vez (transação): se der erro em qualquer linha, nada é aplicado.
-- Não cria nem apaga coluna de products: o SyncEngine.productColumns continua batendo.
--
-- Correções em relação aos arquivos antigos:
--  1. Só as contas da loja (tabela contas_loja) acessam os dados. Antes, qualquer pessoa que criasse conta
--     no Supabase (o cadastro está aberto) via clientes, IMEI, custo, PINs e senhas de aparelho.
--  2. A ficha do "Tenho interesse" volta a subir (a regra antiga nunca deixava o site enviar).
--  3. Trava contra robô enchendo site_events e leads.
--  4. Rodar de novo não desfaz mais a trava de publicação do app (updates) nem troca a chave da Siri.

begin;

create extension if not exists pgcrypto;

create sequence if not exists product_code_seq start 1;
create sequence if not exists repair_number_seq start 1;

-- ─── Produtos ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  code           int unique,                 -- etiqueta sequencial (001, 002…)
  category       text not null default 'iphone',
  model_id       text,                       -- ex.: iphone-13-pro (catálogo do app)
  color_id       text,                       -- ex.: azul-sierra
  name           text not null default '',
  storage        text,
  ram            text,
  chip           text,
  serial         text not null default '',   -- IMEI ou nº de série
  battery_health int,
  condition      text not null default 'seminovo',
  parts          jsonb not null default '{}',-- {"bateria":"trocada","faceid":"defeito"}
  cost           numeric(12,2),              -- só o dono vê (nunca vai para o site)
  price          numeric(12,2),
  status         text not null default 'disponivel', -- disponivel | reservado | reparo | vendido
  notes          text not null default '',
  publish        boolean not null default true,       -- aparece no site
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     text not null default '',
  sold_at        timestamptz,
  sold_price     numeric(12,2),
  sold_by        text,                       -- rafael | funcionario | alexa
  buyer          text,
  buyer_phone    text,
  payment        text,
  warranty_days  int,
  label_printed_at timestamptz,               -- última impressão da etiqueta
  deleted        boolean not null default false
);
create index if not exists products_updated_idx on public.products (updated_at);
alter table public.products add column if not exists label_printed_at timestamptz;
-- site: descrição, fotos reais e promoção
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists cover text;
alter table public.products add column if not exists promo_price numeric;
alter table public.products add column if not exists promo_until timestamptz;

-- Código definitivo sai do servidor: os 3 Macs nunca repetem número.
create or replace function public.products_before_write() returns trigger
language plpgsql as $$
declare cur bigint;
begin
  if tg_op = 'UPDATE' and old.code is not null then
    new.code := old.code;                       -- código nunca muda depois de dado
  end if;
  if new.code is null then
    new.code := nextval('product_code_seq');
  else
    select case when is_called then last_value else 0 end into cur from product_code_seq;
    if new.code > cur then perform setval('product_code_seq', new.code); end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists products_bw on public.products;
create trigger products_bw before insert or update on public.products
  for each row execute function public.products_before_write();

-- ─── Ordens de serviço ───────────────────────────────────────────────────────
create table if not exists public.repairs (
  id           uuid primary key default gen_random_uuid(),
  number       int unique,
  customer     text not null default '',
  phone        text not null default '',
  device       text not null default '',
  category     text not null default 'iphone',
  model_id     text,
  color_id     text,
  serial       text not null default '',
  problem      text not null default '',
  parts        jsonb not null default '{}',
  budget       numeric(12,2),
  parts_cost   numeric(12,2),
  status       text not null default 'recebido',
  notes        text not null default '',
  passcode     text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  due_at       timestamptz,
  delivered_at timestamptz,
  created_by   text not null default '',
  deleted      boolean not null default false
);
create index if not exists repairs_updated_idx on public.repairs (updated_at);
alter table public.repairs add column if not exists business text not null default 'imprts'; -- imprts | caleb
alter table public.repairs add column if not exists class_id text;

create or replace function public.repairs_before_write() returns trigger
language plpgsql as $$
declare cur bigint;
begin
  if tg_op = 'UPDATE' and old.number is not null then
    new.number := old.number;
  end if;
  if new.number is null then
    new.number := nextval('repair_number_seq');
  else
    select case when is_called then last_value else 0 end into cur from repair_number_seq;
    if new.number > cur then perform setval('repair_number_seq', new.number); end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists repairs_bw on public.repairs;
create trigger repairs_bw before insert or update on public.repairs
  for each row execute function public.repairs_before_write();

-- ─── Atividade (quem fez o quê) ──────────────────────────────────────────────
create table if not exists public.activity (
  id           uuid primary key default gen_random_uuid(),
  at           timestamptz not null default now(),
  actor        text not null,              -- rafael | funcionario | alexa
  kind         text not null,              -- cadastro | venda | edicao | reparo
  text         text not null,
  product_code int,
  inserted_at  timestamptz not null default clock_timestamp()
);
create index if not exists activity_inserted_idx on public.activity (inserted_at);

-- ─── Configurações compartilhadas entre todos os Macs ────────────────────────
-- (PINs, perfis e fotos, classes, tabela de Valores, aparelhos adicionados,
--  contatos da loja, numeração dos orçamentos)
create table if not exists public.kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists kv_updated_idx on public.kv (updated_at);
create or replace function public.kv_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists kv_bw on public.kv;
create trigger kv_bw before insert or update on public.kv for each row execute function public.kv_touch();

-- ─── Comandos da Alexa para os Macs ──────────────────────────────────────────
-- A Edge Function grava; o ajudante do IMPRTS em cada Mac lê e abre o app.
-- Só contém ação + código (nada sensível), por isso a chave pública pode ler.
create table if not exists public.commands (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  action     text not null,                -- abrir | produto | etiqueta | vendas | estoque | reparos
  code       int,
  target     text not null default 'todos' -- 'todos' ou o nome do Mac (Ajustes → Alexa)
);
create index if not exists commands_created_idx on public.commands (created_at);
alter table public.commands enable row level security;
drop policy if exists "macs: ler comandos" on public.commands;
create policy "macs: ler comandos" on public.commands for select to anon, authenticated
  using (created_at > now() - interval '10 minutes');
grant select on public.commands to anon, authenticated;

-- ─── Contas da loja ──────────────────────────────────────────────────────────
-- Só quem está nesta lista acessa os dados. Na PRIMEIRA vez que este arquivo roda, ela é preenchida
-- com todas as contas que já existem (Macs e conta da loja), então nada para de funcionar.
-- Confira a lista no resultado do fim do arquivo. Conta nova da loja no futuro:
--   insert into public.contas_loja (user_id, email) select id, email from auth.users where email = '<email>';
create table if not exists public.contas_loja (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text,
  added_at timestamptz not null default now()
);
alter table public.contas_loja enable row level security;
revoke all on public.contas_loja from anon, authenticated;
insert into public.contas_loja (user_id, email)
select id, email from auth.users
where not exists (select 1 from public.contas_loja)
on conflict do nothing;

create or replace function public.eh_loja() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from contas_loja where user_id = auth.uid());
$$;
revoke all on function public.eh_loja() from public;
grant execute on function public.eh_loja() to authenticated;

-- ─── Segurança ───────────────────────────────────────────────────────────────
-- Os Macs entram com o usuário da loja (e-mail/senha criados em Authentication).
-- A Alexa usa a service role dentro da Edge Function (não passa por estas regras).
-- O site usa a chave pública e só enxerga a vitrine (sem custo, IMEI, cliente…).
alter table public.products enable row level security;
alter table public.repairs  enable row level security;
alter table public.activity enable row level security;
alter table public.kv       enable row level security;

drop policy if exists "loja: tudo" on public.products;
create policy "loja: tudo" on public.products for all to authenticated
  using ((select public.eh_loja())) with check ((select public.eh_loja()));
drop policy if exists "loja: tudo" on public.repairs;
create policy "loja: tudo" on public.repairs for all to authenticated
  using ((select public.eh_loja())) with check ((select public.eh_loja()));
drop policy if exists "loja: tudo" on public.activity;
create policy "loja: tudo" on public.activity for all to authenticated
  using ((select public.eh_loja())) with check ((select public.eh_loja()));
drop policy if exists "loja: tudo" on public.kv;
create policy "loja: tudo" on public.kv for all to authenticated
  using ((select public.eh_loja())) with check ((select public.eh_loja()));

-- Site: publicados e não excluídos; vendidos continuam visíveis por 7 dias com selo "Vendido".
-- A chave pública só recebe colunas sem nada interno (sem custo, IMEI, comprador, observações).
revoke all on public.products from anon;
grant select (id, code, category, model_id, color_id, name, storage, ram, chip, battery_health,
              condition, parts, price, status, publish, created_at, updated_at, sold_at, deleted)
  on public.products to anon;
drop policy if exists "site: vitrine" on public.products;
create policy "site: vitrine" on public.products for select to anon
  using (publish and not deleted and (status <> 'vendido' or sold_at > now() - interval '7 days'));
revoke all on public.repairs from anon;
revoke all on public.activity from anon;
revoke all on public.kv from anon;

-- ─── Vitrine (o que o site enxerga) ──────────────────────────────────────────
-- Sem custo, IMEI, cliente nem observações internas. Vendidos continuam por 7 dias com o selo "Vendido".
-- Promoção (preço promocional com prazo opcional) só aparece enquanto vale.
-- Roda com o dono da tabela de propósito: mostra descrição/fotos/promoção sem liberar a tabela.
drop view if exists public.vitrine;
create view public.vitrine as
select p.id, p.code, p.category, p.model_id, p.color_id, p.name, p.storage, p.ram, p.chip,
       p.battery_health, p.condition, p.parts, p.price,
       (p.status = 'vendido') as vendido, p.status, p.created_at, p.updated_at, p.sold_at,
       p.description, p.photos, p.cover,
       case when p.promo_price is not null and (p.promo_until is null or p.promo_until > now())
            then p.promo_price end as promo_price,
       case when p.promo_price is not null and (p.promo_until is null or p.promo_until > now())
            then p.promo_until end as promo_until,
       (p.promo_price is not null and (p.promo_until is null or p.promo_until > now())) as promocao
from public.products p
where p.publish = true
  and coalesce(p.deleted, false) = false
  and (p.status <> 'vendido' or p.sold_at > now() - interval '7 days');
grant select on public.vitrine to anon, authenticated;

-- ─── Siri (atalhos do iPhone / HomePod / Apple Watch / Mac) ──────────────────
-- Os atalhos chamam siri() com uma chave secreta; aqui fica só a impressão digital dela.
-- "do nothing": rodar de novo não troca a chave que já está valendo.
create table if not exists public.siri_config (id int primary key default 1, key_hash text not null);
alter table public.siri_config enable row level security;
revoke all on public.siri_config from anon, authenticated;
insert into public.siri_config (id, key_hash) values (1, '0fa79d02db429ebd3edf4bcc7d0a22d1748958d5700cd443f67ece079de23689')
on conflict (id) do nothing;

create or replace function public.siri(chave text, acao text, codigo int default null, valor numeric default null, alvo text default 'todos')
returns text language plpgsql security definer set search_path = public as $$
declare
  p products%rowtype;
  n int; ni int; nm int; total numeric; st text; preco numeric;
begin
  if not exists (select 1 from siri_config where key_hash = encode(sha256(convert_to(coalesce(chave, ''), 'UTF8')), 'hex')) then
    return 'Atalho sem permissão. Baixe os atalhos de novo no IMPRTS.';
  end if;
  acao := lower(trim(coalesce(acao, '')));

  if acao in ('consultar', 'vender') then
    if codigo is null then return 'Qual o código do produto?'; end if;
    select * into p from products where code = codigo and not deleted;
    if not found then return format('Não achei o produto %s.', codigo); end if;
  end if;

  if acao = 'consultar' then
    st := case p.status when 'vendido' then 'já vendido' when 'reservado' then 'reservado' when 'reparo' then 'em reparo' else 'disponível' end;
    return format('O %s é %s%s, %s, por %s reais.', codigo, p.name,
                  coalesce(', bateria ' || p.battery_health || ' por cento', ''), st,
                  coalesce(round(p.price)::text, 'sem preço'));

  elsif acao = 'vender' then
    if p.status = 'vendido' then return format('O %s, %s, já está vendido.', codigo, p.name); end if;
    preco := coalesce(valor, p.price);
    update products set status = 'vendido', sold_at = now(), sold_price = preco, sold_by = 'siri' where id = p.id;
    insert into activity (actor, kind, text, product_code)
      values ('siri', 'venda', format('vendeu %s · %s por R$ %s', lpad(codigo::text, 3, '0'), p.name, to_char(coalesce(preco, 0), 'FM999G999G990D00')), codigo);
    return format('Pronto! Baixa dada no %s, %s, por %s reais. Já saiu do estoque.', codigo, p.name, coalesce(round(preco)::text, 'sem preço'));

  elsif acao = 'estoque' then
    select count(*), count(*) filter (where category = 'iphone'), count(*) filter (where category = 'macbook')
      into n, ni, nm from products where not deleted and status <> 'vendido';
    return format('Você tem %s produtos no estoque: %s iPhones, %s MacBooks e %s outros.', n, ni, nm, n - ni - nm);

  elsif acao = 'vendas_hoje' then
    select count(*), coalesce(sum(sold_price), 0) into n, total from products
      where status = 'vendido' and not deleted and sold_at >= (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
    if n = 0 then return 'Nenhuma venda hoje ainda.'; end if;
    return format('Hoje foram %s vendas, somando %s reais.', n, round(total));

  elsif acao = 'servicos' then
    select count(*) into n from repairs where not deleted and business = 'imprts' and status not in ('entregue', 'cancelado');
    select count(*) into ni from repairs where not deleted and business = 'imprts' and status = 'pronto';
    return format('Tem %s serviços em andamento, %s prontos esperando o cliente buscar.', n, ni);

  elsif acao in ('abrir', 'produto', 'etiqueta', 'vendas', 'estoque_tela', 'reparos') then
    if acao in ('produto', 'etiqueta') and codigo is null then return 'Qual o código do produto?'; end if;
    insert into commands (action, code, target)
      values (case acao when 'estoque_tela' then 'estoque' else acao end, codigo, coalesce(nullif(lower(alvo), ''), 'todos'));
    return case acao
      when 'abrir' then 'Abrindo o IMPRTS.'
      when 'produto' then format('Mostrando o produto %s.', codigo)
      when 'etiqueta' then format('Imprimindo a etiqueta do %s.', codigo)
      else 'Abrindo.' end;
  end if;
  return 'Não entendi o pedido.';
end $$;
revoke all on function public.siri(text, text, int, numeric, text) from public;
grant execute on function public.siri(text, text, int, numeric, text) to anon, authenticated;

-- ─── Clientes do site: interessados (formulário "Tenho interesse") + métricas de visita ───
-- O site (chave pública) só ESCREVE pelas funções site_track e site_lead, que validam tudo;
-- ler os dados é só para os Macs da loja (usuário autenticado).

-- Eventos de navegação (visita, produto aberto, clique no catálogo, tempo na página)
create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  visitor text not null,          -- aparelho do visitante (id aleatório guardado no navegador)
  session text not null,          -- visita (uma aba)
  kind text not null,             -- visita | produto | clique | tempo
  product_code int,
  seconds int,
  device text,                    -- celular | computador
  referrer text                   -- de onde veio (instagram, google…)
);
create index if not exists site_events_at on public.site_events (at desc);
create index if not exists site_events_code on public.site_events (product_code) where product_code is not null;
create index if not exists site_events_visitor on public.site_events (visitor);
alter table public.site_events enable row level security;
drop policy if exists "site_events: loja lê" on public.site_events;
create policy "site_events: loja lê" on public.site_events for select to authenticated using ((select public.eh_loja()));
drop policy if exists "site_events: loja apaga" on public.site_events;
create policy "site_events: loja apaga" on public.site_events for delete to authenticated using ((select public.eh_loja()));

-- ─── Site: interessados ("Tenho interesse") ──────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text,
  visitor text,
  product_id uuid,
  product_code int,
  product_name text,
  price numeric,
  status text not null default 'novo',   -- novo | contatado | vendido | perdido
  note text not null default ''
);
create index if not exists leads_created on public.leads (created_at desc);
alter table public.leads enable row level security;
drop policy if exists "leads: loja lê" on public.leads;
create policy "leads: loja lê" on public.leads for select to authenticated using ((select public.eh_loja()));
drop policy if exists "leads: loja muda" on public.leads;
create policy "leads: loja muda" on public.leads for update to authenticated
  using ((select public.eh_loja())) with check ((select public.eh_loja()));
drop policy if exists "leads: loja apaga" on public.leads;
create policy "leads: loja apaga" on public.leads for delete to authenticated using ((select public.eh_loja()));

-- Site grava eventos em lote (até 60 por chamada), em texto puro (para o sendBeacon funcionar).
create or replace function public.site_track(text) returns void
language plpgsql security definer set search_path = public as $$
declare events jsonb;
begin
  begin events := $1::jsonb; exception when others then return; end;
  if length($1) > 20000 or jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 60 then return; end if;
  -- trava contra robô enchendo o banco: 600 eventos por visitante e 20 mil no total, por hora
  -- (uma pessoa de verdade fica muito abaixo disso)
  if (select count(*) from site_events where visitor = left(events->0->>'v', 40) and at > now() - interval '1 hour') >= 600
     or (select count(*) from site_events where at > now() - interval '1 hour') >= 20000 then return; end if;
  insert into site_events (visitor, session, kind, product_code, seconds, device, referrer)
  select left(e->>'v', 40), left(e->>'s', 40), e->>'k',
         case when e->>'c' ~ '^\d{1,6}$' then (e->>'c')::int end,
         case when e->>'t' ~ '^\d{1,6}$' then least((e->>'t')::int, 3600) end,
         left(e->>'d', 12), left(e->>'r', 80)
  from jsonb_array_elements(events) e
  where e->>'k' in ('visita', 'produto', 'clique', 'tempo')
    and coalesce(e->>'v', '') <> '' and coalesce(e->>'s', '') <> '';
end $$;
revoke all on function public.site_track(text) from public;
grant execute on function public.site_track(text) to anon, authenticated;

-- Site registra um interessado; devolve o id (usado no nome da imagem da ficha).
create or replace function public.site_lead(p_name text, p_phone text, p_email text, p_visitor text, p_code int)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v record;
  digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  new_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) < 3 or length(p_name) > 120 then raise exception 'nome inválido'; end if;
  if length(digits) < 10 or length(digits) > 13 then raise exception 'telefone inválido'; end if;
  if p_email is not null and p_email <> '' and (length(p_email) > 120 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'e-mail inválido';
  end if;
  -- no máximo 5 pedidos por telefone a cada hora (evita spam)
  if (select count(*) from leads where phone = digits and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'muitos pedidos';
  end if;
  -- e no máximo 100 pedidos no total por hora (quem troca o número a cada envio para aqui)
  if (select count(*) from leads where created_at > now() - interval '1 hour') >= 100 then
    raise exception 'muitos pedidos';
  end if;
  select id, name, coalesce(promo_price, price) as price into v from vitrine where code = p_code;
  insert into leads (name, phone, email, visitor, product_id, product_code, product_name, price)
  values (trim(p_name), digits, nullif(trim(lower(coalesce(p_email, ''))), ''), left(p_visitor, 40), v.id, p_code, v.name, v.price)
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.site_lead(text, text, text, text, int) from public;
grant execute on function public.site_lead(text, text, text, text, int) to anon, authenticated;

-- Confere se a ficha <id>.jpg é de um interessado dos últimos 10 minutos.
-- Fica numa função "security definer" porque o site (anon) não enxerga a tabela leads:
-- a regra antiga fazia o "exists" direto e por isso a ficha nunca subia.
create or replace function public.lead_recente(obj text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from leads l
                 where l.id::text || '.jpg' = obj and l.created_at > now() - interval '10 minutes');
$$;
revoke all on function public.lead_recente(text) from public;
grant execute on function public.lead_recente(text) to anon, authenticated;

-- Painel "Clientes" do sistema: tudo agregado no banco, numa chamada só.
create or replace function public.site_stats(days int default 7) returns jsonb
language sql stable security invoker set search_path = public as $$
with ev as (select * from site_events where at > now() - make_interval(days => greatest(days, 1))),
ld as (select * from leads where created_at > now() - make_interval(days => greatest(days, 1)))
select jsonb_build_object(
  'visitors', (select count(distinct visitor) from ev),
  'sessions', (select count(distinct session) from ev),
  'views', (select count(*) from ev where kind = 'produto'),
  'avg_seconds', (select coalesce(round(avg(t)), 0) from (select sum(seconds) t from ev where kind = 'tempo' group by session) s),
  'mobile', (select count(distinct visitor) from ev where device = 'celular'),
  'leads', (select count(*) from ld),
  'top', coalesce((
    select jsonb_agg(x order by x.views desc, x.clicks desc) from (
      select e.product_code as code,
             count(*) filter (where kind = 'produto') as views,
             count(*) filter (where kind = 'clique') as clicks,
             coalesce(round(avg(seconds) filter (where kind = 'tempo')), 0) as seconds,
             count(distinct visitor) as people,
             (select count(*) from ld where ld.product_code = e.product_code) as leads
      from ev e where e.product_code is not null
      group by e.product_code order by 2 desc, 3 desc limit 20) x), '[]'::jsonb),
  'referrers', coalesce((
    select jsonb_agg(jsonb_build_object('from', r, 'n', n) order by n desc) from (
      select coalesce(nullif(referrer, ''), 'direto') r, count(distinct visitor) n
      from ev where kind = 'visita' group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
  'days', coalesce((
    select jsonb_agg(jsonb_build_object('day', d, 'visitors', v, 'views', w) order by d) from (
      select date_trunc('day', at)::date d, count(distinct visitor) v, count(*) filter (where kind = 'produto') w
      from ev group by 1) x), '[]'::jsonb),
  'people', coalesce((
    select jsonb_agg(p order by p->>'created_at' desc) from (
      select jsonb_build_object(
        'id', l.id, 'created_at', l.created_at, 'name', l.name, 'phone', l.phone, 'email', l.email,
        'code', l.product_code, 'product', l.product_name, 'price', l.price, 'status', l.status, 'note', l.note,
        'viewed', (select coalesce(jsonb_agg(distinct s.product_code), '[]'::jsonb) from site_events s
                   where s.visitor = l.visitor and s.kind = 'produto' and s.product_code is not null),
        'seconds', (select coalesce(sum(s.seconds), 0) from site_events s where s.visitor = l.visitor and s.kind = 'tempo'),
        'visits', (select count(distinct s.session) from site_events s where s.visitor = l.visitor)
      ) p from leads l order by l.created_at desc limit 200) x), '[]'::jsonb)
);
$$;
revoke all on function public.site_stats(int) from public;
grant execute on function public.site_stats(int) to authenticated;

-- ─── Pastas (Storage) ────────────────────────────────────────────────────────
-- updates: versões do app. Pública para baixar; só a conta da loja publica (a conta dos Macs não).
insert into storage.buckets (id, name, public)
values ('updates', 'updates', true)
on conflict (id) do update set public = true;
drop policy if exists "updates: loja publica" on storage.objects;
create policy "updates: loja publica" on storage.objects for insert to authenticated
  with check (bucket_id = 'updates' and auth.jwt() ->> 'email' = 'importssbrazilempresa@gmail.com');
drop policy if exists "updates: loja substitui" on storage.objects;
create policy "updates: loja substitui" on storage.objects for update to authenticated
  using (bucket_id = 'updates' and auth.jwt() ->> 'email' = 'importssbrazilempresa@gmail.com')
  with check (bucket_id = 'updates' and auth.jwt() ->> 'email' = 'importssbrazilempresa@gmail.com');
drop policy if exists "updates: loja lê" on storage.objects;
create policy "updates: loja lê" on storage.objects for select to authenticated
  using (bucket_id = 'updates' and (select public.eh_loja()));

-- produtos: fotos reais dos aparelhos. Leitura pública; envio só pelos Macs da loja.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;
drop policy if exists "produtos: loja envia" on storage.objects;
create policy "produtos: loja envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and (select public.eh_loja()));
drop policy if exists "produtos: loja troca" on storage.objects;
create policy "produtos: loja troca" on storage.objects for update to authenticated
  using (bucket_id = 'produtos' and (select public.eh_loja()));
drop policy if exists "produtos: loja apaga" on storage.objects;
create policy "produtos: loja apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and (select public.eh_loja()));

-- interesses: fichas <id do interessado>.jpg. O site só envia nos 10 minutos depois do pedido.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('interesses', 'interesses', true, 1048576, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];
drop policy if exists "interesses: site envia a ficha" on storage.objects;
create policy "interesses: site envia a ficha" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'interesses' and public.lead_recente(name));

-- ─── Tempo real: avisa os Macs na hora em que algo muda ──────────────────────
do $$ begin alter publication supabase_realtime add table public.products; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.repairs;  exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.activity; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.kv;       exception when others then null; end $$;

commit;

-- Confira: só podem aparecer contas da loja. Se tiver algum e-mail estranho, apague a conta em
-- Authentication → Users (ela sai desta lista sozinha).
select c.email, c.added_at, u.created_at as conta_criada_em, u.last_sign_in_at as ultimo_login
from public.contas_loja c join auth.users u on u.id = c.user_id
order by u.created_at;
