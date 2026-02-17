'use client';

import { useEffect, useState } from 'react';
import { getScheduledEmails, type EmailJobRow } from '@/lib/api';
import { ScheduledTable } from '@/components/ScheduledTable';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [emails, setEmails] = useState<EmailJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getScheduledEmails()
      .then(setEmails)
      .catch((e) => {
        setError(e?.response?.data?.error || 'Failed to load');
        toast.error('Failed to load scheduled emails');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        Scheduled Emails
      </h2>
      <ScheduledTable emails={emails} loading={loading} error={error} />
    </div>
  );
}
