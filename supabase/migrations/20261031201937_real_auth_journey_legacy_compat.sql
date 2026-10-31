-- LOCAL ONLY: preserve legacy rows while permitting child/day confirmation history.
BEGIN;
ALTER TABLE public.cooked_recipes DROP CONSTRAINT cooked_recipes_user_recipe_unique;
CREATE UNIQUE INDEX cooked_legacy_user_recipe ON public.cooked_recipes(user_id,recipe_id) WHERE source='legacy';
CREATE FUNCTION public.v2_mark_legacy_recipe(p_recipe_id text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF p_recipe_id IS NULL OR p_recipe_id!~'^[a-z0-9-]{1,100}$' THEN RAISE EXCEPTION 'invalid recipe' USING ERRCODE='22023'; END IF;
 INSERT INTO public.cooked_recipes(user_id,recipe_id,cooked_at,source) VALUES(auth.uid(),p_recipe_id,now(),'legacy')
 ON CONFLICT(user_id,recipe_id) WHERE source='legacy' DO UPDATE SET cooked_at=excluded.cooked_at;
END $$;
REVOKE ALL ON FUNCTION public.v2_mark_legacy_recipe(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v2_mark_legacy_recipe(text) TO authenticated;
COMMIT;
