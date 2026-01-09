// app/responder/page.tsx
'use client';

import ResponderDashboard from '@/components/dashboard/ResponderDashboard';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function ResponderPage() {
  return (
    <ProtectedRoute requiredRole="responder">
      <ResponderDashboard />
    </ProtectedRoute>
  );
}
