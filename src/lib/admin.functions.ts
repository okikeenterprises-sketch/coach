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

export const listUsers = createServerFn({ method: "GET" })
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

    const { data, error } = await context.supabase.rpc("get_all_profiles");
    if (error) {
      throw new Error("Failed to load users: " + error.message);
    }
    
    return data;
  });

export const toggleUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => {
    if (typeof d !== "object" || d === null || !("userId" in d) || typeof (d as any).userId !== "string") {
      throw new Error("Invalid input");
    }
    return { userId: (d as { userId: string }).userId };
  })
  .handler(async ({ context, data }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", context.userId)
      .single();

    if (!profile || !profile.is_admin) {
      throw new Error("Forbidden: Admin access required");
    }

    const { data: newStatus, error } = await context.supabase.rpc("toggle_admin_status", {
      target_user_id: data.userId
    });

    if (error) {
      throw new Error("Failed to toggle admin status: " + error.message);
    }

    return { success: true, newStatus };
  });
