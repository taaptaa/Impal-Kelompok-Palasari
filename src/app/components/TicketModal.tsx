import { X, Calendar, Package, User, Hash } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LoanRequest } from '../types';

interface TicketModalProps {
  loan: LoanRequest;
  onClose: () => void;
}

export function TicketModal({ loan, onClose }: TicketModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          boxShadow: 'var(--shadow-xl)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        {/* Header */}
        <div 
          className="p-6 text-white relative"
          style={{ 
            background: 'linear-gradient(135deg, #2563EB 0%, #1e40af 100%)'
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            <X className="w-5 h-5 text-white" strokeWidth={1.5} />
          </button>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-white font-bold mb-2">
              Tiket Peminjaman
            </h2>
            <p className="text-sm opacity-90">
              {loan.status === 'approved' ? 'Siap untuk diambil' : 'Sedang dipinjam'}
            </p>
          </div>
        </div>

        {/* QR Code */}
        <div className="p-8 bg-gray-50">
          <div className="bg-white p-6 rounded-2xl shadow-lg mx-auto w-fit">
            <QRCodeSVG 
              value={loan.qrCode || loan.id} 
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-center mt-4 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            📱 Tunjukkan QR Code ini kepada Petugas Gudang
          </p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {/* ID Peminjaman */}
          <div className="flex items-start gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: 'var(--color-primary)10',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <Hash className="w-5 h-5" style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                ID Peminjaman
              </p>
              <p className="font-semibold" style={{ color: 'var(--color-navy)' }}>
                {loan.id}
              </p>
            </div>
          </div>

          {/* Nama Barang */}
          <div className="flex items-start gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: 'var(--color-success)10',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <Package className="w-5 h-5" style={{ color: 'var(--color-success)' }} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Nama Barang
              </p>
              <p className="font-semibold" style={{ color: 'var(--color-navy)' }}>
                {loan.itemName}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Jumlah: {loan.quantity} unit
              </p>
            </div>
          </div>

          {/* Periode */}
          <div className="flex items-start gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: 'var(--color-warning)10',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <Calendar className="w-5 h-5" style={{ color: 'var(--color-warning)' }} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Periode Peminjaman
              </p>
              <p className="font-semibold" style={{ color: 'var(--color-navy)' }}>
                {loan.borrowDate} s/d {loan.returnDate}
              </p>
            </div>
          </div>

          {/* Peminjam */}
          <div className="flex items-start gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: 'var(--color-info)10',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <User className="w-5 h-5" style={{ color: 'var(--color-info)' }} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Peminjam
              </p>
              <p className="font-semibold" style={{ color: 'var(--color-navy)' }}>
                {loan.studentName}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t border-gray-200"
          style={{ backgroundColor: 'var(--color-gray-100)' }}
        >
          <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
            ⚠️ Jaga barang dengan baik dan kembalikan sesuai jadwal
          </p>
        </div>
      </div>
    </div>
  );
}
