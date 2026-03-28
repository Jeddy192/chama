'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: { id: string; name: string; phone: string } }>(
        '/api/auth/login', { phone, pin }
      );
      saveAuth({ ...data.user, token: data.token });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] p-12"
        style={{ background: 'var(--primary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-800 text-lg">
            CP
          </div>
          <span className="text-white font-700 text-lg">ChamaPesa</span>
        </div>

        <div>
          <blockquote className="text-white/90 text-2xl font-600 leading-snug mb-6">
            "Your chama, running itself — so you can focus on growing together."
          </blockquote>
          <div className="flex flex-col gap-4">
            {[
              { n: 'KES 2.4M', l: 'Collected this month' },
              { n: '1,240',    l: 'Active members' },
              { n: '98.2%',    l: 'On-time collection rate' },
            ].map(({ n, l }) => (
              <div key={l} className="flex items-baseline gap-3">
                <span className="text-white font-800 text-xl tabular">{n}</span>
                <span className="text-white/60 text-sm">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-xs">© 2026 ChamaPesa. Powered by M-Pesa.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8">
            <h1 className="text-2xl font-800 text-[var(--text-primary)] mb-1">Welcome back</h1>
            <p className="text-[var(--text-secondary)] text-sm">Sign in to your ChamaPesa account</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Phone number"
              type="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              autoComplete="tel"
            />
            <Input
              label="PIN"
              type="password"
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              required
              maxLength={6}
              inputMode="numeric"
            />

            {error && (
              <div className="px-3 py-2.5 rounded-lg text-sm text-[var(--danger)] bg-[var(--danger-light)]">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            New to ChamaPesa?{' '}
            <a href="/register" className="text-[var(--primary)] font-500 hover:underline">
              Create account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
