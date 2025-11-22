
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../hooks/useToast';
import { DocumentTextIcon } from './icons/Icons';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const { addToast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user) {
            // Create profile
            const { error: profileError } = await supabase.from('profiles').insert({
                id: data.user.id,
                email: email,
                full_name: fullName,
                role: 'collaborator' // Default role
            });
            if (profileError) console.error('Profile creation failed', profileError);
        }
        addToast('Account created! Please sign in.', 'success');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        addToast('Welcome back!', 'success');
      }
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
       {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 p-8">
        <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-3 rounded-xl shadow-lg shadow-indigo-500/30 mb-4">
                <DocumentTextIcon className="h-8 w-8 text-white"/>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Freelance OS</h2>
            <p className="text-slate-400 mt-2">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-field w-full bg-slate-900/50"
                        placeholder="John Doe"
                        required={isSignUp}
                    />
                </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full bg-slate-900/50"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full bg-slate-900/50"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full primary-gradient py-3 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/25 mt-4 transition-transform hover:-translate-y-0.5 active:scale-95 flex justify-center"
            >
              {loading ? (
                 <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                 isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Create one'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
