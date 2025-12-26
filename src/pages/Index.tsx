import { Header } from "@/components/Header";
import { PriceTicker } from "@/components/PriceTicker";
import { HeroSection } from "@/components/HeroSection";
import { CryptoChart } from "@/components/CryptoChart";
import { TradingPanel } from "@/components/TradingPanel";
import { PortfolioOverview } from "@/components/PortfolioOverview";
import { MarketOverview } from "@/components/MarketOverview";
import { AIPredictionCard } from "@/components/AIPredictionCard";
import { PriceAlerts } from "@/components/PriceAlerts";
import { CryptoNewsFeed } from "@/components/CryptoNewsFeed";
import { LivePriceUpdates } from "@/components/LivePriceUpdates";
import { Footer } from "@/components/Footer";
import { ModelProvider } from "@/contexts/ModelContext";
import { TradingNotification } from "@/components/TradingNotification";
import { CryptoChat } from "@/components/CryptoChat";
import { useTrading } from "@/contexts/TradingContext";
import { Wifi, WifiOff, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { wsConnected } = useTrading();

  return (
    <ModelProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <PriceTicker />
        <HeroSection />
        
        {/* Enhanced WebSocket Status Indicator */}
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-lg bg-card/90 backdrop-blur border border-border/50 shadow-lg">
          {wsConnected ? (
            <>
              <Wifi size={14} className="text-success animate-pulse" />
              <span className="text-xs text-success font-medium">Live Updates</span>
              <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Polling Mode</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-1"
                onClick={() => window.location.reload()}
                title="Reconnect WebSocket"
              >
                <RotateCcw size={12} />
              </Button>
            </>
          )}
        </div>
        
        <main className="container px-4 pb-20 md:px-6">
          {/* Dashboard Grid */}
          <section id="dashboard" className="mb-12 scroll-mt-20">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground md:text-3xl">Trading Dashboard</h2>
              <p className="text-sm sm:text-base text-muted-foreground">Monitor prices, analyze predictions, and execute virtual trades</p>
            </div>
            
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CryptoChart />
              </div>
              <div id="trade" className="scroll-mt-20">
                <TradingPanel />
              </div>
            </div>
          </section>

          {/* Portfolio & AI Section */}
          <section className="mb-12">
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              <div id="portfolio" className="scroll-mt-20">
                <PortfolioOverview />
              </div>
              <div id="predictions" className="scroll-mt-20">
                <AIPredictionCard />
              </div>
            </div>
          </section>

          {/* Price Alerts Section */}
          <section className="mb-12">
            <PriceAlerts />
          </section>

          {/* News Feed Section */}
          <section id="news" className="mb-12 scroll-mt-20">
            <CryptoNewsFeed />
          </section>

          {/* Market Overview */}
          <section id="markets" className="scroll-mt-20">
            <MarketOverview />
          </section>
        </main>

        <Footer />
        
        {/* Live Price Updates Handler */}
        <LivePriceUpdates />
        
        {/* Trading Notification Popup */}
        <TradingNotification />
        
        {/* AI Crypto Assistant */}
        <CryptoChat />
      </div>
    </ModelProvider>
  );
};

export default Index;