import { useState } from 'react';
import { User, LoanRequest } from '../types';
import { Calendar, Package, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface HistoryScreenProps {
  user: User;
  loans: LoanRequest[];
}

export function HistoryScreen({ user, loans }: HistoryScreenProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'active' | 'completed'>('all');
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
  const [showQR, setShowQR] = useState(false);

  const filteredLoans = filter === 'all' 
    ? loans 
    : loans.filter(loan => loan.status === filter);

  const handleShowQR = (loan: LoanRequest) => {
    if ((loan.status === 'approved' || loan.status === 'active') && loan.qrCode) {
      setSelectedLoan(loan);
      setShowQR(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold mb-4" style={{ color: '#333333' }}>
          Riwayat Peminjaman
        </h1>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Disetujui' },
            { id: 'active', label: 'Aktif' },
            { id: 'completed', label: 'Selesai' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                filter === tab.id
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              style={filter === tab.id ? { backgroundColor: '#BE1E2D' } : { color: '#64748B' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loans List */}
      <div className="px-6 py-6 pb-24">
        <p className="text-sm mb-4" style={{ color: '#64748B' }}>
          {filteredLoans.length} peminjaman
        </p>

        {filteredLoans.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#CBD5E1' }} strokeWidth={1.5} />
            <p className="font-semibold mb-2" style={{ color: '#0F172A' }}>
              Tidak ada riwayat
            </p>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Anda belum memiliki peminjaman
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLoans.map((loan) => (
              <div
                key={loan.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-transparent hover:border-gray-100 transition-all"
              >
                <div className="p-4">
                  <div className="flex gap-4 mb-3">
                    <img
                      src={loan.itemImage}
                      alt={loan.itemName}
                      className="w-20 h-20 rounded-xl object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Image';
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-sm" style={{ color: '#0F172A' }}>
                          {loan.itemName}
                        </h3>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor:
                              loan.status === 'approved' ? '#D1FAE5' :
                              loan.status === 'pending' ? '#FEF3C7' :
                              loan.status === 'active' ? '#FEE2E2' :
                              loan.status === 'completed' ? '#E0E7FF' :
                              '#FEE2E2',
                            color:
                              loan.status === 'approved' ? '#10B981' :
                              loan.status === 'pending' ? '#F59E0B' :
                              loan.status === 'active' ? '#EF4444' :
                              loan.status === 'completed' ? '#6366F1' :
                              '#EF4444'
                          }}
                        >
                          {loan.status === 'approved' ? 'Disetujui' :
                           loan.status === 'pending' ? 'Pending' :
                           loan.status === 'active' ? 'Aktif' :
                           loan.status === 'completed' ? 'Selesai' :
                           'Ditolak'}
                        </span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: '#64748B' }}>
                        ID: {loan.id}
                      </p>
                      <p className="text-xs" style={{ color: '#64748B' }}>
                        Jumlah: {loan.quantity} unit
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                      <Calendar className="w-4 h-4" style={{ color: '#94A3B8' }} strokeWidth={1.5} />
                      <div>
                        <p className="text-xs" style={{ color: '#64748B' }}>Pinjam</p>
                        <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{loan.borrowDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                      <Calendar className="w-4 h-4" style={{ color: '#94A3B8' }} strokeWidth={1.5} />
                      <div>
                        <p className="text-xs" style={{ color: '#64748B' }}>Kembali</p>
                        <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{loan.returnDate}</p>
                      </div>
                    </div>
                  </div>

                  {loan.reason && (
                    <div className="p-3 bg-gray-50 rounded-xl mb-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>
                        Alasan:
                      </p>
                      <p className="text-xs" style={{ color: '#0F172A' }}>
                        {loan.reason}
                      </p>
                    </div>
                  )}

                  {(loan.status === 'approved' || loan.status === 'active') && loan.qrCode && (
                    <button
                      onClick={() => handleShowQR(loan)}
                      className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 shadow-sm shadow-red-100"
                      style={{ backgroundColor: '#BE1E2D', color: '#FFFFFF' }}
                    >
                      <QrCode className="w-5 h-5" strokeWidth={2} />
                      Tampilkan QR Code
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && selectedLoan && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white w-full flex flex-col sm:max-w-[600px] sm:max-h-[85vh] max-h-[90vh] rounded-t-3xl sm:rounded-3xl animate-slide-up sm:animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold" style={{ color: '#333333' }}>
                Tiket Peminjaman
              </h3>
              <button
                onClick={() => setShowQR(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" strokeWidth={1.5} color="#64748B" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-6 overflow-y-auto flex-1">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 flex items-center justify-center rounded-2xl" style={{ backgroundColor: '#FFF5F5' }}>
                  <QrCode className="w-10 h-10" style={{ color: '#BE1E2D' }} strokeWidth={1.5} />
                </div>
              </div>

              {/* Instruction */}
              <div className="text-center mb-8">
                <h4 className="text-lg font-bold mb-2" style={{ color: '#333333' }}>
                  Tunjukkan QR Code Ini
                </h4>
                <p className="text-sm px-8" style={{ color: '#64748B' }}>
                  Scan QR code di bawah kepada petugas gudang untuk mengambil barang
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-8">
                <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-200 shadow-sm">
                  <QRCodeSVG 
                    value={selectedLoan.qrCode || ''} 
                    size={240}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* Loan Details */}
              <div className="space-y-4">
                {/* ID */}
                <div className="bg-[#FFF5F5] p-5 rounded-2xl border border-red-100">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#BE1E2D' }}>
                    ID PEMINJAMAN
                  </p>
                  <p className="font-bold text-xl" style={{ color: '#333333' }}>
                    {selectedLoan.id}
                  </p>
                </div>

                {/* Item Details */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-start gap-4">
                    <img
                      src={selectedLoan.itemImage}
                      alt={selectedLoan.itemName}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-white"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Image';
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>
                        BARANG
                      </p>
                      <p className="font-bold text-base mb-2" style={{ color: '#333333' }}>
                        {selectedLoan.itemName}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>Jumlah</p>
                          <p className="text-sm font-bold" style={{ color: '#BE1E2D' }}>
                            {selectedLoan.quantity} unit
                          </p>
                        </div>
                        <div>
                          <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>Status</p>
                          <p className="text-sm font-bold" style={{ color: '#10B981' }}>
                            {selectedLoan.status === 'approved' ? 'Disetujui' : 'Aktif'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>
                      TANGGAL PINJAM
                    </p>
                    <p className="font-bold text-sm" style={{ color: '#333333' }}>
                      {new Date(selectedLoan.borrowDate).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>
                      TANGGAL KEMBALI
                    </p>
                    <p className="font-bold text-sm" style={{ color: '#333333' }}>
                      {new Date(selectedLoan.returnDate).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                {/* Student Info */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>
                    PEMINJAM
                  </p>
                  <p className="font-bold text-sm" style={{ color: '#333333' }}>
                    {selectedLoan.studentName}
                  </p>
                  <p className="text-xs" style={{ color: '#64748B' }}>
                    {selectedLoan.studentEmail}
                  </p>
                </div>
              </div>

              {/* Note */}
              <div className="mt-6 p-4 bg-[#FFF5F5] rounded-2xl border border-red-100">
                <p className="text-xs text-center font-medium" style={{ color: '#BE1E2D' }}>
                  💡 <strong>Tips:</strong> Screenshot QR code ini untuk memudahkan pengambilan barang
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}