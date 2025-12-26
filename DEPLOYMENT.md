# CryptoAI Deployment Guide

## Supabase Edge Functions Deployment

The news feed requires Supabase Edge Functions to be deployed. Follow these steps:

### 1. Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Or using npm
npx supabase --version
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to Your Project

```bash
# Navigate to your project directory
cd CryptoAI

# Link to your Supabase project
supabase link --project-ref kjajkuhvzgynhvugsuth
```

### 4. Deploy Edge Functions

```bash
# Deploy the crypto-news function
supabase functions deploy crypto-news

# Deploy the crypto-chat function
supabase functions deploy crypto-chat

# Or deploy all functions at once
supabase functions deploy
```

### 5. Test Functions

```bash
# Test crypto-news function locally
supabase functions serve crypto-news

# Test with curl
curl -X POST 'http://localhost:54321/functions/v1/crypto-news' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 6. Verify Deployment

After deployment, the news feed should automatically start working. You can:

1. **Check the browser console** for function call logs
2. **Use the "Test API" button** in the news feed to test the function directly
3. **Refresh the news feed** to see if it loads real data

### Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_PROJECT_ID="kjajkuhvzgynhvugsuth"
VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_key"
VITE_SUPABASE_URL="https://kjajkuhvzgynhvugsuth.supabase.co"
```

### Troubleshooting

If the functions still don't work:

1. **Check function logs**: `supabase functions logs crypto-news`
2. **Verify deployment**: Check your Supabase dashboard under Edge Functions
3. **Test locally**: Use `supabase functions serve` to test locally first
4. **Check CORS**: Make sure the function includes proper CORS headers

### Fallback Behavior

The app is designed to gracefully handle function failures:

1. **First**: Tries Supabase Edge Function
2. **Second**: Falls back to direct CryptoPanic API
3. **Third**: Uses real-time generated news with current timestamps

This ensures users always see fresh, relevant content even if external APIs fail.