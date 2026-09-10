# PRODUCTION ERRORS - DEBUGGING GUIDE

## Common Production Issues

### 1. Build Failures on Vercel

**Symptoms**:
- Deployment fails with build errors
- Red X mark on deployment
- Error in Vercel build logs

**How to Debug**:

1. Check Vercel Build Logs:
   - Go to your Vercel project
   - Click on failed deployment
   - View "Build Logs" tab
   - Note the exact error message

2. Reproduce Locally:
   ```bash
   cd apps/admin  # or apps/customer
   rm -rf .next node_modules
   npm install
   npm run build
   ```

3. Common Causes:
   - TypeScript errors
   - Missing dependencies
   - Environment variables not set
   - Incorrect file paths

**Solution**:
- Fix the error locally
- Test with `npm run build`
- Push to GitHub
- Vercel will auto-redeploy

### 2. Environment Variables Not Loading

**Symptoms**:
- Supabase connection errors
- `undefined` values in console
- "Cannot read property of undefined"

**How to Debug**:

1. Check Vercel Environment Variables:
   - Project Settings → Environment Variables
   - Verify keys are set correctly
   - Ensure `NEXT_PUBLIC_*` prefix is used

2. Check `.env.local` Locally:
   ```bash
   cat apps/customer/.env.local
   ```

3. Add Debug Log:
   ```typescript
   console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
   ```

**Solution**:
- Add/update environment variables in Vercel
- Redeploy after changing variables
- Clear Vercel cache if needed

### 3. Supabase Connection Errors

**Symptoms**:
- "Failed to fetch from Supabase"
- "Invalid API key"
- "CORS error"
- No data loading in UI

**How to Debug**:

1. Test Supabase Connection:
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   );
   
   // Test basic query
   const { data, error } = await supabase
     .from('services')
     .select('*')
     .limit(1);
   
   console.log('Error:', error);
   console.log('Data:', data);
   ```

2. Check Supabase Project:
   - Is project active? (Check Supabase dashboard)
   - Are tables created? (SQL Editor → your tables)
   - Are RLS policies correct?

3. Check CORS Settings:
   - Supabase dashboard → Settings → API
   - Verify your deployment URL is allowed

**Solution**:
- Verify Supabase URL and key
- Check RLS policies allow anonymous access
- Test with simpler queries first
- Add Vercel deployment URL to Supabase CORS

### 4. 500 Internal Server Errors

**Symptoms**:
- "500 Internal Server Error"
- Page won't load
- Vercel function errors

**How to Debug**:

1. Check Vercel Function Logs:
   - Vercel Dashboard → your project
   - View → Logs (Functions tab)
   - Look for error stack traces

2. Check Browser Console:
   - Open DevTools (F12)
   - Network tab → failed requests
   - Console tab → error messages
   - Check server response details

3. Add Error Logging:
   ```typescript
   try {
     const { data, error } = await supabase.from('services').select('*');
     if (error) throw error;
   } catch (error) {
     console.error('Database error:', error);
     // Log to external service
   }
   ```

**Solution**:
- Check application logs
- Verify database is accessible
- Test queries manually in Supabase
- Rebuild and redeploy

### 5. Performance Issues

**Symptoms**:
- Slow page loads
- UI is sluggish
- High Time to Interactive (TTI)

**How to Debug**:

1. Use Vercel Analytics:
   - Vercel Dashboard → Analytics
   - Check Core Web Vitals
   - Identify slow pages

2. Check Network Performance:
   - Browser DevTools → Network tab
   - Sort by file size
   - Look for large requests
   - Check API response times

3. Check Build Size:
   ```bash
   cd apps/customer
   npm run build
   # Check .next/static folder size
   du -sh .next/static
   ```

**Solution**:
- Optimize images
- Code splitting
- Reduce dependencies
- Enable caching
- Optimize Supabase queries

### 6. Database Query Errors

**Symptoms**:
- "Row level security policies" errors
- "Relation does not exist"
- "Syntax error in SQL"

**How to Debug**:

1. Test Query in Supabase SQL Editor:
   ```sql
   SELECT * FROM services LIMIT 1;
   ```

2. Check Table Schema:
   - Supabase Dashboard → SQL Editor
   - Run: `\d services`
   - Verify columns exist

3. Check RLS Policies:
   - Authentication → Policies
   - Review policies for each table
   - Test with correct user role

**Solution**:
- Verify table exists and schema is correct
- Adjust RLS policies if too restrictive
- Use correct column names
- Run migrations if needed

## Debugging Workflow

1. **Check Vercel Logs** → Build or Function errors
2. **Check Browser Console** → Client-side errors
3. **Check Supabase Dashboard** → Database status
4. **Reproduce Locally** → Use same environment
5. **Add Logging** → Identify exact failure point
6. **Fix & Test** → Deploy and verify

## Useful Commands

```bash
# Clear all caches and rebuild
rm -rf .next node_modules
npm install
npm run build

# Test production build locally
npm run build
npm run start

# Check environment variables
env | grep NEXT_PUBLIC

# View Vercel logs
vercel logs

# Deploy with Vercel CLI
vercel --prod
```

## Getting Help

1. **Check Logs First**
   - Vercel Build Logs
   - Browser Console
   - Server Function Logs

2. **Search Issues**
   - GitHub Issues in this repo
   - Stack Overflow
   - Vercel Community

3. **Create Issue**
   - Include error message
   - Steps to reproduce
   - Logs/screenshots
   - Your environment details

## Performance Monitoring

### Set Up Monitoring

1. **Vercel Analytics**
   - Project Settings → Analytics
   - Monitor Core Web Vitals

2. **Error Tracking** (Optional)
   - Sentry
   - LogRocket
   - DataDog

3. **Database Monitoring**
   - Supabase Dashboard → Database
   - Monitor query performance
   - Check replication lag

## Key Files for Debugging

- `apps/customer/app/page.tsx` - Main component
- `apps/customer/.env.local` - Local environment variables
- `vercel.json` - Deployment configuration
- `package.json` - Dependencies and scripts

## Checklist for Deployment Issues

- [ ] Are environment variables set in Vercel?
- [ ] Is root directory correct (`apps/customer` or `apps/admin`)?
- [ ] Does it build locally? (`npm run build`)
- [ ] Are all dependencies in package.json?
- [ ] Is Supabase project active?
- [ ] Are database tables created?
- [ ] Are RLS policies correct?
- [ ] Is API key valid?
- [ ] Check Vercel build logs for specific errors?
