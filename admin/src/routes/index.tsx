import { createFileRoute } from "@tanstack/react-router";
import { Building2, Users, Briefcase, FileText, ShieldCheck, UserCheck } from "lucide-react";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
// import { kpiData, activityFeed, monthlyTrend, userGrowth } from "@/lib/mock-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

import { useAdminStore } from "@/lib/admin-store";
import { AdminEmptyState as EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { recruiters, candidates, hospitals, recruiterApplications, stats, jobs, applications } =
    useAdminStore();

  const kpiData = stats?.kpiData || {
    totalHospitals: hospitals.length,
    totalRecruiters: recruiters.length,
    totalCandidates: candidates.length,
    totalJobs: jobs.filter((j) => j.status === "Active").length,
    activeSubscriptions: 0,
    interviewsScheduled: 0,
    offersReleased: 0,
    candidatesJoined: 0,
    pendingVerifications: recruiterApplications.filter((a) => a.status === "Pending").length,
    totalRevenue: 0,
  };

  const activityFeed = stats?.activityFeed || [];
  const flaggedItems = stats?.flaggedItems || [];
  const monthlyTrend = stats?.monthlyTrend || [];
  const userGrowth = stats?.userGrowth || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">System overview and platform insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(kpiData.totalRevenue)}
          icon={<Building2 className="h-4.5 w-4.5 text-success" />}
          change="-"
          changeType="neutral"
        />
        <KPICard
          title="Total Hospitals"
          value={kpiData.totalHospitals}
          icon={<Building2 className="h-4.5 w-4.5" />}
          change="-"
          changeType="neutral"
        />
        <KPICard
          title="Total Recruiters"
          value={kpiData.totalRecruiters}
          icon={<Users className="h-4.5 w-4.5" />}
          change="-"
          changeType="neutral"
        />
        <KPICard
          title="Total Candidates"
          value={kpiData.totalCandidates}
          icon={<UserCheck className="h-4.5 w-4.5" />}
          change="-"
          changeType="neutral"
        />
        <KPICard
          title="Active Jobs"
          value={kpiData.totalJobs}
          icon={<Briefcase className="h-4.5 w-4.5" />}
          change="-"
          changeType="neutral"
        />
        <KPICard
          title="Active Subscriptions"
          value={kpiData.activeSubscriptions}
          icon={<Building2 className="h-4.5 w-4.5" />}
          change="-"
          changeType="neutral"
        />
        <KPICard
          title="Interviews Scheduled"
          value={kpiData.interviewsScheduled}
          icon={<Users className="h-4.5 w-4.5" />}
          change="-"
          changeType="neutral"
        />
        <KPICard
          title="Offers Released"
          value={kpiData.offersReleased}
          icon={<FileText className="h-4.5 w-4.5" />}
          change="-"
          changeType="neutral"
        />
        <KPICard
          title="Candidates Joined"
          value={kpiData.candidatesJoined}
          icon={<UserCheck className="h-4.5 w-4.5" />}
          change="-"
          changeType="neutral"
        />
        <KPICard
          title="Pending Verifications"
          value={kpiData.pendingVerifications}
          icon={<ShieldCheck className="h-4.5 w-4.5" />}
          change={kpiData.pendingVerifications > 0 ? "Action Required" : "All caught up"}
          changeType={kpiData.pendingVerifications > 0 ? "down" : "neutral"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Platform Activity — Jobs vs Applications</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
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
                dataKey="jobsPosted"
                name="Jobs Posted"
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="applications"
                name="Applications"
                fill="var(--color-chart-2)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">User Growth — Recruiters vs Candidates</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
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
              <Line
                type="monotone"
                dataKey="recruiters"
                name="Recruiters"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="candidates"
                name="Candidates"
                stroke="var(--color-chart-3)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {activityFeed.map((item: any) => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    item.type === "alert"
                      ? "bg-destructive"
                      : item.type === "verification"
                        ? "bg-success"
                        : item.type === "job"
                          ? "bg-info"
                          : "bg-chart-3"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4">Flagged Items</h3>
          <div className="space-y-3">
            {flaggedItems.length > 0 ? (
              flaggedItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(item.time).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={ShieldCheck}
                lottieFile="nothing_for_the_particular_query.json"
                title="No flagged items"
                description="There are no flagged items requiring attention."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
