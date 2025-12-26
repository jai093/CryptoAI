import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export function CryptoNewsFeed() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');

  useEffect(() => {
    fetchCryptoNews();
    // Refresh news every 2 minutes for more frequent real updates
    const interval = setInterval(fetchCryptoNews, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCryptoNews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching real crypto news...');
      
      // Try multiple real news sources
      let articles: NewsArticle[] = [];
      
      // Method 1: Try Supabase Edge Function first
      try {
        console.log('📡 Trying Supabase Edge Function...');
        const { data, error } = await supabase.functions.invoke('crypto-news', {
          body: { timestamp: Date.now() }
        });
        
        if (!error && data?.articles && Array.isArray(data.articles)) {
          // Filter out generated articles, only keep real ones
          const realArticles = data.articles.filter(article => 
            !article.id.includes('realtime') && 
            !article.id.includes('sample') && 
            !article.id.includes('fallback') &&
            article.url !== '#'
          );
          
          if (realArticles.length > 0) {
            articles = realArticles;
            console.log(`✅ Got ${realArticles.length} real articles from Supabase function`);
          }
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase function failed:', supabaseError);
      }
      
      // Method 2: Direct CryptoPanic API if we don't have enough real articles
      if (articles.length < 3) {
        try {
          console.log('📡 Trying direct CryptoPanic API...');
          const response = await fetch('https://cryptopanic.com/api/v1/posts/?auth_token=demo&kind=news&public=true&limit=15&filter=hot', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            const apiData = await response.json();
            console.log('📡 CryptoPanic API response:', apiData);
            
            if (apiData.results && apiData.results.length > 0) {
              const directArticles = apiData.results.map((item: any) => ({
                id: `cryptopanic-${item.id}-${Date.now()}`,
                title: item.title,
                description: item.body || item.title.substring(0, 150) + '...',
                source: item.source?.title || item.source?.name || 'CryptoPanic',
                url: item.url,
                imageUrl: item.image,
                publishedAt: new Date(item.published_at).toLocaleString(),
                sentiment: analyzeSentiment(item.title + ' ' + (item.body || '')) as 'positive' | 'negative' | 'neutral',
              }));
              
              articles = [...articles, ...directArticles];
              console.log(`✅ Added ${directArticles.length} articles from direct API`);
            }
          }
        } catch (directApiError) {
          console.error('❌ Direct CryptoPanic API failed:', directApiError);
        }
      }
      
      // Method 3: Try alternative news sources
      if (articles.length < 3) {
        try {
          console.log('📡 Trying alternative news sources...');
          
          // Try CoinDesk RSS (using a CORS proxy)
          const corsProxy = 'https://api.allorigins.win/get?url=';
          const coinDeskRSS = encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/');
          
          const response = await fetch(corsProxy + coinDeskRSS);
          if (response.ok) {
            const data = await response.json();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
            const items = xmlDoc.querySelectorAll('item');
            
            const rssArticles: NewsArticle[] = [];
            items.forEach((item, index) => {
              if (index < 10) { // Limit to 10 articles
                const title = item.querySelector('title')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';
                
                if (title && link) {
                  rssArticles.push({
                    id: `coindesk-${Date.now()}-${index}`,
                    title: title,
                    description: description.substring(0, 200) + '...',
                    source: 'CoinDesk',
                    url: link,
                    publishedAt: new Date(pubDate).toLocaleString(),
                    sentiment: analyzeSentiment(title + ' ' + description) as 'positive' | 'negative' | 'neutral',
                  });
                }
              }
            });
            
            if (rssArticles.length > 0) {
              articles = [...articles, ...rssArticles];
              console.log(`✅ Added ${rssArticles.length} articles from CoinDesk RSS`);
            }
          }
        } catch (rssError) {
          console.error('❌ RSS feed failed:', rssError);
        }
      }
      
      // If we have real articles, use them
      if (articles.length > 0) {
        // Remove duplicates and sort by published date
        const uniqueArticles = articles.filter((article, index, self) => 
          index === self.findIndex(a => a.title === article.title)
        );
        
        uniqueArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        
        setNews(uniqueArticles.slice(0, 12));
        toast.success(`Loaded ${uniqueArticles.length} real crypto news articles`, { 
          duration: 3000,
          description: `Live updates from ${[...new Set(uniqueArticles.map(a => a.source))].join(', ')}`
        });
        console.log(`✅ Successfully loaded ${uniqueArticles.length} real articles`);
      } else {
        throw new Error('No real news articles available from any source');
      }
      
    } catch (err) {
      console.error('❌ All news sources failed:', err);
      setError('Unable to load real-time news. Please check your internet connection.');
      toast.error('Failed to load real-time crypto news', { 
        duration: 5000,
        description: 'Please check your internet connection and try again'
      });
      
      // Don't show any articles if we can't get real ones
      setNews([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple sentiment analysis function
  const analyzeSentiment = (text: string): 'positive' | 'negative' | 'neutral' => {
    const lowerText = text.toLowerCase();
    
    const positiveKeywords = [
      'surge', 'rally', 'bull', 'bullish', 'gain', 'gains', 'rise', 'rising', 
      'jump', 'soar', 'boom', 'profit', 'success', 'breakthrough', 'adoption', 
      'milestone', 'record', 'high', 'pump', 'moon', 'breakout', 'upward',
      'optimistic', 'positive', 'growth', 'increase', 'strong', 'robust',
      'approve', 'approved', 'launch', 'partnership', 'upgrade', 'innovation'
    ];
    
    const negativeKeywords = [
      'crash', 'fall', 'falling', 'bear', 'bearish', 'loss', 'losses', 
      'drop', 'dropping', 'plunge', 'decline', 'slump', 'fail', 'failure', 
      'risk', 'concern', 'warning', 'dump', 'sell-off', 'correction', 'dip',
      'pessimistic', 'negative', 'decrease', 'weak', 'volatile', 'uncertainty',
      'hack', 'exploit', 'ban', 'regulation', 'crackdown', 'investigation'
    ];
    
    const positiveCount = positiveKeywords.filter(keyword => lowerText.includes(keyword)).length;
    const negativeCount = negativeKeywords.filter(keyword => lowerText.includes(keyword)).length;
    
    if (positiveCount > negativeCount && positiveCount > 0) {
      return 'positive';
    } else if (negativeCount > positiveCount && negativeCount > 0) {
      return 'negative';
    }
    
    return 'neutral';
  };

  const filteredNews = selectedSentiment === 'all' 
    ? news 
    : news.filter(article => article.sentiment === selectedSentiment);

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-success/10 border-success/30 text-success';
      case 'negative':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      default:
        return 'bg-muted/10 border-muted/30 text-muted-foreground';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp size={16} />;
      case 'negative':
        return <TrendingDown size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="glass-card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Crypto News Feed</h3>
          <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
            {filteredNews.length} articles
          </span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              console.log('🧪 Manual test: Calling Supabase function directly');
              supabase.functions.invoke('crypto-news').then(result => {
                console.log('🧪 Direct function result:', result);
              }).catch(err => {
                console.error('🧪 Direct function error:', err);
              });
            }}
            className="text-xs"
          >
            Test API
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={fetchCryptoNews}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Sentiment Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {(['all', 'positive', 'negative', 'neutral'] as const).map((sentiment) => (
          <Button
            key={sentiment}
            variant={selectedSentiment === sentiment ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSentiment(sentiment)}
            className="text-xs"
          >
            {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
          </Button>
        ))}
      </div>

      {isLoading && news.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading news...</span>
        </div>
      ) : error && news.length === 0 ? (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Newspaper className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No articles found for selected sentiment</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredNews.map((article) => (
            <div
              key={article.id}
              className="p-3 rounded-lg border border-border/50 hover:border-primary/50 transition-colors group"
            >
              <div className="flex gap-3">
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="h-16 w-16 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h4>
                    {article.sentiment && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs flex-shrink-0 ${getSentimentColor(article.sentiment)}`}>
                        {getSentimentIcon(article.sentiment)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {article.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{article.source}</span>
                      <span>•</span>
                      <span>{article.publishedAt}</span>
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (article.url === '#' || article.id.includes('realtime') || article.id.includes('sample')) {
                          e.preventDefault();
                          toast.info('This is a generated article for demonstration purposes');
                        }
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink size={14} />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
