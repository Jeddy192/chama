'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { trustColor, trustLabel, fmtDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { UserPlus, Shield } from 'lucide-react';

interface Member {
  id: string; role: string; trustScore: number; joinedAt: string;
  user: { id: string; name: string; phone: string };
}

function getChama() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cp_chama');
  return raw ? JSON.parse(raw) : null;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const chama = getChama();

  useEffect(() => {
    if (!chama) { setLoading(false); return; }
    api.get<any>(`/api/chamas/${chama.id}`)
      .then(c => setMembers(c.members))
      .finally(() => setLoading(false));
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!chama) return;
    setInviting(true); setInviteMsg(null);
    try {
      await api.post(`/api/chamas/${chama.id}/invite`, { phone: invitePhone });
      setInviteMsg({ type: 'success', text: 'Member invited successfully' });
      setInvitePhone('');
      const c = await api.get<any>(`/api/chamas/${chama.id}`);
      setMembers(c.members);
    } catch (err: any) {
      setInviteMsg({ type: 'error', text: err.message });
    } finally {
      setInviting(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="p-8 max-w-4xl animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-800 text-[var(--text-primary)]">Members</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">{members.length} members in this chama</p>
        </div>
      </div>

      {/* Invite form */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <h2 className="font-700 text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <UserPlus size={16} /> Invite member
        </h2>
        <form onSubmit={invite} className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="0712 345 678"
              type="tel"
              value={invitePhone}
              onChange={e => setInvitePhone(e.target.value)}
              required
            />
          </div>
          <Button type="submit" loading={inviting}>Invite</Button>
        </form>
        {inviteMsg && (
          <p className={`mt-2 text-sm ${inviteMsg.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {inviteMsg.text}
          </p>
        )}
      </div>

      {/* Members table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--gray-50)]">
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Member</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Role</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Trust Score</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--gray-50)] transition-colors"
                style={{ animationDelay: `${i * 30}ms` }}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user.name} size="sm" />
                    <div>
                      <div className="text-sm font-600 text-[var(--text-primary)]">{m.user.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{m.user.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={m.role === 'ADMIN' ? 'info' : m.role === 'TREASURER' ? 'warning' : 'neutral'}>
                    {m.role === 'ADMIN' && <Shield size={10} className="mr-1" />}
                    {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-20 h-1.5 rounded-full bg-[var(--gray-100)]">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${m.trustScore}%`, background: trustColor(m.trustScore) }} />
                    </div>
                    <span className="text-sm font-700 tabular" style={{ color: trustColor(m.trustScore) }}>
                      {m.trustScore}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{trustLabel(m.trustScore)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)] tabular">{fmtDate(m.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
