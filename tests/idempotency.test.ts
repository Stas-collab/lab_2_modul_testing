import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { login, makeOrderPayload } from './helpers';
import { expectSchema } from './schema';
import { orderSchema, errorSchema } from './schemas/order.schema';

// Варіант 9: POST /orders з заголовком Idempotency-Key
describe('POST /orders + Idempotency-Key', () => {
  let app: ReturnType<typeof createApp>;
  let token: string;
  let auth: { Authorization: string };

  beforeEach(async () => {
    app = createApp(); // власний застосунок і власні дані для кожного тесту
    token = await login(app, 'bob@example.com');
    auth = { Authorization: `Bearer ${token}` };
  });

  const post = (key: string | undefined, body: object = makeOrderPayload(), headers = auth) => {
    const r = request(app).post('/orders').set(headers);
    if (key !== undefined) r.set('Idempotency-Key', key);
    return r.send(body);
  };

  it('перший запит з ключем створює замовлення: 201, Location, сума, схема', async () => {
    const res = await post('key-1');

    expect(res.status).toBe(201);                                 // рівень 1
    expectSchema(res.body, orderSchema);                          // рівень 2
    expect(res.body.total).toBeCloseTo(560, 2);                   // рівень 3
    expect(res.headers.location).toBe(`/orders/${res.body.id}`);  // рівень 4
    expect(res.headers['idempotent-replayed']).toBeUndefined();   // це не повтор
  });

  it('повторний запит із тим самим ключем повертає те саме замовлення', async () => {
    const first = await post('key-1');
    const second = await post('key-1');

    expect(second.status).toBe(201);                              // рівень 1
    expectSchema(second.body, orderSchema);                       // рівень 2
    expect(second.body).toEqual(first.body);                      // рівень 3: той самий id і createdAt
    expect(second.headers.location).toBe(first.headers.location); // рівень 4
    expect(second.headers['idempotent-replayed']).toBe('true');   // рівень 4
  });

  it('повтор не створює нового замовлення (побічний ефект)', async () => {
    await post('key-1');
    await post('key-1');
    await post('key-1');

    const list = await request(app).get('/orders').set(auth);    // рівень 5
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('паралельні запити з однаковим ключем дають одне замовлення', async () => {
    const [a, b] = await Promise.all([post('key-par'), post('key-par')]);

    expect(a.body.id).toBe(b.body.id);
    const list = await request(app).get('/orders').set(auth);
    expect(list.body).toHaveLength(1);
  });

  it('різні ключі — різні замовлення', async () => {
    const a = await post('key-a');
    const b = await post('key-b');

    expect(a.body.id).not.toBe(b.body.id);
    const list = await request(app).get('/orders').set(auth);
    expect(list.body).toHaveLength(2);
  });

  it('без заголовка кожен запит створює нове замовлення', async () => {
    const a = await post(undefined);
    const b = await post(undefined);

    expect(a.body.id).not.toBe(b.body.id);
    const list = await request(app).get('/orders').set(auth);
    expect(list.body).toHaveLength(2);
  });

  it('той самий ключ з іншим тілом → 422, нове замовлення не створюється', async () => {
    await post('key-1');
    const res = await post('key-1', makeOrderPayload({ items: [{ sku: 'SKU-B', price: 10, qty: 1 }] }));

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expectSchema(res.body, errorSchema);
    const list = await request(app).get('/orders').set(auth);
    expect(list.body).toHaveLength(1);
  });

  it.each([
    { name: 'містить пробіли', key: 'key with spaces' },
    { name: 'містить «/»', key: 'bad/key' },
    { name: 'довжина 65 символів', key: 'k'.repeat(65) },
  ])('некоректний ключ ($name) → 400 INVALID_IDEMPOTENCY_KEY', async ({ key }) => {
    const res = await post(key);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_IDEMPOTENCY_KEY');
    expectSchema(res.body, errorSchema);
    const list = await request(app).get('/orders').set(auth);
    expect(list.body).toHaveLength(0);
  });

  it.each([
    { name: 'довжина 1 символ', key: 'k' },
    { name: 'довжина 64 символи', key: 'k'.repeat(64) },
    { name: 'дефіс і підкреслення', key: 'a-b_c-1' },
  ])('коректний ключ ($name) приймається', async ({ key }) => {
    const res = await post(key);
    expect(res.status).toBe(201);
  });

  it('невдала валідація не «витрачає» ключ: після виправлення тіла ключ працює', async () => {
    const bad = await post('key-1', { items: [] });
    expect(bad.status).toBe(400);

    const good = await post('key-1');
    expect(good.status).toBe(201);
    expect(good.headers['idempotent-replayed']).toBeUndefined();
  });

  it('після видалення замовлення той самий ключ створює нове замовлення', async () => {
    const first = await post('key-1');
    await request(app).delete(`/orders/${first.body.id}`).set(auth);

    const again = await post('key-1');
    expect(again.status).toBe(201);
    expect(again.body.id).not.toBe(first.body.id);
    expect(again.headers['idempotent-replayed']).toBeUndefined();
  });

  describe('доступ', () => {
    it.each([
      { name: 'без токена', header: undefined },
      { name: 'підроблений токен', header: 'Bearer invalid-token' },
    ])('POST /orders з ключем $name → 401', async ({ header }) => {
      const r = request(app).post('/orders').set('Idempotency-Key', 'key-1');
      if (header) r.set('Authorization', header);
      const res = await r.send(makeOrderPayload());

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('ключ ізольований між користувачами: чуже замовлення не повертається', async () => {
      const alice = await login(app, 'alice@example.com');
      const aliceAuth = { Authorization: `Bearer ${alice}` };

      const a = await post('shared-key', makeOrderPayload(), aliceAuth);
      const b = await post('shared-key', makeOrderPayload(), auth);

      expect(b.status).toBe(201);
      expect(b.body.id).not.toBe(a.body.id);
      expect(b.headers['idempotent-replayed']).toBeUndefined();
      expect(b.body.tier).toBe('basic');

      // Bob не бачить замовлення Alice, Alice — замовлення Bob
      const bobGetsAlice = await request(app).get(`/orders/${a.body.id}`).set(auth);
      expect(bobGetsAlice.status).toBe(404);
      const aliceList = await request(app).get('/orders').set(aliceAuth);
      expect(aliceList.body).toHaveLength(1);
    });
  });
});
