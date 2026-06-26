import { useState } from "react";
import { Edit3, ShieldCheck, Check, Lock, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { VerifiedBadge } from "@/components/brand/VerifiedBadge";
import { saveHospitalProfile, type HospitalProfile } from "@/lib/recruiterData";
import { authHeader, getUser, login } from "@/store/authStore";
import { apiBase, apiFetch } from "@/lib/api";
import { Route } from "@/routes/_app.settings";
import { PlanTab } from "@/features/settings/PlanTab";

const EMPTY: HospitalProfile = {
  id: "",
  name: "",
  shortName: "",
  type: "",
  city: "",
  state: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  registrationNumber: "",
  beds: null,
  founded: null,
  about: "",
  specialties: [],
  verified: false,
  profileComplete: false,
};

export function SettingsPage() {
  const user = getUser();
  const { hospital: loaded } = Route.useLoaderData();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeTab = tab || "profile";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<HospitalProfile>(() =>
    loaded ? { ...EMPTY, ...loaded } : EMPTY,
  );
  // Recruiter's own name (separate from hospital name)
  const [recruiterName, setRecruiterName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  // Notification preferences
  const { userPrefs } = Route.useLoaderData();
  const [notifOnApply, setNotifOnApply] = useState(userPrefs?.notifOnApply ?? true);
  const [notifWeekly, setNotifWeekly] = useState(userPrefs?.notifWeekly ?? false);
  const [notifHighMatch, setNotifHighMatch] = useState(userPrefs?.notifHighMatch ?? true);
  const [savingNotif, setSavingNotif] = useState(false);

  const set = <K extends keyof HospitalProfile>(k: K, v: HospitalProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /** Save ONLY city + state (the two unlocked hospital fields) */
  const save = async () => {
    try {
      const updated = await saveHospitalProfile({
        city: form.city,
        state: form.state,
      });
      setForm((f) => ({ ...f, ...updated }));
      setEditing(false);
      toast.success("Location updated successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save changes");
    }
  };

  /** Save recruiter's own display name via PATCH /api/auth/me */
  const saveRecruiterName = async () => {
    if (!recruiterName.trim()) return;
    setSavingName(true);
    try {
      const res = await apiFetch(`${apiBase()}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ name: recruiterName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      const data = await res.json();
      // Persist new token so header stays fresh without page reload
      if (data.token && data.user) {
        login(data.token, data.user);
      }
      toast.success("Your name updated successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update name");
    } finally {
      setSavingName(false);
    }
  };

  /** Save notification preferences via PATCH /api/auth/me */
  const saveNotifPrefs = async () => {
    setSavingNotif(true);
    try {
      const res = await apiFetch(`${apiBase()}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          notifOnApply,
          notifWeekly,
          notifHighMatch,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Notification preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setSavingNotif(false);
    }
  };

  const initials = (form.shortName || form.name || "HP").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">
            Hospital profile &amp; settings
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Manage your recruiter workspace and location.
          </p>
        </div>
        <Button
          variant={editing ? "default" : "outline"}
          onClick={() => {
            if (editing) void save();
            else setEditing(true);
          }}
        >
          {editing ? (
            <>
              <Check className="mr-1.5 h-4 w-4" /> Save changes
            </>
          ) : (
            <>
              <Edit3 className="mr-1.5 h-4 w-4" /> Edit location
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => navigate({ search: { tab: val } })}>
        <TabsList>
          <TabsTrigger value="profile">Hospital profile</TabsTrigger>
          <TabsTrigger value="myaccount">My account</TabsTrigger>
          <TabsTrigger value="plan" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Plan &amp; Billing
          </TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="notif">Notifications</TabsTrigger>
        </TabsList>

        {/* ── Hospital Profile Tab ── */}
        <TabsContent value="profile" className="mt-5 space-y-5">
          {/* Preview card */}
          <Card className="border-border bg-card shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-16 w-16 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-[18px] font-semibold">
                  {initials}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[20px] font-semibold">
                      {form.name || "Your hospital"}
                    </h2>
                    {form.verified && <VerifiedBadge label="Verified Hospital" size="md" />}
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    {form.type || "—"} · {form.city || "—"}, {form.state || "—"}
                    {form.beds ? ` · ${form.beds} beds` : ""}
                  </div>
                </div>
              </div>
              {form.about && (
                <p className="mt-4 text-[13.5px] leading-relaxed text-foreground/85">
                  {form.about}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Verified / locked fields info banner */}
          {form.verified && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/60 bg-amber-50/60 p-4 text-[13px] text-amber-900">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Profile locked after admin verification</p>
                <p className="mt-0.5 text-[12px] text-amber-800/80">
                  Hospital Name, Type, Registration Number, Beds and contact details are locked
                  because this hospital has been verified by ApronHanger. Only your location (City
                  &amp; State) can be updated. Contact support to request changes to locked fields.
                </p>
              </div>
            </div>
          )}

          {/* Editable fields grid */}
          <Card className="border-border bg-card shadow-soft">
            <CardContent className="grid gap-4 p-6 md:grid-cols-2">
              {/* ── LOCKED fields ── */}
              <LockedField label="Hospital name" value={form.name || ""} />
              <LockedField label="Hospital type" value={form.type || ""} />
              <LockedField label="Registration number" value={form.registrationNumber || ""} />
              <LockedField
                label="Number of beds"
                value={form.beds != null ? String(form.beds) : ""}
              />
              <LockedField label="Website" value={form.website || ""} />
              <LockedField label="Phone" value={form.phone || ""} />
              <LockedField label="Recruitment email" value={form.email || ""} />
              <LockedField label="Address" className="md:col-span-2" value={form.address || ""} />

              {/* ── EDITABLE: City & State ── */}
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">
                  City <span className="text-[10px] font-normal text-success ml-1">(editable)</span>
                </Label>
                <Input
                  value={form.city || ""}
                  onChange={(e) => set("city", e.target.value)}
                  disabled={!editing}
                  className="h-11"
                  placeholder="Mumbai"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">
                  State{" "}
                  <span className="text-[10px] font-normal text-success ml-1">(editable)</span>
                </Label>
                <Input
                  value={form.state || ""}
                  onChange={(e) => set("state", e.target.value)}
                  disabled={!editing}
                  className="h-11"
                  placeholder="Maharashtra"
                />
              </div>

              <div className="md:col-span-2 text-[12px] text-muted-foreground border-t border-border pt-4">
                Signed in as <span className="text-foreground font-medium">{user?.name}</span> (
                {user?.email})
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── My Account Tab (recruiter's own name) ── */}
        <TabsContent value="myaccount" className="mt-5">
          <Card className="border-border bg-card shadow-soft">
            <CardContent className="space-y-5 p-6">
              <div>
                <h3 className="text-[15px] font-semibold">Your personal details</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  These are your recruiter account details, separate from the hospital profile.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">
                    Your name{" "}
                    <span className="text-[10px] font-normal text-success ml-1">(editable)</span>
                  </Label>
                  <Input
                    value={recruiterName}
                    onChange={(e) => setRecruiterName(e.target.value)}
                    className="h-11"
                    placeholder="Dr. Ananya Sen"
                  />
                </div>
                <LockedField label="Email (login)" value={user?.email || ""} />
              </div>

              <div className="flex justify-end border-t border-border pt-4">
                <Button onClick={saveRecruiterName} disabled={savingName || !recruiterName.trim()}>
                  {savingName ? "Saving…" : "Save name"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Plan & Billing Tab ── */}
        <TabsContent value="plan" className="mt-5">
          <PlanTab />
        </TabsContent>

        {/* ── Verification Tab ── */}
        <TabsContent value="verification" className="mt-5 space-y-4">
          <Card className="border-accent/20 bg-accent/[0.05] shadow-soft">
            <CardContent className="flex items-start gap-4 p-6">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="font-display text-[16px] font-semibold">
                  {form.verified ? "Verified Hospital" : "Verification pending"}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {form.verified
                    ? `Verified on ${form.verifiedOn || "—"} by ${form.verifiedBy || "ApronHanger"}.`
                    : "Your hospital is awaiting admin verification. This usually takes 1-2 business days."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notif" className="mt-5">
          <Card className="border-border bg-card shadow-soft">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-4">
                {(
                  [
                    {
                      label: "Email me when a new candidate applies",
                      value: notifOnApply,
                      setter: setNotifOnApply,
                    },
                    {
                      label: "Email me weekly hiring summary",
                      value: notifWeekly,
                      setter: setNotifWeekly,
                    },
                    {
                      label: "Notify me of high-match candidates (>90%)",
                      value: notifHighMatch,
                      setter: setNotifHighMatch,
                    },
                  ] as const
                ).map(({ label, value, setter }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[13.5px]">{label}</span>
                    <Switch checked={value} onCheckedChange={(v) => setter(v)} aria-label={label} />
                  </div>
                ))}
              </div>
              <Button size="sm" onClick={saveNotifPrefs} disabled={savingNotif}>
                {savingNotif ? "Saving…" : "Save preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** A read-only field that visually indicates it is locked */
function LockedField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5">
        <Label className="text-[12.5px]">{label}</Label>
        <Lock className="h-3 w-3 text-muted-foreground/60" />
      </div>
      <div className="mt-1.5 flex h-11 items-center rounded-lg border border-border bg-muted/30 px-3 text-[13.5px] text-foreground/70 select-none">
        {value || <span className="text-muted-foreground/50 text-[12px]">Not set</span>}
      </div>
    </div>
  );
}
