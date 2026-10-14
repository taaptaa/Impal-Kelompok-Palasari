import { useState } from 'react';
import { RoleSelectionScreen } from './screens/RoleSelectionScreen';
import { LoginScreen } from './screens/LoginScreen';
import { RegistrationScreen } from './screens/RegistrationScreen';
import { MainApp } from './screens/MainApp';
import { User, UserRole } from './types';
import { Toaster } from 'sonner';

type AppScreen = 'role-selection' | 'login' | 'register' | 'main';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('role-selection');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleSelectRole = (role: UserRole, action: 'login' | 'register') => {
    setSelectedRole(role);
    setCurrentScreen(action);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentScreen('main');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedRole(null);
    setCurrentScreen('role-selection');
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setCurrentScreen('role-selection');
  };

  const handleSwitchToLogin = () => {
    setCurrentScreen('login');
  };

  const handleSwitchToRegister = () => {
    setCurrentScreen('register');
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      {currentScreen === 'role-selection' && (
        <RoleSelectionScreen onSelectRole={handleSelectRole} />
      )}
      {currentScreen === 'login' && selectedRole && (
        <LoginScreen 
          onLogin={handleLogin} 
          selectedRole={selectedRole}
          onBack={handleBackToRoleSelection}
          onSwitchToRegister={handleSwitchToRegister}
        />
      )}
      {currentScreen === 'register' && selectedRole && (
        <RegistrationScreen 
          onRegister={handleLogin} 
          selectedRole={selectedRole}
          onBack={handleBackToRoleSelection}
          onSwitchToLogin={handleSwitchToLogin}
        />
      )}
      {currentScreen === 'main' && currentUser && (
        <MainApp user={currentUser} onLogout={handleLogout} />
      )}
    </>
  );
}