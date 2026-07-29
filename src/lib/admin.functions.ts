import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "@/integrations/supabase/client.server";

export const getAdminStats = createServerFn("GET", async () => {
  const supabase = getSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_admin) {
    throw new Error("Forbidden: Admin access required");
  }

  const { data, error } = await supabase.rpc("get_admin_stats");
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
