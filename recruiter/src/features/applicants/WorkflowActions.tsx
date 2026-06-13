import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateApplicationStatus } from "@/lib/recruiterData";
import { displayToApiStatus, type DisplayApplicantStatus } from "@/lib/applicationStatus";
import { toast } from "sonner";
import { InterviewSchedulerModal } from "./InterviewSchedulerModal";
import { DocumentRequestModal } from "./DocumentRequestModal";
import { OfferLetterModal } from "./OfferLetterModal";
import { JoiningDateModal } from "./JoiningDateModal";

export function WorkflowActions({
  applicationId,
  status,
  onUpdate,
}: {
  applicationId: string;
  status: string;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<
    "none" | "schedule" | "reschedule" | "nextRound" | "documents" | "offer" | "joining"
  >("none");

  const setStatus = async (display: DisplayApplicantStatus, payload: any = {}, message: string) => {
    setLoading(true);
    try {
      await updateApplicationStatus(applicationId, display, payload);
      toast.success(message);
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Could not update status");
    } finally {
      setLoading(false);
    }
  };

  const apiStatus = displayToApiStatus(status);

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {/* 1. Applied -> Reviewed / Rejected */}
      {apiStatus === "Applied" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={loading}
            onClick={() => setStatus("Reviewed", {}, "Marked as reviewed")}
          >
            Mark Reviewed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={loading}
            onClick={() => setStatus("Rejected", {}, "Candidate rejected")}
          >
            Reject
          </Button>
        </>
      )}

      {/* 2. Reviewed -> Schedule Interview / Reject */}
      {apiStatus === "Reviewed" && (
        <>
          <Button size="sm" className="h-9" disabled={loading} onClick={() => setModal("schedule")}>
            Schedule Interview
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={loading}
            onClick={() => setStatus("Rejected", {}, "Candidate rejected")}
          >
            Reject
          </Button>
        </>
      )}

      {/* 3. Reschedule Requested -> Reschedule */}
      {apiStatus === "RescheduleRequested" && (
        <Button size="sm" className="h-9" disabled={loading} onClick={() => setModal("reschedule")}>
          Reschedule Interview
        </Button>
      )}

      {/* 4. Interview Actions: Accepted/Rescheduled/Scheduled */}
      {(apiStatus === "InterviewAccepted" || apiStatus === "InterviewRescheduled") && (
        <>
          <Button
            size="sm"
            className="h-9 bg-indigo-600 hover:bg-indigo-700"
            disabled={loading}
            onClick={() => setStatus("InterviewCompleted", {}, "Interview marked as completed")}
          >
            Mark Completed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={loading}
            onClick={() => setStatus("NoShow", {}, "Marked as no-show")}
          >
            No Show
          </Button>
        </>
      )}

      {/* 5. Interview Completed -> Outcome */}
      {(apiStatus === "InterviewCompleted" || apiStatus === "NextRound") && (
        <>
          <Button
            size="sm"
            className="h-9"
            disabled={loading}
            onClick={() => setStatus("Shortlisted", {}, "Candidate shortlisted")}
          >
            Shortlist
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={loading}
            onClick={() => setModal("nextRound")}
          >
            Next Round
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={loading}
            onClick={() => setStatus("OnHold", {}, "Placed on hold")}
          >
            On Hold
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={loading}
            onClick={() => setStatus("Rejected", {}, "Candidate rejected")}
          >
            Reject
          </Button>
        </>
      )}

      {/* 6. Shortlisted -> Request Docs / Send Offer */}
      {apiStatus === "Shortlisted" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={loading}
            onClick={() => setModal("documents")}
          >
            Request Documents
          </Button>
        </>
      )}

      {/* 7. Document Flow */}
      {apiStatus === "DocumentsUploaded" && (
        <>
          <Button
            size="sm"
            className="h-9"
            disabled={loading}
            onClick={() => setStatus("DocumentsApproved", {}, "Documents approved")}
          >
            Approve Documents
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={loading}
            onClick={() => setStatus("AdditionalDocumentsRequired", {}, "Requested more documents")}
          >
            Request More
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={loading}
            onClick={() => setStatus("DocumentsRejected", {}, "Documents rejected")}
          >
            Reject Documents
          </Button>
        </>
      )}

      {apiStatus === "DocumentsApproved" && (
        <Button
          size="sm"
          className="h-9 bg-emerald-600 hover:bg-emerald-700"
          disabled={loading}
          onClick={() => setModal("offer")}
        >
          Send Offer Letter
        </Button>
      )}

      {/* 8. Offer Accepted -> Confirm Joining */}
      {apiStatus === "OfferAccepted" && (
        <Button size="sm" className="h-9" disabled={loading} onClick={() => setModal("joining")}>
          Confirm Joining
        </Button>
      )}

      {/* 9. Joining Confirmed -> Joined */}
      {apiStatus === "JoiningConfirmed" && (
        <Button
          size="sm"
          className="h-9"
          disabled={loading}
          onClick={() => setStatus("Joined", {}, "Candidate joined")}
        >
          Mark as Joined
        </Button>
      )}

      {/* 10. Joined -> Onboarded / Dropped */}
      {apiStatus === "Joined" && (
        <>
          <Button
            size="sm"
            className="h-9 bg-emerald-600 hover:bg-emerald-700"
            disabled={loading}
            onClick={() => setStatus("Onboarded", {}, "Candidate onboarded")}
          >
            Complete Onboarding
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={loading}
            onClick={() => setStatus("Dropped", {}, "Candidate dropped out")}
          >
            Mark Dropped
          </Button>
        </>
      )}

      {/* Modals */}
      {modal === "schedule" && (
        <InterviewSchedulerModal
          isOpen={true}
          onClose={() => setModal("none")}
          onSubmit={async (p) => setStatus("InterviewScheduled", p, "Interview scheduled")}
        />
      )}
      {modal === "reschedule" && (
        <InterviewSchedulerModal
          isOpen={true}
          isReschedule={true}
          onClose={() => setModal("none")}
          onSubmit={async (p) => setStatus("InterviewScheduled", p, "Interview rescheduled")}
        />
      )}
      {modal === "nextRound" && (
        <InterviewSchedulerModal
          isOpen={true}
          isReschedule={true}
          title="Schedule Next Round"
          onClose={() => setModal("none")}
          onSubmit={async (p) => setStatus("NextRound", p, "Next round scheduled")}
        />
      )}
      {modal === "documents" && (
        <DocumentRequestModal
          isOpen={true}
          onClose={() => setModal("none")}
          onSubmit={async (p) => setStatus("DocumentsRequested", p, "Documents requested")}
        />
      )}
      {modal === "offer" && (
        <OfferLetterModal
          applicationId={applicationId}
          isOpen={true}
          onClose={() => setModal("none")}
          onSuccess={() => {
            toast.success("Offer letter sent successfully!");
            onUpdate();
          }}
        />
      )}
      {modal === "joining" && (
        <JoiningDateModal
          isOpen={true}
          onClose={() => setModal("none")}
          onSubmit={async (p) => setStatus("JoiningConfirmed", p, "Joining confirmed")}
        />
      )}
    </div>
  );
}
