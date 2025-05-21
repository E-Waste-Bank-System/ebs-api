-- Enable UUID generation
create extension if not exists "pgcrypto";

-- 1. Admin Table
create table public.admin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
create unique index admin_user_id_unique on public.admin(user_id);

-- 2. Articles Table
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Scans Table (for grouping multiple object detections)
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
create index idx_scans_user_id on public.scans(user_id);
create index idx_scans_status on public.scans(status);
create index idx_scans_created_at on public.scans(created_at);

-- 4. Objects Table (raw AI results, editable by user)
create table public.objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  image_url text not null,
  detection_source text,
  category text not null,         -- was 'label'
  confidence float not null check (confidence >= 0 and confidence <= 1),
  regression_result float,        -- now nullable
  description text,               -- new: max 40 words (enforced in backend)
  suggestion text,                -- new: up to 3 points, joined by ' | ' (or use text[] for array)
  risk_lvl integer check (risk_lvl >= 1 and risk_lvl <= 10),  -- new: 1-10
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
create index idx_objects_scan_id on public.objects(scan_id);
create index idx_objects_user_id on public.objects(user_id);
create index idx_objects_category on public.objects(category);
create index idx_objects_created_at on public.objects(created_at);

-- 5. Detections Table (for tracking validated object detections)
create table public.detections (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_validated boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
create index idx_detections_object_id on public.detections(object_id);
create index idx_detections_user_id on public.detections(user_id);
create index idx_detections_created_at on public.detections(created_at);

-- 6. Ewaste Table (finalized/confirmed e-waste records)
create table public.ewaste (
  id uuid primary key default gen_random_uuid(),
  detection_id uuid references public.detections(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  quantity float not null default 1 check (quantity > 0),
  estimated_price float check (estimated_price >= 0),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
create index idx_ewaste_user_id on public.ewaste(user_id);
create index idx_ewaste_category on public.ewaste(category);
create index idx_ewaste_created_at on public.ewaste(created_at);

-- 7. Validations Table (feedback on AI accuracy)
create table public.validations (
  id uuid primary key default gen_random_uuid(),
  detection_id uuid not null references public.detections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_accurate boolean not null,
  feedback text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
create index idx_validations_detection_id on public.validations(detection_id);
create index idx_validations_user_id on public.validations(user_id);

-- 8. (Optional) Top 5 E-Waste Categories Function
create or replace function public.get_top_ewaste_categories(limit_count integer)
returns table(category text, count integer)
language sql
as $$
  select category, count(*) as count
  from public.detections
  group by category
  order by count desc
  limit limit_count;
$$;