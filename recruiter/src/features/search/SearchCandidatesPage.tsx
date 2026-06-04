import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Sparkles, Lock, Crown, GraduationCap,
  ShieldCheck, X, Loader2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { type Candidate } from "@/lib/mock";
import { VerifiedBadge } from "@/components/brand/VerifiedBadge";
import { CandidatePanel } from "@/features/applicants/CandidatePanel";
import { CvDialog } from "@/features/applicants/CvDialog";
import { usePlan, PLAN_QUOTA, type PlanTier } from "./PlanContext";
import { searchCandidates } from "@/lib/recruiterData";

// Doctor degrees eligible for Premium Search
const PREMIUM_DEGREES = ["MBBS", "MD", "DM", "DNB", "MS", "MCh", "DrNB"] as const;
type PremiumDegree = (typeof PREMIUM_DEGREES)[number];

const DEGREE_GROUPS = [
  { label: "Medicine", degrees: ["MBBS", "MD", "DM", "DNB"] as PremiumDegree[] },
  { label: "Surgery",  degrees: ["MS", "MCh", "DrNB"] as PremiumDegree[] },
];

export function SearchCandidatesPage() {
  const [tab, setTab]     = useState<"basic" | "premium">("basic");
  const [openId, setOpenId] = useState<string | null>(null);
  const [cvId, setCvId]   = useState<string | null>(null);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);

  const openCandidate = allCandidates.find((c) => c.id === openId) ?? null;
  const cvCandidate   = allCandidates.find((c) => c.id === cvId) ?? null;

  const mergeCandidate = (c: Candidate) =>
    setAllCandidates((prev) => {
      const existing = prev.findIndex((x) => x.id === c.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = c;
        return next;
      }
      return [...prev, c];
    });

  const { isLocked } = usePlan();

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      {isLocked && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>
            <strong>Your account validity has expired.</strong> Your account is locked and you cannot search candidates. Please contact support.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-semibold tracking-tight">
          Search Candidates
        </h1>
        <p className="text-[14px] text-muted-foreground">
          Find healthcare talent across India. Basic covers allied roles; Premium unlocks verified physicians and surgeons.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "basic" | "premium")}>
        <TabsList className="grid w-full grid-cols-2 sm:w-[420px]">
          <TabsTrigger value="basic" className="gap-2">
            <Search className="h-3.5 w-3.5" /> Basic Search
          </TabsTrigger>
          <TabsTrigger value="premium" className="gap-2">
            <Crown className="h-3.5 w-3.5" /> Premium Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-5">
          <BasicSearch onOpen={setOpenId} onCv={setCvId} onResult={mergeCandidate} />
        </TabsContent>
        <TabsContent value="premium" className="mt-5">
          <PremiumSearch onOpen={setOpenId} onCv={setCvId} onResult={mergeCandidate} />
        </TabsContent>
      </Tabs>

      <CandidatePanel
        candidate={openCandidate}
        onClose={() => setOpenId(null)}
        onViewCv={(id) => setCvId(id)}
      />
      <CvDialog candidate={cvCandidate} onClose={() => setCvId(null)} />
    </div>
  );
}

/* ─────────────────────────── BASIC SEARCH ─────────────────────────────────── */

function BasicSearch({
  onOpen, onCv, onResult,
}: {
  onOpen: (id: string) => void;
  onCv:   (id: string) => void;
  onResult: (c: Candidate) => void;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole]   = useState("All");
  const [results, setResults] = useState<Candidate[]>([]);
  const [total, setTotal]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]    = useState<string | null>(null);
  const [roles, setRoles]    = useState<string[]>(["All"]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isLocked } = usePlan();

  const runSearch = useCallback(async (q: string, r: string) => {
    if (isLocked) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchCandidates({ q: q || undefined, role: r, type: "basic", take: 50 });
      setResults(data.candidates);
      setTotal(data.total);
      data.candidates.forEach(onResult);

      // Collect unique roles from current result set for the filter dropdown
      const uniqueRoles = Array.from(new Set(data.candidates.map((c) => c.role).filter(Boolean)));
      setRoles((prev) => {
        const merged = Array.from(new Set(["All", ...prev.slice(1), ...uniqueRoles]));
        return merged;
      });
    } catch (e: any) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }, [onResult]);

  // Initial load + debounced re-search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query, role), query ? 350 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role]);

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card shadow-soft">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-[12.5px] text-amber-900">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Basic search covers nurses, technicians, pharmacists and allied roles.
              Doctor (MBBS / MD / MS / DM / MCh / DNB / DrNB) profiles are gated to{" "}
              <span className="font-medium">Premium Search</span>.
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLocked}
                placeholder="Search by name, specialty, skill, location…"
                className="h-10 pl-9"
              />
            </div>
            <Select value={role} onValueChange={setRole} disabled={isLocked}>
              <SelectTrigger className="h-10 sm:w-56">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {!loading && <span>{total} candidate{total !== 1 ? "s" : ""} found</span>}
          </div>
        </CardContent>
      </Card>

      {error && <ErrorBanner message={error} />}
      <ResultsGrid results={results} onOpen={onOpen} onCv={onCv} loading={loading} />
    </div>
  );
}

