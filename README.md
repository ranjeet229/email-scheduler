# Email Scheduler (Production-Grade)

A mini ReachInbox-style email scheduling system: API-driven scheduling, MongoDB, BullMQ (Redis) for delayed jobs, Ethereal SMTP, and a Next.js dashboard with email/password signup and login.

---

## Architecture Summary

- **Backend**: Node.js + Express (TypeScript), MongoDB (Mongoose), Redis, BullMQ, Nodemailer (Ethereal).
- **Auth**: Simple signup and login with email + password (bcrypt, session).
- **Scheduling**: BullMQ **delayed jobs only** (no cron). Each email is one job; `jobId` = `EmailJob._id` for idempotency.
- **Source of truth**: Database. BullMQ state lives in Redis; on restart BullMQ rehydrates from Redis.
- **Frontend**: Next.js (App Router), TypeScript, Tailwind, React Hook Form, Axios.

---

## How Scheduling Works

1. **Campaign creation**  
   `POST /api/campaigns` creates an `EmailCampaign` and bulk-inserts `EmailJob` docs (status `SCHEDULED`). For each job it enqueues a BullMQ delayed job with `delay = scheduledAt - now` and `jobId = emailJob._id`.

2. **Execution**  
   At the right time, BullMQ moves the job to the active queue. The worker:
   - Loads the `EmailJob` by id and **checks status**. If not `SCHEDULED`, it exits (idempotency).
   - Checks the **hourly rate limit** (Redis). If at limit, it re-adds the same job with a delay until the next hour and exits.
   - Otherwise it reserves a slot, sends via Ethereal, and updates the job to `SENT` (and `sentAt`).

3. **No cron**  
   All timing is done via BullMQ delays and (when over limit) re-delay to the next hour.

---

## Setup

### 1. Prerequisites

MongoDB and Redis must be running locally (or use cloud/remote URLs in `.env`).

### 2. Environment

Ensure `backend/.env` exists with:

- `MONGODB_URI` (e.g. `mongodb://localhost:27017/email_scheduler`)
- `REDIS_URL`, `SESSION_SECRET`
- `API_URL`, `FRONTEND_URL`
- `WORKER_CONCURRENCY`, `MIN_DELAY_MS`, `MAX_EMAILS_PER_HOUR`
- Ethereal: create a user at https://ethereal.email and set `ETHEREAL_USER`, `ETHEREAL_PASS`

Frontend: set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` (e.g. `http://localhost:4000`).

### 3. Install & Run

- **API**: `cd backend && npm install && npm run dev`
- **Worker**: `cd backend && npm run worker` (separate process)
- **Frontend**: `cd frontend && npm install && npm run dev`

Open `http://localhost:3000`, sign up or log in, then use the dashboard to compose and schedule campaigns.

---

## API Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signup | Create account (email, password, name?) |
| POST | /api/auth/login | Login (email, password) |
| GET | /api/auth/me | Current user (session) |
| POST | /api/auth/logout | Destroy session |
| POST | /api/campaigns | Create campaign + jobs + enqueue delayed jobs |
| GET | /api/emails/scheduled | List scheduled emails |
| GET | /api/emails/sent | List sent emails |

All campaign/email endpoints require an authenticated session.

---

## Project Structure

```
Email_Scheduler/
├── backend/
│   └── src/
│       ├── config/         # env, redis, bullmq, db (MongoDB)
│       ├── models/         # User, EmailCampaign, EmailJob (Mongoose)
│       ├── controllers/
│       ├── middleware/
│       ├── queues/
│       ├── routes/
│       ├── services/
│       ├── utils/          # rateLimit
│       ├── worker/
│       ├── app.ts
│       └── index.ts
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── login/page.tsx
│       │   ├── signup/page.tsx
│       │   ├── dashboard/
│       │   └── ...
│       └── components/
└── backend/.env
```
