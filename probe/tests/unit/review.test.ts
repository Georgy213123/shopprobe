/** Находки ревью Codex (gpt-6.1-sol) по конфигу и фильтрам. Номера — из docs/04-ai-development.md. */
import { describe, expect, it } from 'vitest';
import { statusClass, withoutQuery } from '../../src/checks/http';
import { ConfigError, matches, resolveConfig } from '../../src/config';

describe('ревью Codex: конфиг', () => {
  it('R5: два вьюпорта с одним именем отклоняются', () => {
    const viewports = [
      { name: 'phone', width: 1440, height: 900 },
      { name: 'phone', width: 390, height: 844 },
    ];
    expect(() => resolveConfig({ viewports })).toThrow(ConfigError);
    expect(() => resolveConfig({ viewports })).toThrow(/phone/);
  });

  it('R6: опечатка в failOn или minImpact — ошибка, а не тихо выключенная приёмка', () => {
    expect(() => resolveConfig({ thresholds: { failOn: 'critcal' as never } })).toThrow(/failOn/);
    expect(() => resolveConfig({ a11y: { minImpact: 'high' as never } })).toThrow(/minImpact/);
  });
});

describe('ревью Codex: фильтры и отпечатки', () => {
  it('R10: шаблон с флагом g срабатывает каждый раз, а не через раз', () => {
    const re = /analytics/g;
    expect([1, 2, 3].map(() => matches('analytics', [re]))).toEqual([true, true, true]);
    const sticky = /analytics/y;
    expect([1, 2].map(() => matches('analytics', [sticky]))).toEqual([true, true]);
  });

  it('R4: отпечаток HTTP — без query и по классу ответа', () => {
    expect(statusClass(500)).toBe(statusClass(503));
    expect(statusClass(404)).toBe('4xx');
    expect(withoutQuery('/api/x?cb=123')).toBe('/api/x');
  });
});
