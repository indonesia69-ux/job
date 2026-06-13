import logger from '../lib/logger';
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getRecruiterLimit } from '../lib/helpers';
import { sendOTP } from '../lib/otp';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/hospitals  (Public — no auth required)
// Hospital submits their onboarding application. Admin will review it.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/hospitals', async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,        // Hospital contact / recruitment email
      phone,
      plan,         // 'Basic' | 'Pro' | 'Premium'
      submittedBy,  // Contact person name
      type,         // Hospital type
      city,
      state,
      address,
      website,
      beds,
      registrationNumber,
      brandName,
      registrationAuthority,
      nabhStatus,
      nablStatus,
      gstNumber,
      panNumber,
      ownershipType,
      contactDesignation,
      contactWhatsapp,
      contactAlternatePhone,
      district,
      pinCode,
      billingName,
      billingGstNumber,
      billingAddress,
      billingEmail,
      billingPhone,
      icuBeds,
      numberOfDoctors,
      numberOfEmployees,
      averageMonthlyHiring,
      preferredHiringStates,
      emergencyHiringRequirement,
      internshipHiring,
      campusRecruitment
    } = req.body;

    if (!name || !email || !plan || !type || !city || !state || !address || !phone) {
      res.status(400).json({ error: 'Hospital name, type, location (city, state, address), contact email, phone, and plan are required.' });
      return;
    }

    if (!['Basic', 'Pro', 'Premium'].includes(plan)) {
      res.status(400).json({ error: 'Plan must be Basic, Pro, or Premium.' });
      return;
    }

    // Prevent duplicate submissions by hospital name
    const existing = await prisma.hospital.findFirst({ where: { name: String(name) } });
    if (existing) {
      if (existing.onboardingStatus === 'Rejected') {
        res.status(409).json({
          error: 'A previous application for this hospital was rejected. Please contact support.',
        });
      } else {
        res.status(409).json({
          error: 'A hospital with this name is already registered or pending approval.',
        });
      }
      return;
    }

    const maxRecruiters = getRecruiterLimit(plan);

    const hospital = await prisma.hospital.create({
      data: {
        name:               String(name),
        submittedEmail:     String(email),
        email:              String(email),
        submittedPhone:     phone             ? String(phone)              : null,
        phone:              phone             ? String(phone)              : null,
        submittedBy:        submittedBy       ? String(submittedBy)        : null,
        onboardingPlan:     String(plan),
        maxRecruiters,
        onboardingStatus:   'Pending',
        submittedAt:        new Date(),
        type:               type              ? String(type)               : null,
        city:               city              ? String(city)               : null,
        state:              state             ? String(state)              : null,
        address:            address           ? String(address)            : null,
        website:            website           ? String(website)            : null,
        beds:               beds              ? Number(beds)               : null,
        registrationNumber: registrationNumber ? String(registrationNumber) : null,
        brandName:          brandName         ? String(brandName)          : null,
        registrationAuthority: registrationAuthority ? String(registrationAuthority) : null,
        nabhStatus:         nabhStatus        ? String(nabhStatus)         : null,
        nablStatus:         nablStatus        ? String(nablStatus)         : null,
        gstNumber:          gstNumber         ? String(gstNumber)          : null,
        panNumber:          panNumber         ? String(panNumber)          : null,
        ownershipType:      ownershipType     ? String(ownershipType)      : null,
        contactDesignation: contactDesignation ? String(contactDesignation) : null,
        contactWhatsapp:    contactWhatsapp   ? String(contactWhatsapp)    : null,
        contactAlternatePhone: contactAlternatePhone ? String(contactAlternatePhone) : null,
        district:           district          ? String(district)           : null,
        pinCode:            pinCode           ? String(pinCode)            : null,
        billingName:        billingName       ? String(billingName)        : null,
        billingGstNumber:   billingGstNumber  ? String(billingGstNumber)   : null,
        billingAddress:     billingAddress    ? String(billingAddress)     : null,
        billingEmail:       billingEmail      ? String(billingEmail)       : null,
        billingPhone:       billingPhone      ? String(billingPhone)       : null,
        icuBeds:            icuBeds           ? Number(icuBeds)            : null,
        numberOfDoctors:    numberOfDoctors   ? Number(numberOfDoctors)    : null,
        numberOfEmployees:  numberOfEmployees ? Number(numberOfEmployees)  : null,
        averageMonthlyHiring: averageMonthlyHiring ? Number(averageMonthlyHiring) : null,
        preferredHiringStates: preferredHiringStates ? String(preferredHiringStates) : null,
        emergencyHiringRequirement: emergencyHiringRequirement === true,
        internshipHiring:   internshipHiring === true,
        campusRecruitment:  campusRecruitment === true,
        specialties:        '[]',
      }
    });

    let otpSent = false;
    if (phone) {
      try {
        await sendOTP(String(phone));
        otpSent = true;
      } catch (err: any) {
        logger.error(`[onboarding/hospitals] OTP send failed for ${phone}: ${err.message}`);
        // Keep the application in mobile-verification flow so the user can resend later.
      }
    }

    res.status(201).json({
      message: phone
        ? (otpSent
          ? 'Application submitted. Please verify your mobile number to complete submission.'
          : 'Application submitted, but OTP could not be sent. Please use resend OTP.')
        : 'Onboarding application submitted successfully. You will hear from us within 48 hours.',
      applicationId: hospital.id,
      requiresVerification: Boolean(phone),
      otpSent
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to submit onboarding request.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/onboarding/verify-code/:code  (Public — no auth required)
// Recruiters enter their hospital invite code before signing up.
// Returns basic hospital info + plan so the UI can confirm before proceeding.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/verify-code/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;

    if (!code || code.length !== 12) {
      res.status(400).json({ error: 'Invite code must be exactly 12 characters.' });
      return;
    }

    const hospital = await prisma.hospital.findUnique({
      where: { inviteCode: code.toUpperCase() },
      include: {
        _count: { select: { users: true } },
      }
    });

    if (!hospital) {
      res.status(404).json({ error: 'Invalid invite code. Please check the code and try again.' });
      return;
    }

    if (hospital.onboardingStatus !== 'Approved') {
      res.status(403).json({ error: 'This hospital has not been approved yet.' });
      return;
    }

    // Count only RECRUITER users for limit check
    const recruiterCount = await prisma.user.count({
      where: { hospitalId: hospital.id, role: 'RECRUITER' }
    });

    const limit = getRecruiterLimit(hospital.onboardingPlan);
    const spotsLeft = limit - recruiterCount;

    if (spotsLeft <= 0) {
      res.status(403).json({
        error: `This hospital has reached its maximum recruiter limit (${limit}) for the ${hospital.onboardingPlan} plan.`,
      });
      return;
    }

    // Return only safe, non-sensitive fields
    res.json({
      hospitalId:   hospital.id,
      hospitalName: hospital.name,
      plan:         hospital.onboardingPlan,
      city:         hospital.city,
      state:        hospital.state,
      type:         hospital.type,
      spotsLeft,
      limit,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Failed to verify invite code.' });
  }
});

export default router;
