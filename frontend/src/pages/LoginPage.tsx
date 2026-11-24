import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Sparkles, User, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { ThaparLogo } from '@/components/common/ThaparLogo';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, devLogin, isOnboarded, error, clearError, isLoading } =
    useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterLogin = () => {
    const from = (location.state as any)?.from?.pathname || (isOnboarded ? '/cabs' : '/');
    navigate(from, { replace: true });
  };

  const handleSimulatedGoogleLogin = async (customEmail?: string) => {
    clearError();
    const email = customEmail || 'student.tiet@thapar.edu';
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        email,
        email_verified: true,
        name: email.split('@')[0].replace('.', ' '),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    const mockIdToken = `${header}.${payload}.mockSignature`;

    try {
      await loginWithGoogle(mockIdToken);
      redirectAfterLogin();
    } catch (e) {
      // Error handled in store
    }
  };

  const handleDevLogin = async (email: string, name: string, role: 'USER' | 'ADMIN') => {
    clearError();
    try {
      await devLogin({ email, name, role });
      redirectAfterLogin();
    } catch (e) {
      // Error handled in store
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-12 px-4">
      <div className="rounded-2xl border border-[#B7BEB2]/80 bg-[#E6E9E3]/70 p-6 sm:p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F6F7F5] border border-[#B7BEB2]/60 ring-1 ring-[#A3D65C]/40 dark:bg-white/5 dark:ring-gold-400/30 mb-4 transition transform hover:scale-105">
          <ThaparLogo className="h-12 w-12" size={48} />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-[#20251F] dark:text-slate-100">
          Thapar Connect SSO
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#20251F]/70 dark:text-slate-400">
          Sign in using your institutional <strong className="text-[#20251F] font-bold dark:text-gold-400">@thapar.edu</strong> Google account.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-left dark:border-red-900/50 dark:bg-red-950/40">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800 dark:text-red-300">
                <p className="font-semibold">Access Denied</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={() => handleSimulatedGoogleLogin()}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-[#B7BEB2] bg-[#F6F7F5] px-4 py-3 text-sm font-semibold text-[#20251F] shadow-xs transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#A3D65C] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google (@thapar.edu)
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#20251F]/60 dark:text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-[#20251F] dark:text-emerald-400" />
          Strict Google ID token verification with @thapar.edu domain constraint
        </div>

        <div className="mt-8 border-t border-[#B7BEB2]/60 dark:border-slate-800 pt-6 text-left">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#20251F]/70 uppercase tracking-wider mb-3 dark:text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-[#20251F] dark:text-gold-500" />
            Developer Personas (Dev Mode)
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleDevLogin('freshman@thapar.edu', 'Aman Preet', 'USER')}
              className="flex items-center justify-between rounded-lg border border-[#B7BEB2]/70 bg-[#F6F7F5] p-2.5 text-left text-xs hover:border-[#20251F] dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div>
                <span className="font-semibold text-[#20251F] dark:text-slate-200">
                  1. Fresh Student (Un-onboarded)
                </span>
                <p className="text-[11px] text-[#20251F]/60 dark:text-slate-400">freshman@thapar.edu (triggers OnboardingModal)</p>
              </div>
              <User className="h-4 w-4 text-[#20251F]/50 dark:text-slate-400" />
            </button>

            <button
              onClick={() => handleDevLogin('rohan.sharma@thapar.edu', 'Rohan Sharma', 'USER')}
              className="flex items-center justify-between rounded-lg border border-[#B7BEB2]/70 bg-[#F6F7F5] p-2.5 text-left text-xs hover:border-[#20251F] dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div>
                <span className="font-semibold text-[#20251F] dark:text-slate-200">
                  2. Active Student (Onboarded)
                </span>
                <p className="text-[11px] text-[#20251F]/60 dark:text-slate-400">rohan.sharma@thapar.edu (Hostel J)</p>
              </div>
              <User className="h-4 w-4 text-[#20251F] dark:text-emerald-500" />
            </button>

            <button
              onClick={() => handleDevLogin('admin@thapar.edu', 'Prof. H.S. Bawa', 'ADMIN')}
              className="flex items-center justify-between rounded-lg border border-[#20251F] bg-[#20251F] p-2.5 text-left text-xs hover:bg-[#323930] dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div>
                <span className="font-semibold text-[#F6F7F5] dark:text-slate-200">
                  3. Campus Administrator
                </span>
                <p className="text-[11px] text-[#B7BEB2] dark:text-slate-400">admin@thapar.edu (Role: ADMIN)</p>
              </div>
              <Shield className="h-4 w-4 text-[#A3D65C] dark:text-gold-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
