import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL, authHeaders, client } from "../lib/api";
import { useUser } from "../hooks/useUser";
import { StatisticsSection } from "../components/StatisticsSection";
import { LoadingState } from "../components/LoadingState";
import { SectionTitle } from "../components/SectionTitle";
import { ListRow } from "../components/ListRow";
import { PortalLayout } from "../components/PortalLayout";
import { ApprovalQueue } from "./director/ApprovalQueue";
import { PublicationQueue } from "./director/PublicationQueue";
import { BrandingSection } from "./director/BrandingSection";
import { Button } from "../components/ui/button";

type NewspaperEntry = { id: string; name: string; slug: string; primary_color: string | null };

type ActiveView = "overview" | "global-statistics" | { newspaper: NewspaperEntry; tab: "approval" | "publication" | "statistics" | "branding" };

export function DirectorDashboardPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ActiveView>("overview");

  const { user, isLoading: userLoading } = useUser();
  const isDirector = user?.roles.includes("DIRECTOR") ?? false;

  useEffect(() => {
    if (!userLoading && (!user || !isDirector)) {
      navigate("/director");
    }
  }, [userLoading, user, isDirector, navigate]);

  const { data: newspapers = [] } = useQuery({
    queryKey: ["newspapers"],
    enabled: isDirector,
    queryFn: async () => {
      const { data, error } = await client.api.newspapers.get();
      if (error) throw error;
      return (data as { data: NewspaperEntry[] }).data;
    },
  });

  function handleLogout() {
    fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST", headers: authHeaders() }).catch(() => { /* empty */ });
    localStorage.removeItem("token");
    navigate("/director");
  }

  if (userLoading || !isDirector) {
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const selectedNewspaper = typeof activeView === "object" ? activeView.newspaper : null;
  const selectedTab       = typeof activeView === "object" ? activeView.tab       : null;

  const sidebarContent = (
    <>
      <Button
        variant={activeView === "overview" ? "secondary" : "ghost"}
        className="w-full justify-start text-2xs"
        onClick={() => setActiveView("overview")}
      >
        All Newspapers
      </Button>

      <Button
        variant={activeView === "global-statistics" ? "secondary" : "ghost"}
        className="w-full justify-start text-2xs"
        onClick={() => setActiveView("global-statistics")}
      >
        Global Statistics
      </Button>

      {newspapers.length > 0 && (
        <>
          <p className="text-muted-foreground px-2 pt-4 pb-1 text-3xs font-semibold tracking-wider uppercase">
            Newspapers
          </p>
          {newspapers.map((np) => {
            const isActive = typeof activeView === "object" && activeView.newspaper.id === np.id;
            return (
              <div key={np.id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start text-2xs"
                  onClick={() => setActiveView({ newspaper: np, tab: "approval" })}
                >
                  {np.name}
                </Button>
                {isActive && (
                  <div className="border-border ml-3 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
                    {(["approval", "publication", "statistics", "branding"] as const).map((tab) => (
                      <Button
                        key={tab}
                        variant={selectedTab === tab ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-xs capitalize"
                        onClick={() => setActiveView({ newspaper: np, tab })}
                      >
                        {tab === "approval" ? "Approval Queue" : tab === "publication" ? "Publication Queue" : tab === "statistics" ? "Statistics" : "Branding"}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

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
    <PortalLayout title="Director Portal" sidebarContent={sidebarContent}>
      {activeView === "overview" ? (
        <div className="flex flex-col gap-6">
          <SectionTitle title="All Newspapers" />
          {newspapers.length === 0 ? (
            <LoadingState />
          ) : (
            <div className="flex flex-col">
              {newspapers.map((np, i) => (
                <ListRow key={np.id} first={i === 0} last={i === newspapers.length - 1}>
                  <div className="flex items-center gap-4">
                    <span className="text-foreground flex-1 text-xs-plus font-semibold">{np.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveView({ newspaper: np, tab: "approval" })}
                    >
                      Open
                    </Button>
                  </div>
                </ListRow>
              ))}
            </div>
          )}
        </div>
      ) : activeView === "global-statistics" ? (
        <StatisticsSection newspaperId="" isDirector={true} />
      ) : selectedNewspaper && selectedTab === "approval" ? (
        <ApprovalQueue newspaperId={selectedNewspaper.id} />
      ) : selectedNewspaper && selectedTab === "publication" ? (
        <PublicationQueue newspaperId={selectedNewspaper.id} />
      ) : selectedNewspaper && selectedTab === "statistics" ? (
        <StatisticsSection newspaperId={selectedNewspaper.id} isDirector={false} />
      ) : selectedNewspaper && selectedTab === "branding" ? (
        <BrandingSection newspaperId={selectedNewspaper.id} currentColor={selectedNewspaper.primary_color} />
      ) : null}
    </PortalLayout>
  );
}
