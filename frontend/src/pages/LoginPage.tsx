import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Sparkles, User, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { ThaparLogo } from '@/components/common/ThaparLogo';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, devLogin, isOnboarded, error, clearError } =
    useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const googleBtnContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '923713008581-ebtmgh736da1ep5eiutubav6f3sbr7dr.apps.googleusercontent.com';

    const handleCredentialResponse = async (response: any) => {
      if (response?.credential) {
        clearError();
        try {
          await loginWithGoogle(response.credential);
          redirectAfterLogin();
        } catch (e) {
          // Error handled in store
        }
      }
    };

    const setupGoogleBtn = () => {
      if ((window as any).google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnContainerRef.current.innerHTML = '';
          (window as any).google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            width: 320,
            logo_alignment: 'left',
          });
        } catch (err) {
          console.warn('Google Identity Services init error:', err);
        }
      }
    };

    setupGoogleBtn();
    const timer = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        setupGoogleBtn();
        clearInterval(timer);
      }
    }, 300);

    return () => clearInterval(timer);
  }, []);

  const redirectAfterLogin = () => {
    const from = (location.state as any)?.from?.pathname || (isOnboarded ? '/cabs' : '/');
    navigate(from, { replace: true });
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

        <div className="mt-6 flex flex-col items-center justify-center space-y-3">
          {/* Official Google Identity Services GIS Sign-In Button */}
          <div ref={googleBtnContainerRef} className="min-h-[44px] flex items-center justify-center w-full" />
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
