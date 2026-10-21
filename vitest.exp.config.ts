import { defineConfig } from 'vitest/config';

// Конфігурація для експерименту з покриттям: без порогів, щоб бачити «сирі» числа.
export default defineConfig({
  test: {
    include: ['exp/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/order.ts'], reporter: ['text'] },
  },
});
