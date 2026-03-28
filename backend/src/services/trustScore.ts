import prisma from '../utils/prisma';

interface ScoreFactors {
  onTimeContributions: number; // percentage 0-100
  loanRepayment: number;
  tenureMonths: number;
  votingParticipation: number;
  penaltyCount: number;
}

function calculateScore(f: ScoreFactors): number {
  const tenure = Math.min(f.tenureMonths / 24, 1) * 100; // max at 2 years
  const penalties = Math.max(0, 100 - f.penaltyCount * 10);

  const score = Math.round(
    f.onTimeContributions * 0.4 +
    f.loanRepayment * 0.25 +
    tenure * 0.15 +
    f.votingParticipation * 0.1 +
    penalties * 0.1
  );

  return Math.max(0, Math.min(100, score));
}

export async function updateTrustScore(userId: string, chamaId: string) {
  const member = await prisma.chamaMember.findUnique({
    where: { userId_chamaId: { userId, chamaId } },
  });
  if (!member) return;

  // On-time contributions
  const contributions = await prisma.contribution.findMany({ where: { userId, chamaId } });
  const total = contributions.length || 1;
  const onTime = contributions.filter(c => c.status === 'PAID' && c.transactionDate && c.transactionDate <= c.dueDate).length;
  const onTimeContributions = (onTime / total) * 100;

  // Loan repayment
  const loans = await prisma.loan.findMany({ where: { borrowerId: userId, chamaId } });
  const totalLoans = loans.length || 1;
  const repaid = loans.filter(l => l.status === 'REPAID').length;
  const loanRepayment = (repaid / totalLoans) * 100;

  // Tenure
  const tenureMonths = Math.floor((Date.now() - member.joinedAt.getTime()) / (30 * 24 * 60 * 60 * 1000));

  // Voting participation
  const chamaMotions = await prisma.motion.count({ where: { chamaId } });
  const userVotes = await prisma.vote.count({ where: { userId, motion: { chamaId } } });
  const votingParticipation = chamaMotions ? (userVotes / chamaMotions) * 100 : 100;

  // Penalties (missed contributions)
  const penaltyCount = contributions.filter(c => c.status === 'MISSED').length;

  const score = calculateScore({ onTimeContributions, loanRepayment, tenureMonths, votingParticipation, penaltyCount });

  await prisma.chamaMember.update({
    where: { userId_chamaId: { userId, chamaId } },
    data: { trustScore: score },
  });

  return score;
}
