-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create email_campaigns table (for batch scheduling)
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  delay_between_emails INTEGER NOT NULL DEFAULT 2, -- seconds
  hourly_limit INTEGER NOT NULL DEFAULT 200,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_emails INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'paused', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on email_campaigns
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Email campaigns policies
CREATE POLICY "Users can view their own campaigns" 
ON public.email_campaigns FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns" 
ON public.email_campaigns FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
ON public.email_campaigns FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
ON public.email_campaigns FOR DELETE 
USING (auth.uid() = user_id);

-- Create scheduled_emails table (individual emails in a campaign)
CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pending', 'sending', 'sent', 'failed')),
  error_message TEXT,
  ethereal_message_url TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on scheduled_emails
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Scheduled emails policies
CREATE POLICY "Users can view their own scheduled emails" 
ON public.scheduled_emails FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled emails" 
ON public.scheduled_emails FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled emails" 
ON public.scheduled_emails FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled emails" 
ON public.scheduled_emails FOR DELETE 
USING (auth.uid() = user_id);

-- Create rate_limit_counters table for tracking hourly email limits
CREATE TABLE public.rate_limit_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  hour_window TIMESTAMP WITH TIME ZONE NOT NULL,
  email_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sender_email, hour_window)
);

-- Enable RLS on rate_limit_counters
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Rate limit counters policies (service role only for edge functions)
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limit_counters FOR SELECT 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_scheduled_emails_status ON public.scheduled_emails(status);
CREATE INDEX idx_scheduled_emails_scheduled_time ON public.scheduled_emails(scheduled_time);
CREATE INDEX idx_scheduled_emails_campaign ON public.scheduled_emails(campaign_id);
CREATE INDEX idx_rate_limit_window ON public.rate_limit_counters(user_id, sender_email, hour_window);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_emails_updated_at
  BEFORE UPDATE ON public.scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();