/* ─────────────────────────── PREMIUM SEARCH ───────────────────────────────── */

function PremiumSearch({
  onOpen, onCv, onResult,
}: {
  onOpen: (id: string) => void;
  onCv:   (id: string) => void;
  onResult: (c: Candidate) => void;
}) {
  const { plan, used, quota, remaining, consume, isLocked } = usePlan();
  const [query, setQuery]             = useState("");
  const [selectedDegrees, setSelectedDegrees] = useState<PremiumDegree[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults]         = useState<Candidate[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const toggleDegree = (d: PremiumDegree) =>
    setSelectedDegrees((arr) =>
      arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d],
    );

  const runSearch = async () => {
    if (isLocked) return;
    if (remaining <= 0) {
      toast.error(`You've reached your ${plan} plan limit of ${quota} premium searches.`);
      return;
    }
    if (!consume()) return;
    setLoading(true);
    setError(null);
    try {
      const degrees = selectedDegrees.length > 0 ? selectedDegrees : [...PREMIUM_DEGREES];
      const data = await searchCandidates({
        q: query || undefined,
        type: "premium",
        degrees,
        take: 50,
      });
      setResults(data.candidates);
      setTotal(data.total);
      setHasSearched(true);
      data.candidates.forEach(onResult);
      toast.success(`Premium search · ${data.total} physician${data.total !== 1 ? "s" : ""} found`);
    } catch (e: any) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const pct = Math.min(100, Math.round((used / quota) * 100));

  return (
    <div className="space-y-4">
      {/* Premium hero panel */}
      <div className="relative overflow-hidden rounded-2xl border border-[oklch(0.72_0.12_85_/_0.35)] bg-gradient-to-br from-[oklch(0.16_0.05_265)] via-[oklch(0.20_0.06_260)] to-[oklch(0.12_0.04_265)] p-[1.5px] shadow-pop">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.82_0.14_85)] to-transparent opacity-60" />
        <div className="rounded-[15px] bg-gradient-to-br from-[oklch(0.17_0.05_265)] to-[oklch(0.11_0.04_265)] p-6 text-[oklch(0.96_0.01_85)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[oklch(0.72_0.14_85_/_0.4)] bg-[oklch(0.72_0.14_85_/_0.08)] px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[oklch(0.85_0.14_85)]">
                  <Crown className="h-3 w-3" /> Premium
                </span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-white/50">
                  Verified Physician Network
                </span>
              </div>
              <h2 className="mt-3 font-display text-[22px] font-semibold tracking-tight">
                Search India's verified doctors
              </h2>
              <p className="mt-1 max-w-xl text-[13px] text-white/65">
                Licence-verified MBBS, MD, MS, DM, MCh, DNB &amp; DrNB profiles — sourced from
                leading institutes and cross-checked against State / NMC registers.
              </p>
            </div>
            <div className="min-w-[200px] rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/55">
                <span>{plan} plan</span>
                <span>{remaining} left</span>
              </div>
              <div className="mt-2 font-display text-[20px] text-white">
                {used}<span className="text-white/40"> / {quota}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[oklch(0.78_0.14_85)] to-[oklch(0.88_0.12_85)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                disabled={isLocked}
                placeholder="Search by name, specialty, procedure…"
                className="h-11 border-white/15 bg-white/[0.07] pl-9 text-white placeholder:text-white/40 focus-visible:bg-white/[0.1] focus-visible:ring-[oklch(0.78_0.14_85)] disabled:opacity-50"
              />
            </div>
            <Button
              onClick={runSearch}
              disabled={loading || isLocked}
              className="h-11 gap-2 bg-gradient-to-r from-[oklch(0.78_0.14_85)] to-[oklch(0.86_0.13_85)] text-[oklch(0.18_0.04_265)] hover:opacity-95"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</>
                : <><Sparkles className="h-4 w-4" /> Premium search</>
              }
            </Button>
          </div>

          {/* Degree chips */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-white/55">
              <GraduationCap className="h-3.5 w-3.5" /> Filter by qualification
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {DEGREE_GROUPS.map((g) => (
                <div key={g.label}>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/45">
                    {g.label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.degrees.map((d) => {
                      const active = selectedDegrees.includes(d);
                      return (
                        <button
                          key={d}
                          onClick={() => toggleDegree(d)}
                          className={
                            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors " +
                            (active
                              ? "border-[oklch(0.78_0.14_85)] bg-[oklch(0.78_0.14_85)] text-[oklch(0.18_0.04_265)]"
                              : "border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]")
                          }
                        >
                          {d}
                          {active && <X className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11.5px] text-white/50">
              Only the qualifications listed above are searchable in the premium pool. All other
              healthcare professionals are available via Basic Search.
            </p>
          </div>
        </div>
      </div>

      {/* Quota progress card */}
      <Card className="border-border bg-card shadow-soft">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <div className="text-[13px]">
              <span className="font-medium text-foreground">{plan} plan</span>
              <span className="text-muted-foreground">
                {" "}· {used} of {quota} premium searches used this cycle
              </span>
            </div>
          </div>
          <div className="w-full max-w-xs">
            <Progress value={pct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {error && <ErrorBanner message={error} />}

      {/* Results */}
      {hasSearched ? (
        <ResultsGrid results={results} onOpen={onOpen} onCv={onCv} premium loading={loading} total={total} />
      ) : (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="p-10 text-center text-[13px] text-muted-foreground">
            Select qualifications and run a premium search to see verified physician profiles.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────── RESULTS GRID ──────────────────────────────────── */

function ResultsGrid({
  results, onOpen, onCv, premium = false, loading = false, total,
}: {
  results: Candidate[];
  onOpen: (id: string) => void;
  onCv:   (id: string) => void;
  premium?: boolean;
  loading?: boolean;
  total?: number;
}) {
  if (loading && results.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Searching database…
      </div>
    );
  }
  if (!loading && results.length === 0) {
    return (
      <Card className="border-dashed border-border bg-card">
        <CardContent className="p-10 text-center text-[13px] text-muted-foreground">
          {premium
            ? "No verified doctors matched your filters. Try widening qualifications."
            : "No candidates match your filters. Try a different search term."}
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {total !== undefined && !loading && (
        <p className="text-[12px] text-muted-foreground">
          Showing {results.length} of {total} result{total !== 1 ? "s" : ""}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((c) => (
          <Card
            key={c.id}
            className={
              "group cursor-pointer border-border bg-card shadow-soft transition-shadow hover:shadow-pop " +
              (premium ? "ring-1 ring-[oklch(0.78_0.14_85_/_0.18)]" : "")
            }
            onClick={() => onOpen(c.id)}
          >
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-[13px] font-semibold">
                  {c.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{c.name}</span>
                    {c.verified && <VerifiedBadge />}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {c.role} · {c.specialty}
                  </div>
                </div>
                {premium && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[oklch(0.78_0.14_85_/_0.4)] bg-[oklch(0.78_0.14_85_/_0.1)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[oklch(0.55_0.12_75)]">
                    <Crown className="h-2.5 w-2.5" /> Verified
                  </span>
                )}
              </div>
              <p className="line-clamp-2 text-[12.5px] text-muted-foreground">{c.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.education.slice(0, 2).map((e, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {e.degree}
                  </span>
                ))}
                {c.skills.slice(0, 2).map((s, i) => (
                  <span
                    key={`sk-${i}`}
                    className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span>{c.experienceYears} yrs · {c.location}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px]"
                  onClick={(e) => { e.stopPropagation(); onCv(c.id); }}
                >
                  View CV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── ERROR BANNER ──────────────────────────────────── */

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

export { PLAN_QUOTA };
export type { PlanTier };
