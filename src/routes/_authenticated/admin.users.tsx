import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, toggleUserAdmin } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/app-sidebar"; // Wait, I can just use auth from supabase or get it from context. Let's just use supabase client

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const getListUsersFn = useServerFn(listUsers);
  const toggleAdminFn = useServerFn(toggleUserAdmin);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getListUsersFn(),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: (userId: string) => toggleAdminFn({ data: { userId } }),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(res.newStatus ? "User promoted to admin" : "Admin privileges revoked");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update user");
    }
  });

  const filteredUsers = users?.filter(u => 
    (u.display_name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (u.id.includes(searchTerm))
  ) || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage user roles and privileges across the platform.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or ID..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>A complete list of all users on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No users found matching your search.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">User ID</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        {user.display_name || "Unknown User"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {user.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        {user.is_admin ? (
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if(confirm(`Are you sure you want to ${user.is_admin ? 'revoke' : 'grant'} admin privileges for ${user.display_name || 'this user'}?`)) {
                              toggleAdminMutation.mutate(user.id);
                            }
                          }}
                          disabled={toggleAdminMutation.isPending && toggleAdminMutation.variables === user.id}
                        >
                          {user.is_admin ? (
                            <>
                              <ShieldOff className="mr-2 h-4 w-4 text-destructive" />
                              <span className="text-destructive">Revoke Admin</span>
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4 text-emerald-500" />
                              <span>Make Admin</span>
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
