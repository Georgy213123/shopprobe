import type { CheckId, Severity, Viewport } from './types';
import { ALL_CHECKS, SEVERITY_RANK } from './types';

const SEVERITIES = Object.keys(SEVERITY_RANK).join(', ');

export interface ProbeConfig {
  baseUrl: string;
  routes: string[];
  viewports: Viewport[];
  checks: CheckId[];
  /** Сколько раз повторять каждую находку в чистом контексте браузера. */
  retest: { attempts: number };
  thresholds: {
    /** Прогон падает, если есть подтверждённая находка этой серьёзности или выше. */
    failOn: Severity;
    /** Допуск горизонтального скролла, px: субпиксельное округление не считается дефектом. */
    overflowTolerancePx: number;
  };
  a11y: { tags: string[]; minImpact: Severity; disableRules: string[] };
  console: { ignore: Array<string | RegExp> };
  http: { ignore: Array<string | RegExp> };
  timeouts: { navigationMs: number; settleMs: number; imagesMs: number };
  outputDir: string;
}

export type UserConfig = Partial<
  Omit<ProbeConfig, 'retest' | 'thresholds' | 'a11y' | 'console' | 'http' | 'timeouts'>
> & {
  retest?: Partial<ProbeConfig['retest']>;
  thresholds?: Partial<ProbeConfig['thresholds']>;
  a11y?: Partial<ProbeConfig['a11y']>;
  console?: Partial<ProbeConfig['console']>;
  http?: Partial<ProbeConfig['http']>;
  timeouts?: Partial<ProbeConfig['timeouts']>;
};

/**
 * Шум, который не относится к витрине: клиент HMR дев-сервера и расширения браузера.
 * См. docs/06-bugs.md, BUG-04.
 */
export const DEFAULT_CONSOLE_IGNORE: Array<string | RegExp> = [
  // Клиент HMR Vite: и его собственные сообщения, и всё, что пишется из /@vite/client.
  /^\[vite\]/,
  '/@vite/client',
  /^\[HMR\]/,
  /^\[webpack-dev-server\]/,
  'chrome-extension://',
  'moz-extension://',
  'Download the React DevTools',
];

export const DEFAULT_VIEWPORTS: Viewport[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

export const DEFAULTS: ProbeConfig = {
  baseUrl: 'http://localhost:5201',
  routes: ['/'],
  viewports: DEFAULT_VIEWPORTS,
  checks: [...ALL_CHECKS],
  retest: { attempts: 3 },
  thresholds: { failOn: 'moderate', overflowTolerancePx: 1 },
  a11y: {
    tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    minImpact: 'serious',
    disableRules: [],
  },
  console: { ignore: DEFAULT_CONSOLE_IGNORE },
  http: { ignore: [] },
  timeouts: { navigationMs: 20_000, settleMs: 300, imagesMs: 5_000 },
  outputDir: 'reports/latest',
};

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

export class ConfigError extends Error {}

export function resolveConfig(user: UserConfig = {}, overrides: UserConfig = {}): ProbeConfig {
  const merged: ProbeConfig = {
    ...DEFAULTS,
    ...user,
    ...overrides,
    retest: { ...DEFAULTS.retest, ...user.retest, ...overrides.retest },
    thresholds: { ...DEFAULTS.thresholds, ...user.thresholds, ...overrides.thresholds },
    a11y: { ...DEFAULTS.a11y, ...user.a11y, ...overrides.a11y },
    console: {
      ignore: [
        ...DEFAULTS.console.ignore,
        ...(user.console?.ignore ?? []),
        ...(overrides.console?.ignore ?? []),
      ],
    },
    http: { ignore: [...(user.http?.ignore ?? []), ...(overrides.http?.ignore ?? [])] },
    timeouts: { ...DEFAULTS.timeouts, ...user.timeouts, ...overrides.timeouts },
  };
  validate(merged);
  return merged;
}

function validate(c: ProbeConfig): void {
  try {
    new URL(c.baseUrl);
  } catch {
    throw new ConfigError(`baseUrl не URL: ${c.baseUrl}`);
  }
  if (c.routes.length === 0) throw new ConfigError('routes: нужен хотя бы один маршрут');
  for (const r of c.routes) {
    if (!r.startsWith('/')) throw new ConfigError(`маршрут должен начинаться с «/»: ${r}`);
  }
  if (c.viewports.length === 0) throw new ConfigError('viewports: нужен хотя бы один вьюпорт');
  if (!Number.isInteger(c.retest.attempts) || c.retest.attempts < 1 || c.retest.attempts > 10) {
    throw new ConfigError('retest.attempts: целое от 1 до 10');
  }
  const names = c.viewports.map((v) => v.name);
  const dup = names.find((n, i) => names.indexOf(n) !== i);
  if (dup)
    throw new ConfigError(
      `viewports: имя «${dup}» повторяется — перепроверка ищет вьюпорт по имени`,
    );
  // Конфиг грузится через tsx без проверки типов: значения проверяем в рантайме.
  if (!(c.thresholds.failOn in SEVERITY_RANK)) {
    throw new ConfigError(
      `thresholds.failOn: ${String(c.thresholds.failOn)}; допустимо: ${SEVERITIES}`,
    );
  }
  if (!(c.a11y.minImpact in SEVERITY_RANK)) {
    throw new ConfigError(`a11y.minImpact: ${String(c.a11y.minImpact)}; допустимо: ${SEVERITIES}`);
  }
  const unknown = c.checks.filter((x) => !ALL_CHECKS.includes(x));
  if (unknown.length) throw new ConfigError(`неизвестные проверки: ${unknown.join(', ')}`);
}

export function matches(text: string, patterns: Array<string | RegExp>): boolean {
  return patterns.some((p) => {
    if (typeof p === 'string') return text.includes(p);
    // У шаблонов с флагами g и y test() сдвигает lastIndex — без сброса каждое
    // второе одинаковое сообщение проходило фильтр (ревью Codex, R10).
    p.lastIndex = 0;
    return p.test(text);
  });
}
