import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWebSocket } from '@/hooks/useWebSocket';

export interface CryptoInfo {
  id: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CRYPTOS: CryptoInfo[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'ripple', symbol: 'XRP', name: 'Ripple' },
];

export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  historicalPrices: number[];
  timestamp: number;
}

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  cryptoId: string;
  cryptoSymbol: string;
  amount: number;
  cryptoAmount: number;
  price: number;
  timestamp: Date;
}

interface Holdings {
  [cryptoId: string]: number;
}

interface TradingContextType {
  balance: number;
  holdings: Holdings;
  cryptoData: { [key: string]: CryptoData };
  selectedCrypto: string;
  isLoading: boolean;
  trades: Trade[];
  wsConnected: boolean;
  setSelectedCrypto: (cryptoId: string) => void;
  executeTrade: (type: 'buy' | 'sell', usdAmount: number, cryptoId?: string) => Promise<boolean>;
  fetchCryptoData: (cryptoId?: string) => Promise<void>;
  fetchAllCryptoPrices: () => Promise<void>;
  getCurrentCryptoData: () => CryptoData | null;
}

const TradingContext = createContext<TradingContextType | null>(null);

export function TradingProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(50000);
  const [holdings, setHoldings] = useState<Holdings>({});
  const [cryptoData, setCryptoData] = useState<{ [key: string]: CryptoData }>({});
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket price update handler
  const handlePriceUpdate = useCallback((data: any) => {
    const symbolMap: Record<string, string> = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'SOLUSDT': 'solana',
      'ADAUSDT': 'cardano',
      'XRPUSDT': 'ripple',
    };

    const cryptoId = symbolMap[data.symbol];
    if (!cryptoId) return;

    setCryptoData(prev => {
      const existing = prev[cryptoId];
      if (!existing) return prev;

      return {
        ...prev,
        [cryptoId]: {
          ...existing,
          currentPrice: data.price,
          change24h: data.change24h,
          timestamp: data.timestamp,
        },
      };
    });
  }, []);

  // Initialize WebSocket with enhanced connection handling
  const { isConnected } = useWebSocket(handlePriceUpdate);

  useEffect(() => {
    setWsConnected(isConnected);
  }, [isConnected]);

  // Load user data from database with localStorage fallback
  const loadUserData = useCallback(async (userId: string) => {
    console.log('Loading user data for userId:', userId);
    
    // Try to load from localStorage first as fallback
    const loadFromLocalStorage = () => {
      try {
        const savedBalance = localStorage.getItem(`balance_${userId}`);
        const savedHoldings = localStorage.getItem(`holdings_${userId}`);
        const savedTrades = localStorage.getItem(`trades_${userId}`);
        
        if (savedBalance) {
          const balance = parseFloat(savedBalance);
          if (!isNaN(balance)) {
            console.log('Loaded balance from localStorage:', balance);
            setBalance(balance);
          }
        }
        
        if (savedHoldings) {
          const holdings = JSON.parse(savedHoldings);
          console.log('Loaded holdings from localStorage:', holdings);
          setHoldings(holdings);
        }
        
        if (savedTrades) {
          const trades = JSON.parse(savedTrades);
          console.log('Loaded trades from localStorage:', trades.length, 'trades');
          setTrades(trades.map((trade: any) => ({
            ...trade,
            timestamp: new Date(trade.timestamp)
          })));
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }
    };

    try {
      // Load balance - handle case where table doesn't exist yet
      try {
        console.log('Attempting to load balance from database...');
        const { data: balanceData, error: balanceError } = await supabase
          .from('user_balance' as any)
          .select('balance')
          .eq('user_id', userId)
          .single();
        
        if (balanceError) {
          console.log('Balance query error:', balanceError);
          // Fallback to localStorage
          const savedBalance = localStorage.getItem(`balance_${userId}`);
          if (savedBalance) {
            const balance = parseFloat(savedBalance);
            if (!isNaN(balance)) {
              console.log('Using localStorage balance:', balance);
              setBalance(balance);
            }
          }
        } else if (balanceData && (balanceData as any).balance !== undefined) {
          console.log('Loaded balance from database:', (balanceData as any).balance);
          setBalance((balanceData as any).balance);
          // Save to localStorage as backup
          localStorage.setItem(`balance_${userId}`, (balanceData as any).balance.toString());
        }
      } catch (balanceError) {
        console.log('Balance table not available, using localStorage fallback');
        loadFromLocalStorage();
      }

      // Load holdings - handle case where table doesn't exist yet
      try {
        console.log('Attempting to load holdings from database...');
        const { data: holdingsData, error: holdingsError } = await supabase
          .from('holdings' as any)
          .select('crypto_id, amount')
          .eq('user_id', userId);
        
        if (holdingsError) {
          console.log('Holdings query error:', holdingsError);
          // Fallback to localStorage
          const savedHoldings = localStorage.getItem(`holdings_${userId}`);
          if (savedHoldings) {
            const holdings = JSON.parse(savedHoldings);
            console.log('Using localStorage holdings:', holdings);
            setHoldings(holdings);
          }
        } else if (holdingsData && Array.isArray(holdingsData)) {
          const holdingsMap: Holdings = {};
          holdingsData.forEach((holding: any) => {
            if (holding?.crypto_id && holding?.amount !== undefined) {
              holdingsMap[holding.crypto_id] = holding.amount;
            }
          });
          console.log('Loaded holdings from database:', holdingsMap);
          setHoldings(holdingsMap);
          // Save to localStorage as backup
          localStorage.setItem(`holdings_${userId}`, JSON.stringify(holdingsMap));
        }
      } catch (holdingsError) {
        console.log('Holdings table not available, using localStorage fallback');
        loadFromLocalStorage();
      }

      // Load trade history
      console.log('Attempting to load trade history from database...');
      const { data: tradesData, error: tradesError } = await supabase
        .from('trade_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (tradesError) {
        console.log('Trade history query error:', tradesError);
        // Fallback to localStorage
        const savedTrades = localStorage.getItem(`trades_${userId}`);
        if (savedTrades) {
          const trades = JSON.parse(savedTrades);
          console.log('Using localStorage trades:', trades.length, 'trades');
          setTrades(trades.map((trade: any) => ({
            ...trade,
            timestamp: new Date(trade.timestamp)
          })));
        }
      } else if (tradesData) {
        const formattedTrades: Trade[] = tradesData.map((trade: any) => ({
          id: trade.id,
          type: trade.trade_type as 'buy' | 'sell',
          cryptoId: trade.crypto_id,
          cryptoSymbol: trade.crypto_symbol,
          amount: trade.usd_amount,
          cryptoAmount: trade.crypto_amount,
          price: trade.price_at_trade,
          timestamp: new Date(trade.created_at),
        }));
        console.log('Loaded trade history from database:', formattedTrades.length, 'trades');
        setTrades(formattedTrades);
        // Save to localStorage as backup
        localStorage.setItem(`trades_${userId}`, JSON.stringify(formattedTrades));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Final fallback to localStorage
      loadFromLocalStorage();
    }
  }, []);

  // Get user on mount and load their data
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const newUserId = session?.user?.id ?? null;
      setUserId(newUserId);
      if (newUserId) {
        loadUserData(newUserId);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id ?? null;
      setUserId(newUserId);
      if (newUserId && event === 'SIGNED_IN') {
        loadUserData(newUserId);
      } else if (event === 'SIGNED_OUT') {
        // Reset to default values on sign out
        setBalance(50000);
        setHoldings({});
        setTrades([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const fetchCryptoData = useCallback(async (cryptoId?: string) => {
    const targetCrypto = cryptoId || selectedCrypto;
    const cryptoInfo = SUPPORTED_CRYPTOS.find(c => c.id === targetCrypto);
    if (!cryptoInfo) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crypto-prices', {
        body: { coin: targetCrypto, days: 30 }
      });

      if (error) throw error;
      
      const newCryptoData: CryptoData = {
        id: cryptoInfo.id,
        symbol: cryptoInfo.symbol,
        name: cryptoInfo.name,
        currentPrice: data.currentPrice,
        change24h: data.change24h,
        volume24h: data.volume24h,
        marketCap: data.marketCap,
        historicalPrices: data.historicalPrices,
        timestamp: data.timestamp,
      };

      setCryptoData(prev => ({
        ...prev,
        [targetCrypto]: newCryptoData,
      }));

      console.log(`Fetched live ${cryptoInfo.symbol} data: ${data.currentPrice}`);
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      // Fallback to simulated data
      const fallbackPrice = targetCrypto === 'bitcoin' ? 87000 : 
                           targetCrypto === 'ethereum' ? 3200 :
                           targetCrypto === 'solana' ? 180 :
                           targetCrypto === 'cardano' ? 0.45 : 0.55;
      
      setCryptoData(prev => ({
        ...prev,
        [targetCrypto]: {
          id: cryptoInfo.id,
          symbol: cryptoInfo.symbol,
          name: cryptoInfo.name,
          currentPrice: fallbackPrice,
          change24h: 2.5,
          volume24h: 25000000000,
          marketCap: 2000000000000,
          historicalPrices: Array(30).fill(0).map(() => fallbackPrice * (0.95 + Math.random() * 0.1)),
          timestamp: Date.now(),
        },
      }));
    } finally {
      setIsLoading(false);
    }
  }, [selectedCrypto]);

  const fetchAllCryptoPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all(SUPPORTED_CRYPTOS.map(crypto => fetchCryptoData(crypto.id)));
    } finally {
      setIsLoading(false);
    }
  }, [fetchCryptoData]);

  const getCurrentCryptoData = useCallback(() => {
    return cryptoData[selectedCrypto] || null;
  }, [cryptoData, selectedCrypto]);

  const executeTrade = useCallback(async (type: 'buy' | 'sell', usdAmount: number, cryptoId?: string): Promise<boolean> => {
    const targetCrypto = cryptoId || selectedCrypto;
    const currentData = cryptoData[targetCrypto];
    const cryptoInfo = SUPPORTED_CRYPTOS.find(c => c.id === targetCrypto);
    
    if (!currentData || !cryptoInfo) {
      toast.error('Please wait for price data to load');
      return false;
    }

    const price = currentData.currentPrice;
    const cryptoAmount = usdAmount / price;
    let newBalance = balance;
    let newHoldings = { ...holdings };

    if (type === 'buy') {
      if (usdAmount > balance) {
        toast.error('Insufficient balance');
        return false;
      }
      newBalance = balance - usdAmount;
      newHoldings[targetCrypto] = (newHoldings[targetCrypto] || 0) + cryptoAmount;
    } else {
      const currentHolding = holdings[targetCrypto] || 0;
      if (cryptoAmount > currentHolding) {
        toast.error(`Insufficient ${cryptoInfo.symbol} holdings`);
        return false;
      }
      newBalance = balance + usdAmount;
      newHoldings[targetCrypto] = newHoldings[targetCrypto] - cryptoAmount;
      
      // Remove holding if amount becomes negligible
      if (newHoldings[targetCrypto] < 0.000001) {
        delete newHoldings[targetCrypto];
      }
    }

    // Update local state
    setBalance(newBalance);
    setHoldings(newHoldings);

    const trade: Trade = {
      id: `trade-${Date.now()}`,
      type,
      cryptoId: targetCrypto,
      cryptoSymbol: cryptoInfo.symbol,
      amount: usdAmount,
      cryptoAmount,
      price,
      timestamp: new Date(),
    };

    setTrades(prev => [trade, ...prev]);

    // Save to database if user is logged in, with localStorage fallback
    if (userId) {
      console.log('Saving trade to database for userId:', userId);
      
      // Always save to localStorage as immediate backup
      try {
        localStorage.setItem(`balance_${userId}`, newBalance.toString());
        localStorage.setItem(`holdings_${userId}`, JSON.stringify(newHoldings));
        localStorage.setItem(`trades_${userId}`, JSON.stringify([trade, ...trades]));
        console.log('Saved to localStorage as backup');
      } catch (localError) {
        console.error('Error saving to localStorage:', localError);
      }

      try {
        // Save trade history
        console.log('Saving trade history...');
        const { error: tradeError } = await supabase.from('trade_history').insert({
          user_id: userId,
          crypto_id: targetCrypto,
          crypto_symbol: cryptoInfo.symbol,
          trade_type: type,
          usd_amount: usdAmount,
          crypto_amount: cryptoAmount,
          price_at_trade: price,
        });

        if (tradeError) {
          console.error('Trade history save error:', tradeError);
        } else {
          console.log('Trade history saved successfully');
        }

        // Update balance - handle case where table doesn't exist yet
        try {
          console.log('Updating balance to:', newBalance);
          const { error: balanceError } = await supabase.from('user_balance' as any)
            .upsert({
              user_id: userId,
              balance: newBalance,
            });
          
          if (balanceError) {
            console.error('Balance update error:', balanceError);
          } else {
            console.log('Balance updated successfully');
          }
        } catch (balanceError) {
          console.log('Balance table not available yet, using localStorage fallback');
        }

        // Update holdings - handle case where table doesn't exist yet
        try {
          if (newHoldings[targetCrypto] && newHoldings[targetCrypto] > 0) {
            console.log('Updating holdings for', targetCrypto, ':', newHoldings[targetCrypto]);
            const { error: holdingsError } = await supabase.from('holdings' as any)
              .upsert({
                user_id: userId,
                crypto_id: targetCrypto,
                crypto_symbol: cryptoInfo.symbol,
                amount: newHoldings[targetCrypto],
              });
            
            if (holdingsError) {
              console.error('Holdings update error:', holdingsError);
            } else {
              console.log('Holdings updated successfully');
            }
          } else {
            console.log('Deleting holdings for', targetCrypto);
            // Delete holding if amount is 0 or negative
            const { error: deleteError } = await supabase.from('holdings' as any)
              .delete()
              .eq('user_id', userId)
              .eq('crypto_id', targetCrypto);
            
            if (deleteError) {
              console.error('Holdings delete error:', deleteError);
            } else {
              console.log('Holdings deleted successfully');
            }
          }
        } catch (holdingsError) {
          console.log('Holdings table not available yet, using localStorage fallback');
        }
      } catch (error) {
        console.error('Error saving trade to database:', error);
        console.log('Data saved to localStorage as fallback');
        // Don't show error toast since we have localStorage fallback
      }
    } else {
      console.log('No userId, skipping database save');
    }
    
    toast.success(
      `${type === 'buy' ? 'Bought' : 'Sold'} ${cryptoAmount.toFixed(6)} ${cryptoInfo.symbol} for ${usdAmount.toLocaleString()}`,
      { description: `Price: ${price.toLocaleString()}` }
    );

    return true;
  }, [balance, holdings, cryptoData, selectedCrypto, userId]);

  // Fetch data on mount and every 60 seconds (fallback for WebSocket)
  useEffect(() => {
    fetchCryptoData();
    // Only poll if WebSocket is not connected
    const interval = setInterval(() => {
      if (!wsConnected) {
        fetchCryptoData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchCryptoData, wsConnected]);

  // Legacy compatibility - btcHoldings
  const btcHoldings = holdings['bitcoin'] || 0;

  return (
    <TradingContext.Provider value={{
      balance,
      holdings,
      cryptoData,
      selectedCrypto,
      isLoading,
      trades,
      wsConnected,
      setSelectedCrypto,
      executeTrade,
      fetchCryptoData,
      fetchAllCryptoPrices,
      getCurrentCryptoData,
      // Legacy compatibility
      btcHoldings,
    } as TradingContextType & { btcHoldings: number }}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}