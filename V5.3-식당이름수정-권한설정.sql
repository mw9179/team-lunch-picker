-- V5.3: Existing Supabase project, run once in SQL Editor.
-- Allows authenticated (including anonymous-signed-in) members to rename restaurants.
-- Does not delete restaurants, votes, or draws.
GRANT UPDATE (name) ON TABLE public.restaurants TO authenticated;
DROP POLICY IF EXISTS "team edit restaurant names" ON public.restaurants;
CREATE POLICY "team edit restaurant names" ON public.restaurants
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
