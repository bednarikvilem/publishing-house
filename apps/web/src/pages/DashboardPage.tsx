import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { useNewspaper } from "../hooks/useNewspaper";
import type { ArticleStatus } from "../types";
import { StatisticsSection } from "../components/StatisticsSection";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";
import { STATUS_DOT, MY_ARTICLE_FILTERS, EDITORIAL_ROLES } from "../lib/articleStatus";
import { MyArticlesSection } from "./dashboard/MyArticlesSection";
import { ReviewQueueSection } from "./dashboard/ReviewQueueSection";
import { EditorialQueueSection } from "./dashboard/EditorialQueueSection";
import { CategoriesSection } from "./dashboard/CategoriesSection";

function deriveDefaultSection(roles: string[]): string {
  if (roles.includes("AUTHOR")) return "my-articles";
  if (roles.includes("EDITOR")) return "review-queue";
  if (roles.includes("NEWSPAPER_MANAGER")) return "editorial-queue";
  return "my-articles";
}

export function DashboardPage() {
  const { newspaperName } = useParams<{ newspaperName: string }>();
  const { newspaper } = useNewspaper();
  const [searchParams, setSearchParams] = useSearchParams();

  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const np = newspaperName ?? "";
  const newspaperId = newspaper?.id ?? "";

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) =>
        res.ok ? (res.json() as Promise<{ roles: string[] }>) : Promise.reject()
      )
      .then((data) => setUserRoles(data.roles ?? []))
      .catch(() => {})
      .finally(() => setRolesLoaded(true));
  }, []);

  const sectionParam = searchParams.get("section");
  const activeSection =
    sectionParam ?? (rolesLoaded ? deriveDefaultSection(userRoles) : null);

  const statusInSearch = (searchParams.get("status") as ArticleStatus | null) ?? null;

  function setStatusFilter(status: ArticleStatus | null) {
    const next = new URLSearchParams(searchParams);
    next.set("section", "my-articles");
    if (status) next.set("status", status);
    else next.delete("status");
    setSearchParams(next);
  }

  const sidebarChildren = activeSection === "my-articles" ? (
    <div className="flex flex-col gap-0.5">
      <p className="text-muted-foreground px-2 pt-4 pb-1 text-3xs font-semibold tracking-wider uppercase">
        Filter by Status
      </p>
      {MY_ARTICLE_FILTERS.map((item) => (
        <button
          key={String(item.value)}
          onClick={() => setStatusFilter(item.value)}
          className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-2xs font-medium transition-colors ${
            statusInSearch === item.value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {item.value ? (
            <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[item.value]}`} />
          ) : (
            <span className="border-muted-foreground h-2 w-2 shrink-0 rounded-full border" />
          )}
          {item.label}
        </button>
      ))}
    </div>
  ) : null;

  const hasAccess = userRoles.some((r) => (EDITORIAL_ROLES as readonly string[]).includes(r));

  return (
    <div className={`bg-background text-foreground flex min-h-screen w-full flex-col${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
      <Navbar newspaperName={np} />

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar>{sidebarChildren}</Sidebar>

        <main className="flex flex-1 flex-col gap-7 px-4 py-6 md:px-12 md:py-8">
          {!rolesLoaded ? (
            <LoadingState />
          ) : !hasAccess ? (
            <EmptyState message="You don't have access to the dashboard." />
          ) : !activeSection ? (
            <LoadingState />
          ) : activeSection === "my-articles" ? (
            <MyArticlesSection newspaperId={newspaperId} newspaperName={np} />
          ) : activeSection === "review-queue" ? (
            <ReviewQueueSection newspaperId={newspaperId} />
          ) : activeSection === "editorial-queue" ? (
            <EditorialQueueSection newspaperId={newspaperId} />
          ) : activeSection === "categories" ? (
            <CategoriesSection newspaperId={newspaperId} />
          ) : activeSection === "statistics" ? (
            !newspaperId ? (
              <LoadingState />
            ) : (
              <StatisticsSection
                newspaperId={newspaperId}
                isDirector={userRoles.includes("DIRECTOR")}
              />
            )
          ) : (
            <EmptyState message="This section is not available." />
          )}
        </main>
      </div>
    </div>
  );
}
