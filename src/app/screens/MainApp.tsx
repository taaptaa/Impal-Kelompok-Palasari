import { useState } from 'react';
import { User, Item, LoanRequest } from '../types';
import { HomeScreen } from './HomeScreen';
import { CatalogScreen } from './CatalogScreen';
import { HistoryScreen } from './HistoryScreen';
import { NotificationScreen } from './NotificationScreen';
import { ProfileScreen } from './ProfileScreen';
import { AdminDashboard } from './AdminDashboard';
import { WarehouseDashboard } from './WarehouseDashboard';
import { BottomNav } from '../components/BottomNav';
import { mockItems, mockLoanRequests } from '../data/mockData';
import { toast } from 'sonner';

interface MainAppProps {
  user: User;
  onLogout: () => void;
}

type Screen = 'home' | 'catalog' | 'history' | 'notifications' | 'profile';

export function MainApp({ user, onLogout }: MainAppProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [items, setItems] = useState<Item[]>(mockItems);
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>(mockLoanRequests);

  const handleUpdateLoan = (loanId: string, updates: Partial<LoanRequest>) => {
    setLoanRequests(prev => prev.map(loan => 
      loan.id === loanId ? { ...loan, ...updates } : loan
    ));

    // Update item stock if status changes
    if (updates.status === 'active') {
      const loan = loanRequests.find(l => l.id === loanId);
      if (loan) {
        setItems(prev => prev.map(item =>
          item.id === loan.itemId
            ? {
                ...item,
                availableStock: item.availableStock - loan.quantity,
                status: item.availableStock - loan.quantity === 0 ? 'out-of-stock' :
                       item.availableStock - loan.quantity < 3 ? 'low-stock' : 'available'
              }
            : item
        ));
      }
    } else if (updates.status === 'completed') {
      const loan = loanRequests.find(l => l.id === loanId);
      if (loan) {
        setItems(prev => prev.map(item =>
          item.id === loan.itemId
            ? {
                ...item,
                availableStock: item.availableStock + loan.quantity,
                status: item.availableStock + loan.quantity < 3 ? 'low-stock' : 'available'
              }
            : item
        ));
      }
    }
  };

  // Show different dashboards based on role
  if (user.role === 'admin') {
    return (
      <AdminDashboard
        user={user}
        onLogout={onLogout}
        loanRequests={loanRequests}
        onUpdateLoan={handleUpdateLoan}
        items={items}
        onUpdateItems={setItems}
      />
    );
  }

  if (user.role === 'warehouse') {
    return (
      <WarehouseDashboard
        user={user}
        onLogout={onLogout}
        loanRequests={loanRequests}
        onUpdateLoan={handleUpdateLoan}
      />
    );
  }

  // Student interface
  const handleLoanSubmit = (data: { itemId: string; borrowDate: string; returnDate: string; quantity: number; reason: string }) => {
    const item = items.find(i => i.id === data.itemId);
    if (!item) return;

    const newRequest: LoanRequest = {
      id: `LR${String(loanRequests.length + 1).padStart(3, '0')}`,
      studentId: user.id,
      studentName: user.name,
      studentEmail: user.email,
      itemId: item.id,
      itemName: item.name,
      itemImage: item.imageUrl,
      quantity: data.quantity,
      borrowDate: data.borrowDate,
      returnDate: data.returnDate,
      reason: data.reason,
      status: 'pending',
      requestDate: new Date().toISOString().split('T')[0]
    };

    setLoanRequests([newRequest, ...loanRequests]);
  };

  const handleRequestReturn = (loanId: string) => {
    // Update loan status to 'returning' - waiting for warehouse verification
    handleUpdateLoan(loanId, { 
      status: 'returning' as any,
      returnRequestDate: new Date().toISOString().split('T')[0]
    });
    // Show success notification (in production, use toast/notification)
    toast.success('Request pengembalian berhasil! Silakan datang ke Gudang dengan QR Code.');
  };

  // For demo: show all loan requests (in production, filter by user.id)
  const userLoans = loanRequests;

  return (
    <div className="min-h-screen w-full pb-20" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Screen Content */}
      {currentScreen === 'home' && (
        <HomeScreen 
          user={user} 
          items={items} 
          userLoans={userLoans} 
          onNavigate={setCurrentScreen}
          onRequestReturn={handleRequestReturn}
          onSubmitLoan={handleLoanSubmit}
        />
      )}
      {currentScreen === 'catalog' && (
        <CatalogScreen user={user} items={items} onSubmitLoan={handleLoanSubmit} onBack={() => setCurrentScreen('home')} />
      )}
      {currentScreen === 'history' && (
        <HistoryScreen user={user} loans={userLoans} />
      )}
      {currentScreen === 'notifications' && (
        <NotificationScreen user={user} loans={userLoans} />
      )}
      {currentScreen === 'profile' && (
        <ProfileScreen user={user} onLogout={onLogout} />
      )}

      {/* Bottom Navigation */}
      <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
    </div>
  );
}
