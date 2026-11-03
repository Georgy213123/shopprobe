import { matches } from '../config';
import { makeFinding, normalizeMessage } from '../finding';
import type { Check, ConsoleEvent } from './context';

/**
 * «Failed to load resource» браузер пишет на каждый ответ ≥ 400. Эти случаи уже
 * ловит проверка http с точным URL и кодом; второй находки на ту же причину не нужно (BUG-05).
 */
const NETWORK_ECHO = /^Failed to load resource: /;

export function isIgnoredConsole(e: ConsoleEvent, ignore: Array<string | RegExp>): boolean {
  if (NETWORK_ECHO.test(e.text)) return true;
  return matches(e.text, ignore) || matches(e.location, ignore);
}

export const consoleCheck: Check = async (ctx) =>
  ctx.consoleEvents
    .filter((e) => !isIgnoredConsole(e, ctx.config.console.ignore))
    .map((e) => {
      const message = normalizeMessage(e.text);
      const uncaught = e.kind === 'pageerror';
      return makeFinding({
        check: 'console',
        route: ctx.route,
        url: ctx.url,
        viewport: ctx.viewport,
        severity: 'serious',
        title: uncaught ? 'Необработанное исключение JS' : 'Ошибка в консоли',
        details: e.location ? `${message} (${e.location})` : message,
        target: message,
        action: 'Открыть DevTools → Console, перезагрузить страницу.',
        expected: 'в консоли нет ошибок',
        actual: `${uncaught ? 'исключение' : 'console.error'}: «${message}»`,
      });
    });
