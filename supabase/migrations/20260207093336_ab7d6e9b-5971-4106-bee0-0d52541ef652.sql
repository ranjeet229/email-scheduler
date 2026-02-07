-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limit_counters;

-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely
-- So we don't need a permissive policy. Regular users can only view their own data.
-- The service role key in edge functions automatically bypasses all RLS policies.