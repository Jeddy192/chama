import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)]" style={{ background: 'var(--surface)' }}>
        <div className="max-w-5xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-800"
              style={{ background: 'var(--primary)' }}>CP</div>
            <span className="font-800 text-lg" style={{ color: 'var(--text-primary)' }}>ChamaPesa</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="px-4 py-2 rounded-lg text-sm font-600 transition-colors"
              style={{ color: 'var(--text-secondary)' }}>
              Sign in
            </Link>
            <Link href="/register"
              className="px-4 py-2 rounded-lg text-sm font-600 text-white transition-colors"
              style={{ background: 'var(--primary)' }}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-600 mb-8"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            🇰🇪 Built for Kenyan chamas · Powered by M-Pesa
          </div>

          <h1 className="font-800 leading-tight mb-6"
            style={{ fontSize: 'clamp(40px, 5vw, 64px)', color: 'var(--text-primary)' }}>
            Your chama,<br />
            <span style={{ color: 'var(--primary)' }}>running itself.</span>
          </h1>

          <p className="text-lg leading-relaxed mb-10 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
            Automated M-Pesa collections, rotating payouts, goal-based savings pools, and anonymous voting — all in one place. No more chasing members for contributions.
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-700 text-white transition-colors"
              style={{ background: 'var(--primary)' }}>
              Start for free →
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-600 border transition-colors"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--surface)' }}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Stats — horizontal rule style, not hero metric layout */}
      <section className="border-y border-[var(--border)]" style={{ background: 'var(--surface)' }}>
        <div className="max-w-5xl mx-auto px-8 py-8 flex divide-x divide-[var(--border)]">
          {[
            { n: 'KES 2.4M', l: 'Collected this month' },
            { n: '98.2%',    l: 'On-time collection rate' },
            { n: '12–15%',   l: 'Annual returns on idle funds' },
            { n: '< 10s',    l: 'To trigger an STK Push' },
          ].map(({ n, l }) => (
            <div key={l} className="flex-1 px-8 first:pl-0 last:pr-0">
              <div className="font-800 tabular mb-1" style={{ fontSize: 24, color: 'var(--text-primary)' }}>{n}</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features — asymmetric layout, not a card grid */}
      <section className="max-w-5xl mx-auto px-8 py-20">
        <div className="mb-14">
          <h2 className="font-800 mb-3" style={{ fontSize: 32, color: 'var(--text-primary)' }}>
            Everything your chama needs
          </h2>
          <p className="text-base" style={{ color: 'var(--text-secondary)', maxWidth: 480 }}>
            From first contribution to final payout — automated, transparent, and fair.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-0 border border-[var(--border)] rounded-2xl overflow-hidden" style={{ background: 'var(--surface)' }}>
          {[
            {
              title: 'Automated M-Pesa Collections',
              desc: 'STK Push sent to every member on contribution day. Missed payments flagged automatically. No manual follow-ups, no awkward reminders.',
              tag: 'Collections',
            },
            {
              title: 'Rotating Payouts',
              desc: 'Once all members pay, B2C payout fires automatically to the next person in rotation. Full M-Pesa receipt trail for every transaction.',
              tag: 'Payouts',
            },
            {
              title: 'Savings Pools + Real Returns',
              desc: 'Split contributions across multiple pools — emergency fund, dividends, custom goals. Idle funds earn 12–15% p.a. through money market instruments.',
              tag: 'Savings',
              highlight: true,
            },
            {
              title: 'Anonymous Voting',
              desc: 'Members vote on loans and motions privately. Configurable thresholds. Results auto-execute — loan approved? B2C disbursement triggers immediately.',
              tag: 'Governance',
              highlight: true,
            },
            {
              title: 'Trust Scores',
              desc: 'Every member gets a 0–100 score based on payment history, loan repayment, tenure, and participation. Below 50? No loans. Portable across chamas.',
              tag: 'Trust',
              highlight: true,
            },
            {
              title: 'Treasurer Dashboard',
              desc: 'Full visibility: contribution grid, loan tracker, pool balances, rotation schedule. Export to CSV. Built for the person responsible for the money.',
              tag: 'Dashboard',
            },
          ].map(({ title, desc, tag, highlight }, i, arr) => (
            <div key={title}
              className={`flex gap-6 p-7 ${i < arr.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
              style={highlight ? { background: 'var(--primary-light)' } : {}}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-700 text-base" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-600"
                    style={{
                      background: highlight ? 'var(--primary)' : 'var(--gray-100)',
                      color: highlight ? 'white' : 'var(--text-muted)',
                    }}>{tag}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — timeline */}
      <section className="border-t border-[var(--border)]" style={{ background: 'var(--surface)' }}>
        <div className="max-w-5xl mx-auto px-8 py-20">
          <h2 className="font-800 mb-12" style={{ fontSize: 32, color: 'var(--text-primary)' }}>
            Up and running in minutes
          </h2>
          <div className="grid sm:grid-cols-4 gap-8">
            {[
              { n: '1', t: 'Create your chama', d: 'Set name, contribution amount, and frequency.' },
              { n: '2', t: 'Invite members', d: 'Add by phone number. They register and join instantly.' },
              { n: '3', t: 'Set the rotation', d: 'Order members for merry-go-round payouts.' },
              { n: '4', t: 'Sit back', d: 'Collections and payouts run automatically on schedule.' },
            ].map(({ n, t, d }) => (
              <div key={n}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-800 text-white mb-4"
                  style={{ background: 'var(--primary)', fontSize: 16 }}>{n}</div>
                <div className="font-700 mb-1.5" style={{ color: 'var(--text-primary)' }}>{t}</div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-8 py-20">
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--primary)' }}>
          <h2 className="font-800 text-white mb-3" style={{ fontSize: 32 }}>
            Ready to modernize your chama?
          </h2>
          <p className="text-white/70 mb-8 text-base">Free to use. No setup fees. Powered by M-Pesa Daraja.</p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-700 text-base transition-colors"
            style={{ background: 'white', color: 'var(--primary)' }}>
            Create your chama →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm" style={{ color: 'var(--text-muted)' }}>
          <span>© 2026 ChamaPesa</span>
          <span>Built with M-Pesa Daraja · Africa's Talking · Next.js</span>
        </div>
      </footer>
    </div>
  );
}
