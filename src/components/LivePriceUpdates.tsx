import { useEffect, useState } from 'react';
import { useTrading } from '@/contexts/TradingContext';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PriceChange {
  cryptoId: string;
  symbol: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  timestamp: number;
}

export function LivePriceUpdates() {
  const { cryptoData, wsConnected, executeTrade } = useTrading();
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});
  const [recentChanges, setRecentChanges] = useState<PriceChange[]>([]);

  const handleQuickTrade = async (type: 'buy' | 'sell', cryptoId: string, symbol: string) => {
    const defaultAmount = 1000; // $1000 default trade
    const success = await executeTrade(type, defaultAmount, cryptoId);
    
    if (success) {
      toast.success(`Quick ${type} executed!`, {
        description: `${type === 'buy' ? 'Bought' : 'Sold'} $${defaultAmount} worth of ${symbol}`,
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    Object.entries(cryptoData).forEach(([cryptoId, data]) => {
      const previousPrice = previousPrices[cryptoId];
      const currentPrice = data.currentPrice;
      
      if (previousPrice && previousPrice !== currentPrice && currentPrice > 0) {
        const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
        
        // Only show significant changes (>= 1%)
        if (Math.abs(changePercent) >= 1) {
          const change: PriceChange = {
            cryptoId,
            symbol: data.symbol,
            oldPrice: previousPrice,
            newPrice: currentPrice,
            changePercent,
            timestamp: Date.now(),
          };

          setRecentChanges(prev => [change, ...prev.slice(0, 4)]); // Keep last 5 changes

          // Show enhanced toast with trading buttons
          if (wsConnected) {
            const isPositive = changePercent > 0;
            
            toast(
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {isPositive ? (
                    <TrendingUp className="h-5 w-5 text-success flex-shrink-0" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">
                      {data.symbol} {isPositive ? '📈' : '📉'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${currentPrice.toLocaleString()} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs bg-success/10 border-success/30 hover:bg-success/20"
                    onClick={() => handleQuickTrade('buy', cryptoId, data.symbol)}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Buy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                    onClick={() => handleQuickTrade('sell', cryptoId, data.symbol)}
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    Sell
                  </Button>
                </div>
              </div>,
              {
                duration: 6000,
                position: "bottom-left",
                className: `${isPositive ? "border-success/50" : "border-destructive/50"} bg-card/95 backdrop-blur`,
              }
            );

            // Enhanced audio notification with pleasant tone
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              
              // Create a pleasant notification sound
              const oscillator1 = audioContext.createOscillator();
              const oscillator2 = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator1.connect(gainNode);
              oscillator2.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              // Create a pleasant chord
              oscillator1.frequency.setValueAtTime(isPositive ? 523.25 : 392.00, audioContext.currentTime); // C5 or G4
              oscillator2.frequency.setValueAtTime(isPositive ? 659.25 : 493.88, audioContext.currentTime); // E5 or B4
              
              // Smooth volume envelope
              gainNode.gain.setValueAtTime(0, audioContext.currentTime);
              gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
              
              oscillator1.start(audioContext.currentTime);
              oscillator2.start(audioContext.currentTime);
              oscillator1.stop(audioContext.currentTime + 0.4);
              oscillator2.stop(audioContext.currentTime + 0.4);
              
            } catch (e) {
              console.log('Audio notification not available');
            }
          }
        }
      }
    });

    // Update previous prices
    const newPreviousPrices: Record<string, number> = {};
    Object.entries(cryptoData).forEach(([cryptoId, data]) => {
      if (data.currentPrice > 0) {
        newPreviousPrices[cryptoId] = data.currentPrice;
      }
    });
    setPreviousPrices(newPreviousPrices);
  }, [cryptoData, wsConnected, previousPrices, executeTrade]);

  // Clean up old changes
  useEffect(() => {
    const cleanup = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      setRecentChanges(prev => prev.filter(change => change.timestamp > fiveMinutesAgo));
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanup);
  }, []);

  return null; // This component only handles notifications, no UI
}