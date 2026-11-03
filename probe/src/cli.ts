#!/usr/bin/env -S npx tsx
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { resolveConfig, type UserConfig } from './config';
import { consoleSummary, writeReport } from './report/write';
import { runProbe } from './run';

const HELP = `shopprobe [--config probe.config.ts] [--base-url URL] [--out DIR] [--retest N] [--routes /a,/b]

Коды выхода: 0 — приёмка пройдена, 1 — есть подтверждённые находки выше порога, 2 — ошибка запуска.`;

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      config: { type: 'string', default: 'probe.config.ts' },
      'base-url': { type: 'string' },
      out: { type: 'string' },
      retest: { type: 'string' },
      routes: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(HELP);
    return 0;
  }

  const configPath = resolve(values.config);
  let user: UserConfig = {};
  if (existsSync(configPath)) {
    const mod = (await import(pathToFileURL(configPath).href)) as { default?: UserConfig };
    user = mod.default ?? {};
  }
  const overrides: UserConfig = {};
  if (values['base-url']) overrides.baseUrl = values['base-url'];
  if (values.out) overrides.outputDir = values.out;
  if (values.retest) overrides.retest = { attempts: Number(values.retest) };
  if (values.routes) overrides.routes = values.routes.split(',').map((r) => r.trim());
  const config = resolveConfig(user, overrides);

  console.log(
    `ShopProbe: ${config.baseUrl}, маршрутов ${config.routes.length}, вьюпортов ${config.viewports.length}`,
  );
  const report = await runProbe(config, { log: (l) => console.log(l) });
  const files = await writeReport(report, resolve(config.outputDir));
  console.log(consoleSummary(report));
  console.log(`отчёт: ${files.html}\n        ${files.json}`);
  return report.summary.failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  },
);
