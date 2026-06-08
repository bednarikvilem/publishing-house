import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";
import { useUser } from "../hooks/useUser";
import { useLogout } from "../hooks/useLogout";
import { PortalLayout } from "../components/PortalLayout";
import { GlobalUsersSection } from "./admin/GlobalUsersSection";
import { NewspaperUsersSection } from "./admin/NewspaperUsersSection";
import { Button } from "../components/ui/button";

type NewspaperEntry = { id: string; name: string; slug: string };

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<"global-users" | { newspaper: NewspaperEntry }>("global-users");

  const { user, isLoading: userLoading, isError } = useUser();
  const isAdmin = user?.roles.includes("SYSTEM_ADMINISTRATOR") ?? false;
  const authChecked = isAdmin;
  const logout = useLogout("/admin");

  useEffect(() => {
    if (isError || (!userLoading && user && !isAdmin)) navigate("/admin");
  }, [isError, userLoading, user, isAdmin, navigate]);

  const { data: newspapers = [] } = useQuery({
    queryKey: ["newspapers"],
    enabled: authChecked,
    queryFn: async () => {
      const { data, error } = await client.api.newspapers.get();
      if (error) throw error;
      return (data as { data: NewspaperEntry[] }).data;
    },
  });

  function handleLogout() {
    logout.mutate();
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
      <p className="text-muted-foreground px-2 pt-2 pb-1 text-3xs font-semibold tracking-wider uppercase">
        Global
      </p>
      <Button
        variant={activeSection === "global-users" ? "secondary" : "ghost"}
        className="w-full justify-start text-2xs"
        onClick={() => setActiveSection("global-users")}
      >
        Global Users
      </Button>

      <p className="text-muted-foreground px-2 pt-4 pb-1 text-3xs font-semibold tracking-wider uppercase">
        Newspapers
      </p>
      {newspapers.map((np) => (
        <Button
          key={np.id}
          variant={typeof activeSection === "object" && activeSection.newspaper.id === np.id ? "secondary" : "ghost"}
          className="w-full justify-start text-2xs"
          onClick={() => setActiveSection({ newspaper: np })}
        >
          {np.name}
        </Button>
      ))}

      <div className="mt-auto pt-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-2xs"
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
