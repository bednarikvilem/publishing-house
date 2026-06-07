import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../../components/ui/dialog";
import { useToast } from "../../components/ui/toaster";

type NewspaperEntry = { id: string; name: string; slug: string };

type UserEntry = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  roles: string[];
  email_verified: boolean | null;
};

const NEWSPAPER_ROLES = ["REGISTERED_USER", "AUTHOR", "EDITOR", "NEWSPAPER_MANAGER"];

/* ── Assign-role form ─────────────────────────────────────────────────────── */

interface AssignRoleFormValues {
  role: string;
}

function AssignRoleForm({
  user,
  newspaperId,
  onSuccess,
  onCancel,
}: {
  user: UserEntry;
  newspaperId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit } = useForm<AssignRoleFormValues>({
    defaultValues: { role: "" },
  });

  const availableRoles = NEWSPAPER_ROLES.filter((r) => !user.roles.includes(r));

  async function onSubmit({ role }: AssignRoleFormValues) {
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/users/${user.id}/roles`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }
      );
      if (res.status === 409) {
        const data = (await res.json()) as { error: string };
        toast({
          title: "Conflict",
          description:
            data.error === "MANAGER_ALREADY_EXISTS"
              ? "This newspaper already has a manager. Remove the existing one first."
              : "User already has this role.",
          variant: "error",
        });
        return;
      }
      if (!res.ok) throw new Error();
      onSuccess();
    } catch {
      toast({ title: "Error", description: "Failed to assign role.", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border bg-muted/30 mt-3 flex items-center gap-3 rounded-lg border p-4"
    >
      <Controller
        name="role"
        control={control}
        rules={{ required: true }}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="flex-1 rounded-md">
              <SelectValue placeholder="Select a role…" />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Assign"}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

/* ── Main section ─────────────────────────────────────────────────────────── */

export function NewspaperUsersSection({ newspaper }: { newspaper: NewspaperEntry }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaper.id}/users?limit=100`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { data: UserEntry[] };
      setUsers(data.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [newspaper.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemoveRole(userId: string, role: string) {
    if (role === "REGISTERED_USER") {
      toast({
        title: "Not allowed",
        description: "Cannot remove the base REGISTERED_USER role.",
        variant: "error",
      });
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaper.id}/users/${userId}/roles/${role}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast({ title: "Error", description: "Failed to remove role.", variant: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title={`Users — ${newspaper.name}`} />
      {loading ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState message="No users in this newspaper." />
      ) : (
        <div className="flex flex-col">
          {users.map((user, i) => (
            <ListRow key={user.id} first={i === 0} last={i === users.length - 1}>
              <div className="flex items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-foreground text-sm font-semibold">
                    {user.full_name ?? user.username}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    @{user.username} · {user.email}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2.5 py-0.5 text-3xs font-medium"
                      >
                        {role}
                        {role !== "REGISTERED_USER" && (
                          <Dialog>
                            <DialogTrigger
                              className="ml-0.5 transition-colors hover:text-destructive"
                              aria-label={`Remove ${role}`}
                            >
                              ×
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Remove role</DialogTitle>
                                <DialogDescription>
                                  Remove <strong>{role}</strong> from{" "}
                                  {user.full_name ?? user.username}? This cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose render={<Button variant="outline" />}>
                                  Cancel
                                </DialogClose>
                                <DialogClose
                                  render={
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleRemoveRole(user.id, role)}
                                    />
                                  }
                                >
                                  Remove
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveUserId(activeUserId === user.id ? null : user.id)}
                >
                  Assign Role
                </Button>
              </div>

              {activeUserId === user.id && (
                <AssignRoleForm
                  user={user}
                  newspaperId={newspaper.id}
                  onSuccess={() => {
                    setActiveUserId(null);
                    load();
                  }}
                  onCancel={() => setActiveUserId(null)}
                />
              )}
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}