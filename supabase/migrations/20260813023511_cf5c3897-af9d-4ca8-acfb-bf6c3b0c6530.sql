ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS render_mode text NOT NULL DEFAULT '2d',
  ADD COLUMN IF NOT EXISTS alley_greeting text;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_render_mode_check;
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_render_mode_check CHECK (render_mode IN ('2d','3d'));

UPDATE public.lessons SET render_mode = '3d' WHERE id IN ('algebra-lesson-3','science-lesson-2');
UPDATE public.lessons SET alley_greeting = 'Good to see you back. Let''s pick up where we left off with ' || title || '.' WHERE alley_greeting IS NULL;