"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Trash2,
  Shield,
  User,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface UserRecord {
  id: number;
  email: string;
  contactNumber: string;
  name: string;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 403) {
          toast.error("Access Denied", {
            description: "Admin access required.",
          });
        }
        return;
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: number) => {
    if (userId === currentUser?.id) {
      toast.error("Cannot delete your own account");
      return;
    }
    setActionUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }

      toast.success("User deleted");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setActionUserId(null);
    }
  };

  const handleRoleChange = async (
    userId: number,
    newRole: "user" | "admin",
  ) => {
    setActionUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to update role");
        return;
      }

      toast.success("Role updated", {
        description: `User is now ${newRole === "admin" ? "an admin" : "a regular user"}.`,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setActionUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-linear-to-br from-background to-muted/40">
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <Badge className="rounded-full border border-border bg-foreground/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground dark:bg-background/10 dark:text-foreground">
          Admin
        </Badge>
        <h1
          className="text-5xl font-black tracking-tighter"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Manage <span className="gradient-text">People.</span>
        </h1>
        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
          Add or remove users. Make someone an admin, or remove admin access.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="glass-card overflow-hidden border-border/60 shadow-xl">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-foreground text-background dark:bg-background dark:text-foreground">
                <Users className="w-4 h-4" />
              </div>
              <CardTitle
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Everyone on the System
              </CardTitle>
            </div>
            <CardDescription>
              {users.length} person{users.length !== 1 ? "s" : ""} can log in
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card/80">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="p-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        User
                      </th>
                      <th className="p-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Contact
                      </th>
                      <th className="p-4 text-left text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Role
                      </th>
                      <th className="p-4 text-right text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {users.map((user) => (
                        <motion.tr
                          key={user.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-border/60 last:border-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-foreground text-background dark:bg-background dark:text-foreground">
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-bold text-foreground">
                                  {user.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground text-sm">
                            {user.contactNumber}
                          </td>
                          <td className="p-4">
                            {user.role === "admin" ? (
                              <Badge className="gap-1 rounded-full border border-border bg-foreground/5 text-foreground dark:bg-background/10 dark:text-foreground">
                                <ShieldCheck className="w-3 h-3" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-border text-muted-foreground"
                              >
                                User
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {user.role === "user" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-border text-foreground hover:bg-muted"
                                  onClick={() =>
                                    handleRoleChange(user.id, "admin")
                                  }
                                  disabled={actionUserId !== null}
                                >
                                  {actionUserId === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Shield className="w-4 h-4 mr-1" />
                                      Make Admin
                                    </>
                                  )}
                                </Button>
                              ) : user.id !== currentUser?.id ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-border text-foreground hover:bg-muted"
                                  onClick={() =>
                                    handleRoleChange(user.id, "user")
                                  }
                                  disabled={actionUserId !== null}
                                >
                                  {actionUserId === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Revoke Admin"
                                  )}
                                </Button>
                              ) : null}

                              {user.id !== currentUser?.id ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleDelete(user.id)}
                                  disabled={actionUserId !== null}
                                >
                                  {actionUserId === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Delete
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
