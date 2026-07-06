# Swasth 365 — AI Call Cost Analysis

_A plain-English breakdown of what it costs to run automated AI calls._
_Anchored to a **real test call** we placed: **$0.19 on Vapi** + **~₹4/min on Twilio**._

> **TL;DR** — With the current setup, calling **100 people a day** costs roughly:
>
> | Scenario | Per day | Per month (30 days) |
> |---|---|---|
> | 100 **reminder** calls (~2 min each) | **~$32 / ₹2,750** | ~$960 / ₹82,500 |
> | 100 **follow-up** calls (~3 min each) | **~$48 / ₹4,100** | ~$1,440 / ₹1,24,000 |
> | 100 **mixed** (50 follow-up + 50 reminder) | **~$40 / ₹3,450** | ~$1,200 / ₹1,03,000 |
>
> These assume every call connects and runs full length. In reality 30–50% of calls
> go unanswered — and **unanswered calls cost almost nothing** — so your real bill is
> usually **30–50% lower**. See ["Reality check"](#reality-check-you-pay-less-in-practice).

---

## 1. What you pay for on every call

An AI call has two bills: the **AI stack (Vapi)** and the **phone line (Twilio)**.

| Component | What it does | Cost per minute |
|---|---|---|
| Vapi platform | Runs the whole call, glues the pieces | ~$0.05 |
| LLM — GPT-4o-mini | The "brain" that decides what to say | ~$0.01 |
| Text-to-speech — ElevenLabs | The voice you hear (Priya) | ~$0.04 |
| Speech-to-text — Deepgram | Understands what the patient says | ~$0.01 |
| **Vapi subtotal** | | **~$0.11 / min** |
| Twilio | The actual phone call to the Indian number | ~$0.05 / min |
| **Total, all-in** | | **~$0.16 / min ≈ ₹14 / min** |

> **Currency note:** figures use **$1 = ₹86**. Prices are provider list rates as of
> mid-2026 and can shift slightly.

---

## 2. Cost per single call

We assume a **reminder** call is shorter than a **follow-up** call (it is — the
reminder script is a quick check-in, the follow-up collects more details).

| Call type | Typical length | Cost per call (USD) | Cost per call (INR) |
|---|---|---|---|
| Reminder | ~2 minutes | **$0.32** | **₹28** |
| Follow-up | ~3 minutes | **$0.48** | **₹41** |

_Math: length × $0.16/min. A 3-min follow-up = 3 × $0.16 = $0.48._

---

## 3. Cost for 100 calls in a day

| Scenario | Calls | Avg length | Per day (USD) | Per day (INR) |
|---|---|---|---|---|
| All reminders | 100 | 2 min | **$32** | **₹2,750** |
| All follow-ups | 100 | 3 min | **$48** | **₹4,100** |
| Mixed (50 + 50) | 100 | — | **$40** | **₹3,450** |

## 4. Scaling it up (mixed 50/50 basis)

| Volume | Per day | Per month | Per year |
|---|---|---|---|
| 100 calls/day | $40 / ₹3,450 | $1,200 / ₹1,03,000 | $14,400 / ₹12,40,000 |
| 500 calls/day | $200 / ₹17,200 | $6,000 / ₹5,16,000 | $72,000 / ₹62,00,000 |
| 1,000 calls/day | $400 / ₹34,400 | $12,000 / ₹10,30,000 | $1,44,000 / ₹1,24,00,000 |

---

## 5. Reality check — you pay less in practice

The tables above are the **worst case** (every call answered, full length). Real
campaigns are cheaper because:

- **Unanswered calls are near-free.** If nobody picks up, there's no AI time and Twilio
  charges little to nothing. Typical connect rates are 50–70%.
- **Many calls end early.** Wrong number, "call me later", quick reminders — all shorter
  than the averages above.
- **A realistic 100-calls-a-day bill often lands at ₹1,800–₹2,800/day**, not the ₹3,450
  worst case.

---

## 6. Levers to reduce cost

| Lever | Effect | Trade-off |
|---|---|---|
| Swap ElevenLabs → a cheaper voice (Deepgram/PlayHT/Azure) | Cuts ~$0.04/min → total ~$0.11/min (**–30%**) | Voice sounds slightly less premium |
| Keep scripts tight / shorter calls | Fewer minutes = linear savings | Less rapport |
| Skip calls to numbers that never answer | Fewer wasted dials | Needs retry logic |
| Buy Vapi/Twilio volume credits | Small per-minute discounts at scale | Upfront commitment |
| Use a local Indian caller ID (once compliant) | Can lower telephony vs US→India | Needs KYC / DLT setup |

---

## 7. One-time / fixed costs (small)

| Item | Cost |
|---|---|
| Twilio phone number rental | ~$1–2 / month |
| Neon database (POC volume) | Free tier |
| Vercel hosting (POC volume) | Free / Hobby tier |

---

### How to re-calculate for your own numbers

**Cost = (number of calls) × (average minutes per call) × $0.16/min**

Example: 250 follow-ups averaging 2.5 min →
`250 × 2.5 × 0.16 = $100/day (≈ ₹8,600/day)`.

_All rates are estimates for planning. Actual invoices come from Vapi and Twilio and
are the source of truth._
