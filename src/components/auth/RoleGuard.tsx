// components/auth/RoleGuard.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export default function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user } = useAuth();
  
  const userRole = user?.role || user?.user_metadata?.role || 'user';
  
  if (!allowedRoles.includes(userRole)) {
    return fallback || (
      <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
        <p className="text-red-300">Access denied. Required roles: {allowedRoles.join(', ')}</p>
      </div>
    );
  }

  return <>{children}</>;
}