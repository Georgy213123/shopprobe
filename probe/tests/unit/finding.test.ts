import { describe, expect, it } from 'vitest';
import {
  atLeast,
  dedupe,
  fingerprint,
  makeFinding,
  normalizeMessage,
  verdict,
} from '../../src/finding';

const vp = { name: 'mobile', width: 390, height: 844 };

describe('отпечаток находки', () => {
  it('одна проблема — один id, независимо от времени и порядка', () => {
    expect(fingerprint('http', '/', 'desktop', 'GET /x 404')).toBe(
      fingerprint('http', '/', 'desktop', 'GET /x 404'),
    );
  });

  it('другой вьюпорт или маршрут — другая находка', () => {
    const a = fingerprint('h-scroll', '/', 'desktop', 'document');
    expect(a).not.toBe(fingerprint('h-scroll', '/', 'mobile', 'document'));
    expect(a).not.toBe(fingerprint('h-scroll', '/cart', 'desktop', 'document'));
  });

  it('makeFinding собирает шаги воспроизведения с размером окна', () => {
    const f = makeFinding({
      check: 'h-scroll',
      route: '/',
      url: 'http://localhost:5201/',
      viewport: vp,
      severity: 'serious',
      title: 't',
      details: 'd',
      target: 'document',
      action: 'Прокрутить вправо.',
      expected: 'нет скролла',
      actual: 'есть скролл',
    });
    expect(f.steps).toHaveLength(3);
    expect(f.steps[0]).toContain('390×844');
    expect(f.steps[2]).toBe('Ожидаемо: нет скролла. Фактически: есть скролл.');
    expect(dedupe([f, { ...f }])).toHaveLength(1);
  });
});

describe('вердикт перепроверки', () => {
  it.each([
    [3, 3, 'confirmed'],
    [3, 0, 'not_reproduced'],
    [3, 1, 'flaky'],
    [3, 2, 'flaky'],
    [1, 1, 'confirmed'],
  ] as const)('%i попыток, воспроизвелось %i → %s', (attempts, reproduced, expected) => {
    expect(verdict(attempts, reproduced)).toBe(expected);
  });
});

describe('серьёзность', () => {
  it('сравнивается по шкале axe', () => {
    expect(atLeast('critical', 'moderate')).toBe(true);
    expect(atLeast('moderate', 'moderate')).toBe(true);
    expect(atLeast('minor', 'moderate')).toBe(false);
  });
});

describe('нормализация текста консоли', () => {
  it('убирает номера строк, query и хэши сборки', () => {
    expect(normalizeMessage('boom at http://x/assets/index-AbC123xyz9.js?v=2:10:15')).toBe(
      'boom at http://x/assets/index.js',
    );
  });
});
