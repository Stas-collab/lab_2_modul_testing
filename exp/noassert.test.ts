import { it } from 'vitest';
import { calcOrderTotal } from '../src/order';

it('виклик без перевірки результату', () => {
  calcOrderTotal([{ sku: 'A', price: 100, qty: 1 }], 'silver');
});
