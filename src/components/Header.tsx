import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, Menu, X, LogIn, LogOut, User, History } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationToggle } from "./TradingNotification";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface NavItem {
  label: string;
  sectionId: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", sectionId: "dashboard" },
  { label: "Markets", sectionId: "markets" },
  { label: "Trade", sectionId: "trade" },
  { label: "Predictions", sectionId: "predictions" },
  { label: "Portfolio", sectionId: "portfolio" },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  const handleStartTrading = () => {
    scrollToSection("trade");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight">
            <span className="gradient-text">Crypto</span>
            <span className="text-foreground">AI</span>
          </span>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Button
              key={item.sectionId}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => scrollToSection(item.sectionId)}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:gap-3 md:flex">
          <NotificationToggle />
          
          {user ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => navigate('/history')}
              >
                <History size={16} />
                <span className="hidden lg:inline">History</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => navigate('/profile')}
              >
                <User size={14} className="text-primary" />
                <span className="text-sm text-muted-foreground max-w-[80px] truncate hidden lg:inline">
                  {user.email?.split('@')[0]}
                </span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleSignOut}
              >
                <LogOut size={16} />
                <span className="hidden lg:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate('/auth')}
            >
              <LogIn size={16} />
              <span className="hidden lg:inline">Sign In</span>
              <span className="lg:hidden">Login</span>
            </Button>
          )}
          
          <Button 
            size="sm" 
            className="gap-2"
            onClick={handleStartTrading}
          >
            <TrendingUp size={16} />
            <span className="hidden lg:inline">Start Trading</span>
            <span className="lg:hidden">Trade</span>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-border/30 bg-background/95 backdrop-blur-xl md:hidden animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => (
              <Button
                key={item.sectionId}
                variant="ghost"
                className="justify-start text-muted-foreground hover:text-foreground"
                onClick={() => scrollToSection(item.sectionId)}
              >
                {item.label}
              </Button>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
                    <User size={14} className="text-primary" />
                    <span className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="justify-start gap-2"
                    onClick={() => {
                      navigate('/profile');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <User size={16} />
                    Profile & Settings
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start gap-2"
                    onClick={() => {
                      navigate('/history');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <History size={16} />
                    Trade History
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={handleSignOut}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    navigate('/auth');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <LogIn size={16} />
                  Sign In
                </Button>
              )}
              <Button 
                className="gap-2"
                onClick={handleStartTrading}
              >
                <TrendingUp size={16} />
                Start Trading
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}