import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { PromoService } from '../src/promo-service';
import type { PromoClient, Metrics, NegativeCache } from '../src/promo-service';
import { HttpPromoClient } from '../src/promo-client';
import { InMemoryNegativeCache } from './fakes/in-memory-negative-cache';
import { server, PROMO_URL, PROMO_BASE_URL } from './msw/server';

describe('PromoService', () => {
  let client: PromoClient; // stub + spy
  let cache: InMemoryNegativeCache; // підробка (fake)
  let metrics: Metrics; // шпигун (spy)
  let service: PromoService;

  beforeEach(() => {
    client = { check: vi.fn().mockResolvedValue({ valid: false }) };
    cache = new InMemoryNegativeCache();
    metrics = { increment: vi.fn() };
    service = new PromoService(client, cache, metrics);
  });

  describe('дійсний промокод', () => {
    beforeEach(() => {
      client = { check: vi.fn().mockResolvedValue({ valid: true, discountPercent: 15 }) };
      service = new PromoService(client, cache, metrics);
    });

    it('повертає знижку', async () => {
      await expect(service.validate('SAVE15')).resolves.toEqual({
        code: 'SAVE15',
        valid: true,
        discountPercent: 15,
      });
    });

    it('не потрапляє в кеш негативних результатів', async () => {
      await service.validate('SAVE15');

      expect(cache.size).toBe(0);
    });

    it('перевіряється в API щоразу (позитивний результат не кешується)', async () => {
      await service.validate('SAVE15');
      await service.validate('SAVE15');

      expect(client.check).toHaveBeenCalledTimes(2);
    });
  });

  describe('кешування негативного результату', () => {
    it('після недійсної відповіді запам’ятовує код у кеші (перевірка стану)', async () => {
      const result = await service.validate('BAD');

      expect(result).toEqual({ code: 'BAD', valid: false });
      expect(cache.contains('BAD')).toBe(true);
      expect(cache.size).toBe(1);
    });

    it('повторна перевірка того самого коду не спричиняє запиту до API', async () => {
      await service.validate('BAD');
      await service.validate('BAD');
      const third = await service.validate('BAD');

      expect(third).toEqual({ code: 'BAD', valid: false });
      expect(client.check).toHaveBeenCalledTimes(1);
    });

    it('нормалізує код: регістр і пробіли не обходять кеш', async () => {
      await service.validate('bad');
      await service.validate('  Bad ');

      expect(client.check).toHaveBeenCalledTimes(1);
      expect(cache.size).toBe(1);
    });

    it('різні недійсні коди перевіряються окремо', async () => {
      await service.validate('BAD1');
      await service.validate('BAD2');

      expect(client.check).toHaveBeenCalledTimes(2);
      expect(cache.size).toBe(2);
    });

    it('фіксує влучання в кеш у метриках (взаємодія без стану)', async () => {
      await service.validate('BAD');
      expect(metrics.increment).not.toHaveBeenCalled();

      await service.validate('BAD');

      expect(metrics.increment).toHaveBeenCalledTimes(1);
      expect(metrics.increment).toHaveBeenCalledWith('promo.cache_hit');
    });
  });

  describe('некоректний ввід', () => {
    it.each(['', '   '])('порожній код %j: INVALID_CODE без звернень до залежностей', async (code) => {
      const has = vi.spyOn(cache, 'has');

      await expect(service.validate(code)).rejects.toThrow('INVALID_CODE');

      expect(client.check).not.toHaveBeenCalled();
      expect(has).not.toHaveBeenCalled();
    });
  });

  describe('відмови залежностей', () => {
    it('помилка API поширюється й не потрапляє в кеш (наступна спроба знову йде в API)', async () => {
      client.check = vi
        .fn()
        .mockRejectedValueOnce(new Error('PROMO_SERVICE_UNAVAILABLE'))
        .mockResolvedValueOnce({ valid: true, discountPercent: 5 });

      await expect(service.validate('SAVE5')).rejects.toThrow('PROMO_SERVICE_UNAVAILABLE');
      expect(cache.size).toBe(0);

      await expect(service.validate('SAVE5')).resolves.toMatchObject({ valid: true });
      expect(client.check).toHaveBeenCalledTimes(2);
    });

    it('збій читання кешу не ламає перевірку: сервіс звертається до API', async () => {
      const brokenCache: NegativeCache = {
        has: vi.fn().mockRejectedValue(new Error('CACHE_DOWN')),
        add: vi.fn().mockResolvedValue(undefined),
      };
      const svc = new PromoService(client, brokenCache, metrics);

      await expect(svc.validate('BAD')).resolves.toEqual({ code: 'BAD', valid: false });

      expect(client.check).toHaveBeenCalledTimes(1);
      expect(metrics.increment).toHaveBeenCalledWith('promo.cache_error');
    });

    it('збій запису в кеш не ламає результат', async () => {
      const brokenCache: NegativeCache = {
        has: vi.fn().mockResolvedValue(false),
        add: vi.fn().mockRejectedValue(new Error('CACHE_DOWN')),
      };
      const svc = new PromoService(client, brokenCache, metrics);

      await expect(svc.validate('BAD')).resolves.toEqual({ code: 'BAD', valid: false });

      expect(metrics.increment).toHaveBeenCalledWith('promo.cache_error');
    });
  });

  describe('інтеграція з HttpPromoClient через MSW', () => {
    it('другий запит для недійсного коду не доходить до мережі', async () => {
      let requests = 0;
      server.use(
        http.get(PROMO_URL, () => {
          requests += 1;
          return HttpResponse.json({ valid: false });
        }),
      );
      const svc = new PromoService(new HttpPromoClient(PROMO_BASE_URL), cache, metrics);

      await svc.validate('BAD');
      await svc.validate('bad');

      expect(requests).toBe(1);
    });

    it('за недоступного API (503) помилка доходить до викликача, кеш порожній', async () => {
      server.use(http.get(PROMO_URL, () => new HttpResponse(null, { status: 503 })));
      const svc = new PromoService(new HttpPromoClient(PROMO_BASE_URL), cache, metrics);

      await expect(svc.validate('SAVE10')).rejects.toThrow('PROMO_SERVICE_UNAVAILABLE');
      expect(cache.size).toBe(0);
    });
  });
});
