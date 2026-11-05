import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { login, makeOrderPayload } from './helpers';

describe('Доступ до замовлень', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => { app = createApp(); });

  it.each([
    { name: 'без токена',          header: undefined },
    { name: 'підроблений токен',   header: 'Bearer invalid-token' },
    { name: 'без префікса Bearer', header: 'some-token' },
  ])('GET /orders $name → 401', async ({ header }) => {
    const req = request(app).get('/orders');
    if (header) req.set('Authorization', header);
    const res = await req;
    expect(res.status).toBe(401);
  });

  it('чуже замовлення повертає 404, а не 403', async () => {
    const alice = await login(app, 'alice@example.com');
    const bob = await login(app, 'bob@example.com');

    const created = await request(app)
      .post('/orders').set('Authorization', `Bearer ${alice}`)
      .send(makeOrderPayload());

    const res = await request(app)
      .get(`/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${bob}`);

    expect(res.status).toBe(404);
  });

  it('список містить лише власні замовлення', async () => {
    const alice = await login(app, 'alice@example.com');
    const bob = await login(app, 'bob@example.com');

    await request(app).post('/orders')
      .set('Authorization', `Bearer ${alice}`).send(makeOrderPayload());
    await request(app).post('/orders')
      .set('Authorization', `Bearer ${bob}`).send(makeOrderPayload());

    const res = await request(app).get('/orders')
      .set('Authorization', `Bearer ${bob}`);
    expect(res.body).toHaveLength(1);
  });
});
