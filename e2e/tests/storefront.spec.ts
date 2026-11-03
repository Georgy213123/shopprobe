import { expect, test, type Page } from '@playwright/test';

/** Сквозной путь покупателя по витрине на десктопе и мобильном (US-01…US-04). */

async function facetCount(page: Page, group: string, label: string): Promise<string> {
  const row = page.getByTestId(`facet-${group}`).getByText(new RegExp(`^${label} \\(\\d+\\)$`));
  const text = (await row.textContent()) ?? '';
  return text.replace(/.*\((\d+)\)$/, '$1');
}

test.beforeEach(async ({ request }) => {
  const meta = await (await request.get('/api/meta')).json();
  expect(meta.seeded_bugs, 'витрина должна быть в чистом режиме').toBe(false);
});

test('US-01: главная ведёт в каталог по типу чая', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Чайная полка');
  await page.getByRole('link', { name: /Улун/ }).click();
  await expect(page).toHaveURL(/\/catalog\?category=oolong/);
  await expect(page.getByTestId('total')).toHaveText('Найдено: 4');
});

test('US-02: фасетный фильтр со счётчиками и состоянием в URL', async ({ page }) => {
  await page.goto('/catalog');
  await expect(page.getByTestId('total')).toHaveText('Найдено: 24');

  await page.getByLabel(/^Зелёный/).check();
  await expect(page.getByTestId('total')).toHaveText('Найдено: 5');
  await expect(page).toHaveURL(/category=green/);
  // Счётчики своей группы не сжимаются после выбора (BUG-03).
  expect(await facetCount(page, 'category', 'Чёрный')).toBe('6');
  expect(await facetCount(page, 'origin', 'Япония')).toBe('2');

  await page.getByLabel(/^Япония/).check();
  await expect(page.getByTestId('total')).toHaveText('Найдено: 2');
  await expect(page.getByTestId('product-tile')).toHaveCount(2);

  await page.reload();
  await expect(page.getByLabel(/^Япония/)).toBeChecked();
  await expect(page.getByTestId('total')).toHaveText('Найдено: 2');

  // «Назад» возвращает прежнюю выборку, а не застрявший локальный выбор.
  await page.goBack();
  await expect(page.getByLabel(/^Япония/)).not.toBeChecked();
  await expect(page.getByTestId('total')).toHaveText('Найдено: 5');
});

test('US-02: сортировка по цене', async ({ page }) => {
  await page.goto('/catalog?category=black');
  await page.getByLabel('Сортировка').selectOption('price_asc');
  await expect(page).toHaveURL(/sort=price_asc/);
  // Пока идёт запрос, на экране прежний список; ждём свежий.
  await expect(page.locator('.grid')).toHaveAttribute('aria-busy', 'false');
  const prices = await page.locator('.tile-price').allTextContents();
  const numbers = prices.map((p) => Number(p.replace(/[^\d]/g, '')));
  expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
});

test('US-03, US-04: каталог → фильтр → карточка → корзина', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByLabel(/^Япония/).check();
  await expect(page.getByTestId('total')).toHaveText('Найдено: 2');

  await page.getByRole('link', { name: 'Сенча утренняя' }).first().click();
  await expect(page).toHaveURL(/\/product\/sencha-utrennyaya$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Сенча утренняя');
  await expect(page.getByTestId('price')).toHaveText('760 ₽');

  const add = page.getByRole('button', { name: 'Добавить в корзину' });
  await add.click();
  await add.click();
  await expect(page.getByRole('status')).toHaveText('Добавлено в корзину');
  await expect(page.getByTestId('cart-link')).toContainText('2');

  await page.getByTestId('cart-link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Корзина');
  await expect(page.getByTestId('cart-total')).toHaveText('Итого: 1 520 ₽');

  await page.getByLabel('Количество: Сенча утренняя').fill('3');
  await expect(page.getByTestId('cart-total')).toHaveText('Итого: 2 280 ₽');

  // Корзина переживает перезагрузку: она в localStorage. Каждый тест — новый контекст.
  await page.reload();
  await expect(page.getByTestId('cart-total')).toHaveText('Итого: 2 280 ₽');

  await page.getByRole('button', { name: 'Удалить' }).click();
  await expect(page.getByText(/Корзина пуста/)).toBeVisible();
});

test('нет горизонтального скролла на чистой витрине', async ({ page }) => {
  for (const path of ['/', '/catalog', '/product/sencha-utrennyaya', '/cart']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
