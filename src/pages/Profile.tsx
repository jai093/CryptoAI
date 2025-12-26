import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { User, Settings, Bell, TrendingUp, ArrowLeft, Save } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

interface TradingPreferences {
  default_currency: string;
  risk_level: string;
  notification_enabled: boolean;
  notification_minutes_before: number;
  default_trade_amount: number;
}

const SUPPORTED_CRYPTOS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'ripple', symbol: 'XRP', name: 'Ripple' },
];

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({ display_name: '', avatar_url: '' });
  const [preferences, setPreferences] = useState<TradingPreferences>({
    default_currency: 'bitcoin',
    risk_level: 'medium',
    notification_enabled: true,
    notification_minutes_before: 10,
    default_trade_amount: 1000,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) {
        setProfile({
          display_name: profileData.display_name,
          avatar_url: profileData.avatar_url,
        });
      }

      // Fetch preferences
      const { data: prefsData } = await supabase
        .from('trading_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (prefsData) {
        setPreferences({
          default_currency: prefsData.default_currency,
          risk_level: prefsData.risk_level,
          notification_enabled: prefsData.notification_enabled,
          notification_minutes_before: prefsData.notification_minutes_before,
          default_trade_amount: Number(prefsData.default_trade_amount),
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update preferences
      const { error: prefsError } = await supabase
        .from('trading_preferences')
        .update({
          default_currency: preferences.default_currency,
          risk_level: preferences.risk_level,
          notification_enabled: preferences.notification_enabled,
          notification_minutes_before: preferences.notification_minutes_before,
          default_trade_amount: preferences.default_trade_amount,
        })
        .eq('user_id', user.id);

      if (prefsError) throw prefsError;

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-8 md:px-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile & Settings</h1>
          <p className="text-muted-foreground">Manage your account and trading preferences</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  value={user?.email || ''} 
                  disabled 
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profile.display_name || ''}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  placeholder="Enter your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={profile.avatar_url || ''}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                  placeholder="Enter avatar image URL"
                />
              </div>
            </CardContent>
          </Card>

          {/* Trading Preferences Card */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trading Preferences
              </CardTitle>
              <CardDescription>Configure your trading defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Cryptocurrency</Label>
                <Select
                  value={preferences.default_currency}
                  onValueChange={(value) => setPreferences({ ...preferences, default_currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cryptocurrency" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CRYPTOS.map((crypto) => (
                      <SelectItem key={crypto.id} value={crypto.id}>
                        {crypto.name} ({crypto.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select
                  value={preferences.risk_level}
                  onValueChange={(value) => setPreferences({ ...preferences, risk_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Conservative</SelectItem>
                    <SelectItem value="medium">Medium - Balanced</SelectItem>
                    <SelectItem value="high">High - Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Trade Amount: ${preferences.default_trade_amount.toLocaleString()}</Label>
                <Slider
                  value={[preferences.default_trade_amount]}
                  onValueChange={(value) => setPreferences({ ...preferences, default_trade_amount: value[0] })}
                  min={100}
                  max={10000}
                  step={100}
                  className="py-4"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings Card */}
          <Card className="glass-card md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure trading alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Trading Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive buy/sell alerts from AI predictions</p>
                </div>
                <Switch
                  checked={preferences.notification_enabled}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, notification_enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Notify Before Prediction: {preferences.notification_minutes_before} minutes</Label>
                <Slider
                  value={[preferences.notification_minutes_before]}
                  onValueChange={(value) => setPreferences({ ...preferences, notification_minutes_before: value[0] })}
                  min={1}
                  max={60}
                  step={1}
                  className="py-4"
                  disabled={!preferences.notification_enabled}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
