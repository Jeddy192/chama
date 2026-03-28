import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { stkPush } from '../services/mpesa';

export const contributionRouter = Router();
contributionRouter.use(authenticate);

contributionRouter.post('/pay', async (req: AuthRequest, res) => {
  try {
    const { chamaId } = req.body;
    const chama = await prisma.chama.findUnique({ where: { id: chamaId } });
    if (!chama) return res.status(404).json({ error: 'Chama not found' });

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const contribution = await prisma.contribution.create({
      data: { userId: req.userId!, chamaId, amount: chama.contributionAmount, dueDate: chama.nextContributionDate },
    });

    const stkResult = await stkPush(
      user.phone.replace(/^0/, '254'),
      Number(chama.contributionAmount),
      `CHAMA-${chama.name.slice(0, 10)}`,
      `Contribution to ${chama.name}`
    );

    await prisma.mpesaTransaction.create({
      data: {
        transactionType: 'STK_PUSH', phone: user.phone, amount: chama.contributionAmount,
        status: 'PENDING', checkoutRequestId: stkResult.CheckoutRequestID,
        relatedId: contribution.id, relatedType: 'CONTRIBUTION',
      },
    });

    res.json({ contribution, checkoutRequestId: stkResult.CheckoutRequestID });
  } catch {
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

contributionRouter.get('/chama/:chamaId', async (req: AuthRequest, res) => {
  try {
    const chamaId = req.params.chamaId as string;
    const contributions = await prisma.contribution.findMany({
      where: { chamaId },
      include: { user: { select: { id: true, name: true, phone: true } } },
      orderBy: { dueDate: 'desc' },
    });
    res.json(contributions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

contributionRouter.get('/mine/:chamaId', async (req: AuthRequest, res) => {
  try {
    const chamaId = req.params.chamaId as string;
    const contributions = await prisma.contribution.findMany({
      where: { userId: req.userId!, chamaId },
      orderBy: { dueDate: 'desc' },
    });
    res.json(contributions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// Treasurer: trigger STK Push to all members now
contributionRouter.post('/collect-all/:chamaId', async (req: AuthRequest, res) => {
  try {
    const chamaId = req.params.chamaId as string;
    const chama = await prisma.chama.findUnique({
      where: { id: chamaId },
      include: { members: { include: { user: true } } },
    });
    if (!chama) return res.status(404).json({ error: 'Chama not found' });

    const results: { phone: string; status: string }[] = [];
    for (const member of chama.members) {
      try {
        const contribution = await prisma.contribution.create({
          data: { userId: member.userId, chamaId, amount: chama.contributionAmount, dueDate: chama.nextContributionDate },
        });
        const stkResult = await stkPush(
          member.user.phone.replace(/^0/, '254'),
          Number(chama.contributionAmount),
          `CHAMA-${chama.name.slice(0, 10)}`,
          `Contribution to ${chama.name}`
        );
        await prisma.mpesaTransaction.create({
          data: {
            transactionType: 'STK_PUSH', phone: member.user.phone, amount: chama.contributionAmount,
            status: 'PENDING', checkoutRequestId: stkResult.CheckoutRequestID,
            relatedId: contribution.id, relatedType: 'CONTRIBUTION',
          },
        });
        results.push({ phone: member.user.phone, status: 'sent' });
      } catch {
        results.push({ phone: member.user.phone, status: 'failed' });
      }
    }
    res.json({ results, sent: results.filter(r => r.status === 'sent').length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
