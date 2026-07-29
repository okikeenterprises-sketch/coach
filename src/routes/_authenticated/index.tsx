import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBriefing, updateTask } from "@/lib/tasks.functions";
import { createThread } from "@/lib/threads.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarClock, Sparkles, MessageCircle } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const briefingFn = useServerFn(getBriefing);
  const updateFn = useServerFn(updateTask);
  const createT = useServerFn(createThread);

  const { data, isLoading } = useQuery({
    queryKey: ["briefing"],
    queryFn: () => briefingFn(),
  });

  const toggle = useMutation({
    mutationFn: async (id: string) =>
      updateFn({ data: { id, patch: { status: "done" } } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefing"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const newChat = useMutation({
    mutationFn: async () => createT({ data: {} }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
    },
    onError: (e) => {
      console.error("Failed to create chat:", e);
      alert("Failed to create chat: " + String(e));
    }
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const slacking = data && (data.counts.overdue >= 3 || data.counts.neglected >= 3);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading
              ? "Pulling up your day..."
              : slacking
                ? "Heads up — a few things are slipping. Let's tackle them."
                : data?.counts.total === 0
                  ? "Nothing on your plate yet. Add a task to get started."
                  : "Here's what today looks like."}
          </p>
        </div>
        <Button onClick={() => newChat.mutate()} className="gap-2">
          <MessageCircle className="h-4 w-4" /> Chat with Coach
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Overdue" value={data?.counts.overdue ?? 0} tone={data?.counts.overdue ? "danger" : "muted"} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Due today" value={data?.counts.dueToday ?? 0} tone="primary" icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="Neglected" value={data?.counts.neglected ?? 0} tone={data?.counts.neglected ? "warn" : "muted"} icon={<Sparkles className="h-4 w-4" />} />
        <StatCard label="Total open" value={data?.counts.total ?? 0} tone="muted" />
      </div>

      <Section title="Overdue" items={data?.overdue ?? []} empty="Nothing overdue — good work." onToggle={(id) => toggle.mutate(id)} />
      <Section title="Due today" items={data?.dueToday ?? []} empty="Nothing scheduled for today." onToggle={(id) => toggle.mutate(id)} />
      <Section title="Neglected (no due date, > 3 days)" items={data?.neglected ?? []} empty="No forgotten tasks. Nice." onToggle={(id) => toggle.mutate(id)} />

      <div className="pt-4 text-center">
        <Link to="/tasks" className="text-sm text-primary hover:underline">
          View all tasks →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: "primary" | "danger" | "warn" | "muted"; icon?: React.ReactNode }) {
  const toneClass = {
    primary: "border-primary/30 bg-primary/5",
    danger: "border-destructive/40 bg-destructive/5",
    warn: "border-amber-500/40 bg-amber-500/5",
    muted: "",
  }[tone];
  return (
    <Card className={toneClass}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="text-3xl font-semibold mt-2">{value}</div>
      </CardContent>
    </Card>
  );
}

type Task = {
  id: string;
  title: string;
  due_at: string | null;
  priority: "low" | "medium" | "high";
  notes: string | null;
};

function Section({ title, items, empty, onToggle }: { title: string; items: Task[]; empty: string; onToggle: (id: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {items.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <Checkbox onCheckedChange={() => onToggle(t.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  {t.due_at && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.due_at), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>
                <PriorityBadge p={t.priority} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PriorityBadge({ p }: { p: "low" | "medium" | "high" }) {
  const cls = p === "high" ? "bg-destructive/10 text-destructive" : p === "medium" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={cls}>{p}</Badge>;
}
