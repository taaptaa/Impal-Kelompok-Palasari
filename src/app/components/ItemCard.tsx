import { Item } from '../types';

interface ItemCardProps {
  item: Item;
  onClick: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const getStatusColor = () => {
    if (item.availableStock === 0) return 'var(--color-error)';
    if (item.availableStock < 5) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  const getStatusText = () => {
    if (item.availableStock === 0) return 'Habis';
    if (item.availableStock < 5) return 'Stok Menipis';
    return 'Tersedia';
  };

  const isOutOfStock = item.availableStock === 0;

  return (
    <div
      onClick={isOutOfStock ? undefined : onClick}
      className={`bg-white overflow-hidden transition-all hover:shadow-lg ${
        isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'
      }`}
      style={{ 
        boxShadow: 'var(--shadow-md)',
        borderRadius: 'var(--radius-lg)'
      }}
    >
      {/* Image - Aspect ratio 1:1 */}
      <div className="relative aspect-square bg-gray-100">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/400x400?text=No+Image';
          }}
        />
        {/* Badge Stok - Top Right */}
        <div
          className="absolute top-2 right-2 px-3 py-1 rounded-full text-white text-xs font-medium"
          style={{ backgroundColor: getStatusColor() }}
        >
          {getStatusText()}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Nama Barang - Truncate 2 lines */}
        <h4 
          className="font-semibold mb-1 line-clamp-2" 
          style={{ 
            color: 'var(--color-navy)',
            minHeight: '2.5rem'
          }}
        >
          {item.name}
        </h4>
        
        {/* Category */}
        <p className="text-xs mb-3 capitalize" style={{ color: 'var(--color-text-secondary)' }}>
          {item.category}
        </p>
        
        {/* Stock Info */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Stok: <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {item.availableStock}/{item.totalStock}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}