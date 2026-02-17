'use client';

import { useForm } from 'react-hook-form';
import { useCallback, useState } from 'react';
import { createCampaign, type CreateCampaignPayload } from '@/lib/api';
import toast from 'react-hot-toast';

type FormData = {
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmailsSeconds: string;
  hourlyLimit: string;
};

function parseCsvEmails(csvText: string): string[] {
  const lines = csvText.trim().split(/\r?\n/);
  const emails: string[] = [];
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const line of lines) {
    const parts = line.split(/[\s,;]+/).map((p) => p.trim());
    for (const p of parts) {
      if (re.test(p)) emails.push(p);
    }
  }
  return [...new Set(emails)];
}

export function ComposeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      delayBetweenEmailsSeconds: '60',
      hourlyLimit: '100',
    },
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setCsvError(null);
      if (!file) {
        setRecipientEmails([]);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) || '';
        const list = parseCsvEmails(text);
        setRecipientEmails(list);
        if (list.length === 0) setCsvError('No valid email addresses found.');
      };
      reader.readAsText(file);
    },
    []
  );

  const onSubmit = async (data: FormData) => {
    if (recipientEmails.length === 0) {
      toast.error('Upload a CSV with at least one email.');
      return;
    }
    const payload: CreateCampaignPayload = {
      subject: data.subject,
      body: data.body,
      recipientEmails,
      startTime: data.startTime || new Date().toISOString(),
      delayBetweenEmailsSeconds: parseInt(data.delayBetweenEmailsSeconds, 10) || 60,
      hourlyLimit: parseInt(data.hourlyLimit, 10) || 100,
    };
    try {
      const result = await createCampaign(payload);
      toast.success(`Campaign created: ${result.jobCount} emails scheduled.`);
      reset();
      setRecipientEmails([]);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create campaign';
      toast.error(msg);
    }
  };

  if (!open) return null;

  const defaultStart = new Date();
  defaultStart.setMinutes(defaultStart.getMinutes() + 5);
  const startDefault = defaultStart.toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Compose New Email
          </h3>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Subject
            </label>
            <input
              {...register('subject', { required: 'Subject is required' })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              placeholder="Email subject"
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-500">{errors.subject.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Body
            </label>
            <textarea
              {...register('body', { required: 'Body is required' })}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-y"
              placeholder="Email body"
            />
            {errors.body && (
              <p className="mt-1 text-sm text-red-500">{errors.body.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Upload CSV (emails)
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
            />
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {recipientEmails.length > 0
                ? `${recipientEmails.length} email(s) detected`
                : 'No file selected'}
            </p>
            {csvError && (
              <p className="mt-1 text-sm text-red-500">{csvError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Start time
            </label>
            <input
              type="datetime-local"
              {...register('startTime')}
              defaultValue={startDefault}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Delay between emails (sec)
              </label>
              <input
                type="number"
                min={1}
                {...register('delayBetweenEmailsSeconds', {
                  min: { value: 1, message: 'Min 1' },
                })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
              {errors.delayBetweenEmailsSeconds && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.delayBetweenEmailsSeconds.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Hourly limit
              </label>
              <input
                type="number"
                min={1}
                {...register('hourlyLimit', { min: { value: 1, message: 'Min 1' } })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
              {errors.hourlyLimit && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.hourlyLimit.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || recipientEmails.length === 0}
              className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium"
            >
              {isSubmitting ? 'Scheduling…' : 'Schedule campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
