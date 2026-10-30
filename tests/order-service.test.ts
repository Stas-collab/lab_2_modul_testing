import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../src/retry';
import { OrderService } from '../src/order-service';
import { InMemoryOrderRepository } from './fakes/in-memory-repository';
import type { RateProvider, OrderRepository, Notifier } from '../src/order-service';

describe('OrderService — заглушки й шпигуни', () => {
  let rates: RateProvider;
  let repo: OrderRepository;
  let notifier: Notifier;
  let service: OrderService;

  beforeEach(() => {
    rates = { getRate: vi.fn().mockResolvedValue(41) }; // stub
    repo = {
      save: vi.fn().mockResolvedValue(undefined), // spy
      findById: vi.fn(),
    };
    notifier = { send: vi.fn().mockResolvedValue(undefined) }; // spy
    service = new OrderService(rates, repo, notifier);
  });

  it('конвертує суму за отриманим курсом', async () => {
    const record = await service.placeOrder({ id: 'A-1', amountUsd: 100, email: 'u@e.com' });
    expect(record.amountUah).toBeCloseTo(4100, 2);
  });

  it('надсилає сповіщення з сумою в гривнях', async () => {
    await service.placeOrder({ id: 'A-2', amountUsd: 10, email: 'client@e.com' });

    expect(notifier.send).toHaveBeenCalledTimes(1);
    expect(notifier.send).toHaveBeenCalledWith(
      'client@e.com',
      expect.stringContaining('410'),
    );
  });

  it('не звертається до залежностей за некоректної суми', async () => {
    await expect(
      service.placeOrder({ id: 'A-3', amountUsd: 0, email: 'u@e.com' }),
    ).rejects.toThrow('INVALID_AMOUNT');

    expect(rates.getRate).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('збережене замовлення можна прочитати зі сховища', async () => {
    const repo = new InMemoryOrderRepository();
    const service = new OrderService(rates, repo, notifier);

    await service.placeOrder({ id: 'A-4', amountUsd: 50, email: 'u@e.com' });

    const saved = await repo.findById('A-4');
    expect(saved?.amountUah).toBeCloseTo(2050, 2);
    expect(repo.size).toBe(1);
  });

  it('не зберігає замовлення й не надсилає листа, якщо курс недоступний', async () => {
    const repo = new InMemoryOrderRepository();
    rates.getRate = vi.fn().mockRejectedValue(new Error('RATE_UNAVAILABLE'));
    const service = new OrderService(rates, repo, notifier);

    await expect(
      service.placeOrder({ id: 'A-5', amountUsd: 100, email: 'u@e.com' }),
    ).rejects.toThrow('RATE_UNAVAILABLE');

    expect(repo.size).toBe(0);
    expect(notifier.send).not.toHaveBeenCalled();
  });

  describe('експеримент: стан проти взаємодії', () => {
    it('[взаємодія] викликає repo.save рівно один раз', async () => {
      await service.placeOrder({ id: 'E-1', amountUsd: 10, email: 'u@e.com' });

      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('[стан] у сховищі лежить підтверджене замовлення в єдиному екземплярі', async () => {
      const fake = new InMemoryOrderRepository();
      const svc = new OrderService(rates, fake, notifier);

      await svc.placeOrder({ id: 'E-2', amountUsd: 10, email: 'u@e.com' });

      expect(fake.size).toBe(1);
      expect((await fake.findById('E-2'))?.amountUah).toBeCloseTo(410, 2);
    });
  });

  describe('фіксація часу', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-15T10:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('записує момент створення замовлення', async () => {
      const record = await service.placeOrder({ id: 'A-6', amountUsd: 20, email: 'u@e.com' });
      expect(record.createdAt).toBe('2026-03-15T10:00:00.000Z');
    });
  });
});

describe('withRetry — підміна таймерів', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('повторює спробу після невдачі', async () => {
    vi.useFakeTimers();
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error('TIMEOUT'))
      .mockResolvedValueOnce('ok');

    const promise = withRetry(action, 3, 1000);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe('ok');
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('після вичерпання спроб повертає останню помилку', async () => {
    vi.useFakeTimers();
    const action = vi.fn().mockRejectedValue(new Error('TIMEOUT'));

    const promise = withRetry(action, 3, 1000);
    // твердження створюється ДО просування часу, щоб не було необробленого відхилення
    const assertion = expect(promise).rejects.toThrow('TIMEOUT');
    await vi.advanceTimersByTimeAsync(2000);

    await assertion;
    expect(action).toHaveBeenCalledTimes(3);
  });
});
