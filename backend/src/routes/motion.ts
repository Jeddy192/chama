import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendBulkSMS } from '../services/sms';
import { b2cPayout } from '../services/mpesa';

export const motionRouter = Router();
motionRouter.use(authenticate);

motionRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { chamaId, type, description, threshold, deadlineHours } = req.body;
    const motion = await prisma.motion.create({
      data: {
        chamaId, type: type || 'CUSTOM', description,
        threshold: threshold || 0.51,
        deadline: new Date(Date.now() + (deadlineHours || 24) * 60 * 60 * 1000),
      },
    });

    const members = await prisma.chamaMember.findMany({
      where: { chamaId }, include: { user: true },
    });
    const phones = members.map(m => m.user.phone);
    await sendBulkSMS(phones, `ChamaPesa: New vote — "${description}". Vote now!`).catch(() => {});

    res.status(201).json(motion);
  } catch {
    res.status(500).json({ error: 'Failed to create motion' });
  }
});

motionRouter.post('/:id/vote', async (req: AuthRequest, res) => {
  try {
    const motionId = req.params.id as string;
    const { vote } = req.body;
    const motion = await prisma.motion.findUnique({ where: { id: motionId } });
    if (!motion) return res.status(404).json({ error: 'Motion not found' });
    if (motion.status !== 'OPEN') return res.status(400).json({ error: 'Voting closed' });
    if (new Date() > motion.deadline) return res.status(400).json({ error: 'Deadline passed' });

    await prisma.vote.create({ data: { motionId, userId: req.userId!, vote } });

    const totalMembers = await prisma.chamaMember.count({ where: { chamaId: motion.chamaId } });
    const votes = await prisma.vote.findMany({ where: { motionId } });

    if (votes.length >= Math.ceil(totalMembers * 0.6)) {
      const yesVotes = votes.filter(v => v.vote).length;
      const passed = yesVotes / votes.length >= Number(motion.threshold);

      await prisma.motion.update({
        where: { id: motionId },
        data: { status: passed ? 'PASSED' : 'FAILED' },
      });

      if (passed && motion.type === 'LOAN_APPROVAL' && motion.metadata) {
        const meta = motion.metadata as any;
        if (meta.loanId) {
          const loan = await prisma.loan.update({ where: { id: meta.loanId }, data: { status: 'APPROVED' } });
          const borrower = await prisma.user.findUnique({ where: { id: loan.borrowerId } });
          if (borrower) {
            const result = await b2cPayout(borrower.phone.replace(/^0/, '254'), Number(loan.amount), `Loan from ChamaPesa`);
            await prisma.mpesaTransaction.create({
              data: {
                transactionType: 'B2C', phone: borrower.phone, amount: loan.amount,
                status: 'PENDING', conversationId: result.ConversationID,
                relatedId: loan.id, relatedType: 'LOAN',
              },
            });
          }
        }
      }

      const members = await prisma.chamaMember.findMany({
        where: { chamaId: motion.chamaId }, include: { user: true },
      });
      await sendBulkSMS(members.map(m => m.user.phone), `ChamaPesa: Vote "${motion.description}" — ${passed ? 'PASSED ✅' : 'FAILED ❌'}`).catch(() => {});
    }

    res.json({ message: 'Vote recorded' });
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Already voted' });
    res.status(500).json({ error: 'Voting failed' });
  }
});

motionRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const motionId = req.params.id as string;
    const motion = await prisma.motion.findUnique({ where: { id: motionId } });
    if (!motion) return res.status(404).json({ error: 'Motion not found' });

    const totalVotes = await prisma.vote.count({ where: { motionId } });
    const totalMembers = await prisma.chamaMember.count({ where: { chamaId: motion.chamaId } });
    const hasVoted = await prisma.vote.findUnique({
      where: { motionId_userId: { motionId, userId: req.userId! } },
    });

    res.json({
      ...motion,
      participation: `${totalVotes}/${totalMembers}`,
      hasVoted: !!hasVoted,
      ...(motion.status !== 'OPEN' ? {
        results: {
          yes: await prisma.vote.count({ where: { motionId, vote: true } }),
          no: await prisma.vote.count({ where: { motionId, vote: false } }),
        },
      } : {}),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch motion' });
  }
});

motionRouter.get('/chama/:chamaId', async (req: AuthRequest, res) => {
  try {
    const chamaId = req.params.chamaId as string;
    const motions = await prisma.motion.findMany({
      where: { chamaId }, orderBy: { createdAt: 'desc' },
    });
    res.json(motions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch motions' });
  }
});
