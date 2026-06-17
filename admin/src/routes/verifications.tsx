import { createFileRoute } from "@tanstack/react-router";
import { useAdminStore, RecruiterApplication } from "@/lib/admin-store";
import {
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  X,
  Building2,
  MapPin,
  Phone,
  ClipboardList,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/verifications")({
  component: VerificationsPage,
});

function VerificationsPage() {
  const {
    recruiterApplications,
    approveRecruiterApplication,
    rejectRecruiterApplication,
    requestMoreDocuments,
    isLoading,
  } = useAdminStore();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [detailModalApp, setDetailModalApp] = useState<RecruiterApplication | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [requestedDocs, setRequestedDocs] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const pending = recruiterApplications.filter((a) => a.status === "Pending");
  const docsRequested = recruiterApplications.filter((a) => a.status === "RequestMoreDocuments");
  const approved = recruiterApplications.filter((a) => a.status === "Approved");

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await approveRecruiterApplication(id);
      toast.success("Hospital approved! Invite code has been sent to the hospital.", {
        duration: 5000,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve hospital. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id: string) => {
    setActiveAppId(id);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const openDocsModal = (id: string) => {
    setActiveAppId(id);
    setRequestedDocs("");
    setDocsModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!activeAppId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await rejectRecruiterApplication(activeAppId, rejectReason);
      setRejectModalOpen(false);
      setActiveAppId(null);
      toast.success("Application rejected. The hospital has been notified via email.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject application. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocsSubmit = async () => {
    if (!activeAppId || !requestedDocs.trim()) return;
    setActionLoading(true);
    try {
      await requestMoreDocuments(activeAppId, requestedDocs);
      setDocsModalOpen(false);
      setActiveAppId(null);
      toast.success("Document request sent to the hospital.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send document request. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verification Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve pending hospital onboarding applications
          </p>
        </div>

        {/* Pending Verifications */}
        <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Pending Hospital Verifications</h3>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {pending.length} pending
            </span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading applications...
            </div>
          ) : pending.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              No pending verifications at the moment.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between rounded-lg border p-4 gap-4"
                >
                  <div className="space-y-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold">{h.hospitalName}</p>
                        <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                          {h.plan} Plan
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {h.hospitalType} · {h.city}, {h.state}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Email:</span> {h.email}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone:</span> {h.phone}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reg No:</span>{" "}
                        {h.registrationNumber || "N/A"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Beds:</span> {h.beds}
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Submitted:</span> {h.submitted}
                      </div>
                    </div>

                    {/* View Full Details button */}
                    <button
                      onClick={() => setDetailModalApp(h)}
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Full Application
                    </button>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(h.id)}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none inline-flex justify-center items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-xs font-semibold text-success-foreground hover:bg-success/90 shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => openDocsModal(h.id)}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none inline-flex justify-center items-center gap-1.5 rounded-lg border border-warning/20 bg-warning/10 px-4 py-2 text-xs font-semibold text-warning hover:bg-warning hover:text-warning-foreground transition-colors disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4" /> Request Docs
                    </button>
                    <button
                      onClick={() => openRejectModal(h.id)}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none inline-flex justify-center items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents Requested */}
        <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Documents Requested</h3>
            <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
              {docsRequested.length} waiting
            </span>
          </div>

          {docsRequested.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              No applications waiting for documents.
            </div>
          ) : (
            <div className="space-y-3">
              {docsRequested.map((h) => (
                <div key={h.id} className="flex flex-col rounded-lg border p-4 gap-3 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold">{h.hospitalName}</p>
                      <p className="text-xs text-muted-foreground mt-1">Contact: {h.email}</p>
                    </div>
                    <span className="rounded-full border border-warning/30 bg-warning/10 text-warning px-2.5 py-0.5 text-xs font-medium">
                      Waiting for Docs
                    </span>
                  </div>
                  {h.requestedDocuments && (
                    <div className="text-xs p-3 rounded-md bg-background border">
                      <p className="font-semibold text-muted-foreground mb-1">Requested:</p>
                      <p className="whitespace-pre-wrap">{h.requestedDocuments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Approved */}
        <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recently Approved (Activation Codes)</h3>
            <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              {approved.length} approved
            </span>
          </div>

          {approved.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
              No recently approved hospitals.
            </div>
          ) : (
            <div className="space-y-3">
              {approved.map((h) => (
                <div
                  key={h.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 gap-4 bg-muted/20"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold">{h.hospitalName}</p>
                      <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                        {h.plan} Plan
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Contact: {h.email}</p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1 shrink-0 bg-background rounded-lg border px-4 py-2 shadow-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Activation Code
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-bold text-primary">
                        {h.inviteCode || "N/A"}
                      </code>
                      <button
                        onClick={() => {
                          if (h.inviteCode) {
                            navigator.clipboard.writeText(h.inviteCode);
                            toast.success("Activation code copied to clipboard!");
                          }
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Copy activation code"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Hospital Detail Modal */}
      {detailModalApp && (
        <HospitalDetailModal app={detailModalApp} onClose={() => setDetailModalApp(null)} />
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Reject Application</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting this application. This will be sent to the
              hospital via email.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., The registration number provided could not be verified."
              className="w-full h-32 p-3 text-sm rounded-md border bg-background mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim() || actionLoading}
                className="px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Docs Modal */}
      {docsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Request Additional Documents</h3>
            <p className="text-sm text-muted-foreground mb-4">
              List the specific documents you need. This will be sent to the hospital via email.
            </p>

            <textarea
              value={requestedDocs}
              onChange={(e) => setRequestedDocs(e.target.value)}
              placeholder="- GST Registration Certificate&#10;- NABH Accreditation document"
              className="w-full h-32 p-3 text-sm rounded-md border bg-background mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDocsModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDocsSubmit}
                disabled={!requestedDocs.trim() || actionLoading}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============= Full Hospital Detail Modal =============
function HospitalDetailModal({ app, onClose }: { app: RecruiterApplication; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h3 className="text-base font-semibold">{app.hospitalName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {app.hospitalType} · Full Onboarding Application
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Section 1: Organization Details */}
          <Section icon={<Building2 className="h-4 w-4" />} title="Organization Details">
            <Row label="Organization Name" value={app.hospitalName} />
            <Row label="Brand Name" value={app.brandName} />
            <Row label="Organization Type" value={app.hospitalType} />
            <Row
              label="Year of Establishment"
              value={app.founded ? String(app.founded) : undefined}
            />
            <Row label="Website" value={app.website} />
            <Row label="Description" value={app.about} span />
            <Row label="Plan" value={app.plan} highlight />
            <Row label="Submitted" value={app.submitted} />
          </Section>

          {/* Section 2: Registration & Compliance */}
          <Section icon={<ShieldCheck className="h-4 w-4" />} title="Registration & Compliance">
            <Row label="Registration Number" value={app.registrationNumber} />
            <Row label="Registration Authority" value={app.registrationAuthority} />
            <Row label="NABH Status" value={app.nabhStatus} />
            <Row label="NABL Status" value={app.nablStatus} />
            <Row label="GST Number" value={app.gstNumber} />
            <Row label="PAN Number" value={app.panNumber} />
            <Row label="Ownership Type" value={app.ownershipType} />
          </Section>

          {/* Section 3: Location */}
          <Section icon={<MapPin className="h-4 w-4" />} title="Location Details">
            <Row label="Address" value={app.address} span />
            <Row label="City" value={app.city} />
            <Row label="District" value={app.district} />
            <Row label="State" value={app.state} />
            <Row label="PIN Code" value={app.pinCode} />
          </Section>

          {/* Section 4: Contact & Billing */}
          <Section icon={<Phone className="h-4 w-4" />} title="Contact & Billing">
            <div className="col-span-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-1 border-b">
              Primary Contact
            </div>
            <Row label="Contact Name" value={app.contactName} />
            <Row label="Designation" value={app.contactDesignation} />
            <Row label="Phone" value={app.phone} />
            <Row label="WhatsApp" value={app.contactWhatsapp} />
            <Row label="Official Email" value={app.email} span />
            <Row label="Alternate Phone" value={app.contactAlternatePhone} />
            {(app.billingName || app.billingEmail) && (
              <>
                <div className="col-span-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-1 border-b pt-2">
                  Billing Details
                </div>
                <Row label="Billing Name" value={app.billingName} />
                <Row label="Billing GST" value={app.billingGstNumber} />
                <Row label="Billing Address" value={app.billingAddress} span />
                <Row label="Accounts Email" value={app.billingEmail} />
                <Row label="Payment Phone" value={app.billingPhone} />
              </>
            )}
          </Section>

          {/* Section 5: Additional Info */}
          <Section icon={<Stethoscope className="h-4 w-4" />} title="Additional Information">
            <Row label="Total Beds" value={app.beds ? String(app.beds) : undefined} />
            <Row label="ICU Beds" value={app.icuBeds ? String(app.icuBeds) : undefined} />
            <Row
              label="Number of Doctors"
              value={app.numberOfDoctors ? String(app.numberOfDoctors) : undefined}
            />
            <Row
              label="Number of Employees"
              value={app.numberOfEmployees ? String(app.numberOfEmployees) : undefined}
            />
            <Row
              label="Avg Monthly Hiring"
              value={app.averageMonthlyHiring ? String(app.averageMonthlyHiring) : undefined}
            />
            <Row label="Preferred States" value={app.preferredHiringStates} />
            <Row
              label="Emergency Hiring"
              value={
                app.emergencyHiringRequirement === true
                  ? "Yes"
                  : app.emergencyHiringRequirement === false && app.beds
                    ? "No"
                    : undefined
              }
            />
            <Row
              label="Internship Hiring"
              value={
                app.internshipHiring === true
                  ? "Yes"
                  : app.internshipHiring === false && app.beds
                    ? "No"
                    : undefined
              }
            />
            <Row
              label="Campus Recruitment"
              value={
                app.campusRecruitment === true
                  ? "Yes"
                  : app.campusRecruitment === false && app.beds
                    ? "No"
                    : undefined
              }
            />
          </Section>

          {/* Section 6: Plan */}
          <Section icon={<ClipboardList className="h-4 w-4" />} title="Selected Plan">
            <div className="col-span-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  app.plan === "Premium"
                    ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                    : app.plan === "Pro"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {app.plan} Plan
              </span>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 rounded-lg border bg-muted/20 p-4 text-[13px]">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  span,
  highlight,
}: {
  label: string;
  value?: string | number;
  span?: boolean;
  highlight?: boolean;
}) {
  if (!value && value !== 0) {
    return (
      <div className={span ? "col-span-2" : ""}>
        <p className="text-muted-foreground text-[11px]">{label}</p>
        <p className="text-muted-foreground/50 text-xs italic">Not provided</p>
      </div>
    );
  }
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className={`font-medium break-words ${highlight ? "text-primary font-semibold" : ""}`}>
        {value}
      </p>
    </div>
  );
}
