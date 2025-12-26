import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Wallet, Coins } from "lucide-react";
import { useTrading, SUPPORTED_CRYPTOS } from "@/contexts/TradingContext";

export function TradingPanel() {
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState([25]);
  const { 
    balance, 
    holdings, 
    cryptoData, 
    selectedCrypto, 
    setSelectedCrypto,
    executeTrade, 
    isLoading 
  } = useTrading();
  
  const currentCryptoData = cryptoData[selectedCrypto];
  const cryptoPrice = currentCryptoData?.currentPrice || 0;
  const cryptoHoldings = holdings[selectedCrypto] || 0;
  const cryptoInfo = SUPPORTED_CRYPTOS.find(c => c.id === selectedCrypto);

  const handleTrade = async (type: "buy" | "sell") => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }
    
    const usdAmount = parseFloat(amount);
    const success = await executeTrade(type, usdAmount);
    
    if (success) {
      setAmount("");
      setPercentage([25]);
    }
  };

  const handlePercentageChange = (value: number[], type: "buy" | "sell") => {
    setPercentage(value);
    if (type === "buy") {
      setAmount(((balance * value[0]) / 100).toFixed(2));
    } else {
      setAmount(((cryptoHoldings * cryptoPrice * value[0]) / 100).toFixed(2));
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6 h-full">
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Virtual Trade</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-2 sm:px-3 py-1 sm:py-1.5">
            <Wallet size={12} className="sm:w-3.5 sm:h-3.5 text-primary" />
            <span className="font-mono text-xs sm:text-sm font-medium text-foreground">
              ${balance.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-2 sm:px-3 py-1 sm:py-1.5">
            <Coins size={12} className="sm:w-3.5 sm:h-3.5 text-primary" />
            <span className="font-mono text-xs sm:text-sm font-medium text-foreground">
              {cryptoHoldings.toFixed(6)} {cryptoInfo?.symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Crypto Selector */}
      <div className="mb-4">
        <label className="mb-2 block text-sm text-muted-foreground">Select Cryptocurrency</label>
        <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
          <SelectTrigger className="bg-secondary/30">
            <SelectValue placeholder="Select crypto" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CRYPTOS.map((crypto) => (
              <SelectItem key={crypto.id} value={crypto.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{crypto.symbol}</span>
                  <span className="text-muted-foreground">- {crypto.name}</span>
                  {cryptoData[crypto.id] && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      ${cryptoData[crypto.id].currentPrice.toLocaleString()}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="mb-2 text-xs text-muted-foreground animate-pulse">
          Fetching live prices...
        </div>
      )}

      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/30">
          <TabsTrigger 
            value="buy" 
            className="data-[state=active]:bg-success data-[state=active]:text-success-foreground"
          >
            Buy
          </TabsTrigger>
          <TabsTrigger 
            value="sell"
            className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
          >
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-secondary/30 pl-7 font-mono text-lg"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Percentage of balance</span>
              <span className="font-mono text-foreground">{percentage[0]}%</span>
            </div>
            <Slider
              value={percentage}
              onValueChange={(v) => handlePercentageChange(v, "buy")}
              max={100}
              step={1}
              className="[&_[role=slider]]:bg-success"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="rounded-lg bg-secondary/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">You will receive</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-foreground">
                  {amount && cryptoPrice ? (parseFloat(amount) / cryptoPrice).toFixed(6) : "0.000000"} {cryptoInfo?.symbol}
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price per {cryptoInfo?.symbol}</span>
              <span className="font-mono text-foreground">${cryptoPrice.toLocaleString()}</span>
            </div>
          </div>

          <Button 
            variant="success" 
            className="w-full" 
            size="lg"
            onClick={() => handleTrade("buy")}
            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance || !cryptoPrice}
          >
            Buy {cryptoInfo?.symbol}
          </Button>
        </TabsContent>

        <TabsContent value="sell" className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-muted-foreground">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-secondary/30 pl-7 font-mono text-lg"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Percentage of holdings</span>
              <span className="font-mono text-foreground">{percentage[0]}%</span>
            </div>
            <Slider
              value={percentage}
              onValueChange={(v) => handlePercentageChange(v, "sell")}
              max={100}
              step={1}
              className="[&_[role=slider]]:bg-destructive"
            />
          </div>

          <div className="rounded-lg bg-secondary/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">You will receive</span>
              <span className="font-mono font-medium text-foreground">
                ${amount ? parseFloat(amount).toLocaleString() : "0.00"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{cryptoInfo?.symbol} to sell</span>
              <span className="font-mono text-foreground">
                {amount && cryptoPrice ? (parseFloat(amount) / cryptoPrice).toFixed(6) : "0.000000"} {cryptoInfo?.symbol}
              </span>
            </div>
          </div>

          <Button 
            variant="destructive" 
            className="w-full" 
            size="lg"
            onClick={() => handleTrade("sell")}
            disabled={!amount || parseFloat(amount) <= 0 || !cryptoPrice || (parseFloat(amount) / cryptoPrice > cryptoHoldings)}
          >
            Sell {cryptoInfo?.symbol}
          </Button>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0 text-primary" />
        <p>This is a virtual trading simulator using live prices. No real money or cryptocurrency is involved.</p>
      </div>
    </div>
  );
}
