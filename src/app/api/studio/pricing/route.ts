// src/app/api/studio/pricing/route.ts
// Studio-only endpoint to update pricing rules

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TABLES = ['product_types', 'finish_variants', 'size_variants', 'quantity_breaks', 'rush_options'];

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'studio') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { table, id, updates } = await req.json();

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    // Determine the ID column for each table
    const idColumn: Record<string, string> = {
      product_types: 'slug',
      finish_variants: 'slug',
      size_variants: 'label',
      quantity_breaks: 'min_quantity',
      rush_options: 'slug',
    };

    const { error } = await supabase
      .from(table)
      .update(updates)
      .eq(idColumn[table], id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/studio/pricing error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
