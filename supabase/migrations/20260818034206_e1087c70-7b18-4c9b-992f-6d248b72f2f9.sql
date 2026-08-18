ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mascot_color text NOT NULL DEFAULT 'bordeaux',
  ADD COLUMN IF NOT EXISTS mascot_accessory text NOT NULL DEFAULT 'none';