import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ChamaPesa demo data...');

  // Clean up
  await prisma.vote.deleteMany();
  await prisma.motion.deleteMany();
  await prisma.loanRepayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.rotation.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.chamaMember.deleteMany();
  await prisma.chama.deleteMany();
  await prisma.mpesaTransaction.deleteMany();
  await prisma.user.deleteMany();

  const pin = await bcrypt.hash('1234', 10);

  // Create users
  const users = await Promise.all([
    prisma.user.create({ data: { name: 'Amina Wanjiku',   phone: '0712345678', pin } }),
    prisma.user.create({ data: { name: 'Brian Otieno',    phone: '0723456789', pin } }),
    prisma.user.create({ data: { name: 'Cynthia Muthoni', phone: '0734567890', pin } }),
    prisma.user.create({ data: { name: 'David Kamau',     phone: '0745678901', pin } }),
    prisma.user.create({ data: { name: 'Esther Achieng',  phone: '0756789012', pin } }),
    prisma.user.create({ data: { name: 'Felix Mutua',     phone: '0767890123', pin } }),
  ]);

  const [amina, brian, cynthia, david, esther, felix] = users;

  // Create chama
  const chama = await prisma.chama.create({
    data: {
      name: 'Umoja Savings Group',
      contributionAmount: 2000,
      frequency: 'MONTHLY',
      nextContributionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      penaltyRate: 0.1,
    },
  });

  // Add members
  const members = await Promise.all([
    prisma.chamaMember.create({ data: { userId: amina.id,   chamaId: chama.id, role: 'ADMIN',      trustScore: 92 } }),
    prisma.chamaMember.create({ data: { userId: brian.id,   chamaId: chama.id, role: 'TREASURER',  trustScore: 85 } }),
    prisma.chamaMember.create({ data: { userId: cynthia.id, chamaId: chama.id, role: 'MEMBER',     trustScore: 78 } }),
    prisma.chamaMember.create({ data: { userId: david.id,   chamaId: chama.id, role: 'MEMBER',     trustScore: 61 } }),
    prisma.chamaMember.create({ data: { userId: esther.id,  chamaId: chama.id, role: 'MEMBER',     trustScore: 44 } }),
    prisma.chamaMember.create({ data: { userId: felix.id,   chamaId: chama.id, role: 'MEMBER',     trustScore: 55 } }),
  ]);

  // Create pools
  const [mgr, emergency, xmas] = await Promise.all([
    prisma.pool.create({ data: { chamaId: chama.id, name: 'Merry-Go-Round',      contributionSplit: 60, balance: 48000, annualInterestRate: 0.12, interestEarned: 1872, lastInterestDate: new Date(), withdrawalMethod: 'AUTO_AT_TARGET' } }),
    prisma.pool.create({ data: { chamaId: chama.id, name: 'Emergency Fund',      contributionSplit: 20, balance: 16320, annualInterestRate: 0.12, interestEarned: 320,  lastInterestDate: new Date(), withdrawalMethod: 'VOTE' } }),
    prisma.pool.create({ data: { chamaId: chama.id, name: 'Christmas Dividends', contributionSplit: 20, balance: 16480, annualInterestRate: 0.14, interestEarned: 480,  lastInterestDate: new Date(), targetAmount: 50000, withdrawalMethod: 'AUTO_AT_TARGET', lockMonths: 3 } }),
  ]);

  // Rotation
  await Promise.all(users.map((u, i) =>
    prisma.rotation.create({
      data: {
        chamaId: chama.id, memberId: u.id, position: i + 1,
        status: i < 2 ? 'COMPLETED' : 'PENDING',
        payoutAmount: i < 2 ? 12000 : null,
        paidAt: i < 2 ? new Date(Date.now() - (2 - i) * 30 * 24 * 60 * 60 * 1000) : null,
      },
    })
  ));

  // Past contributions (3 cycles)
  const now = Date.now();
  for (let cycle = 2; cycle >= 0; cycle--) {
    const dueDate = new Date(now - cycle * 30 * 24 * 60 * 60 * 1000);
    for (const user of users) {
      const missed = cycle === 0 && user.id === esther.id; // Esther missed current cycle
      const pending = cycle === 0 && user.id === felix.id;  // Felix pending
      await prisma.contribution.create({
        data: {
          userId: user.id, chamaId: chama.id,
          amount: 2000, dueDate,
          status: missed ? 'MISSED' : pending ? 'PENDING' : 'PAID',
          mpesaReceiptNo: (!missed && !pending) ? `QHX${Math.random().toString(36).slice(2,9).toUpperCase()}` : null,
          transactionDate: (!missed && !pending) ? dueDate : null,
        },
      });
    }
  }

  // Active loan (David)
  const loan = await prisma.loan.create({
    data: {
      chamaId: chama.id, borrowerId: david.id,
      amount: 5000, interestRate: 0.1,
      status: 'REPAYING', amountRepaid: 2000,
      disbursedAt: new Date(now - 20 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now + 40 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.loanRepayment.create({
    data: { loanId: loan.id, amount: 2000, mpesaReceiptNo: 'QHX9K2M1P', paidAt: new Date(now - 10 * 24 * 60 * 60 * 1000) },
  });

  // Repaid loan (Cynthia)
  const repaidLoan = await prisma.loan.create({
    data: {
      chamaId: chama.id, borrowerId: cynthia.id,
      amount: 3000, interestRate: 0.1,
      status: 'REPAID', amountRepaid: 3300,
      disbursedAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now - 10 * 24 * 60 * 60 * 1000),
    },
  });

  // Open motion (loan approval for Felix)
  const felixLoan = await prisma.loan.create({
    data: {
      chamaId: chama.id, borrowerId: felix.id,
      amount: 4000, interestRate: 0.1, status: 'VOTING',
    },
  });
  const motion = await prisma.motion.create({
    data: {
      chamaId: chama.id, type: 'LOAN_APPROVAL',
      description: `Approve KES 4,000 loan for Felix Mutua`,
      status: 'OPEN', threshold: 0.51,
      deadline: new Date(now + 20 * 60 * 60 * 1000),
      metadata: { loanId: felixLoan.id },
    },
  });

  // 3 votes already cast
  await Promise.all([
    prisma.vote.create({ data: { motionId: motion.id, userId: amina.id,   vote: true } }),
    prisma.vote.create({ data: { motionId: motion.id, userId: brian.id,   vote: true } }),
    prisma.vote.create({ data: { motionId: motion.id, userId: cynthia.id, vote: false } }),
  ]);

  // Passed motion (rule change)
  const passedMotion = await prisma.motion.create({
    data: {
      chamaId: chama.id, type: 'RULE_CHANGE',
      description: 'Increase penalty rate from 5% to 10% for late contributions',
      status: 'PASSED', threshold: 0.67,
      deadline: new Date(now - 5 * 24 * 60 * 60 * 1000),
    },
  });
  await Promise.all(users.map((u, i) =>
    prisma.vote.create({ data: { motionId: passedMotion.id, userId: u.id, vote: i < 4 } })
  ));

  console.log('✅ Seed complete!');
  console.log('');
  console.log('👤 Login with any member:');
  console.log('   Phone: 0712345678 (Amina — Admin)');
  console.log('   Phone: 0723456789 (Brian — Treasurer)');
  console.log('   Phone: 0734567890 (Cynthia — Member)');
  console.log('   PIN: 1234 (all users)');
  console.log('');
  console.log('🏦 Chama: Umoja Savings Group');
  console.log('   6 members, 3 pools, active loan, open vote');
}

main().catch(console.error).finally(() => prisma.$disconnect());
