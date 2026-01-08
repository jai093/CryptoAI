import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Shield, Zap } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />
        <div 
          className="absolute inset-0 opacity-20" 
          style={{ 
            backgroundImage: 'linear-gradient(hsl(var(--border)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} 
        />
      </div>

      <div className="container relative z-10 px-4 md:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Zap size={14} className="animate-pulse" />
            AI-Powered Predictions
          </div>

          <h1 className="animate-slide-up mb-4 sm:mb-6 text-3xl sm:text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
            <span className="text-foreground">Trade Smarter with</span>
            <br />
            <span className="gradient-text">AI-Driven Insights</span>
          </h1>

          <p className="animate-slide-up mx-auto mb-8 sm:mb-10 max-w-2xl text-base sm:text-lg text-muted-foreground md:text-xl" style={{ animationDelay: '0.1s' }}>
            Harness the power of AI models to predict cryptocurrency prices. 
            Practice trading with our virtual simulator and make informed decisions.
          </p>

          <div className="animate-slide-up flex flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: '0.2s' }}>
            <Button size="xl" className="group gap-2">
              Start Virtual Trading
              <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
            </Button>
            <Button variant="glass" size="xl">
              Explore Predictions
            </Button>
          </div>

          <div className="animate-slide-up mt-16 grid gap-6 sm:grid-cols-3" style={{ animationDelay: '0.3s' }}>
            {[
              { icon: Brain, title: "AI Predictions", desc: "Advanced AI models for accurate forecasting" },
              { icon: Shield, title: "Risk-Free Trading", desc: "Virtual portfolio with simulated funds" },
              { icon: Zap, title: "Real-Time Data", desc: "Live prices from major exchanges" },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="glass-card group p-6 text-center transition-all duration-300 hover:border-primary/30 hover:glow-primary"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon size={24} />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
