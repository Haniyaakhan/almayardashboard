'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f2ee' }}>
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #ff6b2b, #ff9a5c)', boxShadow: '0 4px 14px rgba(255,107,43,0.3)' }}>
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20, color: '#fff' }}>A</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a1a2e', fontFamily: "'Sora', sans-serif" }}>ALMYAR Platform</h1>
          <p className="text-sm mt-1" style={{ color: '#9e9690' }}>Railway Construction Management</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: '#ffffff', border: '1px solid #ece8e2', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#1a1a2e' }}>Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1.5" style={{ color: '#9e9690', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{ background: '#f4f2ee', border: '1px solid #ece8e2', color: '#2d2a26' }}
                onFocus={e => { e.target.style.borderColor = '#ff6b2b'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,43,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#ece8e2'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label className="block mb-1.5" style={{ color: '#9e9690', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="********"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{ background: '#f4f2ee', border: '1px solid #ece8e2', color: '#2d2a26' }}
                onFocus={e => { e.target.style.borderColor = '#ff6b2b'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,43,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#ece8e2'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#c62828', border: '1px solid rgba(239,68,68,0.15)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: loading ? '#e05c00' : '#ff6b2b' }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLElement).style.background = '#e05c00'; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLElement).style.background = '#ff6b2b'; }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#b5b0aa' }}>
          ALMYAR UNITED TRADING LLC · UAE Oman Railway Project
        </p>
      </div>
    </div>
  );
}
