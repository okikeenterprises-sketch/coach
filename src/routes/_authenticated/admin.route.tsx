import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Admin Sub-navigation */}
      <div className="border-b bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <Link 
            to="/admin" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${pathname === '/admin' ? 'text-primary border-b-2 border-primary h-full' : 'text-muted-foreground'}`}
          >
            <LayoutDashboard className="h-4 w-4" /> Overview
          </Link>
          <Link 
            to="/admin/users" 
            className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${pathname.startsWith('/admin/users') ? 'text-primary border-b-2 border-primary h-full' : 'text-muted-foreground'}`}
          >
            <Users className="h-4 w-4" /> Users
          </Link>
        </div>
      </div>
      
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
