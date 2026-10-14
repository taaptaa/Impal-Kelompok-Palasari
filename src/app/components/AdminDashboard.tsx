import { useState } from 'react';
import { Navbar } from './Navbar';
import { EmptyState } from './EmptyState';
import { User, LoanRequest } from '../types';
import { TrendingUp, Clock, Package, CheckCircle, AlertCircle, LayoutDashboard, Check, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface AdminDashboardProps {
  currentUser: User;
  loanRequests: LoanRequest[];
  onLogout: () => void;
  onApproval: (requestId: string, approved: boolean) => void;
  onRoleChange: (role: string) => void;
}

export function AdminDashboard({ currentUser, loanRequests, onLogout, onApproval, onRoleChange }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');

  const pendingRequests = loanRequests.filter(req => req.status === 'pending');
  const approvedRequests = loanRequests.filter(req => req.status === 'approved');
  const completedRequests = loanRequests.filter(req => req.status === 'completed');

  const displayRequests = 
    activeTab === 'pending' ? pendingRequests :
    activeTab === 'approved' ? approvedRequests :
    loanRequests;

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--color-secondary)' }}>
      <Navbar user={currentUser} onLogout={onLogout} />

      <main className="w-full max-w-7xl mx-auto px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--color-navy)' }}>
            Dashboard Admin
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Kelola dan pantau semua aktivitas peminjaman inventaris kampus
          </p>
        </div>

        {/* Stats Overview - 4 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { 
              label: 'Total Peminjaman', 
              value: loanRequests.length, 
              icon: TrendingUp, 
              color: '#2563EB',
              bgColor: '#EFF6FF',
              desc: 'Semua pengajuan'
            },
            { 
              label: 'Menunggu Persetujuan', 
              value: pendingRequests.length, 
              icon: Clock, 
              color: '#F59E0B',
              bgColor: '#FEF3C7',
              desc: 'Perlu ditinjau'
            },
            { 
              label: 'Peminjaman Aktif', 
              value: approvedRequests.length, 
              icon: Package, 
              color: '#10B981',
              bgColor: '#D1FAE5',
              desc: 'Sedang dipinjam'
            },
            { 
              label: 'Selesai', 
              value: completedRequests.length, 
              icon: CheckCircle, 
              color: '#6B7280',
              bgColor: '#F3F4F6',
              desc: 'Sudah dikembalikan'
            }
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div 
                key={idx} 
                className="bg-white p-6 hover:shadow-xl transition-all cursor-pointer group border-2 border-transparent hover:border-blue-200"
                style={{ 
                  boxShadow: 'var(--shadow-lg)',
                  borderRadius: 'var(--radius-xl)'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="p-4 transition-transform group-hover:scale-110"
                    style={{ 
                      backgroundColor: stat.bgColor,
                      borderRadius: 'var(--radius-lg)'
                    }}
                  >
                    <Icon className="w-8 h-8" style={{ color: stat.color }} strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <p className="text-5xl font-bold mb-1" style={{ color: 'var(--color-navy)' }}>
                      {stat.value}
                    </p>
                  </div>
                </div>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--color-navy)' }}>
                  {stat.label}
                </h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {stat.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-3 mb-6">
          {[
            { id: 'pending', label: 'Perlu Persetujuan', count: pendingRequests.length, icon: AlertCircle },
            { id: 'approved', label: 'Disetujui', count: approvedRequests.length, icon: CheckCircle },
            { id: 'all', label: 'Semua Pengajuan', count: loanRequests.length, icon: LayoutDashboard }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-6 py-4 transition-all font-semibold border-2 ${
                  isActive 
                    ? 'text-white shadow-lg scale-105' 
                    : 'bg-white text-gray-700 hover:shadow-md border-gray-200'
                }`}
                style={isActive ? { 
                  backgroundColor: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  borderRadius: 'var(--radius-lg)'
                } : {
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
                <span>{tab.label}</span>
                <span className={`text-sm px-3 py-1 rounded-full font-bold ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Approval Center */}
        <div 
          className="bg-white p-8"
          style={{ 
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-xl)'
          }}
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-navy)' }}>
              {activeTab === 'pending' ? '📋 Perlu Persetujuan' :
               activeTab === 'approved' ? '✓ Peminjaman Disetujui' :
               '📊 Semua Pengajuan'}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {activeTab === 'pending' ? `${pendingRequests.length} pengajuan menunggu tindakan Anda` :
               activeTab === 'approved' ? `${approvedRequests.length} peminjaman sedang aktif` :
               `Total ${loanRequests.length} pengajuan tercatat`}
            </p>
          </div>
          
          {displayRequests.length === 0 ? (
            <div className="py-20">
              <EmptyState
                icon={<CheckCircle className="w-16 h-16" style={{ color: 'var(--color-success)', opacity: 0.4 }} strokeWidth={1.5} />}
                title={activeTab === 'pending' ? 'Semua pengajuan sudah diproses' : 'Tidak ada data'}
                description={activeTab === 'pending' ? 'Tidak ada pengajuan baru yang perlu ditinjau' : 'Belum ada peminjaman dalam kategori ini'}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {displayRequests.map(request => (
                <div 
                  key={request.id} 
                  className="border-2 border-gray-200 p-6 hover:shadow-xl transition-all hover:border-blue-200 group"
                  style={{ borderRadius: 'var(--radius-xl)' }}
                >
                  <div className="flex gap-6">
                    {/* Image */}
                    <img
                      src={request.itemImage}
                      alt={request.itemName}
                      className="w-40 h-40 object-cover flex-shrink-0"
                      style={{ borderRadius: 'var(--radius-lg)' }}
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/200?text=No+Image';
                      }}
                    />
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--color-navy)' }}>
                            {request.itemName}
                          </h3>
                          <div className="flex items-center gap-4 mb-3">
                            <span 
                              className="text-sm px-3 py-1 rounded-full font-semibold"
                              style={{ 
                                backgroundColor: 'var(--color-primary)10',
                                color: 'var(--color-primary)'
                              }}
                            >
                              {request.quantity} unit
                            </span>
                            <span 
                              className="text-sm px-3 py-1 rounded-full font-semibold"
                              style={{ 
                                backgroundColor: 'var(--color-info)10',
                                color: 'var(--color-info)'
                              }}
                            >
                              ID: {request.id}
                            </span>
                          </div>
                        </div>
                        <span
                          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full font-semibold"
                          style={{
                            backgroundColor:
                              request.status === 'approved' ? 'var(--color-success)' :
                              request.status === 'pending' ? 'var(--color-warning)' :
                              request.status === 'rejected' ? 'var(--color-error)' :
                              'var(--color-neutral)',
                            color: 'white',
                            borderRadius: 'var(--radius-full)'
                          }}
                        >
                          {request.status === 'pending' ? '⏳ Pending' :
                           request.status === 'approved' ? '✓ Disetujui' :
                           request.status === 'rejected' ? '✗ Ditolak' :
                           '✓ Selesai'}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                            PEMINJAM
                          </p>
                          <p className="font-semibold" style={{ color: 'var(--color-navy)' }}>
                            {request.studentName}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {request.studentEmail}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                            PERIODE PEMINJAMAN
                          </p>
                          <p className="font-semibold" style={{ color: 'var(--color-navy)' }}>
                            📅 {request.borrowDate} - {request.returnDate}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Diajukan: {request.requestDate}
                          </p>
                        </div>
                      </div>

                      {/* Reason */}
                      {request.reason && (
                        <div 
                          className="p-4 mb-4"
                          style={{ 
                            backgroundColor: '#F8FAFC',
                            borderRadius: 'var(--radius-lg)',
                            borderLeft: '4px solid var(--color-primary)'
                          }}
                        >
                          <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            💬 ALASAN PEMINJAMAN
                          </p>
                          <p style={{ color: 'var(--color-text-primary)' }}>
                            "{request.reason}"
                          </p>
                        </div>
                      )}

                      {/* Action Buttons - Only for Pending */}
                      {request.status === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => onApproval(request.id, true)}
                            className="flex-1 flex items-center justify-center gap-2 px-8 py-4 text-white transition-all hover:opacity-90 font-bold"
                            style={{ 
                              backgroundColor: 'var(--color-success)',
                              borderRadius: 'var(--radius-lg)'
                            }}
                          >
                            <Check className="w-5 h-5" strokeWidth={2.5} />
                            Setujui Pengajuan
                          </button>
                          <button
                            onClick={() => onApproval(request.id, false)}
                            className="flex-1 flex items-center justify-center gap-2 px-8 py-4 border-2 transition-all hover:bg-red-50 font-bold"
                            style={{ 
                              color: 'var(--color-error)',
                              borderColor: 'var(--color-error)',
                              borderRadius: 'var(--radius-lg)'
                            }}
                          >
                            <X className="w-5 h-5" strokeWidth={2.5} />
                            Tolak Pengajuan
                          </button>
                        </div>
                      )}

                      {/* QR Code for Approved */}
                      {request.status === 'approved' && request.qrCode && (
                        <div 
                          className="flex items-center gap-4 p-4 border-2 border-dashed"
                          style={{ 
                            borderColor: 'var(--color-success)',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: 'var(--color-success)05'
                          }}
                        >
                          <QRCodeSVG value={request.qrCode} size={80} />
                          <div>
                            <p className="font-semibold mb-1" style={{ color: 'var(--color-success)' }}>
                              ✓ QR Code Tersedia
                            </p>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              Mahasiswa dapat mengambil barang di gudang
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Role Switcher (Demo Only) */}
      <div 
        className="fixed bottom-6 right-6 bg-white p-4 border-2 border-gray-200 z-50"
        style={{ 
          boxShadow: 'var(--shadow-xl)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          🎭 Demo Mode - Switch Role:
        </p>
        <div className="flex flex-col gap-2">
          {[
            { role: 'student', label: '👨‍🎓 Student', desc: 'Mahasiswa' },
            { role: 'admin', label: '👔 Admin', desc: 'Administrator' },
            { role: 'warehouse', label: '📦 Warehouse', desc: 'Petugas Gudang' }
          ].map(({ role, label, desc }) => (
            <button
              key={role}
              onClick={() => onRoleChange(role)}
              className={`text-left px-4 py-3 border-2 transition-all font-medium ${
                currentUser.role === role 
                  ? 'text-white shadow-md' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              style={currentUser.role === role ? { 
                backgroundColor: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                borderRadius: 'var(--radius-md)'
              } : {
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{label}</div>
                  <div className={`text-xs mt-0.5 ${currentUser.role === role ? 'text-white opacity-80' : 'text-gray-500'}`}>
                    {desc}
                  </div>
                </div>
                {currentUser.role === role && (
                  <CheckCircle className="w-5 h-5 text-white" strokeWidth={2} />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
