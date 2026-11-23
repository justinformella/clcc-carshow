# Events migration: rehearsal results (2026-11-22, production, self-cancelling)

Ran part A + part B + checks in one transaction on production, ending in a
forced RAISE so nothing was saved. Verified afterwards: no events table, no
event_id columns, 242 registrations / 34 sponsors, original car_number default.

| Check | Result |
|---|---|
| 2026 totals vs baseline (regs 242 / $6,600 / $1,035 / car max 244; paid 190 / $5,670 / $965; sponsors 34 / $17,500, paid 26 / $15,000; expenses $2,000; 9 categories; 27 award picks; 3 tiers; 42 help requests) | Identical |
| Rows left without an event | 0 |
| Audit logs / updated_at touched by the backfill | No (956 / 171 audit rows; max updated_at unchanged) |
| current_event_id() | 2027 |
| 2027 seeded | 9 award categories, 3 tiers, 32 sponsor prospects (34 minus 2 archived), 32 distinct companies, $0 amounts, no payment/Stripe data |
| New registration as public web role (anon) | 2027, car #1 |
| New registration as server (service role) | 2027, car #2 |
| Registration explicitly for 2026 | car #245 |
| Duplicate car numbers within an event | 0 |

Not rehearsed: the rollback script (skipped at the user's choice; daily backups
on the Pro plan are the safety net).

Note: the "prospects_with_payment_data = 32" check in the script was a false
alarm. sponsorship_amount defaults to 0 (not NULL); paid_at, payment_token
and stripe_* have no defaults and stay NULL.
