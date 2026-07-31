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
import { Plus, Trash2 } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
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

  // Generate last 30 days
  const today = startOfDay(new Date());
  const last30Days = Array.from({ length: 30 }).map((_, i) => {
    const d = subDays(today, 29 - i);
    return {
      dateObj: d,
      dateStr: format(d, "yyyy-MM-dd"),
      label: format(d, "MMM d"),
      day: format(d, "d"),
      isPast: d < today,
    };
  });

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Habits</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your daily habits over the last 30 days.
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {habits.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-card col-span-full">
            <h3 className="text-lg font-medium text-foreground">No habits yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Create your first habit to start tracking your daily progress.
            </p>
          </div>
        ) : (
          habits.map((habit) => (
            <Card key={habit.id} className="flex flex-col">
              <CardContent className="p-5 flex-1 flex flex-col gap-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate" title={habit.title}>{habit.title}</h3>
                    {habit.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1" title={habit.notes}>{habit.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0 -mt-1 -mr-2"
                    disabled={delM.isPending}
                    onClick={() => {
                      if (confirm("Delete this habit forever?")) delM.mutate(habit.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete habit</span>
                  </Button>
                </div>
                
                <div className="mt-auto pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {last30Days.map((d) => {
                      const isCompleted = habit.habit_logs?.some(
                        (log: any) => log.completed_date === d.dateStr
                      );
                      
                      let bgColor = "bg-secondary hover:bg-secondary/80 text-secondary-foreground";
                      if (isCompleted) {
                        bgColor = "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm";
                      } else if (d.isPast) {
                        bgColor = "bg-rose-500 hover:bg-rose-600 text-white shadow-sm";
                      }
                      
                      return (
                        <button
                          key={d.dateStr}
                          title={`${d.label}: ${isCompleted ? 'Completed' : d.isPast ? 'Missed' : 'Pending'}`}
                          disabled={toggleM.isPending}
                          onClick={() => toggleM.mutate({ 
                            habitId: habit.id, 
                            date: d.dateStr, 
                            completed: !isCompleted 
                          })}
                          className={`w-[26px] h-[26px] sm:w-7 sm:h-7 rounded text-[10px] font-medium flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 ${bgColor}`}
                          aria-label={`Mark ${habit.title} as ${isCompleted ? 'incomplete' : 'complete'} for ${d.dateStr}`}
                        >
                          {d.day}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-emerald-500"></div>
                      Done
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-rose-500"></div>
                      Missed
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-secondary"></div>
                      Today
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
