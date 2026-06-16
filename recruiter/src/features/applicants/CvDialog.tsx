import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Candidate } from "@/lib/mock";
import type { FormProfile } from "@/lib/formProfile";
import { downloadCvAsPdf } from "@/lib/cvPdf";
import { CvDocument } from "@/components/cv/CvDocument";

function toSanitizedProfile(candidate: Candidate): FormProfile {
  if (candidate.formProfile) {
    return { ...candidate.formProfile, email: "", phone: "" };
  }
  return {
    name: candidate.name,
    headline: candidate.summary || `${candidate.role} - ${candidate.specialty}`,
    email: "",
    phone: "",
    city: candidate.location,
    state: candidate.location,
    avatar: candidate.initials,
    verified: candidate.verified,
    completeness: candidate.matchPercent || 70,
    role: candidate.role,
    registrationNumber: candidate.registration,
    registrationCouncil: "",
    specialty: candidate.specialty,
    yearsExperience: candidate.experienceYears,
    summary: candidate.summary,
    qualifications: candidate.education.map((e) => ({
      degree: e.degree,
      institution: e.institute,
      year: e.year,
    })),
    experience: candidate.experience.map((e) => ({
      role: e.role,
      hospital: e.employer,
      city: e.location,
      start: e.period,
      end: "",
      summary: e.highlights.join("; "),
    })),
    clinicalSkills: candidate.skills,
    technicalSkills: [],
    procedures: candidate.procedures.map((p) => ({ name: p, count: 0 })),
    certifications: candidate.certifications.map((name) => ({ name, issuer: "", year: "" })),
    publications: [],
    languages: candidate.languages,
    availability: candidate.availabilityStatus || candidate.noticePeriod || "",
    expectedSalaryMin: Number(candidate.expectedSalaryMin || 0),
    expectedSalaryMax: Number(candidate.expectedSalaryMax || 0),
  };
}

export function CvDialog({
  candidate,
  onClose,
}: {
  candidate: Candidate | null;
  onClose: () => void;
}) {
  const sanitizedProfile = candidate ? toSanitizedProfile(candidate) : null;

  const printSanitizedCv = () => {
    if (!candidate) return;
    downloadCvAsPdf("recruiter-cv-view", `${candidate.name}-CV.pdf`);
    toast.success("Sanitized CV ready to print or save as PDF");
  };

  return (
    <Dialog open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden p-0">
        {candidate && sanitizedProfile && (
          <div className="flex h-[85vh] flex-col">
            <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-border p-4">
              <div>
                <DialogTitle className="font-display text-[16px]">
                  CV - {candidate.name}
                </DialogTitle>
                <p className="text-[12px] text-muted-foreground">
                  {candidate.role} - {candidate.specialty} - Sanitized recruiter CV
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={printSanitizedCv}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                </Button>
                <Button size="sm" className="h-8" onClick={printSanitizedCv}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </DialogHeader>

            <Tabs defaultValue="structured" className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b border-border bg-muted/20 px-4 py-2">
                <TabsList>
                  <TabsTrigger value="structured">Sanitized CV</TabsTrigger>
                  <TabsTrigger value="print">Print preview</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="structured" className="flex-1 overflow-y-auto p-6">
                <CvDocument profile={sanitizedProfile} id="recruiter-cv-view" />
              </TabsContent>

              <TabsContent value="print" className="flex-1 overflow-y-auto bg-muted/40 p-4">
                <div className="mx-auto max-w-[720px]">
                  <CvDocument profile={sanitizedProfile} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
