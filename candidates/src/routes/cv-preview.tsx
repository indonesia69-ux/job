import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCvAsPdf } from "@/lib/cvPdf";
import { useProfile } from "@/store/profileStore";
import { CvDocument } from "@/components/cv/CvDocument";
import { requireCandidateAuth } from "@/lib/requireAuth";

export const Route = createFileRoute("/cv-preview")({
  beforeLoad: () => requireCandidateAuth("/cv-preview"),
  head: () => ({ meta: [{ title: "CV Preview — ApronHanger" }] }),
  component: CVPreview,
});

function CVPreview() {
  const c = useProfile();

  if (!c) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary">
          <FileText className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">No CV yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your ApronHanger CV is generated from the form. Fill it once and it'll be ready for every
          Quick Apply.
        </p>
        <Button asChild className="mt-6">
          <Link to="/build-cv">Build my CV</Link>
        </Button>
      </div>
    );
  }

  if (c.cvSource === "upload" && !c.experience?.length && !c.qualifications?.length) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary">
          <FileText className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          You've uploaded a CV
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your CV document <strong>{c.uploadedCvName}</strong> has been uploaded and will be sent
          with your applications.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            onClick={() => {
              if (c.cvUrl) {
                window.open(c.cvUrl, "_blank");
              } else if (c.uploadedCvData) {
                const a = document.createElement("a");
                a.href = c.uploadedCvData;
                a.download = c.uploadedCvName || "cv.pdf";
                a.click();
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" /> Download Document
          </Button>
          <Button variant="outline" asChild>
            <Link to="/build-cv">Switch to Form CV</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Generated CV
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Your professional profile
          </h1>
        </div>
        <div className="flex gap-2">
          {(c.cvUrl || c.uploadedCvData) && (
            <Button
              variant="outline"
              onClick={() => {
                if (c.cvUrl) {
                  window.open(c.cvUrl, "_blank");
                } else if (c.uploadedCvData) {
                  const a = document.createElement("a");
                  a.href = c.uploadedCvData;
                  a.download = c.uploadedCvName || "cv.pdf";
                  a.click();
                }
              }}
            >
              <Download className="h-4 w-4 mr-1.5" /> Attached Document
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/build-cv">
              <Pencil className="h-4 w-4 mr-1.5" /> Edit CV
            </Link>
          </Button>
          <Button
            type="button"
            onClick={() => downloadCvAsPdf("cv-document", `${c.name.replace(/\s+/g, "-")}-CV.pdf`)}
          >
            <Download className="h-4 w-4 mr-1.5" /> Download PDF
          </Button>
        </div>
      </div>

      <CvDocument profile={c} id="cv-document" className="mx-auto mt-6" />
    </div>
  );
}
