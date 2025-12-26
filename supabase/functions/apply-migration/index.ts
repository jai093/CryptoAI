// @ts-ignore - Deno import, resolved at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - Deno import, resolved at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Deno global type declaration for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Migration check request received');

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client for checking authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      throw new Error('User not authenticated');
    }

    console.log('User authenticated:', user.id);

    // Create admin client for checking tables
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      throw new Error('Missing service role key');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if tables already exist by trying to query them
    let holdingsTableExists = false;
    let balanceTableExists = false;

    try {
      const { error: holdingsError } = await supabaseAdmin
        .from('holdings')
        .select('id')
        .limit(1);
      holdingsTableExists = !holdingsError;
      console.log('Holdings table exists:', holdingsTableExists);
    } catch (error) {
      console.log('Holdings table check failed:', error);
      holdingsTableExists = false;
    }

    try {
      const { error: balanceError } = await supabaseAdmin
        .from('user_balance')
        .select('id')
        .limit(1);
      balanceTableExists = !balanceError;
      console.log('Balance table exists:', balanceTableExists);
    } catch (error) {
      console.log('Balance table check failed:', error);
      balanceTableExists = false;
    }

    const tablesExist = holdingsTableExists && balanceTableExists;

    if (tablesExist) {
      // Tables exist, try to initialize user data
      try {
        const { error: initError } = await supabaseAdmin
          .from('user_balance')
          .upsert({
            user_id: user.id,
            balance: 50000,
          });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Database tables exist and user data initialized',
            tablesCreated: false,
            userInitialized: !initError,
            holdingsTableExists,
            balanceTableExists
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (initError) {
        console.error('User initialization failed:', initError);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Database tables exist but user initialization failed',
            tablesCreated: false,
            userInitialized: false,
            holdingsTableExists,
            balanceTableExists,
            initError: initError.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Tables don't exist - provide instructions for manual migration
    console.log('Tables missing, returning migration instructions');
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Database tables are missing. Manual migration required.',
        tablesCreated: false,
        holdingsTableExists,
        balanceTableExists,
        instructions: {
          step1: 'Go to your Supabase Dashboard',
          step2: 'Navigate to SQL Editor',
          step3: 'Copy the SQL from supabase/migrations/20251225000000_add_holdings_table.sql',
          step4: 'Paste and run the SQL in the editor',
          step5: 'Refresh the app and check tables again'
        },
        migrationFile: 'supabase/migrations/20251225000000_add_holdings_table.sql',
        reason: 'Edge Functions cannot execute DDL statements for security reasons'
      }),
      { 
        status: 200, // Changed to 200 since this is expected behavior
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in migration check:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Migration check failed. Please use the manual method via Supabase Dashboard.',
        instructions: {
          manual: 'Go to Supabase Dashboard → SQL Editor → Run migration SQL',
          file: 'supabase/migrations/20251225000000_add_holdings_table.sql'
        }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});