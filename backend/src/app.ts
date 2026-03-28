import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { chamaRouter } from './routes/chama';
import { contributionRouter } from './routes/contribution';
import { mpesaRouter } from './routes/mpesa';
import { loanRouter } from './routes/loan';
import { motionRouter } from './routes/motion';
import { poolRouter } from './routes/pool';
import { startScheduledJobs } from './jobs/scheduler';

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/chamas', chamaRouter);
app.use('/api/contributions', contributionRouter);
app.use('/api/mpesa', mpesaRouter);
app.use('/api/loans', loanRouter);
app.use('/api/motions', motionRouter);
app.use('/api/pools', poolRouter);

app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ChamaPesa API running on port ${PORT}`);
  startScheduledJobs();
});

export default app;
