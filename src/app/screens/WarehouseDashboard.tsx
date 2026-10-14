import { useState } from 'react';
import { User, LoanRequest } from '../types';
import { LogOut, Search, Package, QrCode, CheckCircle, AlertCircle, Scan, User as UserIcon, Calendar, Hash, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import telkomLogo from 'figma:asset/623803f2801f48df421c6a73b102830c97d7f2c1.png';
import telkomBg from 'figma:asset/0e86c95630b818072ace687907edb996034e5029.png';

interface WarehouseDashboardProps {
  user: User;
  onLogout: () => void;
  loanRequests: LoanRequest[];
  onUpdateLoan: (loanId: string, updates: Partial<LoanRequest>) => void;
}

type ProcessMode = 'pickup' | 'return';
type ReturnCondition = 'good' | 'damaged' | 'lost';

export function WarehouseDashboard({ user, onLogout, loanRequests, onUpdateLoan }: WarehouseDashboardProps) {
  const [processMode, setProcessMode] = useState<ProcessMode>('pickup');
  const [searchId, setSearchId] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [returnCondition, setReturnCondition] = useState<ReturnCondition>('good');

  // Filter loans by status
  const approvedLoans = loanRequests.filter(l => l.status === 'approved');
  const activeLoans = loanRequests.filter(l => l.status === 'active');

  // Stats
  const stats = {
    readyForPickup: approvedLoans.length,
    currentlyBorrowed: activeLoans.length,
    handedOverToday: loanRequests.filter(l => 
      l.status === 'active' && 
      l.pickedUpDate === new Date().toISOString().split('T')[0]
    ).length,
    returnedToday: loanRequests.filter(l => 
      l.status === 'completed' && 
      l.actualReturnDate === new Date().toISOString().split('T')[0]
    ).length
  };

  // UC#5 Pickup - Cek Data (Search by ID or QR)
  const handleCheckData = () => {
    if (!searchId.trim()) {
      toast.error('⚠️ Masukkan ID Peminjaman atau scan QR Code!');
      return;
    }

    // Try to find loan by ID or QR code
    const loan = loanRequests.find(l => 
      l.id === searchId.toUpperCase() || 
      l.qrCode === searchId ||
      l.qrCode?.includes(searchId)
    );

    // Alternative Flow: Data Tidak Ditemukan
    if (!loan) {
      toast.error('❌ Data peminjaman tidak ditemukan. Periksa kembali ID atau QR Code.');
      setSelectedLoan(null);
      return;
    }

    // Check if status matches process mode
    if (processMode === 'pickup') {
      // For pickup: must be approved
      if (loan.status !== 'approved') {
        let statusMessage = '';
        if (loan.status === 'pending') {
          statusMessage = 'Peminjaman belum disetujui oleh Admin. Status: Menunggu Persetujuan.';
        } else if (loan.status === 'active') {
          statusMessage = 'Barang sudah diambil sebelumnya. Status: Sedang Dipinjam.';
        } else if (loan.status === 'completed') {
          statusMessage = 'Peminjaman sudah selesai. Barang telah dikembalikan.';
        } else if (loan.status === 'rejected') {
          statusMessage = 'Peminjaman ditolak oleh Admin.';
        }
        
        toast.error(`⚠️ ${statusMessage}`);
        setSelectedLoan(null);
        return;
      }
    } else {
      // For return: must be active
      if (loan.status !== 'active') {
        let statusMessage = '';
        if (loan.status === 'pending') {
          statusMessage = 'Barang belum diambil. Status: Menunggu Persetujuan.';
        } else if (loan.status === 'approved') {
          statusMessage = 'Barang belum diambil mahasiswa. Status: Disetujui (belum diambil).';
        } else if (loan.status === 'completed') {
          statusMessage = 'Barang sudah dikembalikan sebelumnya. Status: Selesai.';
        } else if (loan.status === 'rejected') {
          statusMessage = 'Peminjaman ditolak oleh Admin.';
        }
        
        toast.error(`⚠️ ${statusMessage}`);
        setSelectedLoan(null);
        return;
      }
    }

    // Success - Data found and status is correct
    setSelectedLoan(loan);
    toast.success(`✅ Data peminjaman ditemukan! Status: ${processMode === 'pickup' ? 'Disetujui' : 'Sedang Dipinjam'}`);
  };

  // UC#5 Pickup - Konfirmasi Serah Terima (Process Pickup)
  const handleConfirmHandover = () => {
    if (!selectedLoan) return;

    setIsProcessing(true);

    setTimeout(() => {
      onUpdateLoan(selectedLoan.id, {
        status: 'active',
        pickedUpDate: new Date().toISOString().split('T')[0],
        actualPickupTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      });

      toast.success(`✅ Barang berhasil diserahkan kepada ${selectedLoan.studentName}!`);
      
      setSelectedLoan(null);
      setSearchId('');
      setIsProcessing(false);
    }, 800);
  };

  // UC#6 Return - Proses Pengembalian
  const handleProcessReturn = () => {
    if (!selectedLoan) return;

    if (!returnCondition) {
      toast.error('⚠️ Pilih kondisi barang terlebih dahulu!');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      onUpdateLoan(selectedLoan.id, {
        status: 'completed',
        actualReturnDate: new Date().toISOString().split('T')[0],
        actualReturnTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        returnCondition: returnCondition
      });

      const conditionText = 
        returnCondition === 'good' ? 'dalam kondisi baik ✅' : 
        returnCondition === 'damaged' ? 'dengan kerusakan ⚠️' : 
        'barang hilang ❌';
      
      toast.success(`✅ Pengembalian berhasil diproses (${conditionText})!`);
      
      setSelectedLoan(null);
      setSearchId('');
      setReturnCondition('good');
      setIsProcessing(false);
    }, 800);
  };

  // Simulate QR Scanner
  const handleScanQR = () => {
    setShowScanner(true);
    
    setTimeout(() => {
      const loansToScan = processMode === 'pickup' ? approvedLoans : activeLoans;
      
      if (loansToScan.length > 0) {
        const firstLoan = loansToScan[0];
        setSearchId(firstLoan.id);
        setShowScanner(false);
        toast.success('📸 QR Code berhasil dipindai!');
        
        setTimeout(() => {
          setSelectedLoan(firstLoan);
          toast.success(`✅ Data peminjaman ditemukan! Status: ${processMode === 'pickup' ? 'Disetujui' : 'Sedang Dipinjam'}`);
        }, 300);
      } else {
        setShowScanner(false);
        toast.error(`❌ Tidak ada data yang dapat dipindai. Pastikan ada peminjaman dengan status ${processMode === 'pickup' ? 'Disetujui' : 'Sedang Dipinjam'}.`);
      }
    }, 1800);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      approved: { bg: '#D1FAE5', text: '#10B981', label: 'Disetujui' },
      active: { bg: '#DBEAFE', text: '#2563EB', label: 'Sedang Dipinjam' },
      pending: { bg: '#FEF3C7', text: '#F59E0B', label: 'Menunggu' },
      completed: { bg: '#E5E7EB', text: '#6B7280', label: 'Selesai' },
      rejected: { bg: '#FEE2E2', text: '#EF4444', label: 'Ditolak' }
    };
    
    const style = styles[status] || styles.approved;
    
    return (
      <span
        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {style.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div className="px-8 pt-6 pb-6 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${telkomBg})` }}
        />
        <div 
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.85) 0%, rgba(217, 119, 6, 0.90) 100%)' }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="max-w-[70px]">
                <img src={telkomLogo} alt="Telkom University" className="w-full h-auto" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                  Petugas Gudang
                </h1>
                <p className="text-sm text-white opacity-90">
                  Pembaruan Status Barang
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-semibold text-sm">Logout</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Siap Diambil', value: stats.readyForPickup, icon: CheckCircle, color: '#10B981' },
              { label: 'Sedang Dipinjam', value: stats.currentlyBorrowed, icon: Package, color: '#3B82F6' },
              { label: 'Diserahkan Hari Ini', value: stats.handedOverToday, icon: Package, color: '#F59E0B' },
              { label: 'Dikembalikan Hari Ini', value: stats.returnedToday, icon: RotateCcw, color: '#6B7280' }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: stat.color }} strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: '#64748B' }}>{stat.label}</p>
                      <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Process Mode Toggle */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setProcessMode('pickup');
                setSelectedLoan(null);
                setSearchId('');
                setReturnCondition('good');
              }}
              className="p-5 rounded-xl border-2 transition-all hover:shadow-lg"
              style={{
                borderColor: processMode === 'pickup' ? '#F59E0B' : 'rgba(255,255,255,0.3)',
                backgroundColor: processMode === 'pickup' ? '#FFFFFF' : 'rgba(255,255,255,0.15)'
              }}
            >
              <Package 
                className="w-10 h-10 mx-auto mb-3" 
                style={{ color: processMode === 'pickup' ? '#F59E0B' : '#FFFFFF' }} 
                strokeWidth={2} 
              />
              <p 
                className="font-bold text-center text-base"
                style={{ color: processMode === 'pickup' ? '#F59E0B' : '#FFFFFF' }}
              >
                Konfirmasi Pengambilan
              </p>
              <p className="text-xs text-center mt-1" style={{ color: processMode === 'pickup' ? '#64748B' : 'rgba(255,255,255,0.8)' }}>
                Serah terima barang ke mahasiswa
              </p>
            </button>

            <button
              onClick={() => {
                setProcessMode('return');
                setSelectedLoan(null);
                setSearchId('');
                setReturnCondition('good');
              }}
              className="p-5 rounded-xl border-2 transition-all hover:shadow-lg"
              style={{
                borderColor: processMode === 'return' ? '#10B981' : 'rgba(255,255,255,0.3)',
                backgroundColor: processMode === 'return' ? '#FFFFFF' : 'rgba(255,255,255,0.15)'
              }}
            >
              <RotateCcw 
                className="w-10 h-10 mx-auto mb-3" 
                style={{ color: processMode === 'return' ? '#10B981' : '#FFFFFF' }} 
                strokeWidth={2} 
              />
              <p 
                className="font-bold text-center text-base"
                style={{ color: processMode === 'return' ? '#10B981' : '#FFFFFF' }}
              >
                Pengembalian Barang
              </p>
              <p className="text-xs text-center mt-1" style={{ color: processMode === 'return' ? '#64748B' : 'rgba(255,255,255,0.8)' }}>
                Terima barang dari mahasiswa
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 max-w-[900px] mx-auto">
        {/* Process Form */}
        <div className="bg-white rounded-2xl p-6 shadow-md mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center" 
              style={{ backgroundColor: processMode === 'pickup' ? '#FEF3C7' : '#D1FAE5' }}
            >
              {processMode === 'pickup' ? (
                <Package className="w-6 h-6" style={{ color: '#F59E0B' }} strokeWidth={2} />
              ) : (
                <RotateCcw className="w-6 h-6" style={{ color: '#10B981' }} strokeWidth={2} />
              )}
            </div>
            <div>
              <h2 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                {processMode === 'pickup' ? 'Serah Terima Barang' : 'Pengembalian Barang'}
              </h2>
              <p className="text-sm" style={{ color: '#64748B' }}>
                {processMode === 'pickup' 
                  ? 'Konfirmasi pengambilan barang oleh mahasiswa' 
                  : 'Proses pengembalian barang dari mahasiswa'}
              </p>
            </div>
          </div>

          {/* Search Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                ID Peminjaman atau Scan QR Code
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#94A3B8' }} strokeWidth={1.5} />
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                    placeholder="Contoh: LR001 atau hasil scan QR"
                    className="w-full pl-12 pr-4 py-4 border-2 rounded-xl focus:outline-none text-base font-semibold"
                    style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                    onFocus={(e) => (e.target.style.borderColor = processMode === 'pickup' ? '#F59E0B' : '#10B981')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckData()}
                    disabled={showScanner}
                  />
                </div>
                <button
                  onClick={handleCheckData}
                  disabled={showScanner || !searchId.trim()}
                  className="px-8 py-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: processMode === 'pickup' ? '#F59E0B' : '#10B981' }}
                >
                  Cek Data
                </button>
                <button
                  onClick={handleScanQR}
                  disabled={showScanner}
                  className="px-6 py-4 rounded-xl font-semibold border-2 transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    borderColor: processMode === 'pickup' ? '#F59E0B' : '#10B981', 
                    color: processMode === 'pickup' ? '#F59E0B' : '#10B981' 
                  }}
                  title="Scan QR Code"
                >
                  <QrCode className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Scanner Animation */}
            {showScanner && (
              <div 
                className="p-8 rounded-xl text-center border-2 border-dashed" 
                style={{ 
                  backgroundColor: processMode === 'pickup' ? '#FFFBEB' : '#F0FDF4', 
                  borderColor: processMode === 'pickup' ? '#FEF3C7' : '#D1FAE5' 
                }}
              >
                <Scan 
                  className="w-20 h-20 mx-auto mb-4 animate-pulse" 
                  style={{ color: processMode === 'pickup' ? '#F59E0B' : '#10B981' }} 
                  strokeWidth={1.5} 
                />
                <p className="font-bold text-lg mb-2" style={{ color: '#0F172A' }}>Memindai QR Code...</p>
                <p className="text-sm" style={{ color: '#64748B' }}>Arahkan kamera ke QR Code mahasiswa</p>
              </div>
            )}

            {/* Selected Loan Details */}
            {selectedLoan && !showScanner && (
              <div 
                className="mt-6 p-6 rounded-2xl border-2" 
                style={{ 
                  borderColor: processMode === 'pickup' ? '#FEF3C7' : '#D1FAE5', 
                  backgroundColor: processMode === 'pickup' ? '#FFFBEB' : '#F0FDF4' 
                }}
              >
                <div 
                  className="flex items-center justify-between mb-5 pb-4" 
                  style={{ borderBottom: `2px solid ${processMode === 'pickup' ? '#FEF3C7' : '#D1FAE5'}` }}
                >
                  <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                    ✅ Data Ditemukan
                  </h3>
                  {getStatusBadge(selectedLoan.status)}
                </div>

                {/* Item Image & Name */}
                <div 
                  className="flex items-start gap-5 mb-6 pb-5" 
                  style={{ borderBottom: `1px solid ${processMode === 'pickup' ? '#FEF3C7' : '#D1FAE5'}` }}
                >
                  <img 
                    src={selectedLoan.itemImage} 
                    alt={selectedLoan.itemName}
                    className="w-28 h-28 rounded-xl object-cover shadow-md" 
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>
                      {processMode === 'pickup' ? 'BARANG YANG AKAN DISERAHKAN' : 'BARANG YANG DIKEMBALIKAN'}
                    </p>
                    <p className="font-bold text-xl mb-2" style={{ color: '#0F172A' }}>{selectedLoan.itemName}</p>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" style={{ color: processMode === 'pickup' ? '#F59E0B' : '#10B981' }} />
                      <span 
                        className="font-bold"
                        style={{ color: processMode === 'pickup' ? '#F59E0B' : '#10B981' }}
                      >
                        {selectedLoan.quantity} unit
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Peminjam */}
                <div className="mb-6">
                  <p className="text-xs font-semibold mb-3" style={{ color: '#64748B' }}>INFO PEMINJAM</p>
                  <div 
                    className="p-4 rounded-xl" 
                    style={{ 
                      backgroundColor: '#FFFFFF', 
                      border: `1px solid ${processMode === 'pickup' ? '#FEF3C7' : '#D1FAE5'}` 
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <UserIcon 
                        className="w-5 h-5 mt-0.5" 
                        style={{ color: processMode === 'pickup' ? '#F59E0B' : '#10B981' }} 
                        strokeWidth={2} 
                      />
                      <div className="flex-1">
                        <p className="text-xs mb-1" style={{ color: '#64748B' }}>Nama Mahasiswa</p>
                        <p className="font-bold" style={{ color: '#0F172A' }}>{selectedLoan.studentName}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748B' }}>NIM</p>
                        <p className="font-semibold" style={{ color: '#0F172A' }}>{selectedLoan.studentId}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#64748B' }}>Email</p>
                        <p className="font-semibold truncate" style={{ color: '#0F172A' }}>{selectedLoan.studentEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Jadwal Peminjaman */}
                <div className="mb-6">
                  <p className="text-xs font-semibold mb-3" style={{ color: '#64748B' }}>JADWAL PEMINJAMAN</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className="p-3 rounded-xl" 
                      style={{ 
                        backgroundColor: '#FFFFFF', 
                        border: `1px solid ${processMode === 'pickup' ? '#FEF3C7' : '#D1FAE5'}` 
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4" style={{ color: '#10B981' }} />
                        <p className="text-xs font-semibold" style={{ color: '#64748B' }}>Tanggal Pinjam</p>
                      </div>
                      <p className="font-bold" style={{ color: '#0F172A' }}>{selectedLoan.borrowDate}</p>
                    </div>
                    <div 
                      className="p-3 rounded-xl" 
                      style={{ 
                        backgroundColor: '#FFFFFF', 
                        border: `1px solid ${processMode === 'pickup' ? '#FEF3C7' : '#D1FAE5'}` 
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4" style={{ color: '#EF4444' }} />
                        <p className="text-xs font-semibold" style={{ color: '#64748B' }}>Batas Kembali</p>
                      </div>
                      <p className="font-bold" style={{ color: '#0F172A' }}>{selectedLoan.returnDate}</p>
                    </div>
                  </div>
                </div>

                {/* Return Condition Selection (only for return mode) */}
                {processMode === 'return' && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-3" style={{ color: '#334155' }}>
                      Kondisi Barang <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'good', label: 'Baik', icon: CheckCircle, color: '#10B981', bg: '#D1FAE5', desc: 'Tidak ada kerusakan' },
                        { value: 'damaged', label: 'Rusak', icon: AlertTriangle, color: '#F59E0B', bg: '#FEF3C7', desc: 'Ada kerusakan' },
                        { value: 'lost', label: 'Hilang', icon: AlertCircle, color: '#EF4444', bg: '#FEE2E2', desc: 'Barang hilang' }
                      ].map((condition) => {
                        const Icon = condition.icon;
                        return (
                          <button
                            key={condition.value}
                            onClick={() => setReturnCondition(condition.value as ReturnCondition)}
                            className="p-4 rounded-xl border-2 transition-all hover:shadow-md"
                            style={{
                              borderColor: returnCondition === condition.value ? condition.color : '#E2E8F0',
                              backgroundColor: returnCondition === condition.value ? condition.bg : '#FFFFFF'
                            }}
                          >
                            <Icon 
                              className="w-8 h-8 mx-auto mb-2" 
                              style={{ color: returnCondition === condition.value ? condition.color : '#94A3B8' }} 
                              strokeWidth={2}
                            />
                            <p 
                              className="font-bold text-sm mb-1"
                              style={{ color: returnCondition === condition.value ? condition.color : '#64748B' }}
                            >
                              {condition.label}
                            </p>
                            <p className="text-xs" style={{ color: '#64748B' }}>
                              {condition.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Keperluan (only for pickup) */}
                {processMode === 'pickup' && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>KEPERLUAN</p>
                    <p 
                      className="text-sm p-3 rounded-xl" 
                      style={{ backgroundColor: '#FFFFFF', color: '#475569', border: '1px solid #FEF3C7' }}
                    >
                      {selectedLoan.reason}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => {
                      setSelectedLoan(null);
                      setSearchId('');
                      setReturnCondition('good');
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-4 rounded-xl font-semibold border-2 transition-all hover:bg-gray-50 disabled:opacity-50"
                    style={{ borderColor: '#E2E8F0', color: '#64748B' }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={processMode === 'pickup' ? handleConfirmHandover : handleProcessReturn}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: processMode === 'pickup' ? '#F59E0B' : '#10B981' }}
                  >
                    {isProcessing ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⏳</span>
                        Memproses...
                      </>
                    ) : processMode === 'pickup' ? (
                      <>
                        <Package className="w-5 h-5 inline mr-2" />
                        Serahkan Barang
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 inline mr-2" />
                        Proses Kembali
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick List */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                {processMode === 'pickup' ? 'Daftar Barang Siap Diambil' : 'Daftar Barang Sedang Dipinjam'}
              </h2>
              <p className="text-sm" style={{ color: '#64748B' }}>
                {processMode === 'pickup' 
                  ? 'Peminjaman yang sudah disetujui Admin' 
                  : 'Barang yang sedang dipinjam mahasiswa'}
              </p>
            </div>
            <span 
              className="px-4 py-2 rounded-xl font-bold text-lg"
              style={{ 
                backgroundColor: processMode === 'pickup' ? '#FEF3C7' : '#DBEAFE', 
                color: processMode === 'pickup' ? '#F59E0B' : '#2563EB' 
              }}
            >
              {processMode === 'pickup' ? stats.readyForPickup : stats.currentlyBorrowed}
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {(processMode === 'pickup' ? approvedLoans : activeLoans).length === 0 ? (
              <div className="text-center py-12 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#CBD5E1' }} strokeWidth={1.5} />
                <p className="font-bold text-lg mb-2" style={{ color: '#0F172A' }}>
                  {processMode === 'pickup' ? 'Tidak Ada Barang Siap Diambil' : 'Tidak Ada Barang Dipinjam'}
                </p>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  {processMode === 'pickup' 
                    ? 'Belum ada peminjaman yang disetujui' 
                    : 'Belum ada barang yang sedang dipinjam'}
                </p>
              </div>
            ) : (
              (processMode === 'pickup' ? approvedLoans : activeLoans).map(loan => (
                <div
                  key={loan.id}
                  onClick={() => {
                    setSearchId(loan.id);
                    setSelectedLoan(loan);
                  }}
                  className="p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all"
                  style={{ 
                    borderColor: selectedLoan?.id === loan.id 
                      ? (processMode === 'pickup' ? '#F59E0B' : '#10B981')
                      : '#E2E8F0',
                    backgroundColor: selectedLoan?.id === loan.id 
                      ? (processMode === 'pickup' ? '#FFFBEB' : '#F0FDF4')
                      : '#FFFFFF'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <img src={loan.itemImage} className="w-20 h-20 rounded-xl object-cover shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold mb-1 truncate" style={{ color: '#0F172A' }}>{loan.itemName}</p>
                      <p className="text-xs mb-2" style={{ color: '#64748B' }}>
                        👤 {loan.studentName} • 📦 {loan.quantity} unit
                      </p>
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-xs font-bold px-2 py-1 rounded" 
                          style={{ 
                            backgroundColor: processMode === 'pickup' ? '#FEF3C7' : '#DBEAFE', 
                            color: processMode === 'pickup' ? '#F59E0B' : '#2563EB' 
                          }}
                        >
                          ID: {loan.id}
                        </span>
                        {getStatusBadge(loan.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}