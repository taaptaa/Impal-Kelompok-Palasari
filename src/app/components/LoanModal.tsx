import { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Item } from '../types';

interface LoanModalProps {
  item: Item;
  onClose: () => void;
  onSubmit: (data: { borrowDate: string; returnDate: string; quantity: number; reason: string }) => void;
}

export function LoanModal({ item, onClose, onSubmit }: LoanModalProps) {
  const [borrowDate, setBorrowDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ borrowDate, returnDate, quantity, reason });
  };

  // Calculate duration
  const getDuration = () => {
    if (!borrowDate || !returnDate) return null;
    const start = new Date(borrowDate);
    const end = new Date(returnDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  };

  const duration = getDuration();

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= item.availableStock) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-0 md:p-4"
      onClick={onClose}
    >
      {/* Bottom Sheet for Mobile, Modal for Desktop */}
      <div 
        className="bg-white w-full md:max-w-2xl md:rounded-xl rounded-t-3xl md:rounded-b-xl max-h-[90vh] overflow-y-auto animate-slide-up"
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

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'var(--color-navy)' }}>
            Ajukan Peminjaman
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4 md:p-6">
          {/* Item Info */}
          <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/200?text=No+Image';
                }}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1" style={{ color: 'var(--color-navy)' }}>
                {item.name}
              </h3>
              <p className="text-xs mb-2 capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                {item.category}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Stok tersedia: <span className="font-semibold" style={{ color: 'var(--color-success)' }}>
                  {item.availableStock} unit
                </span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Tanggal Pinjam
                </label>
                <input
                  type="date"
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ 
                    '--tw-ring-color': 'var(--color-primary)',
                    borderRadius: 'var(--radius-md)'
                  } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Tanggal Kembali
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={borrowDate || new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ 
                    '--tw-ring-color': 'var(--color-primary)',
                    borderRadius: 'var(--radius-md)'
                  } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Duration Summary */}
            {duration && duration > 0 && (
              <div 
                className="p-3 rounded-lg flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-primary)', opacity: 0.1 }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                  📅 Durasi peminjaman: {duration} hari
                </span>
              </div>
            )}

            {/* Quantity Stepper */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Jumlah Barang
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="p-3 border border-gray-300 transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  <Minus className="w-5 h-5" strokeWidth={1.5} />
                </button>
                
                <div 
                  className="flex-1 px-6 py-3 border-2 text-center font-semibold text-lg"
                  style={{ 
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  {quantity} unit
                </div>
                
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= item.availableStock}
                  className="p-3 border border-gray-300 transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  <Plus className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                Maksimal {item.availableStock} unit tersedia
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Alasan Peminjaman
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
                placeholder="Jelaskan kebutuhan peminjaman Anda..."
                className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                style={{ 
                  '--tw-ring-color': 'var(--color-primary)',
                  borderRadius: 'var(--radius-md)'
                } as React.CSSProperties}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 transition-colors hover:bg-gray-50"
                style={{ 
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 text-white transition-all hover:opacity-90 font-medium"
                style={{ 
                  backgroundColor: 'var(--color-primary)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Konfirmasi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}