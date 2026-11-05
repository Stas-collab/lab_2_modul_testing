import { it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { login, makeOrderPayload } from './helpers';

it('DELETE: 204, повторний — 404, а не 500; ресурсу більше немає', async () => {
  const app = createApp();
  const token = await login(app, 'bob@example.com');
  const auth = { Authorization: `Bearer ${token}` };

  const created = await request(app).post('/orders').set(auth).send(makeOrderPayload());
  const url = `/orders/${created.body.id}`;

  const first = await request(app).delete(url).set(auth);
  expect(first.status).toBe(204);
  expect(first.text).toBe(''); // 204 без тіла

  const second = await request(app).delete(url).set(auth);
  expect(second.status).toBe(404);

  const fetched = await request(app).get(url).set(auth);
  expect(fetched.status).toBe(404);
});
