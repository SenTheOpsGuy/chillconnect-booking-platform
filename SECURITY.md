# Security Guide for ChillConnect

## 🔒 Environment Variables Security

### CRITICAL: Never commit these files to Git
- `backend/.env` - Contains API keys, database passwords, secrets
- `frontend/.env` - Contains API endpoints and configuration
- Any file containing the words: secret, key, token, password

### What we've secured:
- ✅ Created `.env.example` files for both backend and frontend
- ✅ Updated `.gitignore` to exclude all `.env` files except examples
- ✅ Added patterns to exclude any files with sensitive keywords

## 🛡️ API Keys & Secrets Management

### For Development:
1. Copy `.env.example` to `.env` in respective directories
2. Fill in your actual API keys and secrets
3. **NEVER** commit the actual `.env` files

### For Production (Vercel):
1. Set environment variables in Vercel dashboard
2. Do not include sensitive data in `vercel.json`
3. Use Vercel's environment variable management

## 🚨 Pre-commit Security Checklist

Before pushing to GitHub, ensure:

- [ ] No `.env` files are being committed
- [ ] No API keys in source code
- [ ] No hardcoded passwords or secrets
- [ ] No database connection strings with credentials
- [ ] No Twilio, PayPal, or Brevo credentials in code
- [ ] All sensitive configuration in `.env.example` is anonymized

## 🔍 How to Check for Leaks

Run these commands before committing:

```bash
# Check what files will be committed
git status

# Search for potential API keys in staged files
git diff --cached | grep -i "key\|secret\|token\|password"

# Check for environment files
git ls-files | grep -E "\.env$"

# Should return empty - if not, unstage them:
git reset HEAD backend/.env frontend/.env
```

## 🌐 Environment Variables for Vercel

### Backend Environment Variables:
```
SECRET_KEY=<your-secret-key>
DATABASE_URL=<your-postgres-url>
BREVO_API_KEY=<your-brevo-key>
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_PHONE_NUMBER=<your-twilio-number>
PAYPAL_CLIENT_ID=<your-paypal-client-id>
PAYPAL_CLIENT_SECRET=<your-paypal-secret>
PAYPAL_MODE=sandbox
REDIS_URL=<your-redis-url>
```

### Frontend Environment Variables:
```
REACT_APP_API_URL=<your-backend-vercel-url>
REACT_APP_PAYPAL_CLIENT_ID=<your-paypal-client-id>
```

## ⚠️ What NOT to do:

- ❌ Don't commit actual API keys
- ❌ Don't include credentials in code comments
- ❌ Don't hardcode any secrets in source files
- ❌ Don't commit database files with real data
- ❌ Don't include production URLs in committed code

## ✅ What TO do:

- ✅ Use environment variables for all secrets
- ✅ Commit only `.env.example` files
- ✅ Use placeholder values in examples
- ✅ Set real values in Vercel dashboard
- ✅ Review every commit before pushing

## 🚑 If you accidentally commit secrets:

1. **Immediately** rotate/regenerate all exposed API keys
2. Remove the commit from Git history:
   ```bash
   git revert <commit-hash>
   ```
3. Change all passwords and tokens
4. Update Vercel environment variables
5. Notify team members

## 📞 Emergency Contacts:

If secrets are exposed:
- Twilio: Regenerate Auth Token in Twilio Console
- PayPal: Regenerate credentials in PayPal Developer Dashboard  
- Brevo: Regenerate API key in Brevo Account Settings
- Database: Change database password immediately