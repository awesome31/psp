# Swasth 365 — AI Call System

CSV-driven automated AI voice calls for the **Swasth 365 Patient Support Program**.
Upload a CSV of patients; a scheduler places AI voice calls (via **Vapi**) that run
the right script (`follow_up` or `reminder`), then stores each call's summary,
transcript, recording, and extracted data.

## How it works

```
CSV upload ──▶ Postgres (patients: status=pending, scheduled_at)
                     │
        cron ──▶ /api/cron/run ──▶ scheduler: claim due patients ──▶ Vapi places call
                     │
   Vapi webhook ──▶ /api/webhooks/vapi ──▶ update call (summary/transcript/data)
```

## Architecture

Everything is one Next.js app. Business logic lives in `modules/`, each a folder
with an `index.ts` entry point (nothing imports internal files directly):

| Module | Responsibility |
|--------|----------------|
| `modules/db` | Prisma client singleton (lazy, node-postgres adapter) |
| `modules/csv` | Parse + validate uploaded CSV (papaparse + zod) |
| `modules/patients` | Patient DB access; atomic "claim due" locking |
| `modules/calls` | Call-attempt records + webhook finalisation |
| `modules/scripts` | The Swasth 365 conversation prompts per call type |
| `modules/vapi` | Place outbound calls; parse Vapi webhooks |
| `modules/scheduler` | Orchestration the cron invokes |

API routes (`app/api/`): `patients/upload`, `patients`, `cron/run`, `webhooks/vapi`.
Frontend (`app/page.tsx`): upload CSV, view patients + statuses + call summaries.

## CSV format

```csv
name,phone,call_type,scheduled_at,doctor_name,medicine_name,last_visit_date
Rohit Tyagi,+919930045439,follow_up,2026-07-06T10:00:00+05:30,Dr XYZ,Telma 40,2026-06-05
```

- `phone` — E.164 (`+91...`)
- `call_type` — `follow_up` or `reminder`
- `scheduled_at` — ISO timestamp; the cron calls once this time has passed

See `sample-patients.csv`.

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Database (Neon)** — create a project at [neon.tech](https://neon.tech), copy the
   **pooled** connection string into `DATABASE_URL` in `.env`.

3. **Env** — `cp .env.example .env` and fill in values (see comments in the file).

4. **Migrate**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Vapi** — at [dashboard.vapi.ai](https://dashboard.vapi.ai): create an API key
   (`VAPI_API_KEY`) and provision a phone number to call *from*
   (`VAPI_PHONE_NUMBER_ID`). A US number is instant; an Indian `+91` number needs KYC.

6. **Webhooks in dev** — Vapi must reach your machine. Run a tunnel
   (`ngrok http 3000`) and set `APP_URL` to the tunnel URL so
   `APP_URL/api/webhooks/vapi` is publicly reachable.

7. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, upload `sample-patients.csv`, then click
   **Run scheduler now** to place the call immediately (or wait for the cron).

## Cron

`vercel.json` schedules `/api/cron/run` every 5 minutes on Vercel. It's protected by
`CRON_SECRET` (Vercel sends it automatically as a Bearer token). Locally, the
**Run scheduler now** button triggers the same route on demand.

> Vercel's Hobby plan limits cron frequency — use the button for testing, or a Pro
> plan / external cron (e.g. cron-job.org hitting the URL with the secret) for
> minute-level scheduling.

## Notes

- **Inbound "New Patient" calls** (the toll-free script) aren't built yet, but Vapi
  supports them: assign a number to an inbound assistant using the same script config.
- The conversation model, voice, and transcriber are all env-configurable
  (`VAPI_MODEL`, `VAPI_VOICE_ID`, …) — defaults to Anthropic Claude + ElevenLabs +
  Deepgram. Adjust `VAPI_MODEL` to a model id Vapi currently supports.
