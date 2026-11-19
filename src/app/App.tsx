import { useEffect, useState } from 'react';
import { RoleSelectionScreen } from './screens/RoleSelectionScreen';
import { LoginScreen } from './screens/LoginScreen';
import { MainApp } from './screens/MainApp';
import { User, UserRole } from './types';
import { Toaster, toast } from 'sonner';
import { currentSession, getCatalog, logout, type CatalogItem, type CatalogRoom } from './api';
import type { MainScreen } from './navigation';
import { changePlan, removeSubmittedPlan } from './plan.mjs';

type AppScreen = 'role-selection' | 'login' | 'main';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('role-selection');
  const [initialView, setInitialView] = useState<MainScreen>('home');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [rooms, setRooms] = useState<CatalogRoom[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [plan, setPlan] = useState<Record<number, number>>({});

  useEffect(() => {
    let active = true;
    setChecking(true);
    setSessionError('');
    currentSession().then(session => {
      if (!active) return;
      if (session) {
        setCurrentUser(session.user);
        setInitialView(session.user.role === 'student' ? 'home' : 'dashboard');
        setCurrentScreen('main');
      } else {
        setCurrentUser(null);
        setSelectedRole(null);
        setCurrentScreen('role-selection');
      }
    }).catch(() => {
      if (!active) return;
      setSessionError('Sesi belum dapat diverifikasi. Periksa koneksi backend lalu coba lagi. Cookie sesi tidak dihapus.');
      setCurrentScreen('role-selection');
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [sessionAttempt]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError('');
    getCatalog().then(data => { if (active) { setItems(data.barang); setRooms(data.ruangan); } })
      .catch(error => { if (active) setCatalogError(error instanceof Error ? error.message : 'Katalog gagal dimuat.'); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [sessionAttempt]);

  const updatePlan = (id: number, quantity: number) => {
    setPlan(previous => changePlan(previous, items, id, quantity));
  };

  const catalogProps = { items, loading: catalogLoading, error: catalogError, plan, onPlanChange: updatePlan };

  const handleSelectRole = (role: UserRole, action: 'login' | 'register') => {
    if (action === 'register') {
      toast.info('Registrasi belum tersedia. Minta akun internal kepada pengelola.');
      return;
    }
    setSelectedRole(role);
    setCurrentScreen('login');
  };

  const handleLogin = (user: User) => {
    // Login baru tetap menuju landing per role; hanya refresh sesi memulihkan deep link.
    window.history.replaceState(null,'',window.location.pathname+window.location.search);
    setSessionError('');
    setCurrentUser(user);
    setInitialView(user.role === 'student' ? 'home' : 'dashboard');
    setCurrentScreen('main');
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      window.history.replaceState(null,'',window.location.pathname+window.location.search);
      setCurrentUser(null);
      setSelectedRole(null);
      setPlan({});
      setSessionError('');
      setInitialView('home');
      setCurrentScreen('role-selection');
    } catch {
      toast.error('Logout gagal; sesi belum dihapus. Coba lagi.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setCurrentScreen('role-selection');
  };

  if (checking) return <p role="status" className="p-8">Memeriksa sesi...</p>;
  return (
    <>
      <Toaster position="top-center" richColors />
      {sessionError && <div className="p-4 bg-red-50 text-red-800"><p role="alert">{sessionError}</p><button type="button" onClick={() => { setChecking(true); setSessionAttempt(value => value + 1); }} className="mt-2 font-semibold underline focus-visible:outline-2">Coba periksa sesi lagi</button></div>}
      {loggingOut && <p role="status" className="p-3 text-sm text-slate-700">Mengakhiri sesi...</p>}
      {currentScreen === 'role-selection' && (
        <RoleSelectionScreen onSelectRole={handleSelectRole} onBrowse={() => { setInitialView('catalog'); setCurrentScreen('main'); }} />
      )}
      {currentScreen === 'login' && selectedRole && (
        <LoginScreen 
          onLogin={handleLogin} 
          selectedRole={selectedRole}
          onBack={handleBackToRoleSelection}
        />
      )}
      {currentScreen === 'main' && (
         <MainApp key={currentUser?.id ?? 'public'} user={currentUser} onLogout={handleLogout} catalog={catalogProps}
           rooms={rooms} initialView={initialView} onLogin={() => setCurrentScreen('role-selection')}
           onSubmitted={submitted=>setPlan(previous=>removeSubmittedPlan(previous,submitted))} />
      )}
    </>
  );
}
