import { Outlet } from 'react-router-dom';
import nexoraLogo from '@/assets/icons/nexora-logo-56.png';

export function AuthLayout() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-sidebar">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative w-full max-w-md mx-auto px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4 overflow-hidden">
            <img src={nexoraLogo} alt="Nexora Solution" className="h-16 w-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-content">Nexora Solution</h1>
          <p className="text-sm text-content-secondary mt-1">
            Enterprise Restaurant POS
          </p>
          <p className="text-xs text-content-tertiary mt-1">
            Smart Business Solutions
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-elevated border border-border rounded-xl shadow-dropdown p-6">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-content-tertiary mt-6">
          &copy; {new Date().getFullYear()} Nexora Solution. All rights reserved.
          <br />
          <span className="text-[10px]">Powered by Nexora Solution</span>
        </p>
      </div>
    </div>
  );
}
