import { useEffect, useState } from 'react';
import type { User } from '../types';
import { CatalogScreen, type CatalogScreenProps } from './CatalogScreen';
import { AdminDashboardContainer } from '../integrations/AdminDashboardContainer';
import { ScheduleContainer } from '../integrations/ScheduleContainer';
import { WarehouseDashboard } from './WarehouseDashboard';
import { HomeScreen } from './HomeScreen';
import { ProfileScreen } from './ProfileScreen';
import { RoomCatalogScreen } from './RoomCatalogScreen';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';
import type { CatalogRoom, LoanInput, SavedLoan } from '../api';
import { isPublicScreen, type MainScreen } from '../navigation';
import { LoanFormScreen, emptyLoanDraft } from './LoanFormScreen';
import { MyLoansScreen } from './MyLoansScreen';
import { ImageCreditsScreen } from './ImageCreditsScreen';

interface MainAppProps {
  user: User | null;
  onLogout: () => void;
  catalog: Omit<CatalogScreenProps, 'onBack'>;
  rooms: CatalogRoom[];
  initialView: MainScreen;
  onLogin: () => void;
  onSubmitted: (items: LoanInput['items']) => void;
}

export function MainApp({ user, onLogout, catalog, rooms, initialView, onLogin, onSubmitted }: MainAppProps) {
  const initialLoanId = /^#loans\/(\d+)$/.exec(window.location.hash)?.[1];
  const [screen, setScreen] = useState<MainScreen>(user?.role==='student' && /^#loans(?:\/\d+)?$/.test(window.location.hash) ? 'loans' : user || isPublicScreen(initialView) ? initialView : 'catalog');
  const [selectedLoanId,setSelectedLoanId] = useState<number|null>(initialLoanId?Number(initialLoanId):null);
  const [confirmation,setConfirmation] = useState<SavedLoan|null>(null);
  const [loanDraft,setLoanDraft] = useState(emptyLoanDraft);
  useEffect(()=>{
    const syncLoanLink = () => {
      if(user?.role!=='student')return;
      const match=/^#loans(?:\/(\d+))?$/.exec(window.location.hash);
      if(!match)return;
      setSelectedLoanId(match[1]?Number(match[1]):null);setConfirmation(null);setScreen('loans');
    };
    window.addEventListener('hashchange',syncLoanLink);
    return()=>window.removeEventListener('hashchange',syncLoanLink);
  },[user?.role]);
  const [search, setSearch] = useState('');
  const internal = user?.role === 'admin' || user?.role === 'warehouse';
  const planCount = catalog.items.filter(item => catalog.plan[item.id_barang] > 0).length;
  const navigate = (next: MainScreen) => {
     if (!user && !isPublicScreen(next)) { onLogin(); return; }
     if ((next==='loans'||next==='loan-form')&&user?.role!=='student') return;
     if(next==='loans'){setSelectedLoanId(null);setConfirmation(null);}
     window.history.replaceState(null,'',window.location.pathname+window.location.search+(next==='loans'?'#loans':''));
    window.scrollTo({ top: 0 });
    setScreen(next);
  };
  const selectLoan = (id:number|null) => {
    setSelectedLoanId(id);setConfirmation(null);
    window.history.replaceState(null,'',window.location.pathname+window.location.search+(id===null?'#loans':`#loans/${id}`));
    window.scrollTo({top:0});
  };

  return <div className="min-h-screen bg-[#F8FAFC] pb-24 lg:pb-0">
    <Navbar user={user} onLogout={onLogout} onLogin={onLogin} currentScreen={screen} onNavigate={navigate} planCount={planCount} />
    <main id="main-content">
      {screen === 'home' && user && <HomeScreen user={user} items={[]} userLoans={[]} onNavigate={navigate}
        liveCatalog={{ items: catalog.items, roomCount: rooms.length, planCount, loading: catalog.loading, error: catalog.error }}
        onSearch={value => { setSearch(value); navigate('catalog'); }} />}
      {(screen === 'catalog' || screen === 'plan') && <CatalogScreen {...catalog} accessMode={user ? 'authenticated' : 'public'} searchQuery={search} onSearchChange={setSearch} focusPlan={screen === 'plan'}
        onSchedule={()=>navigate('schedule')}
        onBrowse={()=>{setSearch('');navigate('catalog');document.getElementById('catalog-search')?.focus();}}
        onApply={user?.role==='student'?()=>navigate('loan-form'):undefined}
        onBack={() => user ? navigate(internal ? 'dashboard' : 'home') : onLogin()} />}
      {screen==='loan-form'&&user?.role==='student'&&<LoanFormScreen user={user} items={catalog.items} plan={catalog.plan} draft={loanDraft} onDraftChange={setLoanDraft} onBack={()=>navigate('plan')} onBrowse={()=>navigate('catalog')} onPlanChange={catalog.onPlanChange} onHistory={()=>navigate('loans')}
        onSuccess={(loan,input)=>{onSubmitted(input.items);setLoanDraft(emptyLoanDraft());setSelectedLoanId(loan.id);setConfirmation(loan);setScreen('loans');window.history.replaceState(null,'',`#loans/${loan.id}`);window.scrollTo({top:0});}} />}
      {screen==='loans'&&user?.role==='student'&&<MyLoansScreen selectedId={selectedLoanId} onSelect={selectLoan} onBack={()=>navigate('catalog')} confirmation={confirmation} />}
      {screen === 'rooms' && <RoomCatalogScreen rooms={rooms} loading={catalog.loading} error={catalog.error} onBack={() => user ? navigate('home') : onLogin()} />}
      {screen === 'profile' && user && <ProfileScreen user={user} onLogout={onLogout} onLogin={onLogin} sessionOnly />}
      {screen === 'dashboard' && user?.role === 'admin' && <AdminDashboardContainer user={user} onLogout={onLogout} onBrowse={() => navigate('catalog')} />}
      {screen==='schedule' && <section className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5"><h1 className="font-bold text-2xl text-[#9A1823]">Jadwal Peminjaman</h1><button type="button" onClick={()=>navigate('catalog')} className="border rounded-xl px-4 min-h-11 bg-white font-semibold">Kembali ke Katalog</button><ScheduleContainer items={catalog.items} loading={catalog.loading} error={catalog.error} /></section>}
      {screen === 'dashboard' && user?.role === 'warehouse' && <WarehouseDashboard user={user} onLogout={onLogout} loanRequests={[]} onUpdateLoan={() => {}} readOnly onBrowse={() => navigate('catalog')} />}
      {screen === 'dashboard' && !internal && <p role="alert" className="p-6">Akses dashboard internal memerlukan akun Admin atau Petugas yang terverifikasi.</p>}
      {screen==='credits'&&<ImageCreditsScreen onBack={()=>navigate('catalog')} />}
    </main>
    <footer className="sl-shell py-6 text-sm text-slate-600"><p>Gambar inventaris adalah ilustrasi, bukan foto unit kampus. <button type="button" onClick={()=>navigate('credits')} className="underline font-semibold text-[#9A1823] min-h-11">Kredit Gambar</button></p><p>Keranjang dan draft belum dikirim disimpan di memori tab; refresh/logout menghapus draft. Pengajuan tersimpan tetap ada di Peminjaman Saya.</p></footer>
    <BottomNav currentScreen={screen} onNavigate={navigate} publicOnly={!user} showLoans={user?.role==='student'} planCount={planCount} />
  </div>;
}
