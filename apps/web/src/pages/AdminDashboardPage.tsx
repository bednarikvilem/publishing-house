import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { PlusIcon, TrashIcon, SunIcon, MoonIcon, MenuIcon, XIcon } from "../components/Icons";
import { useTheme } from "../hooks/useTheme";

type GlobalUser = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  roles: string[];
};

type NewspaperEntry = {
  id: string;
  name: string;
  slug: string;
};

type UserEntry = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  roles: string[];
  email_verified: boolean | null;
};

function SectionTitle({ title }: { title: string }) {
  return <h1 className="text-foreground text-[24px] font-bold">{title}</h1>;
}

function LoadingState() {
  return <p className="text-muted-foreground py-16 text-center">Loading…</p>;
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-muted-foreground py-16 text-center">{message}</p>;
}

function Row({ children, first, last }: { children: React.ReactNode; first: boolean; last: boolean }) {
  return (
    <div className={`border-border bg-card px-5 py-4 ${first ? "rounded-t-lg border" : "border-r border-b border-l"} ${last ? "rounded-b-lg" : ""}`}>
      {children}
    </div>
  );
}

/* ── Global Users Section ───────────────────────────────────────────────────── */

function GlobalUsersSection() {
  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", username: "", full_name: "", password: "", role: "DIRECTOR" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/global/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json() as { data: GlobalUser[] };
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
        const data = await res.json() as { error: string };
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
      if (res.status === 422) {
        alert("Cannot remove your own SYSTEM_ADMINISTRATOR role.");
        return;
      }
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
          <p className="text-foreground text-[14px] font-semibold">Create Global User</p>
          <div className="grid grid-cols-2 gap-3">
            {(["email", "username", "full_name", "password"] as const).map((field) => (
              <div key={field} className="flex flex-col gap-1">
                <label className="text-muted-foreground text-[12px] font-medium capitalize">
                  {field.replace("_", " ")}
                </label>
                <input
                  type={field === "password" ? "password" : "text"}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  required={field !== "full_name"}
                  className="border-border bg-background text-foreground focus:ring-ring h-9 rounded-md border px-3 text-[13px] outline-none focus:ring-2"
                />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-[12px] font-medium">Role</label>
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

      {loading ? <LoadingState /> : globalUsers.length === 0 ? (
        <EmptyState message="No global users yet." />
      ) : (
        <div className="flex flex-col">
          {globalUsers.map((u, i) => (
            <Row key={u.id} first={i === 0} last={i === globalUsers.length - 1}>
              <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-foreground text-[14px] font-semibold">{u.full_name ?? u.username}</span>
                  <span className="text-muted-foreground text-[12px]">@{u.username} · {u.email}</span>
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
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Per-Newspaper User Management ──────────────────────────────────────────── */

function NewspaperUsersSection({ newspaper }: { newspaper: NewspaperEntry }) {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState("");
  const [saving, setSaving] = useState(false);

  const NEWSPAPER_ROLES = ["REGISTERED_USER", "AUTHOR", "EDITOR", "NEWSPAPER_MANAGER"];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/newspapers/${newspaper.id}/users?limit=100`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json() as { data: UserEntry[] };
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
        const data = await res.json() as { error: string };
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
      {loading ? <LoadingState /> : users.length === 0 ? (
        <EmptyState message="No users in this newspaper." />
      ) : (
        <div className="flex flex-col">
          {users.map((user, i) => (
            <Row key={user.id} first={i === 0} last={i === users.length - 1}>
              <div className="flex items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-foreground text-[14px] font-semibold">{user.full_name ?? user.username}</span>
                  <span className="text-muted-foreground text-[12px]">@{user.username} · {user.email}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {user.roles.map((role) => (
                      <span key={role} className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
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
                  className="border-border text-foreground hover:bg-muted shrink-0 rounded-md border px-3 py-1.5 text-[12px] font-semibold"
                >
                  Assign Role
                </button>
              </div>
              {activeUserId === user.id && (
                <div className="border-border bg-muted/30 mt-3 flex items-center gap-3 rounded-lg border p-4">
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    className="border-border bg-background text-foreground focus:ring-ring flex-1 rounded-md border px-3 py-2 text-[13px] outline-none focus:ring-2"
                  >
                    <option value="">Select a role…</option>
                    {NEWSPAPER_ROLES.filter((r) => !user.roles.includes(r)).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button onClick={() => handleAssignRole(user.id)} disabled={saving || !roleInput} className="bg-foreground text-background rounded-md px-3 py-2 text-[13px] font-semibold disabled:opacity-50">
                    {saving ? "Saving…" : "Assign"}
                  </button>
                  <button onClick={() => { setActiveUserId(null); setRoleInput(""); }} className="border-border text-muted-foreground hover:bg-muted rounded-md border px-3 py-2 text-[13px]">
                    Cancel
                  </button>
                </div>
              )}
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const [newspapers, setNewspapers] = useState<NewspaperEntry[]>([]);
  const [activeSection, setActiveSection] = useState<"global-users" | { newspaper: NewspaperEntry }>("global-users");
  const [authChecked, setAuthChecked] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function selectSection(section: "global-users" | { newspaper: NewspaperEntry }) {
    setActiveSection(section);
    setDrawerOpen(false);
  }

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) => res.ok ? res.json() as Promise<{ roles: string[] }> : Promise.reject())
      .then((data) => {
        if (!data.roles.includes("SYSTEM_ADMINISTRATOR")) {
          navigate("/admin");
        } else {
          setAuthChecked(true);
        }
      })
      .catch(() => navigate("/admin"));
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return;
    fetch(`${API_BASE_URL}/api/newspapers`, { headers: authHeaders() })
      .then((res) => res.ok ? res.json() as Promise<{ data: NewspaperEntry[] }> : Promise.reject())
      .then((data) => setNewspapers(data.data))
      .catch(() => { /* empty */ });
  }, [authChecked]);

  function handleLogout() {
    fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST", headers: authHeaders() }).catch(() => { /* empty */ });
    localStorage.removeItem("token");
    navigate("/admin");
  }

  if (!authChecked) {
    return <div className="bg-background text-foreground flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  }

  // Sidebar nav content shared between desktop and mobile drawer
  const sidebarNav = (
    <>
      <p className="text-muted-foreground px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">Global</p>
      <button
        onClick={() => selectSection("global-users")}
        className={`flex w-full items-center rounded-md px-2 py-2 text-[13px] font-medium transition-colors ${activeSection === "global-users" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
      >
        Global Users
      </button>

      <p className="text-muted-foreground px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wider uppercase">Newspapers</p>
      {newspapers.map((np) => (
        <button
          key={np.id}
          onClick={() => selectSection({ newspaper: np })}
          className={`flex w-full items-center rounded-md px-2 py-2 text-[13px] font-medium transition-colors ${typeof activeSection === "object" && activeSection.newspaper.id === np.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          {np.name}
        </button>
      ))}

      <div className="mt-auto pt-4">
        <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground w-full rounded-md px-2 py-2 text-left text-[13px] font-medium transition-colors">
          Log Out
        </button>
      </div>
    </>
  );

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="border-border bg-card hidden w-64 shrink-0 flex-col gap-1 border-r px-3 py-6 md:flex">
        <div className="flex items-center justify-between px-2 pb-4">
          <span className="text-foreground text-[16px] font-black tracking-[-0.5px]" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
            Admin Portal
          </span>
          <button onClick={toggle} aria-label="Toggle dark mode" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors">
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </div>
        {sidebarNav}
      </aside>

      {/* Mobile trigger bar */}
      <div className="border-border bg-background flex items-center justify-between border-b px-4 py-3 md:hidden">
        <span className="text-foreground text-[15px] font-black tracking-[-0.5px]" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
          Admin Portal
        </span>
        <div className="flex items-center gap-2">
          <button onClick={toggle} aria-label="Toggle dark mode" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-2 transition-colors">
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors">
            <MenuIcon size={18} />
            Menu
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="border-border bg-card absolute inset-y-0 left-0 flex w-72 flex-col gap-1 border-r px-3 py-6 shadow-xl">
            <div className="flex items-center justify-between px-2 pb-4">
              <span className="text-foreground text-[16px] font-black tracking-[-0.5px]" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
                Admin Portal
              </span>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors">
                <XIcon size={18} />
              </button>
            </div>
            {sidebarNav}
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex flex-1 flex-col gap-7 px-4 py-6 md:px-12 md:py-8">
        {activeSection === "global-users" ? (
          <GlobalUsersSection />
        ) : (
          <NewspaperUsersSection newspaper={activeSection.newspaper} />
        )}
      </main>
    </div>
  );
}
