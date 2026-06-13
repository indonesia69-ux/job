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
import type { CustomFieldResponses, JobCustomField } from "@/lib/jobCustomFields";

type Props = {
  fields: JobCustomField[];
  values: CustomFieldResponses;
  onChange: (values: CustomFieldResponses) => void;
  title?: string;
};

export function JobCustomFieldsForm({
  fields,
  values,
  onChange,
  title = "Additional questions from the recruiter",
}: Props) {
  if (fields.length === 0) return null;

  const set = (id: string, value: string | number | boolean) => {
    onChange({ ...values, [id]: value });
  };

  return (
    <div className="space-y-4 rounded-xl border border-brand/20 bg-brand-soft/30 p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          These questions are specific to this job posting.
        </p>
      </div>
      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label className="text-[13px]">
            {field.label}
            {field.required && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          {field.helpText && <p className="text-[11px] text-muted-foreground">{field.helpText}</p>}
          {field.type === "textarea" && (
            <Textarea
              value={String(values[field.id] ?? "")}
              onChange={(e) => set(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className="text-[13px]"
            />
          )}
          {field.type === "text" && (
            <Input
              value={String(values[field.id] ?? "")}
              onChange={(e) => set(field.id, e.target.value)}
              placeholder={field.placeholder}
              className="h-10"
            />
          )}
          {field.type === "number" && (
            <Input
              type="number"
              value={values[field.id] !== undefined ? String(values[field.id]) : ""}
              onChange={(e) => set(field.id, e.target.value === "" ? "" : Number(e.target.value))}
              placeholder={field.placeholder}
              className="h-10"
            />
          )}
          {field.type === "select" && (
            <Select
              value={values[field.id] !== undefined ? String(values[field.id]) : ""}
              onValueChange={(v) => set(field.id, v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {field.type === "checkbox" && (
            <div className="flex gap-4">
              {["Yes", "No"].map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-[13px] transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-brand-soft"
                >
                  <input
                    type="radio"
                    name={`checkbox-field-${field.id}`}
                    value={opt}
                    checked={
                      values[field.id] !== undefined
                        ? (values[field.id] ? "Yes" : "No") === opt
                        : false
                    }
                    onChange={() => set(field.id, opt === "Yes")}
                    className="accent-primary"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
