# Customer Interface - SARJ BLENDED IT

Customer-facing booking and service dashboard for the SARJ BLENDED IT mobile barber platform.

## Features

- Browse available barber services
- Book services with date/time selection
- View booking history and status
- Real-time status updates
- Responsive mobile design

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
cd apps/customer
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
cd apps/customer
npm run dev
# Open http://localhost:3000 in your browser
```

## Production Build

```bash
cd apps/customer
npm run build
npm run start
```

## Database Schema Requirements

The customer interface requires these Supabase tables:

### `services` table

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `bookings` table

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id),
  customer_id UUID,
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment

### Deploy Customer Interface to Vercel (Separate Project)

1. Create new Vercel project
2. Connect GitHub repository
3. Set **Root Directory** to `apps/customer`
4. Add environment variables
5. Deploy

## Troubleshooting

- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Verify Supabase credentials in `.env.local`
- Check browser console for errors
