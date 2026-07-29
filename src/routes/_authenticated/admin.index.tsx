import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Activity, CheckCircle, MessageSquare, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const getStatsFn = useServerFn(getAdminStats);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getStatsFn(),
  });

  if (isLoading) {
    return <div className="p-8 animate-pulse text-muted-foreground">Loading admin dashboard...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">System-wide overview and user statistics.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={data.total_users} subtitle={`+${data.new_users_7d} this week`} icon={<Users className="h-5 w-5 text-blue-500" />} />
        <StatCard title="Active Tasks" value={data.total_tasks} subtitle={`${data.completed_tasks} completed`} icon={<Activity className="h-5 w-5 text-orange-500" />} />
        <StatCard title="Chat Messages" value={data.total_chat_messages} subtitle="Total interactions" icon={<MessageSquare className="h-5 w-5 text-purple-500" />} />
        <StatCard title="Completion Rate" value={data.total_tasks > 0 ? Math.round((data.completed_tasks / data.total_tasks) * 100) + '%' : '0%'} subtitle="Of all tasks" icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
            <CardDescription>Latest users to join the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent_users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent registrations.</p>
            ) : (
              <div className="space-y-4">
                {data.recent_users.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{u.display_name || "Unknown User"}</p>
                      <p className="text-xs text-muted-foreground">Joined {format(new Date(u.created_at), "MMM d, yyyy")}</p>
                    </div>
                    {u.is_admin && <span className="text-[10px] uppercase bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">Admin</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }: { title: string; value: number | string; subtitle: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
