import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Building2, ShieldCheck, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { login as saveAuth } from "@/store/authStore";
import { apiBase } from "@/lib/api";
import { loginErrorMessage } from "@/lib/authMessages";
import { LottiePlayer } from "@/components/common/LottiePlayer";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Recruiter Sign Up — ApronHanger" },
      { name: "description", content: "Sign up as a recruiter using your hospital invite code." },
    ],
  }),
  component: SignupPage,
});

type HospitalInfo = {
  hospitalId: string;
  hospitalName: string;
  plan: string;
  city: string | null;
  state: string | null;
  spotsLeft: number;
  limit: number;
};

type SignupStep = "details" | "otp";
type RecruiterSignupDraft = {
  name: string;
  fullName: string;
  username: string;
  mobile: string;
  email: string;
  password: string;
  role: "RECRUITER";
  inviteCode: string;
};

function SignupPage() {
  const navigate = useNavigate();
  const [agreeCertify, setAgreeCertify] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [signupDraft, setSignupDraft] = useState<RecruiterSignupDraft | null>(null);
  const [signupOtp, setSignupOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Invite code state
  const [inviteCode, setInviteCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState<HospitalInfo | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const usernameRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // Auto-verify when 12 chars entered
  useEffect(() => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 12) {
      setHospitalInfo(null);
      setCodeError(null);
      return;
    }
    verifyCode(code);
  }, [inviteCode]);

  const verifyCode = async (code: string) => {
    setVerifying(true);
    setCodeError(null);
    setHospitalInfo(null);
    try {
      const res = await fetch(`${apiBase()}/api/onboarding/verify-code/${code}`);
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || "Invalid invite code.");
      } else {
        setHospitalInfo(data);
      }
    } catch {
      setCodeError("Could not verify code. Check your connection.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupStep === "otp") {
      await handleVerifySignupOtp();
      return;
    }

    if (!hospitalInfo) {
      setFormError("Please enter a valid 12-character invite code first.");
      return;
    }
    if (!agreeCertify || !agreeTerms || !agreePrivacy) {
      setFormError("Please agree to all terms and declarations to proceed.");
      return;
    }

    const username = usernameRef.current?.value.trim() ?? "";
    const fullName = fullNameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";
    const mobile = mobileRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";
    const confirmPassword = confirmPasswordRef.current?.value ?? "";

    const errs: Record<string, string> = {};
    if (!username || username.length < 3) errs.username = "Username must be at least 3 characters.";
    if (!fullName || fullName.length < 2)
      errs.fullName = "Full name must be at least 2 characters.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address.";
    if (!mobile || mobile.length < 10) errs.mobile = "Enter a valid mobile number.";
    if (!password || password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match.";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFormError(errs[Object.keys(errs)[0]]);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setLoading(true);

    try {
      const draft: RecruiterSignupDraft = {
        name: fullName,
        fullName,
        username,
        mobile,
        email,
        password,
        role: "RECRUITER",
        inviteCode: inviteCode.trim().toUpperCase(),
      };

      const res = await fetch(`${apiBase()}/api/auth/signup/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, role: "RECRUITER" }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = loginErrorMessage(res.status, data.error);
        setFormError(msg);
        toast.error(msg);
        return;
      }

      setSignupDraft(draft);
      setSignupOtp("");
      setSignupStep("otp");
      toast.success("OTP sent to your mobile number.");
    } catch {
      const msg = "Network error. Is the backend running?";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupOtp = async () => {
    if (!signupDraft) {
      setSignupStep("details");
      setFormError("Please enter your signup details again.");
      return;
    }
    if (signupOtp.length < 6) {
      setFormError("Please enter a valid 6-digit OTP.");
      return;
    }

    setFormError(null);
    setLoading(true);
    try {
      const verifyRes = await fetch(`${apiBase()}/api/auth/signup/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: signupDraft.mobile, otp: signupOtp, role: "RECRUITER" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        const msg = verifyData.error || "Invalid OTP.";
        setFormError(msg);
        toast.error(msg);
        return;
      }

      const res = await fetch(`${apiBase()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...signupDraft,
          signup_token: verifyData.signup_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = loginErrorMessage(res.status, data.error);
        setFormError(msg);
        toast.error(msg);
        return;
      }

      saveAuth(data.token, data.user);
      toast.success(
        `Welcome to ApronHanger! You're now a recruiter for ${hospitalInfo?.hospitalName ?? "your hospital"}.`,
      );
      setLoginSuccess(true);
      setTimeout(() => {
        navigate({ to: "/" });
      }, 1200);
    } catch {
      const msg = "Network error. Is the backend running?";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h2 className="font-display text-[28px] font-semibold tracking-tight text-foreground">
          Create Recruiter Account
        </h2>
        <p className="text-[14px] text-muted-foreground">
          Enter your hospital's invite code to sign up.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {formError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

        {/* ── Invite Code Block ────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor="inviteCode">
            Hospital Invite Code <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) =>
                setInviteCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 12))
              }
              placeholder="Enter 12-character code"
              className="h-11 font-mono text-base tracking-widest uppercase pr-10"
              aria-invalid={!!codeError}
              autoComplete="off"
              spellCheck={false}
            />
            {verifying && (
              <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-muted-foreground" />
            )}
            {!verifying && hospitalInfo && (
              <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-success" />
            )}
          </div>
          {inviteCode.length > 0 && inviteCode.length < 12 && (
            <p className="text-[11px] text-muted-foreground">
              {12 - inviteCode.length} more characters needed
            </p>
          )}
          {codeError && <p className="text-xs text-destructive">{codeError}</p>}
        </div>

        {/* Hospital preview card on valid code */}
        {hospitalInfo && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">
                  {hospitalInfo.hospitalName}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {[hospitalInfo.city, hospitalInfo.state].filter(Boolean).join(", ")}
                </p>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {hospitalInfo.plan} Plan
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {hospitalInfo.spotsLeft} recruiter spot{hospitalInfo.spotsLeft !== 1 ? "s" : ""}{" "}
                    remaining
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
                    <ShieldCheck className="h-3 w-3" /> Verified Hospital
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {hospitalInfo && signupStep === "otp" && signupDraft ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div>
              <Label htmlFor="signupOtp">
                Mobile OTP <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signupOtp"
                value={signupOtp}
                onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="mt-1.5 h-11 text-center text-lg font-semibold tracking-widest"
                disabled={loading || loginSuccess}
                required
              />
            </div>
            <p className="text-[12px] text-muted-foreground">
              Enter the OTP sent to {signupDraft.mobile}.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-0 text-[13px]"
              onClick={() => {
                setSignupStep("details");
                setSignupOtp("");
                setFormError(null);
              }}
              disabled={loading || loginSuccess}
            >
              Edit signup details
            </Button>
          </div>
        ) : null}

        {/* Personal details — only shown after valid code */}
        {hospitalInfo && signupStep === "details" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="username">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={usernameRef}
                id="username"
                placeholder="e.g. asen2026"
                className="h-11"
                aria-invalid={!!fieldErrors.username}
                required
              />
              {fieldErrors.username && (
                <p className="text-xs text-destructive">{fieldErrors.username}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={fullNameRef}
                id="fullName"
                placeholder="Dr. Ananya Sen"
                className="h-11"
                aria-invalid={!!fieldErrors.fullName}
                required
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">
                Official Email <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                placeholder="you@hospital.in"
                className="h-11"
                aria-invalid={!!fieldErrors.email}
                required
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobile">
                Mobile Number <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={mobileRef}
                id="mobile"
                type="tel"
                placeholder="+91 98765 43210"
                className="h-11"
                aria-invalid={!!fieldErrors.mobile}
                required
              />
              {fieldErrors.mobile && (
                <p className="text-xs text-destructive">{fieldErrors.mobile}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="h-11 pr-10"
                  aria-invalid={!!fieldErrors.password}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
              <p className="text-[11px] text-muted-foreground">Minimum 8 characters.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  ref={confirmPasswordRef}
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="h-11 pr-10"
                  aria-invalid={!!fieldErrors.confirmPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-[12px] text-muted-foreground">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={agreeCertify}
                  onCheckedChange={(v) => setAgreeCertify(Boolean(v))}
                  className="mt-0.5"
                />
                <span>I certify that all information provided is true and correct.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={agreeTerms}
                  onCheckedChange={(v) => setAgreeTerms(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  I agree to APRONHANGER{" "}
                  <span className="text-accent hover:underline">Terms & Conditions</span>.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={agreePrivacy}
                  onCheckedChange={(v) => setAgreePrivacy(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  I agree to APRONHANGER{" "}
                  <span className="text-accent hover:underline">Privacy Policy</span>.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-[14px] font-medium mt-2"
              disabled={loading || loginSuccess}
            >
              {loading || loginSuccess ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending OTP…
                </>
              ) : (
                "Send OTP"
              )}
            </Button>
            {loginSuccess && (
              <LottiePlayer
                src="/successful_signup_signin.json"
                loop={false}
                className="mx-auto mt-4 h-14 w-14 sm:h-16 sm:w-16"
              />
            )}
          </>
        )}
        {hospitalInfo && signupStep === "otp" && (
          <>
            <Button
              type="submit"
              className="h-11 w-full text-[14px] font-medium mt-2"
              disabled={loading || loginSuccess || signupOtp.length < 6}
            >
              {loading || loginSuccess ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account…
                </>
              ) : (
                "Verify & create account"
              )}
            </Button>
            {loginSuccess && (
              <LottiePlayer
                src="/successful_signup_signin.json"
                loop={false}
                className="mx-auto mt-4 h-14 w-14 sm:h-16 sm:w-16"
              />
            )}
          </>
        )}
      </form>

      <div className="space-y-2 text-center text-[13px] text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link to="/auth/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
        <p>
          Don&apos;t have a code?{" "}
          <Link to="/auth/onboarding" className="font-medium text-accent hover:underline">
            Register your hospital →
          </Link>
        </p>
      </div>
    </div>
  );
}
