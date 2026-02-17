'use client';

import { useEffect, useState } from 'react';
import { getSentEmails, type EmailJobRow } from '@/lib/api';
import { SentTable } from '@/components/SentTable';
import toast from 'react-hot-toast';

export default function SentPage() {
  const [emails, setEmails] = useState<EmailJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getSentEmails()
      .then(setEmails)
      .catch((e) => {
        setError(e?.response?.data?.error || 'Failed to load');
        toast.error('Failed to load sent emails');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        Sent Emails
      </h2>
      <SentTable emails={emails} loading={loading} error={error} />
    </div>
  );
}
