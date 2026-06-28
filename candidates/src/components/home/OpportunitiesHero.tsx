import { Briefcase, MapPin, Search, ShieldCheck, Sparkles, TrendingUp, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryRail } from "@/components/jobs/CategoryRail";
import { useState, useEffect } from "react";

type Props = {
  query: string;
  city: string;
  onQueryChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onSearch: () => void;
  category: string | null;
  onCategoryChange: (v: string | null) => void;
  specialty: string | null;
  onSpecialtyChange: (v: string | null) => void;
  jobCount: number;
};

const HERO_SLIDES = [
  { image: "/a1.png", alt: "Indian medical professional" },
  { image: "/a2.png", alt: "Indian healthcare specialist" },
  { image: "/a3.png", alt: "Indian nurse smiling" },
];

export function OpportunitiesHero({
  query,
  city,
  onQueryChange,
  onCityChange,
  onSearch,
  category,
  onCategoryChange,
  specialty,
  onSpecialtyChange,
  jobCount,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero-premium relative overflow-hidden border-b">
      {/* ── Background Sliding Images ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
              idx === activeIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              className={`h-full w-full object-cover object-top transition-transform duration-[5000ms] ease-out ${
                idx === activeIndex ? "scale-100" : "scale-105"
              }`}
            />
          </div>
        ))}
        {/* Gradient overlays — stronger on mobile so text stays readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/85 sm:from-white/30 sm:via-white/20 sm:to-white/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent sm:from-white/20" />
      </div>

      {/* ── Decorative Orbs (hidden on mobile to avoid layout bleed) ── */}
      <div className="hero-orb hero-orb-a hidden sm:block" aria-hidden />
      <div className="hero-orb hero-orb-b hidden sm:block" aria-hidden />
      <div className="hero-orb hero-orb-c hidden sm:block" aria-hidden />
      <div className="hero-grid-motion absolute inset-0 z-[1] hidden sm:block" aria-hidden />
      <div className="hero-shine absolute inset-0 z-[1] hidden sm:block" aria-hidden />

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-10 sm:py-14 md:py-16 lg:py-20">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-12">

          {/* ── Left: Text + Search ── */}
          <div className="hero-stagger w-full">

            {/* Badge & Community Button */}
            <div className="flex flex-wrap gap-2">
              <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-primary shadow-soft backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
                Verified hospitals · Live openings
              </div>
              <a
                href="https://apronhanger.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hero-badge inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-soft backdrop-blur-sm hover:bg-primary/95 transition-all cursor-pointer"
              >
                Join our community <ArrowUpRight className="h-3.5 w-3.5 text-primary-foreground" />
              </a>
            </div>

            {/* Headline */}
            <h1 className="hero-title mt-4 text-[2rem] leading-[1.15] sm:text-4xl md:text-[2.75rem] lg:text-[3rem] font-semibold tracking-tight text-foreground">
              Your next clinical role,
              <span className="hero-gradient-text"> curated </span>
              for you.
            </h1>

            {/* Subtitle — hide on very small phones to save space */}
            <p className="hero-sub mt-3 hidden xs:block text-sm leading-relaxed text-muted-foreground md:text-base max-w-lg">
              Browse verified healthcare openings across India — salary disclosed, credentials checked.
            </p>

            {/* ── Search Bar ── */}
            <div className="hero-search mt-5 sm:mt-6 w-full rounded-2xl border border-white/80 bg-white/95 shadow-pop backdrop-blur-sm overflow-hidden">

              {/* Role row */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  placeholder="Role or specialty"
                  className="border-0 bg-transparent px-0 py-0 h-auto shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/70"
                />
              </div>

              {/* City + Button row */}
              <div className="flex items-center">
                <div className="flex flex-1 items-center gap-2 px-4 py-3">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    placeholder="City or state"
                    className="border-0 bg-transparent px-0 py-0 h-auto shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/70"
                  />
                </div>
                <div className="pr-2">
                  <Button
                    size="default"
                    className="hero-cta h-10 px-5 shrink-0 rounded-xl bg-brand text-brand-foreground shadow-soft hover:bg-brand/90 text-sm font-medium"
                    type="button"
                    onClick={onSearch}
                  >
                    <Search className="h-4 w-4 mr-1.5" /> Search
                  </Button>
                </div>
              </div>
            </div>

            {/* Category Rail */}
            <div className="mt-5 sm:mt-6 -mx-1 overflow-x-auto scrollbar-hide pb-1">
              <div className="px-1">
                <CategoryRail
                  active={category}
                  onChange={onCategoryChange}
                  activeSpecialty={specialty}
                  onSpecialtyChange={onSpecialtyChange}
                />
              </div>
            </div>
          </div>

          {/* ── Right: Floating Cards (desktop only) ── */}
          <div className="hero-cards relative hidden lg:block h-[440px] w-full">
            {/* Match score */}
            <div className="hero-float-card hero-float-a absolute right-4 top-4 w-[210px] xl:w-[230px] rounded-2xl border border-white/80 bg-white/90 p-4 shadow-pop backdrop-blur-md z-20">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3 text-brand" /> Match score
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">92%</p>
              <p className="mt-1 text-xs text-muted-foreground">Based on your profile & skills</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="hero-progress h-full w-[92%] rounded-full bg-brand" />
              </div>
            </div>

            {/* Verified listing */}
            <div className="hero-float-card hero-float-b absolute left-4 top-36 w-[190px] xl:w-[210px] rounded-2xl border border-white/80 bg-white/90 p-4 shadow-card backdrop-blur-md z-20">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-foreground">Verified listing</p>
              </div>
            </div>

            {/* Open roles */}
            <div className="hero-float-card hero-float-c absolute bottom-4 right-4 w-[220px] xl:w-[250px] rounded-2xl border border-white/80 bg-gradient-to-br from-brand-soft/80 to-white/95 p-4 shadow-pop backdrop-blur-md z-20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Open roles now</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{jobCount}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {jobCount === 0
                  ? "New positions appear as hospitals post on ApronHanger."
                  : "Updated from live hospital postings."}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Dot indicators for mobile slider ── */}
      <div className="relative z-10 flex justify-center gap-1.5 pb-4 sm:hidden">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === activeIndex ? "w-6 bg-brand" : "w-1.5 bg-brand/30"
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
