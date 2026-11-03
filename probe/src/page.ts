import type { Page } from 'playwright';

/**
 * Ждёт, пока раскладка перестанет меняться: событие load (стили, картинки в потоке),
 * затишье в сети, загрузка шрифтов и два кадра отрисовки.
 * Замер до этого момента ловит промежуточную раскладку (BUG-02).
 */
export async function waitForStable(page: Page, settleMs: number): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  if (settleMs > 0) await page.waitForTimeout(settleMs);
}

/*
 * Функции, которые уходят в page.evaluate, не объявляют внутри именованных функций
 * и `const f = () => …`: tsx (esbuild keepNames) оборачивает их в __name(),
 * а в странице такого помощника нет (BUG-05).
 */

/** Прокрутка до конца шагами в высоту окна: так срабатывает lazy-load (BUG-01). */
export async function scrollThrough(page: Page, maxSteps = 40): Promise<void> {
  await page.evaluate(async (steps) => {
    for (let i = 0; i < steps; i++) {
      const before = window.scrollY;
      window.scrollBy(0, window.innerHeight);
      await new Promise((r) => setTimeout(r, 60));
      if (window.scrollY === before) break;
    }
    window.scrollTo(0, 0);
  }, maxSteps);
}

/**
 * Подготовка перед проверками: прокрутка до конца (lazy-load и подгрузка при прокрутке),
 * ожидание картинок и сети, возврат наверх. После неё все проверки, включая раскладку,
 * h1 и axe, видят страницу с подгруженным содержимым (ревью Codex, R3 и R8).
 */
export async function preparePage(page: Page, imagesTimeoutMs: number): Promise<void> {
  await scrollThrough(page);
  await page
    .waitForFunction(() => Array.from(document.images).every((img) => img.complete), null, {
      timeout: imagesTimeoutMs,
    })
    .catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
