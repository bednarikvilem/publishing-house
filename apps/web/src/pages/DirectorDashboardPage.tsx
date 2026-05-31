import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { StatisticsSection } from "../components/StatisticsSection";
import { LoadingState } from "../components/LoadingState";
import { SectionTitle } from "../components/SectionTitle";
import { ListRow } from "../components/ListRow";
import { PortalLayout } from "../components/PortalLayout";
import { ApprovalQueue } from "./director/ApprovalQueue";
import { PublicationQueue } from "./director/PublicationQueue";
import { BrandingSection } from "./director/BrandingSection";

type NewspaperEntry = { id: string; name: string; slug: string; primary_color: string | null };

type ActiveView = "overview" | "global-statistics" | { newspaper: NewspaperEntry; tab: "approval" | "publication" | "statistics" | "branding" };

export function DirectorDashboardPage() {
  const navigate = useNavigate();
  const [newspapers, setNewspapers]   = useState<NewspaperEntry[]>([]);
  const [activeView, setActiveView]   = useState<ActiveView>("overview");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) => res.ok ? res.json() as Promise<{ roles: string[] }> : Promise.reject())
      .then((data) => {
        if (!data.roles.includes("DIRECTOR")) navigate("/director");
        else setAuthChecked(true);
      })
      .catch(() => navigate("/director"));
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
    navigate("/director");
  }

  if (!authChecked) {
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
      <button
        onClick={() => setActiveView("overview")}
        className={`flex w-full items-center rounded-md px-2 py-2 text-[13px] font-medium transition-colors ${activeView === "overview" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
      >
        All Newspapers
      </button>

      <button
        onClick={() => setActiveView("global-statistics")}
        className={`flex w-full items-center rounded-md px-2 py-2 text-[13px] font-medium transition-colors ${activeView === "global-statistics" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
      >
        Global Statistics
      </button>

      {newspapers.length > 0 && (
        <>
          <p className="text-muted-foreground px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wider uppercase">
            Newspapers
          </p>
          {newspapers.map((np) => {
            const isActive = typeof activeView === "object" && activeView.newspaper.id === np.id;
            return (
              <div key={np.id}>
                <button
                  onClick={() => setActiveView({ newspaper: np, tab: "approval" })}
                  className={`flex w-full items-center rounded-md px-2 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {np.name}
                </button>
                {isActive && (
                  <div className="border-border ml-3 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
                    {(["approval", "publication", "statistics", "branding"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveView({ newspaper: np, tab })}
                        className={`rounded-md px-2 py-1.5 text-left text-[12px] font-medium transition-colors capitalize ${selectedTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {tab === "approval" ? "Approval Queue" : tab === "publication" ? "Publication Queue" : tab === "statistics" ? "Statistics" : "Branding"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <div className="mt-auto pt-4">
        <button
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground w-full rounded-md px-2 py-2 text-left text-[13px] font-medium transition-colors"
        >
          Log Out
        </button>
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
                    <span className="text-foreground flex-1 text-[15px] font-semibold">{np.name}</span>
                    <button
                      onClick={() => setActiveView({ newspaper: np, tab: "approval" })}
                      className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[12px] font-semibold"
                    >
                      Open
                    </button>
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
