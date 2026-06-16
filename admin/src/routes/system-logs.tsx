import { createFileRoute } from "@tanstack/react-router";
import { useAdminStore } from "@/lib/admin-store";
import { useState, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { apiBase, authHeader, apiFetch } from "@/lib/api";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/system-logs")({
  component: SystemLogsPage,
});

const PAGE_SIZE = 50;

function SystemLogsPage() {
  const [actionFilter, setActionFilter] = useState("All");
  const { logs: initialLogs } = useAdminStore();

  // Local paginated log state — seeds from global store, extends via Load More
  const [allLogs, setAllLogs] = useState<any[]>(initialLogs || []);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Show Load More if: we have a full page (might be more) OR we know total > loaded count
  const hasMore =
    (total === null && allLogs.length >= PAGE_SIZE) ||
    (total !== null && allLogs.length < total);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await apiFetch(
        `${apiBase()}/api/admin/logs?take=${PAGE_SIZE}&skip=${allLogs.length}`,
        { headers: authHeader() },
      );
      if (res.ok) {
        const { data, total: t } = await res.json();
        setTotal(t ?? allLogs.length + (data?.length || 0));
        setAllLogs((prev) => [...prev, ...(data || [])]);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [allLogs.length]);

  const systemLogs = allLogs;
  const actionTypes = ["All", ...Array.from(new Set(systemLogs.map((l: any) => l.action)))];
  const filtered =
    actionFilter === "All" ? systemLogs : systemLogs.filter((l: any) => l.action === actionFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detailed audit trail of all platform operations
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          Showing {systemLogs.length}
          {total !== null ? ` of ${total}` : ""} entries
        </span>
      </div>

      {/* Action filter chips */}
      <div className="flex flex-wrap gap-2">
        {actionTypes.map((a) => (
          <button
            key={a}
            onClick={() => setActionFilter(a)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              actionFilter === a
                ? "bg-primary text-primary-foreground"
                : "border bg-card hover:bg-accent"
            }`}
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No logs found.
                  </td>
                </tr>
              ) : (
                filtered.map((l: any) => (
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
                        <div className="flex flex-col gap-1 max-w-[200px] sm:max-w-[300px]">
                          {(() => {
                            try {
                              const parsed = JSON.parse(l.meta);
                              return Object.entries(parsed).map(([k, v]) => (
                                <div key={k} className="text-[11px]">
                                  <span className="font-semibold text-foreground/80">{k}:</span>{" "}
                                  <span className="text-muted-foreground">{String(v)}</span>
                                </div>
                              ));
                            } catch {
                              return <span>{l.meta}</span>;
                            }
                          })()}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            <ChevronDown className="h-4 w-4" />
            {loadingMore ? "Loading…" : `Load More (${total! - allLogs.length} remaining)`}
          </button>
        </div>
      )}

      {total !== null && !hasMore && systemLogs.length > 0 && (
        <p className="text-center text-xs text-muted-foreground py-2">
          All {systemLogs.length} log entries loaded.
        </p>
      )}
    </div>
  );
}
