import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, 'fixtures');
const OK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#2f5d27"/></svg>';
const BROKEN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect wi';

export interface FixtureServer {
  url: string;
  close: () => Promise<void>;
}

/** Мини-сервер фикстур: статические страницы плюс ресурсы с нужным поведением. */
export async function startFixtureServer(): Promise<FixtureServer> {
  let flaky = 0;
  const hits = new Map<string, number>();
  const hit = (key: string) => {
    const n = (hits.get(key) ?? 0) + 1;
    hits.set(key, n);
    return n;
  };
  const page = (title: string, body: string, head = '') =>
    `<!doctype html><html lang="ru"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>` +
    `<style>body{margin:0}</style>${head}</head><body><main>${body}</main></body></html>`;
  const server: Server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const send = (status: number, type: string, body: string) => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(body);
    };
    if (path === '/@vite/client') {
      // Так клиент HMR Vite ведёт себя, когда WebSocket недоступен (стенд за прокси).
      // Первая строка — как forwardConsole в Vite: console.error оборачивается, и у любой
      // ошибки приложения источник в CDP — /@vite/client (BUG-09).
      return send(
        200,
        'text/javascript',
        [
          'const __viteOriginalError = console.error;',
          'console.error = function (...args) { __viteOriginalError.apply(console, args); };',
          'console.error("WebSocket connection to \'ws://localhost:1/\' failed");',
          'console.error("[vite] failed to connect to websocket (Error: WebSocket closed without opened.).");',
          'console.error("Failed to send error to Vite server: Error: WebSocket closed without opened.");',
          'Promise.reject(new Error("WebSocket closed without opened."));',
        ].join('\n'),
      );
    }
    // Ревью Codex, находка 2: первый визит — дефект, дальше сервер обрывает соединение.
    if (path === '/dyn/dies-after-first') {
      if (hit(path) > 1) {
        req.socket.destroy();
        return;
      }
      return send(
        200,
        'text/html; charset=utf-8',
        page('dies', '<h1>Т</h1><div style="width:600px">ш</div>'),
      );
    }
    // Находка 4: эндпоинт всегда сломан, но код меняется 500 → 503.
    if (path === '/flip-status') return send(hit(path) === 1 ? 500 : 503, 'application/json', '{}');
    // Находка 7: нарушение контраста переезжает на другой элемент после первого визита.
    if (path === '/dyn/contrast-moving') {
      const id = hit(path) === 1 ? 'old-button' : 'different-button';
      return send(
        200,
        'text/html; charset=utf-8',
        page(
          'contrast',
          `<h1>К</h1><button id="${id}" style="background:#e3e8e1;color:#a3aba0">Купить</button>`,
        ),
      );
    }
    if (path === '/ok.svg') return send(200, 'image/svg+xml', OK_SVG);
    if (path === '/broken.svg') return send(200, 'image/svg+xml', BROKEN_SVG);
    if (path === '/slow/late.css') {
      await new Promise((r) => setTimeout(r, 800));
      return send(200, 'text/css', '.wide { width: auto; }');
    }
    if (path === '/flaky-data') {
      flaky += 1;
      return flaky % 2 === 1
        ? send(503, 'application/json', '{}')
        : send(200, 'application/json', '{}');
    }
    if (path.startsWith('/fixtures/')) {
      try {
        const body = await readFile(join(FIXTURES, path.slice('/fixtures/'.length)), 'utf8');
        return send(200, 'text/html; charset=utf-8', body);
      } catch {
        return send(404, 'text/plain', 'not found');
      }
    }
    if (path === '/favicon.ico') return send(200, 'image/svg+xml', OK_SVG);
    return send(404, 'text/plain', 'not found');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((r) => server.close(() => r())),
  };
}
