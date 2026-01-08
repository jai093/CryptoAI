import { useState } from 'react';
import { Bell } from 'lucide-react';
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
  // Disabled - using toast notifications instead
  return null;
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
      description: `Alert set for ${cryptoSymbol} ${condition} ${targetPrice.toLocaleString()}`,
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