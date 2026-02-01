'use client';

import { useUser } from '@/lib/context/user-context';
import { UserMode } from '@/types/api';
import { ReactNode } from 'react';

interface ModeGuardProps {
  mode: UserMode;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user mode.
 *
 * Usage:
 * <ModeGuard mode="advanced">
 *   <SplitButton /> // Only shown to ML/DEV users
 * </ModeGuard>
 */
export function ModeGuard({ mode, children, fallback = null }: ModeGuardProps) {
  const { mode: userMode } = useUser();

  if (mode === userMode) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Only renders children for advanced mode users (ML/DEV).
 */
export function AdvancedOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ModeGuard mode="advanced" fallback={fallback}>
      {children}
    </ModeGuard>
  );
}

/**
 * Only renders children for simple mode users (L2).
 */
export function SimpleOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ModeGuard mode="simple" fallback={fallback}>
      {children}
    </ModeGuard>
  );
}
