import cron from 'node-cron';
import prisma from '../utils/prisma';
import { stkPush } from '../services/mpesa';
import { sendSMS, sendBulkSMS } from '../services/sms';
import { b2cPayout } from '../services/mpesa';
import { updateTrustScore } from '../services/trustScore';
import { accruePoolInterest } from '../services/interest';

// Run every day at 8am — check for contributions due today
async function triggerDailyCollections() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const chamas = await prisma.chama.findMany({
    where: { nextContributionDate: { gte: today, lt: tomorrow } },
    include: { members: { include: { user: true } } },
  });

  for (const chama of chamas) {
    for (const member of chama.members) {
      try {
        const contribution = await prisma.contribution.create({
          data: {
            userId: member.userId,
            chamaId: chama.id,
            amount: chama.contributionAmount,
            dueDate: chama.nextContributionDate,
          },
        });

        const result = await stkPush(
          member.user.phone.replace(/^0/, '254'),
          Number(chama.contributionAmount),
          `CHAMA-${chama.name.slice(0, 10)}`,
          `Contribution to ${chama.name}`
        );

        await prisma.mpesaTransaction.create({
          data: {
            transactionType: 'STK_PUSH',
            phone: member.user.phone,
            amount: chama.contributionAmount,
            status: 'PENDING',
            checkoutRequestId: result.CheckoutRequestID,
            relatedId: contribution.id,
            relatedType: 'CONTRIBUTION',
          },
        });
      } catch (e) {
        console.error(`STK push failed for ${member.user.phone}:`, e);
      }
    }

    // Advance next contribution date
    const next = new Date(chama.nextContributionDate);
    const freq: Record<string, number> = { DAILY: 1, WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30 };
    next.setDate(next.getDate() + (freq[chama.frequency] || 30));
    await prisma.chama.update({ where: { id: chama.id }, data: { nextContributionDate: next } });
  }
}

// Run every day at 7am — send reminders for tomorrow's contributions
async function sendContributionReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const chamas = await prisma.chama.findMany({
    where: { nextContributionDate: { gte: tomorrow, lt: dayAfter } },
    include: { members: { include: { user: true } } },
  });

  for (const chama of chamas) {
    const phones = chama.members.map(m => m.user.phone);
    await sendBulkSMS(
      phones,
      `ChamaPesa Reminder: KES ${chama.contributionAmount} contribution to "${chama.name}" is due tomorrow.`
    ).catch(e => console.error('Reminder SMS failed:', e));
  }
}

// Check for payouts — after all contributions are in for a cycle
async function processPayouts() {
  const chamas = await prisma.chama.findMany({
    include: {
      members: true,
      rotations: { where: { status: 'PENDING' }, orderBy: { position: 'asc' } },
    },
  });

  for (const chama of chamas) {
    const nextRotation = chama.rotations[0];
    if (!nextRotation) continue;

    // Check if all members paid for current cycle
    const today = new Date();
    const contributions = await prisma.contribution.findMany({
      where: {
        chamaId: chama.id,
        dueDate: { lte: today },
        status: 'PAID',
      },
    });

    const paidCount = new Set(contributions.map(c => c.userId)).size;
    if (paidCount < chama.members.length) continue; // Wait for all

    const payoutAmount = Number(chama.contributionAmount) * chama.members.length;
    const recipient = await prisma.user.findUnique({ where: { id: nextRotation.memberId } });
    if (!recipient) continue;

    try {
      const result = await b2cPayout(recipient.phone.replace(/^0/, '254'), payoutAmount, `Merry-go-round payout from ${chama.name}`);

      await prisma.rotation.update({
        where: { id: nextRotation.id },
        data: { payoutAmount },
      });

      await prisma.mpesaTransaction.create({
        data: {
          transactionType: 'B2C',
          phone: recipient.phone,
          amount: payoutAmount,
          status: 'PENDING',
          conversationId: result.ConversationID,
          relatedId: nextRotation.id,
          relatedType: 'PAYOUT',
        },
      });

      await sendSMS(recipient.phone, `ChamaPesa: KES ${payoutAmount} payout from "${chama.name}" is on its way! 🎉`).catch(() => {});
    } catch (e) {
      console.error(`Payout failed for rotation ${nextRotation.id}:`, e);
    }
  }
}

// Mark missed contributions
async function markMissedContributions() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const missed = await prisma.contribution.updateMany({
    where: { status: 'PENDING', dueDate: { lt: yesterday } },
    data: { status: 'MISSED' },
  });

  if (missed.count > 0) {
    console.log(`Marked ${missed.count} contributions as missed`);
  }
}

// Expire open motions past deadline
async function expireMotions() {
  await prisma.motion.updateMany({
    where: { status: 'OPEN', deadline: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
}

export function startScheduledJobs() {
  console.log('Starting scheduled jobs...');
  cron.schedule('0 7 * * *', sendContributionReminders);  // 7am daily
  cron.schedule('0 8 * * *', triggerDailyCollections);     // 8am daily
  cron.schedule('0 9 * * *', processPayouts);              // 9am daily
  cron.schedule('0 23 * * *', markMissedContributions);    // 11pm daily
  cron.schedule('*/30 * * * *', expireMotions);            // every 30min
  cron.schedule('0 1 * * *', accruePoolInterest);          // 1am daily — interest
  console.log('Scheduled jobs started');
}
