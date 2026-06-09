import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      // Already signed in — go to dashboard
      throw redirect({ to: "/_authenticated" as never });
    }
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
