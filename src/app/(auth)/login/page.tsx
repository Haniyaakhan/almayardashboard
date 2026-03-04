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
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'rgba(232,118,43,0.15)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e8762b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">ALMYAR Platform</h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Railway Construction Management</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: '#1e2336', border: '1px solid #2d3454' }}>
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-colors"
                style={{ background: '#0f1117', border: '1px solid #2d3454' }}
                onFocus={e => (e.target.style.borderColor = '#e8762b')}
                onBlur={e => (e.target.style.borderColor = '#2d3454')}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-colors"
                style={{ background: '#0f1117', border: '1px solid #2d3454' }}
                onFocus={e => (e.target.style.borderColor = '#e8762b')}
                onBlur={e => (e.target.style.borderColor = '#2d3454')}
              />
            </div>

            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: loading ? '#d4691f' : '#e8762b' }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLElement).style.background = '#d4691f'; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLElement).style.background = '#e8762b'; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#64748b' }}>
          ALMYAR UNITED TRADING LLC · UAE Oman Railway Project
        </p>
      </div>
    </div>
  );
}
