// @ts-ignore - Deno import, resolved at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Enhanced sentiment analysis
function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
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
}

// Fetch from CryptoPanic API with better error handling
async function fetchCryptoPanicNews(): Promise<NewsArticle[]> {
  try {
    console.log('Fetching from CryptoPanic API...');
    const response = await fetch(
      'https://cryptopanic.com/api/v1/posts/?auth_token=demo&kind=news&public=true&limit=20&filter=hot',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      }
    );
    
    if (!response.ok) {
      console.error(`CryptoPanic API failed with status: ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`CryptoPanic returned ${data.results?.length || 0} articles`);
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No articles in response');
    }
    
    return data.results.map((item: any, index: number) => ({
      id: `cryptopanic-${item.id}-${Date.now()}`,
      title: item.title,
      description: item.body || item.title.substring(0, 150) + '...',
      source: item.source?.title || item.source?.name || 'CryptoPanic',
      url: item.url,
      imageUrl: item.image,
      publishedAt: new Date(item.published_at).toISOString(),
      sentiment: analyzeSentiment(item.title + ' ' + (item.body || '')),
    }));
  } catch (error) {
    console.error('CryptoPanic fetch failed:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Crypto News API Called ===');
    console.log('Timestamp:', new Date().toISOString());
    
    let articles: NewsArticle[] = [];
    
    // Try CryptoPanic API first - prioritize real news
    try {
      const cryptoPanicNews = await fetchCryptoPanicNews();
      if (cryptoPanicNews.length > 0) {
        articles = [...articles, ...cryptoPanicNews];
        console.log(`✅ Got ${cryptoPanicNews.length} real articles from CryptoPanic`);
      }
    } catch (error) {
      console.log('❌ CryptoPanic failed:', error.message);
    }
    
    // Try additional real news sources
    try {
      // CoinTelegraph API (if available)
      const ctResponse = await fetch('https://cointelegraph.com/api/v1/content?limit=10', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (ctResponse.ok) {
        const ctData = await ctResponse.json();
        if (ctData.posts) {
          const ctArticles = ctData.posts.slice(0, 5).map((item: any, index: number) => ({
            id: `cointelegraph-${item.id || Date.now()}-${index}`,
            title: item.title,
            description: item.lead || item.title.substring(0, 150) + '...',
            source: 'CoinTelegraph',
            url: `https://cointelegraph.com${item.url}`,
            imageUrl: item.cover,
            publishedAt: new Date(item.published * 1000).toISOString(),
            sentiment: analyzeSentiment(item.title + ' ' + (item.lead || '')),
          }));
          
          articles = [...articles, ...ctArticles];
          console.log(`✅ Added ${ctArticles.length} articles from CoinTelegraph`);
        }
      }
    } catch (error) {
      console.log('❌ CoinTelegraph failed:', error.message);
    }
    
    // Only return real articles - no generated content
    if (articles.length === 0) {
      console.log('❌ No real articles available from any source');
      return new Response(
        JSON.stringify({ 
          articles: [],
          timestamp: new Date().toISOString(),
          source: 'none',
          error: 'No real news sources available at this time'
        }),
        {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          },
        }
      );
    }
    
    // Remove duplicates and sort by published date (newest first)
    const uniqueArticles = articles.filter((article, index, self) => 
      index === self.findIndex(a => a.title === article.title)
    );
    
    uniqueArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    // Limit to 15 most recent real articles
    const finalArticles = uniqueArticles.slice(0, 15);
    
    console.log(`📰 Returning ${finalArticles.length} real articles`);
    console.log('Sources:', [...new Set(finalArticles.map(a => a.source))]);
    
    return new Response(
      JSON.stringify({ 
        articles: finalArticles,
        timestamp: new Date().toISOString(),
        source: 'real_news_only',
        totalSources: [...new Set(finalArticles.map(a => a.source))].length
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  } catch (error) {
    console.error('❌ Error in crypto-news function:', error);
    
    // Return empty array instead of generated content
    return new Response(
      JSON.stringify({ 
        articles: [],
        timestamp: new Date().toISOString(),
        source: 'error',
        error: 'Unable to fetch real news at this time'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});