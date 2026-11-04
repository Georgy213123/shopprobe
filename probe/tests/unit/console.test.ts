import { describe, expect, it } from 'vitest';
import { isIgnoredConsole } from '../../src/checks/console';
import { DEFAULT_CONSOLE_IGNORE } from '../../src/config';

const ev = (text: string, location = '') => ({ kind: 'console' as const, text, location });

describe('фильтр консоли', () => {
  it('BUG-04: сообщения клиента HMR дев-сервера не считаются ошибками витрины', () => {
    expect(
      isIgnoredConsole(ev('[vite] failed to connect to websocket.'), DEFAULT_CONSOLE_IGNORE),
    ).toBe(true);
    expect(isIgnoredConsole(ev('[HMR] Waiting for update signal'), DEFAULT_CONSOLE_IGNORE)).toBe(
      true,
    );
  });

  it('BUG-09: ошибка приложения, обёрнутая forwardConsole Vite, проходит фильтр', () => {
    const e = ev(
      'Виджет отзывов: не удалось разобрать ответ SyntaxError: Unexpected end of JSON input',
      'http://localhost:5201/@vite/client',
    );
    expect(isIgnoredConsole(e, DEFAULT_CONSOLE_IGNORE)).toBe(false);
  });

  it('BUG-04: служебные сообщения клиента HMR из /@vite/client отсекаются', () => {
    const e = ev(
      'Failed to send error to Vite server: Error: WebSocket closed without opened.',
      'http://localhost:5201/@vite/client',
    );
    expect(isIgnoredConsole(e, DEFAULT_CONSOLE_IGNORE)).toBe(true);
  });

  it('BUG-04: ошибки расширений браузера отсекаются по тексту и по источнику', () => {
    expect(
      isIgnoredConsole(
        ev('Uncaught TypeError', 'chrome-extension://abcd/content.js'),
        DEFAULT_CONSOLE_IGNORE,
      ),
    ).toBe(true);
  });

  it('BUG-05: эхо сетевой ошибки отдаётся проверке http', () => {
    const text = 'Failed to load resource: the server responded with a status of 404 (Not Found)';
    expect(isIgnoredConsole(ev(text), [])).toBe(true);
  });

  it('настоящая ошибка приложения проходит фильтр', () => {
    expect(
      isIgnoredConsole(ev('Виджет отзывов: не удалось разобрать ответ'), DEFAULT_CONSOLE_IGNORE),
    ).toBe(false);
  });
});
