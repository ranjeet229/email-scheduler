
# Email Scheduler Service + Dashboard

A **production-grade email scheduling system** with a backend scheduler and a frontend dashboard — similar to a tiny slice of how tools like ReachInbox work internally.

This system allows users to **schedule emails for future delivery**, handles **rate limiting and concurrency**, **survives server restarts**, and provides a **clean dashboard UI** to manage scheduled and sent emails.

---

## Features Overview

### Backend
- Schedule emails via REST APIs
- Persistent scheduling using **BullMQ + Redis (no cron jobs)**
- Relational DB persistence (PostgreSQL/MySQL)
- Email delivery via **Ethereal Email (fake SMTP)**
- Safe concurrency and rate limiting
- Resilient to server restarts (no duplicate sends)

### Frontend
- Google OAuth login
- Dashboard UI (based on provided Figma)
- Compose & schedule emails
- View scheduled emails
- View sent emails
- Clean UX with loading & empty states

---

## Architecture Overview

### High-Level Flow

1. User schedules emails via frontend or API
2. Backend:
   - Stores email metadata in DB
   - Creates **BullMQ delayed jobs** in Redis
3. Worker:
   - Picks up jobs at the scheduled time
   - Enforces rate limits & delays
   - Sends email via Ethereal SMTP
   - Updates email status in DB
4. Frontend polls backend APIs to show status


---

##  Tech Stack

### Backend
- **TypeScript**
- **Express.js**
- **BullMQ + Redis**
- **PostgreSQL / MySQL**
- **Ethereal Email (SMTP)**

### Frontend
- **React.js / Next.js**
- **TypeScript**
- **Tailwind CSS**

---

##  Backend Setup

### 1️ Environment Variables

Create a `.env` file in `backend/`:

```env
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/email_scheduler

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Ethereal SMTP
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=<ethereal_user>
SMTP_PASS=<ethereal_pass>

# Rate Limiting
MAX_EMAILS_PER_HOUR=200
MIN_DELAY_BETWEEN_EMAILS_MS=2000

# Worker
WORKER_CONCURRENCY=5




