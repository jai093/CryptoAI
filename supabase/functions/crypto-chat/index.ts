// @ts-ignore - Deno import, resolved at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Simple DeFi explanation without formatting
const DEFI_EXPLANATION = `DeFi stands for Decentralized Finance. Think of it as banking without banks!

Here's how it works:

Traditional Banking:
- You need a bank to get a loan
- Banks control your money
- Banks decide interest rates
- You trust the bank with everything

DeFi Banking:
- Smart contracts replace banks
- You control your own money
- Interest rates are automatic
- Everything runs on blockchain code

Main DeFi Services:

1. Lending & Borrowing
- Put your crypto in a pool, earn interest
- Borrow crypto by putting up collateral
- No credit checks needed

2. Trading (DEX)
- Trade crypto directly with others
- No middleman holding your funds
- You keep control of your money

3. Yield Farming
- Provide liquidity to earn rewards
- Like being a mini-bank and earning fees

4. Stablecoins
- Crypto that stays stable (like $1)
- Used to avoid price swings

Benefits:
- Anyone can use it (just need internet)
- No banks or paperwork
- Transparent (everything on blockchain)
- Available 24/7 worldwide

Risks:
- Code bugs can cause losses
- Crypto prices go up and down a lot
- If you lose your wallet, money is gone
- Still new technology

Bottom line: DeFi lets you do banking stuff without traditional banks, but it's riskier and more complex.`;

// Knowledge base for crypto questions
const CRYPTO_KNOWLEDGE = {
  defi: DEFI_EXPLANATION,
  bitcoin: "Bitcoin is the first cryptocurrency, created in 2009 by Satoshi Nakamoto. It's digital money that works without banks or governments controlling it.",
  ethereum: "Ethereum is a blockchain platform that lets developers build apps and smart contracts. ETH is its native cryptocurrency.",
  blockchain: "A blockchain is like a digital ledger that records transactions across many computers. Once something is recorded, it can't be changed.",
  wallet: "A crypto wallet stores your digital money. It has two keys: public (like your bank account number) and private (like your password). Never share your private key!",
  mining: "Mining is how new bitcoins are created. Computers solve complex math problems to verify transactions and get rewarded with bitcoin.",
  staking: "Staking means locking up your crypto to help secure a network. In return, you earn rewards, like earning interest in a savings account.",
};

function getSimpleResponse(question: string): string {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('defi') || lowerQuestion.includes('decentralized finance')) {
    return CRYPTO_KNOWLEDGE.defi;
  }
  
  if (lowerQuestion.includes('bitcoin') || lowerQuestion.includes('btc')) {
    return CRYPTO_KNOWLEDGE.bitcoin;
  }
  
  if (lowerQuestion.includes('ethereum') || lowerQuestion.includes('eth')) {
    return CRYPTO_KNOWLEDGE.ethereum;
  }
  
  if (lowerQuestion.includes('blockchain')) {
    return CRYPTO_KNOWLEDGE.blockchain;
  }
  
  if (lowerQuestion.includes('wallet')) {
    return CRYPTO_KNOWLEDGE.wallet;
  }
  
  if (lowerQuestion.includes('mining')) {
    return CRYPTO_KNOWLEDGE.mining;
  }
  
  if (lowerQuestion.includes('staking')) {
    return CRYPTO_KNOWLEDGE.staking;
  }
  
  // Default response for other questions
  return `I'm your crypto assistant! I can explain:

- DeFi (Decentralized Finance)
- Bitcoin and Ethereum basics
- How blockchain works
- Crypto wallets and security
- Mining and staking

Ask me something like "What is DeFi?" or "How does Bitcoin work?"

For trading help, use the trading panel on the main dashboard!`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('Invalid message format');
    }

    const response = getSimpleResponse(lastMessage.content);
    
    // Stream the response to match the expected format
    const stream = new ReadableStream({
      start(controller) {
        // Send the response in chunks to simulate streaming
        const words = response.split(' ');
        let index = 0;
        
        const sendChunk = () => {
          if (index < words.length) {
            const chunk = {
              choices: [{
                delta: {
                  content: words[index] + ' '
                }
              }]
            };
            
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
            
            index++;
            setTimeout(sendChunk, 50); // 50ms delay between words
          } else {
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }
        };
        
        sendChunk();
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});