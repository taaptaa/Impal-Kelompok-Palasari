import { useState } from 'react';
import { User, LoanRequest, Item } from '../types';
import { LogOut, Plus, Package, CheckCircle, XCircle, Clock, Search, Filter, Edit2, Trash2, Save, X, BarChart3, Users, AlertCircle, Eye, Check } from 'lucide-react';
import { toast } from 'sonner';
import telkomLogo from 'figma:asset/623803f2801f48df421c6a73b102830c97d7f2c1.png';
import telkomBg from 'figma:asset/0e86c95630b818072ace687907edb996034e5029.png';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  loanRequests: LoanRequest[];
  onUpdateLoan: (loanId: string, updates: Partial<LoanRequest>) => void;
  items: Item[];
  onUpdateItems?: (items: Item[]) => void;
}

type TabType = 'pending' | 'approved' | 'active' | 'completed' | 'rejected' | 'all';
type ViewMode = 'approval' | 'inventory';

export function AdminDashboard({ user, onLogout, loanRequests, onUpdateLoan, items, onUpdateItems }: AdminDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('approval');
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  
  // Inventory management states
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    category: 'electronics' as Item['category'],
    totalStock: 0,
    condition: '',
    imageUrl: ''
  });

  // Stats calculation
  const stats = {
    totalLoans: loanRequests.length,
    pending: loanRequests.filter(l => l.status === 'pending').length,
    active: loanRequests.filter(l => l.status === 'active').length,
    criticalStock: items.filter(i => i.availableStock < 3).length
  };

  // Filter loans
  const filteredLoans = loanRequests.filter(loan => {
    const matchesTab = activeTab === 'all' || loan.status === activeTab;
    const matchesSearch = loan.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         loan.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         loan.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // UC#4 - Approve loan
  const handleApprove = () => {
    if (!selectedLoan) return;
    
    const qrData = `SMARTLEND:${selectedLoan.id}:${selectedLoan.itemId}:${selectedLoan.quantity}`;
    
    onUpdateLoan(selectedLoan.id, {
      status: 'approved',
      approvedBy: user.name,
      approvedDate: new Date().toISOString().split('T')[0],
      qrCode: qrData,
      notes: adminNotes || undefined
    });
    
    toast.success(`✅ Peminjaman ${selectedLoan.id} berhasil disetujui!`);
    setSelectedLoan(null);
    setAdminNotes('');
  };

  // UC#4 - Reject loan
  const handleReject = () => {
    if (!selectedLoan || !rejectReason) return;
    
    if (rejectReason.length < 10) {
      toast.error('Alasan penolakan minimal 10 karakter!');
      return;
    }

    onUpdateLoan(selectedLoan.id, {
      status: 'rejected',
      approvedBy: user.name,
      approvedDate: new Date().toISOString().split('T')[0],
      rejectReason: rejectReason
    });
    
    toast.error(`❌ Peminjaman ${selectedLoan.id} ditolak`);
    setSelectedLoan(null);
    setShowRejectModal(false);
    setRejectReason('');
  };

  // UC#6 - Add/Edit Item
  const handleSaveItem = () => {
    if (!itemForm.name || !itemForm.description || itemForm.totalStock < 1) {
      toast.error('Mohon lengkapi semua field!');
      return;
    }

    if (editingItem) {
      // Edit existing item
      const updatedItems = items.map(item =>
        item.id === editingItem.id
          ? {
              ...item,
              ...itemForm,
              availableStock: item.availableStock + (itemForm.totalStock - item.totalStock)
            }
          : item
      );
      if (onUpdateItems) onUpdateItems(updatedItems);
      toast.success('✅ Barang berhasil diperbarui!');
    } else {
      // Add new item
      const newItem: Item = {
        id: String(items.length + 1),
        ...itemForm,
        availableStock: itemForm.totalStock,
        status: 'available',
        imageUrl: itemForm.imageUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400'
      };
      if (onUpdateItems) onUpdateItems([...items, newItem]);
      toast.success('✅ Barang baru berhasil ditambahkan!');
    }

    setShowItemForm(false);
    setEditingItem(null);
    resetItemForm();
  };

  // UC#6 - Delete Item
  const handleDeleteItem = (itemId: string) => {
    if (confirm('Yakin ingin menghapus barang ini?')) {
      const updatedItems = items.filter(item => item.id !== itemId);
      if (onUpdateItems) onUpdateItems(updatedItems);
      toast.success('🗑️ Barang berhasil dihapus!');
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: '',
      description: '',
      category: 'electronics',
      totalStock: 0,
      condition: '',
      imageUrl: ''
    });
  };

  const openEditItem = (item: Item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description,
      category: item.category,
      totalStock: item.totalStock,
      condition: item.condition,
      imageUrl: item.imageUrl
    });
    setShowItemForm(true);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: '#FEF3C7', text: '#F59E0B', label: 'Menunggu' },
      approved: { bg: '#D1FAE5', text: '#10B981', label: 'Disetujui' },
      active: { bg: '#DBEAFE', text: '#2563EB', label: 'Dipinjam' },
      completed: { bg: '#E5E7EB', text: '#6B7280', label: 'Selesai' },
      rejected: { bg: '#FEE2E2', text: '#EF4444', label: 'Ditolak' }
    };
    
    const style = styles[status] || styles.pending;
    
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
          style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.85) 0%, rgba(5, 150, 105, 0.90) 100%)' }}
        />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="max-w-[70px]">
                <img src={telkomLogo} alt="Telkom University" className="w-full h-auto" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                  Admin Dashboard
                </h1>
                <p className="text-sm text-white opacity-90">
                  Kelola peminjaman & inventaris
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: BarChart3, label: 'Total Peminjaman', value: stats.totalLoans, color: '#FFFFFF' },
              { icon: Clock, label: 'Menunggu Persetujuan', value: stats.pending, color: '#F59E0B' },
              { icon: Users, label: 'Sedang Dipinjam', value: stats.active, color: '#3B82F6' },
              { icon: AlertCircle, label: 'Stok Kritis', value: stats.criticalStock, color: '#EF4444' }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: stat.color }} strokeWidth={2} />
                    </div>
                    <div className="w-full">
                      <p className="text-xs leading-tight mb-1" style={{ color: '#64748B' }}>{stat.label}</p>
                      <p className="text-2xl font-bold" style={{ color: '#0F172A' }}>{stat.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setViewMode('approval')}
              className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all"
              style={{
                backgroundColor: viewMode === 'approval' ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                color: viewMode === 'approval' ? '#BE1E2D' : '#FFFFFF'
              }}
            >
              📋 Persetujuan Peminjaman
            </button>
            <button
              onClick={() => setViewMode('inventory')}
              className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all"
              style={{
                backgroundColor: viewMode === 'inventory' ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                color: viewMode === 'inventory' ? '#BE1E2D' : '#FFFFFF'
              }}
            >
              📦 Kelola Data Barang
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {viewMode === 'approval' ? (
          /* UC#4 - Approval View */
          <div>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { id: 'pending', label: 'Menunggu', count: stats.pending },
                { id: 'approved', label: 'Disetujui', count: loanRequests.filter(l => l.status === 'approved').length },
                { id: 'active', label: 'Dipinjam', count: stats.active },
                { id: 'completed', label: 'Selesai', count: loanRequests.filter(l => l.status === 'completed').length },
                { id: 'rejected', label: 'Ditolak', count: loanRequests.filter(l => l.status === 'rejected').length },
                { id: 'all', label: 'Semua', count: stats.totalLoans }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all"
                  style={{
                    backgroundColor: activeTab === tab.id ? '#BE1E2D' : '#FFFFFF',
                    color: activeTab === tab.id ? '#FFFFFF' : '#64748B'
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mb-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#94A3B8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari peminjaman berdasarkan nama, barang, atau ID..."
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:outline-none"
                onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            {/* Loans List */}
            <div className="space-y-3">
              {filteredLoans.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#CBD5E1' }} />
                  <p className="font-bold text-lg" style={{ color: '#0F172A' }}>Tidak ada data</p>
                  <p className="text-sm" style={{ color: '#64748B' }}>Belum ada peminjaman pada kategori ini</p>
                </div>
              ) : (
                filteredLoans.map(loan => (
                  <div key={loan.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <img
                        src={loan.itemImage}
                        alt={loan.itemName}
                        className="w-20 h-20 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold" style={{ color: '#0F172A' }}>{loan.itemName}</p>
                            <p className="text-sm" style={{ color: '#64748B' }}>ID: {loan.id}</p>
                          </div>
                          {getStatusBadge(loan.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div>
                            <span style={{ color: '#64748B' }}>Peminjam: </span>
                            <span className="font-semibold" style={{ color: '#0F172A' }}>{loan.studentName}</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748B' }}>Jumlah: </span>
                            <span className="font-semibold" style={{ color: '#0F172A' }}>{loan.quantity} unit</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748B' }}>Tanggal Pinjam: </span>
                            <span className="font-semibold" style={{ color: '#0F172A' }}>{loan.borrowDate}</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748B' }}>Tanggal Kembali: </span>
                            <span className="font-semibold" style={{ color: '#0F172A' }}>{loan.returnDate}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedLoan(loan)}
                        className="px-4 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: '#BE1E2D' }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* UC#6 - Inventory Management View */
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>
                Data Barang Inventaris
              </h2>
              <button
                onClick={() => {
                  resetItemForm();
                  setEditingItem(null);
                  setShowItemForm(true);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#BE1E2D' }}
              >
                <Plus className="w-5 h-5" />
                Tambah Barang
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th className="px-6 py-4 text-left text-xs font-bold" style={{ color: '#475569' }}>Barang</th>
                    <th className="px-6 py-4 text-left text-xs font-bold" style={{ color: '#475569' }}>Kategori</th>
                    <th className="px-6 py-4 text-center text-xs font-bold" style={{ color: '#475569' }}>Stok Total</th>
                    <th className="px-6 py-4 text-center text-xs font-bold" style={{ color: '#475569' }}>Tersedia</th>
                    <th className="px-6 py-4 text-center text-xs font-bold" style={{ color: '#475569' }}>Status</th>
                    <th className="px-6 py-4 text-center text-xs font-bold" style={{ color: '#475569' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                          <div>
                            <p className="font-bold text-sm" style={{ color: '#0F172A' }}>{item.name}</p>
                            <p className="text-xs" style={{ color: '#64748B' }}>{item.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold" style={{ color: '#0F172A' }}>{item.totalStock}</td>
                      <td className="px-6 py-4 text-center font-bold" style={{ 
                        color: item.availableStock === 0 ? '#EF4444' : item.availableStock <= 5 ? '#F59E0B' : '#10B981'
                      }}>
                        {item.availableStock}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span 
                          className="px-3 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: item.availableStock === 0 ? '#FEE2E2' : item.availableStock <= 5 ? '#FEF3C7' : '#D1FAE5',
                            color: item.availableStock === 0 ? '#EF4444' : item.availableStock <= 5 ? '#F59E0B' : '#10B981'
                          }}
                        >
                          {item.status === 'out-of-stock' ? 'Habis' : item.status === 'low-stock' ? 'Stok Rendah' : 'Tersedia'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditItem(item)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" style={{ color: '#3B82F6' }} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* UC#4 - Detail Loan Modal */}
      {selectedLoan && !showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6" onClick={() => setSelectedLoan(null)}>
          <div className="bg-white rounded-2xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10" style={{ borderBottom: '2px solid #F1F5F9' }}>
              <h2 className="font-bold text-lg" style={{ color: '#0F172A' }}>Detail Pengajuan</h2>
              <button onClick={() => setSelectedLoan(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5" style={{ color: '#64748B' }} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Item Image */}
              <img src={selectedLoan.itemImage} className="w-full h-48 object-cover rounded-xl" />

              {/* Info Peminjam */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>Info Peminjam</p>
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <p className="font-bold mb-1" style={{ color: '#0F172A' }}>{selectedLoan.studentName}</p>
                  <p className="text-sm" style={{ color: '#64748B' }}>{selectedLoan.studentEmail}</p>
                  <p className="text-sm" style={{ color: '#64748B' }}>ID: {selectedLoan.studentId}</p>
                </div>
              </div>

              {/* Detail Barang */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>Detail Barang</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Nama Barang</p>
                    <p className="font-bold" style={{ color: '#0F172A' }}>{selectedLoan.itemName}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Jumlah</p>
                    <p className="font-bold" style={{ color: '#0F172A' }}>{selectedLoan.quantity} unit</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Tanggal Pinjam</p>
                    <p className="font-bold" style={{ color: '#0F172A' }}>{selectedLoan.borrowDate}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#64748B' }}>Tanggal Kembali</p>
                    <p className="font-bold" style={{ color: '#0F172A' }}>{selectedLoan.returnDate}</p>
                  </div>
                </div>
              </div>

              {/* Keperluan */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>Keperluan Peminjaman</p>
                <p className="text-sm p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC', color: '#475569' }}>
                  {selectedLoan.reason}
                </p>
              </div>

              {/* Admin Notes */}
              {selectedLoan.status === 'pending' && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                    Catatan Admin (Opsional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Tambahkan catatan atau instruksi khusus..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none resize-none"
                    style={{ borderColor: '#E2E8F0' }}
                    onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                <span className="text-sm font-semibold" style={{ color: '#64748B' }}>Status Saat Ini:</span>
                {getStatusBadge(selectedLoan.status)}
              </div>

              {/* Actions */}
              {selectedLoan.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowRejectModal(true);
                    }}
                    className="flex-1 px-6 py-3.5 rounded-xl font-semibold border-2 transition-all hover:bg-red-50"
                    style={{ borderColor: '#EF4444', color: '#EF4444' }}
                  >
                    <X className="w-5 h-5 inline mr-2" />
                    Tolak
                  </button>
                  <button
                    onClick={handleApprove}
                    className="flex-1 px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    <Check className="w-5 h-5 inline mr-2" />
                    Setujui
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl max-w-[500px] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4" style={{ backgroundColor: '#EF4444' }}>
              <h2 className="font-bold text-white">Tolak Pengajuan</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm" style={{ color: '#64748B' }}>
                Anda akan menolak pengajuan peminjaman <span className="font-bold" style={{ color: '#0F172A' }}>{selectedLoan.id}</span>
              </p>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Alasan Penolakan <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Jelaskan alasan penolakan (minimal 10 karakter)..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none resize-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#EF4444')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 transition-all hover:bg-gray-50"
                  style={{ borderColor: '#E2E8F0', color: '#64748B' }}
                >
                  Batal
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  Konfirmasi Tolak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UC#6 - Add/Edit Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6" onClick={() => setShowItemForm(false)}>
          <div className="bg-white rounded-2xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10" style={{ borderBottom: '2px solid #F1F5F9' }}>
              <h2 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                {editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}
              </h2>
              <button onClick={() => setShowItemForm(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5" style={{ color: '#64748B' }} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Nama Barang <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Contoh: Proyektor LCD"
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Kategori <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as any })}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                >
                  <option value="electronics">Elektronik</option>
                  <option value="furniture">Furnitur</option>
                  <option value="decoration">Dekorasi</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Stok <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={itemForm.totalStock}
                  onChange={(e) => setItemForm({ ...itemForm, totalStock: parseInt(e.target.value) || 0 })}
                  placeholder="Jumlah unit"
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Deskripsi <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Deskripsi barang..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none resize-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  Kondisi
                </label>
                <input
                  type="text"
                  value={itemForm.condition}
                  onChange={(e) => setItemForm({ ...itemForm, condition: e.target.value })}
                  placeholder="Contoh: Baik, dengan remote"
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                  URL Gambar
                </label>
                <input
                  type="text"
                  value={itemForm.imageUrl}
                  onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none"
                  style={{ borderColor: '#E2E8F0' }}
                  onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowItemForm(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 transition-all hover:bg-gray-50"
                  style={{ borderColor: '#E2E8F0', color: '#64748B' }}
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveItem}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: '#BE1E2D' }}
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}