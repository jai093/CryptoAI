import { useState, useEffect } from 'react';
import { Bell, Target, Plus, Trash2, TrendingUp, TrendingDown, CheckCircle, ShoppingCart, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTrading, SUPPORTED_CRYPTOS } from '@/contexts/TradingContext';
import { toast } from 'sonner';

interface PriceAlert {
  id: string;
  cryptoId: string;
  cryptoSymbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  triggered: boolean;
  createdAt: Date;
}

export function PriceAlerts() {
  const { cryptoData, executeTrade } = useTrading();
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('priceAlerts');
    if (saved) {
      try {
        return JSON.parse(saved).map((a: PriceAlert) => ({
          ...a,
          createdAt: new Date(a.createdAt),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  // Check price alerts whenever crypto data updates
  useEffect(() => {
    priceAlerts.forEach(alert => {
      if (alert.triggered) return;
      
      const data = cryptoData[alert.cryptoId];
      if (!data || data.currentPrice <= 0) return;

      const currentPrice = data.currentPrice;
      const isTriggered = alert.condition === 'above' 
        ? currentPrice >= alert.targetPrice 
        : currentPrice <= alert.targetPrice;

      if (isTriggered) {
        setPriceAlerts(prev => prev.map(a => 
          a.id === alert.id ? { ...a, triggered: true } : a
        ));
        
        // Enhanced notification with sound
        const message = `${alert.cryptoSymbol} is now ${alert.condition === 'above' ? 'above' : 'below'} $${alert.targetPrice.toLocaleString()} (Current: $${currentPrice.toLocaleString()})`;
        
        toast.success(
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <div className="font-semibold">Price Alert Triggered!</div>
                  <div className="text-sm text-muted-foreground">{message}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 ml-3">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs bg-success/10 border-success/30 hover:bg-success/20"
                onClick={() => {
                  executeTrade('buy', 1000, alert.cryptoId);
                  document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Buy $1K
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                onClick={() => {
                  executeTrade('sell', 1000, alert.cryptoId);
                  document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <DollarSign className="h-3 w-3 mr-1" />
                Sell $1K
              </Button>
            </div>
          </div>,
          {
            duration: 12000,
            position: "top-center",
            className: "bg-card/95 backdrop-blur border-primary/50",
          }
        );

        // Browser notification (if permission granted)
        if (Notification.permission === 'granted') {
          new Notification(`🎯 ${alert.cryptoSymbol} Price Alert`, {
            body: message,
            icon: '/favicon.ico',
            tag: `price-alert-${alert.id}`,
          });
        }

        // Enhanced pleasant notification sound
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Create a pleasant bell-like sound
          const oscillator1 = audioContext.createOscillator();
          const oscillator2 = audioContext.createOscillator();
          const oscillator3 = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator1.connect(gainNode);
          oscillator2.connect(gainNode);
          oscillator3.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Create a pleasant chord progression (C major chord)
          oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
          oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
          oscillator3.frequency.setValueAtTime(783.99, audioContext.currentTime); // G5
          
          // Smooth bell-like envelope
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
          
          oscillator1.start(audioContext.currentTime);
          oscillator2.start(audioContext.currentTime);
          oscillator3.start(audioContext.currentTime);
          oscillator1.stop(audioContext.currentTime + 1.5);
          oscillator2.stop(audioContext.currentTime + 1.5);
          oscillator3.stop(audioContext.currentTime + 1.5);
          
        } catch (e) {
          console.log('Audio notification not available');
        }
      }
    });
  }, [cryptoData, priceAlerts, executeTrade]);

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast.success('Browser notifications enabled for price alerts!', { duration: 3000 });
        }
      });
    }
  }, []);

  const handleAddAlert = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const cryptoInfo = SUPPORTED_CRYPTOS.find(c => c.id === selectedCrypto);
    if (!cryptoInfo) return;

    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      cryptoId: selectedCrypto,
      cryptoSymbol: cryptoInfo.symbol,
      targetPrice: price,
      condition,
      triggered: false,
      createdAt: new Date(),
    };

    setPriceAlerts(prev => [...prev, newAlert]);
    toast.success('Price Alert Created', {
      description: `Alert set for ${cryptoInfo.symbol} ${condition} $${price.toLocaleString()}`,
    });
    
    setTargetPrice('');
    setIsDialogOpen(false);
  };

  const handleRemoveAlert = (alertId: string) => {
    setPriceAlerts(prev => prev.filter(a => a.id !== alertId));
    toast.success('Alert removed');
  };

  const clearTriggeredAlerts = () => {
    setPriceAlerts(prev => prev.filter(a => !a.triggered));
    toast.success('Triggered alerts cleared');
  };

  const activeAlerts = priceAlerts.filter(a => !a.triggered);
  const triggeredAlerts = priceAlerts.filter(a => a.triggered);

  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Price Alerts</h3>
          {activeAlerts.length > 0 && (
            <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
              {activeAlerts.length} active
            </span>
          )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus size={16} />
              Add Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Price Alert</DialogTitle>
              <DialogDescription>
                Get notified when a cryptocurrency reaches your target price.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Cryptocurrency</Label>
                <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CRYPTOS.map((crypto) => {
                      const currentData = cryptoData[crypto.id];
                      return (
                        <SelectItem key={crypto.id} value={crypto.id}>
                          <span className="flex items-center gap-2">
                            {crypto.symbol} - {crypto.name}
                            {currentData && (
                              <span className="text-muted-foreground text-xs">
                                (${currentData.currentPrice.toLocaleString()})
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as 'above' | 'below')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">
                      <span className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-success" />
                        Price goes above
                      </span>
                    </SelectItem>
                    <SelectItem value="below">
                      <span className="flex items-center gap-2">
                        <TrendingDown size={14} className="text-destructive" />
                        Price goes below
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Price ($)</Label>
                <Input
                  type="number"
                  placeholder="Enter target price"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                />
                {cryptoData[selectedCrypto] && (
                  <p className="text-xs text-muted-foreground">
                    Current price: ${cryptoData[selectedCrypto].currentPrice.toLocaleString()}
                  </p>
                )}
              </div>

              <Button onClick={handleAddAlert} className="w-full">
                Create Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {priceAlerts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No price alerts set</p>
          <p className="text-sm">Create an alert to get notified when prices move</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Active Alerts</h4>
              {activeAlerts.map((alert) => {
                const currentData = cryptoData[alert.cryptoId];
                const currentPrice = currentData?.currentPrice || 0;
                const priceDiff = alert.condition === 'above' 
                  ? ((alert.targetPrice - currentPrice) / currentPrice * 100)
                  : ((currentPrice - alert.targetPrice) / currentPrice * 100);

                return (
                  <div 
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${alert.condition === 'above' ? 'bg-success/20' : 'bg-destructive/20'}`}>
                        {alert.condition === 'above' ? (
                          <TrendingUp size={16} className="text-success" />
                        ) : (
                          <TrendingDown size={16} className="text-destructive" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{alert.cryptoSymbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {alert.condition === 'above' ? 'Above' : 'Below'} ${alert.targetPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-mono">
                          ${currentPrice.toLocaleString()}
                        </div>
                        <div className={`text-xs ${priceDiff > 0 ? 'text-muted-foreground' : 'text-success'}`}>
                          {priceDiff > 0 ? `${priceDiff.toFixed(1)}% away` : 'Almost there!'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveAlert(alert.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {triggeredAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Triggered Alerts</h4>
                <Button variant="ghost" size="sm" onClick={clearTriggeredAlerts}>
                  Clear all
                </Button>
              </div>
              {triggeredAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/30"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-success" />
                    <div>
                      <div className="font-medium">{alert.cryptoSymbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {alert.condition === 'above' ? 'Went above' : 'Went below'} ${alert.targetPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveAlert(alert.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
