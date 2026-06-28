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
            className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${idx === activeIndex ? "opacity-100" : "opacity-0"
              }`}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              className={`h-full w-full object-cover object-top transition-transform duration-[5000ms] ease-out ${idx === activeIndex ? "scale-100" : "scale-105"
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
      <div className="relative z-10" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <div className="mx-auto w-full max-w-[1400px]" style={{ padding: "0px 16px", boxSizing: "border-box" }}>
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-12">
            <div className="w-full py-8 sm:py-14 lg:py-20" style={{ minWidth: "0px", maxWidth: "100%" }}>
              
              {/* Badge & Community Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-primary shadow-soft backdrop-blur-sm">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand"></span>
                  </span>
                  Verified hospitals · Live openings
                </div>
                <a
                  href="https://apronhanger.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow-soft backdrop-blur-sm hover:bg-primary/95 transition-all cursor-pointer"
                >
                  Join our community <ArrowUpRight className="h-3.5 w-3.5 text-primary-foreground" />
                </a>
              </div>

              {/* Headline */}
              <h1 className="mt-4 font-semibold tracking-tight text-foreground" style={{ fontSize: "clamp(1.6rem, 6vw, 3rem)", lineHeight: 1.2, maxWidth: "100%", wordBreak: "break-word", overflowWrap: "break-word" }}>
                Your next clinical role, <span className="hero-gradient-text">curated</span> for you.
              </h1>

              {/* Subtitle */}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base" style={{ maxWidth: "100%", wordBreak: "break-word" }}>
                Browse verified healthcare openings across India — salary disclosed, credentials checked.
              </p>

              {/* ── Search Bar Card ── */}
              <div className="mt-5 rounded-2xl border border-white/80 bg-white/95 shadow-pop backdrop-blur-sm sm:mt-6" style={{ width: "100%", boxSizing: "border-box" }}>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-briefcase h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true">
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    <rect width="20" height="14" x="2" y="6" rx="2"></rect>
                  </svg>
                  <Input
                    className="flex w-full rounded-md border-input transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-auto flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
                    placeholder="Role or specialty"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  />
                </div>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true">
                    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <Input
                    className="flex w-full rounded-md border-input transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm h-auto flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
                    placeholder="City or state"
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  />
                </div>
                <div className="p-3">
                  <button
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow px-4 py-2 hero-cta w-full h-11 rounded-xl bg-brand text-brand-foreground shadow-soft hover:bg-brand/90 text-sm font-medium sm:w-auto sm:px-8"
                    type="button"
                    onClick={onSearch}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search h-4 w-4 mr-2" aria-hidden="true">
                      <path d="m21 21-4.34-4.34"></path>
                      <circle cx="11" cy="11" r="8"></circle>
                    </svg>
                    Search roles
                  </button>
                </div>
              </div>

              {/* Category Rail */}
              <div className="mt-4 sm:mt-5" style={{ width: "100%", overflow: "auto hidden" }}>
                <div style={{ minWidth: "0px" }}>
                  <CategoryRail
                    active={category}
                    onChange={onCategoryChange}
                    activeSpecialty={specialty}
                    onSpecialtyChange={onSpecialtyChange}
                  />
                </div>
              </div>

              {/* Dot indicators for mobile slider */}
              <div className="mt-4 flex gap-1.5 lg:hidden">
                {HERO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex ? "w-6 bg-brand" : "w-1.5 bg-brand/25"
                      }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

            </div>

            {/* ── Right: Floating Cards (desktop only) ── */}
            <div className="relative hidden lg:block h-[440px] w-full">
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
      </div>
    </section>
  );
}
