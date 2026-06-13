import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { LottiePlayer } from "./LottiePlayer";

export function RecruiterEmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaTo,
  lottieFile,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
  lottieFile?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      {lottieFile ? (
        <LottiePlayer src={"/" + lottieFile} loop className="mx-auto h-16 w-16 sm:h-20 sm:w-20" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {ctaLabel && ctaTo && (
        <Button asChild className="mt-5">
          <Link to={ctaTo}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}
