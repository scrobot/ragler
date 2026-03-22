'use client';

import { Layout1 } from '@/components/layouts/layout-1';
import { QueryProvider } from '@/lib/api/query-client';
import { UserProvider } from '@/lib/context/user-context';
import { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Layout1>{children}</Layout1>
  );
}
