-- Notițe private per utilizator pe rețete gătite (pagina detaliu rețetă).
ALTER TABLE public.cooked_recipes
  ADD COLUMN IF NOT EXISTS notes text;
