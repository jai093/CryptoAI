import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { testTablesExist, initializeUserData } from '@/utils/applyMigration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function DatabaseMigrationHelper() {
  const [isChecking, setIsChecking] = useState(false);
  const [tablesExist, setTablesExist] = useState<boolean | null>(null);

  const handleCheckTables = async () => {
    setIsChecking(true);
    try {
      // First try the migration function to get detailed status
      const { data: migrationData, error: migrationError } = await supabase.functions.invoke('apply-migration');
      
      if (!migrationError && migrationData) {
        const tablesExist = migrationData.holdingsTableExists && migrationData.balanceTableExists;
        setTablesExist(tablesExist);
        
        if (tablesExist) {
          toast.success('Database tables are properly configured!');
        } else {
          toast.error('Database tables are missing. Please apply the migration.');
        }
        return;
      }
      
      // Fallback to direct table testing
      const exist = await testTablesExist();
      setTablesExist(exist);
      if (exist) {
        toast.success('Database tables are properly configured!');
      } else {
        toast.error('Database tables are missing. Please apply the migration.');
      }
    } catch (error) {
      console.error('Error checking tables:', error);
      toast.error('Error checking database tables');
    } finally {
      setIsChecking(false);
    }
  };

  const handleInitializeData = async () => {
    try {
      const success = await initializeUserData();
      if (success) {
        toast.success('User data initialized successfully!');
      } else {
        toast.error('Failed to initialize user data');
      }
    } catch (error) {
      toast.error('Error initializing user data');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Database Migration Helper</CardTitle>
        <CardDescription>
          Check if the portfolio database tables are properly configured
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleCheckTables} 
            disabled={isChecking}
            variant="outline"
          >
            {isChecking ? 'Checking...' : 'Check Database Tables'}
          </Button>
          
          {tablesExist && (
            <Button onClick={handleInitializeData} variant="secondary">
              Initialize User Data
            </Button>
          )}
        </div>

        {tablesExist !== null && (
          <div className="p-4 rounded-lg bg-secondary/20">
            <h4 className="font-medium mb-2">Database Status:</h4>
            <div className="space-y-1 text-sm">
              <div>Holdings Table: {tablesExist ? '✅ EXISTS' : '❌ MISSING'}</div>
              <div>User Balance Table: {tablesExist ? '✅ EXISTS' : '❌ MISSING'}</div>
            </div>
          </div>
        )}

        {tablesExist === false && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h4 className="font-medium text-destructive mb-2">Migration Required</h4>
            <p className="text-sm text-muted-foreground mb-3">
              The portfolio database tables are missing. Use the manual method below:
            </p>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <strong className="text-primary">Manual Method (Recommended):</strong>
                <ol className="mt-2 space-y-1 text-xs list-decimal list-inside">
                  <li>Go to your Supabase dashboard → SQL Editor</li>
                  <li>Copy the SQL from <code>supabase/migrations/20251225000000_add_holdings_table.sql</code></li>
                  <li>Paste and run the SQL</li>
                  <li>Come back here and click "Check Database Tables"</li>
                </ol>
              </div>
              <div className="p-3 bg-secondary/20 rounded-lg">
                <strong>CLI Method:</strong> If you have Supabase CLI: <code>supabase db push</code>
              </div>
            </div>
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
              💡 <strong>Good news:</strong> Your portfolio data is already being saved to localStorage as a backup, 
              so it will persist even without the database tables!
            </div>
          </div>
        )}

        {tablesExist === true && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <h4 className="font-medium text-success mb-2">✅ Database Ready</h4>
            <p className="text-sm text-muted-foreground">
              All required tables exist. Your portfolio data will now persist across sessions!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}