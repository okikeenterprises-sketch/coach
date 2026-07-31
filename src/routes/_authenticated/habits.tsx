import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listHabits, createHabit, deleteHabit, toggleHabitLog } from "@/lib/habits.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/habits")({
  component: HabitsPage,
});

function HabitsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listHabits);
  const create = useServerFn(createHabit);
  const del = useServerFn(deleteHabit);
  const toggle = useServerFn(toggleHabitLog);

  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: () => list(),
  });

  const toggleM = useMutation({
    mutationFn: async ({ habitId, date, completed }: { habitId: string; date: string; completed: boolean }) =>
      toggle({ data: { habitId, date, completed } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const delM = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Habit deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const [open, setOpen] = useState(false);
  const createM = useMutation({
    mutationFn: async (payload: { title: string; notes?: string }) => create({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Habit created");
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Generate last 7 days
  const today = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(today, 6 - i);
    return {
      dateObj: d,
      dateStr: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE"),
      day: format(d, "d"),
    };
  });

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Habits</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your daily habits and build consistency.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-2">
              <Plus className="h-4 w-4" /> Add Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Habit</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const title = fd.get("title") as string;
                const notes = fd.get("notes") as string;
                if (!title) return toast.error("Title required");
                createM.mutate({ title, notes });
              }}
              className="space-y-4 pt-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" autoFocus placeholder="e.g. Read 10 pages" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Optional notes" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createM.isPending}>
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {habits.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-card">
            <h3 className="text-lg font-medium text-foreground">No habits yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Create your first habit to start tracking your daily progress.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[600px]">
              {/* Header row for days */}
              <div className="flex items-center gap-4 mb-4 px-4">
                <div className="flex-1 font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  Habit
                </div>
                <div className="flex gap-2 shrink-0">
                  {last7Days.map((d) => (
                    <div key={d.dateStr} className="flex flex-col items-center justify-center w-10">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">{d.label}</span>
                      <span className="text-sm font-semibold">{d.day}</span>
                    </div>
                  ))}
                  <div className="w-8"></div> {/* Spacer for delete button */}
                </div>
              </div>

              {/* Habit rows */}
              <div className="space-y-3">
                {habits.map((habit) => (
                  <Card key={habit.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{habit.title}</h3>
                        {habit.notes && (
                          <p className="text-xs text-muted-foreground truncate">{habit.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 shrink-0 items-center mt-2 sm:mt-0">
                        {last7Days.map((d) => {
                          const isCompleted = habit.habit_logs?.some(
                            (log: any) => log.completed_date === d.dateStr
                          );
                          
                          return (
                            <button
                              key={d.dateStr}
                              disabled={toggleM.isPending}
                              onClick={() => toggleM.mutate({ 
                                habitId: habit.id, 
                                date: d.dateStr, 
                                completed: !isCompleted 
                              })}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 ${
                                isCompleted 
                                  ? 'bg-primary text-primary-foreground shadow-sm' 
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground border border-border/50'
                              }`}
                              aria-label={`Mark ${habit.title} as ${isCompleted ? 'incomplete' : 'complete'} for ${d.dateStr}`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Circle className="h-5 w-5 opacity-40" />
                              )}
                            </button>
                          );
                        })}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-2 text-muted-foreground hover:text-destructive shrink-0"
                          disabled={delM.isPending}
                          onClick={() => {
                            if (confirm("Delete this habit forever?")) delM.mutate(habit.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete habit</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
