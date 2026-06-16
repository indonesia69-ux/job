import { createFileRoute } from "@tanstack/react-router";
import { User, Globe, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoVerification, setAutoVerification] = useState(false);

  const handleSaveProfile = () => {
    toast.info("Profile settings — coming soon. Contact engineering to update admin credentials.");
  };

  const handleToggle = (label: string, newValue: boolean) => {
    toast.info(`${label} ${newValue ? "enabled" : "disabled"} — this setting will be wired in a future update.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage admin profile, platform configuration, and permissions
        </p>
      </div>

      {/* Coming soon notice */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        Settings management is in read-only preview. Changes will be persisted in a future release.
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Admin Profile */}
        <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Admin Profile</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              SA
            </div>
            <div>
              <p className="text-sm font-semibold">Super Admin</p>
              <p className="text-xs text-muted-foreground">admin@apronhanger.in</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Full Name</label>
              <input
                className="mt-1 w-full rounded-lg border bg-secondary/50 px-3 py-2 text-sm"
                defaultValue="Arjun Mehta"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                className="mt-1 w-full rounded-lg border bg-secondary/50 px-3 py-2 text-sm"
                defaultValue="admin@apronhanger.in"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Role</label>
              <input
                className="mt-1 w-full rounded-lg border bg-secondary/50 px-3 py-2 text-sm text-muted-foreground"
                defaultValue="Super Admin"
                disabled
              />
            </div>
          </div>
          <button
            onClick={handleSaveProfile}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Save Profile
          </button>
        </div>

        {/* Platform Settings */}
        <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Platform Settings</h3>
          </div>
          <div className="space-y-3">
            <ToggleRow
              label="Maintenance Mode"
              description="Disable public access"
              value={maintenanceMode}
              onChange={(v) => {
                setMaintenanceMode(v);
                handleToggle("Maintenance Mode", v);
              }}
            />
            <ToggleRow
              label="Email Notifications"
              description="System email alerts"
              value={emailNotifications}
              onChange={(v) => {
                setEmailNotifications(v);
                handleToggle("Email Notifications", v);
              }}
            />
            <ToggleRow
              label="Auto-Verification"
              description="Auto-verify trusted hospitals"
              value={autoVerification}
              onChange={(v) => {
                setAutoVerification(v);
                handleToggle("Auto-Verification", v);
              }}
            />
          </div>
        </div>

        {/* Role Permissions */}
        <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Role Permissions</h3>
          </div>
          <div className="space-y-3">
            {[
              { role: "Super Admin", perms: "Full access to all modules", color: "bg-primary" },
              { role: "Admin", perms: "Manage users, jobs, applications", color: "bg-chart-1" },
              {
                role: "Moderator",
                perms: "Review verifications, flag content",
                color: "bg-chart-2",
              },
              {
                role: "Viewer",
                perms: "Read-only access to dashboards",
                color: "bg-muted-foreground",
              },
            ].map((r) => (
              <div key={r.role} className="flex items-center gap-3 rounded-lg border p-3">
                <div className={`h-2 w-2 rounded-full ${r.color}`} />
                <div>
                  <p className="text-sm font-medium">{r.role}</p>
                  <p className="text-xs text-muted-foreground">{r.perms}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none ${
          value ? "bg-primary" : "bg-muted"
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform duration-200 ${
            value ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
