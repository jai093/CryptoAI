# Database Setup Instructions

⚠️ **IMPORTANT**: The portfolio data is vanishing after refresh/signout because the database tables haven't been created yet. Follow these steps to fix this issue.

## Quick Fix Steps

1. **Login to your Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your CryptoAI project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run the Migration SQL**
   - Copy the entire contents of `supabase/migrations/20251225000000_add_holdings_table.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute

4. **Verify Setup**
   - Refresh your CryptoAI app
   - Use the "Database Migration Helper" at the top of the page
   - Click "Check Database Tables" - it should show ✅ for both tables

## What This Fixes

After running the migration:

- ✅ Portfolio holdings will persist after refresh
- ✅ User balance will be saved to database  
- ✅ Trade history will be preserved
- ✅ "No holdings yet" message will disappear after making trades
- ✅ Data survives signout/signin cycles

## Alternative Method (If you have Supabase CLI)

```bash
cd CryptoAI
supabase db push
```

## Troubleshooting

If you still see "No holdings yet" after applying the migration:

1. Make sure you're logged in
2. Make a test trade (buy some crypto)
3. Check browser console for any error messages
4. Use the Database Migration Helper to verify tables exist

## Required Tables

The migration creates:

- `holdings` - Stores crypto amounts per user
- `user_balance` - Stores USD balance per user

Both tables have proper Row Level Security (RLS) policies to ensure users can only access their own data.