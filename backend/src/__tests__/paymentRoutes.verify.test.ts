import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const mockPaymentOrderFindUnique = vi.fn();
const mockPaymentOrderUpdate = vi.fn();
const mockPaymentOrderUpdateMany = vi.fn();
const mockHospitalUpdate = vi.fn();
const mockPlanChangeLogCreate = vi.fn();
const mockActivityLogCreate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../lib/prisma', () => ({
  default: {
    paymentOrder: {
      findUnique: (...args: unknown[]) => mockPaymentOrderFindUnique(...args),
      update: (...args: unknown[]) => mockPaymentOrderUpdate(...args),
      updateMany: (...args: unknown[]) => mockPaymentOrderUpdateMany(...args),
    },
    hospital: { update: (...args: unknown[]) => mockHospitalUpdate(...args) },
    planChangeLog: { create: (...args: unknown[]) => mockPlanChangeLogCreate(...args) },
    activityLog: { create: (...args: unknown[]) => mockActivityLogCreate(...args) },
    user: { 
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: (fn: (tx: unknown) => unknown) => mockTransaction(fn),
  },
}));

vi.mock('razorpay', () => ({
  default: vi.fn().mockImplementation(() => ({
    orders: { create: vi.fn() },
  })),
}));

import paymentRoutes from '../routes/paymentRoutes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);
  return app;
}

function recruiterToken(hospitalId = 'hosp-1') {
  return jwt.sign(
    {
      id: 'recruiter-1',
      email: 'recruiter@test.com',
      name: 'Recruiter',
      role: 'RECRUITER',
      hospitalId,
      tokenVersion: 0,
    },
    process.env.JWT_SECRET!,
  );
}

function signPayment(orderId: string, paymentId: string) {
  return crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

const baseOrder = {
  id: 'order-db-1',
  razorpayOrderId: 'order_rzp_1',
  hospitalId: 'hosp-1',
  status: 'CREATED',
  amount: 999,
  planRequested: 'Pro',
  hospital: {
    id: 'hosp-1',
    onboardingPlan: 'Basic',
  },
};

describe('POST /api/payment/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({
      tokenVersion: 0,
      isSuspended: false,
      deletedAt: null,
      hospital: { isSuspended: false, deletedAt: null },
    });
    mockActivityLogCreate.mockResolvedValue({});
  });

  it('succeeds on a single legitimate verify call', async () => {
    mockPaymentOrderFindUnique.mockResolvedValue({ ...baseOrder });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        paymentOrder: {
          updateMany: mockPaymentOrderUpdateMany.mockResolvedValue({ count: 1 }),
          findUnique: vi.fn(),
        },
        hospital: { update: mockHospitalUpdate.mockResolvedValue({}) },
        planChangeLog: { create: mockPlanChangeLogCreate.mockResolvedValue({}) },
        user: { count: vi.fn().mockResolvedValue(0) },
      };
      return fn(tx);
    });

    const paymentId = 'pay_abc';
    const signature = signPayment(baseOrder.razorpayOrderId, paymentId);

    const res = await request(createApp())
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${recruiterToken()}`)
      .send({
        razorpay_order_id: baseOrder.razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.plan).toBe('Pro');
    expect(mockPaymentOrderUpdateMany).toHaveBeenCalledWith({
      where: { id: baseOrder.id, status: 'CREATED' },
      data: { status: 'PAID' },
    });
    expect(mockHospitalUpdate).toHaveBeenCalledTimes(1);
    expect(mockPlanChangeLogCreate).toHaveBeenCalledTimes(1);
    expect(mockActivityLogCreate).toHaveBeenCalledTimes(1);
  });

  it('does not re-run hospital upgrade on second verify (idempotent retry)', async () => {
    const paidOrder = {
      ...baseOrder,
      status: 'PAID',
      hospital: { id: 'hosp-1', onboardingPlan: 'Pro' },
    };

    mockPaymentOrderFindUnique.mockResolvedValue(paidOrder);

    const paymentId = 'pay_abc';
    const signature = signPayment(baseOrder.razorpayOrderId, paymentId);

    const res = await request(createApp())
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${recruiterToken()}`)
      .send({
        razorpay_order_id: baseOrder.razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.plan).toBe('Pro');
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockHospitalUpdate).not.toHaveBeenCalled();
    expect(mockPlanChangeLogCreate).not.toHaveBeenCalled();
    expect(mockActivityLogCreate).not.toHaveBeenCalled();
  });

  it('runs upgrade only once when two sequential verifies race through CREATED', async () => {
    mockPaymentOrderFindUnique.mockResolvedValue({ ...baseOrder });

    let upgradeCount = 0;
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        paymentOrder: {
          updateMany: mockPaymentOrderUpdateMany,
          findUnique: vi.fn().mockResolvedValue({
            ...baseOrder,
            status: 'PAID',
            hospital: { id: 'hosp-1', onboardingPlan: 'Pro' },
          }),
        },
        hospital: {
          update: vi.fn().mockImplementation(async () => {
            upgradeCount += 1;
            return {};
          }),
        },
        planChangeLog: { create: vi.fn().mockResolvedValue({}) },
        user: { count: vi.fn().mockResolvedValue(0) },
      };

      mockPaymentOrderUpdateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      return fn(tx);
    });

    const paymentId = 'pay_race';
    const signature = signPayment(baseOrder.razorpayOrderId, paymentId);
    const body = {
      razorpay_order_id: baseOrder.razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    };
    const app = createApp();
    const token = recruiterToken();

    const first = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    const second = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(upgradeCount).toBe(1);
    expect(mockActivityLogCreate).toHaveBeenCalledTimes(1);
  });
});
