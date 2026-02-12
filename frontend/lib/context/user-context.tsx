'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { apiClient } from '@/lib/api/client';

interface UserContextValue {
  userId: string;
  setUser: (userId: string) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>('user-1');

  const setUser = (newUserId: string) => {
    setUserId(newUserId);
    // Update API client headers
    apiClient.setUser(newUserId);
  };

  const value = useMemo<UserContextValue>(
    () => ({
      userId,
      setUser,
    }),
    [userId]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
