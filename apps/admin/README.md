# Admin Dashboard - SARJ BLENDED IT

Admin panel for managing bookings, services, and operations for SARJ BLENDED IT mobile barber platform.

## Features

- View all bookings and customer details
- Manage services and pricing
- Track daily bookings and statistics
- Real-time booking status updates
- Responsive admin interface

## Tech Stack

- **Framework**: Next.js 14.2.0
- **Frontend**: React 18.3.1
- **Backend**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Styling**: CSS3
- **Language**: TypeScript

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project

### Installation

```bash
cd apps/admin
npm install
cp .env.local.example .env.local
```

### Environment Variables

Update `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anonymous_key
```

## Development

```bash
cd apps/admin
npm run dev
# Open http://localhost:3000 in your browser
```

## Production Build

```bash
cd apps/admin
npm run build
npm run start
```

## Deployment to Vercel (Current Setup)

The admin dashboard is deployed to Vercel with:
- Root directory: `apps/admin`
- Build command: `npm run build`
- Output directory: `.next`

Environment variables configured in Vercel project settings.

## Troubleshooting

- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Verify Supabase credentials in `.env.local`
- Check browser console for errors
