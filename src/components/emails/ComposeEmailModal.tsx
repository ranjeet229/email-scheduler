import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  Clock, 
  Zap, 
  Gauge,
  Loader2,
  X,
  Check
} from 'lucide-react';
import { z } from 'zod';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const composeSchema = z.object({
  senderEmail: z.string().email('Please enter a valid sender email'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  body: z.string().min(1, 'Email body is required'),
  delayBetweenEmails: z.number().min(1, 'Minimum 1 second delay').max(3600, 'Maximum 1 hour delay'),
  hourlyLimit: z.number().min(1, 'Minimum 1 email per hour').max(1000, 'Maximum 1000 emails per hour'),
});

interface ComposeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ComposeEmailModal({ open, onOpenChange, onSuccess }: ComposeEmailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [senderEmail, setSenderEmail] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [loading, setLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parseEmailsFromFile = useCallback((content: string): string[] => {
    const emails: string[] = [];
    const lines = content.split(/[\r\n,;]+/);
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (emailRegex.test(trimmed)) {
        emails.push(trimmed);
      }
    }
    
    return [...new Set(emails)]; // Remove duplicates
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsedEmails = parseEmailsFromFile(content);
      
      if (parsedEmails.length === 0) {
        toast({
          title: 'No valid emails found',
          description: 'Please upload a file with valid email addresses.',
          variant: 'destructive',
        });
        return;
      }
      
      setRecipients(parsedEmails);
      setUploadedFileName(file.name);
      
      toast({
        title: 'File uploaded',
        description: `Found ${parsedEmails.length} valid email addresses.`,
      });
    };
    
    reader.readAsText(file);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    try {
      composeSchema.parse({
        senderEmail,
        subject,
        body,
        delayBetweenEmails,
        hourlyLimit,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          const key = err.path[0] as string;
          newErrors[key] = err.message;
        });
      }
    }
    
    if (recipients.length === 0) {
      newErrors.recipients = 'Please upload a file with email addresses';
    }
    
    if (!startTime) {
      newErrors.startTime = 'Please select a start time';
    } else {
      const selectedTime = new Date(startTime);
      if (selectedTime < new Date()) {
        newErrors.startTime = 'Start time must be in the future';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;
    
    setLoading(true);
    
    try {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert({
          user_id: user.id,
          subject,
          body,
          sender_email: senderEmail,
          delay_between_emails: delayBetweenEmails,
          hourly_limit: hourlyLimit,
          start_time: startTime,
          total_emails: recipients.length,
          status: 'scheduled',
        })
        .select()
        .single();
      
      if (campaignError) throw campaignError;
      
      // Create individual scheduled emails
      const scheduledEmails = recipients.map((email, index) => {
        const scheduledTime = new Date(startTime);
        scheduledTime.setSeconds(scheduledTime.getSeconds() + (index * delayBetweenEmails));
        
        return {
          campaign_id: campaign.id,
          user_id: user.id,
          recipient_email: email,
          subject,
          body,
          sender_email: senderEmail,
          scheduled_time: scheduledTime.toISOString(),
          status: 'scheduled' as const,
          idempotency_key: `${campaign.id}-${email}-${scheduledTime.getTime()}`,
        };
      });
      
      const { error: emailsError } = await supabase
        .from('scheduled_emails')
        .insert(scheduledEmails);
      
      if (emailsError) throw emailsError;
      
      toast({
        title: 'Emails scheduled!',
        description: `${recipients.length} emails have been scheduled starting at ${new Date(startTime).toLocaleString()}.`,
      });
      
      // Reset form
      setSenderEmail('');
      setRecipients([]);
      setSubject('');
      setBody('');
      setStartTime('');
      setDelayBetweenEmails(2);
      setHourlyLimit(200);
      setUploadedFileName('');
      setErrors({});
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule emails. Please try again.',
        variant: 'destructive',
      });
    }
    
    setLoading(false);
  };

  const clearRecipients = () => {
    setRecipients([]);
    setUploadedFileName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Compose New Email</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* From */}
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="email"
              placeholder="sender@example.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
            />
            {errors.senderEmail && (
              <p className="text-sm text-destructive">{errors.senderEmail}</p>
            )}
          </div>
          
          {/* To (File Upload) */}
          <div className="space-y-2">
            <Label>To (Upload Recipients)</Label>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <div className="flex items-center justify-center gap-2 h-10 px-4 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploadedFileName || 'Upload CSV/Text file'}
                  </span>
                </div>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              
              {recipients.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    <FileText className="h-3.5 w-3.5" />
                    {recipients.length} emails
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearRecipients}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {errors.recipients && (
              <p className="text-sm text-destructive">{errors.recipients}</p>
            )}
          </div>
          
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject}</p>
            )}
          </div>
          
          {/* Scheduling Options */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Start Time
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delay" className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Delay (seconds)
              </Label>
              <Input
                id="delay"
                type="number"
                min={1}
                max={3600}
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value) || 2)}
              />
              {errors.delayBetweenEmails && (
                <p className="text-sm text-destructive">{errors.delayBetweenEmails}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hourlyLimit" className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                Hourly Limit
              </Label>
              <Input
                id="hourlyLimit"
                type="number"
                min={1}
                max={1000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 200)}
              />
              {errors.hourlyLimit && (
                <p className="text-sm text-destructive">{errors.hourlyLimit}</p>
              )}
            </div>
          </div>
          
          {/* Email Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Type Your Reply...</Label>
            <Textarea
              id="body"
              placeholder="Write your email content here..."
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="resize-none"
            />
            {errors.body && (
              <p className="text-sm text-destructive">{errors.body}</p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
