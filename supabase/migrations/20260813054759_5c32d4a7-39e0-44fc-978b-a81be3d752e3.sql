ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portrait jsonb NOT NULL DEFAULT '{"skin":"skin_vanilla","eyes":"eyes_brown","hair":"hair_honey","clothes":"clothes_sunny_sea"}'::jsonb;