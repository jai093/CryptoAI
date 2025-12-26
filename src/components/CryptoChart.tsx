import { useState, useEffect, useMemo, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Brain, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useModel } from "@/contexts/ModelContext";
import { useTrading, SUPPORTED_CRYPTOS } from "@/contexts/TradingContext";

interface ChartData {
  time: string;
  price: number;
  prediction?: number;
}

const timeRanges = ["1H", "24H", "7D", "30D", "1Y"] as const;
type TimeRange = typeof timeRanges[number];

function generateLabels(range: TimeRange): string[] {
  const labels: string[] = [];
  const displayPoints = range === "1H" ? 12 : range === "24H" ? 24 : range === "7D" ? 7 : range === "30D" ? 30 : 12;
  
  for (let i = 0; i < displayPoints; i++) {
    let label = "";
    if (range === "1H") label = `${i * 5}m`;
    else if (range === "24H") label = `${i}:00`;
    else if (range === "7D") label = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7];
    else if (range === "30D") label = `${i + 1}`;
    else label = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i];
    labels.push(label);
  }
  
  return labels;
}

export function CryptoChart() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("7D");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const { isReady, isLoading: modelLoading, predictBatch, error: modelError } = useModel();
  const { selectedCrypto, cryptoData, fetchCryptoData } = useTrading();
  
  const currentCryptoData = cryptoData[selectedCrypto];
  const cryptoInfo = SUPPORTED_CRYPTOS.find(c => c.id === selectedCrypto);
  const currentPrice = currentCryptoData?.currentPrice || 0;
  const change24h = currentCryptoData?.change24h || 0;

  // Generate chart data from real historical prices
  const generateChartWithPredictions = useCallback(async (range: TimeRange) => {
    const labels = generateLabels(range);
    const historicalPrices = currentCryptoData?.historicalPrices || [];
    
    if (historicalPrices.length === 0) {
      // Generate fallback data based on current price
      const volatility = range === "1H" ? 0.002 : range === "24H" ? 0.01 : range === "7D" ? 0.05 : range === "30D" ? 0.15 : 0.4;
      let price = currentPrice * (1 - volatility / 2);
      const fallbackPrices: number[] = [];
      
      for (let i = 0; i < labels.length; i++) {
        const change = (Math.random() - 0.45) * volatility * currentPrice / labels.length;
        price = Math.max(price + change, currentPrice * 0.5);
        fallbackPrices.push(price);
      }
      fallbackPrices[fallbackPrices.length - 1] = currentPrice;
      
      const data: ChartData[] = labels.map((label, i) => ({
        time: label,
        price: fallbackPrices[i],
      }));
      setChartData(data);
      return;
    }
    
    // Sample historical prices to match display points
    const displayPoints = labels.length;
    const step = Math.max(1, Math.floor(historicalPrices.length / displayPoints));
    const sampledPrices = labels.map((_, i) => 
      historicalPrices[Math.min(i * step, historicalPrices.length - 1)]
    );
    
    // Create chart data
    const data: ChartData[] = labels.map((label, i) => ({
      time: label,
      price: sampledPrices[i],
    }));
    
    // Get AI predictions
    if (isReady && historicalPrices.length >= 10) {
      setIsPredicting(true);
      try {
        const predictions = await predictBatch(historicalPrices, 5);
        
        if (predictions.length > 0) {
          const predictionStartIdx = Math.max(0, data.length - predictions.length);
          predictions.forEach((pred, i) => {
            const idx = predictionStartIdx + i;
            if (idx < data.length) {
              data[idx].prediction = pred;
            }
          });
        }
      } catch (err) {
        console.error('Failed to generate predictions:', err);
      }
      setIsPredicting(false);
    }
    
    setChartData(data);
  }, [currentCryptoData, currentPrice, isReady, predictBatch]);

  // Fetch data when crypto changes
  useEffect(() => {
    fetchCryptoData(selectedCrypto);
  }, [selectedCrypto, fetchCryptoData]);

  // Update chart when data or range changes
  useEffect(() => {
    if (currentPrice > 0) {
      generateChartWithPredictions(selectedRange);
    }
  }, [selectedRange, generateChartWithPredictions, currentPrice, selectedCrypto]);

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return change24h;
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  }, [chartData, change24h]);

  const isPositive = priceChange >= 0;

  const rmse = useMemo(() => {
    const pointsWithPred = chartData.filter(d => d.prediction !== undefined);
    if (pointsWithPred.length === 0) return null;
    
    const sumSquaredErrors = pointsWithPred.reduce((sum, d) => {
      const error = (d.prediction! - d.price) / d.price;
      return sum + error * error;
    }, 0);
    
    return Math.sqrt(sumSquaredErrors / pointsWithPred.length) * 100;
  }, [chartData]);

  // Get crypto color
  const getCryptoColor = () => {
    const colors: Record<string, string> = {
      bitcoin: "#f7931a",
      ethereum: "#627eea",
      solana: "#00ffa3",
      cardano: "#0033ad",
      ripple: "#23292f",
    };
    return colors[selectedCrypto] || "#f7931a";
  };

  return (
    <div className="glass-card-elevated p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div 
              className="flex h-10 w-10 items-center justify-center rounded-full text-white font-bold"
              style={{ backgroundColor: getCryptoColor() }}
            >
              {cryptoInfo?.symbol?.slice(0, 1) || "₿"}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{cryptoInfo?.name || "Bitcoin"}</h3>
              <span className="text-sm text-muted-foreground">{cryptoInfo?.symbol || "BTC"}/USDT</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-xl sm:text-2xl font-bold text-foreground">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center justify-end gap-1 text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {timeRanges.map(range => (
          <Button
            key={range}
            variant={selectedRange === range ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedRange(range)}
            className="text-xs"
          >
            {range}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {modelLoading ? (
            <>
              <Loader2 size={14} className="animate-spin text-primary" />
              <span>Loading model...</span>
            </>
          ) : modelError ? (
            <span className="text-destructive">Model error</span>
          ) : isPredicting ? (
            <>
              <Loader2 size={14} className="animate-spin text-accent" />
              <span>Predicting...</span>
            </>
          ) : isReady ? (
            <>
              <Brain size={14} className="text-accent" />
              <span className="hidden sm:inline">AI Model Active</span>
              <span className="sm:hidden">AI Active</span>
            </>
          ) : (
            <span>Model unavailable</span>
          )}
        </div>
      </div>

      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)"} stopOpacity={0.3} />
                <stop offset="100%" stopColor={isPositive ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)"} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={['auto', 'auto']} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
              tickFormatter={(value) => currentPrice > 100 ? `$${(value / 1000).toFixed(0)}k` : `$${value.toFixed(2)}`}
              width={50}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(222, 47%, 8%)', 
                border: '1px solid hsl(222, 30%, 18%)',
                borderRadius: '8px',
                boxShadow: '0 8px 32px hsl(222, 47%, 3%, 0.5)',
                fontSize: '12px'
              }}
              labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                name === 'price' ? 'Actual' : 'AI Prediction'
              ]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "hsl(142, 76%, 45%)" : "hsl(0, 84%, 60%)"}
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
            <Area
              type="monotone"
              dataKey="prediction"
              stroke="hsl(262, 83%, 58%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#predictionGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-border/50 pt-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isPositive ? 'bg-success' : 'bg-destructive'}`} />
            <span>Actual Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent" />
            <span>AI Prediction</span>
          </div>
        </div>
        {rmse !== null && (
          <div className="text-xs text-muted-foreground">
            RMSE: <span className="font-mono text-foreground">{rmse.toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
