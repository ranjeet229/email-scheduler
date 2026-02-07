-- Enable realtime for scheduled_emails table
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_emails;

-- Create a function to increment campaign sent count atomically
CREATE OR REPLACE FUNCTION public.increment_campaign_sent_count(campaign_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.email_campaigns
  SET sent_count = sent_count + 1,
      updated_at = now()
  WHERE id = campaign_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function to increment failed count atomically
CREATE OR REPLACE FUNCTION public.increment_campaign_failed_count(campaign_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.email_campaigns
  SET failed_count = failed_count + 1,
      updated_at = now()
  WHERE id = campaign_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create service role policy for rate_limit_counters (for edge function access)
CREATE POLICY "Service role can manage rate limits" 
ON public.rate_limit_counters 
FOR ALL 
USING (true)
WITH CHECK (true);