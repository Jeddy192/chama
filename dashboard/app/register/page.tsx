'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', pin: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: { id: string; name: string; phone: string } }>(
        '/api/auth/register', form
      );
      saveAuth({ ...data.user, token: data.token });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-800"
            style={{ background: 'var(--primary)' }}>CP</div>
          <span className="font-700 text-lg text-[var(--text-primary)]">ChamaPesa</span>
        </div>

        <h1 className="text-2xl font-800 text-[var(--text-primary)] mb-1">Create account</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-8">Join your chama on ChamaPesa</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full name" placeholder="Amina Wanjiku" value={form.name} onChange={set('name')} required />
          <Input label="Phone number" type="tel" placeholder="0712 345 678" value={form.phone} onChange={set('phone')} required />
          <Input label="PIN" type="password" placeholder="4–6 digits" value={form.pin} onChange={set('pin')} required maxLength={6} inputMode="numeric" hint="You'll use this PIN to log in" />

          {error && (
            <div className="px-3 py-2.5 rounded-lg text-sm text-[var(--danger)] bg-[var(--danger-light)]">{error}</div>
          )}

          <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">Create account</Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Already have an account?{' '}
          <a href="/login" className="text-[var(--primary)] font-500 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
