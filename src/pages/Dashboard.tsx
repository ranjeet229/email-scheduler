import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmailTable } from '@/components/emails/EmailTable';
import { ComposeEmailModal } from '@/components/emails/ComposeEmailModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenSquare, Calendar, Send, RefreshCw } from 'lucide-react';

interface ScheduledEmail {
  id: string;
  recipient_email: string;
  subject: string;
  scheduled_time: string;
  sent_time: string | null;
  status: 'scheduled' | 'pending' | 'sending' | 'sent' | 'failed';
  ethereal_message_url: string | null;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('scheduled');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchEmails = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Fetch scheduled emails (not yet sent)
      const { data: scheduled, error: scheduledError } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['scheduled', 'pending', 'sending'])
        .order('scheduled_time', { ascending: true });
      
      if (scheduledError) throw scheduledError;
      
      // Fetch sent/failed emails
      const { data: sent, error: sentError } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['sent', 'failed'])
        .order('sent_time', { ascending: false });
      
      if (sentError) throw sentError;
      
      setScheduledEmails((scheduled || []) as ScheduledEmail[]);
      setSentEmails((sent || []) as ScheduledEmail[]);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchEmails();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('emails-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'scheduled_emails',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchEmails();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Email Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor your scheduled email campaigns
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEmails}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setComposeOpen(true)}>
              <PenSquare className="h-4 w-4 mr-2" />
              Compose New Email
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{scheduledEmails.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {sentEmails.filter(e => e.status === 'sent').length}
                </p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {sentEmails.filter(e => e.status === 'failed').length}
                </p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {scheduledEmails.length + sentEmails.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="scheduled" className="gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled
              {scheduledEmails.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                  {scheduledEmails.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="h-4 w-4" />
              Sent
              {sentEmails.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                  {sentEmails.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scheduled" className="mt-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <EmailTable 
                emails={scheduledEmails} 
                loading={loading} 
                type="scheduled" 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="sent" className="mt-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <EmailTable 
                emails={sentEmails} 
                loading={loading} 
                type="sent" 
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ComposeEmailModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSuccess={fetchEmails}
      />
    </DashboardLayout>
  );
}
