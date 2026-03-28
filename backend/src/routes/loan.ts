import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const loanRouter = Router();
loanRouter.use(authenticate);

loanRouter.post('/request', async (req: AuthRequest, res) => {
  try {
    const { chamaId, amount } = req.body;
    const member = await prisma.chamaMember.findUnique({
      where: { userId_chamaId: { userId: req.userId!, chamaId } },
    });
    if (!member) return res.status(403).json({ error: 'Not a member' });
    if (member.trustScore < 50) return res.status(403).json({ error: 'Trust score too low (minimum 50)' });

    const loan = await prisma.loan.create({
      data: { chamaId, borrowerId: req.userId!, amount, status: 'VOTING' },
    });

    const motion = await prisma.motion.create({
      data: {
        chamaId, type: 'LOAN_APPROVAL',
        description: `Approve KES ${amount} loan for member`,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: { loanId: loan.id },
      },
    });

    res.status(201).json({ loan, motion });
  } catch {
    res.status(500).json({ error: 'Loan request failed' });
  }
});

loanRouter.get('/chama/:chamaId', async (req: AuthRequest, res) => {
  try {
    const chamaId = req.params.chamaId as string;
    const loans = await prisma.loan.findMany({
      where: { chamaId },
      include: { borrower: { select: { id: true, name: true, phone: true } }, repayments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(loans);
  } catch {
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

loanRouter.get('/mine', async (req: AuthRequest, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { borrowerId: req.userId! },
      include: { chama: { select: { id: true, name: true } }, repayments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(loans);
  } catch {
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});
