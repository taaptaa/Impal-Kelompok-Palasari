export type MainScreen = 'home' | 'catalog' | 'rooms' | 'plan' | 'profile' | 'dashboard' | 'loan-form' | 'loans' | 'schedule' | 'credits';

export type PublicScreen = Extract<MainScreen, 'catalog' | 'rooms' | 'plan' | 'schedule' | 'credits'>;

export function isPublicScreen(screen: MainScreen): screen is PublicScreen {
  return screen === 'catalog' || screen === 'rooms' || screen === 'plan' || screen === 'schedule' || screen === 'credits';
}
