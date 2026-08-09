-- Tree Nursery — Supabase schema (run in the SQL editor of a new project)
-- After running: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in site/.env.local

create table trees (
  slug text primary key,
  code text not null,
  name_he text not null,
  species_latin text not null default '',
  story_he text not null default '',
  ai_notes_he text not null default '',
  height_m numeric not null default 0,
  trunk_diameter_cm numeric not null default 0,
  age_years numeric not null default 0,
  root_ball_weight_kg numeric,
  requirements_he text,
  price numeric not null default 0,
  price_mode text not null default 'from' check (price_mode in ('hidden','from','visible')),
  availability text not null default 'available' check (availability in ('available','reserved','preorder','sold')),
  sale_type text not null default 'stock' check (sale_type in ('unique','stock')),
  category_he text default '',
  featured boolean not null default false,
  photos jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table leads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text,
  message text default '',
  interest text default '',
  items jsonb not null default '[]',
  channel text not null check (channel in ('form','rfq','ai_chat','whatsapp_click')),
  source_page text default '',
  is_pro boolean not null default false,
  status text not null default 'new' check (status in ('new','contacted','visited','planted'))
);

create table settings (
  id integer primary key,
  value jsonb not null
);

-- singleton jsonb documents: quotes, milestones, content
create table documents (
  key text primary key,
  value jsonb not null
);

create table guides (
  slug text primary key,
  title_he text not null,
  category_he text not null default '',
  minutes integer not null default 5,
  excerpt_he text not null default '',
  body_md text not null default '',
  published boolean not null default false
);

create table projects (
  slug text primary key,
  title_he text not null,
  city_he text not null default '',
  map_x numeric not null default 0,
  map_y numeric not null default 0,
  year integer,
  story_he text not null default '',
  meta_he text not null default '',
  published boolean not null default false
);

-- Row-level security: the site talks to the DB only through the server with
-- the service-role key, so lock everything down for anon access.
alter table trees enable row level security;
alter table leads enable row level security;
alter table settings enable row level security;
alter table guides enable row level security;
alter table projects enable row level security;

-- Public (anon) may read published content only; leads/settings are server-only.
create policy "public read trees" on trees for select using (true);
create policy "public read guides" on guides for select using (published);
create policy "public read projects" on projects for select using (published);
