import { useState } from "react";
import { CATEGORIES } from "@/data/categories";
import { cn } from "@/lib/utils";

export function CategoryRail({
  active,
  onChange,
  activeSpecialty,
  onSpecialtyChange,
}: {
  active: string | null;
  onChange: (id: string | null) => void;
  activeSpecialty: string | null;
  onSpecialtyChange: (id: string | null) => void;
}) {
  const current = CATEGORIES.find((c) => c.id === active);

  return (
    <div className="space-y-3">
      <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          onClick={() => {
            onChange(null);
            onSpecialtyChange(null);
          }}
          className={cn(
            "shrink-0 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-soft transition-colors",
            !active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-white/70 bg-white/75 text-foreground backdrop-blur-md hover:border-brand/40 hover:bg-white",
          )}
        >
          All Roles
        </button>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = active === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                onChange(c.id);
                onSpecialtyChange(null);
              }}
              className={cn(
                "group inline-flex shrink-0 items-center gap-3 rounded-xl border px-4 py-2.5 text-left shadow-soft backdrop-blur-md transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/70 bg-white/75 text-foreground hover:border-brand/40 hover:bg-white",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                  isActive ? "bg-white/10 text-primary-foreground" : "bg-brand-soft text-primary",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <span className="leading-tight">
                <span className="block text-xs font-semibold">{c.label}</span>
                <span
                  className={cn(
                    "block text-[10px] font-medium",
                    isActive ? "text-primary-foreground/75" : "text-muted-foreground",
                  )}
                >
                  {c.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {current?.specialties && (
        <div className="scrollbar-thin flex gap-1.5 overflow-x-auto rounded-xl border border-white/70 bg-white/55 p-1 shadow-soft backdrop-blur-md">
          <SpecialtyChip
            label="All specialties"
            active={!activeSpecialty}
            onClick={() => onSpecialtyChange(null)}
          />
          {current.specialties.map((s) => (
            <SpecialtyChip
              key={s.id}
              label={s.label}
              active={activeSpecialty === s.id}
              onClick={() => onSpecialtyChange(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecialtyChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-transparent text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

// re-export hook helper for convenience if needed
export function useCategoryState() {
  const [cat, setCat] = useState<string | null>(null);
  const [spec, setSpec] = useState<string | null>(null);
  return { cat, setCat, spec, setSpec };
}
