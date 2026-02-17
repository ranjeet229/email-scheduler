'use client';

import type { EmailJobRow } from '@/lib/api';

export function SentTable({
  emails,
  loading,
  error,
}: {
  emails: EmailJobRow[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="p-8 flex justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
        {error}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">No sent emails yet.</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Sent emails will appear here after campaigns are delivered.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Recipient
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Subject
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Sent time
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {emails.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                  {row.recipientEmail}
                </td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  {row.campaign.subject}
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                  {row.sentAt
                    ? new Date(row.sentAt).toLocaleString()
                    : '—'}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
