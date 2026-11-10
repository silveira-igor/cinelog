-- ============================================================================
-- SCRIPT SQL PARA O SUPABASE (Copie e cole no "SQL Editor" do Supabase e clique em Run)
-- ============================================================================

create table if not exists public.cinema_visits (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer,
  title text not null,
  original_title text,
  poster_url text,
  release_date date,
  visit_date date not null default current_date,
  ticket_origin text not null default 'Club', -- 'Voucher', 'Club', 'Comprado'
  session_format text not null default '2D',  -- '2D', '3D', 'XD', 'IMAX'
  audio_type text not null default 'Legendado', -- 'Legendado', 'Dublado', 'Original'
  price_paid numeric(10,2) not null default 0,
  cinema_location text default '',
  company text default 'Sozinho',
  rating numeric(2,1) not null default 0, -- 0.5 a 5.0 (meia estrela igual Letterboxd)
  notes text default '',
  created_at timestamptz not null default now()
);

-- Índices para deixar filtros e ordenação super rápidos
create index if not exists idx_cinema_visits_visit_date on public.cinema_visits (visit_date desc, created_at desc);

-- Habilita Row Level Security (RLS) com acesso público via Anon Key para o app pessoal
alter table public.cinema_visits enable row level security;

drop policy if exists "Permitir leitura publica de cinema_visits" on public.cinema_visits;
create policy "Permitir leitura publica de cinema_visits"
  on public.cinema_visits for select
  using (true);

drop policy if exists "Permitir insercao publica de cinema_visits" on public.cinema_visits;
create policy "Permitir insercao publica de cinema_visits"
  on public.cinema_visits for insert
  with check (true);

drop policy if exists "Permitir atualizacao publica de cinema_visits" on public.cinema_visits;
create policy "Permitir atualizacao publica de cinema_visits"
  on public.cinema_visits for update
  using (true);

drop policy if exists "Permitir exclusao publica de cinema_visits" on public.cinema_visits;
create policy "Permitir exclusao publica de cinema_visits"
  on public.cinema_visits for delete
  using (true);
