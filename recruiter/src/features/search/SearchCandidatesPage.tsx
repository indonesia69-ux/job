import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Sparkles,
  Lock,
  Crown,
  GraduationCap,
  ShieldCheck,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { LottiePlayer } from "@/components/common/LottiePlayer";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { type Candidate } from "@/lib/mock";
import { VerifiedBadge } from "@/components/brand/VerifiedBadge";
import { CandidatePanel } from "@/features/applicants/CandidatePanel";
import { CvDialog } from "@/features/applicants/CvDialog";
import { usePlan, type PlanTier } from "./PlanContext";
import { searchCandidates } from "@/lib/recruiterData";

// Doctor degrees eligible for Premium Search
const PREMIUM_DEGREES = ["MBBS", "MD", "DM", "DNB", "MS", "MCh", "DrNB"] as const;
type PremiumDegree = (typeof PREMIUM_DEGREES)[number];

const DEGREE_GROUPS = [
  { label: "Medicine", degrees: ["MBBS", "MD", "DM", "DNB"] as PremiumDegree[] },
  { label: "Surgery", degrees: ["MS", "MCh", "DrNB"] as PremiumDegree[] },
];

export function SearchCandidatesPage() {
  const [tab, setTab] = useState<"basic" | "premium">("basic");
  const [openId, setOpenId] = useState<string | null>(null);
  const [cvId, setCvId] = useState<string | null>(null);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);

  const openCandidate = allCandidates.find((c) => c.id === openId) ?? null;
  const cvCandidate = allCandidates.find((c) => c.id === cvId) ?? null;

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
            <strong>Your account validity has expired.</strong> Your account is locked and you
            cannot search candidates. Please contact support.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-semibold tracking-tight">Search Candidates</h1>
        <p className="text-[14px] text-muted-foreground">
          Find healthcare talent across India. Basic covers allied roles; Premium unlocks verified
          physicians and surgeons.
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
  onOpen,
  onCv,
  onResult,
}: {
  onOpen: (id: string) => void;
  onCv: (id: string) => void;
  onResult: (c: Candidate) => void;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All");
  const [results, setResults] = useState<Candidate[]>([]);
  const [lockedResults, setLockedResults] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>(["All"]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isLocked } = usePlan();

  const runSearch = useCallback(
    async (q: string, r: string) => {
      if (isLocked) return;
      setLoading(true);
      setError(null);
      try {
        const data = await searchCandidates({
          q: q || undefined,
          role: r,
          type: "basic",
          take: 50,
        });
        setResults(data.candidates);
        setLockedResults(data.lockedCandidates || []);
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
    },
    [onResult, isLocked],
  );

  // Initial load + debounced re-search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query, role), query ? 350 : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role]);

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card shadow-soft">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-[12.5px] text-amber-900">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Basic search covers nurses, technicians, pharmacists and allied roles. Doctor (MBBS /
              MD / MS / DM / MCh / DNB / DrNB) profiles are gated to{" "}
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
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {!loading && (
              <span>
                {total} candidate{total !== 1 ? "s" : ""} found
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <ErrorBanner message={error} />}
      <ResultsGrid
        results={results}
        lockedResults={lockedResults}
        onOpen={onOpen}
        onCv={onCv}
        loading={loading}
      />
    </div>
  );
}

/* ─────────────────────────── PREMIUM SEARCH ───────────────────────────────── */

function PremiumSearch({
  onOpen,
  onCv,
  onResult,
}: {
  onOpen: (id: string) => void;
  onCv: (id: string) => void;
  onResult: (c: Candidate) => void;
}) {
  const { plan, used, quota, remaining, consume, isLocked } = usePlan();
  const [query, setQuery] = useState("");
  const [selectedDegrees, setSelectedDegrees] = useState<PremiumDegree[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced filters
  const [specialty, setSpecialty] = useState("");
  const [experienceMin, setExperienceMin] = useState("");
  const [experienceMax, setExperienceMax] = useState("");
  const [location, setLocation] = useState("");
  const [currentOrg, setCurrentOrg] = useState("");
  const [expectedSalaryMin, setExpectedSalaryMin] = useState("");
  const [expectedSalaryMax, setExpectedSalaryMax] = useState("");
  const [noticePeriod, setNoticePeriod] = useState<string>("All");
  const [currentSalaryMin, setCurrentSalaryMin] = useState("");
  const [currentSalaryMax, setCurrentSalaryMax] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState<string>("All");

  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<Candidate[]>([]);
  const [recommendedResults, setRecommendedResults] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDegree = (d: PremiumDegree) =>
    setSelectedDegrees((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d]));

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
        specialty: specialty || undefined,
        experienceMin: experienceMin ? parseInt(experienceMin) : undefined,
        experienceMax: experienceMax ? parseInt(experienceMax) : undefined,
        location: location || undefined,
        currentOrg: currentOrg || undefined,
        expectedSalaryMin: expectedSalaryMin ? parseInt(expectedSalaryMin) : undefined,
        expectedSalaryMax: expectedSalaryMax ? parseInt(expectedSalaryMax) : undefined,
        noticePeriod: noticePeriod && noticePeriod !== "All" ? [noticePeriod] : undefined,
        currentSalaryMin: currentSalaryMin ? parseInt(currentSalaryMin) : undefined,
        currentSalaryMax: currentSalaryMax ? parseInt(currentSalaryMax) : undefined,
        preferredLocation: preferredLocation || undefined,
        availabilityStatus:
          availabilityStatus && availabilityStatus !== "All" ? [availabilityStatus] : undefined,
        take: 50,
      });
      setResults(data.candidates);
      setRecommendedResults(data.recommendedCandidates || []);
      setTotal(data.total);
      setHasSearched(true);
      data.candidates.forEach(onResult);
      if (data.recommendedCandidates) {
        data.recommendedCandidates.forEach(onResult);
      }
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
                {used}
                <span className="text-white/40"> / {quota}</span>
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
              onClick={() => setShowAdvanced(!showAdvanced)}
              variant="outline"
              className="h-11 gap-2 border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters{" "}
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={runSearch}
              disabled={loading || isLocked}
              className="h-11 gap-2 bg-gradient-to-r from-[oklch(0.78_0.14_85)] to-[oklch(0.86_0.13_85)] text-[oklch(0.18_0.04_265)] hover:opacity-95"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Premium search
                </>
              )}
            </Button>
          </div>

          {showAdvanced && (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-[13px]">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                    Specialty
                  </label>
                  <Input
                    placeholder="e.g. Cardiology"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                    Experience (Yrs)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={experienceMin}
                      onChange={(e) => setExperienceMin(e.target.value)}
                      className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                    />
                    <span className="text-white/40">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={experienceMax}
                      onChange={(e) => setExperienceMax(e.target.value)}
                      className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                    Current Location
                  </label>
                  <Input
                    placeholder="e.g. Mumbai"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                    Preferred Location
                  </label>
                  <Input
                    placeholder="e.g. Pune"
                    value={preferredLocation}
                    onChange={(e) => setPreferredLocation(e.target.value)}
                    className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                    Current Organization
                  </label>
                  <Input
                    placeholder="e.g. Apollo"
                    value={currentOrg}
                    onChange={(e) => setCurrentOrg(e.target.value)}
                    className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                    Expected Salary (LPA)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={expectedSalaryMin}
                      onChange={(e) => setExpectedSalaryMin(e.target.value)}
                      className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                    />
                    <span className="text-white/40">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={expectedSalaryMax}
                      onChange={(e) => setExpectedSalaryMax(e.target.value)}
                      className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                    Current Salary (LPA)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={currentSalaryMin}
                      onChange={(e) => setCurrentSalaryMin(e.target.value)}
                      className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                    />
                    <span className="text-white/40">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={currentSalaryMax}
                      onChange={(e) => setCurrentSalaryMax(e.target.value)}
                      className="h-8 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                    Notice Period
                  </label>
                  <Select value={noticePeriod} onValueChange={setNoticePeriod}>
                    <SelectTrigger className="h-8 border-white/15 bg-white/10 text-white">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">Any</SelectItem>
                      <SelectItem value="Immediately">Immediately</SelectItem>
                      <SelectItem value="15 days notice">15 days notice</SelectItem>
                      <SelectItem value="30 days notice">30 days notice</SelectItem>
                      <SelectItem value="60 days notice">60 days notice</SelectItem>
                      <SelectItem value="90 days notice">90 days notice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                    Availability
                  </label>
                  <Select value={availabilityStatus} onValueChange={setAvailabilityStatus}>
                    <SelectTrigger className="h-8 border-white/15 bg-white/10 text-white">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">Any</SelectItem>
                      <SelectItem value="Immediate Joiner">Immediate Joiner</SelectItem>
                      <SelectItem value="Serving Notice Period">Serving Notice Period</SelectItem>
                      <SelectItem value="Open to Opportunities">Open to Opportunities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

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
                {" "}
                · {used} of {quota} premium searches used this cycle
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
        <div className="space-y-8">
          {/* Main Results / Exact Matches */}
          <div className="space-y-3">
            {query && (
              <h3 className="font-display text-[18px] font-semibold tracking-tight flex items-center gap-2 text-foreground">
                Exact Matches
                <span className="text-[12px] font-normal text-muted-foreground">
                  ({results.length} profile{results.length !== 1 ? "s" : ""})
                </span>
              </h3>
            )}

            {results.length > 0 ? (
              <ResultsGrid
                results={results}
                onOpen={onOpen}
                onCv={onCv}
                premium
                loading={loading}
                total={total}
              />
            ) : (
              query && (
                <Card className="border-dashed border-border bg-card">
                  <CardContent className="p-8 text-center text-[13px] text-muted-foreground flex flex-col items-center">
                    No exact matches found for "{query}".
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Recommended Matches */}
          {query && recommendedResults.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h3 className="font-display text-[18px] font-semibold tracking-tight flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-[oklch(0.72_0.14_85)] animate-pulse" />
                Recommended Searches
                <span className="text-[12px] font-normal text-muted-foreground">
                  ({recommendedResults.length} profile{recommendedResults.length !== 1 ? "s" : ""})
                </span>
              </h3>
              <ResultsGrid
                results={recommendedResults}
                onOpen={onOpen}
                onCv={onCv}
                premium
                loading={loading}
              />
            </div>
          )}

          {/* Fallback if absolutely everything is empty */}
          {!query && results.length === 0 && (
            <Card className="border-dashed border-border bg-card">
              <CardContent className="p-10 text-center text-[13px] text-muted-foreground flex flex-col items-center">
                <LottiePlayer
                  src="/nothing_for_the_particular_query.json"
                  loop
                  className="h-32 w-32 mb-4"
                />
                No verified doctors matched your filters. Try widening qualifications.
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="p-10 text-center text-[13px] text-muted-foreground flex flex-col items-center">
            <LottiePlayer src="/premium_search.json" loop className="h-32 w-32 mb-4" />
            Select qualifications and run a premium search to see verified physician profiles.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────── RESULTS GRID ──────────────────────────────────── */

function ResultsGrid({
  results,
  lockedResults = [],
  onOpen,
  onCv,
  premium = false,
  loading = false,
  total,
}: {
  results: Candidate[];
  lockedResults?: Candidate[];
  onOpen: (id: string) => void;
  onCv: (id: string) => void;
  premium?: boolean;
  loading?: boolean;
  total?: number;
}) {
  if (loading && results.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <LottiePlayer src="/loading_state.json" loop className="mr-3 h-8 w-8" /> Searching database…
      </div>
    );
  }
  if (!loading && results.length === 0 && (premium || lockedResults.length === 0)) {
    return (
      <Card className="border-dashed border-border bg-card">
        <CardContent className="p-10 text-center text-[13px] text-muted-foreground flex flex-col items-center">
          <LottiePlayer
            src="/nothing_for_the_particular_query.json"
            loop
            className="h-32 w-32 mb-4"
          />
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
                    {!c.cvSource && (
                      <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                        Incomplete
                      </span>
                    )}
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
                {c.education?.slice(0, 2).map((e, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {e.degree}
                  </span>
                ))}
                {c.skills?.slice(0, 2).map((s, i) => (
                  <span
                    key={`sk-${i}`}
                    className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span>
                  {c.experienceYears} yrs · {c.location}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCv(c.id);
                  }}
                >
                  View CV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {lockedResults.map((c) => (
          <Card
            key={c.id}
            className="group relative overflow-hidden border border-[oklch(0.72_0.14_85_/_0.25)] bg-gradient-to-br from-[oklch(0.16_0.05_265)] via-[oklch(0.20_0.06_260)] to-[oklch(0.12_0.04_265)] shadow-soft transition-all"
          >
            {/* Unblurred overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[oklch(0.16_0.05_265)]/40">
              <div className="flex flex-col items-center justify-center rounded-xl bg-[oklch(0.16_0.05_265)]/80 p-4 border border-[oklch(0.72_0.14_85_/_0.35)] backdrop-blur-sm shadow-xl">
                <Crown className="mb-2 h-6 w-6 text-[oklch(0.85_0.14_85)]" />
                <div className="text-[14px] font-semibold text-[oklch(0.85_0.14_85)]">
                  Premium Profile
                </div>
                <div className="text-[12px] text-[oklch(0.85_0.14_85)]/80 mt-1">
                  Switch to Premium Search
                </div>
              </div>
            </div>

            {/* Blurred dummy content */}
            <CardContent className="space-y-3 p-5 blur-[4px] select-none opacity-80">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[oklch(0.72_0.14_85_/_0.08)] text-[oklch(0.85_0.14_85)] font-display text-[13px] font-semibold border border-[oklch(0.72_0.14_85_/_0.4)]">
                  ?
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-white/90">Physician Name</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[oklch(0.72_0.14_85_/_0.4)] bg-[oklch(0.72_0.14_85_/_0.08)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[oklch(0.85_0.14_85)]">
                      <Crown className="h-2.5 w-2.5" /> Verified
                    </span>
                  </div>
                  <div className="text-[12px] text-white/50 mt-1">{c.specialty}</div>
                </div>
              </div>
              <p className="line-clamp-2 text-[12.5px] text-white/40">
                Highly experienced medical professional with extensive background in patient care,
                diagnostics, and clinical operations.
              </p>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/50 mt-2">
                <span>{c.experienceYears} yrs experience</span>
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

export type { PlanTier };
