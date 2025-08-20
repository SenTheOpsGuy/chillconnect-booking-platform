# Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free tier is sufficient for development)
- PostgreSQL database (we'll use Vercel Postgres)

## Step 1: Create GitHub Repository

If you haven't already, create a new repository on GitHub and push the code:

```bash
# Add remote origin (replace with your GitHub repo URL)
git remote add origin https://github.com/yourusername/chillconnect.git

# Push to GitHub
git push -u origin main
```

## Step 2: Set up Vercel Projects

### Backend Deployment

1. **Create New Project in Vercel Dashboard**
   - Go to vercel.com and login
   - Click "New Project"
   - Import your GitHub repository
   - Choose "backend" as the root directory
   - Framework Preset: "Other"
   - Build Command: Leave empty
   - Output Directory: Leave empty
   - Install Command: `pip install -r requirements-vercel.txt`

2. **Configure Environment Variables**
   In Vercel dashboard, go to Settings > Environment Variables and add:

   ```
   SECRET_KEY=your-secret-key-here-make-it-long-and-secure
   DATABASE_URL=postgresql://username:password@host:port/database
   BREVO_API_KEY=your-brevo-api-key-here
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   PAYPAL_CLIENT_ID=your-paypal-client-id
   PAYPAL_CLIENT_SECRET=your-paypal-client-secret
   PAYPAL_MODE=sandbox
   REDIS_URL=redis://username:password@host:port
   TOKEN_VALUE_INR=100
   PLATFORM_COMMISSION=0.15
   ALLOWED_HOSTS=["https://your-backend-domain.vercel.app"]
   PYTHONPATH=.
   ```

### Frontend Deployment

1. **Create Another Project in Vercel**
   - Click "New Project" again
   - Import the same GitHub repository
   - Choose "frontend" as the root directory
   - Framework Preset: "Create React App"
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

2. **Configure Environment Variables**
   In the frontend project Settings > Environment Variables:

   ```
   REACT_APP_API_URL=https://your-backend-domain.vercel.app
   REACT_APP_PAYPAL_CLIENT_ID=your-paypal-client-id
   ```

## Step 3: Set up Database

### Option 1: Vercel Postgres (Recommended)
1. Go to your backend project in Vercel
2. Click "Storage" tab
3. Create new Postgres database
4. Copy the connection string to your backend environment variables

### Option 2: External PostgreSQL
Use any PostgreSQL service like:
- Neon (neon.tech)
- Supabase (supabase.com)
- Railway (railway.app)
- ElephantSQL (elephantsql.com)

## Step 4: Set up Redis

### Option 1: Vercel KV (Redis-compatible)
1. Go to your backend project in Vercel
2. Click "Storage" tab
3. Create new KV database
4. Copy the connection string to REDIS_URL

### Option 2: External Redis
Use services like:
- Upstash (upstash.com)
- Redis Cloud (redis.com)
- Railway (railway.app)

## Step 5: Configure API Keys

### Twilio (SMS Service)
1. Sign up at twilio.com
2. Get Account SID and Auth Token
3. Purchase a phone number
4. Add to environment variables

### PayPal (Payment Processing)
1. Go to developer.paypal.com
2. Create new app
3. Get Client ID and Secret
4. Use sandbox mode for testing

### Brevo (Email Service)
1. Sign up at brevo.com
2. Go to SMTP & API tab
3. Generate API key
4. Add to environment variables

## Step 6: Deploy

1. **Push any changes to GitHub** - this will trigger automatic deployment
2. **Check deployment logs** in Vercel dashboard
3. **Verify both projects are running**

## Step 7: Test Deployment

### Backend Testing
Visit: `https://your-backend-domain.vercel.app/docs`
- Should show FastAPI documentation
- Test authentication endpoints

### Frontend Testing
Visit: `https://your-frontend-domain.vercel.app`
- Should load the React application
- Test user registration and login

## Troubleshooting

### Common Issues:

1. **Backend: Module not found errors**
   - Ensure `requirements-vercel.txt` has all dependencies
   - Check `PYTHONPATH=.` in environment variables

2. **Database connection errors**
   - Verify DATABASE_URL format: `postgresql://user:pass@host:port/db`
   - Check database server is accessible

3. **CORS errors**
   - Update ALLOWED_HOSTS in backend environment
   - Include both frontend domains

4. **Environment variables not loading**
   - Ensure variables are set in correct project
   - Redeploy after adding variables

### Logs and Debugging
- Check Vercel deployment logs in dashboard
- Use `console.log` for frontend debugging
- Check browser network tab for API calls

## Production Checklist

Before going live:

- [ ] Change PAYPAL_MODE to 'live'
- [ ] Use production PayPal credentials
- [ ] Set strong SECRET_KEY
- [ ] Use production database
- [ ] Configure custom domains
- [ ] Set up monitoring and alerts
- [ ] Test all critical user flows
- [ ] Verify OTP SMS delivery
- [ ] Test payment processing

## Custom Domains (Optional)

1. **Add custom domain in Vercel**
   - Go to project Settings > Domains
   - Add your domain
   - Configure DNS records

2. **Update environment variables**
   - Update ALLOWED_HOSTS in backend
   - Update REACT_APP_API_URL in frontend

## Monitoring

- Use Vercel Analytics for performance monitoring
- Set up error tracking (Sentry recommended)
- Monitor database performance
- Track API usage and rate limits