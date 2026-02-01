import { ReactNode, Suspense } from 'react';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { QueryProvider } from '@/lib/api/query-client';
import { UserProvider } from '@/lib/context/user-context';

import '@/styles/globals.css';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | KMS-RAG',
    default: 'KMS-RAG',
  },
  description: 'Knowledge Management System for RAG with Human-in-the-Loop validation',
};
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html className="h-full" suppressHydrationWarning>
      <body
        className={cn(
          'antialiased flex h-full text-base text-foreground bg-background',
          inter.className,
        )}
      >
        <QueryProvider>
          <UserProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              storageKey="nextjs-theme"
              enableSystem
              disableTransitionOnChange
              enableColorScheme
            >
              <TooltipProvider delayDuration={0}>
                <Suspense>{children}</Suspense>
                <Toaster />
              </TooltipProvider>
            </ThemeProvider>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
