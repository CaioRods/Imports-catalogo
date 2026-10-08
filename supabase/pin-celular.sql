-- Entrada do sistema do celular só com perfil + PIN (sem e-mail e senha).
-- O PIN é conferido no servidor (api/sistema-entrar.js), que entra com a conta da loja.
-- Esta trava conta os erros de PIN de cada perfil e bloqueia quem errar demais:
--   a cada 5 erros seguidos o perfil fica bloqueado 15 minutos; a partir de 15 erros, 24 horas.
-- Acertar o PIN zera a contagem. Pode rodar de novo sem problema.
-- (Também está no banco-completo.sql.)
begin;

create table if not exists public.pin_tentativas (
  conta         text primary key,
  falhas        int not null default 0,
  bloqueado_ate timestamptz
);
alter table public.pin_tentativas enable row level security;
revoke all on public.pin_tentativas from anon, authenticated;

-- Reserva uma tentativa ANTES de conferir o PIN (conta como erro até dar certo, assim
-- tentativas ao mesmo tempo não furam a trava). Devolve os segundos de bloqueio (0 = pode tentar).
create or replace function public.pin_reservar(p_conta text) returns integer
language plpgsql security definer set search_path = public as $$
declare r public.pin_tentativas;
begin
  if not public.eh_loja() then raise exception 'sem acesso'; end if;
  if p_conta not in ('rafael', 'funcionario', 'caleb') then raise exception 'perfil inválido'; end if;
  insert into public.pin_tentativas (conta) values (p_conta) on conflict do nothing;
  select * into r from public.pin_tentativas where conta = p_conta for update;
  if r.bloqueado_ate > now() then return ceil(extract(epoch from r.bloqueado_ate - now()))::int; end if;
  update public.pin_tentativas set
    falhas = r.falhas + 1,
    bloqueado_ate = case when (r.falhas + 1) % 5 = 0
      then now() + case when r.falhas + 1 >= 15 then interval '24 hours' else interval '15 minutes' end end
  where conta = p_conta;
  return 0;
end $$;

-- PIN certo: zera a contagem do perfil.
create or replace function public.pin_acertou(p_conta text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_loja() then raise exception 'sem acesso'; end if;
  update public.pin_tentativas set falhas = 0, bloqueado_ate = null where conta = p_conta;
end $$;

revoke all on function public.pin_reservar(text) from public;
revoke all on function public.pin_acertou(text) from public;
grant execute on function public.pin_reservar(text) to authenticated;
grant execute on function public.pin_acertou(text) to authenticated;

commit;
