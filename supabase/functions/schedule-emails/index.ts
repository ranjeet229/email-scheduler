import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduleRequest {
  senderEmail: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = claims.claims.sub;
    
    // Parse request body
    const body: ScheduleRequest = await req.json();
    
    const {
      senderEmail,
      recipients,
      subject,
      body: emailBody,
      startTime,
      delayBetweenEmails = 2,
      hourlyLimit = 200,
    } = body;
    
    // Validation
    if (!senderEmail || !recipients?.length || !subject || !emailBody || !startTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate start time is in the future
    const scheduledStart = new Date(startTime);
    if (scheduledStart <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Start time must be in the future' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Scheduling ${recipients.length} emails for user ${userId}`);
    
    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        user_id: userId,
        subject,
        body: emailBody,
        sender_email: senderEmail,
        delay_between_emails: delayBetweenEmails,
        hourly_limit: hourlyLimit,
        start_time: startTime,
        total_emails: recipients.length,
        status: 'scheduled',
      })
      .select()
      .single();
    
    if (campaignError) {
      console.error('Campaign creation error:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Failed to create campaign', details: campaignError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create individual scheduled emails with staggered times
    const scheduledEmails = recipients.map((email, index) => {
      const scheduledTime = new Date(startTime);
      scheduledTime.setSeconds(scheduledTime.getSeconds() + (index * delayBetweenEmails));
      
      return {
        campaign_id: campaign.id,
        user_id: userId,
        recipient_email: email,
        subject,
        body: emailBody,
        sender_email: senderEmail,
        scheduled_time: scheduledTime.toISOString(),
        status: 'scheduled',
        idempotency_key: `${campaign.id}-${email}-${scheduledTime.getTime()}`,
      };
    });
    
    // Insert in batches for large recipient lists
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < scheduledEmails.length; i += batchSize) {
      const batch = scheduledEmails.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('scheduled_emails')
        .insert(batch);
      
      if (insertError) {
        console.error(`Batch insert error at ${i}:`, insertError);
        // Continue with other batches
      } else {
        inserted += batch.length;
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        campaignId: campaign.id,
        totalScheduled: inserted,
        startTime,
        estimatedEndTime: new Date(
          new Date(startTime).getTime() + (recipients.length * delayBetweenEmails * 1000)
        ).toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
