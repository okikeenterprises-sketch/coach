import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasks, createTask, updateTask, deleteTask } from "@/lib/tasks.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

type Filter = "today" | "upcoming" | "overdue" | "all" | "done";

function TasksPage() {
  const qc = useQueryClient();
  const list = useServerFn(listTasks);
  const update = useServerFn(updateTask);
  const del = useServerFn(deleteTask);
  const [filter, setFilter] = useState<Filter>("all");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => list(),
  });

  const toggleM = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "todo" | "done" }) =>
      update({ data: { id, patch: { status } } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["briefing"] });
    },
  });
  const delM = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["briefing"] });
    },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 86400000);

  const filtered = tasks.filter((t) => {
    if (filter === "done") return t.status === "done";
    if (t.status === "done") return false;
    if (filter === "all") return true;
    if (filter === "overdue") return t.due_at && new Date(t.due_at) < startOfToday;
    if (filter === "today") return t.due_at && new Date(t.due_at) >= startOfToday && new Date(t.due_at) < endOfToday;
    if (filter === "upcoming") return t.due_at && new Date(t.due_at) >= endOfToday;
    return true;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage everything on your plate.</p>
        </div>
        <NewTaskDialog />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">No tasks here.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((t) => (
                <li key={t.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                  <Checkbox
                    checked={t.status === "done"}
                    onCheckedChange={(v) =>
                      toggleM.mutate({ id: t.id, status: v ? "done" : "todo" })
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </p>
                    {t.notes && <p className="text-xs text-muted-foreground truncate">{t.notes}</p>}
                    {t.due_at && (
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(t.due_at), "MMM d, h:mm a")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{t.priority}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => delM.mutate(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewTaskDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const qc = useQueryClient();
  const create = useServerFn(createTask);

  const m = useMutation({
    mutationFn: async () =>
      create({
        data: {
          title,
          notes: notes || null,
          due_at: due ? new Date(due).toISOString() : null,
          priority,
          recurrence: "none",
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["briefing"] });
      setOpen(false);
      setTitle(""); setNotes(""); setDue(""); setPriority("medium");
      toast.success("Task added");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            m.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Due</Label>
              <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={m.isPending}>Add task</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
