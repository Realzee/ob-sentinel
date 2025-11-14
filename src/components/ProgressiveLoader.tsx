// components/ProgressiveLoader.tsx
export function ProgressiveLoader() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-dark-gray border border-gray-700 rounded-lg p-4 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-1/4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              <div className="h-3 bg-gray-700 rounded w-3/4"></div>
            </div>
            <div className="w-20 h-8 bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function UserTableSkeleton() {
  return (
    <div className="card p-6">
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="w-5 h-5 bg-gray-700 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-800 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-700 rounded w-20"></div>
            <div className="h-6 bg-gray-700 rounded w-16"></div>
            <div className="h-6 bg-gray-700 rounded w-24"></div>
            <div className="h-8 bg-gray-700 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function UserCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-32"></div>
                <div className="h-3 bg-gray-800 rounded w-24"></div>
              </div>
            </div>
            <div className="w-5 h-5 bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <div className="h-3 bg-gray-800 rounded w-16"></div>
              <div className="h-6 bg-gray-700 rounded w-20"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-800 rounded w-12"></div>
              <div className="h-6 bg-gray-700 rounded w-16"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-800 rounded w-16"></div>
              <div className="h-6 bg-gray-700 rounded w-12"></div>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="flex-1 h-8 bg-gray-700 rounded"></div>
            <div className="w-20 h-8 bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}