import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HabitInput = z.object({
  title: z.string().min(1).max(100),
  notes: z.string().max(1000).optional().nullable(),
});

export const listHabits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Fetch habits and their logs for the current user
    const { data, error } = await context.supabase
      .from("habits")
      .select("*, habit_logs(*)")
      .order("created_at", { ascending: true });
    
    if (error) throw new Error(error.message);
    return data;
  });

export const createHabit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => HabitInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("habits")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteHabit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("habits")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleHabitLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => 
    z.object({
      habitId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
      completed: z.boolean(),
    }).parse(d)
  )
  .handler(async ({ context, data }) => {
    if (data.completed) {
      // Insert log
      const { error } = await context.supabase
        .from("habit_logs")
        .insert({
          habit_id: data.habitId,
          user_id: context.userId,
          completed_date: data.date,
        });
      // Ignore unique constraint violation if it already exists
      if (error && error.code !== "23505") {
        throw new Error(error.message);
      }
    } else {
      // Delete log
      const { error } = await context.supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", data.habitId)
        .eq("user_id", context.userId)
        .eq("completed_date", data.date);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
