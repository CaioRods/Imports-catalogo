-- Clientes do site: interessados (formulário "Tenho interesse") + métricas de visita.
-- O site (chave pública) só ESCREVE pelas funções site_track e site_lead, que validam tudo;
-- ler os dados é só para os Macs da loja (usuário autenticado). Seguro rodar mais de uma vez.

-- 1. Eventos de navegação (visita, produto aberto, clique no catálogo, tempo na página)
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
create policy "site_events: loja lê" on public.site_events for select to authenticated using (true);
drop policy if exists "site_events: loja apaga" on public.site_events;
create policy "site_events: loja apaga" on public.site_events for delete to authenticated using (true);

-- 2. Interessados
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
create policy "leads: loja lê" on public.leads for select to authenticated using (true);
drop policy if exists "leads: loja muda" on public.leads;
create policy "leads: loja muda" on public.leads for update to authenticated using (true);
drop policy if exists "leads: loja apaga" on public.leads;
create policy "leads: loja apaga" on public.leads for delete to authenticated using (true);

-- 3. Site grava eventos em lote (até 60 por chamada). Recebe texto puro (JSON) para o navegador
--    conseguir enviar até quando a pessoa fecha a página (sendBeacon).
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

-- 4. Site registra um interessado; devolve o id (usado no nome da imagem da ficha)
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

-- 5. Imagens das fichas (pasta pública "interesses"). O site só envia <id do interessado>.jpg
--    nos primeiros 10 minutos depois do pedido — ninguém sobe arquivo solto.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('interesses', 'interesses', true, 1048576, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

-- A conferência fica numa função "security definer": o site (anon) não enxerga a tabela leads,
-- então um "exists (select … from leads)" direto na regra sempre dava falso e a ficha nunca subia.
create or replace function public.lead_recente(obj text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from leads l
                 where l.id::text || '.jpg' = obj and l.created_at > now() - interval '10 minutes');
$$;
revoke all on function public.lead_recente(text) from public;
grant execute on function public.lead_recente(text) to anon, authenticated;

drop policy if exists "interesses: site envia a ficha" on storage.objects;
create policy "interesses: site envia a ficha" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'interesses' and public.lead_recente(name));

-- 6. Painel "Clientes" do sistema: tudo agregado no banco, numa chamada só
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
