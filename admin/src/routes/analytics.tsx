import { createFileRoute } from "@tanstack/react-router";
// import { monthlyTrend, roleDistribution, recruiters } from "@/lib/mock-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});
import { useAdminStore } from "@/lib/admin-store";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function AnalyticsPage() {
  const { stats, hospitals, jobs, candidates, applications } = useAdminStore();
  const monthlyTrend = stats?.monthlyTrend || [];
  const roleDistribution = stats?.roleDistribution || [];
  const revenueTrend = stats?.revenueTrend || [];

  const topHospitals = [...hospitals]
    .map((h) => ({ name: h.name, jobs: jobs.filter((j) => j.hospitalId === h.id).length }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 5);

  const candidateAppCount: Record<string, number> = {};
  applications.forEach((a) => {
    candidateAppCount[a.candidateId] = (candidateAppCount[a.candidateId] || 0) + 1;
  });
  const topCandidates = candidates
    .map((c) => ({ name: c.name, apps: candidateAppCount[c.id] || 0, role: c.role }))
    .sort((a, b) => b.apps - a.apps)
    .slice(0, 5);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform insights and performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Jobs vs Applications */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Jobs vs Applications Trend</h3>
          {monthlyTrend.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No trend data yet — data populates after jobs and applications are created.
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="jobs" name="Jobs" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="applications"
                name="Applications"
                fill="var(--color-chart-2)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Role Distribution */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Role / Category Distribution</h3>
          {roleDistribution.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No jobs posted yet — categories will appear here once jobs are created.
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={roleDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }: Record<string, any>) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={11}
              >
                {roleDistribution.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Top Hiring Hospitals */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Top Hiring Hospitals</h3>
          {topHospitals.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No hospitals with active jobs yet.
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topHospitals} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={140}
                stroke="var(--color-muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="jobs"
                name="Jobs Posted"
                fill="var(--color-chart-1)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Most Active Candidates */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Most Active Candidates</h3>
          {topCandidates.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No applications yet — candidate activity will appear here.
            </div>
          ) : (
          <div className="space-y-3">
            {topCandidates.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-50 text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.role}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold">{c.apps} apps</span>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Revenue Trend</h3>
          {revenueTrend.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No revenue data yet — revenue will appear once subscriptions are paid.
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="revenue"
                name="Revenue (₹)"
                fill="var(--color-success)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
