'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmt, fmtDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { RotateCcw, GripVertical, Send } from 'lucide-react';

interface RotationEntry {
  id: string; position: number; status: string;
  payoutAmount: string | null; paidAt: string | null; memberId: string;
}

interface Member {
  id: string; role: string;
  user: { id: string; name: string; phone: string };
}

function getChama() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cp_chama');
  return raw ? JSON.parse(raw) : null;
}

export default function RotationPage() {
  const [rotation, setRotation] = useState<RotationEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Member[]>([]);
  const [editing, setEditing] = useState(false);
  const [payingOut, setPayingOut] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const chama = getChama();

  useEffect(() => {
    if (!chama) { setLoading(false); return; }
    api.get<any>(`/api/chamas/${chama.id}`).then(c => {
      setMembers(c.members);
      setRotation(c.rotations || []);
      if (c.rotations?.length > 0) {
        const sorted = [...c.rotations].sort((a: RotationEntry, b: RotationEntry) => a.position - b.position);
        const ordered = sorted.map((r: RotationEntry) => c.members.find((m: Member) => m.user.id === r.memberId || m.id === r.memberId)).filter(Boolean);
        setOrder(ordered);
      } else {
        setOrder(c.members);
      }
    }).finally(() => setLoading(false));
  }, []);

  async function saveRotation() {
    if (!chama) return;
    setSaving(true);
    try {
      await api.post(`/api/chamas/${chama.id}/rotation`, { memberIds: order.map(m => m.user.id) });
      setEditing(false);
    } catch {} finally { setSaving(false); }
  }

  async function payoutNow() {
    if (!chama) return;
    setPayingOut(true); setPayoutMsg(null);
    try {
      const res = await api.post<{ recipient: string; amount: number }>(`/api/chamas/${chama.id}/payout-now`, {});
      setPayoutMsg({ text: `B2C payout of ${fmt(res.amount)} sent to ${res.recipient}`, ok: true });
      const c = await api.get<any>(`/api/chamas/${chama.id}`);
      setRotation(c.rotations || []);
    } catch (e: any) {
      setPayoutMsg({ text: e.message, ok: false });
    } finally { setPayingOut(false); }
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...order];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setOrder(next);
  }

  function moveDown(i: number) {
    if (i === order.length - 1) return;
    const next = [...order];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setOrder(next);
  }

  if (loading) return <PageSpinner />;

  const currentPos = rotation.findIndex(r => r.status === 'PENDING');

  return (
    <div className="p-8 max-w-2xl animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-800 text-[var(--text-primary)]">Rotation</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Merry-go-round payout order</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={saveRotation} loading={saving}>Save order</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <RotateCcw size={14} /> Edit order
              </Button>
              <Button size="sm" onClick={payoutNow} loading={payingOut}>
                <Send size={13} /> Pay out now
              </Button>
            </>
          )}
        </div>
      </div>
      {payoutMsg && (
        <p className={`mb-4 text-sm ${payoutMsg.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {payoutMsg.text}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {order.map((member, i) => {
          const rotEntry = rotation[i];
          const isPaid = rotEntry?.status === 'COMPLETED';
          const isCurrent = i === currentPos || (currentPos === -1 && i === 0 && rotation.length === 0);

          return (
            <div key={member.id}
              className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-200"
              style={{
                background: isCurrent ? 'var(--primary-light)' : isPaid ? 'var(--success-light)' : 'var(--surface)',
                borderColor: isCurrent ? 'oklch(80% 0.10 38)' : isPaid ? 'oklch(80% 0.08 155)' : 'var(--border)',
              }}>
              {/* Position */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-800 shrink-0"
                style={{
                  background: isCurrent ? 'var(--primary)' : isPaid ? 'var(--success)' : 'var(--gray-200)',
                  color: isCurrent || isPaid ? 'white' : 'var(--text-muted)',
                }}>
                {i + 1}
              </div>

              <Avatar name={member.user.name} size="sm" />

              <div className="flex-1 min-w-0">
                <div className="text-sm font-600 text-[var(--text-primary)]">{member.user.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{member.user.phone}</div>
              </div>

              <div className="flex items-center gap-2">
                {isCurrent && <Badge variant="info">Next payout</Badge>}
                {isPaid && rotEntry?.payoutAmount && (
                  <span className="text-xs font-700 tabular text-[var(--success)]">{fmt(rotEntry.payoutAmount)} paid</span>
                )}
                {isPaid && <Badge variant="success">Done</Badge>}
              </div>

              {editing && (
                <div className="flex flex-col gap-0.5 ml-2">
                  <button onClick={() => moveUp(i)} disabled={i === 0}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer text-xs px-1">▲</button>
                  <button onClick={() => moveDown(i)} disabled={i === order.length - 1}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer text-xs px-1">▼</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {order.length === 0 && (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <RotateCcw size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No rotation set. Add members first, then set the order.</p>
        </div>
      )}
    </div>
  );
}
