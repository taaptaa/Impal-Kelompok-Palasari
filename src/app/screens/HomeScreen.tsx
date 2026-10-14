import { User, Item, LoanRequest } from '../types';
import { Search, TrendingUp, Clock, Package, ChevronRight, Sparkles, QrCode, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { ItemDetailModal } from '../components/ItemDetailModal';

interface HomeScreenProps {
  user: User;
  items: Item[];
  userLoans: LoanRequest[];
  onNavigate: (screen: 'home' | 'catalog' | 'history' | 'notifications' | 'profile') => void;
  onRequestReturn?: (loanId: string) => void;
  onSubmitLoan?: (data: { itemId: string; borrowDate: string; returnDate: string; quantity: number; reason: string }) => void;
}

export function HomeScreen({ user, items, userLoans, onNavigate, onRequestReturn, onSubmitLoan }: HomeScreenProps) {
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  const pendingLoans = userLoans.filter(l => l.status === 'pending').length;
  const activeLoans = userLoans.filter(l => l.status === 'approved' || l.status === 'active').length;
  const activeLoansList = userLoans.filter(l => l.status === 'approved' || l.status === 'active');
  const popularItems = items.slice(0, 4);

  const handleReturnClick = (loan: LoanRequest) => {
    setSelectedLoan(loan);
    setShowReturnModal(true);
  };

  const handleConfirmReturn = () => {
    if (selectedLoan && onRequestReturn) {
      onRequestReturn(selectedLoan.id);
    }
    setShowReturnModal(false);
    setSelectedLoan(null);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6F8' }}>
      {/* Header - Telkom Red Gradient */}
      <div className="px-6 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #BE1E2D 0%, #9a1823 100%)' }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm mb-1" style={{ color: '#FEE2E2' }}>
              Selamat Datang 👋
            </p>
            <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              {user.name}
            </h1>
          </div>
          <div className="w-12 h-12 rounded-full overflow-hidden" style={{ backgroundColor: '#BE1E2D' }}>
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#94A3B8' }} strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Cari barang inventaris..."
            onClick={() => onNavigate('catalog')}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-0 focus:outline-none focus:ring-2 transition-all"
            style={{ backgroundColor: '#FFFFFF', color: '#333333' }}
            onFocus={(e) => e.target.style.borderColor = '#BE1E2D'}
          />
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#FEF3C7' }}>
              <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>
              {pendingLoans}
            </p>
            <p className="text-xs" style={{ color: '#64748B' }}>
              Pending
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#D1FAE5' }}>
              <Package className="w-5 h-5" style={{ color: '#10B981' }} strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>
              {activeLoans}
            </p>
            <p className="text-xs" style={{ color: '#64748B' }}>
              Aktif
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#FEE2E2' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#BE1E2D' }} strokeWidth={1.5} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>
              {items.length}
            </p>
            <p className="text-xs" style={{ color: '#64748B' }}>
              Item
            </p>
          </div>
        </div>

        {/* Quick Actions - Telkom Red Gradient */}
        <div className="rounded-3xl p-6 mb-8 shadow-lg" style={{ background: 'linear-gradient(135deg, #BE1E2D 0%, #9a1823 100%)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-yellow-300" strokeWidth={2} />
                <span className="text-sm font-semibold" style={{ color: '#FEE2E2' }}>Featured</span>
              </div>
              <h3 className="text-xl mb-2 font-bold" style={{ color: '#FFFFFF' }}>
                Pinjam Barang Sekarang
              </h3>
              <p className="text-sm mb-4" style={{ color: '#FEE2E2' }}>
                Proses cepat & mudah dengan QR Code
              </p>
              <button
                onClick={() => onNavigate('catalog')}
                className="px-6 py-3 bg-white rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-lg transition-all"
                style={{ color: '#BE1E2D' }}
              >
                Lihat Katalog
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Popular Items */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>
              Item Populer
            </h2>
            <button
              onClick={() => onNavigate('catalog')}
              className="text-sm font-semibold flex items-center gap-1"
              style={{ color: '#BE1E2D' }}
            >
              Lihat Semua
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {popularItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/200?text=No+Image';
                    }}
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-white rounded-lg">
                    <p className="text-xs font-bold" style={{ color: '#10B981' }}>
                      {item.availableStock} unit
                    </p>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-1" style={{ color: '#0F172A' }}>
                    {item.name}
                  </h3>
                  <p className="text-xs capitalize" style={{ color: '#64748B' }}>
                    {item.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barang Sedang Dipinjam - NEW SECTION */}
        {activeLoansList.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>
                Barang Sedang Dipinjam
              </h2>
              <div className="px-3 py-1 rounded-full" style={{ backgroundColor: '#D1FAE5' }}>
                <p className="text-xs font-bold" style={{ color: '#10B981' }}>
                  {activeLoansList.length} Aktif
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {activeLoansList.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <img
                      src={loan.itemImage}
                      alt={loan.itemName}
                      className="w-16 h-16 rounded-xl object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Image';
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                          {loan.itemName}
                        </h3>
                        <span
                          className="px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: '#D1FAE5', color: '#10B981' }}
                        >
                          {loan.status === 'active' ? 'Aktif' : 'Siap Diambil'}
                        </span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: '#64748B' }}>
                        ID: {loan.id} • {loan.quantity} unit
                      </p>
                      <div className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
                        <span>📅 Pinjam: {loan.borrowDate}</span>
                        <span>→</span>
                        <span>📅 Kembali: {loan.returnDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Return Button */}
                  <button
                    onClick={() => handleReturnClick(loan)}
                    className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-md"
                    style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
                  >
                    <RotateCcw className="w-4 h-4" strokeWidth={2} />
                    Kembalikan Barang
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {userLoans.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#0F172A' }}>
              Aktivitas Terbaru
            </h2>
            <div className="space-y-3">
              {userLoans.slice(0, 3).map((loan) => (
                <div
                  key={loan.id}
                  className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
                >
                  <img
                    src={loan.itemImage}
                    alt={loan.itemName}
                    className="w-14 h-14 rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Image';
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1" style={{ color: '#0F172A' }}>
                      {loan.itemName}
                    </h3>
                    <p className="text-xs" style={{ color: '#64748B' }}>
                      {loan.requestDate}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor:
                        loan.status === 'approved' ? '#D1FAE5' :
                        loan.status === 'pending' ? '#FEF3C7' :
                        loan.status === 'completed' ? '#E0E7FF' :
                        '#FEE2E2',
                      color:
                        loan.status === 'approved' ? '#10B981' :
                        loan.status === 'pending' ? '#F59E0B' :
                        loan.status === 'completed' ? '#6366F1' :
                        '#EF4444'
                    }}
                  >
                    {loan.status === 'approved' ? 'Disetujui' :
                     loan.status === 'pending' ? 'Pending' :
                     loan.status === 'completed' ? 'Selesai' :
                     'Ditolak'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Return Modal */}
        {showReturnModal && selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div 
              className="bg-white rounded-3xl shadow-2xl w-full overflow-hidden"
              style={{ maxWidth: '900px', maxHeight: '90vh' }}
            >
              {/* Sticky Header */}
              <div className="bg-white px-6 py-4 border-b border-gray-100 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold" style={{ color: '#0F172A' }}>
                    Pengembalian Barang
                  </h3>
                  <button
                    onClick={() => setShowReturnModal(false)}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    style={{ color: '#64748B' }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 73px)' }}>
                {/* Content - 2 Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  {/* Left Column - Item Info & Instructions */}
                  <div className="space-y-4">
                    {/* Item Info */}
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <h4 className="font-bold mb-3" style={{ color: '#0F172A' }}>
                        Detail Peminjaman
                      </h4>
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={selectedLoan.itemImage}
                          alt={selectedLoan.itemName}
                          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Image';
                          }}
                        />
                        <div className="flex-1">
                          <h5 className="font-bold mb-2" style={{ color: '#0F172A' }}>
                            {selectedLoan.itemName}
                          </h5>
                          <div className="space-y-1">
                            <p className="text-sm" style={{ color: '#64748B' }}>
                              <span className="font-semibold">ID Peminjaman:</span> {selectedLoan.id}
                            </p>
                            <p className="text-sm" style={{ color: '#64748B' }}>
                              <span className="font-semibold">Jumlah:</span> {selectedLoan.quantity} unit
                            </p>
                            <p className="text-sm" style={{ color: '#64748B' }}>
                              <span className="font-semibold">Tanggal Pinjam:</span> {selectedLoan.borrowDate}
                            </p>
                            <p className="text-sm" style={{ color: '#64748B' }}>
                              <span className="font-semibold">Tanggal Kembali:</span> {selectedLoan.returnDate}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">📋</span>
                        </div>
                        <div>
                          <h4 className="font-bold mb-1" style={{ color: '#D97706' }}>
                            Langkah Pengembalian
                          </h4>
                          <p className="text-xs" style={{ color: '#92400E' }}>
                            Ikuti langkah-langkah berikut untuk mengembalikan barang
                          </p>
                        </div>
                      </div>
                      <ol className="space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ color: '#D97706' }}>1</span>
                          <span className="text-sm flex-1" style={{ color: '#92400E' }}>
                            Datang ke Gudang dengan membawa barang yang akan dikembalikan
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ color: '#D97706' }}>2</span>
                          <span className="text-sm flex-1" style={{ color: '#92400E' }}>
                            Tunjukkan QR Code ini ke Petugas Gudang untuk dipindai
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ color: '#D97706' }}>3</span>
                          <span className="text-sm flex-1" style={{ color: '#92400E' }}>
                            Petugas akan melakukan verifikasi kondisi barang (Baik/Rusak)
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ color: '#D97706' }}>4</span>
                          <span className="text-sm flex-1" style={{ color: '#92400E' }}>
                            Selesai! Status peminjaman akan otomatis terupdate
                          </span>
                        </li>
                      </ol>
                    </div>
                  </div>

                  {/* Right Column - QR Code */}
                  <div className="flex flex-col items-center justify-start">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-6 w-full">
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: '#BE1E2D' }}>
                          <QrCode className="w-8 h-8 text-white" strokeWidth={2} />
                        </div>
                        
                        <h4 className="text-lg font-bold mb-2 text-center" style={{ color: '#BE1E2D' }}>
                          Scan QR Code
                        </h4>
                        <p className="text-xs text-center mb-4" style={{ color: '#64748B' }}>
                          Tunjukkan QR Code ini ke Petugas Gudang
                        </p>
                        
                        {/* QR Code */}
                        <div className="bg-white p-6 rounded-3xl shadow-xl mb-4">
                          <div className="w-48 h-48 bg-white flex items-center justify-center border-4 border-gray-200 rounded-2xl">
                            <div className="text-center">
                              <QrCode className="w-36 h-36 mx-auto mb-2" style={{ color: '#0F172A' }} strokeWidth={0.5} />
                              <p className="font-mono font-bold" style={{ color: '#64748B' }}>
                                {selectedLoan.id}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-white px-5 py-2.5 rounded-full font-semibold text-center shadow-lg text-sm" style={{ backgroundColor: '#BE1E2D' }}>
                          ✨ Siap untuk Dipindai
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer - Action Buttons */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-xs flex-1 min-w-[200px]" style={{ color: '#64748B' }}>
                      Dengan mengkonfirmasi, Anda menyetujui untuk datang ke Gudang dan mengembalikan barang
                    </p>
                    <div className="flex gap-3 flex-shrink-0">
                      <button
                        onClick={() => setShowReturnModal(false)}
                        className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-md"
                        style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleConfirmReturn}
                        className="px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all hover:shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #BE1E2D 0%, #8B1621 100%)', color: '#FFFFFF' }}
                      >
                        <RotateCcw className="w-4 h-4" strokeWidth={2} />
                        Konfirmasi Pengembalian
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      <ItemDetailModal 
        item={selectedItem}
        user={user}
        onClose={() => setSelectedItem(null)}
        onSubmitLoan={onSubmitLoan}
      />
    </div>
  );
}