-- Site da IMPRTS: descrição e fotos de cada produto + vitrine pública atualizada.
-- Seguro rodar mais de uma vez.

-- 1. Campos novos do produto
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists cover text;

-- 2. Pasta pública "produtos" para as fotos reais (leitura pública; envio só pelos Macs da loja)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true;

drop policy if exists "produtos: loja envia" on storage.objects;
create policy "produtos: loja envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos');
drop policy if exists "produtos: loja troca" on storage.objects;
create policy "produtos: loja troca" on storage.objects for update to authenticated
  using (bucket_id = 'produtos');
drop policy if exists "produtos: loja apaga" on storage.objects;
create policy "produtos: loja apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'produtos');

-- 3. Vitrine (o que o site enxerga): sem custo, IMEI, cliente nem observações internas.
--    Vendidos continuam por 7 dias com o selo "Vendido".
drop view if exists public.vitrine;
create view public.vitrine as
select p.id, p.code, p.category, p.model_id, p.color_id, p.name, p.storage, p.ram, p.chip,
       p.battery_health, p.condition, p.parts, p.price,
       (p.status = 'vendido') as vendido, p.status, p.created_at, p.updated_at, p.sold_at,
       p.description, p.photos, p.cover
from public.products p
where p.publish = true
  and coalesce(p.deleted, false) = false
  and (p.status <> 'vendido' or p.sold_at > now() - interval '7 days');

grant select on public.vitrine to anon, authenticated;
