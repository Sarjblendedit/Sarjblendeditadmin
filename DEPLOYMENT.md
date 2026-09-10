# DEPLOYMENT GUIDE

## Overview

This monorepo contains two Next.js applications:
- **Admin Dashboard** (`apps/admin`) - Deployed to Vercel
- **Customer Interface** (`apps/customer`) - Ready for deployment

## Admin Dashboard - Already Deployed ✅

**Live URL**: https://sarjblendeditadmin.vercel.app

### Configuration
- **Platform**: Vercel
- **Root Directory**: `apps/admin`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### Environment Variables Set in Vercel
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Customer Interface - Deploy to Vercel

### Step 1: Create New Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select "Import Git Repository"
3. Choose this GitHub repository (`Sarjblendedit/Sarjblendeditadmin`)
4. Click "Import"

### Step 2: Configure Project Settings

1. **Project Name**: `sarj-blended-it-customer` (or your choice)
2. **Framework Preset**: Next.js
3. **Root Directory**: `apps/customer`
4. **Build Command**: `npm run build`
5. **Output Directory**: `.next`
6. **Install Command**: `npm install`

### Step 3: Add Environment Variables

1. Go to "Environment Variables"
2. Add the following:

```
NAME: NEXT_PUBLIC_SUPABASE_URL
VALUE: [Your Supabase Project URL]
ENVIRONMENTS: Production, Preview, Development

NAME: NEXT_PUBLIC_SUPABASE_ANON_KEY
VALUE: [Your Supabase Anonymous Key]
ENVIRONMENTS: Production, Preview, Development
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your customer interface will be live at a URL like: `https://sarj-blended-it-customer.vercel.app`

## Troubleshooting Deployment

### Build Fails with "Cannot find module"

**Solution**: Ensure root directory is set to `apps/customer`

### Environment Variables Not Working

**Solution**: 
- Verify `NEXT_PUBLIC_*` prefix is used (public variables)
- Redeploy after changing environment variables
- Check Vercel Environment Variables settings

### Supabase Connection Errors

**Solution**:
1. Verify Supabase URL and key are correct
2. Check Supabase project is active
3. Review RLS (Row Level Security) policies in Supabase
4. Test connection locally before deploying

### Build Timeout

**Solution**:
- Clear build cache in Vercel project settings
- Redeploy
- Check for large dependencies

## Local Development Before Deployment

```bash
# Set up environment
cp apps/customer/.env.local.example apps/customer/.env.local

# Add your Supabase credentials to .env.local
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Install dependencies
cd apps/customer
npm install

# Test build locally
npm run build

# Test production server
npm run start
```

If this works locally, it should deploy successfully to Vercel.

## Vercel.json Configuration Explanation

The `vercel.json` at the root is configured for the admin dashboard:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/admin/package.json",
      "use": "@vercel/next@latest",
      "config": {
        "zeroConfig": true
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "apps/admin/$1"
    }
  ]
}
```

**For Customer Interface**: Use Vercel UI settings (Root Directory: `apps/customer`) instead of modifying vercel.json.

## CI/CD Pipeline

Both deployments will automatically:
- Trigger on pushes to `main` branch
- Run builds
- Deploy on success
- Create preview deployments for PRs

## Monitoring Deployments

### Admin Dashboard
- Dashboard: https://vercel.com/dashboard
- Select "Sarjblendedit/Sarjblendeditadmin" project
- View deployment history and logs

### Customer Interface (After Setup)
- Dashboard: https://vercel.com/dashboard
- Select your customer interface project
- View deployment history and logs

## Rollback

If deployment has issues:

1. Go to Vercel project
2. View "Deployments" tab
3. Find previous successful deployment
4. Click "Promote to Production"

## Custom Domain Setup

After successful deployment:

1. Go to Vercel project settings
2. Select "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Database Migrations

Before deploying, ensure Supabase has:
1. Services table
2. Bookings table
3. Profiles table (if using authentication)
4. Required RLS policies

See `supabase/migrations/` for schema.

## Performance Optimization

### Vercel Analytics

1. Enable in Vercel project settings
2. Track Core Web Vitals
3. Monitor performance

### Database Optimization

1. Add indexes to frequently queried columns
2. Use pagination for large datasets
3. Cache Supabase queries where possible

## Security Checklist

- [ ] Use `NEXT_PUBLIC_*` only for client-side safe data
- [ ] Never commit `.env.local` files
- [ ] Enable RLS policies in Supabase
- [ ] Review Supabase Row Level Security for data access
- [ ] Use environment variables for all secrets
- [ ] Enable Vercel project protection settings
- [ ] Review and update dependencies regularly

## Next Steps

1. ✅ Admin dashboard deployed to Vercel
2. 🔄 Deploy customer interface to Vercel
3. 🔧 Configure Supabase with proper RLS policies
4. 📊 Set up monitoring and analytics
5. 🚀 Monitor production performance

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [GitHub Issues](https://github.com/Sarjblendedit/Sarjblendeditadmin/issues)
