import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { PlusIcon } from "../../components/Icons";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { FormField } from "../../components/FormField";

type GlobalUser = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  roles: string[];
};

export function GlobalUsersSection() {
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
        alert(data.error === "ROLE_ALREADY_HELD_GLOBALLY"
          ? "A user already holds this global role."
          : "Email is already taken.");
        return;
      }
      if (!res.ok) throw new Error();
      setShowCreate(false);
      setForm({ email: "", username: "", full_name: "", password: "", role: "DIRECTOR" });
      load();
    } catch {
      alert("Failed to create global user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(userId: string, role: string) {
    if (!confirm(`Remove ${role} from this user?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}/global-roles/${role}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 422) { alert("Cannot remove your own SYSTEM_ADMINISTRATOR role."); return; }
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert("Failed to remove role.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SectionTitle title="Global Users" />
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="bg-foreground text-background flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90"
        >
          <PlusIcon />
          New Global User
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="border-border bg-card flex flex-col gap-4 rounded-lg border p-5">
          <p className="text-foreground text-sm font-semibold">Create Global User</p>
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
              <label className="text-foreground text-sm font-medium">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="border-border bg-background text-foreground focus:ring-ring h-9 rounded-md border px-3 text-[13px] outline-none focus:ring-2"
              >
                <option value="DIRECTOR">DIRECTOR</option>
                <option value="SYSTEM_ADMINISTRATOR">SYSTEM_ADMINISTRATOR</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="border-border text-muted-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[13px]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="bg-foreground text-background rounded-md px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50">
              {saving ? "Creating…" : "Create"}
            </button>
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
                  <span className="text-foreground text-sm font-semibold">{u.full_name ?? u.username}</span>
                  <span className="text-muted-foreground text-xs">@{u.username} · {u.email}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {u.roles.map((role) => (
                      <span key={role} className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        {role}
                        <button onClick={() => handleRemove(u.id, role)} className="ml-0.5 transition-colors hover:text-[#dc2626]" aria-label={`Remove ${role}`}>×</button>
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
