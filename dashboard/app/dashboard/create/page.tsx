'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function CreateChamaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', contributionAmount: '', frequency: 'MONTHLY', nextContributionDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const chama = await api.post<{ id: string; name: string }>('/api/chamas', {
        ...form, contributionAmount: Number(form.contributionAmount),
      });
      localStorage.setItem('cp_chama', JSON.stringify(chama));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="p-8 max-w-lg animate-fade-up">
      <h1 className="text-2xl font-800 text-[var(--text-primary)] mb-2">Create a chama</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-8">Set up your savings group. You'll be the admin.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Chama name" placeholder="e.g. Umoja Savings Group" value={form.name} onChange={set('name')} required />
        <Input label="Contribution amount (KES)" type="number" min="1" placeholder="2000"
          value={form.contributionAmount} onChange={set('contributionAmount')} required />
        <div>
          <label className="text-sm font-500 text-[var(--text-primary)] block mb-1.5">Frequency</label>
          <select value={form.frequency} onChange={set('frequency')}
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]">
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
        <Input label="First contribution date" type="date" value={form.nextContributionDate}
          onChange={set('nextContributionDate')} required />

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <Button type="submit" loading={loading} size="lg" className="mt-2">Create chama</Button>
      </form>
    </div>
  );
}
