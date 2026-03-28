import { Router } from 'express';
import prisma from '../utils/prisma';
import { updateTrustScore } from '../services/trustScore';
import { getAccessToken, stkPush, b2cPayout, checkTransactionStatus } from '../services/mpesa';

export const mpesaRouter = Router();

// Test endpoint — verify credentials work
mpesaRouter.get('/test', async (_req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ ok: true, token: token.slice(0, 20) + '...' });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// STK Push callback
mpesaRouter.post('/callback/stk', async (req, res) => {
  try {
    const { Body } = req.body;
    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    const txn = await prisma.mpesaTransaction.findFirst({
      where: { checkoutRequestId: CheckoutRequestID },
    });
    if (!txn) return res.json({ ResultCode: 0, ResultDesc: 'OK' });

    if (ResultCode === 0) {
      const items = CallbackMetadata.Item;
      const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
      const amount = items.find((i: any) => i.Name === 'Amount')?.Value;

      await prisma.mpesaTransaction.update({
        where: { id: txn.id },
        data: { status: 'SUCCESS', mpesaReceiptNo: receipt, resultDesc: ResultDesc },
      });

      if (txn.relatedType === 'CONTRIBUTION' && txn.relatedId) {
        const contribution = await prisma.contribution.update({
          where: { id: txn.relatedId },
          data: { status: 'PAID', mpesaReceiptNo: receipt, transactionDate: new Date() },
        });
        // Update trust score
        await updateTrustScore(contribution.userId, contribution.chamaId);
      }

      if (txn.relatedType === 'LOAN_REPAYMENT' && txn.relatedId) {
        await prisma.loanRepayment.create({
          data: { loanId: txn.relatedId, amount, mpesaReceiptNo: receipt },
        });
        const loan = await prisma.loan.findUnique({ where: { id: txn.relatedId } });
        if (loan) {
          const newRepaid = Number(loan.amountRepaid) + Number(amount);
          const totalDue = Number(loan.amount) * (1 + Number(loan.interestRate));
          await prisma.loan.update({
            where: { id: loan.id },
            data: {
              amountRepaid: newRepaid,
              status: newRepaid >= totalDue ? 'REPAID' : 'REPAYING',
            },
          });
        }
      }
    } else {
      await prisma.mpesaTransaction.update({
        where: { id: txn.id },
        data: { status: 'FAILED', resultDesc: ResultDesc },
      });
    }

    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  } catch (e) {
    console.error('STK callback error:', e);
    res.json({ ResultCode: 0, ResultDesc: 'OK' });
  }
});

// B2C result callback
mpesaRouter.post('/callback/b2c/result', async (req, res) => {
  try {
    const { Result } = req.body;
    const { ConversationID, ResultCode, ResultDesc, ResultParameters } = Result;

    const txn = await prisma.mpesaTransaction.findFirst({
      where: { conversationId: ConversationID },
    });
    if (!txn) return res.json({ ResultCode: 0 });

    if (ResultCode === 0) {
      const params = ResultParameters?.ResultParameter || [];
      const receipt = params.find((p: any) => p.Key === 'TransactionReceipt')?.Value;

      await prisma.mpesaTransaction.update({
        where: { id: txn.id },
        data: { status: 'SUCCESS', mpesaReceiptNo: receipt, resultDesc: ResultDesc },
      });

      if (txn.relatedType === 'PAYOUT' && txn.relatedId) {
        await prisma.rotation.update({
          where: { id: txn.relatedId },
          data: { status: 'COMPLETED', mpesaReceiptNo: receipt, paidAt: new Date() },
        });
      }

      if (txn.relatedType === 'LOAN' && txn.relatedId) {
        await prisma.loan.update({
          where: { id: txn.relatedId },
          data: { status: 'DISBURSED', disbursedAt: new Date() },
        });
      }
    } else {
      await prisma.mpesaTransaction.update({
        where: { id: txn.id },
        data: { status: 'FAILED', resultDesc: ResultDesc },
      });
    }

    res.json({ ResultCode: 0 });
  } catch (e) {
    console.error('B2C callback error:', e);
    res.json({ ResultCode: 0 });
  }
});

// B2C timeout
mpesaRouter.post('/callback/b2c/timeout', async (_req, res) => {
  res.json({ ResultCode: 0 });
});

// Recent M-Pesa transactions (for dashboard feed)
mpesaRouter.get('/transactions', async (_req, res) => {
  try {
    const txs = await prisma.mpesaTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(txs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Verify transaction status via Daraja
mpesaRouter.post('/verify/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const tx = await prisma.mpesaTransaction.findUnique({ where: { id } });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (!tx.mpesaReceiptNo && !tx.checkoutRequestId) return res.status(400).json({ error: 'No receipt or checkout ID to verify' });

    const result = await checkTransactionStatus(tx.mpesaReceiptNo || tx.checkoutRequestId!);
    res.json({ result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
