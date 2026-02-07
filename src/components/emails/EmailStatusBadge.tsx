import { cn } from '@/lib/utils';

type EmailStatus = 'scheduled' | 'pending' | 'sending' | 'sent' | 'failed';

interface EmailStatusBadgeProps {
  status: EmailStatus;
}

const statusConfig: Record<EmailStatus, { label: string; className: string }> = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-accent text-accent-foreground',
  },
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning',
  },
  sending: {
    label: 'Sending',
    className: 'bg-info/10 text-info',
  },
  sent: {
    label: 'Sent',
    className: 'bg-primary/10 text-primary',
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/10 text-destructive',
  },
};

export function EmailStatusBadge({ status }: EmailStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
