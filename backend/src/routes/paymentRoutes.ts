import { Router, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { PLAN_ORDER, isUpgrade, daysRemainingInCycle, computeUpgradeCost, addDays, PLAN_PRICES } from '../lib/planBilling';
import { PLAN_RECRUITER_LIMITS } from '../lib/helpers';
import Razorpay from 'razorpay';

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

if (!razorpayKeyId || !razorpayKeySecret) {
  throw new Error('FATAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.');
}

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

const router = Router();

// ─── POST /api/payment/create-order ──────────────────────────────────────────
// Creates a Razorpay order for an immediate plan upgrade. Test-mode keys are
// supported via env, but no hardcoded payment fallback is allowed.
router.post('/create-order', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  const { newPlan } = req.body as { newPlan?: string };

  if (!newPlan || !PLAN_ORDER.includes(newPlan)) {
    res.status(400).json({ error: 'Invalid plan. Must be Basic, Pro, or Premium.' });
    return;
  }

  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.user!.hospitalId! },
    });
    
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found' });
      return;
    }

    const currentPlan = hospital.onboardingPlan;

    let activeExpiresAt = hospital.planExpiresAt;
    if (!activeExpiresAt) {
      const start = hospital.approvedAt || hospital.submittedAt;
      if (start) {
        activeExpiresAt = new Date(start);
        activeExpiresAt.setDate(activeExpiresAt.getDate() + 30);
      }
    }

    const daysRemaining = daysRemainingInCycle(activeExpiresAt);
    const isExpired = daysRemaining <= 0;

    if (!isExpired && !isUpgrade(currentPlan, newPlan)) {
      res.status(400).json({ error: 'You are already on this plan and it is active.' });
      return;
    }

    if (hospital.pendingPlan) {
      res.status(409).json({ error: 'A plan change is already scheduled. Please contact admin.' });
      return;
    }

    const amount = isExpired 
      ? (PLAN_PRICES[newPlan] ?? 0) 
      : computeUpgradeCost(currentPlan, newPlan, daysRemaining);

    if (amount <= 0) {
      res.status(400).json({ error: 'No payment required for this change.' });
      return;
    }

    // Real Razorpay Order Creation
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paisa
      currency: 'INR',
      receipt: `receipt_${hospital.id.substring(0, 10)}_${Date.now()}`
    });

    const razorpayOrderId = rzpOrder.id;

    const order = await prisma.paymentOrder.create({
      data: {
        hospitalId: hospital.id,
        amount,
        currency: 'INR',
        razorpayOrderId,
        status: 'CREATED',
        planRequested: newPlan
      }
    });

    res.json({ orderId: order.razorpayOrderId, amount: order.amount, currency: order.currency, keyId: razorpayKeyId });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// ─── POST /api/payment/verify ────────────────────────────────────────────────
// Verifies Razorpay signature and processes the upgrade
router.post('/verify', requireAuth, requireRole('RECRUITER'), async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment details' });
    return;
  }

  try {
    const order = await prisma.paymentOrder.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: { hospital: true }
    });

    if (!order || order.status !== 'CREATED') {
      res.status(400).json({ error: 'Invalid or already processed order' });
      return;
    }
    if (order.hospitalId !== req.user!.hospitalId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Strict signature validation
    const expected = Buffer.from(generatedSignature);
    const received = Buffer.from(String(razorpay_signature));
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      });
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }

    // Mark paid
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: 'PAID' }
    });

    const newPlan = order.planRequested;
    const currentPlan = order.hospital.onboardingPlan;
    const newExpiresAt = addDays(30);
    const newMaxRecruiters = PLAN_RECRUITER_LIMITS[newPlan] ?? 3;

    await prisma.$transaction([
      prisma.hospital.update({
        where: { id: order.hospital.id },
        data: {
          onboardingPlan: newPlan,
          planExpiresAt: newExpiresAt,
          maxRecruiters: newMaxRecruiters,
          pendingPlan: null,
          pendingPlanAt: null,
        },
      }),
      prisma.planChangeLog.create({
        data: {
          hospitalId: order.hospital.id,
          fromPlan: currentPlan,
          toPlan: newPlan,
          changeType: 'immediate_upgrade',
          amountPaid: order.amount,
          effectiveAt: new Date(),
          paymentStatus: 'Paid',
          paymentRef: razorpay_payment_id,
          note: `Immediate upgrade. Cost: ₹${order.amount}.`,
        },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        entityType: 'hospital',
        entityId: order.hospital.id,
        action: 'plan_upgraded',
        actorId: req.user!.id,
        actorRole: 'RECRUITER',
        meta: JSON.stringify({ from: currentPlan, to: newPlan, amountPaid: order.amount }),
      },
    });

    res.json({ success: true, plan: newPlan, amountPaid: order.amount });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;
