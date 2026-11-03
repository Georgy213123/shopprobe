export type CheckId = 'console' | 'http' | 'broken-image' | 'h-scroll' | 'single-h1' | 'a11y';

export const ALL_CHECKS: readonly CheckId[] = [
  'console',
  'http',
  'broken-image',
  'h-scroll',
  'single-h1',
  'a11y',
];

/** Шкала axe-core; ей же оцениваются находки остальных проверок. */
export type Severity = 'critical' | 'serious' | 'moderate' | 'minor';

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export interface Finding {
  /** Отпечаток: одна и та же проблема в повторном прогоне даёт тот же id. */
  id: string;
  check: CheckId;
  route: string;
  url: string;
  viewport: string;
  severity: Severity;
  title: string;
  details: string;
  /** Что именно сломано: URL ресурса, селектор, правило axe. */
  target: string;
  steps: string[];
}

export type Verdict = 'confirmed' | 'flaky' | 'not_reproduced';

export interface Retest {
  attempts: number;
  reproduced: number;
  verdict: Verdict;
}

export interface ReportedFinding extends Finding {
  retest: Retest;
}

export interface PageVisit {
  route: string;
  url: string;
  viewport: string;
  status: number | null;
  durationMs: number;
  findings: number;
}

export interface Summary {
  pages: number;
  total: number;
  confirmed: number;
  flaky: number;
  notReproduced: number;
  confirmedBySeverity: Record<Severity, number>;
  failed: boolean;
}

export interface Report {
  tool: 'shopprobe';
  version: string;
  baseUrl: string;
  startedAt: string;
  durationMs: number;
  retestAttempts: number;
  failOn: Severity;
  pages: PageVisit[];
  findings: ReportedFinding[];
  summary: Summary;
}
