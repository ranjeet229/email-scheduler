'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMe, logout, type User } from '@/lib/api';
import { ComposeModal } from '@/components/ComposeModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        if (!u) router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const scheduledActive = pathname === '/dashboard' || pathname === '/dashboard/scheduled';
  const sentActive = pathname === '/dashboard/sent';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              Email Scheduler
            </span>
            <nav className="flex gap-1">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  scheduledActive
                    ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Scheduled
              </Link>
              <Link
                href="/dashboard/sent"
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sentActive
                    ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                Sent
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-medium">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm"
          >
            Compose New Email
          </button>
        </div>
        {children}
      </main>

      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  );
}
