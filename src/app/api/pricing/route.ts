// src/app/api/pricing/route.ts

import { createClient } from '@/lib/supabase/server';
import { calculatePrice, PricingData } from '@/lib/pricing';
import { NextRequest, NextResponse } from 'next/server';

async function loadPricingData(supabase: ReturnType<typeof createClient>): Promise<PricingData> {
  const client = await supabase;
  const [products, finishes, sizes, breaks, rush] = await Promise.all([
    client.from('product_types').select('*').eq('active', true).order('name'),
    client.from('finish_variants').select('*').eq('active', true).order('name'),
    client.from('size_variants').select('*').eq('active', true),
    client.from('quantity_breaks').select('*').order('min_quantity'),
    client.from('rush_options').select('*').eq('active', true).order('surcharge_percent'),
  ]);

  return {
    productTypes: products.data ?? [],
    finishVariants: finishes.data ?? [],
    sizeVariants: sizes.data ?? [],
    quantityBreaks: breaks.data ?? [],
    rushOptions: rush.data ?? [],
  };
}

// GET /api/pricing — return all pricing config (for populating order form dropdowns)
export async function GET() {
  try {
    const supabase = createClient();
    const data = await loadPricingData(supabase);
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/pricing error:', err);
    return NextResponse.json({ error: 'Failed to load pricing data' }, { status: 500 });
  }
}

// POST /api/pricing — calculate a price quote
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productSlug, finishSlug, sizeLabel, quantity, rushSlug } = body;

    if (!productSlug || !finishSlug || !sizeLabel || !quantity || !rushSlug) {
      return NextResponse.json(
        { error: 'Missing required fields: productSlug, finishSlug, sizeLabel, quantity, rushSlug' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const data = await loadPricingData(supabase);
    const result = calculatePrice({ productSlug, finishSlug, sizeLabel, quantity: Number(quantity), rushSlug }, data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ breakdown: result.breakdown });
  } catch (err) {
    console.error('POST /api/pricing error:', err);
    return NextResponse.json({ error: 'Failed to calculate price' }, { status: 500 });
  }
}
