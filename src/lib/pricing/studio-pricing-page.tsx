// src/app/studio/pricing/page.tsx

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PricingClient from './PricingClient';

export default async function PricingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'studio') redirect('/dashboard');

  const [products, finishes, sizes, breaks, rush] = await Promise.all([
    supabase.from('product_types').select('*').order('name'),
    supabase.from('finish_variants').select('*').order('name'),
    supabase.from('size_variants').select('*'),
    supabase.from('quantity_breaks').select('*').order('min_quantity'),
    supabase.from('rush_options').select('*').order('surcharge_percent'),
  ]);

  return (
    <PricingClient
      initialProducts={products.data ?? []}
      initialFinishes={finishes.data ?? []}
      initialSizes={sizes.data ?? []}
      initialBreaks={breaks.data ?? []}
      initialRush={rush.data ?? []}
    />
  );
}
