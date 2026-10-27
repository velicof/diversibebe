-- Schema-only fixture reconstructed from read-only metadata. NO production rows.
CREATE TABLE public.profiles ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"email" text NOT NULL,
"name" text,
"image" text,
"created_at" timestamptz DEFAULT now());
CREATE TABLE public.babies ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid,
"name" text NOT NULL,
"birthdate" date,
"gender" text,
"weight_kg" numeric,
"created_at" timestamptz DEFAULT now(),
"updated_at" timestamptz DEFAULT now(),
"avatar_url" text);
CREATE TABLE public.food_journal ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid,
"baby_id" uuid,
"food_id" text NOT NULL,
"food_name" text NOT NULL,
"meal_type" text,
"reaction" text,
"notes" text,
"logged_at" timestamptz DEFAULT now(),
"symptoms" text[] DEFAULT '{}'::text[],
"portion" text,
"baby_mood" text,
"quantity_grams" int4,
"custom_recipe_id" text);
CREATE TABLE public.tried_foods ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid,
"baby_id" uuid,
"food_id" text NOT NULL,
"food_name" text NOT NULL,
"first_tried_at" timestamptz DEFAULT now(),
"try_count" int4 DEFAULT 1);
CREATE TABLE public.allergy_records ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid,
"baby_id" uuid,
"food_id" text,
"food_name" text NOT NULL,
"severity" text,
"notes" text,
"recorded_at" timestamptz DEFAULT now());
CREATE TABLE public.cooked_recipes ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid,
"recipe_id" text NOT NULL,
"cooked_at" timestamptz DEFAULT now());
CREATE TABLE public.favorite_recipes ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid,
"recipe_id" text NOT NULL,
"saved_at" timestamptz DEFAULT now());
CREATE TABLE public.login_events ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid,
"logged_in_at" timestamptz DEFAULT now(),
"platform" text DEFAULT 'web'::text);
CREATE TABLE public.custom_foods ("id" text NOT NULL,
"user_id" uuid,
"name" text NOT NULL,
"emoji" text DEFAULT '🍽️'::text NOT NULL,
"created_at" timestamptz DEFAULT now());
CREATE TABLE public.feedback ("id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid,
"question_1" text,
"question_2" text,
"question_3" text,
"created_at" timestamptz DEFAULT now());
CREATE TABLE public.custom_recipes ("id" text NOT NULL,
"user_id" uuid NOT NULL,
"name" text NOT NULL,
"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
"created_at" timestamptz DEFAULT now() NOT NULL);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE (email);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."tried_foods" ADD CONSTRAINT "tried_foods_pkey" PRIMARY KEY (id);
ALTER TABLE public."tried_foods" ADD CONSTRAINT "tried_foods_user_id_food_id_key" UNIQUE (user_id, food_id);
ALTER TABLE public."allergy_records" ADD CONSTRAINT "allergy_records_pkey" PRIMARY KEY (id);
ALTER TABLE public."allergy_records" ADD CONSTRAINT "allergy_records_severity_check" CHECK ((severity = ANY (ARRAY['usoara'::text, 'moderata'::text, 'severa'::text])));
ALTER TABLE public."cooked_recipes" ADD CONSTRAINT "cooked_recipes_pkey" PRIMARY KEY (id);
ALTER TABLE public."cooked_recipes" ADD CONSTRAINT "cooked_recipes_user_recipe_unique" UNIQUE (user_id, recipe_id);
ALTER TABLE public."favorite_recipes" ADD CONSTRAINT "favorite_recipes_pkey" PRIMARY KEY (id);
ALTER TABLE public."favorite_recipes" ADD CONSTRAINT "favorite_recipes_user_id_recipe_id_key" UNIQUE (user_id, recipe_id);
ALTER TABLE public."babies" ADD CONSTRAINT "babies_gender_check" CHECK ((gender = ANY (ARRAY['boy'::text, 'girl'::text])));
ALTER TABLE public."babies" ADD CONSTRAINT "babies_pkey" PRIMARY KEY (id);
ALTER TABLE public."custom_recipes" ADD CONSTRAINT "custom_recipes_pkey" PRIMARY KEY (id);
ALTER TABLE public."custom_foods" ADD CONSTRAINT "custom_foods_pkey" PRIMARY KEY (id);
ALTER TABLE public."food_journal" ADD CONSTRAINT "food_journal_meal_type_check" CHECK ((meal_type = ANY (ARRAY['mic-dejun'::text, 'pranz'::text, 'cina'::text, 'gustare'::text])));
ALTER TABLE public."food_journal" ADD CONSTRAINT "food_journal_pkey" PRIMARY KEY (id);
ALTER TABLE public."food_journal" ADD CONSTRAINT "food_journal_reaction_check" CHECK ((reaction = ANY (ARRAY['pozitiv'::text, 'neutru'::text, 'negativ'::text, 'alergie'::text, 'loved'::text, 'ok'::text, 'disliked'::text, 'refused'::text])));
ALTER TABLE public."login_events" ADD CONSTRAINT "login_events_pkey" PRIMARY KEY (id);
ALTER TABLE public."feedback" ADD CONSTRAINT "feedback_pkey" PRIMARY KEY (id);
ALTER TABLE public."tried_foods" ADD CONSTRAINT "tried_foods_baby_id_fkey" FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE;
ALTER TABLE public."tried_foods" ADD CONSTRAINT "tried_foods_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."allergy_records" ADD CONSTRAINT "allergy_records_baby_id_fkey" FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE;
ALTER TABLE public."allergy_records" ADD CONSTRAINT "allergy_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."cooked_recipes" ADD CONSTRAINT "cooked_recipes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."favorite_recipes" ADD CONSTRAINT "favorite_recipes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."babies" ADD CONSTRAINT "babies_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."custom_recipes" ADD CONSTRAINT "custom_recipes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."custom_foods" ADD CONSTRAINT "custom_foods_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."food_journal" ADD CONSTRAINT "food_journal_baby_id_fkey" FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE;
ALTER TABLE public."food_journal" ADD CONSTRAINT "food_journal_custom_recipe_id_fkey" FOREIGN KEY (custom_recipe_id) REFERENCES custom_recipes(id) ON DELETE SET NULL;
ALTER TABLE public."food_journal" ADD CONSTRAINT "food_journal_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."login_events" ADD CONSTRAINT "login_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.profiles TO anon,authenticated;
ALTER TABLE public.babies ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.babies TO anon,authenticated;
ALTER TABLE public.food_journal ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.food_journal TO anon,authenticated;
ALTER TABLE public.tried_foods ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.tried_foods TO anon,authenticated;
ALTER TABLE public.allergy_records ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.allergy_records TO anon,authenticated;
ALTER TABLE public.cooked_recipes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.cooked_recipes TO anon,authenticated;
ALTER TABLE public.favorite_recipes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.favorite_recipes TO anon,authenticated;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.login_events TO anon,authenticated;
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.custom_foods TO anon,authenticated;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.feedback TO anon,authenticated;
ALTER TABLE public.custom_recipes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.custom_recipes TO anon,authenticated;
CREATE POLICY "own_profile" ON public."profiles" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = id));
CREATE POLICY "own_tried_foods" ON public."tried_foods" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));
CREATE POLICY "own_allergies" ON public."allergy_records" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));
CREATE POLICY "own_cooked" ON public."cooked_recipes" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));
CREATE POLICY "own_favorites" ON public."favorite_recipes" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));
CREATE POLICY "own_babies" ON public."babies" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));
CREATE POLICY "Users can manage own custom recipes" ON public."custom_recipes" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users manage own custom foods" ON public."custom_foods" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "own_journal" ON public."food_journal" AS PERMISSIVE FOR ALL TO "public" USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own login events" ON public."login_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own login events" ON public."login_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own feedback" ON public."feedback" AS PERMISSIVE FOR INSERT TO "public" WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own feedback" ON public."feedback" AS PERMISSIVE FOR SELECT TO "public" USING ((auth.uid() = user_id));
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, image)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE VIEW public.user_login_summary AS  SELECT p.name,
    p.email,
    count(l.id) AS numar_logari,
    min(l.logged_in_at) AS prima_logare,
    max(l.logged_in_at) AS ultima_logare
   FROM login_events l
     JOIN profiles p ON p.id = l.user_id
  GROUP BY p.id, p.name, p.email
  ORDER BY (count(l.id)) DESC;
GRANT ALL ON public.user_login_summary TO anon,authenticated;
