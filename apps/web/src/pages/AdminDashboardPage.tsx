import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { PortalLayout } from "../components/PortalLayout";
import { GlobalUsersSection } from "./admin/GlobalUsersSection";
import { NewspaperUsersSection } from "./admin/NewspaperUsersSection";
import { Button } from "../components/ui/button";

type NewspaperEntry = { id: string; name: string; slug: string };

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [newspapers, setNewspapers]     = useState<NewspaperEntry[]>([]);
  const [activeSection, setActiveSection] = useState<"global-users" | { newspaper: NewspaperEntry }>("global-users");
  const [authChecked, setAuthChecked]   = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) => res.ok ? res.json() as Promise<{ roles: string[] }> : Promise.reject())
      .then((data) => {
        if (!data.roles.includes("SYSTEM_ADMINISTRATOR")) navigate("/admin");
        else setAuthChecked(true);
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
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const sidebarContent = (
    <>
      <p className="text-muted-foreground px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">
        Global
      </p>
      <Button
        variant={activeSection === "global-users" ? "secondary" : "ghost"}
        className="w-full justify-start text-[13px]"
        onClick={() => setActiveSection("global-users")}
      >
        Global Users
      </Button>

      <p className="text-muted-foreground px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wider uppercase">
        Newspapers
      </p>
      {newspapers.map((np) => (
        <Button
          key={np.id}
          variant={typeof activeSection === "object" && activeSection.newspaper.id === np.id ? "secondary" : "ghost"}
          className="w-full justify-start text-[13px]"
          onClick={() => setActiveSection({ newspaper: np })}
        >
          {np.name}
        </Button>
      ))}

      <div className="mt-auto pt-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-[13px]"
          onClick={handleLogout}
        >
          Log Out
        </Button>
      </div>
    </>
  );

  return (
    <PortalLayout title="Admin Portal" sidebarContent={sidebarContent}>
      {activeSection === "global-users" ? (
        <GlobalUsersSection />
      ) : (
        <NewspaperUsersSection newspaper={activeSection.newspaper} />
      )}
    </PortalLayout>
  );
}
