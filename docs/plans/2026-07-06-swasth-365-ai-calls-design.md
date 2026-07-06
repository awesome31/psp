# Swasth 365 — AI Call System — Design

**Date:** 2026-07-06
**Status:** Implemented (POC)

## Goal

A CSV-driven system that places automated **AI voice calls** to patients enrolled in
the Swasth 365 Patient Support Program, running the appropriate call script per row.
POC scope: one row → the owner's number (`+919930045439`), `follow_up` and `reminder`
call types.

## Key decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Voice/telephony | **Vapi** | Handles STT + LLM + TTS + telephony; simple outbound API; dynamic per-call variables fit a CSV-driven design. |
| Framework | **Next.js 16** (App Router) | One deployable for frontend + API + cron. |
| Database | **Neon Postgres** + Prisma 7 | Serverless Postgres, free tier; Prisma for type-safe modular data access. |
| Call trigger | **Scheduled time per row** (`scheduled_at`) | Cron finds due patients and calls; flexible per-patient timing. |
| Scripts | **In code as config** (`modules/scripts`) | Version-controlled, dynamically injects patient name/doctor/medicine. |
| Code layout | `modules/<name>/index.ts` | Each module is a folder exposing one entry point. |

## Architecture

```
Frontend (upload + list)  ─┐
API routes                 ├─ Next.js app
Cron route                 ─┘        │
                                     ▼
              modules/ (csv, patients, calls, scripts, vapi, scheduler, db)
                       │                         │
                  Neon Postgres             Vapi API + webhook
```

Flow: upload CSV → validate → store patients (`pending`, `scheduled_at`) → cron hits
`/api/cron/run` → scheduler claims due patients (flips to `calling` as a lock) →
Vapi places the call → Vapi's `end-of-call-report` webhook updates the call with
summary / transcript / recording / extracted structured data → patient status mirrors
the outcome.

## Data model

- **patients** — who they are + `status` (pending/calling/completed/failed) + `scheduled_at`.
- **calls** — one row per attempt: `vapiCallId`, `status`, `summary`, `transcriptUrl`,
  `recordingUrl`, `structuredData` (JSON). One patient → many calls (monthly cadence).

## Safety

- **Locking:** `pending → calling` via conditional `updateMany` before dialing, so an
  overlapping cron never double-calls.
- **Cron auth:** `/api/cron/run` requires `CRON_SECRET` (Bearer or `?secret=`).
- **Webhook auth:** optional `VAPI_WEBHOOK_SECRET`.
- **Failure:** Vapi errors mark the patient `failed` + increment `retryCount`.

## Pricing (2026, all-in per minute)

Bland ~$0.09–0.12, Retell ~$0.13–0.17, Vapi ~$0.10–0.30 (assemble-your-own).
A 3–5 min call ≈ ₹15–35 + number rental (~$1–2/mo). **POC cost ≈ free** using Vapi
trial credits and a US caller number (Indian +91 numbers need KYC).

## Out of scope (future)

- Inbound "New Patient" toll-free script (Vapi supports inbound; same script config).
- Real Indian caller number + TRAI/DLT compliance for production campaigns.
- Auto-rescheduling the next monthly follow-up after a completed call.
- Retry backoff policy beyond a counter.
