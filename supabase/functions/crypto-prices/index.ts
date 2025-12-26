import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache to reduce API calls
const cache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_DURATION = 30000; // 30 seconds cache for fresher prices

// Fallback prices when API is unavailable (approximate values)
const FALLBACK_PRICES: Record<string, { price: number; change: number; volume: number; marketCap: number }> = {
  bitcoin: { price: 89800, change: 1.2, volume: 25000000000, marketCap: 1780000000000 },
  ethereum: { price: 3055, change: 0.8, volume: 12000000000, marketCap: 367000000000 },
  solana: { price: 127, change: 2.1, volume: 2500000000, marketCap: 55000000000 },
  cardano: { price: 0.375, change: -0.5, volume: 400000000, marketCap: 13500000000 },
  ripple: { price: 1.94, change: 0.3, volume: 1800000000, marketCap: 112000000000 },
};

async function fetchWithRetry(url: string, retries = 2, delay = 500): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      
      // If successful, return immediately
      if (response.ok) {
        return response;
      }
      
      // If rate limited, wait and retry
      if (response.status === 429 && i < retries - 1) {
        console.warn(`Rate limited, retrying in ${delay}ms... (attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      
      console.warn(`API returned status ${response.status}`);
      return null;
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coin = 'bitcoin', days = 30 } = await req.json().catch(() => ({}));
    
    // Check cache first
    const cacheKey = `${coin}-${days}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Returning cached data for ${coin}`);
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Try to fetch current price
    let priceData: any = null;
    const priceResponse = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    );
    
    if (priceResponse) {
      try {
        priceData = await priceResponse.json();
      } catch (e) {
        console.warn('Failed to parse price response');
      }
    }
    
    // Try to fetch historical data
    let historicalPrices: number[] = [];
    const historyResponse = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      1, // Single attempt for historical data
      500
    );
    
    if (historyResponse) {
      try {
        const historyData = await historyResponse.json();
        historicalPrices = historyData.prices?.map((p: [number, number]) => p[1]) || [];
      } catch (e) {
        console.warn('Failed to parse history response');
      }
    }
    
    // Build result - use API data if available, otherwise fallback
    let result: any;
    
    if (priceData && priceData[coin]) {
      result = {
        currentPrice: priceData[coin].usd || 0,
        change24h: priceData[coin].usd_24h_change || 0,
        volume24h: priceData[coin].usd_24h_vol || 0,
        marketCap: priceData[coin].usd_market_cap || 0,
        historicalPrices,
        timestamp: Date.now(),
        source: 'live',
      };
      console.log(`Fetched ${coin} data: $${result.currentPrice}, historical points: ${historicalPrices.length}`);
    } else {
      // Check for stale cache first
      const staleCache = cache.get(cacheKey);
      if (staleCache) {
        console.log(`Using stale cache for ${coin} due to API failure`);
        return new Response(JSON.stringify({ ...staleCache.data, source: 'stale_cache' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Use fallback prices
      const fallback = FALLBACK_PRICES[coin] || FALLBACK_PRICES.bitcoin;
      result = {
        currentPrice: fallback.price,
        change24h: fallback.change,
        volume24h: fallback.volume,
        marketCap: fallback.marketCap,
        historicalPrices: generateFallbackHistory(fallback.price, days),
        timestamp: Date.now(),
        source: 'fallback',
      };
      console.log(`Using fallback data for ${coin}: $${result.currentPrice}`);
    }

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in crypto-prices:', error);
    
    // Return fallback data on any error
    const fallback = FALLBACK_PRICES.bitcoin;
    const result = {
      currentPrice: fallback.price,
      change24h: fallback.change,
      volume24h: fallback.volume,
      marketCap: fallback.marketCap,
      historicalPrices: generateFallbackHistory(fallback.price, 30),
      timestamp: Date.now(),
      source: 'error_fallback',
    };
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate realistic-looking historical prices based on current price
function generateFallbackHistory(currentPrice: number, days: number): number[] {
  const prices: number[] = [];
  let price = currentPrice * 0.95; // Start 5% lower
  const volatility = 0.02; // 2% daily volatility
  
  for (let i = 0; i < days + 1; i++) {
    prices.push(price);
    const change = (Math.random() - 0.45) * volatility * price;
    price = Math.max(price + change, price * 0.9);
  }
  
  // Ensure last price matches current
  prices[prices.length - 1] = currentPrice;
  return prices;
}
