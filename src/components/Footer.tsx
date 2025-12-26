import { Activity, Github, Twitter } from "lucide-react";

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

export function Footer() {
  return (
    <footer className="border-t border-border/30 bg-card/30">
      <div className="container px-4 py-8 sm:py-12 md:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">
                <span className="gradient-text">Crypto</span>
                <span className="text-foreground">AI</span>
              </span>
            </div>
            <p className="max-w-md text-xs sm:text-sm text-muted-foreground">
              AI-powered cryptocurrency price predictions and virtual trading platform. 
              Practice trading without financial risk using advanced AI models.
            </p>
          </div>

          <div>
            <h4 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-foreground">Platform</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <button 
                  onClick={() => scrollToSection("dashboard")} 
                  className="transition-colors hover:text-foreground"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("markets")} 
                  className="transition-colors hover:text-foreground"
                >
                  Markets
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("trade")} 
                  className="transition-colors hover:text-foreground"
                >
                  Trade
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection("predictions")} 
                  className="transition-colors hover:text-foreground"
                >
                  Predictions
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold text-foreground">Resources</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li><a href="#" className="transition-colors hover:text-foreground">Documentation</a></li>
              <li><a href="#" className="transition-colors hover:text-foreground">API</a></li>
              <li><a href="#" className="transition-colors hover:text-foreground">Support</a></li>
              <li><a href="#" className="transition-colors hover:text-foreground">Blog</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-6 sm:pt-8 md:flex-row">
          <p className="text-xs sm:text-sm text-muted-foreground text-center md:text-left">
            © 2025 CryptoAI. All rights reserved. For educational purposes only.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
              <Twitter size={18} />
            </a>
            <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
              <Github size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}