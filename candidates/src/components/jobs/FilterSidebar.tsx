import { useMemo, type ReactNode } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  Check,
  Clock3,
  MapPin,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Filters = {
  cities: string[];
  minExp: number;
  minSalary: number;
  types: string[];
  sort: "latest" | "salary" | "relevance";
};

export const DEFAULT_FILTERS: Filters = {
  cities: [],
  minExp: 0,
  minSalary: 0,
  types: [],
  sort: "latest",
};

const TYPES = ["Full-time", "Locum", "Part-time", "Contract"];

export function FilterSidebar({
  jobs = [],
  filters,
  onChange,
}: {
  jobs?: any[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const cities = useMemo(
    () =>
      Array.from(new Set(jobs.map((j) => j.city)))
        .filter(Boolean)
        .sort(),
    [jobs],
  );
  const activeCount = getActiveFilterCount(filters);
  const topSalary = useMemo(
    () => jobs.reduce((max, job) => Math.max(max, Number(job.salaryMax || 0)), 0),
    [jobs],
  );
  const strongestMatch = useMemo(
    () => jobs.reduce((max, job) => Math.max(max, Number(job.matchPercent || 0)), 0),
    [jobs],
  );

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <aside className="self-start overflow-hidden rounded-2xl border bg-card shadow-pop lg:sticky lg:top-20">
      <div className="relative bg-[linear-gradient(135deg,oklch(0.21_0.05_265),oklch(0.55_0.18_262))] p-5 text-primary-foreground">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider opacity-80">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Refine search
            </div>
            <h3 className="mt-2 text-lg font-semibold tracking-tight">Premium filters</h3>
          </div>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-primary-foreground ring-1 ring-white/15 transition-colors hover:bg-white/15"
            aria-label="Reset filters"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Insight label="Roles" value={`${jobs.length}`} />
          <Insight label="Top LPA" value={topSalary ? `${topSalary}` : "0"} />
          <Insight label="Best fit" value={strongestMatch ? `${strongestMatch}%` : "—"} />
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="rounded-xl border bg-surface-2 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active filters
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {activeCount === 0 ? "No filters applied" : `${activeCount} applied`}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-primary">
              {activeCount}
            </span>
          </div>
          {activeCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {filters.cities.map((c) => (
                <FilterChip key={c}>{c}</FilterChip>
              ))}
              {filters.types.map((t) => (
                <FilterChip key={t}>{t}</FilterChip>
              ))}
              {filters.minExp > 0 && <FilterChip>{filters.minExp}+ yrs</FilterChip>}
              {filters.minSalary > 0 && <FilterChip>₹{filters.minSalary}+ LPA</FilterChip>}
              {filters.sort !== "latest" && <FilterChip>{filters.sort}</FilterChip>}
            </div>
          )}
        </div>

        <FilterGroup
          icon={<Sparkles className="h-4 w-4" />}
          title="Sort by"
          subtitle="Control ranking"
        >
          <Select
            value={filters.sort}
            onValueChange={(v: Filters["sort"]) => onChange({ ...filters, sort: v })}
          >
            <SelectTrigger className="h-10 rounded-xl bg-surface text-xs shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest roles</SelectItem>
              <SelectItem value="salary">Salary high to low</SelectItem>
              <SelectItem value="relevance">Profile relevance</SelectItem>
            </SelectContent>
          </Select>
        </FilterGroup>

        <FilterGroup
          icon={<MapPin className="h-4 w-4" />}
          title="Location"
          subtitle={`${cities.length} cities available`}
        >
          <div className="scrollbar-thin max-h-48 space-y-2 overflow-y-auto pr-1">
            {cities.map((c) => (
              <PremiumCheckRow
                key={c}
                label={c}
                checked={filters.cities.includes(c)}
                onChange={() => onChange({ ...filters, cities: toggle(filters.cities, c) })}
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup
          icon={<Clock3 className="h-4 w-4" />}
          title="Experience"
          subtitle={`${filters.minExp}+ years minimum`}
        >
          <PremiumSlider
            value={filters.minExp}
            min={0}
            max={15}
            step={1}
            left="0 yrs"
            right="15+ yrs"
            onChange={(v) => onChange({ ...filters, minExp: v })}
          />
        </FilterGroup>

        <FilterGroup
          icon={<Banknote className="h-4 w-4" />}
          title="Salary"
          subtitle={`₹${filters.minSalary}+ LPA minimum`}
        >
          <PremiumSlider
            value={filters.minSalary}
            min={0}
            max={50}
            step={2}
            left="Any"
            right="₹50+ LPA"
            onChange={(v) => onChange({ ...filters, minSalary: v })}
          />
        </FilterGroup>

        <FilterGroup
          icon={<BriefcaseBusiness className="h-4 w-4" />}
          title="Job type"
          subtitle="Role structure"
        >
          <div className="space-y-2">
            {TYPES.map((t) => (
              <PremiumCheckRow
                key={t}
                label={t}
                checked={filters.types.includes(t)}
                onChange={() => onChange({ ...filters, types: toggle(filters.types, t) })}
              />
            ))}
          </div>
        </FilterGroup>
      </div>
    </aside>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
      <p className="text-[9px] font-semibold uppercase tracking-wider opacity-65">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function FilterChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border bg-surface px-2.5 py-1 text-[10px] font-medium text-foreground/80">
      {children}
    </span>
  );
}

function FilterGroup({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
          {icon}
        </span>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {title}
          </Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function PremiumCheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border bg-surface px-3 py-2 text-xs transition-colors",
        checked && "border-brand bg-brand-soft text-primary shadow-soft",
        !checked && "text-foreground hover:border-brand/40 hover:bg-surface-2",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Checkbox checked={checked} onCheckedChange={onChange} />
        <span className="truncate font-medium">{label}</span>
      </span>
      {checked ? (
        <Check className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      )}
    </label>
  );
}

function PremiumSlider({
  value,
  min,
  max,
  step,
  left,
  right,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  left: string;
  right: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border bg-surface px-3 py-4">
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
      <div className="mt-3 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        <span>{left}</span>
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-primary">{value}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function getActiveFilterCount(filters: Filters) {
  return (
    filters.cities.length +
    filters.types.length +
    (filters.minExp > 0 ? 1 : 0) +
    (filters.minSalary > 0 ? 1 : 0) +
    (filters.sort !== "latest" ? 1 : 0)
  );
}
