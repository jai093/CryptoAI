import { useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTrading, SUPPORTED_CRYPTOS } from "@/contexts/TradingContext";

export function PriceTicker() {
  const { cryptoData, fetchAllCryptoPrices } = useTrading();

  useEffect(() => {
    fetchAllCryptoPrices();
    const interval = setInterval(fetchAllCryptoPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchAllCryptoPrices]);

  const prices = SUPPORTED_CRYPTOS.map(crypto => {
    const data = cryptoData[crypto.id];
    return {
      symbol: crypto.symbol,
      name: crypto.name,
      price: data?.currentPrice || 0,
      change24h: data?.change24h || 0,
    };
  });

  const tickerContent = [...prices, ...prices].map((crypto, index) => (
    <div
      key={`${crypto.symbol}-${index}`}
      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2"
    >
      <span className="font-semibold text-foreground text-xs sm:text-sm">{crypto.symbol}</span>
      <span className="font-mono text-xs sm:text-sm text-foreground">
        {crypto.price > 0 
          ? `$${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '...'
        }
      </span>
      <span className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium ${crypto.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
        {crypto.change24h >= 0 ? <TrendingUp size={10} className="sm:w-3 sm:h-3" /> : <TrendingDown size={10} className="sm:w-3 sm:h-3" />}
        {Math.abs(crypto.change24h).toFixed(2)}%
      </span>
    </div>
  ));

  return (
    <div className="w-full overflow-hidden border-y border-border/30 bg-card/30 backdrop-blur-sm">
      <div className="flex animate-ticker whitespace-nowrap">
        {tickerContent}
      </div>
    </div>
  );
}
