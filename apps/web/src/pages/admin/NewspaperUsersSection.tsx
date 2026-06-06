import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, authHeaders } from "../../lib/api";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";

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

export function NewspaperUsersSection({ newspaper }: { newspaper: NewspaperEntry }) {
  const [users, setUsers]             = useState<UserEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [roleInput, setRoleInput]     = useState("");
  const [saving, setSaving]           = useState(false);

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

  useEffect(() => { load(); }, [load]);

  async function handleAssignRole(userId: string) {
    if (!roleInput) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaper.id}/users/${userId}/roles`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ role: roleInput }),
        }
      );
      if (res.status === 409) {
        const data = (await res.json()) as { error: string };
        alert(data.error === "MANAGER_ALREADY_EXISTS"
          ? "This newspaper already has a manager. Remove the existing one first."
          : "User already has this role.");
        return;
      }
      if (!res.ok) throw new Error();
      setActiveUserId(null);
      setRoleInput("");
      load();
    } catch {
      alert("Failed to assign role.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveRole(userId: string, role: string) {
    if (role === "REGISTERED_USER") { alert("Cannot remove the base REGISTERED_USER role."); return; }
    if (!confirm(`Remove role ${role} from this user?`)) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaper.id}/users/${userId}/roles/${role}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert("Failed to remove role.");
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
                  <span className="text-foreground text-sm font-semibold">{user.full_name ?? user.username}</span>
                  <span className="text-muted-foreground text-xs">@{user.username} · {user.email}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {user.roles.map((role) => (
                      <span key={role} className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2.5 py-0.5 text-3xs font-medium">
                        {role}
                        {role !== "REGISTERED_USER" && (
                          <button onClick={() => handleRemoveRole(user.id, role)} className="ml-0.5 transition-colors hover:text-[#dc2626]" aria-label={`Remove ${role}`}>×</button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setActiveUserId(activeUserId === user.id ? null : user.id)}
                  className="border-border text-foreground hover:bg-muted shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold"
                >
                  Assign Role
                </button>
              </div>
              {activeUserId === user.id && (
                <div className="border-border bg-muted/30 mt-3 flex items-center gap-3 rounded-lg border p-4">
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    className="border-border bg-background text-foreground focus:ring-ring flex-1 rounded-md border px-3 py-2 text-2xs outline-none focus:ring-2"
                  >
                    <option value="">Select a role…</option>
                    {NEWSPAPER_ROLES.filter((r) => !user.roles.includes(r)).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button onClick={() => handleAssignRole(user.id)} disabled={saving || !roleInput} className="bg-foreground text-background rounded-md px-3 py-2 text-2xs font-semibold disabled:opacity-50">
                    {saving ? "Saving…" : "Assign"}
                  </button>
                  <button onClick={() => { setActiveUserId(null); setRoleInput(""); }} className="border-border text-muted-foreground hover:bg-muted rounded-md border px-3 py-2 text-2xs">
                    Cancel
                  </button>
                </div>
              )}
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
