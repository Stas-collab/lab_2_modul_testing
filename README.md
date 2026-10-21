# Лабораторна робота № 2. Модульне тестування бізнес-логіки засобами Vitest

Дисципліна «Автоматизація тестування». Варіант 7: `estimateDelivery(region, isExpress)`.

## Опис

Проєкт містить модуль розрахунку вартості замовлення (`src/order.ts`) та модульні тести до нього.
Використано матчери, параметризовані тести (`it.each`), межові значення та вимірювання покриття коду.

## Вимоги

- Node.js 18 або новіший
- npm

## Встановлення

```bash
npm install
```

## Запуск

```bash
npm test            # прогін усіх тестів
npm run coverage    # прогін із покриттям (HTML-звіт: coverage/index.html)
```

Пороги покриття (statements, branches, functions, lines) — по 90 %, задані у `vitest.config.ts`.
Якщо поріг не досягнуто, прогін завершується з ненульовим кодом.

## Структура

```
src/order.ts              модуль: calcSubtotal, calcDiscountRate, calcShipping,
                          calcOrderTotal та estimateDelivery (варіант 7)
tests/order.test.ts       тести базових функцій
tests/delivery.test.ts    тести функції estimateDelivery
exp/                      матеріали експерименту з тестом без твердження
vitest.config.ts          конфігурація тестів і порогів покриття
vitest.exp.config.ts      конфігурація експерименту (без порогів)
```

## Експеримент із покриттям

```bash
npx vitest run --config vitest.exp.config.ts --coverage exp/base.test.ts   # базовий набір
npx vitest run --config vitest.exp.config.ts --coverage                    # + тест без твердження
```

Результат: покриття функцій зростає з 42.85 % до 85.71 % без жодного твердження.

## Варіант 7: estimateDelivery

| Регіон | Стандартна доставка | Прискорена |
|--------|---------------------|------------|
| kyiv   | 1 день              | 1 день     |
| center | 2 дні               | 1 день     |
| west   | 3 дні               | 2 дні      |
| east   | 4 дні               | 3 дні      |

Прискорена доставка скорочує термін на 1 день, але не менше ніж до 1 дня.
Невідомий регіон — виняток `INVALID_REGION`.

## Результати

- 47 тестів, усі успішні
- Покриття: 100 % statements / branches / functions / lines
