import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { LoanRequest } from '../types';

interface ReturnModalProps {
  loan: LoanRequest;
  onReturn: (loanId: string, condition: 'good' | 'damaged' | 'lost') => void;
  onClose: () => void;
}

export function ReturnModal({ loan, onReturn, onClose }: ReturnModalProps) {
  const handleReturn = (condition: 'good' | 'damaged' | 'lost') => {
    onReturn(loan.id, condition);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          boxShadow: 'var(--shadow-xl)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold mb-2" style={{ color: 'var(--color-navy)' }}>
                Verifikasi Pengembalian
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Periksa kondisi barang sebelum menyelesaikan peminjaman
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Loan Details */}
        <div className="p-6 bg-gray-50">
          <div className="flex gap-4 mb-4">
            <img
              src={loan.itemImage}
              alt={loan.itemName}
              className="w-20 h-20 object-cover"
              style={{ borderRadius: 'var(--radius-md)' }}
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Image';
              }}
            />
            <div className="flex-1">
              <h3 className="font-semibold mb-1" style={{ color: 'var(--color-navy)' }}>
                {loan.itemName}
              </h3>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Jumlah: {loan.quantity} unit
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Peminjam: {loan.studentName}
              </p>
            </div>
          </div>

          <div 
            className="p-3 border-l-4"
            style={{ 
              backgroundColor: 'var(--color-info)10',
              borderLeftColor: 'var(--color-info)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              <strong>Periode:</strong> {loan.borrowDate} - {loan.returnDate}
            </p>
          </div>
        </div>

        {/* Condition Check */}
        <div className="p-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--color-navy)' }}>
            Kondisi Barang Kembali:
          </h3>

          <div className="space-y-3">
            {/* Good Condition */}
            <button
              onClick={() => handleReturn('good')}
              className="w-full p-4 border-2 transition-all hover:shadow-md group text-left"
              style={{ 
                borderColor: 'var(--color-success)',
                borderRadius: 'var(--radius-lg)'
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-full"
                  style={{ 
                    backgroundColor: 'var(--color-success)',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  <CheckCircle className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--color-success)' }}>
                    Baik
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Barang kembali dalam kondisi lengkap dan berfungsi dengan baik
                  </p>
                </div>
              </div>
            </button>

            {/* Damaged Condition */}
            <button
              onClick={() => handleReturn('damaged')}
              className="w-full p-4 border-2 transition-all hover:shadow-md group text-left"
              style={{ 
                borderColor: 'var(--color-warning)',
                borderRadius: 'var(--radius-lg)'
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-full"
                  style={{ 
                    backgroundColor: 'var(--color-warning)',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  <AlertTriangle className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--color-warning)' }}>
                    Rusak
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Barang mengalami kerusakan atau ada bagian yang hilang
                  </p>
                </div>
              </div>
            </button>

            {/* Lost Condition */}
            <button
              onClick={() => handleReturn('lost')}
              className="w-full p-4 border-2 transition-all hover:shadow-md group text-left"
              style={{ 
                borderColor: 'var(--color-error)',
                borderRadius: 'var(--radius-lg)'
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-full"
                  style={{ 
                    backgroundColor: 'var(--color-error)',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  <XCircle className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--color-error)' }}>
                    Hilang
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Barang tidak dikembalikan atau hilang
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t border-gray-200"
          style={{ backgroundColor: 'var(--color-gray-100)' }}
        >
          <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
            ⚠️ Pastikan verifikasi kondisi barang sudah benar sebelum menyelesaikan
          </p>
        </div>
      </div>
    </div>
  );
}
