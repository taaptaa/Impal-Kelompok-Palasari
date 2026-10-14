import { useState } from 'react';
import { Item, User } from '../types';
import { X, CheckCircle, XCircle, AlertCircle, Package, Calendar, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface ItemDetailModalProps {
  item: Item | null;
  user: User;
  onClose: () => void;
  onSubmitLoan?: (data: { itemId: string; borrowDate: string; returnDate: string; quantity: number; reason: string }) => void;
}

export function ItemDetailModal({ item, user, onClose, onSubmitLoan }: ItemDetailModalProps) {
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [borrowDate, setBorrowDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [reason, setReason] = useState('');

  if (!item) return null;

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

  const statusConfig = getStatusBadge(item.status);
  const StatusIcon = statusConfig.icon;

  const handleSubmitLoan = (e: React.FormEvent) => {
    e.preventDefault();

    if (!borrowDate || !returnDate || !reason.trim() || quantity < 1) {
      toast.error('Mohon lengkapi semua field');
      return;
    }

    if (new Date(borrowDate) >= new Date(returnDate)) {
      toast.error('Tanggal kembali harus setelah tanggal pinjam');
      return;
    }

    if (quantity > item.availableStock) {
      toast.error(`Stok tersedia hanya ${item.availableStock} unit`);
      return;
    }

    if (onSubmitLoan) {
      onSubmitLoan({
        itemId: item.id,
        borrowDate,
        returnDate,
        quantity,
        reason
      });
      toast.success('🎉 Pengajuan peminjaman berhasil dikirim!');
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-[600px] w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between sticky top-0 z-10"
          style={{ backgroundColor: '#BE1E2D' }}
        >
          <h2 className="font-bold text-white" style={{ fontSize: '18px', color: '#FFFFFF' }}>
            {showLoanForm ? 'Ajukan Peminjaman' : 'Detail Barang'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            <X className="w-5 h-5 text-white" strokeWidth={2} />
          </button>
        </div>

        {/* Modal Content */}
        {!showLoanForm ? (
          <div className="p-6">
            {/* Image */}
            <div 
              className="w-full h-56 rounded-xl bg-cover bg-center mb-6"
              style={{ 
                backgroundImage: `url(${item.imageUrl})`,
                backgroundColor: '#F1F5F9'
              }}
            />

            {/* Item Info */}
            <div className="space-y-5">
              <div>
                <p className="text-xs mb-2 font-semibold" style={{ color: '#64748B' }}>
                  Nama Barang
                </p>
                <p className="font-bold" style={{ color: '#0F172A', fontSize: '20px' }}>
                  {item.name}
                </p>
              </div>

              <div>
                <p className="text-xs mb-2 font-semibold" style={{ color: '#64748B' }}>
                  Deskripsi
                </p>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                  {item.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-2 font-semibold" style={{ color: '#64748B' }}>
                    Kategori
                  </p>
                  <span 
                    className="inline-block px-3 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ 
                      backgroundColor: '#F1F5F9',
                      color: '#475569'
                    }}
                  >
                    {getCategoryLabel(item.category)}
                  </span>
                </div>
                <div>
                  <p className="text-xs mb-2 font-semibold" style={{ color: '#64748B' }}>
                    Status
                  </p>
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: statusConfig.bgColor }}
                  >
                    <StatusIcon 
                      className="w-4 h-4" 
                      style={{ color: statusConfig.textColor }}
                      strokeWidth={2}
                    />
                    <span 
                      className="text-sm font-semibold"
                      style={{ color: statusConfig.textColor }}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-2 font-semibold" style={{ color: '#64748B' }}>
                    Stok Total
                  </p>
                  <p className="font-bold text-lg" style={{ color: '#0F172A' }}>
                    {item.totalStock} <span className="text-sm font-normal" style={{ color: '#64748B' }}>unit</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-2 font-semibold" style={{ color: '#64748B' }}>
                    Stok Tersedia
                  </p>
                  <p 
                    className="font-bold text-lg"
                    style={{ 
                      color: item.availableStock === 0 ? '#EF4444' : 
                             item.availableStock <= 5 ? '#F59E0B' : '#10B981'
                    }}
                  >
                    {item.availableStock} <span className="text-sm font-normal" style={{ color: '#64748B' }}>unit</span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs mb-2 font-semibold" style={{ color: '#64748B' }}>
                  Kondisi
                </p>
                <p className="text-sm" style={{ color: '#475569' }}>
                  {item.condition}
                </p>
              </div>

              {item.specifications && item.specifications.length > 0 && (
                <div>
                  <p className="text-xs mb-3 font-semibold" style={{ color: '#64748B' }}>
                    Spesifikasi
                  </p>
                  <ul className="space-y-2">
                    {item.specifications.map((spec, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span 
                          className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" 
                          style={{ backgroundColor: '#BE1E2D' }}
                        />
                        <span className="text-sm flex-1" style={{ color: '#475569' }}>
                          {spec}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3.5 rounded-xl font-semibold border-2 transition-all hover:bg-gray-50"
                style={{ 
                  borderColor: '#E2E8F0',
                  color: '#64748B',
                  fontSize: '15px'
                }}
              >
                Tutup
              </button>
              {user.role === 'student' && item.availableStock > 0 && (
                <button
                  onClick={() => setShowLoanForm(true)}
                  className="flex-1 px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
                  style={{ 
                    backgroundColor: '#BE1E2D',
                    fontSize: '15px'
                  }}
                >
                  Ajukan Peminjaman
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Loan Form */
          <form onSubmit={handleSubmitLoan} className="p-6">
            {/* Item Summary */}
            <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${item.imageUrl})` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate" style={{ color: '#0F172A' }}>
                    {item.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                    Tersedia: <span className="font-semibold" style={{ color: '#10B981' }}>{item.availableStock} unit</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Jumlah Barang
                </label>
                <div className="relative">
                  <Hash
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: '#94A3B8' }}
                    strokeWidth={1.5}
                  />
                  <input
                    type="number"
                    min="1"
                    max={item.availableStock}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors"
                    style={{ 
                      borderColor: '#E2E8F0',
                      fontSize: '15px'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              </div>

              {/* Borrow Date */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Tanggal Pinjam
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: '#94A3B8' }}
                    strokeWidth={1.5}
                  />
                  <input
                    type="date"
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors"
                    style={{ 
                      borderColor: '#E2E8F0',
                      fontSize: '15px'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              </div>

              {/* Return Date */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Tanggal Kembali
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: '#94A3B8' }}
                    strokeWidth={1.5}
                  />
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={borrowDate || new Date().toISOString().split('T')[0]}
                    className="w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-colors"
                    style={{ 
                      borderColor: '#E2E8F0',
                      fontSize: '15px'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Keperluan Peminjaman
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Untuk acara seminar mahasiswa Teknik Informatika"
                  rows={4}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors resize-none"
                  style={{ 
                    borderColor: '#E2E8F0',
                    fontSize: '15px'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLoanForm(false)}
                className="flex-1 px-6 py-3.5 rounded-xl font-semibold border-2 transition-all hover:bg-gray-50"
                style={{ 
                  borderColor: '#E2E8F0',
                  color: '#64748B',
                  fontSize: '15px'
                }}
              >
                Kembali
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
                style={{ 
                  backgroundColor: '#BE1E2D',
                  fontSize: '15px'
                }}
              >
                Kirim Pengajuan
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
