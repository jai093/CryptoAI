import { supabase } from '@/integrations/supabase/client';

// This function applies the database migration for holdings and user_balance tables
export async function applyPortfolioMigration() {
  console.log('Applying portfolio database migration...');
  
  try {
    // Check if we have admin access (this might not work in production)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User must be logged in to apply migration');
      return false;
    }

    // Try to create the tables using raw SQL
    const migrationSQL = `
      -- Create holdings table to store user crypto holdings
      CREATE TABLE IF NOT EXISTS public.holdings (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        crypto_id TEXT NOT NULL,
        crypto_symbol TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        UNIQUE(user_id, crypto_id)
      );

      -- Create user_balance table to store user USD balance
      CREATE TABLE IF NOT EXISTS public.user_balance (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
        balance NUMERIC NOT NULL DEFAULT 50000,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );

      -- Enable RLS
      ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_balance ENABLE ROW LEVEL SECURITY;

      -- Holdings policies
      DROP POLICY IF EXISTS "Users can view their own holdings" ON public.holdings;
      CREATE POLICY "Users can view their own holdings" 
      ON public.holdings FOR SELECT 
      USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can create their own holdings" ON public.holdings;
      CREATE POLICY "Users can create their own holdings" 
      ON public.holdings FOR INSERT 
      WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can update their own holdings" ON public.holdings;
      CREATE POLICY "Users can update their own holdings" 
      ON public.holdings FOR UPDATE 
      USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can delete their own holdings" ON public.holdings;
      CREATE POLICY "Users can delete their own holdings" 
      ON public.holdings FOR DELETE 
      USING (auth.uid() = user_id);

      -- User balance policies
      DROP POLICY IF EXISTS "Users can view their own balance" ON public.user_balance;
      CREATE POLICY "Users can view their own balance" 
      ON public.user_balance FOR SELECT 
      USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can create their own balance" ON public.user_balance;
      CREATE POLICY "Users can create their own balance" 
      ON public.user_balance FOR INSERT 
      WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can update their own balance" ON public.user_balance;
      CREATE POLICY "Users can update their own balance" 
      ON public.user_balance FOR UPDATE 
      USING (auth.uid() = user_id);
    `;

    // This won't work from client-side, but we'll try anyway
    const { error } = await (supabase as any).rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      console.log('Please apply the migration manually using the Supabase dashboard');
      return false;
    }

    console.log('Migration applied successfully!');
    return true;
  } catch (error) {
    console.error('Error applying migration:', error);
    console.log('Please apply the migration manually using the Supabase dashboard');
    return false;
  }
}

// Function to test if tables exist
export async function testTablesExist() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('User not logged in');
      return false;
    }

    // Test holdings table
    const { error: holdingsError } = await supabase
      .from('holdings' as any)
      .select('id')
      .limit(1);

    // Test user_balance table  
    const { error: balanceError } = await supabase
      .from('user_balance' as any)
      .select('id')
      .limit(1);

    const holdingsExists = !holdingsError;
    const balanceExists = !balanceError;

    console.log('Tables status:');
    console.log('- holdings table:', holdingsExists ? '✅ EXISTS' : '❌ MISSING');
    console.log('- user_balance table:', balanceExists ? '✅ EXISTS' : '❌ MISSING');

    return holdingsExists && balanceExists;
  } catch (error) {
    console.error('Error testing tables:', error);
    return false;
  }
}

// Function to initialize user data
export async function initializeUserData() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('User not logged in');
      return false;
    }

    // Create initial balance record
    const { error: balanceError } = await supabase
      .from('user_balance' as any)
      .upsert({
        user_id: user.id,
        balance: 50000,
      });

    if (balanceError) {
      console.error('Error creating initial balance:', balanceError);
      return false;
    }

    console.log('User data initialized successfully!');
    return true;
  } catch (error) {
    console.error('Error initializing user data:', error);
    return false;
  }
}