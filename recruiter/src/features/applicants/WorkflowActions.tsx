import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateApplicationStatus } from "@/lib/recruiterData";
import { displayToApiStatus, type DisplayApplicantStatus } from "@/lib/applicationStatus";
import { toast } from "sonner";
import { InterviewSchedulerModal } from "./InterviewSchedulerModal";
import { DocumentRequestModal } from "./DocumentRequestModal";
import { OfferLetterModal } from "./OfferLetterModal";
import { JoiningDateModal } from "./JoiningDateModal";
import { usePlan } from "@/features/search/PlanContext";

export function WorkflowActions({
  applicationId,
  status,
  onUpdate,
}: {
  applicationId: string;
  /** Display status string (e.g. "Interview Scheduled"), NOT the raw API status. */
  status: string;
  onUpdate: () => void;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [modal, setModal] = useState<
    "none" | "schedule" | "reschedule" | "nextRound" | "documents" | "offer" | "joining"
  >("none");

  const setStatus = async (display: DisplayApplicantStatus, payload: any = {}, message: string) => {
    setLoadingAction(display);
    try {
      await updateApplicationStatus(applicationId, display, payload, apiStatus);
      toast.success(message);
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Could not update status");
    } finally {
      setLoadingAction(null);
    }
  };

  const apiStatus = displayToApiStatus(status);
  const { isPlanSuspended } = usePlan();
  const isAnyLoading = loadingAction !== null || isPlanSuspended;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {/* 1. Applied -> Reviewed / Rejected */}
      {apiStatus === "Applied" && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setStatus("Reviewed", {}, "Marked as reviewed")}
          >
            {loadingAction === "Reviewed" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Mark Reviewed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={isAnyLoading}
            onClick={() => setStatus("Rejected", {}, "Candidate rejected")}
          >
            {loadingAction === "Rejected" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Reject
          </Button>
        </>
      )}

      {/* 2. Reviewed -> Schedule Interview / Reject */}
      {apiStatus === "Reviewed" && (
        <>
          <Button
            size="sm"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setModal("schedule")}
          >
            Schedule Interview
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={isAnyLoading}
            onClick={() => setStatus("Rejected", {}, "Candidate rejected")}
          >
            {loadingAction === "Rejected" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Reject
          </Button>
        </>
      )}

      {/* 3. Reschedule Requested -> Approve / Reject / Cancel */}
      {apiStatus === "RescheduleRequested" && (
        <>
          <Button
            size="sm"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setModal("reschedule")}
          >
            {loadingAction === "InterviewRescheduled" && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            Approve Reschedule
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setStatus("InterviewDeclined", {}, "Reschedule request rejected")}
          >
            {loadingAction === "InterviewDeclined" && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            Reject Reschedule
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={isAnyLoading}
            onClick={() => setStatus("Rejected", {}, "Interview cancelled")}
          >
            {loadingAction === "Rejected" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Cancel Interview
          </Button>
        </>
      )}

      {/* 3b. Interview Scheduled — waiting for candidate to accept/decline */}
      {apiStatus === "InterviewScheduled" && (
        <>
          <p className="w-full text-[11.5px] text-muted-foreground italic">
            Awaiting candidate response (accept / decline).
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setModal("documents")}
          >
            Request Documents
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={isAnyLoading}
            onClick={() => setStatus("Rejected", {}, "Interview cancelled")}
          >
            {loadingAction === "Rejected" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Cancel Interview
          </Button>
        </>
      )}

      {/* 4. Interview Actions: Accepted / Rescheduled */}
      {(apiStatus === "InterviewAccepted" || apiStatus === "InterviewRescheduled") && (
        <>
          <Button
            size="sm"
            className="h-9 bg-indigo-600 hover:bg-indigo-700"
            disabled={isAnyLoading}
            onClick={() => setStatus("InterviewCompleted", {}, "Interview marked as completed")}
          >
            {loadingAction === "InterviewCompleted" && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            Mark Completed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setStatus("NoShow", {}, "Marked as no-show")}
          >
            {loadingAction === "NoShow" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            No Show
          </Button>
        </>
      )}

      {/* 5. Interview Completed / Next Round → Outcome */}
      {(apiStatus === "InterviewCompleted" || apiStatus === "NextRound") && (
        <>
          <Button
            size="sm"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setStatus("Shortlisted", {}, "Candidate shortlisted")}
          >
            {loadingAction === "Shortlisted" && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            Shortlist
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setModal("nextRound")}
          >
            Next Round
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setStatus("OnHold", {}, "Placed on hold")}
          >
            {loadingAction === "OnHold" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            On Hold
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={isAnyLoading}
            onClick={() => setStatus("Rejected", {}, "Candidate rejected")}
          >
            {loadingAction === "Rejected" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Reject
          </Button>
        </>
      )}

      {/* 5b. No Show → Reschedule or Reject */}
      {apiStatus === "NoShow" && (
        <>
          <Button
            size="sm"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setModal("reschedule")}
          >
            Reschedule Interview
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={isAnyLoading}
            onClick={() => setStatus("Rejected", {}, "Candidate rejected after no-show")}
          >
            {loadingAction === "Rejected" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
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
            disabled={isAnyLoading}
            onClick={() => setModal("documents")}
          >
            Request Documents
          </Button>
        </>
      )}

      {apiStatus === "OnHold" && (
        <>
          <Button
            size="sm"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setStatus("Shortlisted", {}, "Candidate shortlisted")}
          >
            {loadingAction === "Shortlisted" && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            Shortlist
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={isAnyLoading}
            onClick={() => setStatus("Rejected", {}, "Candidate rejected")}
          >
            {loadingAction === "Rejected" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Reject
          </Button>
        </>
      )}

      {/* 7. Document Flow */}
      {apiStatus === "DocumentsUploaded" && (
        <>
          <Button
            size="sm"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setStatus("DocumentsApproved", {}, "Documents approved")}
          >
            {loadingAction === "DocumentsApproved" && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            Approve Documents
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={isAnyLoading}
            onClick={() => setStatus("AdditionalDocumentsRequired", {}, "Requested more documents")}
          >
            {loadingAction === "AdditionalDocumentsRequired" && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            Request More
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={isAnyLoading}
            onClick={() => setStatus("DocumentsRejected", {}, "Documents rejected")}
          >
            {loadingAction === "DocumentsRejected" && (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            )}
            Reject Documents
          </Button>
        </>
      )}

      {apiStatus === "DocumentsApproved" && (
        <Button
          size="sm"
          className="h-9 bg-emerald-600 hover:bg-emerald-700"
          disabled={isAnyLoading}
          onClick={() => setModal("offer")}
        >
          Send Offer Letter
        </Button>
      )}

      {/* 8. Offer Accepted -> Confirm Joining */}
      {apiStatus === "OfferAccepted" && (
        <Button
          size="sm"
          className="h-9"
          disabled={isAnyLoading}
          onClick={() => setModal("joining")}
        >
          Confirm Joining
        </Button>
      )}

      {/* 9. Joining Confirmed -> Joined */}
      {apiStatus === "JoiningConfirmed" && (
        <Button
          size="sm"
          className="h-9"
          disabled={isAnyLoading}
          onClick={() => setStatus("Joined", {}, "Candidate joined")}
        >
          {loadingAction === "Joined" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Mark as Joined
        </Button>
      )}

      {/* 10. Joined -> Onboarded / Dropped */}
      {apiStatus === "Joined" && (
        <>
          <Button
            size="sm"
            className="h-9 bg-emerald-600 hover:bg-emerald-700"
            disabled={isAnyLoading}
            onClick={() => setStatus("Onboarded", {}, "Candidate onboarded")}
          >
            {loadingAction === "Onboarded" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Complete Onboarding
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
            disabled={isAnyLoading}
            onClick={() => setStatus("Dropped", {}, "Candidate dropped out")}
          >
            {loadingAction === "Dropped" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
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
          onSubmit={async (p) => {
            // From NoShow: backend requires NoShow → InterviewRescheduled.
            // We set InterviewRescheduled (with schedule payload) so the recruiter
            // can then move to InterviewScheduled in the next step.
            await setStatus("InterviewRescheduled", p, "Interview rescheduled");
          }}
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
          currentStatus={apiStatus}
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
