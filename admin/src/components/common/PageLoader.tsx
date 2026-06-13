import { LottiePlayer } from "./LottiePlayer";

export function AdminPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6">
      <LottiePlayer src="/loading_state.json" loop={true} className="h-20 w-20 sm:h-24 sm:w-24" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
