import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRecord {
  id: string;
  campaign_id: string;
  user_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sender_email: string;
  scheduled_time: string;
  status: string;
  idempotency_key: string;
}

interface EtherealCredentials {
  user: string;
  pass: string;
}

// Create Ethereal test account
async function createEtherealAccount(): Promise<EtherealCredentials> {
  const response = await fetch('https://api.nodemailer.com/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestor: 'dn8-email-scheduler',
      version: '1.0.0',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create Ethereal account');
  }
  
  return await response.json();
}

// Send email via Ethereal SMTP (using their API)
async function sendEmailViaEthereal(
  email: EmailRecord,
  credentials: EtherealCredentials
): Promise<{ success: boolean; messageUrl?: string; error?: string }> {
  try {
    // Use nodemailer's test API to send
    const auth = btoa(`${credentials.user}:${credentials.pass}`);
    
    const response = await fetch('https://api.nodemailer.com/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        from: email.sender_email,
        to: email.recipient_email,
        subject: email.subject,
        text: email.body,
        html: `<div>${email.body.replace(/\n/g, '<br>')}</div>`,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ethereal API error: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Generate the message URL
    const messageUrl = `https://ethereal.email/message/${result.id}`;
    
    return { success: true, messageUrl };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

// Check and update rate limit counter
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  senderEmail: string,
  hourlyLimit: number
): Promise<{ allowed: boolean; currentCount: number }> {
  // Get the current hour window (truncated to hour)
  const now = new Date();
  const hourWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  
  // Try to get or create the rate limit counter
  const { data: counter, error: selectError } = await supabase
    .from('rate_limit_counters')
    .select('*')
    .eq('user_id', userId)
    .eq('sender_email', senderEmail)
    .eq('hour_window', hourWindow.toISOString())
    .single();
  
  if (selectError && selectError.code !== 'PGRST116') {
    console.error('Rate limit check error:', selectError);
    return { allowed: true, currentCount: 0 }; // Allow on error
  }
  
  const currentCount = counter?.email_count || 0;
  
  if (currentCount >= hourlyLimit) {
    return { allowed: false, currentCount };
  }
  
  // Increment counter
  if (counter) {
    await supabase
      .from('rate_limit_counters')
      .update({ email_count: currentCount + 1 })
      .eq('id', counter.id);
  } else {
    await supabase
      .from('rate_limit_counters')
      .insert({
        user_id: userId,
        sender_email: senderEmail,
        hour_window: hourWindow.toISOString(),
        email_count: 1,
      });
  }
  
  return { allowed: true, currentCount: currentCount + 1 };
}

// Calculate next available send time when rate limited
function getNextHourWindow(): Date {
  const now = new Date();
  const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
  return nextHour;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client (bypasses RLS for worker operations)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date().toISOString();
    
    console.log(`[${now}] Processing scheduled emails...`);
    
    // Fetch emails that are due and not yet processed
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*, email_campaigns!inner(hourly_limit, delay_between_emails)')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true })
      .limit(50); // Process in batches for concurrency control
    
    if (fetchError) {
      console.error('Error fetching emails:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('No pending emails to process');
      return new Response(
        JSON.stringify({ message: 'No pending emails', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${pendingEmails.length} emails to process`);
    
    // Get or create Ethereal credentials
    let etherealCredentials: EtherealCredentials;
    try {
      etherealCredentials = await createEtherealAccount();
      console.log('Created Ethereal test account:', etherealCredentials.user);
    } catch (error) {
      console.error('Failed to create Ethereal account:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create Ethereal account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let processed = 0;
    let sent = 0;
    let rateLimited = 0;
    let failed = 0;
    
    for (const email of pendingEmails) {
      const hourlyLimit = email.email_campaigns?.hourly_limit || 200;
      const delayBetweenEmails = email.email_campaigns?.delay_between_emails || 2;
      
      // Check rate limit
      const { allowed, currentCount } = await checkRateLimit(
        supabase,
        email.user_id,
        email.sender_email,
        hourlyLimit
      );
      
      if (!allowed) {
        // Reschedule to next hour window
        const nextWindow = getNextHourWindow();
        
        console.log(`Rate limited: ${email.id}, rescheduling to ${nextWindow.toISOString()}`);
        
        await supabase
          .from('scheduled_emails')
          .update({ 
            scheduled_time: nextWindow.toISOString(),
            status: 'scheduled'
          })
          .eq('id', email.id);
        
        rateLimited++;
        continue;
      }
      
      // Mark as sending (prevents duplicate processing)
      const { error: updateError } = await supabase
        .from('scheduled_emails')
        .update({ status: 'sending' })
        .eq('id', email.id)
        .eq('status', 'scheduled'); // Idempotency check
      
      if (updateError) {
        console.error(`Failed to mark email ${email.id} as sending:`, updateError);
        continue;
      }
      
      // Send the email
      const result = await sendEmailViaEthereal(email, etherealCredentials);
      
      if (result.success) {
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_time: new Date().toISOString(),
            ethereal_message_url: result.messageUrl,
          })
          .eq('id', email.id);
        
        // Update campaign sent count
        await supabase.rpc('increment_campaign_sent_count', { 
          campaign_id_input: email.campaign_id 
        }).catch(() => {
          // RPC might not exist, update directly
          supabase
            .from('email_campaigns')
            .update({ sent_count: email.email_campaigns?.sent_count + 1 || 1 })
            .eq('id', email.campaign_id);
        });
        
        sent++;
        console.log(`Email sent: ${email.id} -> ${email.recipient_email}`);
      } else {
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            error_message: result.error,
          })
          .eq('id', email.id);
        
        failed++;
        console.error(`Email failed: ${email.id} - ${result.error}`);
      }
      
      processed++;
      
      // Delay between emails (configurable per campaign)
      if (delayBetweenEmails > 0 && processed < pendingEmails.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenEmails * 1000));
      }
    }
    
    const summary = {
      message: 'Processing complete',
      processed,
      sent,
      rateLimited,
      failed,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Processing summary:', summary);
    
    return new Response(
      JSON.stringify(summary),
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
