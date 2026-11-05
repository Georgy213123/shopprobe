import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import { AppProviders } from '@/lib/context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Чайная полка',
  description: 'Чайная полка — демо-витрина чайного магазина',
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <AppProviders>
          <Layout>{children}</Layout>
        </AppProviders>
      </body>
    </html>
  );
}
