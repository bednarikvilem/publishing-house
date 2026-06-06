import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { PlusIcon } from "../../components/Icons";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { FormField } from "../../components/FormField";
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

type GlobalUser = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  roles: string[];
};

export function GlobalUsersSection() {
  const { toast } = useToast();
  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState({ email: "", username: "", full_name: "", password: "", role: "DIRECTOR" });
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/global/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { data: GlobalUser[] };
      setGlobalUsers(data.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/global/users`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 409) {
        const data = (await res.json()) as { error: string };
        toast({
          title: "Conflict",
          description: data.error === "ROLE_ALREADY_HELD_GLOBALLY"
            ? "A user already holds this global role."
            : "Email is already taken.",
          variant: "error",
        });
        return;
      }
      if (!res.ok) throw new Error();
      setShowCreate(false);
      setForm({ email: "", username: "", full_name: "", password: "", role: "DIRECTOR" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to create global user.", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(userId: string, role: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}/global-roles/${role}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 422) {
        toast({ title: "Not allowed", description: "Cannot remove your own SYSTEM_ADMINISTRATOR role.", variant: "error" });
        return;
      }
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast({ title: "Error", description: "Failed to remove role.", variant: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SectionTitle title="Global Users" />
        <Button onClick={() => setShowCreate((v) => !v)}>
          <PlusIcon />
          New Global User
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="border-border bg-card flex flex-col gap-4 rounded-lg border p-5">
          <p className="text-foreground text-[14px] font-semibold">Create Global User</p>
          <div className="grid grid-cols-2 gap-3">
            {(["email", "username", "full_name", "password"] as const).map((field) => (
              <FormField
                key={field}
                id={field}
                label={field.replace("_", " ")}
                type={field === "password" ? "password" : "text"}
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                required={field !== "full_name"}
              />
            ))}
            <div className="flex flex-col gap-1.5">
              <label className="text-foreground text-[14px] font-medium">Role</label>
              <Select value={form.role} onValueChange={(v) => v !== null && setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger className="w-full rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECTOR">DIRECTOR</SelectItem>
                  <SelectItem value="SYSTEM_ADMINISTRATOR">SYSTEM_ADMINISTRATOR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingState />
      ) : globalUsers.length === 0 ? (
        <EmptyState message="No global users yet." />
      ) : (
        <div className="flex flex-col">
          {globalUsers.map((u, i) => (
            <ListRow key={u.id} first={i === 0} last={i === globalUsers.length - 1}>
              <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-foreground text-[14px] font-semibold">{u.full_name ?? u.username}</span>
                  <span className="text-muted-foreground text-[12px]">@{u.username} · {u.email}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {u.roles.map((role) => (
                      <span key={role} className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        {role}
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
                                Remove <strong>{role}</strong> from {u.full_name ?? u.username}? This cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                              <DialogClose
                                render={<Button variant="destructive" onClick={() => handleRemove(u.id, role)} />}
                              >
                                Remove
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
