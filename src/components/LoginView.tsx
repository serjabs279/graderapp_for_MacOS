import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { KeyRound, ShieldAlert, User, Eye, EyeOff, Lock, UserPlus, CheckCircle } from 'lucide-react';

export default function LoginView() {
  const { login, bypassLogin, updateCredentials } = useApp();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  // Superuser Bypass states
  const [showBypass, setShowBypass] = useState(false);
  const [bypassPass, setBypassPass] = useState('');
  const [bypassError, setBypassError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    const success = login(username, password);
    if (success) {
      // Logged in successfully
    } else {
      setError('Invalid username or password.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    if (!regUsername.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
      setRegError('Please fill in all fields.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 4) {
      setRegError('Password must be at least 4 characters long.');
      return;
    }

    // Register credentials and capture values to avoid any closure/state timing
    const newUsername = regUsername.trim();
    const newPassword = regPassword;
    updateCredentials(newUsername, newPassword);
    setRegSuccess(true);

    // Automatically log them in after a short delay for fluid UX.
    // If automatic sign-in fails, show an error and return the user
    // to the register tab so they can attempt manual sign-in.
    setTimeout(() => {
      const success = login(newUsername, newPassword);
      if (!success) {
        setRegError('Automatic sign-in failed. Please sign in manually.');
        setRegSuccess(false);
        setActiveTab('login');
      }
    }, 1200);
  };

  const handleBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBypassError(null);
    if (!bypassPass.trim()) {
      setBypassError('Please enter the superuser bypass password.');
      return;
    }

    const success = bypassLogin(bypassPass.trim());
    if (success) {
      toast.success('Bypass Successful! Welcome Admin. You can now reset your custom credentials in System Settings.', 'Superuser Access Granted');
    } else {
      setBypassError('Invalid Superuser Password.');
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 p-4 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:p-6">
      <main className="ui-panel w-full max-w-md overflow-hidden">
        <header className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-base font-semibold text-white" aria-hidden="true">
              SR
            </div>
            <div>
              <p className="text-pretty text-sm font-semibold">SRPHS Grading System</p>
              <p className="text-pretty text-xs text-slate-500 dark:text-slate-400">Your offline grading workspace</p>
            </div>
          </div>
          <h1 className="ui-heading text-balance">
            {regSuccess ? 'You’re ready to begin' : showBypass ? 'Recover your account' : activeTab === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="ui-description">
            {regSuccess ? 'Your account has been created.' : showBypass ? 'Use superuser recovery to regain access to your workspace.' : activeTab === 'login' ? 'Sign in to continue with your classes and grade records.' : 'Set the username and password for this local workspace.'}
          </p>
        </header>

        {!showBypass && !regSuccess && (
          <div className="ui-tabs px-5 pt-3 sm:px-6" aria-label="Account access">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setRegError(null);
              }}
              className="ui-tab flex-1"
              aria-pressed={activeTab === 'login'}
            >
              <KeyRound className="size-4" aria-hidden="true" />
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError(null);
                setRegError(null);
              }}
              className="ui-tab flex-1"
              aria-pressed={activeTab === 'register'}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Create Account
            </button>
          </div>
        )}

        <div className="p-5 sm:p-6">
          {regSuccess ? (
            <div className="space-y-3 py-3 text-center" role="status">
              <CheckCircle className="mx-auto size-9 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <h2 className="ui-section-title text-balance">Account created</h2>
              <p className="text-pretty text-sm text-slate-600 dark:text-slate-400">Signing you in automatically to your new workspace...</p>
            </div>
          ) : showBypass ? (
            <form onSubmit={handleBypassSubmit} className="space-y-5">
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <h2 className="flex items-center gap-2 text-balance text-sm font-semibold">
                  <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
                  Superuser recovery
                </h2>
                <p className="text-pretty text-sm leading-relaxed">
                  Enter the emergency Superuser Password to bypass normal authentication. Once signed in, you can reset your username and password in System Settings.
                </p>
                <div className="space-y-1 border-t border-amber-200 pt-3 dark:border-amber-900">
                  <span className="block text-xs font-medium">Bypass code</span>
                  <code className="block select-all break-all text-sm tabular-nums">SRPHS_SUPER_BYPASS_2026</code>
                </div>
              </div>

              {bypassError && (
                <div id="recovery-error" role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-pretty text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{bypassError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="recovery-password" className="ui-label">Superuser password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="recovery-password"
                    type="password"
                    value={bypassPass}
                    onChange={(e) => setBypassPass(e.target.value)}
                    placeholder="Enter bypass password"
                    aria-invalid={Boolean(bypassError)}
                    aria-describedby={bypassError ? 'recovery-error' : undefined}
                    className="ui-field pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowBypass(false);
                    setBypassPass('');
                    setBypassError(null);
                  }}
                  className="ui-button flex-1"
                >
                  Back to Login
                </button>
                <button type="submit" className="ui-button-primary flex-1">
                  <KeyRound className="size-4" aria-hidden="true" /> Recover access
                </button>
              </div>
            </form>
          ) : activeTab === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {(error || regError) && (
                <div id="login-error" role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-pretty text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{error || regError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="login-username" className="ui-label">Username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error || regError ? 'login-error' : undefined}
                    className="ui-field pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="ui-label">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error || regError ? 'login-error' : undefined}
                    className="ui-field pl-10 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ui-icon-button absolute right-0 top-0"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button type="submit" className="ui-button-primary w-full">
                <KeyRound className="size-4" aria-hidden="true" /> Log In
              </button>

              <button type="button" onClick={() => setShowBypass(true)} className="ui-button w-full">
                Forgot your credentials?
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              {regError && (
                <div id="register-error" role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-pretty text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="register-username" className="ui-label">Create username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="register-username"
                    type="text"
                    autoComplete="username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Set username"
                    aria-describedby={regError ? 'register-error' : undefined}
                    className="ui-field pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="register-password" className="ui-label">Create password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="register-password"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Set password"
                    aria-describedby={regError ? 'register-password-help register-error' : 'register-password-help'}
                    className="ui-field pl-10 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="ui-icon-button absolute right-0 top-0"
                    aria-label={showRegPassword ? 'Hide both passwords' : 'Show both passwords'}
                    aria-pressed={showRegPassword}
                    aria-controls="register-password register-confirm-password"
                  >
                    {showRegPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
                <p id="register-password-help" className="text-pretty text-xs text-slate-500 dark:text-slate-400">Use at least 4 characters.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="register-confirm-password" className="ui-label">Confirm password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
                  <input
                    id="register-confirm-password"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    aria-describedby={regError ? 'register-error' : undefined}
                    className="ui-field pl-10"
                  />
                </div>
              </div>

              <button type="submit" className="ui-button-primary w-full">
                <UserPlus className="size-4" aria-hidden="true" /> Register & Sign In
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="mt-6 max-w-sm text-center text-pretty text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        SRPHS Grader System · <span className="tabular-nums">SY 2026–2027</span><br />
        Offline workspace. Data is stored on this device.
      </footer>
    </div>
  );
}
