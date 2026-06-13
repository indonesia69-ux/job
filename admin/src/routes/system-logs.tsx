import { createFileRoute } from "@tanstack/react-router";
// import { systemLogs } from "@/lib/mock-data";
import { useAdminStore } from "@/lib/admin-store";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/system-logs")({
  component: SystemLogsPage,
});

function SystemLogsPage() {
  const [actionFilter, setActionFilter] = useState("All");
  const { logs } = useAdminStore();
  const systemLogs = logs || [];
  const actionTypes = ["All", ...new Set(systemLogs.map((l) => l.action))];
  const filtered =
    actionFilter === "All" ? systemLogs : systemLogs.filter((l) => l.action === actionFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed audit trail of all platform operations
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {actionTypes.map((a) => (
          <button
            key={a}
            onClick={() => setActionFilter(a)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${actionFilter === a ? "bg-primary text-primary-foreground" : "border bg-card hover:bg-accent"}`}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Entity Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{l.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.actorName}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.entityType} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {l.meta ? (
                      <pre className="max-w-[200px] sm:max-w-[300px] overflow-auto">
                        {JSON.stringify(JSON.parse(l.meta), null, 2)}
                      </pre>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
