// src/hooks/usePricing.ts
// Hook to load pricing data and calculate live price quotes

import { useState, useEffect, useCallback } from 'react';
import { PricingData, formatCurrency } from '@/lib/pricing';

interface PriceQuote {
  finalTotal: number;
  finalPricePerUnit: number;
  quantityDiscountPercent: number;
  rushSurchargePercent: number;
  subtotal: number;
  quantityDiscountAmount: number;
  rushSurchargeAmount: number;
}

export function usePricingData() {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/pricing')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError('Failed to load pricing'))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function usePriceQuote() {
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const calculate = useCallback(async (params: {
    productSlug: string;
    finishSlug: string;
    sizeLabel: string;
    quantity: number;
    rushSlug: string;
  }) => {
    if (!params.productSlug || !params.finishSlug || !params.sizeLabel || !params.quantity || !params.rushSlug) return;

    setCalculating(true);
    setQuoteError(null);
    try {
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.breakdown) {
        setQuote(data.breakdown);
      } else {
        setQuoteError(data.error ?? 'Could not calculate price');
        setQuote(null);
      }
    } catch {
      setQuoteError('Could not calculate price');
      setQuote(null);
    } finally {
      setCalculating(false);
    }
  }, []);

  return { quote, calculating, quoteError, calculate };
}

export { formatCurrency };
