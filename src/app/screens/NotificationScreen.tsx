import { useState } from 'react';
import { User, Notification } from '../types';
import { Bell, CheckCircle, Clock, XCircle, Package, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import telkomLogo from 'figma:asset/623803f2801f48df421c6a73b102830c97d7f2c1.png';

interface NotificationScreenProps {
  user: User;
  notifications: Notification[];
}

export function NotificationScreen({ user, notifications = [] }: NotificationScreenProps) {
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notificationStates, setNotificationStates] = useState<Record<string, boolean>>({});
  const [deletedNotifs, setDeletedNotifs] = useState<string[]>([]);

  // Filter deleted notifications
  const activeNotifications = notifications.filter(n => !deletedNotifs.includes(n.loanId));
  
  // Calculate unread count
  const unreadCount = activeNotifications.filter(n => !notificationStates[n.loanId]).length;

  // UC#7 - Mark as read
  const handleMarkAsRead = (notifId: string, loanId: string) => {
    setNotificationStates(prev => ({ ...prev, [loanId]: true }));
    toast.success('Notifikasi ditandai sebagai sudah dibaca');
  };

  // UC#7 - Delete notification
  const handleDelete = (notifId: string, loanId: string) => {
    setDeletedNotifs(prev => [...prev, loanId]);
    setSelectedNotification(null);
    toast.success('Notifikasi berhasil dihapus');
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const newStates: Record<string, boolean> = {};
    notifications.forEach(n => {
      newStates[n.loanId] = true;
    });
    setNotificationStates(newStates);
    toast.success('Semua notifikasi ditandai sebagai sudah dibaca');
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'approved': return CheckCircle;
      case 'pending': return Clock;
      case 'rejected': return XCircle;
      case 'active': return Package;
      case 'completed': return CheckCircle;
      default: return Bell;
    }
  };

  const getNotificationColors = (type: Notification['type']) => {
    switch (type) {
      case 'approved':
        return { bg: '#D1FAE5', text: '#10B981' };
      case 'pending':
        return { bg: '#FEF3C7', text: '#F59E0B' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#EF4444' };
      case 'active':
        return { bg: '#DBEAFE', text: '#2563EB' };
      case 'completed':
        return { bg: '#E5E7EB', text: '#6B7280' };
      default:
        return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-6 bg-white shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="max-w-[50px]">
            <img src={telkomLogo} alt="Telkom University" className="w-full h-auto" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>
                Notifikasi
              </h1>
              {unreadCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold shadow-sm" style={{ backgroundColor: '#BE1E2D', color: '#FFFFFF' }}>
                  {unreadCount} baru
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Update terbaru tentang peminjaman
            </p>
          </div>
        </div>

        {/* Mark All as Read Button */}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ backgroundColor: '#F1F5F9', color: '#475569' }}
          >
            ✓ Tandai Semua Sudah Dibaca
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="px-6 py-6 pb-24">
        {activeNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <Bell className="w-16 h-16 mx-auto mb-4" style={{ color: '#CBD5E1' }} strokeWidth={1.5} />
            <p className="font-bold text-lg mb-2" style={{ color: '#0F172A' }}>
              Tidak ada notifikasi
            </p>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Anda belum memiliki notifikasi apapun
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const colors = getNotificationColors(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${!notification.read ? 'border-l-4' : 'border-l-4 border-transparent'}`}
                  style={!notification.read ? { borderLeftColor: '#BE1E2D' } : {}}
                  onClick={() => setSelectedNotification(notification)}
                >
                  <div className="flex gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <Icon className="w-6 h-6" style={{ color: colors.text }} strokeWidth={2} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-bold text-sm" style={{ color: '#0F172A' }}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ml-2 mt-1" style={{ backgroundColor: '#BE1E2D' }} />
                        )}
                      </div>
                      <p className="text-sm mb-2 leading-relaxed line-clamp-2" style={{ color: '#64748B' }}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold" style={{ color: '#94A3B8' }}>
                          {notification.time}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNotification(notification);
                          }}
                          className="text-xs font-semibold flex items-center gap-1 hover:opacity-70"
                          style={{ color: '#BE1E2D' }}
                        >
                          <Eye className="w-3 h-3" />
                          Lihat Detail
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedNotification && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6"
          onClick={() => setSelectedNotification(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-[500px] w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="px-6 py-4 flex items-center justify-between"
              style={{ backgroundColor: getNotificationColors(selectedNotification.type).bg }}
            >
              <h2 className="font-bold" style={{ color: getNotificationColors(selectedNotification.type).text }}>
                Detail Notifikasi
              </h2>
              <button
                onClick={() => setSelectedNotification(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black hover:bg-opacity-10 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: getNotificationColors(selectedNotification.type).text }} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                {(() => {
                  const Icon = getNotificationIcon(selectedNotification.type);
                  const colors = getNotificationColors(selectedNotification.type);
                  return (
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <Icon className="w-8 h-8" style={{ color: colors.text }} strokeWidth={2} />
                    </div>
                  );
                })()}
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1" style={{ color: '#0F172A' }}>
                    {selectedNotification.title}
                  </h3>
                  <p className="text-xs font-semibold" style={{ color: '#94A3B8' }}>
                    {selectedNotification.time}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                  {selectedNotification.message}
                </p>
              </div>

              {selectedNotification.details && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>
                    Informasi Tambahan
                  </p>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                    <p className="text-sm" style={{ color: '#475569' }}>
                      {selectedNotification.details}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {!selectedNotification.read && (
                  <button
                    onClick={() => handleMarkAsRead(selectedNotification.id, selectedNotification.loanId)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold border-2 transition-all hover:bg-gray-50"
                    style={{ borderColor: '#E2E8F0', color: '#64748B' }}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Tandai Dibaca
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selectedNotification.id, selectedNotification.loanId)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold border-2 transition-all hover:bg-red-50"
                  style={{ borderColor: '#FEE2E2', color: '#EF4444' }}
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Hapus
                </button>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: '#BE1E2D' }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}