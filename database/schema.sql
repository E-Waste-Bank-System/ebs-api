-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- Create custom types/enums
CREATE TYPE dataset_status AS ENUM ('draft', 'annotating', 'ready', 'training', 'completed', 'failed');
CREATE TYPE annotation_status AS ENUM ('pending', 'in_progress', 'completed', 'reviewed', 'rejected');
CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE scan_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE retraining_type AS ENUM ('correction', 'validation', 'improvement');

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  full_name character varying NOT NULL,
  avatar_url text,
  role user_role DEFAULT 'USER'::user_role,
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  email_verified boolean DEFAULT false,
  phone character varying,
  bio text,
  location character varying,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.articles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  content jsonb NOT NULL,
  excerpt text,
  featured_image text,
  status article_status DEFAULT 'draft'::article_status,
  tags text[] DEFAULT '{}'::text[],
  view_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  meta_title character varying,
  meta_description text,
  author_id uuid NOT NULL,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT articles_pkey PRIMARY KEY (id),
  CONSTRAINT articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.scans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  image_url text NOT NULL,
  original_filename character varying,
  status scan_status DEFAULT 'processing'::scan_status,
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  total_estimated_value numeric(12,2) DEFAULT 0,
  objects_count integer DEFAULT 0,
  processed_at timestamp with time zone,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT scans_pkey PRIMARY KEY (id),
  CONSTRAINT scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.detected_objects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  category character varying NOT NULL,
  confidence_score numeric(5,4) NOT NULL,
  bounding_box jsonb NOT NULL,
  estimated_value numeric(12,2),
  risk_level integer DEFAULT 1 CHECK (risk_level >= 1 AND risk_level <= 10),
  damage_level integer DEFAULT 1 CHECK (damage_level >= 1 AND damage_level <= 10),
  is_validated boolean DEFAULT false,
  validated_by uuid,
  validated_at timestamp with time zone,
  validation_notes text,
  ai_metadata jsonb DEFAULT '{}'::jsonb,
  scan_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  description text,
  suggestions text[],
  CONSTRAINT detected_objects_pkey PRIMARY KEY (id),
  CONSTRAINT detected_objects_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.profiles(id),
  CONSTRAINT detected_objects_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE CASCADE
);

CREATE TABLE public.datasets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  status dataset_status DEFAULT 'draft'::dataset_status,
  configuration jsonb,
  total_images integer DEFAULT 0,
  annotated_images integer DEFAULT 0,
  total_annotations integer DEFAULT 0,
  created_by uuid NOT NULL,
  training_started_at timestamp with time zone,
  training_completed_at timestamp with time zone,
  training_metrics jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT datasets_pkey PRIMARY KEY (id),
  CONSTRAINT datasets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.annotation_tasks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  dataset_id uuid NOT NULL,
  object_id uuid,
  image_url text NOT NULL,
  original_filename character varying,
  status annotation_status DEFAULT 'pending'::annotation_status,
  annotations jsonb,
  assigned_to uuid,
  assigned_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT annotation_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT annotation_tasks_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE,
  CONSTRAINT annotation_tasks_object_id_fkey FOREIGN KEY (object_id) REFERENCES public.detected_objects(id),
  CONSTRAINT annotation_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);

CREATE TABLE public.retraining_data (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  type retraining_type NOT NULL,
  original_category character varying NOT NULL,
  corrected_category character varying,
  original_confidence numeric(5,4) NOT NULL,
  corrected_value numeric(12,2),
  correction_data jsonb DEFAULT '{}'::jsonb,
  annotation_data jsonb,
  notes text,
  submitted_by uuid NOT NULL,
  is_processed boolean DEFAULT false,
  processed_at timestamp with time zone,
  object_id uuid,
  dataset_id uuid,
  annotation_task_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT retraining_data_pkey PRIMARY KEY (id),
  CONSTRAINT retraining_data_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id),
  CONSTRAINT retraining_data_object_id_fkey FOREIGN KEY (object_id) REFERENCES public.detected_objects(id) ON DELETE CASCADE,
  CONSTRAINT retraining_data_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE,
  CONSTRAINT retraining_data_annotation_task_id_fkey FOREIGN KEY (annotation_task_id) REFERENCES public.annotation_tasks(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_detected_objects_scan_id ON public.detected_objects(scan_id);
CREATE INDEX idx_detected_objects_category ON public.detected_objects(category);
CREATE INDEX idx_detected_objects_is_validated ON public.detected_objects(is_validated);
CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_status ON public.scans(status);
CREATE INDEX idx_scans_created_at ON public.scans(created_at DESC);
CREATE INDEX idx_articles_author_id ON public.articles(author_id);
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_slug ON public.articles(slug);

-- Function to update scan totals
CREATE OR REPLACE FUNCTION update_scan_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the scan totals whenever objects are inserted, updated, or deleted
  UPDATE public.scans 
  SET 
    objects_count = (
      SELECT COUNT(*) 
      FROM public.detected_objects 
      WHERE scan_id = COALESCE(NEW.scan_id, OLD.scan_id) AND deleted_at IS NULL
    ),
    total_estimated_value = (
      SELECT COALESCE(SUM(estimated_value), 0) 
      FROM public.detected_objects 
      WHERE scan_id = COALESCE(NEW.scan_id, OLD.scan_id) AND deleted_at IS NULL
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.scan_id, OLD.scan_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update scan totals
CREATE TRIGGER trigger_update_scan_totals_on_insert
  AFTER INSERT ON public.detected_objects
  FOR EACH ROW EXECUTE FUNCTION update_scan_totals();

CREATE TRIGGER trigger_update_scan_totals_on_update
  AFTER UPDATE ON public.detected_objects
  FOR EACH ROW EXECUTE FUNCTION update_scan_totals();

CREATE TRIGGER trigger_update_scan_totals_on_delete
  AFTER DELETE ON public.detected_objects
  FOR EACH ROW EXECUTE FUNCTION update_scan_totals();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scans_updated_at BEFORE UPDATE ON public.scans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_detected_objects_updated_at BEFORE UPDATE ON public.detected_objects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_annotation_tasks_updated_at BEFORE UPDATE ON public.annotation_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_retraining_data_updated_at BEFORE UPDATE ON public.retraining_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();