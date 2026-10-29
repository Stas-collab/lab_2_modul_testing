import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const RATE_URL = 'https://api.example.com/rate';
export const PROMO_BASE_URL = 'https://promo.example.com';
export const PROMO_URL = `${PROMO_BASE_URL}/promo/:code`;

export const handlers = [
  http.get(RATE_URL, () => HttpResponse.json({ rate: 41.25 })),
  http.get(PROMO_URL, () => HttpResponse.json({ valid: true, discountPercent: 10 })),
];

export const server = setupServer(...handlers);
