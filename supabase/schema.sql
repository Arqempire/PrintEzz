-- Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 1. Shops Table
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  price_per_page_bw numeric default 2.00 check (price_per_page_bw >= 0),
  price_per_page_color numeric default 10.00 check (price_per_page_color >= 0),
  last_seen timestamptz default now(),
  is_accepting_jobs boolean default true,
  created_at timestamptz default now()
);

-- 2. Print Jobs Table
create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops(id) on delete cascade not null,
  file_url text,
  file_name text not null,
  page_count int not null default 1 check (page_count > 0),
  copies int not null default 1 check (copies > 0),
  color_mode text default 'bw' check (color_mode in ('bw', 'color')),
  duplex boolean default false,
  page_range text default 'all',
  price numeric not null check (price >= 0),
  status text default 'pending' check (status in ('pending', 'paid', 'queued', 'printing', 'done', 'failed', 'needs_attention', 'abandoned')),
  failure_reason text,
  retry_count int default 0,
  retention_extended boolean default false,
  delete_at timestamptz,
  payment_id text,
  payment_status text default 'unpaid',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indices
create index if not exists idx_print_jobs_shop_id on public.print_jobs(shop_id);
create index if not exists idx_print_jobs_status on public.print_jobs(status);
create index if not exists idx_print_jobs_delete_at on public.print_jobs(delete_at) where retention_extended = false;

-- Auto-update updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tr_print_jobs_updated_at
  before update on public.print_jobs
  for each row execute function public.handle_updated_at();

-- Auto-set delete_at based on job status transitions
create or replace function public.handle_job_retention()
returns trigger as $$
begin
  if new.status in ('done', 'failed', 'needs_attention') and old.status not in ('done', 'failed', 'needs_attention') then
    new.delete_at = now() + interval '24 hours';
  elsif new.status = 'abandoned' and old.status <> 'abandoned' then
    new.delete_at = now() + interval '1 hour';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tr_print_jobs_retention
  before insert or update on public.print_jobs
  for each row execute function public.handle_job_retention();

-- Enable Row Level Security
alter table public.shops enable row level security;
alter table public.print_jobs enable row level security;

-- RLS Policies for Shops
create policy "Allow public read access to shops"
  on public.shops for select
  using (true);

create policy "Allow shop owner full access to their shop"
  on public.shops for all
  using (auth.uid() = owner_id);

-- RLS Policies for Print Jobs
create policy "Allow public to insert new print jobs"
  on public.print_jobs for insert
  with check (true);

create policy "Allow public to read print job by ID"
  on public.print_jobs for select
  using (true);

create policy "Allow shop owners to manage print jobs for their shop"
  on public.print_jobs for all
  using (
    exists (
      select 1 from public.shops
      where shops.id = print_jobs.shop_id
      and shops.owner_id = auth.uid()
    )
  );

-- Enable Supabase Realtime for print_jobs
alter publication supabase_realtime add table public.print_jobs;

-- 3. Create Supabase Storage Bucket for Print Files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'print-files',
  'print-files',
  false,
  20971520, -- 20MB limit per document
  array[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Supabase Storage RLS Policies
create policy "Allow public upload to print-files bucket"
  on storage.objects for insert
  with check (bucket_id = 'print-files');

create policy "Allow public download from print-files bucket"
  on storage.objects for select
  using (bucket_id = 'print-files');

create policy "Allow deletion from print-files bucket"
  on storage.objects for delete
  using (bucket_id = 'print-files');
