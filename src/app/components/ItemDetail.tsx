import { X, Package, CheckCircle, AlertCircle } from 'lucide-react';
import { Item } from '../types';

interface ItemDetailProps {
  item: Item;
  onClose: () => void;
  onBorrow: () => void;
}

export function ItemDetail({ item, onClose, onBorrow }: ItemDetailProps) {
  const getStockStatus = () => {
    if (item.availableStock === 0) {
      return {
        color: 'var(--color-error)',
        text: 'Stok Habis',
        icon: AlertCircle,
        description: 'Barang tidak tersedia saat ini'
      };
    }
    if (item.availableStock < 5) {
      return {
        color: 'var(--color-warning)',
        text: 'Stok Menipis',
        icon: AlertCircle,
        description: `Hanya tersisa ${item.availableStock} unit`
      };
    }
    return {
      color: 'var(--color-success)',
      text: 'Tersedia',
      icon: CheckCircle,
      description: `${item.availableStock} unit siap dipinjam`
    };
  };

  const status = getStockStatus();
  const StatusIcon = status.icon;
  const isAvailable = item.availableStock > 0;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-0 md:p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Detail Card */}
      <div 
        className="bg-white w-full md:max-w-3xl md:rounded-xl rounded-t-3xl max-h-[95vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          boxShadow: 'var(--shadow-xl)'
        }}
      >
        {/* Handle Bar for Mobile */}
        <div className="md:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Hero Image */}
        <div className="relative w-full h-64 md:h-96 bg-gray-100">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/800x600?text=No+Image';
            }}
          />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Stock Badge */}
          <div
            className="absolute top-4 left-4 px-4 py-2 rounded-full text-white font-medium text-sm flex items-center gap-2 shadow-lg"
            style={{ backgroundColor: status.color }}
          >
            <StatusIcon className="w-4 h-4" strokeWidth={1.5} />
            {status.text}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Header Info */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-2">
              <h1 className="flex-1" style={{ color: 'var(--color-navy)' }}>
                {item.name}
              </h1>
            </div>
            <p 
              className="text-sm capitalize px-3 py-1 inline-block rounded-full"
              style={{ 
                backgroundColor: 'var(--color-gray-100)',
                color: 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-full)'
              }}
            >
              {item.category === 'furniture' ? '🪑 Furniture' : 
               item.category === 'electronics' ? '⚡ Elektronik' : 
               '🎨 Dekorasi'}
            </p>
          </div>

          {/* Availability Status Card */}
          <div 
            className="p-4 mb-6 border-l-4"
            style={{ 
              backgroundColor: `${status.color}10`,
              borderLeftColor: status.color,
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5" style={{ color: status.color }} strokeWidth={1.5} />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-navy)' }}>
                  {status.description}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Total stok: {item.totalStock} unit
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="mb-3" style={{ color: 'var(--color-navy)' }}>
              Deskripsi
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {item.description}
            </p>
          </div>

          {/* Condition */}
          <div className="mb-6">
            <h3 className="mb-3" style={{ color: 'var(--color-navy)' }}>
              Kondisi
            </h3>
            <div 
              className="p-4"
              style={{ 
                backgroundColor: 'var(--color-gray-100)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                ✓ {item.condition}
              </p>
            </div>
          </div>

          {/* Specifications */}
          {item.specifications && item.specifications.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3" style={{ color: 'var(--color-navy)' }}>
                Spesifikasi
              </h3>
              <div className="space-y-2">
                {item.specifications.map((spec, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3"
                    style={{ 
                      backgroundColor: 'var(--color-gray-100)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    />
                    <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {spec}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Spacing for FAB */}
          <div className="h-20 md:hidden" />
        </div>

        {/* Floating Action Button - Sticky Bottom */}
        <div 
          className="sticky bottom-0 left-0 right-0 p-4 md:p-6 bg-white border-t border-gray-200"
          style={{ boxShadow: '0 -4px 6px -1px rgb(0 0 0 / 0.05)' }}
        >
          <button
            onClick={onBorrow}
            disabled={!isAvailable}
            className={`w-full py-4 rounded-lg text-white font-semibold text-base transition-all ${
              isAvailable 
                ? 'hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg' 
                : 'opacity-50 cursor-not-allowed'
            }`}
            style={{ 
              backgroundColor: isAvailable ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            {isAvailable ? '📋 Ajukan Peminjaman' : '❌ Stok Tidak Tersedia'}
          </button>
          
          {isAvailable && (
            <p className="text-xs text-center mt-3" style={{ color: 'var(--color-text-secondary)' }}>
              💡 Peminjaman akan direview oleh admin dalam 1x24 jam
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
