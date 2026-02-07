import { format } from 'date-fns';
import { EmailStatusBadge } from './EmailStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Calendar, Clock } from 'lucide-react';

interface Email {
  id: string;
  recipient_email: string;
  subject: string;
  scheduled_time: string;
  sent_time: string | null;
  status: 'scheduled' | 'pending' | 'sending' | 'sent' | 'failed';
  ethereal_message_url?: string | null;
}

interface EmailTableProps {
  emails: Email[];
  loading?: boolean;
  type: 'scheduled' | 'sent';
}

export function EmailTable({ emails, loading, type }: EmailTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="empty-state py-20">
        <div className="empty-state-icon">
          <Mail className="w-full h-full" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">
          No {type} emails yet
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          {type === 'scheduled'
            ? "You haven't scheduled any emails yet. Click 'Compose New Email' to get started."
            : 'Your sent emails will appear here once they are delivered.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {emails.map((email) => (
        <div
          key={email.id}
          className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors animate-fade-in"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground truncate">
                {email.recipient_email}
              </p>
              <EmailStatusBadge status={email.status} />
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {email.subject}
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
            {type === 'scheduled' ? (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(email.scheduled_time), 'MMM d, yyyy')}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>
                {format(
                  new Date(email.sent_time || email.scheduled_time),
                  'h:mm a'
                )}
              </span>
            </div>
          </div>
          
          {email.ethereal_message_url && (
            <a
              href={email.ethereal_message_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
