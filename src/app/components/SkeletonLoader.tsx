export function SkeletonCard() {
  return (
    <div 
      className="bg-white rounded-lg overflow-hidden animate-pulse"
      style={{ 
        boxShadow: 'var(--shadow-md)',
        borderRadius: 'var(--radius-lg)'
      }}
    >
      {/* Image skeleton */}
      <div 
        className="w-full h-48 bg-gray-200"
      />
      
      {/* Content skeleton */}
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded mb-3 w-3/4" />
        <div className="h-3 bg-gray-200 rounded mb-2 w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        
        <div className="flex items-center justify-between mt-4">
          <div className="h-6 bg-gray-200 rounded w-20" />
          <div className="h-8 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div 
          key={i}
          className="bg-white rounded-lg p-4 animate-pulse"
          style={{ 
            boxShadow: 'var(--shadow-sm)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
              <div className="h-3 bg-gray-200 rounded mb-2 w-full" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
