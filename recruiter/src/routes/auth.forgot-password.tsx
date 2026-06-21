import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, ArrowLeft, Phone, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiBase } from "@/lib/api";
import { LottiePlayer } from "@/components/common/LottiePlayer";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — ApronHanger Recruiter" },
      { name: "description", content: "Reset your ApronHanger recruiter account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"phone" | "otp" | "reset" | "success">("phone");
  const [resetToken, setResetToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error("Please enter your registered mobile number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phone, role: "RECRUITER" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send OTP. Please check your number.");
        return;
      }
      toast.success("OTP sent to your mobile number.");
      setStep("otp");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const verifyRes = await fetch(`${apiBase()}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phone, otp, role: "RECRUITER" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        toast.error(verifyData.error || "Invalid OTP.");
        setLoading(false);
        return;
      }
      setResetToken(verifyData.reset_token);
      setMaskedEmail(verifyData.maskedEmail);
      setStep("reset");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: newPassword,
          role: "RECRUITER",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password.");
        return;
      }
      toast.success("Password reset successfully! Please sign in with your new password.");
      setStep("success");
      setTimeout(() => {
        navigate({ to: "/auth/login" });
      }, 2500);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-[400px] flex-col justify-center space-y-6">
      {step === "otp" && (
        <LottiePlayer
          src="/mail_sent.json"
          loop={false}
          className="mx-auto h-24 w-24 sm:h-28 sm:w-28 mb-4"
        />
      )}
      {step === "success" && (
        <LottiePlayer
          src="/rest_sent_flow.json"
          loop={false}
          className="mx-auto h-28 w-28 sm:h-32 sm:w-32 mb-4"
        />
      )}
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-foreground">
          {step === "phone" ? "Reset Password" : step === "success" ? "Success!" : "Verify & Reset"}
        </h1>
        <p className="text-[14px] text-muted-foreground">
          {step === "phone"
            ? "Enter your registered mobile number to receive an OTP."
            : step === "success"
              ? "Your password has been reset successfully."
              : step === "otp"
                ? `Enter the OTP sent to ${phone}.`
                : `Set a new password for ${maskedEmail}`}
        </p>
      </div>

      {step === "phone" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile Number</Label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/60" />
              <Input
                id="phone"
                type="tel"
                placeholder="Enter 10-digit number"
                className="pl-10 h-11 text-[15px]"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                disabled={loading}
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="h-11 w-full text-[15px] font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
                Sending OTP…
              </>
            ) : (
              <>
                Send OTP <ArrowRight className="ml-2 h-[18px] w-[18px]" />
              </>
            )}
          </Button>
          <div className="text-center">
            <Link
              to="/auth/login"
              className="text-[13px] font-medium text-accent hover:underline inline-flex items-center"
            >
              <ArrowLeft className="mr-1 h-3 w-3" /> Back to Sign In
            </Link>
          </div>
        </form>
      ) : step === "otp" ? (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              type="text"
              placeholder="123456"
              className="h-11 text-center tracking-widest text-lg font-semibold"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              disabled={loading}
              required
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full text-[15px] font-semibold"
            disabled={loading || otp.length < 6}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify OTP"
            )}
          </Button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-[13px] font-medium text-accent hover:underline inline-flex items-center"
            >
              <ArrowLeft className="mr-1 h-3 w-3" /> Change Mobile Number
            </button>
          </div>
        </form>
      ) : step === "reset" ? (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                className="h-11 px-3 pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
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
          </div>
          <Button
            type="submit"
            className="h-11 w-full text-[15px] font-semibold"
            disabled={loading || newPassword.length < 8}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
                Resetting…
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-[13px] font-medium text-accent hover:underline inline-flex items-center"
            >
              <ArrowLeft className="mr-1 h-3 w-3" /> Start Over
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
