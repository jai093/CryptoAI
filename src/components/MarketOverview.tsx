import { TrendingUp, TrendingDown, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrading, SUPPORTED_CRYPTOS } from "@/contexts/TradingContext";
import { useEffect } from "react";
import { useModel } from "@/contexts/ModelContext";

const predictionColors = {
  bullish: "text-success bg-success/10",
  bearish: "text-destructive bg-destructive/10",
  neutral: "text-muted-foreground bg-muted/50",
};

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export function MarketOverview() {
  const { cryptoData, fetchAllCryptoPrices, isLoading, setSelectedCrypto } = useTrading();
  const { prediction } = useModel();

  useEffect(() => {
    fetchAllCryptoPrices();
    const interval = setInterval(fetchAllCryptoPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchAllCryptoPrices]);

  const getPrediction = (change24h: number): "bullish" | "bearish" | "neutral" => {
    if (change24h > 2) return "bullish";
    if (change24h < -2) return "bearish";
    return "neutral";
  };

  const handleSelectCrypto = (cryptoId: string) => {
    setSelectedCrypto(cryptoId);
    const tradeSection = document.getElementById('trade');
    if (tradeSection) {
      tradeSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Market Overview</h3>
          <span className="text-xs text-muted-foreground">(Live Prices)</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary text-xs sm:text-sm gap-2"
          onClick={() => fetchAllCryptoPrices()}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-border/30 text-left text-[10px] sm:text-xs text-muted-foreground">
              <th className="px-3 sm:px-6 py-3 font-medium">#</th>
              <th className="px-3 sm:px-6 py-3 font-medium">Name</th>
              <th className="px-3 sm:px-6 py-3 text-right font-medium">Price</th>
              <th className="px-3 sm:px-6 py-3 text-right font-medium">24h</th>
              <th className="hidden px-3 sm:px-6 py-3 text-right font-medium md:table-cell">Market Cap</th>
              <th className="hidden px-3 sm:px-6 py-3 text-right font-medium lg:table-cell">Volume</th>
              <th className="px-3 sm:px-6 py-3 text-right font-medium">AI</th>
            </tr>
          </thead>
          <tbody>
            {SUPPORTED_CRYPTOS.map((crypto, index) => {
              const data = cryptoData[crypto.id];
              const price = data?.currentPrice || 0;
              const change24h = data?.change24h || 0;
              const marketCap = data?.marketCap || 0;
              const volume = data?.volume24h || 0;
              const pred = getPrediction(change24h);

              return (
                <tr
                  key={crypto.symbol}
                  className="border-b border-border/20 transition-colors hover:bg-secondary/30 cursor-pointer"
                  onClick={() => handleSelectCrypto(crypto.id)}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">{index + 1}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-[10px] sm:text-xs font-bold text-foreground">
                        {crypto.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-foreground">{crypto.name}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{crypto.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-mono text-xs sm:text-sm font-medium text-foreground">
                    {price > 0 ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Loading...'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                    <span className={`inline-flex items-center gap-1 font-mono text-[10px] sm:text-sm font-medium ${change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {change24h >= 0 ? <TrendingUp size={12} className="hidden sm:inline" /> : <TrendingDown size={12} className="hidden sm:inline" />}
                      {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="hidden px-3 sm:px-6 py-3 sm:py-4 text-right font-mono text-xs sm:text-sm text-muted-foreground md:table-cell">
                    {marketCap > 0 ? formatMarketCap(marketCap) : '-'}
                  </td>
                  <td className="hidden px-3 sm:px-6 py-3 sm:py-4 text-right font-mono text-xs sm:text-sm text-muted-foreground lg:table-cell">
                    {volume > 0 ? formatVolume(volume) : '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                    <span className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium ${predictionColors[pred]}`}>
                      <Sparkles size={10} className="hidden sm:inline" />
                      {pred.charAt(0).toUpperCase() + pred.slice(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
