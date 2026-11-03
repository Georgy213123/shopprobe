import { describe, expect, it } from 'vitest';
import { ConfigError, DEFAULT_CONSOLE_IGNORE, resolveConfig } from '../../src/config';

describe('resolveConfig', () => {
  it('значения по умолчанию: два вьюпорта, три перепроверки, все проверки', () => {
    const c = resolveConfig();
    expect(c.viewports.map((v) => `${v.width}x${v.height}`)).toEqual(['1440x900', '390x844']);
    expect(c.retest.attempts).toBe(3);
    expect(c.checks).toHaveLength(6);
  });

  it('пользовательские игноры дополняют встроенные, а не заменяют', () => {
    const c = resolveConfig({ console: { ignore: ['analytics'] } });
    expect(c.console.ignore).toEqual([...DEFAULT_CONSOLE_IGNORE, 'analytics']);
  });

  it('флаги командной строки важнее файла', () => {
    const c = resolveConfig(
      { baseUrl: 'http://a.test', retest: { attempts: 2 } },
      { baseUrl: 'http://b.test' },
    );
    expect(c.baseUrl).toBe('http://b.test');
    expect(c.retest.attempts).toBe(2);
  });

  it.each([
    [{ baseUrl: 'не url' }, /baseUrl/],
    [{ routes: [] }, /routes/],
    [{ routes: ['catalog'] }, /«\/»/],
    [{ retest: { attempts: 0 } }, /retest/],
    [{ checks: ['seo' as never] }, /неизвестные/],
  ])('отклоняет неверный конфиг %j', (user, message) => {
    expect(() => resolveConfig(user)).toThrow(ConfigError);
    expect(() => resolveConfig(user)).toThrow(message);
  });
});
