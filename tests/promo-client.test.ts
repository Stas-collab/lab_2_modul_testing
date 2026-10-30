import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, PROMO_URL, PROMO_BASE_URL } from './msw/server';
import { HttpPromoClient } from '../src/promo-client';

const client = new HttpPromoClient(PROMO_BASE_URL);

describe('HttpPromoClient (MSW)', () => {
  describe('успішні відповіді', () => {
    it('повертає знижку для чинного промокоду', async () => {
      await expect(client.check('SAVE10')).resolves.toEqual({ valid: true, discountPercent: 10 });
    });

    it('повертає valid: false, якщо API визнав код недійсним', async () => {
      server.use(http.get(PROMO_URL, () => HttpResponse.json({ valid: false })));

      await expect(client.check('OLD')).resolves.toEqual({ valid: false });
    });

    it('трактує статус 404 як невідомий (недійсний) код', async () => {
      server.use(http.get(PROMO_URL, () => new HttpResponse(null, { status: 404 })));

      await expect(client.check('NOPE')).resolves.toEqual({ valid: false });
    });
  });

  describe('помилкові статуси', () => {
    it.each([500, 503])('відхиляє відповідь зі статусом %s', async (status) => {
      server.use(http.get(PROMO_URL, () => new HttpResponse(null, { status })));

      await expect(client.check('SAVE10')).rejects.toThrow('PROMO_SERVICE_UNAVAILABLE');
    });

    it('відхиляє мережеву помилку', async () => {
      server.use(http.get(PROMO_URL, () => HttpResponse.error()));

      await expect(client.check('SAVE10')).rejects.toThrow();
    });
  });

  describe('некоректний формат відповіді', () => {
    it.each([
      ['valid як рядок', { valid: 'true', discountPercent: 10 }],
      ['відсутнє поле valid', { discountPercent: 10 }],
      ['discountPercent як рядок', { valid: true, discountPercent: '10' }],
      ['відсутній discountPercent для чинного коду', { valid: true }],
      ['discountPercent понад 100', { valid: true, discountPercent: 150 }],
      ['discountPercent не додатний', { valid: true, discountPercent: 0 }],
    ])('відхиляє: %s', async (_name, body) => {
      server.use(http.get(PROMO_URL, () => HttpResponse.json(body)));

      await expect(client.check('SAVE10')).rejects.toThrow('INVALID_PROMO_FORMAT');
    });

    it('відхиляє тіло, яке не є об’єктом (null)', async () => {
      server.use(http.get(PROMO_URL, () => HttpResponse.json(null)));

      await expect(client.check('SAVE10')).rejects.toThrow('INVALID_PROMO_FORMAT');
    });
  });

  describe('формування запиту', () => {
    it('кодує спецсимволи промокоду в шляху', async () => {
      let captured: URL | undefined;
      server.use(
        http.get(PROMO_URL, ({ request }) => {
          captured = new URL(request.url);
          return HttpResponse.json({ valid: false });
        }),
      );

      await client.check('A/B C');

      expect(captured?.pathname).toBe('/promo/A%2FB%20C');
    });
  });
});
