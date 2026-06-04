import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Building2,
  MapPin,
  FileText,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Phone,
  Stethoscope
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiBase } from "@/lib/api";

export const Route = createFileRoute("/auth/onboarding")({
  head: () => ({
    meta: [
      { title: "Hospital Onboarding — ApronHanger" },
      { name: "description", content: "Register your hospital on ApronHanger to start hiring top medical professionals." },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = [
  { label: "Organization Details", icon: Building2 },
  { label: "Registration & Compliance", icon: ShieldCheck },
  { label: "Location Details", icon: MapPin },
  { label: "Contact & Billing", icon: Phone },
  { label: "Additional Info", icon: Stethoscope },
  { label: "Plan Selection", icon: ClipboardList },
  { label: "Review & Submit", icon: FileText },
] as const;

const PLAN_OPTIONS = [
  {
    id: "Basic",
    name: "Basic",
    price: "Free",
    recruiters: "Up to 3 recruiters",
    description: "Perfect for small clinics and single-specialty centres.",
    highlight: false,
  },
  {
    id: "Pro",
    name: "Pro",
    price: "₹4,999/mo",
    recruiters: "Up to 10 recruiters",
    description: "Ideal for mid-size hospitals with multiple departments.",
    highlight: true,
  },
  {
    id: "Premium",
    name: "Premium",
    price: "₹14,999/mo",
    recruiters: "Unlimited recruiters",
    description: "For large hospital chains and multi-facility networks.",
    highlight: false,
  },
];

type FormData = {
  // Step 1: Org Details
  hospitalName: string;
  brandName: string;
  hospitalType: string;
  founded: string;
  website: string;
  about: string;

  // Step 2: Registration
  registrationNumber: string;
  registrationAuthority: string;
  nabhStatus: string;
  nablStatus: string;
  gstNumber: string;
  panNumber: string;
  ownershipType: string;

  // Step 3: Location
  address: string;
  city: string;
  state: string;
  district: string;
  pinCode: string;

  // Step 4: Contact & Billing
  contactName: string;
  contactDesignation: string;
  phone: string;
  contactWhatsapp: string;
  email: string;
  contactAlternatePhone: string;
  billingName: string;
  billingGstNumber: string;
  billingAddress: string;
  billingEmail: string;
  billingPhone: string;

  // Step 5: Additional Info
  beds: string;
  icuBeds: string;
  numberOfDoctors: string;
  numberOfEmployees: string;
  averageMonthlyHiring: string;
  preferredHiringStates: string;
  emergencyHiringRequirement: "Yes" | "No" | "";
  internshipHiring: "Yes" | "No" | "";
  campusRecruitment: "Yes" | "No" | "";

  // Step 6: Plan
  plan: "Basic" | "Pro" | "Premium";
};

const INITIAL: FormData = {
  hospitalName: "",
  brandName: "",
  hospitalType: "",
  founded: "",
  website: "",
  about: "",
  registrationNumber: "",
  registrationAuthority: "",
  nabhStatus: "",
  nablStatus: "",
  gstNumber: "",
  panNumber: "",
  ownershipType: "",
  address: "",
  city: "",
  state: "",
  district: "",
  pinCode: "",
  contactName: "",
  contactDesignation: "",
  phone: "",
  contactWhatsapp: "",
  email: "",
  contactAlternatePhone: "",
  billingName: "",
  billingGstNumber: "",
  billingAddress: "",
  billingEmail: "",
  billingPhone: "",
  beds: "",
  icuBeds: "",
  numberOfDoctors: "",
  numberOfEmployees: "",
  averageMonthlyHiring: "",
  preferredHiringStates: "",
  emergencyHiringRequirement: "",
  internshipHiring: "",
  campusRecruitment: "",
  plan: "Basic",
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validateStep = (s: number): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (s === 0) {
      if (!form.hospitalName.trim()) errs.hospitalName = "Organization Name is required.";
      if (!form.hospitalType) errs.hospitalType = "Organization Type is required.";
    }
    if (s === 2) { // Location
      if (!form.city.trim()) errs.city = "City is required.";
      if (!form.state.trim()) errs.state = "State is required.";
      if (!form.address.trim()) errs.address = "Address is required.";
    }
    if (s === 3) { // Contact & Billing
      if (!form.contactName.trim()) errs.contactName = "Primary Contact Name is required.";
      if (!form.phone.trim()) errs.phone = "Mobile Number is required.";
      if (!form.email.trim()) errs.email = "Official Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errs.email = "Enter a valid email address.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase()}/api/onboarding/hospitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.hospitalName,
          brandName: form.brandName,
          type: form.hospitalType,
          founded: form.founded,
          website: form.website,
          about: form.about,
          
          registrationNumber: form.registrationNumber,
          registrationAuthority: form.registrationAuthority,
          nabhStatus: form.nabhStatus,
          nablStatus: form.nablStatus,
          gstNumber: form.gstNumber,
          panNumber: form.panNumber,
          ownershipType: form.ownershipType,
          
          address: form.address,
          city: form.city,
          state: form.state,
          district: form.district,
          pinCode: form.pinCode,

          submittedBy: form.contactName,
          contactDesignation: form.contactDesignation,
          phone: form.phone,
          contactWhatsapp: form.contactWhatsapp,
          email: form.email,
          contactAlternatePhone: form.contactAlternatePhone,
          
          billingName: form.billingName,
          billingGstNumber: form.billingGstNumber,
          billingAddress: form.billingAddress,
          billingEmail: form.billingEmail,
          billingPhone: form.billingPhone,

          beds: form.beds,
          icuBeds: form.icuBeds,
          numberOfDoctors: form.numberOfDoctors,
          numberOfEmployees: form.numberOfEmployees,
          averageMonthlyHiring: form.averageMonthlyHiring,
          preferredHiringStates: form.preferredHiringStates,
          emergencyHiringRequirement: form.emergencyHiringRequirement === "Yes",
          internshipHiring: form.internshipHiring === "Yes",
          campusRecruitment: form.campusRecruitment === "Yes",

          plan: form.plan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to submit application.");
        return;
      }

      setSubmitted(true);
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <div>
          <h2 className="font-display text-[26px] font-semibold tracking-tight text-foreground">
            Application Submitted!
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-sm">
            Your hospital onboarding application for{" "}
            <span className="font-semibold text-foreground">{form.hospitalName}</span> has been
            received. Our team will review it within{" "}
            <span className="font-medium">48 hours</span>.
          </p>
        </div>
        <div className="w-full rounded-xl border border-border bg-muted/30 p-4 text-left text-sm space-y-2">
          <p className="font-medium text-foreground">What happens next?</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[13px]">
            <li>Our admin team reviews your application and documents.</li>
            <li>Upon approval, you'll receive a unique <strong>12-character invite code</strong>.</li>
            <li>Share this code with your recruiters so they can sign up and start posting jobs.</li>
          </ol>
        </div>
        <Link to="/auth/login" className="text-[13px] font-medium text-accent hover:underline">
          Go back to Sign In →
        </Link>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-foreground">
          Hospital Onboarding
        </h2>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Register your hospital to start hiring qualified medical professionals.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span className="font-medium text-foreground">{STEPS[step].label}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className={
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium " +
                  (i < step
                    ? "bg-success/15 text-success"
                    : i === step
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground")
                }
              >
                {i < step ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i+1}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Organization Details */}
      {step === 0 && (
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="hospitalType">Organization Type <span className="text-destructive">*</span></Label>
            <Select value={form.hospitalType} onValueChange={(v) => set("hospitalType", v)}>
              <SelectTrigger id="hospitalType" className="h-11" aria-invalid={!!errors.hospitalType}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hospital">Hospital</SelectItem>
                <SelectItem value="Medical College">Medical College</SelectItem>
                <SelectItem value="Nursing Home">Nursing Home</SelectItem>
                <SelectItem value="Clinic">Clinic</SelectItem>
                <SelectItem value="Diagnostic Centre">Diagnostic Centre</SelectItem>
                <SelectItem value="IVF Centre">IVF Centre</SelectItem>
                <SelectItem value="Blood Bank">Blood Bank</SelectItem>
                <SelectItem value="Pharmacy Chain">Pharmacy Chain</SelectItem>
                <SelectItem value="Telemedicine Company">Telemedicine Company</SelectItem>
                <SelectItem value="Healthcare Startup">Healthcare Startup</SelectItem>
                <SelectItem value="NGO / Trust Hospital">NGO / Trust Hospital</SelectItem>
                <SelectItem value="Government Institution">Government Institution</SelectItem>
                <SelectItem value="Others">Others</SelectItem>
              </SelectContent>
            </Select>
            <FieldError msg={errors.hospitalType} />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hospitalName">Organization Name <span className="text-destructive">*</span></Label>
              <Input
                id="hospitalName"
                value={form.hospitalName}
                onChange={(e) => set("hospitalName", e.target.value)}
                placeholder="e.g. Apollo Hospitals"
                className="h-11"
                aria-invalid={!!errors.hospitalName}
              />
              <FieldError msg={errors.hospitalName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brandName">Brand Name (if different)</Label>
              <Input
                id="brandName"
                value={form.brandName}
                onChange={(e) => set("brandName", e.target.value)}
                placeholder="e.g. Apollo Clinic"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="founded">Year of Establishment</Label>
              <Input
                id="founded"
                type="number"
                value={form.founded}
                onChange={(e) => set("founded", e.target.value)}
                placeholder="e.g. 1998"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://yourhospital.in"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="about">Organization Description</Label>
            <Textarea
              id="about"
              value={form.about}
              onChange={(e) => set("about", e.target.value)}
              placeholder="Briefly describe your organization..."
              className="resize-none"
              rows={4}
            />
          </div>
        </div>
      )}

      {/* Step 2: Registration & Compliance */}
      {step === 1 && (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                value={form.registrationNumber}
                onChange={(e) => set("registrationNumber", e.target.value)}
                placeholder="e.g. MH/HOS/2024/1234"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="registrationAuthority">Registration Authority</Label>
              <Input
                id="registrationAuthority"
                value={form.registrationAuthority}
                onChange={(e) => set("registrationAuthority", e.target.value)}
                placeholder="e.g. BMC, Directorate of Health Services"
                className="h-11"
              />
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nabhStatus">NABH Status</Label>
              <Select value={form.nabhStatus} onValueChange={(v) => set("nabhStatus", v)}>
                <SelectTrigger id="nabhStatus" className="h-11">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Accredited">Accredited</SelectItem>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="Not Accredited">Not Accredited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nablStatus">NABL Status (for labs)</Label>
              <Select value={form.nablStatus} onValueChange={(v) => set("nablStatus", v)}>
                <SelectTrigger id="nablStatus" className="h-11">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Accredited">Accredited</SelectItem>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="Not Accredited">Not Accredited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={form.gstNumber}
                onChange={(e) => set("gstNumber", e.target.value)}
                placeholder="27AADCB2230M1Z2"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={form.panNumber}
                onChange={(e) => set("panNumber", e.target.value)}
                placeholder="ABCDE1234F"
                className="h-11"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="ownershipType">Ownership Type</Label>
            <Select value={form.ownershipType} onValueChange={(v) => set("ownershipType", v)}>
              <SelectTrigger id="ownershipType" className="h-11">
                <SelectValue placeholder="Select ownership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                <SelectItem value="Partnership">Partnership</SelectItem>
                <SelectItem value="LLP">LLP</SelectItem>
                <SelectItem value="Private Limited">Private Limited</SelectItem>
                <SelectItem value="Public Limited">Public Limited</SelectItem>
                <SelectItem value="Trust">Trust</SelectItem>
                <SelectItem value="Society">Society</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 3: Location Details */}
      {step === 2 && (
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="address">Head Office / Street Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="e.g. 58, Canal Circular Road, Kadapara"
              className="h-11"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="e.g. Mumbai"
                className="h-11"
                aria-invalid={!!errors.city}
              />
              <FieldError msg={errors.city} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                placeholder="e.g. Mumbai Suburban"
                className="h-11"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="e.g. Maharashtra"
                className="h-11"
                aria-invalid={!!errors.state}
              />
              <FieldError msg={errors.state} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pinCode">PIN Code</Label>
              <Input
                id="pinCode"
                value={form.pinCode}
                onChange={(e) => set("pinCode", e.target.value)}
                placeholder="e.g. 400001"
                className="h-11"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Contact & Billing */}
      {step === 3 && (
        <div className="grid gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Primary Contact Person</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contactName">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="contactName"
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  placeholder="e.g. Dr. Priya Sharma"
                  className="h-11"
                  aria-invalid={!!errors.contactName}
                />
                <FieldError msg={errors.contactName} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactDesignation">Designation</Label>
                <Select value={form.contactDesignation} onValueChange={(v) => set("contactDesignation", v)}>
                  <SelectTrigger id="contactDesignation" className="h-11">
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HR Manager">HR Manager</SelectItem>
                    <SelectItem value="HR Executive">HR Executive</SelectItem>
                    <SelectItem value="Medical Superintendent">Medical Superintendent</SelectItem>
                    <SelectItem value="Director">Director</SelectItem>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="Dean">Dean</SelectItem>
                    <SelectItem value="Principal">Principal</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile Number <span className="text-destructive">*</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-11"
                  aria-invalid={!!errors.phone}
                />
                <FieldError msg={errors.phone} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactWhatsapp">WhatsApp Number</Label>
                <Input
                  id="contactWhatsapp"
                  type="tel"
                  value={form.contactWhatsapp}
                  onChange={(e) => set("contactWhatsapp", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">Official Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="recruitment@hospital.in"
                  className="h-11"
                  aria-invalid={!!errors.email}
                />
                <FieldError msg={errors.email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactAlternatePhone">Alternate Contact Number</Label>
                <Input
                  id="contactAlternatePhone"
                  type="tel"
                  value={form.contactAlternatePhone}
                  onChange={(e) => set("contactAlternatePhone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-t pt-4">Billing Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="billingName">Billing Name</Label>
                <Input
                  id="billingName"
                  value={form.billingName}
                  onChange={(e) => set("billingName", e.target.value)}
                  placeholder="Name as per GST"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billingGstNumber">GST Number</Label>
                <Input
                  id="billingGstNumber"
                  value={form.billingGstNumber}
                  onChange={(e) => set("billingGstNumber", e.target.value)}
                  placeholder="27AADCB2230M1Z2"
                  className="h-11"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="billingAddress">Billing Address</Label>
              <Input
                id="billingAddress"
                value={form.billingAddress}
                onChange={(e) => set("billingAddress", e.target.value)}
                placeholder="Full billing address"
                className="h-11"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="billingEmail">Accounts Email</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  value={form.billingEmail}
                  onChange={(e) => set("billingEmail", e.target.value)}
                  placeholder="accounts@hospital.in"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billingPhone">Payment Contact Number</Label>
                <Input
                  id="billingPhone"
                  type="tel"
                  value={form.billingPhone}
                  onChange={(e) => set("billingPhone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-11"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Additional Info */}
      {step === 4 && (
        <div className="grid gap-4">
          <p className="text-[13px] text-muted-foreground mb-2">
            These fields are highly recommended to help us serve you better.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="beds">Total Beds</Label>
              <Input
                id="beds"
                type="number"
                value={form.beds}
                onChange={(e) => set("beds", e.target.value)}
                placeholder="e.g. 250"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="icuBeds">ICU Beds</Label>
              <Input
                id="icuBeds"
                type="number"
                value={form.icuBeds}
                onChange={(e) => set("icuBeds", e.target.value)}
                placeholder="e.g. 50"
                className="h-11"
              />
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="numberOfDoctors">Number of Doctors</Label>
              <Input
                id="numberOfDoctors"
                type="number"
                value={form.numberOfDoctors}
                onChange={(e) => set("numberOfDoctors", e.target.value)}
                placeholder="e.g. 120"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numberOfEmployees">Number of Employees</Label>
              <Input
                id="numberOfEmployees"
                type="number"
                value={form.numberOfEmployees}
                onChange={(e) => set("numberOfEmployees", e.target.value)}
                placeholder="e.g. 500"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="averageMonthlyHiring">Average Monthly Hiring</Label>
              <Input
                id="averageMonthlyHiring"
                type="number"
                value={form.averageMonthlyHiring}
                onChange={(e) => set("averageMonthlyHiring", e.target.value)}
                placeholder="e.g. 15"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preferredHiringStates">Preferred Hiring States</Label>
              <Input
                id="preferredHiringStates"
                value={form.preferredHiringStates}
                onChange={(e) => set("preferredHiringStates", e.target.value)}
                placeholder="e.g. MH, KA, DL"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="emergencyHiringRequirement">Emergency Hiring?</Label>
              <Select value={form.emergencyHiringRequirement} onValueChange={(v: "Yes"|"No") => set("emergencyHiringRequirement", v)}>
                <SelectTrigger id="emergencyHiringRequirement" className="h-11">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="internshipHiring">Internship Hiring?</Label>
              <Select value={form.internshipHiring} onValueChange={(v: "Yes"|"No") => set("internshipHiring", v)}>
                <SelectTrigger id="internshipHiring" className="h-11">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campusRecruitment">Campus Recruitment?</Label>
              <Select value={form.campusRecruitment} onValueChange={(v: "Yes"|"No") => set("campusRecruitment", v)}>
                <SelectTrigger id="campusRecruitment" className="h-11">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Plan Selection */}
      {step === 5 && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Choose a plan based on your hiring volume. You can upgrade anytime.
          </p>
          {PLAN_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => set("plan", p.id as FormData["plan"])}
              className={[
                "w-full rounded-xl border-2 p-4 text-left transition-all",
                form.plan === p.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/40",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      form.plan === p.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground",
                    ].join(" ")}
                  >
                    {form.plan === p.id && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{p.name}</p>
                    <p className="text-[12px] text-muted-foreground">{p.recruiters}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-foreground">{p.price}</p>
                  {p.highlight && (
                    <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Popular
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 pl-8 text-[12px] text-muted-foreground">{p.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 7: Review */}
      {step === 6 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Organization</p>
                <p className="mt-0.5 font-display text-[18px] font-semibold text-foreground">{form.hospitalName}</p>
                <p className="text-[13px] text-muted-foreground">{form.hospitalType} · {form.city}, {form.state}{form.beds ? ` · ${form.beds} beds` : ""}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-[11px] font-semibold text-warning">
                Pending Review
              </span>
            </div>
            <div className="border-t border-border pt-4 grid gap-3 text-[13px] sm:grid-cols-2">
              <div><p className="text-muted-foreground">Contact</p><p className="font-medium">{form.contactName}</p></div>
              <div><p className="text-muted-foreground">Official Email</p><p className="font-medium">{form.email}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{form.phone}</p></div>
              <div><p className="text-muted-foreground">Plan</p><p className="font-semibold text-primary">{form.plan}</p></div>
              {form.registrationNumber && (
                <div><p className="text-muted-foreground">Reg. Number</p><p className="font-medium">{form.registrationNumber}</p></div>
              )}
              {form.gstNumber && (
                <div><p className="text-muted-foreground">GST</p><p className="font-medium">{form.gstNumber}</p></div>
              )}
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            By submitting, you confirm that all the details above are accurate and you are authorised to register this organization on ApronHanger.
            Our team will verify the information within <strong>48 hours</strong>.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className={`pt-4 ${step === STEPS.length - 1 ? "flex flex-col gap-3" : "flex items-center justify-between"}`}>
        {step < STEPS.length - 1 ? (
          <>
            <Button type="button" variant="ghost" onClick={back} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button type="button" onClick={next} className="h-11 px-6 text-[14px] font-medium">
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-12 w-full text-[15px] font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting Application…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Submit Application</>
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={back} disabled={submitting} className="w-full text-[13px]">
              <ChevronLeft className="h-4 w-4 mr-1" /> Go Back & Review
            </Button>
          </>
        )}
      </div>

      <p className="text-center text-[12px] text-muted-foreground">
        Already have an invite code?{" "}
        <Link to="/auth/signup" className="font-medium text-accent hover:underline">
          Sign up as recruiter →
        </Link>
      </p>
    </div>
  );
}
