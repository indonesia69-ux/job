import { useMemo, useState, useEffect } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/features/search/PlanContext";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobDescriptionEditor } from "@/components/jobs/JobDescriptionEditor";
import { JobCustomFormBuilder } from "@/components/jobs/JobCustomFormBuilder";
import { LottiePlayer } from "@/components/common/LottiePlayer";
import { sanitizeJobDescriptionHtml } from "@/lib/sanitizeHtml";
import { validateCreateJob, type CreateJobFieldErrors } from "@/lib/createJobValidation";
import { validateCustomFieldsForPost, type JobCustomField } from "@/lib/jobCustomFields";
import { updateJob } from "@/lib/recruiterData";
import { Route } from "@/routes/_app.jobs.$jobId.edit";

const ALL_STATUS_OPTIONS = ["Active", "Draft", "Closed"] as const;
const TYPE_OPTIONS = ["Full-time", "Part-time", "Locum"] as const;

export function EditJobPage() {
  const { job } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [role, setRole] = useState(job.role || "");
  const [specialty, setSpecialty] = useState(job.specialty || "");
  const [category, setCategory] = useState(job.category || "");
  const [stateCity, setStateCity] = useState(job.location || "");
  const [city, setCity] = useState(job.city || "");
  const [type, setType] = useState(job.type || "Full-time");
  const [status, setStatus] = useState(job.status || "Active");
  const [statusTouched, setStatusTouched] = useState(false);
  const [salaryMin, setSalaryMin] = useState(String(job.salaryMin ?? ""));
  const [salaryMax, setSalaryMax] = useState(String(job.salaryMax ?? ""));
  const [experienceMin, setExperienceMin] = useState(String(job.experienceMin ?? ""));
  const [experienceMax, setExperienceMax] = useState(String(job.experienceMax ?? ""));
  const [description, setDescription] = useState(job.description || "");
  const [requirementsText, setRequirementsText] = useState((job.requirements || []).join("\n"));
  const [tagsText, setTagsText] = useState((job.tags || []).join(", "));
  const [customFields, setCustomFields] = useState<JobCustomField[]>(
    job.customApplicationFields || [],
  );
  const [customFormEnabled, setCustomFormEnabled] = useState(
    (job.customApplicationFields || []).length > 0,
  );
  const [fieldErrors, setFieldErrors] = useState<CreateJobFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const { isPlanSuspended } = usePlan();

  useEffect(() => {
    if (!statusTouched) setStatus(job.status || "Active");
  }, [job.status, statusTouched]);

  const hospitalName = useMemo(
    () => (typeof job.hospital === "string" ? job.hospital : "Your hospital"),
    [job.hospital],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const validation = validateCreateJob(
      {
        hospitalName,
        state: stateCity,
        city: city || stateCity,
        role: category || specialty || "Other",
        otherRoleTitle: role,
        description,
        salaryMin,
        salaryMax,
        expMin: experienceMin,
        expMax: experienceMax,
      },
      { roleIsOther: !category || category === "Other", designation: role },
    );
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      toast.error(validation.message);
      return;
    }
    if (customFormEnabled) {
      const customErr = validateCustomFieldsForPost(customFields);
      if (customErr) {
        toast.error(customErr);
        return;
      }
    }

    setSaving(true);
    try {
      await updateJob(job.id, {
        role: role.trim(),
        specialty: specialty.trim(),
        category: category.trim() || null,
        location: stateCity.trim(),
        city: city.trim() || null,
        type,
        status,
        description: sanitizeJobDescriptionHtml(description),
        salaryMin: Number.parseFloat(salaryMin),
        salaryMax: Number.parseFloat(salaryMax),
        experienceMin: experienceMin === "" ? null : Number.parseInt(experienceMin, 10),
        experienceMax: experienceMax === "" ? null : Number.parseInt(experienceMax, 10),
        requirements: requirementsText
          .split("\n")
          .map((line: string) => line.trim())
          .filter(Boolean),
        tags: tagsText
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean),
        customApplicationFields: customFormEnabled ? customFields : [],
      });
      toast.success("Job updated");
      await router.invalidate();
      navigate({ to: "/jobs", search: { q: "" } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mx-auto w-full max-w-[980px] space-y-6" onSubmit={handleSubmit}>
      {isPlanSuspended && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Your account is currently suspended (read-only mode). You cannot edit jobs until you
            renew your plan.
          </span>
        </div>
      )}

      <div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight">Edit job</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">{hospitalName}</p>
      </div>

      <Card className="border-border bg-card shadow-soft">
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <Field label="Designation title" required error={fieldErrors.designation}>
            <Input value={role} onChange={(e) => setRole(e.target.value)} className="h-11" />
          </Field>
          <Field label="Specialty" required>
            <Input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="h-11"
            />
          </Field>
          <Field label="Category">
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11"
            />
          </Field>
          <Field label="Job type" required>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location" required error={fieldErrors.state}>
            <Input
              value={stateCity}
              onChange={(e) => setStateCity(e.target.value)}
              className="h-11"
            />
          </Field>
          <Field label="City" required error={fieldErrors.city}>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-11" />
          </Field>
          <Field label="Salary min (LPA)" required error={fieldErrors.salaryMin}>
            <Input
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              inputMode="decimal"
              className="h-11"
            />
          </Field>
          <Field label="Salary max (LPA)" required error={fieldErrors.salaryMax}>
            <Input
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              inputMode="decimal"
              className="h-11"
            />
          </Field>
          <Field label="Experience min">
            <Input
              value={experienceMin}
              onChange={(e) => setExperienceMin(e.target.value)}
              type="number"
              min={0}
              className="h-11"
            />
          </Field>
          <Field label="Experience max">
            <Input
              value={experienceMax}
              onChange={(e) => setExperienceMax(e.target.value)}
              type="number"
              min={0}
              className="h-11"
            />
          </Field>
          <Field label="Status" required>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val);
                setStatusTouched(true);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUS_OPTIONS.filter((option) => {
                  if (option === "Draft") return job.status === "Draft";
                  if (option === "Active" && job.closedReason === "plan_expired") return false;
                  return true;
                }).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tags">
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="e.g. ICU, Night Shift (comma separated)"
              className="h-11"
            />
          </Field>

          {job.closedReason === "plan_expired" && (
            <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This job was closed automatically because your plan expired or downgraded. You
                cannot reactivate it. Please post a new job instead.
              </span>
            </div>
          )}
          <div className="md:col-span-2">
            <Field label="Requirements">
              <Textarea
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                rows={4}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Job description" required error={fieldErrors.description}>
              <JobDescriptionEditor value={description} onChange={setDescription} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <JobCustomFormBuilder
        enabled={customFormEnabled}
        onEnabledChange={setCustomFormEnabled}
        fields={customFields}
        onChange={setCustomFields}
      />

      <Card className="border-border bg-card shadow-soft">
        <CardContent className="flex justify-end gap-2 p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/jobs", search: { q: "" } })}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving || isPlanSuspended}>
            {saving ? (
              <LottiePlayer src="/loading_state.json" loop className="mr-1.5 h-7 w-7" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function Field({
  label,
  children,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
