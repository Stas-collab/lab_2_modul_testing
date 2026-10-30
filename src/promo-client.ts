import type { PromoClient, PromoCheck } from './promo-service';

export class HttpPromoClient implements PromoClient {
  constructor(private baseUrl: string) {}

  async check(code: string): Promise<PromoCheck> {
    const response = await fetch(`${this.baseUrl}/promo/${encodeURIComponent(code)}`);

    if (response.status === 404) return { valid: false };
    if (!response.ok) throw new Error('PROMO_SERVICE_UNAVAILABLE');

    const data = await response.json();
    if (typeof data?.valid !== 'boolean') throw new Error('INVALID_PROMO_FORMAT');
    if (!data.valid) return { valid: false };

    const percent = data.discountPercent;
    if (typeof percent !== 'number' || percent <= 0 || percent > 100) {
      throw new Error('INVALID_PROMO_FORMAT');
    }
    return { valid: true, discountPercent: percent };
  }
}
