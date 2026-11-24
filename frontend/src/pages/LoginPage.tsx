import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Shield, KeyRound, Mail, ArrowRight, Loader2, GraduationCap } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { ThaparLogo } from '@/components/common/ThaparLogo';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, adminLogin, error, clearError, isAuthenticated, user } =
    useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const [authMode, setAuthMode] = useState<'student' | 'admin'>('student');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      redirectAfterLogin(user?.role === 'ADMIN');
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (authMode !== 'student') return;

    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '923713008581-ebtmgh736da1ep5eiutubav6f3sbr7dr.apps.googleusercontent.com';

    const handleCredentialResponse = async (response: any) => {
      if (response?.credential) {
        clearError();
        try {
          await loginWithGoogle(response.credential);
          redirectAfterLogin(false);
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
  }, [authMode]);

  const redirectAfterLogin = (isAdmin?: boolean) => {
    const fromPath = (location.state as any)?.from?.pathname;
    if (fromPath && fromPath !== '/' && fromPath !== '/login') {
      navigate(fromPath, { replace: true });
      return;
    }
    const defaultTarget = isAdmin ? '/admin' : '/cabs';
    navigate(defaultTarget, { replace: true });
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword) return;

    clearError();
    setIsSubmittingAdmin(true);
    try {
      await adminLogin({
        email: adminEmail.trim(),
        password: adminPassword,
      });
      redirectAfterLogin(true);
    } catch (e) {
      // Error handled in store
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-12 px-4">
      <div className="rounded-2xl border border-[#B7BEB2]/80 bg-[#E6E9E3]/70 p-6 sm:p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F6F7F5] border border-[#B7BEB2]/60 ring-1 ring-[#A3D65C]/40 dark:bg-white/5 dark:ring-gold-400/30 mb-4 transition transform hover:scale-105">
          <ThaparLogo className="h-12 w-12" size={48} />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-[#20251F] dark:text-slate-100">
          Thapar Connect
        </h1>

        {/* Tab Switcher: Student SSO vs Admin Portal */}
        <div className="mt-5 grid grid-cols-2 rounded-xl bg-[#F6F7F5] p-1 border border-[#B7BEB2]/60 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => {
              clearError();
              setAuthMode('student');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
              authMode === 'student'
                ? 'bg-[#20251F] text-[#F6F7F5] shadow-xs'
                : 'text-[#20251F]/70 hover:text-[#20251F] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Student SSO
          </button>
          <button
            type="button"
            onClick={() => {
              clearError();
              setAuthMode('admin');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
              authMode === 'admin'
                ? 'bg-[#20251F] text-[#F6F7F5] shadow-xs'
                : 'text-[#20251F]/70 hover:text-[#20251F] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Admin Portal
          </button>
        </div>

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

        {authMode === 'student' ? (
          /* Student SSO Section */
          <div className="mt-5">
            <p className="text-xs sm:text-sm text-[#20251F]/70 dark:text-slate-400">
              Sign in using your institutional <strong className="text-[#20251F] font-bold dark:text-gold-400">@thapar.edu</strong> Google account.
            </p>

            <div className="mt-6 flex flex-col items-center justify-center space-y-3">
              <div ref={googleBtnContainerRef} className="min-h-[44px] flex items-center justify-center w-full" />
            </div>

            <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#20251F]/60 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-[#20251F] dark:text-emerald-400" />
              Strict Google ID token verification with @thapar.edu domain constraint
            </div>
          </div>
        ) : (
          /* Campus Administrator Login Form */
          <form onSubmit={handleAdminSubmit} className="mt-5 text-left space-y-3.5">
            <p className="text-xs text-[#20251F]/70 dark:text-slate-400 text-center">
              Sign in with your campus administrator ID and password.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-[#20251F]/80 uppercase tracking-wider mb-1 dark:text-slate-300">
                Admin Email / ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#20251F]/40" />
                <input
                  type="text"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@thapar.edu"
                  className="w-full rounded-xl border border-[#B7BEB2] bg-[#F6F7F5] py-2.5 pl-9 pr-3 text-xs text-[#20251F] placeholder-[#20251F]/40 focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#20251F]/80 uppercase tracking-wider mb-1 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#20251F]/40" />
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#B7BEB2] bg-[#F6F7F5] py-2.5 pl-9 pr-3 text-xs text-[#20251F] placeholder-[#20251F]/40 focus:border-[#20251F] focus:outline-none focus:ring-1 focus:ring-[#A3D65C] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingAdmin || !adminEmail.trim() || !adminPassword}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#20251F] py-2.5 px-4 text-xs font-semibold text-[#F6F7F5] transition hover:bg-[#323930] hover:ring-2 hover:ring-[#A3D65C]/60 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              {isSubmittingAdmin ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#A3D65C]" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In as Administrator
                  <ArrowRight className="h-3.5 w-3.5 text-[#A3D65C]" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#20251F]/60 dark:text-slate-400 pt-1">
              <Shield className="h-3.5 w-3.5 text-[#20251F]" />
              Authorized institutional moderation personnel only
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
