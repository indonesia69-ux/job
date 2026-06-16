import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireCandidateAuth } from "@/lib/requireAuth";

export const Route = createFileRoute("/messages")({
  beforeLoad: () => requireCandidateAuth("/messages"),
  head: () => ({ meta: [{ title: "Messages — ApronHanger" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center animate-fade-in-up">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-primary">
        <MessageSquare className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Messages coming soon
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Direct messaging between candidates and hospitals is under development.
        You'll be notified as soon as it's ready.
      </p>
      <Button asChild className="mt-6">
        <Link to="/" search={{ q: "", city: "" }}>Browse opportunities</Link>
      </Button>
    </div>
  );
}
