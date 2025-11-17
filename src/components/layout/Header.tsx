'use client';

import { useAuth } from '@/components/providers/AuthProvider';

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                RAPID iREPORT
              </h1>
            </div>
            <nav className="hidden md:ml-6 md:flex space-x-4">
              <span className="text-sm text-gray-500">
                Community Safety Reporting System
              </span>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="text-sm text-gray-700">
                  <div className="font-medium">
                    {user.profile?.full_name || user.email}
                  </div>
                  <div className="text-gray-500 capitalize">
                    {user.profile?.role} • {user.profile?.status}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md text-sm font-medium text-gray-700 transition-colors"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}