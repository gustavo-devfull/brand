-- Brand Automation Engine — schema do workspace persistente.
--
-- Cada linha pertence ao usuário (possivelmente anônimo) que a criou. O row level
-- security é a única fronteira entre inquilinos: a aplicação nunca usa a service-role
-- key, então uma brecha de política seria vazamento real, não formalidade.
--
-- A chave primária é sempre COMPOSTA, (owner_id, id). O workspace demo é semeado com
-- ids fixos e idênticos para todo mundo, então uma PK só em `id` faria o segundo
-- visitante colidir com as linhas do primeiro.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Sistemas de marca
-- ---------------------------------------------------------------------------
create table if not exists public.brands (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

-- Tokens e regras saem do payload da marca para poderem ser consultados, comparados
-- e auditados independentemente do documento em que chegaram.
create table if not exists public.brand_tokens (
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, brand_id),
  foreign key (owner_id, brand_id) references public.brands (owner_id, id) on delete cascade
);

create table if not exists public.brand_rules (
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, brand_id),
  foreign key (owner_id, brand_id) references public.brands (owner_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Imagens e templates
-- ---------------------------------------------------------------------------
-- payload.data guarda o caminho do objeto no storage, nunca os bytes: o raster vive
-- no bucket privado `brand-assets`.
create table if not exists public.brand_assets (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, brand_id) references public.brands (owner_id, id) on delete cascade
);

create table if not exists public.templates (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, brand_id) references public.brands (owner_id, id) on delete cascade
);

-- payload.data guarda o caminho do arquivo no storage, como nas imagens.
create table if not exists public.brand_fonts (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, brand_id) references public.brands (owner_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Campanhas, a saída estruturada do agente, e o que foi renderizado dela
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, brand_id) references public.brands (owner_id, id) on delete cascade
);

create table if not exists public.creative_specs (
  id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  campaign_id uuid not null,
  template_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, brand_id) references public.brands (owner_id, id) on delete cascade,
  foreign key (owner_id, campaign_id) references public.campaigns (owner_id, id) on delete cascade,
  foreign key (owner_id, template_id) references public.templates (owner_id, id) on delete cascade
);

create table if not exists public.generated_assets (
  id uuid not null default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null,
  creative_spec_id uuid not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (owner_id, brand_id) references public.brands (owner_id, id) on delete cascade,
  foreign key (owner_id, creative_spec_id) references public.creative_specs (owner_id, id) on delete cascade
);

create index if not exists brand_assets_brand_idx on public.brand_assets (owner_id, brand_id);
create index if not exists brand_fonts_brand_idx on public.brand_fonts (owner_id, brand_id);
create index if not exists templates_brand_idx on public.templates (owner_id, brand_id);
create index if not exists campaigns_recent_idx on public.campaigns (owner_id, created_at desc);
create index if not exists creative_specs_campaign_idx on public.creative_specs (owner_id, campaign_id);
create index if not exists generated_assets_spec_idx on public.generated_assets (owner_id, creative_spec_id);

-- ---------------------------------------------------------------------------
-- Row level security: um conjunto de políticas, igual em todas as tabelas
-- ---------------------------------------------------------------------------
do $$
declare
  target text;
begin
  foreach target in array array[
    'brands','brand_tokens','brand_rules','brand_assets','brand_fonts',
    'templates','campaigns','creative_specs','generated_assets'
  ]
  loop
    execute format('alter table public.%I enable row level security', target);
    execute format('alter table public.%I force row level security', target);

    execute format('drop policy if exists %I on public.%I', target || '_select', target);
    execute format('drop policy if exists %I on public.%I', target || '_insert', target);
    execute format('drop policy if exists %I on public.%I', target || '_update', target);
    execute format('drop policy if exists %I on public.%I', target || '_delete', target);

    execute format(
      'create policy %I on public.%I for select to authenticated using (owner_id = (select auth.uid()))',
      target || '_select', target);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))',
      target || '_insert', target);
    execute format(
      'create policy %I on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      target || '_update', target);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (owner_id = (select auth.uid()))',
      target || '_delete', target);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Storage privado para as imagens de campanha
-- ---------------------------------------------------------------------------
-- Os objetos são gravados como `<owner_id>/<brand_id>/<id>`, então o primeiro
-- segmento do caminho é a checagem de inquilino. O bucket guarda imagens e fontes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  false,
  5000000,
  array['image/jpeg','image/png','image/webp','image/svg+xml','font/ttf','font/otf','application/octet-stream']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "brand assets are readable by their owner" on storage.objects;
create policy "brand assets are readable by their owner"
  on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "brand assets are writable by their owner" on storage.objects;
create policy "brand assets are writable by their owner"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "brand assets are replaceable by their owner" on storage.objects;
create policy "brand assets are replaceable by their owner"
  on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "brand assets are removable by their owner" on storage.objects;
create policy "brand assets are removable by their owner"
  on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
