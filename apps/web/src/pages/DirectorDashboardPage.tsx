import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../lib/api";
import type { PaginatedResponse, ReviewDecision } from "../types";
import type { QueueArticle } from "../types/dashboard";
import { StatisticsSection } from "../components/StatisticsSection";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";
import { SectionTitle } from "../components/SectionTitle";
import { ListRow } from "../components/ListRow";
import { DecisionForm } from "../components/DecisionForm";
import { PortalLayout } from "../components/PortalLayout";
import { STATUS_STYLES } from "../lib/articleStatus";
import { formatDate } from "../lib/utils";

type NewspaperEntry = { id: string; name: string; slug: string };

/* ── Approval Queue ─────────────────────────────────────────────────────────── */

function ApprovalQueue({ newspaperId }: { newspaperId: string }) {
  const [articles, setArticles] = useState<QueueArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/queue?view=DIRECTOR&status=APPROVED_BY_MANAGER&limit=50`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as PaginatedResponse<QueueArticle>;
      setArticles(data.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [newspaperId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDecision(articleId: string, decision: ReviewDecision, note: string) {
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/approve?view=DIRECTOR`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ decision, note: note || undefined }),
        }
      );
      if (!res.ok) throw new Error();
      setActiveId(null);
      load();
    } catch {
      alert("Failed to submit decision.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Approval Queue" />
      {loading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState message="No articles awaiting your approval." />
      ) : (
        <div className="flex flex-col">
          {articles.map((article, i) => (
            <ListRow key={article.id} first={i === 0} last={i === articles.length - 1}>
              <div className="flex items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-foreground text-[15px] font-semibold">{article.title}</span>
                  <span className="text-muted-foreground line-clamp-2 text-[13px]">{article.perex}</span>
                  <div className="text-muted-foreground flex gap-3 text-[12px]">
                    <span>Author: {article.author.full_name}</span>
                    <span>Category: {article.category}</span>
                    <span>Submitted: {formatDate(article.submitted_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${STATUS_STYLES[article.status] ?? ""}`}>
                    {article.status}
                  </span>
                  <button
                    onClick={() => setActiveId(activeId === article.id ? null : article.id)}
                    className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[12px] font-semibold"
                  >
                    Decide
                  </button>
                </div>
              </div>
              {activeId === article.id && (
                <DecisionForm
                  onSubmit={(d, n) => handleDecision(article.id, d, n)}
                  onCancel={() => setActiveId(null)}
                  submitting={submitting}
                />
              )}
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Publication Queue ──────────────────────────────────────────────────────── */

function PublicationQueue({ newspaperId }: { newspaperId: string }) {
  const [articles, setArticles] = useState<QueueArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/queue?view=DIRECTOR&status=APPROVED_BY_DIRECTOR&limit=50`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as PaginatedResponse<QueueArticle>;
      setArticles(data.data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [newspaperId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePublish(articleId: string) {
    if (!confirm("Publish this article immediately?")) return;
    setPublishing(articleId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/publish`,
        { method: "POST", headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      load();
    } catch {
      alert("Failed to publish article.");
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Publication Queue" />
      {loading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState message="No articles ready for publication." />
      ) : (
        <div className="flex flex-col">
          {articles.map((article, i) => (
            <ListRow key={article.id} first={i === 0} last={i === articles.length - 1}>
              <div className="flex items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-foreground text-[15px] font-semibold">{article.title}</span>
                  <span className="text-muted-foreground line-clamp-2 text-[13px]">{article.perex}</span>
                  <div className="text-muted-foreground flex gap-3 text-[12px]">
                    <span>Author: {article.author.full_name}</span>
                    <span>Category: {article.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => handlePublish(article.id)}
                  disabled={publishing === article.id}
                  className="rounded-md bg-[#16a34a] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {publishing === article.id ? "Publishing…" : "Publish"}
                </button>
              </div>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */

type ActiveView = "overview" | { newspaper: NewspaperEntry; tab: "approval" | "publication" | "statistics" };

export function DirectorDashboardPage() {
  const navigate = useNavigate();
  const [newspapers, setNewspapers] = useState<NewspaperEntry[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("overview");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() })
      .then((res) => res.ok ? res.json() as Promise<{ roles: string[] }> : Promise.reject())
      .then((data) => {
        if (!data.roles.includes("DIRECTOR")) {
          navigate("/director");
        } else {
          setAuthChecked(true);
        }
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
  const selectedTab = typeof activeView === "object" ? activeView.tab : null;

  const sidebarContent = (
    <>
      <button
        onClick={() => setActiveView("overview")}
        className={`flex w-full items-center rounded-md px-2 py-2 text-[13px] font-medium transition-colors ${activeView === "overview" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
      >
        All Newspapers
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
                    {(["approval", "publication", "statistics"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveView({ newspaper: np, tab })}
                        className={`rounded-md px-2 py-1.5 text-left text-[12px] font-medium transition-colors capitalize ${selectedTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {tab === "approval" ? "Approval Queue" : tab === "publication" ? "Publication Queue" : "Statistics"}
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
      ) : selectedNewspaper && selectedTab === "approval" ? (
        <ApprovalQueue newspaperId={selectedNewspaper.id} />
      ) : selectedNewspaper && selectedTab === "publication" ? (
        <PublicationQueue newspaperId={selectedNewspaper.id} />
      ) : selectedNewspaper && selectedTab === "statistics" ? (
        <StatisticsSection newspaperId={selectedNewspaper.id} isDirector={false} />
      ) : null}
    </PortalLayout>
  );
}
