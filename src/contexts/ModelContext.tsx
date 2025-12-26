import { createContext, useContext, ReactNode } from 'react';
import { useAIModel } from '@/hooks/useAIModel';

interface ModelContextType {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  prediction: {
    predictedPrice: number;
    confidence: number;
    changePercent: number;
  } | null;
  predict: (currentPrice: number, historicalPrices?: number[]) => Promise<{
    predictedPrice: number;
    confidence: number;
    changePercent: number;
  } | null>;
  predictBatch: (prices: number[], steps?: number) => Promise<number[]>;
}

const ModelContext = createContext<ModelContextType | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const model = useAIModel();

  return (
    <ModelContext.Provider value={model}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
}
