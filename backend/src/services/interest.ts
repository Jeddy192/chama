import prisma from '../utils/prisma';

// Accrues daily interest on all pool balances
// Simulates money market fund at configured annual rate (default 12%)
export async function accruePoolInterest() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pools = await prisma.pool.findMany();

  for (const pool of pools) {
    // Skip if already accrued today
    if (pool.lastInterestDate) {
      const last = new Date(pool.lastInterestDate);
      last.setHours(0, 0, 0, 0);
      if (last.getTime() === today.getTime()) continue;
    }

    const balance = Number(pool.balance);
    if (balance <= 0) continue;

    const dailyRate = Number(pool.annualInterestRate) / 365;
    const interest = parseFloat((balance * dailyRate).toFixed(2));

    await prisma.pool.update({
      where: { id: pool.id },
      data: {
        balance:         { increment: interest },
        interestEarned:  { increment: interest },
        lastInterestDate: today,
      },
    });
  }

  console.log(`Interest accrued for ${pools.length} pools`);
}

// Calculate each member's share of interest in a pool
export async function getMemberInterestShare(chamaId: string, poolId: string, userId: string) {
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return 0;

  const members = await prisma.chamaMember.findMany({ where: { chamaId } });
  const totalContribs = await prisma.contribution.aggregate({
    where: { chamaId, status: 'PAID' },
    _sum: { amount: true },
  });
  const userContribs = await prisma.contribution.aggregate({
    where: { chamaId, userId, status: 'PAID' },
    _sum: { amount: true },
  });

  const total = Number(totalContribs._sum.amount || 0);
  const userTotal = Number(userContribs._sum.amount || 0);
  if (total === 0) return 0;

  const share = userTotal / total;
  return parseFloat((Number(pool.interestEarned) * share).toFixed(2));
}
