import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiBase } from "@/lib/api";
import { authHeader } from "@/store/authStore";
import { toast } from "sonner";
import {
  Download,
  UploadCloud,
  Calendar,
  MapPin,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { LottiePlayer } from "@/components/common/LottiePlayer";

export function CandidateActionCard({
  application,
  onUpdate,
}: {
  application: any;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [docs, setDocs] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setStatus = async (status: string, payload: any = {}) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status, ...payload }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Response recorded successfully!");
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit response");
    } finally {
      setLoading(false);
    }
  };

  const uploadDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docs || docs.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      Array.from(docs).forEach((file) => formData.append("documents", file));

      const res = await fetch(`${apiBase()}/api/applications/${application.id}/documents`, {
        method: "POST",
        headers: authHeader(),
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload documents");
      toast.success("Documents uploaded successfully!");
      setDocs(null);
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || "Failed to upload documents");
    } finally {
      setLoading(false);
    }
  };

  if (application.apiStatus === "InterviewScheduled") {
    return (
      <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Interview Scheduled
        </h4>
        <div className="text-sm text-indigo-800 space-y-1.5 mb-4">
          <p>
            <strong>Date:</strong> {new Date(application.interviewDate).toLocaleString()}
          </p>
          <p>
            <strong>Type:</strong> {application.interviewType}
          </p>
          <p>
            <strong>{application.interviewType === "Virtual" ? "Link: " : "Venue: "}</strong>
            {application.interviewType === "Virtual" && application.meetingLink ? (
              <a
                href={application.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="underline font-medium inline-flex items-center gap-1"
              >
                <LinkIcon className="h-3 w-3" /> Join Meeting
              </a>
            ) : (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {application.venue || "TBA"}
              </span>
            )}
          </p>
          {application.interviewerName && (
            <p>
              <strong>Interviewer:</strong> {application.interviewerName}
            </p>
          )}
        </div>

        {!showReschedule ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
              onClick={() => setStatus("InterviewAccepted")}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              disabled={loading}
              onClick={() => setShowReschedule(true)}
            >
              Request Reschedule
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              disabled={loading}
              onClick={() => setStatus("InterviewDeclined")}
            >
              Decline
            </Button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <Textarea
              placeholder="Please provide your availability for rescheduling..."
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="bg-white border-indigo-200"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={loading || !rescheduleReason.trim()}
                onClick={() =>
                  setStatus("RescheduleRequested", { candidateResponseNote: rescheduleReason })
                }
              >
                Submit Request
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowReschedule(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (
    application.apiStatus === "DocumentsRequested" ||
    application.apiStatus === "AdditionalDocumentsRequired"
  ) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
          <UploadCloud className="h-4 w-4" /> Document Request
        </h4>
        <div className="text-sm text-amber-800 space-y-2 mb-4">
          <p>
            The hospital has requested the following documents to proceed with your application:
          </p>
          <ul className="list-disc pl-5 font-medium">
            {(application.requestedDocumentList || []).map((d: string, i: number) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          {application.documentRequestNote && (
            <p className="italic text-amber-700/80 text-xs">
              Note: {application.documentRequestNote}
            </p>
          )}
        </div>

        <form onSubmit={uploadDocs} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => setDocs(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              className="border-amber-200 text-amber-800 hover:bg-amber-100"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Files
            </Button>
            <span className="text-sm text-amber-700 font-medium">
              {docs ? `${docs.length} file(s) selected` : "No files selected"}
            </span>
          </div>
          {docs && docs.length > 0 && (
            <Button
              type="submit"
              size="sm"
              className="w-fit bg-amber-600 hover:bg-amber-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <LottiePlayer src="/loading_state.json" loop className="h-10 w-10 inline" />
              ) : (
                "Upload Documents"
              )}
            </Button>
          )}
        </form>
      </div>
    );
  }

  if (application.apiStatus === "OfferSent") {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h4 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
          <LottiePlayer src="/rest_sent_flow.json" loop={false} className="h-10 w-10" /> Offer
          Letter Received
        </h4>
        <div className="text-sm text-emerald-800 space-y-3 mb-4">
          <p>Congratulations! The hospital has sent you an offer letter.</p>
          {application.offerLetterUrl && (
            <a
              href={application.offerLetterUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> View Offer Letter PDF
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={loading}
            onClick={() => setStatus("OfferAccepted")}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Accept Offer
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            disabled={loading}
            onClick={() => setStatus("OfferRejected")}
          >
            <XCircle className="mr-1.5 h-4 w-4" /> Reject Offer
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
