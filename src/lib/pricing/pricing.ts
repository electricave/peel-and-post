// src/lib/pricing.ts
// Pure pricing engine — no side effects, fully testable

export interface PricingInput {
  productSlug: string;
  finishSlug: string;
  sizeLabel: string;
  quantity: number;
  rushSlug: string;
}

export interface PricingBreakdown {
  basePricePerUnit: number;
  finishMultiplier: number;
  sizeMultiplier: number;
  adjustedPricePerUnit: number;
  subtotal: number;
  quantityDiscountPercent: number;
  quantityDiscountAmount: number;
  rushSurchargePercent: number;
  rushSurchargeAmount: number;
  finalTotal: number;
  finalPricePerUnit: number;
}

export interface PricingResult {
  success: boolean;
  breakdown?: PricingBreakdown;
  error?: string;
}

export interface ProductType {
  slug: string;
  name: string;
  base_price_per_unit: number;
  min_quantity: number;
}

export interface FinishVariant {
  slug: string;
  name: string;
  price_multiplier: number;
}

export interface SizeVariant {
  label: string;
  price_multiplier: number;
}

export interface QuantityBreak {
  min_quantity: number;
  max_quantity: number | null;
  discount_percent: number;
}

export interface RushOption {
  slug: string;
  name: string;
  surcharge_percent: number;
  turnaround_days_min: number | null;
  turnaround_days_max: number | null;
}

export interface PricingData {
  productTypes: ProductType[];
  finishVariants: FinishVariant[];
  sizeVariants: SizeVariant[];
  quantityBreaks: QuantityBreak[];
  rushOptions: RushOption[];
}

export function calculatePrice(input: PricingInput, data: PricingData): PricingResult {
  const { productSlug, finishSlug, sizeLabel, quantity, rushSlug } = input;

  // Look up product
  const product = data.productTypes.find(p => p.slug === productSlug);
  if (!product) return { success: false, error: `Unknown product: ${productSlug}` };

  // Validate quantity
  if (quantity < product.min_quantity) {
    return { success: false, error: `Minimum quantity for ${product.name} is ${product.min_quantity}` };
  }

  // Look up finish
  const finish = data.finishVariants.find(f => f.slug === finishSlug);
  if (!finish) return { success: false, error: `Unknown finish: ${finishSlug}` };

  // Look up size
  const size = data.sizeVariants.find(s => s.label === sizeLabel);
  if (!size) return { success: false, error: `Unknown size: ${sizeLabel}` };

  // Look up rush
  const rush = data.rushOptions.find(r => r.slug === rushSlug);
  if (!rush) return { success: false, error: `Unknown rush option: ${rushSlug}` };

  // Look up quantity break
  const quantityBreak = data.quantityBreaks
    .filter(qb => quantity >= qb.min_quantity && (qb.max_quantity === null || quantity <= qb.max_quantity))
    .sort((a, b) => b.min_quantity - a.min_quantity)[0];

  const discountPercent = quantityBreak?.discount_percent ?? 0;

  // Calculate
  const basePricePerUnit = Number(product.base_price_per_unit);
  const finishMultiplier = Number(finish.price_multiplier);
  const sizeMultiplier = Number(size.price_multiplier);

  const adjustedPricePerUnit = basePricePerUnit * finishMultiplier * sizeMultiplier;
  const subtotal = adjustedPricePerUnit * quantity;

  const quantityDiscountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - quantityDiscountAmount;

  const rushSurchargePercent = Number(rush.surcharge_percent);
  const rushSurchargeAmount = afterDiscount * (rushSurchargePercent / 100);

  const finalTotal = afterDiscount + rushSurchargeAmount;
  const finalPricePerUnit = finalTotal / quantity;

  return {
    success: true,
    breakdown: {
      basePricePerUnit,
      finishMultiplier,
      sizeMultiplier,
      adjustedPricePerUnit,
      subtotal,
      quantityDiscountPercent: discountPercent,
      quantityDiscountAmount,
      rushSurchargePercent,
      rushSurchargeAmount,
      finalTotal,
      finalPricePerUnit,
    },
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
