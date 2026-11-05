import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { login, makeOrderPayload } from './helpers';
import { expectSchema } from './schema';
import { orderSchema } from './schemas/order.schema';

describe('POST /orders', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeEach(async () => {
    app = createApp();
    token = await login(app, 'bob@example.com'); // basic
  });

  it('створює замовлення: 201, Location, розрахована сума', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(makeOrderPayload());

    expect(res.status).toBe(201);                                // рівень 1
    expect(res.body.total).toBeCloseTo(560, 2);                  // рівень 3
    expect(res.headers.location).toBe(`/orders/${res.body.id}`); // рівень 4
  });

  it('створене замовлення доступне за GET', async () => {
    const created = await request(app)
      .post('/orders').set('Authorization', `Bearer ${token}`)
      .send(makeOrderPayload());

    const fetched = await request(app)
      .get(`/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(fetched.status).toBe(200);                            // рівень 5
    expect(fetched.body).toEqual(created.body);
  });

  it('відповідь POST /orders відповідає контракту', async () => {
    const res = await request(app)
      .post('/orders').set('Authorization', `Bearer ${token}`)
      .send(makeOrderPayload());

    expectSchema(res.body, orderSchema);                         // рівень 2
  });

  it.each([
    { name: 'порожній список', code: 'EMPTY_ORDER', items: [] },
    { name: 'від’ємна ціна', code: 'INVALID_PRICE', items: [{ sku: 'A', price: -1, qty: 1 }] },
    { name: 'нульова кількість', code: 'INVALID_QTY', items: [{ sku: 'A', price: 10, qty: 0 }] },
    { name: 'дробова кількість', code: 'INVALID_QTY', items: [{ sku: 'A', price: 10, qty: 1.5 }] },
  ])('відхиляє: $name → $code', async ({ items, code }) => {
    const res = await request(app)
      .post('/orders').set('Authorization', `Bearer ${token}`)
      .send({ items });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
  });
});
