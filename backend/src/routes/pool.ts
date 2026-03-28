import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getMemberInterestShare } from '../services/interest';

export const poolRouter = Router();
poolRouter.use(authenticate);

poolRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { chamaId, name, targetAmount, contributionSplit, withdrawalMethod, lockMonths } = req.body;
    const member = await prisma.chamaMember.findUnique({
      where: { userId_chamaId: { userId: req.userId!, chamaId } },
    });
    if (!member || member.role === 'MEMBER') return res.status(403).json({ error: 'Admin/Treasurer only' });

    const pool = await prisma.pool.create({
      data: { chamaId, name, targetAmount, contributionSplit, withdrawalMethod, lockMonths },
    });
    res.status(201).json(pool);
  } catch {
    res.status(500).json({ error: 'Failed to create pool' });
  }
});

poolRouter.get('/chama/:chamaId', async (req: AuthRequest, res) => {
  try {
    const chamaId = req.params.chamaId as string;
    const pools = await prisma.pool.findMany({ where: { chamaId } });

    // Attach member's interest share to each pool
    const withInterest = await Promise.all(pools.map(async p => ({
      ...p,
      myInterestShare: await getMemberInterestShare(chamaId, p.id, req.userId!),
    })));

    res.json(withInterest);
  } catch {
    res.status(500).json({ error: 'Failed to fetch pools' });
  }
});

poolRouter.put('/splits/:chamaId', async (req: AuthRequest, res) => {
  try {
    const { splits } = req.body;
    const total = splits.reduce((sum: number, s: any) => sum + s.contributionSplit, 0);
    if (total !== 100) return res.status(400).json({ error: 'Splits must total 100%' });

    const updated = await Promise.all(
      splits.map((s: any) => prisma.pool.update({
        where: { id: s.poolId },
        data: { contributionSplit: s.contributionSplit },
      }))
    );
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update splits' });
  }
});
