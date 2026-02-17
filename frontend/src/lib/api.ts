import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export type User = {
  id: string;
  email: string;
  name: string | null;
};

export async function signup(email: string, password: string, name?: string) {
  const { data } = await api.post<{ user: User }>('/auth/signup', { email, password, name });
  return data.user;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ user: User }>('/auth/login', { email, password });
  return data.user;
}

export type EmailJobRow = {
  id: string;
  recipientEmail: string;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
  campaign: { subject: string };
};

export async function getMe(): Promise<User | null> {
  try {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getScheduledEmails(limit = 50, offset = 0) {
  const { data } = await api.get<{ emails: EmailJobRow[] }>('/emails/scheduled', {
    params: { limit, offset },
  });
  return data.emails;
}

export async function getSentEmails(limit = 50, offset = 0) {
  const { data } = await api.get<{ emails: EmailJobRow[] }>('/emails/sent', {
    params: { limit, offset },
  });
  return data.emails;
}

export type CreateCampaignPayload = {
  subject: string;
  body: string;
  recipientEmails: string[];
  startTime: string;
  delayBetweenEmailsSeconds: number;
  hourlyLimit: number;
};

export async function createCampaign(payload: CreateCampaignPayload) {
  const { data } = await api.post<{ campaignId: string; jobCount: number }>(
    '/campaigns',
    payload
  );
  return data;
}
