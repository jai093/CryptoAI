import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, TrendingUp, TrendingDown, History, DollarSign, Percent, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface TradeRecord {
  id: string;
  crypto_id: string;
  crypto_symbol: string;
  trade_type: 'buy' | 'sell';
  usd_amount: number;
  crypto_amount: number;
  price_at_trade: number;
  created_at: string;
  current_price?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
}

interface CryptoPrices {
  [key: string]: number;
}

const SUPPORTED_CRYPTOS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'ripple', symbol: 'XRP', name: 'Ripple' },
];

export default function TradeHistory() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPrices, setCurrentPrices] = useState<CryptoPrices>({});
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalProfit: 0,
    winRate: 0,
    totalVolume: 0,
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
        fetchData(session.user.id);
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchCurrentPrices = async (): Promise<CryptoPrices> => {
    const prices: CryptoPrices = {};
    
    for (const crypto of SUPPORTED_CRYPTOS) {
      try {
        const { data } = await supabase.functions.invoke('crypto-prices', {
          body: { coin: crypto.id, days: 1 }
        });
        if (data?.currentPrice) {
          prices[crypto.id] = data.currentPrice;
        }
      } catch (error) {
        console.error(`Error fetching ${crypto.id} price:`, error);
      }
    }
    
    return prices;
  };

  const fetchData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Fetch trades
      const { data: tradesData, error } = await supabase
        .from('trade_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch current prices
      const prices = await fetchCurrentPrices();
      setCurrentPrices(prices);

      // Calculate profit/loss for each trade
      const tradesWithPL: TradeRecord[] = (tradesData || []).map((trade) => {
        const currentPrice = prices[trade.crypto_id] || Number(trade.price_at_trade);
        const currentValue = Number(trade.crypto_amount) * currentPrice;
        const originalValue = Number(trade.usd_amount);
        
        let profitLoss = 0;
        let profitLossPercent = 0;

        if (trade.trade_type === 'buy') {
          // For buys, profit is current value - original value
          profitLoss = currentValue - originalValue;
          profitLossPercent = (profitLoss / originalValue) * 100;
        } else {
          // For sells, we already locked in the profit/loss at trade time
          // Compare sell price to current price to see if it was a good decision
          profitLoss = originalValue - currentValue;
          profitLossPercent = currentValue > 0 ? (profitLoss / currentValue) * 100 : 0;
        }

        return {
          id: trade.id,
          crypto_id: trade.crypto_id,
          crypto_symbol: trade.crypto_symbol,
          trade_type: trade.trade_type as 'buy' | 'sell',
          usd_amount: Number(trade.usd_amount),
          crypto_amount: Number(trade.crypto_amount),
          price_at_trade: Number(trade.price_at_trade),
          created_at: trade.created_at,
          current_price: currentPrice,
          profit_loss: profitLoss,
          profit_loss_percent: profitLossPercent,
        };
      });

      setTrades(tradesWithPL);

      // Calculate stats
      const totalTrades = tradesWithPL.length;
      const totalVolume = tradesWithPL.reduce((sum, t) => sum + t.usd_amount, 0);
      const totalProfit = tradesWithPL
        .filter(t => t.trade_type === 'buy')
        .reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const profitableTrades = tradesWithPL.filter(t => (t.profit_loss || 0) > 0).length;
      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

      setStats({ totalTrades, totalProfit, winRate, totalVolume });
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast.error('Failed to fetch trade history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchData(user.id);
    setRefreshing(false);
    toast.success('Prices updated with latest market data');
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
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh Prices
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            Trade History
          </h1>
          <p className="text-muted-foreground">View all your virtual trades with real-time profit/loss calculations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{stats.totalTrades}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="text-2xl font-bold">${stats.totalVolume.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stats.totalProfit >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                  {stats.totalProfit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unrealized P/L</p>
                  <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Percent className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trade History Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>All Trades</CardTitle>
            <CardDescription>
              Profit/Loss is calculated using real-time market prices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No trades yet. Start trading to see your history here.</p>
                <Button className="mt-4" onClick={() => navigate('/')}>
                  Start Trading
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Crypto</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Price at Trade</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(trade.created_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={trade.trade_type === 'buy' ? 'default' : 'secondary'}
                            className={trade.trade_type === 'buy' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}
                          >
                            {trade.trade_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{trade.crypto_symbol}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <div>{trade.crypto_amount.toFixed(6)}</div>
                          <div className="text-sm text-muted-foreground">${trade.usd_amount.toLocaleString()}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${trade.price_at_trade.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${trade.current_price?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`font-mono font-medium ${(trade.profit_loss || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {(trade.profit_loss || 0) >= 0 ? '+' : ''}${(trade.profit_loss || 0).toFixed(2)}
                          </div>
                          <div className={`text-sm ${(trade.profit_loss_percent || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {(trade.profit_loss_percent || 0) >= 0 ? '+' : ''}{(trade.profit_loss_percent || 0).toFixed(2)}%
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
