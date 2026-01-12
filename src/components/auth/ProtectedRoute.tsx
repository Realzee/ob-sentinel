// components/auth/ProtectedRoute.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { canAccessRoute } from '@/lib/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermissions?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredPermissions,
  redirectTo = '/'
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Reset redirect flag when auth state changes
    hasRedirectedRef.current = false;
  }, [user, loading]);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirectedRef.current) return;

    if (!loading && !user) {
      hasRedirectedRef.current = true;
      router.push('/');
      return;
    }

    if (!loading && user) {
      const userRole = user.role || user.user_metadata?.role || 'user';

      // Check role-based access
      if (requiredRole) {
        const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!requiredRoles.includes(userRole)) {
          hasRedirectedRef.current = true;
          router.push(redirectTo);
          return;
        }
      }

      // Check route access
      const currentPath = window.location.pathname;
      if (!canAccessRoute(userRole as any, currentPath)) {
        hasRedirectedRef.current = true;
        router.push(redirectTo);
        return;
      }
    }
  }, [user, loading, router, requiredRole, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}