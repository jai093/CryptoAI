import { useEffect, useState } from "react";
import { Brain, TrendingUp, Target, Activity, Cpu, Loader2, AlertCircle, CheckCircle2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModel } from "@/contexts/ModelContext";
import { useTrading } from "@/contexts/TradingContext";
import { toast } from "sonner";

interface ModelMetric {
  label: string;
  value: string;
  icon: React.ElementType;
}

export function AIPredictionCard() {
  const { isLoading, isReady, error, prediction, predict } = useModel();
  const { cryptoData, selectedCrypto } = useTrading();
  const [isRunning, setIsRunning] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<any>(null);
  
  const currentCryptoData = cryptoData[selectedCrypto];
  const currentPrice = currentCryptoData?.currentPrice || 0;

  // Run prediction on mount and periodically
  useEffect(() => {
    if (isReady && !prediction) {
      runPrediction();
    }
  }, [isReady]);

  const runPrediction = async () => {
    if (!isReady || isRunning) return;
    
    setIsRunning(true);
    try {
      const result = await predict(currentPrice);
      if (result) {
        setLastPrediction(result);
        
        // Show signal alerts
        if (result.changePercent > 0) {
          toast.success(
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4" />
              <div>
                <div className="font-semibold">BUY SIGNAL 📈</div>
                <div className="text-sm">Predicted price: ${result.predictedPrice.toFixed(2)}</div>
                <div className="text-sm">Expected gain: +{result.changePercent.toFixed(2)}%</div>
              </div>
            </div>,
            {
              duration: 6000,
              position: "top-center",
              className: "bg-success/20 border-success",
            }
          );
        } else if (result.changePercent < 0) {
          toast.error(
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4" />
              <div>
                <div className="font-semibold">SELL SIGNAL 📉</div>
                <div className="text-sm">Predicted price: ${result.predictedPrice.toFixed(2)}</div>
                <div className="text-sm">Expected loss: {result.changePercent.toFixed(2)}%</div>
              </div>
            </div>,
            {
              duration: 6000,
              position: "top-center",
              className: "bg-destructive/20 border-destructive",
            }
          );
        } else {
          toast.info(
            <div>
              <div className="font-semibold">NEUTRAL SIGNAL ➡️</div>
              <div className="text-sm">Price expected to remain stable</div>
            </div>,
            {
              duration: 6000,
              position: "top-center",
            }
          );
        }
      }
    } catch (err) {
      console.error('Prediction failed:', err);
    }
    setIsRunning(false);
  };

  const displayPrediction = prediction || lastPrediction;
  
  const metrics: ModelMetric[] = [
    { 
      label: "Change", 
      value: displayPrediction ? `${displayPrediction.changePercent >= 0 ? '+' : ''}${displayPrediction.changePercent.toFixed(2)}%` : "--", 
      icon: Activity 
    },
    { 
      label: "Trend", 
      value: displayPrediction ? (displayPrediction.changePercent >= 0 ? "Bullish" : "Bearish") : "--", 
      icon: TrendingUp 
    },
  ];

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (error) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (isReady) return <CheckCircle2 className="h-4 w-4 text-success" />;
    return null;
  };

  const getStatusText = () => {
    if (isLoading) return "Loading model...";
    if (error) return "Model error";
    if (isReady) return "Model ready";
    return "Initializing...";
  };

  return (
    <div className="glass-card-elevated relative overflow-hidden p-4 sm:p-6">
      {/* Decorative background */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 blur-3xl" />
      
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-primary">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">AI Prediction Engine</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Advanced AI Model</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {getStatusIcon()}
            <span className="hidden sm:inline">{getStatusText()}</span>
          </div>
        </div>

        <div className="mb-4 sm:mb-6 rounded-lg border border-accent/20 bg-accent/5 p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-xs sm:text-sm text-accent">
            <Cpu size={14} />
            <span>Next 24h Prediction</span>
          </div>
          {isLoading || isRunning ? (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <span className="text-sm text-muted-foreground">
                {isLoading ? "Loading AI model..." : "Running prediction..."}
              </span>
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : displayPrediction ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xl sm:text-2xl font-bold text-foreground">
                  ${displayPrediction.predictedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-sm ${displayPrediction.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {displayPrediction.changePercent >= 0 ? '+' : ''}{displayPrediction.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Based on 60-step sequence analysis
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Click to run prediction</div>
          )}
        </div>

        <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg bg-secondary/30 p-2 sm:p-3 text-center">
              <metric.icon className="mx-auto mb-1 h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              <div className="font-mono text-xs sm:text-sm font-semibold text-foreground">{metric.value}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{metric.label}</div>
            </div>
          ))}
        </div>

        <Button 
          variant="gradient" 
          className="w-full gap-2 text-sm"
          onClick={runPrediction}
          disabled={!isReady || isRunning}
        >
          {isRunning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Running Model...
            </>
          ) : (
            <>
              <Brain size={16} />
              {prediction ? "Refresh Prediction" : "Run Prediction"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
