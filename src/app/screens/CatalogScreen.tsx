import { useState } from 'react';
import { LogOut, Search, Filter, Package, ArrowLeft, X, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { User, Item } from '../types';
import { ItemDetailModal } from '../components/ItemDetailModal';
import telkomLogo from 'figma:asset/623803f2801f48df421c6a73b102830c97d7f2c1.png';
import telkomBg from 'figma:asset/0e86c95630b818072ace687907edb996034e5029.png';

interface CatalogScreenProps {
  user: User;
  onBack: () => void;
  items: Item[];
  onSubmitLoan: (data: { itemId: string; borrowDate: string; returnDate: string; quantity: number; reason: string }) => void;
}

export function CatalogScreen({ user, onBack, items: mockItems, onSubmitLoan }: CatalogScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Filter items based on search query
  const filteredItems = mockItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'electronics': 'Elektronik',
      'furniture': 'Furnitur',
      'decoration': 'Dekorasi',
      'other': 'Lainnya'
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; bgColor: string; textColor: string; icon: any }> = {
      'available': {
        label: 'Tersedia',
        bgColor: '#D1FAE5',
        textColor: '#10B981',
        icon: CheckCircle
      },
      'low-stock': {
        label: 'Stok Rendah',
        bgColor: '#FEF3C7',
        textColor: '#F59E0B',
        icon: AlertCircle
      },
      'out-of-stock': {
        label: 'Habis',
        bgColor: '#FEE2E2',
        textColor: '#EF4444',
        icon: XCircle
      },
      'borrowed': {
        label: 'Dipinjam',
        bgColor: '#E0E7FF',
        textColor: '#6366F1',
        icon: Package
      }
    };
    return configs[status] || configs['available'];
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header with Background Image */}
      <div className="px-12 pt-6 pb-6 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${telkomBg})`,
            backgroundPosition: 'center center'
          }}
        />
        {/* Color Overlay - Telkom Maroon */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(135deg, rgba(190, 30, 45, 0.85) 0%, rgba(139, 22, 33, 0.90) 100%)'
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-4 text-white hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            <span className="font-semibold text-sm">Kembali ke Dashboard</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="max-w-[80px]">
              <img 
                src={telkomLogo} 
                alt="Telkom University" 
                className="w-full h-auto"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
                Daftar Barang Inventaris
              </h1>
              <p className="text-xs text-white" style={{ opacity: 0.9 }}>
                Katalog lengkap barang peminjaman Telkom University
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-12 py-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Search Bar */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: '#94A3B8' }}
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari barang berdasarkan nama, kategori, atau deskripsi..."
                className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors text-base"
                style={{ fontSize: '16px' }}
                onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                >
                  <X className="w-5 h-5" style={{ color: '#94A3B8' }} strokeWidth={1.5} />
                </button>
              )}
            </div>

            {/* Search Results Count */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm" style={{ color: '#64748B' }}>
                {filteredItems.length === mockItems.length 
                  ? `Menampilkan ${filteredItems.length} barang` 
                  : `Ditemukan ${filteredItems.length} dari ${mockItems.length} barang`}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold hover:opacity-70 transition-opacity"
                  style={{ color: '#BE1E2D' }}
                >
                  Reset Pencarian
                </button>
              )}
            </div>
          </div>

          {/* Items Table */}
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#CBD5E1' }} strokeWidth={1.5} />
              <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>
                Tidak Ada Barang Ditemukan
              </h3>
              <p className="text-sm mb-4" style={{ color: '#64748B' }}>
                Coba gunakan kata kunci yang berbeda
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#BE1E2D' }}
              >
                Reset Pencarian
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      <th className="px-6 py-4 text-left text-xs font-bold" style={{ color: '#475569' }}>
                        No
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold" style={{ color: '#475569' }}>
                        Nama Barang
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold" style={{ color: '#475569' }}>
                        Kategori
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold" style={{ color: '#475569' }}>
                        Stok Total
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold" style={{ color: '#475569' }}>
                        Stok Tersedia
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold" style={{ color: '#475569' }}>
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold" style={{ color: '#475569' }}>
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, index) => {
                      const statusConfig = getStatusBadge(item.status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-gray-50 transition-colors"
                          style={{ borderBottom: '1px solid #F1F5F9' }}
                        >
                          <td className="px-6 py-4 text-sm" style={{ color: '#64748B' }}>
                            {index + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-12 h-12 rounded-lg bg-cover bg-center flex-shrink-0"
                                style={{ backgroundImage: `url(${item.imageUrl})` }}
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate" style={{ color: '#0F172A' }}>
                                  {item.name}
                                </p>
                                <p className="text-xs truncate" style={{ color: '#64748B' }}>
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span 
                              className="px-3 py-1 rounded-full text-xs font-semibold"
                              style={{ 
                                backgroundColor: '#F1F5F9',
                                color: '#475569'
                              }}
                            >
                              {getCategoryLabel(item.category)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-bold text-sm" style={{ color: '#0F172A' }}>
                              {item.totalStock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span 
                              className="font-bold text-sm"
                              style={{ 
                                color: item.availableStock === 0 ? '#EF4444' : 
                                       item.availableStock <= 5 ? '#F59E0B' : '#10B981'
                              }}
                            >
                              {item.availableStock}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <div
                                className="px-3 py-1 rounded-full flex items-center gap-1.5"
                                style={{ 
                                  backgroundColor: statusConfig.bgColor
                                }}
                              >
                                <StatusIcon 
                                  className="w-3 h-3" 
                                  style={{ color: statusConfig.textColor }}
                                  strokeWidth={2}
                                />
                                <span 
                                  className="text-xs font-semibold"
                                  style={{ color: statusConfig.textColor }}
                                >
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
                              style={{ backgroundColor: '#BE1E2D' }}
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          user={user}
          onClose={() => setSelectedItem(null)}
          onSubmitLoan={onSubmitLoan}
        />
      )}

      {/* Footer */}
      <div className="px-12 py-4 text-center">
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          © 2024 Telkom University
        </p>
        <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
          SmartLend v1.0.0 - Telkom University Edition
        </p>
      </div>
    </div>
  );
}
