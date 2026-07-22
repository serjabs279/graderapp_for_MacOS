import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { KeyRound, ShieldAlert, User, Eye, EyeOff, Lock, Sparkles, UserPlus, CheckCircle } from 'lucide-react';

export default function LoginView() {
  const { login, bypassLogin, updateCredentials } = useApp();
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
      alert('Bypass Successful! Welcome Admin. You can now reset your custom credentials in System Settings.');
    } else {
      setBypassError('Invalid Superuser Password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans transition-colors duration-200">
      
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/20 dark:bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-200/20 dark:bg-teal-950/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Card Header Banner */}
        <div className="bg-slate-50 dark:bg-slate-950/50 p-6 text-center border-b border-slate-100 dark:border-slate-850 relative">
          <div className="inline-flex w-12 h-12 bg-emerald-600 text-white rounded-2xl items-center justify-center font-black text-xl shadow-md mb-3 animate-pulse">
            SR
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            SRPHS GRADING SYSTEM
          </h2>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-sans font-bold uppercase tracking-widest mt-1">
            SECURE ACADEMIC GATEWAY
          </p>
        </div>

        {/* Tab Selector */}
        {!showBypass && !regSuccess && (
          <div className="flex border-b border-slate-100 dark:border-slate-850 p-2 bg-slate-50/50 dark:bg-slate-950/20">
            <button
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setRegError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-150 dark:border-slate-700/60'
                  : 'text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Log In
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setError(null);
                setRegError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-150 dark:border-slate-700/60'
                  : 'text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Create Account
            </button>
          </div>
        )}

        {/* Card Body */}
        <div className="p-8">
          {regSuccess ? (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 rounded-full">
                <CheckCircle className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">Account Created!</h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 font-medium">
                  Signing you in automatically to your new workspace...
                </p>
              </div>
            </div>
          ) : showBypass ? (
            // Superuser Bypass Screen
            <form onSubmit={handleBypassSubmit} className="space-y-5 animate-fade-in">
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/20 text-amber-800 dark:text-amber-400 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-650" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Superuser Recovery Mode</span>
                </div>
                <p className="text-[10px] font-bold leading-relaxed opacity-90">
                  Forgot your credentials? Enter the secure emergency Superuser Password to bypass normal authentication, log in, and reset your custom username and password.
                </p>
                <div className="text-[10px] bg-amber-100/40 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30 font-mono flex items-center justify-between mt-2 select-all">
                  <span>BYPASS CODE:</span>
                  <span className="font-extrabold text-amber-900 dark:text-amber-300">SRPHS_SUPER_BYPASS_2026</span>
                </div>
              </div>

              {bypassError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2.5">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                  <span>{bypassError}</span>
                </div>
              )}

              {/* Bypass input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  Superuser Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-amber-500" />
                  </div>
                  <input
                    type="password"
                    value={bypassPass}
                    onChange={(e) => setBypassPass(e.target.value)}
                    placeholder="Enter bypass password"
                    className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold transition-all focus:outline-none focus:border-amber-550 focus:ring-1 focus:ring-amber-550"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBypass(false);
                    setBypassPass('');
                    setBypassError(null);
                  }}
                  className="py-3 bg-slate-100 hover:bg-slate-150 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-350 text-xs font-black rounded-2xl transition-all cursor-pointer"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  className="py-3 bg-amber-600 hover:bg-amber-650 text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4" /> Bypass Lock
                </button>
              </div>
            </form>
          ) : activeTab === 'login' ? (
            // LOG IN FORM
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2.5">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold transition-all focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-11 text-xs font-bold transition-all focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound className="h-4 w-4" /> Secure Log In
              </button>

              {/* Reset Helper link */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowBypass(true)}
                  className="text-[10px] font-sans font-bold text-slate-450 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Forgot credentials? Bypass security
                </button>
              </div>
            </form>
          ) : (
            // REGISTER / CREATE ACCOUNT FORM
            <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fade-in">
              {regError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2.5">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {/* New Username */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  Create Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Set username"
                    className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold transition-all focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  Create Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Set secure password"
                    className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-11 text-xs font-bold transition-all focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold transition-all focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus className="h-4 w-4" /> Register & Sign In
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Info helper footer */}
      <div className="mt-8 text-center text-[10px] text-slate-400 font-bold max-w-sm leading-relaxed">
        SRPHS Grader System SY 2026-2027 &copy; All Rights Reserved. Secure local data storage protocol initialized.
      </div>
    </div>
  );
}
