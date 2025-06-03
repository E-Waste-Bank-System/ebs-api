-- Enable necessary extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Create custom types for better type safety
create type scan_status as enum ('pending', 'processing', 'completed', 'failed');
create type detection_source as enum ('YOLO', 'Gemini Interfered', 'System');

-- 1. Profiles Table (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add RLS policies
alter table public.profiles enable row level security;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Articles Table
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  image_url text,
  slug text unique not null, -- For SEO-friendly URLs
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  author_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  published_at timestamptz,
  deleted_at timestamptz -- For soft deletes
);

-- Add indexes
create index idx_articles_status on public.articles(status);
create index idx_articles_author on public.articles(author_id);
create index idx_articles_created_at on public.articles(created_at);
create index idx_articles_slug on public.articles(slug);

-- 3. Scans Table (for grouping multiple object detections)
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status scan_status not null default 'pending',
  metadata jsonb, -- For storing additional scan information
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz,
  deleted_at timestamptz -- For soft deletes
);

-- Add indexes
create index idx_scans_user_id on public.scans(user_id);
create index idx_scans_status on public.scans(status);
create index idx_scans_created_at on public.scans(created_at);

-- 4. Objects Table (raw AI results, editable by user)
create table public.objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  image_url text not null,
  detection_source detection_source not null default 'YOLO',
  category text not null,
  confidence float not null check (confidence >= 0 and confidence <= 1),
  regression_result float,
  description text,
  suggestions text[], -- Using array type for better querying
  risk_level integer check (risk_level >= 1 and risk_level <= 10),
  metadata jsonb, -- For additional object-specific data
  is_validated boolean not null default false,
  validated_at timestamptz,
  validated_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz -- For soft deletes
);

-- Add indexes
create index idx_objects_scan_id on public.objects(scan_id);
create index idx_objects_user_id on public.objects(user_id);
create index idx_objects_category on public.objects(category);
create index idx_objects_created_at on public.objects(created_at);
create index idx_objects_is_validated on public.objects(is_validated);
create index idx_objects_confidence on public.objects(confidence);

-- 5. Ewaste Table (finalized/confirmed e-waste records)
create table public.ewaste (
  id uuid primary key default gen_random_uuid(),
  object_id uuid references public.objects(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  quantity float not null default 1 check (quantity > 0),
  estimated_price float check (estimated_price >= 0),
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'processed', 'rejected')),
  metadata jsonb, -- For additional ewaste-specific data
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz -- For soft deletes
);

-- Add indexes
create index idx_ewaste_user_id on public.ewaste(user_id);
create index idx_ewaste_category on public.ewaste(category);
create index idx_ewaste_created_at on public.ewaste(created_at);
create index idx_ewaste_object_id on public.ewaste(object_id);
create index idx_ewaste_status on public.ewaste(status);

-- 6. Retraining Data Table (for model improvement)
create table public.retraining_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  object_id uuid not null references public.objects(id) on delete cascade,
  image_url text not null,
  original_category text not null,
  bbox_coordinates jsonb not null,
  confidence_score float not null check (confidence_score >= 0 and confidence_score <= 1),
  corrected_category text,
  original_price float,
  corrected_price float,
  is_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  model_version text not null,
  metadata jsonb, -- For additional retraining-specific data
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz -- For soft deletes
);

-- Add indexes
create index idx_retraining_data_user_id on public.retraining_data(user_id);
create index idx_retraining_data_object_id on public.retraining_data(object_id);
create index idx_retraining_data_original_category on public.retraining_data(original_category);
create index idx_retraining_data_corrected_category on public.retraining_data(corrected_category);
create index idx_retraining_data_is_verified on public.retraining_data(is_verified);
create index idx_retraining_data_created_at on public.retraining_data(created_at);
create index idx_retraining_data_model_version on public.retraining_data(model_version);

-- 7. Validation History Table (for audit trails)
create table public.validation_history (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('verify', 'reject', 'modify')),
  previous_category text,
  new_category text,
  previous_confidence float,
  new_confidence float,
  notes text,
  created_at timestamptz default now()
);

-- Add indexes
create index idx_validation_history_object_id on public.validation_history(object_id);
create index idx_validation_history_user_id on public.validation_history(user_id);
create index idx_validation_history_created_at on public.validation_history(created_at);

-- 8. Model Versions Table (for tracking model versions)
create table public.model_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  description text,
  is_active boolean default false,
  performance_metrics jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add indexes
create index idx_model_versions_version on public.model_versions(version);
create index idx_model_versions_is_active on public.model_versions(is_active);

-- Create updated_at triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to all tables
create trigger handle_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.articles
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.scans
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.objects
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.ewaste
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.retraining_data
  for each row
  execute function public.handle_updated_at();

create trigger handle_updated_at
  before update on public.model_versions
  for each row
  execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.articles enable row level security;
alter table public.scans enable row level security;
alter table public.objects enable row level security;
alter table public.ewaste enable row level security;
alter table public.retraining_data enable row level security;
alter table public.validation_history enable row level security;
alter table public.model_versions enable row level security;

-- Add basic RLS policies
create policy "Users can view their own scans"
  on public.scans for select
  using (auth.uid() = user_id);

create policy "Users can create their own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own objects"
  on public.objects for select
  using (auth.uid() = user_id);

create policy "Users can create their own objects"
  on public.objects for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own ewaste"
  on public.ewaste for select
  using (auth.uid() = user_id);

create policy "Users can create their own ewaste"
  on public.ewaste for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own retraining data"
  on public.retraining_data for select
  using (auth.uid() = user_id);

create policy "Users can create their own retraining data"
  on public.retraining_data for insert
  with check (auth.uid() = user_id);