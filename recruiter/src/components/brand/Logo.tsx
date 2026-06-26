import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={"flex items-center gap-2 " + className}>
      <img
        src="/logo (1).webp"
        alt="ApronHanger"
        className="h-8 w-8 object-contain rounded-lg shadow-soft"
      />
      <span className="font-display text-[17px] font-semibold tracking-tight text-foreground">
        ApronHanger
      </span>
    </Link>
  );
}
