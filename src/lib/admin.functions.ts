import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is admin
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", context.userId)
      .single();

    if (!profile || !profile.is_admin) {
      throw new Error("Forbidden: Admin access required");
    }

    const { data, error } = await context.supabase.rpc("get_admin_stats");
    if (error) {
      throw new Error("Failed to load admin stats: " + error.message);
    }

    return data as {
      total_users: number;
      new_users_7d: number;
      total_tasks: number;
      completed_tasks: number;
      total_chat_messages: number;
      recent_users: Array<{
        id: string;
        display_name: string | null;
        created_at: string;
        email_enabled: boolean;
        is_admin: boolean;
      }>;
    };
  });
