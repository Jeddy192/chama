import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { phone, name, pin } = req.body;
    const hashedPin = await bcrypt.hash(pin, 10);
    const user = await prisma.user.create({
      data: { phone, name, pin: hashedPin },
      select: { id: true, phone: true, name: true },
    });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.status(201).json({ user, token });
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Phone already registered' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !(await bcrypt.compare(pin, user.pin))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });
    res.json({ user: { id: user.id, phone: user.phone, name: user.name }, token });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});
