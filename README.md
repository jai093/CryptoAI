# CryptoAI - AI-Powered Cryptocurrency Trading Platform

A modern, AI-powered cryptocurrency trading platform built with React, TypeScript, and Supabase.

## Features

- **AI-Powered Predictions**: Advanced machine learning models for crypto price predictions
- **Real-time Trading**: Virtual trading with live cryptocurrency prices
- **Portfolio Management**: Track your holdings and performance
- **Price Alerts**: Get notified when cryptocurrencies reach target prices
- **News Feed**: Stay updated with the latest crypto news
- **WebSocket Integration**: Real-time price updates via Binance WebSocket
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Edge Functions, Real-time subscriptions)
- **AI/ML**: TensorFlow.js for client-side predictions
- **Real-time Data**: Binance WebSocket API
- **UI Components**: Radix UI, Lucide Icons
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CryptoAI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:8080](http://localhost:8080) in your browser.

### Database Setup

Apply the database migrations to set up portfolio persistence:

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the SQL from `supabase/migrations/20251225000000_add_holdings_table.sql`
3. Run the SQL to create the required tables

## Project Structure

```
CryptoAI/
├── src/
│   ├── components/          # React components
│   ├── contexts/           # React contexts (Trading, Model)
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External service integrations
│   ├── lib/                # Utility libraries
│   ├── pages/              # Page components
│   └── utils/              # Utility functions
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
└── public/                 # Static assets
```

## Key Features

### AI Predictions
- LSTM neural networks for price forecasting
- Real-time model inference in the browser
- Buy/sell signal generation with confidence scores

### Trading System
- Virtual trading with $50,000 starting balance
- Real-time price data from multiple sources
- Portfolio tracking with performance metrics
- Trade history and analytics

### Real-time Updates
- WebSocket connection to Binance for live prices
- Instant notifications for price alerts
- Real-time portfolio value updates

### Data Persistence
- localStorage fallback for immediate persistence
- Supabase database for cross-device synchronization
- Automatic data backup and recovery

## Deployment

The application can be deployed to any static hosting service:

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting service
3. Set up Supabase Edge Functions for backend functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.