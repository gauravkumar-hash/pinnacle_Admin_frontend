# Frontend Admin Web UI

> Synced from [pinnaclesg-monorepo](https://github.com/GRMedicalApp/pinnaclesg-monorepo) - 2025-12-30

Telemedicine Admin Website

## Installation / Setup

1. Install dependencies using `npm install`
2. Create a `.env` file, referencing the `.env.local` file - replacing both of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the supabase project.
3. Start development server using `npm run dev`

# Deployment on Render (Static Site)

## On Refresh, Not Found displayed

- Navigate to Project Redirects/Rewrites [Example Link](https://dashboard.render.com/static/srv-cpk4eo2cn0vc73b0f8jg/redirects)

```
Source:         /:any
Destination:    /
Action:         Rewrite
```

# Appointment Booking Controls

## Per-Session Slot Limits

Configured in **Appointments → Operating Hours** for each branch.

- Select a branch and click into any time slot block to edit it.
- The **Max Appointments** field (`max_appointments_per_session`) sets how many patients can book that slot across the entire session window.
- Leave the field blank for unlimited bookings on that slot.
- Each time block displays `Max: N` when a limit is set.

### Capacity Panel

Below the time slot editor, the **Session Capacity** panel shows real-time booking status for a selected date:

- Use the date picker to choose any date within the branch's operating range.
- Each slot row shows a progress bar (green → orange → red) with booked / total counts.
- A **"N left"** tag shows remaining availability; a **"Full"** badge appears when the slot is at capacity.
- Summary cards at the top show: Total Booked, Slots with a Limit, Full Slots, and Available Slots.
- The panel auto-refreshes every 60 seconds.

## Corporate Code Quotas

Configured in **Appointments → Corporate Codes** when creating or editing a code.

| Field                                                    | Description                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Total Appointment Quota** (`max_appointments_total`)   | Maximum total bookings ever allowed under this code. Leave blank for unlimited. |
| **Daily Appointment Quota** (`max_appointments_per_day`) | Maximum bookings allowed on any single calendar day. Leave blank for unlimited. |

Both limits count only confirmed/completed appointments (cancelled and pending bookings do not count against the quota).

## Mobile App Behaviour

- When a time slot is full (booked count ≥ `max_appointments_per_session`), that slot is **not returned** to the mobile app — users simply cannot select it.
- When a corporate code has reached its total or daily quota, the booking is rejected at the review/confirmation step with a clear error message showing how many slots remain.
- No changes are needed on the mobile frontend — all enforcement is handled transparently by the backend.
