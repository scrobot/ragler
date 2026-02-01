'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { UserRole, UserMode } from '@/types/api';
import { apiClient } from '@/lib/api/client';

interface UserContextValue {
  userId: string;
  role: UserRole;
  mode: UserMode;
  isAdvancedMode: boolean;
  setUser: (userId: string, role: UserRole) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

function deriveMode(role: UserRole): UserMode {
  return role === 'L2' ? 'simple' : 'advanced';
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>('user-1');
  const [role, setRole] = useState<UserRole>('L2');

  const setUser = (newUserId: string, newRole: UserRole) => {
    setUserId(newUserId);
    setRole(newRole);
    // Update API client headers
    apiClient.setUser(newUserId, newRole);
  };

  const value = useMemo<UserContextValue>(
    () => ({
      userId,
      role,
      mode: deriveMode(role),
      isAdvancedMode: role !== 'L2',
      setUser,
    }),
    [userId, role]
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
