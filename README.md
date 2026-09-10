# SARJ BLENDED IT — Monorepo

Premium mobile barber booking platform with admin dashboard and customer interface.

## Project Structure

```
.
├── apps/
│   ├── admin/          # Admin dashboard (Next.js)
│   └── customer/       # Customer interface (Next.js)
├── supabase/           # Database migrations and configurations
├── package.json        # Root package.json with workspaces
└── vercel.json         # Vercel deployment configuration
```

## Apps

### Admin Dashboard (`apps/admin`)

- Operations and booking management interface
- Deployed to: `https://sarjblendeditadmin.vercel.app`
- Tech: Next.js 14.2.0, React 18.3.1, Supabase

### Customer Interface (`apps/customer`)

- Customer-facing booking interface
- Book services and manage bookings
- Tech: Next.js 14.2.0, React 18.3.1, Supabase

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project account

### Installation

```bash
# Install root dependencies (monorepo workspaces)
npm install

# Set up environment variables for each app
cp apps/admin/.env.local.example apps/admin/.env.local
cp apps/customer/.env.local.example apps/customer/.env.local

# Update both .env.local files with your Supabase credentials
```

### Development

```bash
# Run admin dashboard
npm run dev:admin

# Run customer interface (separate terminal)
npm run dev:customer

# Or run specific app
cd apps/admin && npm run dev
cd apps/customer && npm run dev
```

### Production Build

```bash
# Build admin dashboard
npm run build:admin

# Build customer interface
npm run build:customer
```

## Deployment

### Admin Dashboard (Vercel)

1. Already deployed to Vercel at `sarjblendeditadmin.vercel.app`
2. Configured with root directory: `apps/admin`
3. Environment variables set in Vercel project

### Customer Interface (Vercel)

1. Create new Vercel project
2. Connect this GitHub repository
3. Set Root Directory to `apps/customer`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

### Database Setup (Supabase)

1. Create Supabase project
2. Run SQL migrations from `supabase/migrations/`
3. Update `.env.local` files with Supabase URL and anon key
4. Configure RLS (Row Level Security) policies as needed

## Environment Variables

### Both Apps Require

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anonymous_key
```

⚠️ **Important**: These are public-facing keys. Sensitive operations must be protected with RLS policies in Supabase.

## Database Schema

See `supabase/migrations/` for initial schema.

Key tables:
- `services` — Available barber services
- `bookings` — Customer bookings
- `profiles` — User profile information

## Scripts

### Root Level

```bash
npm run dev:admin        # Start admin dev server
npm run dev:customer     # Start customer dev server
npm run build:admin      # Build admin dashboard
npm run build:customer   # Build customer interface
npm run start:admin      # Start admin production server
npm run start:customer   # Start customer production server
npm run lint             # Lint both apps
```

### Individual App

```bash
cd apps/admin
npm run dev              # Development
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Lint code
```

## Git Workflow

### Creating Features

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
git add .
git commit -m "feat: your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### Branch Protection

- `main` branch requires PR reviews
- CI checks must pass before merging

## Troubleshooting

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### Supabase Connection Issues

- Verify `.env.local` has correct credentials
- Check Supabase project is active
- Ensure RLS policies allow client queries

### Deployment Issues

- Check Vercel build logs for specific errors
- Verify environment variables in Vercel settings
- Ensure root directory is set correctly

## Support

For issues or questions:
1. Check existing GitHub issues
2. Create new issue with detailed description
3. Include error logs and reproduction steps

## License

See LICENSE file in repository.
