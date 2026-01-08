import { useEffect, useState, useCallback } from 'react';
import { useModel } from '@/contexts/ModelContext';
import { useTrading, SUPPORTED_CRYPTOS } from '@/contexts/TradingContext';
import { Bell, TrendingUp, TrendingDown, X, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface TradingSignal {
  id: string;
  type: 'buy' | 'sell';
  cryptoId: string;
  cryptoSymbol: string;
  price: number;
  targetPrice: number;
  confidence: number;
  timestamp: Date;
  timeUntilAction: number;
  suggestedAmount: number;
}

interface PriceAlert {
  id: string;
  cryptoId: string;
  cryptoSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  triggered: boolean;
}

export function TradingNotification() {
  const { prediction, isReady, predict } = useModel();
  const { cryptoData, balance, holdings, selectedCrypto, executeTrade } = useTrading();
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  // Check price alerts whenever crypto data updates
  useEffect(() => {
    priceAlerts.forEach(alert => {
      if (alert.triggered) return;
      
      const data = cryptoData[alert.cryptoId];
      if (!data) return;

      const currentPrice = data.currentPrice;
      const isTriggered = alert.condition === 'above' 
        ? currentPrice >= alert.targetPrice 
        : currentPrice <= alert.targetPrice;

      if (isTriggered) {
        setPriceAlerts(prev => prev.map(a => 
          a.id === alert.id ? { ...a, triggered: true } : a
        ));
        
        toast({
          title: `🎯 Price Alert Triggered!`,
          description: `${alert.cryptoSymbol} is now ${alert.condition === 'above' ? 'above' : 'below'} $${alert.targetPrice.toLocaleString()} (Current: $${currentPrice.toLocaleString()})`,
        });
      }
    });
  }, [cryptoData, priceAlerts]);

  const generateSignal = useCallback(async () => {
    if (!isReady || !predict) return;
    
    const currentCryptoData = cryptoData[selectedCrypto];
    if (!currentCryptoData || !currentCryptoData.historicalPrices?.length) return;

    const currentPrice = currentCryptoData.currentPrice;
    
    // Ensure we have valid historical data
    if (currentPrice <= 0) return;
    
    const result = await predict(currentPrice, currentCryptoData.historicalPrices);
    
    if (!result) return;

    const changePercent = result.changePercent;
    const threshold = 1.0; // Lowered threshold to generate more signals

    const cryptoHoldings = holdings[selectedCrypto] || 0;
    const cryptoInfo = SUPPORTED_CRYPTOS.find(c => c.id === selectedCrypto);

    if (!cryptoInfo) return;

    // Improved signal logic:
    // BUY signal: when predicted price is higher than current (positive change)
    // SELL signal: when predicted price is lower than current (negative change)
    const isBuySignal = changePercent > threshold;
    const isSellSignal = changePercent < -threshold;

    if ((isBuySignal || isSellSignal) && result.confidence > 70) {
      // For BUY: need balance to buy
      // For SELL: need holdings to sell
      if (isBuySignal && balance <= 0) return;
      if (isSellSignal && cryptoHoldings <= 0) return;

      // Calculate suggested amount
      const suggestedAmount = isBuySignal 
        ? Math.min(balance * 0.2, balance) 
        : Math.min(cryptoHoldings * currentPrice * 0.3, cryptoHoldings * currentPrice);

      if (suggestedAmount <= 0) return;

      const signal: TradingSignal = {
        id: `signal-${Date.now()}`,
        type: isBuySignal ? 'buy' : 'sell',
        cryptoId: selectedCrypto,
        cryptoSymbol: cryptoInfo.symbol,
        price: currentPrice,
        targetPrice: result.predictedPrice,
        confidence: result.confidence,
        timestamp: new Date(),
        timeUntilAction: 10,
        suggestedAmount,
      };

      setSignals(prev => [signal, ...prev.slice(0, 4)]);
      setCurrentSignal(signal);
      setShowNotification(true);

      toast({
        title: `${signal.type === 'buy' ? '🟢 Buy' : '🔴 Sell'} Signal Alert`,
        description: `${signal.type === 'buy' ? 'Opportunity' : 'Warning'}: ${signal.type.toUpperCase()} ${cryptoInfo.symbol} at $${signal.price.toLocaleString()} - Target: $${signal.targetPrice.toLocaleString()} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`,
      });
    }
  }, [isReady, predict, cryptoData, selectedCrypto, balance, holdings]);

  useEffect(() => {
    const currentCryptoData = cryptoData[selectedCrypto];
    if (!notificationsEnabled || !isReady || !currentCryptoData) return;

    // Generate signal on mount and when crypto changes
    const timer = setTimeout(generateSignal, 2000);
    const interval = setInterval(generateSignal, 90000); // Every 90 seconds

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [notificationsEnabled, isReady, cryptoData, selectedCrypto, generateSignal]);

  useEffect(() => {
    if (!currentSignal || currentSignal.timeUntilAction <= 0) return;

    const timer = setInterval(() => {
      setCurrentSignal(prev => {
        if (!prev || prev.timeUntilAction <= 1) {
          return null;
        }
        return { ...prev, timeUntilAction: prev.timeUntilAction - 1 };
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [currentSignal?.id]);

  const dismissNotification = () => {
    setShowNotification(false);
    setCurrentSignal(null);
  };

  const handleExecuteTrade = async () => {
    if (!currentSignal) return;
    
    const success = await executeTrade(currentSignal.type, currentSignal.suggestedAmount, currentSignal.cryptoId);
    if (success) {
      dismissNotification();
    }
  };

  if (!showNotification || !currentSignal) return null;

  const isBuy = currentSignal.type === 'buy';
  const cryptoAmount = currentSignal.suggestedAmount / currentSignal.price;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up max-w-[calc(100vw-2rem)]">
      <div className={`glass-card-elevated p-4 w-80 max-w-full border-l-4 ${isBuy ? 'border-l-success' : 'border-l-destructive'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isBuy ? 'bg-success/20' : 'bg-destructive/20'}`}>
              {isBuy ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
            </div>
            <div>
              <h4 className={`font-semibold ${isBuy ? 'text-success' : 'text-destructive'}`}>
                {isBuy ? 'Buy' : 'Sell'} {currentSignal.cryptoSymbol}
              </h4>
              <p className="text-xs text-muted-foreground">AI Prediction Alert</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={dismissNotification}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Price</span>
            <span className="font-mono font-medium">${currentSignal.price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Target Price</span>
            <span className={`font-mono font-medium ${isBuy ? 'text-success' : 'text-destructive'}`}>
              ${currentSignal.targetPrice.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{currentSignal.confidence.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Suggested Amount</span>
            <span className="font-mono font-medium text-primary">
              ${currentSignal.suggestedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({cryptoAmount.toFixed(6)} {currentSignal.cryptoSymbol})
            </span>
          </div>
        </div>

        <div className={`flex items-center gap-2 p-2 rounded-lg ${isBuy ? 'bg-success/10' : 'bg-destructive/10'}`}>
          <Clock className={`h-4 w-4 ${isBuy ? 'text-success' : 'text-destructive'}`} />
          <span className="text-sm font-medium">
            {currentSignal.timeUntilAction} min until optimal {currentSignal.type}
          </span>
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className={`flex-1 ${isBuy ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}`}
            onClick={handleExecuteTrade}
          >
            {isBuy ? 'Buy' : 'Sell'} Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={dismissNotification}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationToggle() {
  const [enabled, setEnabled] = useState(true);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setEnabled(!enabled)}
      className={`relative ${enabled ? 'text-primary' : 'text-muted-foreground'}`}
    >
      <Bell className="h-5 w-5" />
      {enabled && (
        <span className="absolute top-1 right-1 h-2 w-2 bg-success rounded-full animate-pulse" />
      )}
    </Button>
  );
}

// Export price alert functions for use in other components
export function usePriceAlerts() {
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('priceAlerts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  const addPriceAlert = (cryptoId: string, cryptoSymbol: string, targetPrice: number, condition: 'above' | 'below') => {
    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      cryptoId,
      cryptoSymbol,
      targetPrice,
      condition,
      triggered: false,
    };
    setPriceAlerts(prev => [...prev, newAlert]);
    toast({
      title: '🎯 Price Alert Created',
      description: `Alert set for ${cryptoSymbol} ${condition} $${targetPrice.toLocaleString()}`,
    });
    return newAlert;
  };

  const removePriceAlert = (alertId: string) => {
    setPriceAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const clearTriggeredAlerts = () => {
    setPriceAlerts(prev => prev.filter(a => !a.triggered));
  };

  return { priceAlerts, addPriceAlert, removePriceAlert, clearTriggeredAlerts };
}
