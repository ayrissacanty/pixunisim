ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS grade_band text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS learning_style text,
  ADD COLUMN IF NOT EXISTS setup_complete boolean NOT NULL DEFAULT false;

ALTER TABLE public.student_progress
  ADD COLUMN IF NOT EXISTS time_spent_seconds integer NOT NULL DEFAULT 0;