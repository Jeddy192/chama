import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const chamaRouter = Router();
chamaRouter.use(authenticate);

chamaRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, contributionAmount, frequency, nextContributionDate } = req.body;
    const chama = await prisma.chama.create({
      data: {
        name,
        contributionAmount,
        frequency,
        nextContributionDate: new Date(nextContributionDate),
        members: { create: { userId: req.userId!, role: 'ADMIN' } },
        pools: {
          create: [
            { name: 'Merry-Go-Round', contributionSplit: 70 },
            { name: 'Emergency Fund', contributionSplit: 30 },
          ],
        },
      },
      include: { members: true, pools: true },
    });
    res.status(201).json(chama);
  } catch {
    res.status(500).json({ error: 'Failed to create chama' });
  }
});

chamaRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const memberships = await prisma.chamaMember.findMany({
      where: { userId: req.userId! },
      include: { chama: { include: { members: { include: { user: { select: { id: true, name: true, phone: true } } } } } } },
    });
    res.json(memberships.map(m => ({ ...m.chama, myRole: m.role })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch chamas' });
  }
});

chamaRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const chama = await prisma.chama.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, phone: true } } } },
        pools: true,
        rotations: { orderBy: { position: 'asc' } },
      },
    });
    if (!chama) return res.status(404).json({ error: 'Chama not found' });
    res.json(chama);
  } catch {
    res.status(500).json({ error: 'Failed to fetch chama' });
  }
});

chamaRouter.post('/:id/invite', async (req: AuthRequest, res) => {
  try {
    const chamaId = req.params.id as string;
    const { phone } = req.body;
    const member = await prisma.chamaMember.findFirst({ where: { chamaId, userId: req.userId! } });
    if (!member || member.role === 'MEMBER') return res.status(403).json({ error: 'Only admin/treasurer can invite' });

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: 'User not found. They must register first.' });

    const existing = await prisma.chamaMember.findUnique({ where: { userId_chamaId: { userId: user.id, chamaId } } });
    if (existing) return res.status(409).json({ error: 'Already a member' });

    const newMember = await prisma.chamaMember.create({
      data: { userId: user.id, chamaId },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
    res.status(201).json(newMember);
  } catch {
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

chamaRouter.post('/:id/rotation', async (req: AuthRequest, res) => {
  try {
    const chamaId = req.params.id as string;
    const { memberIds } = req.body;
    await prisma.rotation.deleteMany({ where: { chamaId } });
    const rotations = await Promise.all(
      memberIds.map((memberId: string, i: number) =>
        prisma.rotation.create({ data: { chamaId, memberId, position: i + 1 } })
      )
    );
    res.json(rotations);
  } catch {
    res.status(500).json({ error: 'Failed to set rotation' });
  }
});
