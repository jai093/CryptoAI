import { useMemo } from "react";
import { TrendingUp, TrendingDown, PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTrading, SUPPORTED_CRYPTOS } from "@/contexts/TradingContext";

interface PortfolioAsset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  change24h: number;
  color: string;
}

const CRYPTO_COLORS: Record<string, string> = {
  bitcoin: "#f7931a",
  ethereum: "#627eea",
  solana: "#00ffa3",
  cardano: "#0033ad",
  ripple: "#23292f",
};

export function PortfolioOverview() {
  const { holdings, cryptoData } = useTrading();

  // Build portfolio from real holdings and live prices
  const assets = useMemo(() => {
    const portfolioAssets: PortfolioAsset[] = [];
    
    SUPPORTED_CRYPTOS.forEach(crypto => {
      const amount = holdings[crypto.id] || 0;
      if (amount > 0) {
        const priceData = cryptoData[crypto.id];
        const price = priceData?.currentPrice || 0;
        const value = amount * price;
        const change24h = priceData?.change24h || 0;
        
        portfolioAssets.push({
          symbol: crypto.symbol,
          name: crypto.name,
          amount,
          value,
          change24h,
          color: CRYPTO_COLORS[crypto.id] || "#888888",
        });
      }
    });
    
    return portfolioAssets.sort((a, b) => b.value - a.value);
  }, [holdings, cryptoData]);

  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.value, 0);
  }, [assets]);

  // Calculate weighted average change
  const totalChangePercent = useMemo(() => {
    if (totalValue === 0) return 0;
    const weightedChange = assets.reduce((sum, asset) => {
      const weight = asset.value / totalValue;
      return sum + (asset.change24h * weight);
    }, 0);
    return weightedChange;
  }, [assets, totalValue]);

  const totalChange = (totalValue * totalChangePercent) / 100;
  const isPositiveTotal = totalChangePercent >= 0;

  if (assets.length === 0) {
    return (
      <div className="glass-card p-4 sm:p-6">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Portfolio</h3>
          <PieChart size={20} className="text-muted-foreground" />
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No holdings yet</p>
          <p className="text-sm text-muted-foreground mt-2">Buy some crypto to see your portfolio here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Portfolio</h3>
        <PieChart size={20} className="text-muted-foreground" />
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="text-sm text-muted-foreground">Total Value</div>
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <span className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${isPositiveTotal ? 'text-success' : 'text-destructive'}`}>
            {isPositiveTotal ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {isPositiveTotal ? '+' : ''}${Math.abs(totalChange).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPositiveTotal ? '+' : ''}{totalChangePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div className="mb-4 flex h-3 overflow-hidden rounded-full">
        {assets.map((asset) => (
          <div
            key={asset.symbol}
            style={{
              width: `${(asset.value / totalValue) * 100}%`,
              backgroundColor: asset.color,
            }}
            className="transition-all duration-300 first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>

      <div className="space-y-3">
        {assets.map((asset) => (
          <div
            key={asset.symbol}
            className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: asset.color }}
              >
                {asset.symbol.slice(0, 1)}
              </div>
              <div>
                <div className="font-medium text-foreground">{asset.name}</div>
                <div className="text-xs text-muted-foreground">
                  {asset.amount.toFixed(6)} {asset.symbol}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-medium text-foreground">
                ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`flex items-center justify-end gap-1 text-xs ${asset.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                {asset.change24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
