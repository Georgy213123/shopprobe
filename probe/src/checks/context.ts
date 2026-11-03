import type { Page } from 'playwright';
import type { ProbeConfig } from '../config';
import type { Finding, Viewport } from '../types';

export interface ConsoleEvent {
  kind: 'console' | 'pageerror';
  text: string;
  location: string;
}

export interface HttpEvent {
  url: string;
  status: number | 'failed';
  resourceType: string;
  method: string;
  error?: string;
}

/** Всё, что проверка знает о визите: страница и события, собранные с начала навигации. */
export interface CheckContext {
  page: Page;
  route: string;
  url: string;
  viewport: Viewport;
  config: ProbeConfig;
  consoleEvents: ConsoleEvent[];
  httpEvents: HttpEvent[];
}

export type Check = (ctx: CheckContext) => Promise<Finding[]>;
