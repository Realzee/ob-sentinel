// app/responder/page.tsx
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ResponderDashboard from '@/components/dashboard/ResponderDashboard';

export default function ResponderPage() {
  const { user } = useAuth(); // Remove isLoading
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true); // Add local loading state

  useEffect(() => {
    // Check if user is loaded
    if (user !== undefined) { // user will be undefined while loading, null if not logged in
      setIsLoading(false);
      
      // Check if user has appropriate role
      if (!user || (user.role !== 'responder' && user.role !== 'controller')) {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'responder' && user.role !== 'controller')) {
    return null;
  }

  return <ResponderDashboard />;
}