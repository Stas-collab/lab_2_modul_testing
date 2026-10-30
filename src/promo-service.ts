export interface PromoCheck {
  valid: boolean;
  discountPercent?: number;
}

/** HTTP-залежність: питає зовнішній API про промокод. */
export interface PromoClient {
  check(code: string): Promise<PromoCheck>;
}

/** Сховище кешу негативних результатів (код, який API визнав недійсним). */
export interface NegativeCache {
  has(code: string): Promise<boolean>;
  add(code: string): Promise<void>;
}

/** Метрики: побічний ефект без спостережуваного стану. */
export interface Metrics {
  increment(name: string): void;
}

export interface PromoValidation {
  code: string;
  valid: boolean;
  discountPercent?: number;
}

export class PromoService {
  constructor(
    private client: PromoClient,
    private negativeCache: NegativeCache,
    private metrics: Metrics,
  ) {}

  async validate(rawCode: string): Promise<PromoValidation> {
    const code = rawCode.trim().toUpperCase();
    if (code === '') throw new Error('INVALID_CODE');

    if (await this.isKnownInvalid(code)) {
      this.metrics.increment('promo.cache_hit');
      return { code, valid: false };
    }

    const result = await this.client.check(code);
    if (!result.valid) {
      await this.rememberInvalid(code);
      return { code, valid: false };
    }
    return { code, valid: true, discountPercent: result.discountPercent };
  }

  private async isKnownInvalid(code: string): Promise<boolean> {
    try {
      return await this.negativeCache.has(code);
    } catch {
      this.metrics.increment('promo.cache_error');
      return false;
    }
  }

  private async rememberInvalid(code: string): Promise<void> {
    try {
      await this.negativeCache.add(code);
    } catch {
      this.metrics.increment('promo.cache_error');
    }
  }
}
