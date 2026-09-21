# SARJ BLENDED IT

Premium mobile-barber booking platform.

## Apps

- `apps/mobile` — Expo / React Native customer application.
- `apps/admin` — Next.js admin dashboard for Vercel.
- `supabase` — SQL migrations, row-level security, and seed data.

## Getting started

1. Create a Supabase project and copy the URL and anonymous key into the `.env.local` files described in each app.
2. In Supabase SQL Editor, run `supabase/migrations/0001_initial_schema.sql`, then `supabase/seed.sql`.
3. Install dependencies from the relevant app folder with `npm install`.
4. Start the mobile app with `npx expo start`; start the dashboard with `npm run dev` in `apps/admin`.

## Deployment

Connect this repository to Vercel and set `apps/admin` as its root directory. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel. Build iOS/Android releases from `apps/mobile` using Expo EAS.

## Payment note

Cash bookings work immediately. Airtel Money, MTN MoMo, Zamtel, and card payments should be connected through a server-side Supabase Edge Function; never put provider secret keys in either client app.

