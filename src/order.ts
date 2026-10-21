export type Tier = 'basic' | 'silver' | 'gold';

export interface OrderItem {
  sku: string;
  price: number;
  qty: number;
}

export const TIER_DISCOUNT: Record<Tier, number> = {
  basic: 0,
  silver: 0.05,
  gold: 0.1,
};

export const BIG_ORDER_FROM = 2000;
export const BIG_ORDER_BONUS = 0.05;
export const MAX_DISCOUNT = 0.25;
export const FREE_SHIPPING_FROM = 1000;
export const SHIPPING_FEE = 60;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcSubtotal(items: OrderItem[]): number {
  if (items.length === 0) throw new Error('EMPTY_ORDER');
  return items.reduce((sum, item) => {
    if (item.price < 0) throw new Error('NEGATIVE_PRICE');
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new Error('INVALID_QTY');
    }
    return sum + item.price * item.qty;
  }, 0);
}

export function calcDiscountRate(
  tier: Tier,
  subtotal: number,
  promoRate = 0,
): number {
  if (promoRate < 0) throw new Error('INVALID_PROMO');
  let rate = TIER_DISCOUNT[tier];
  if (subtotal >= BIG_ORDER_FROM) rate += BIG_ORDER_BONUS;
  return Math.min(rate + promoRate, MAX_DISCOUNT);
}

export function calcShipping(amount: number): number {
  return amount >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
}

export function calcOrderTotal(
  items: OrderItem[],
  tier: Tier,
  promoRate = 0,
): number {
  const subtotal = calcSubtotal(items);
  const rate = calcDiscountRate(tier, subtotal, promoRate);
  const afterDiscount = round2(subtotal * (1 - rate));
  return round2(afterDiscount + calcShipping(afterDiscount));
}

// ---------- Індивідуальне завдання (варіант 7) ----------

export type Region = 'kyiv' | 'center' | 'west' | 'east';

export const BASE_DELIVERY_DAYS: Record<Region, number> = {
  kyiv: 1,
  center: 2,
  west: 3,
  east: 4,
};

export const EXPRESS_SAVING_DAYS = 1;
export const MIN_DELIVERY_DAYS = 1;

/**
 * Кількість днів доставки для регіону.
 * Прискорена доставка скорочує термін на 1 день, але не менше ніж до 1 дня.
 * Невідомий регіон — виняток INVALID_REGION.
 */
export function estimateDelivery(region: Region, isExpress: boolean): number {
  if (!Object.prototype.hasOwnProperty.call(BASE_DELIVERY_DAYS, region)) {
    throw new Error('INVALID_REGION');
  }
  const base = BASE_DELIVERY_DAYS[region];
  if (!isExpress) return base;
  return Math.max(base - EXPRESS_SAVING_DAYS, MIN_DELIVERY_DAYS);
}
