import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../lib/api";
import { SunIcon, MoonIcon } from "../components/Icons";
import { useTheme } from "../hooks/useTheme";
import type { PaginatedResponse, ReviewDecision } from "../types";
import type { QueueArticle, Statistics } from "../types/dashboard";

type NewspaperEntry = { id: string; name: string; slug: string };

function LoadingState() {
  return <p className="text-muted-foreground py-16 text-center">Loading…</p>;
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-muted-foreground py-16 text-center">{message}</p>;
}

function SectionTitle({ title }: { title: string }) {
  return <h1 className="text-foreground text-[24px] font-bold">{title}</h1>;
}

function Row({ children, first, last }: { children: React.ReactNode; first: boolean; last: boolean }) {
  return (
    <div className={`border-border bg-card px-5 py-4 ${first ? "rounded-t-lg border" : "border-r border-b border-l"} ${last ? "rounded-b-lg" : ""}`}>
      {children}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED_BY_MANAGER: "bg-[#7c3aed18] text-[#7c3aed]",
  APPROVED_BY_DIRECTOR: "bg-[#0891b218] text-[#0891b2]",
  PUBLISHED: "bg-[#16a34a18] text-[#16a34a]",
};

/* ── Approval Queue ─────────────────────────────────────────────────────────── */

function ApprovalQueue({ newspaperId }: { newspaperId: string }) {
  const [articles, setArticles] = useState<QueueArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [decision, setDecision] = useState<ReviewDecision>("APPROVE");
  const [note, setNote] = useState("");
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
    } catch { /* empty */ } finally { setLoading(false); }
  }, [newspaperId]);

  useEffect(() => { load(); }, [load]);

  async function handleDecision(articleId: string) {
    if ((decision === "REJECT" || decision === "REQUEST_REVISION") && !note.trim()) return;
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
      setNote("");
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
      {loading ? <LoadingState /> : articles.length === 0 ? (
        <EmptyState message="No articles awaiting your approval." />
      ) : (
        <div className="flex flex-col">
          {articles.map((article, i) => (
            <Row key={article.id} first={i === 0} last={i === articles.length - 1}>
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
                  <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${STATUS_STYLES[article.status] ?? ""}`}>{article.status}</span>
                  <button onClick={() => setActiveId(activeId === article.id ? null : article.id)} className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[12px] font-semibold">
                    Decide
                  </button>
                </div>
              </div>
              {activeId === article.id && (
                <div className="border-border bg-muted/30 mt-3 flex flex-col gap-3 rounded-lg border p-4">
                  <div className="flex gap-2">
                    {(["APPROVE", "REJECT", "REQUEST_REVISION"] as ReviewDecision[]).map((d) => (
                      <button key={d} type="button" onClick={() => setDecision(d)}
                        className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${decision === d ? (d === "APPROVE" ? "bg-[#16a34a] text-white" : d === "REJECT" ? "bg-[#dc2626] text-white" : "bg-[#ea580c] text-white") : "border-border bg-background text-muted-foreground border"}`}>
                        {d === "REQUEST_REVISION" ? "Request Revision" : d.charAt(0) + d.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                    placeholder={(decision === "REJECT" || decision === "REQUEST_REVISION") ? "Note is required…" : "Optional note…"}
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-[13px] outline-none focus:ring-2" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setActiveId(null)} className="border-border text-muted-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[13px]">Cancel</button>
                    <button onClick={() => handleDecision(article.id)} disabled={submitting} className="bg-foreground text-background rounded-md px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50">
                      {submitting ? "Submitting…" : "Submit"}
                    </button>
                  </div>
                </div>
              )}
            </Row>
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
    } catch { /* empty */ } finally { setLoading(false); }
  }, [newspaperId]);

  useEffect(() => { load(); }, [load]);

  async function handlePublish(articleId: string) {
    if (!confirm("Publish this article immediately?")) return;
    setPublishing(articleId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/publish`, {
        method: "POST", headers: authHeaders(),
      });
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
      {loading ? <LoadingState /> : articles.length === 0 ? (
        <EmptyState message="No articles ready for publication." />
      ) : (
        <div className="flex flex-col">
          {articles.map((article, i) => (
            <Row key={article.id} first={i === 0} last={i === articles.length - 1}>
              <div className="flex items-start gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-foreground text-[15px] font-semibold">{article.title}</span>
                  <span className="text-muted-foreground line-clamp-2 text-[13px]">{article.perex}</span>
                  <div className="text-muted-foreground flex gap-3 text-[12px]">
                    <span>Author: {article.author.full_name}</span>
                    <span>Category: {article.category}</span>
                  </div>
                </div>
                <button onClick={() => handlePublish(article.id)} disabled={publishing === article.id}
                  className="rounded-md bg-[#16a34a] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {publishing === article.id ? "Publishing…" : "Publish"}
                </button>
              </div>
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Statistics ─────────────────────────────────────────────────────────────── */

function StatisticsPanel({ newspaperId }: { newspaperId: string }) {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/newspapers/${newspaperId}/statistics`, { headers: authHeaders() })
      .then((res) => res.ok ? res.json() as Promise<Statistics> : Promise.reject())
      .then(setStats)
      .catch(() => { /* empty */ })
      .finally(() => setLoading(false));
  }, [newspaperId]);

  if (loading) return <LoadingState />;
  if (!stats) return null;

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle title="Statistics" />
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Published", value: stats.articles.total_published, color: "text-[#16a34a]" },
          { label: "In Review", value: stats.articles.total_in_review, color: "text-[#ea580c]" },
          { label: "Drafts", value: stats.articles.total_draft, color: "text-muted-foreground" },
          { label: "Rejected", value: stats.articles.total_rejected, color: "text-[#dc2626]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border-border bg-card flex flex-col gap-1 rounded-lg border px-5 py-4">
            <span className="text-muted-foreground text-[12px] font-medium uppercase tracking-wide">{label}</span>
            <span className={`text-[32px] font-bold ${color}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────────── */

type ActiveView = "overview" | { newspaper: NewspaperEntry; tab: "approval" | "publication" | "statistics" };

export function DirectorDashboardPage() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
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
    return <div className="bg-background text-foreground flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading…</p></div>;
  }

  const selectedNewspaper = typeof activeView === "object" ? activeView.newspaper : null;
  const selectedTab = typeof activeView === "object" ? activeView.tab : null;

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="border-border bg-card flex w-64 shrink-0 flex-col gap-1 border-r px-3 py-6">
        <div className="flex items-center justify-between px-2 pb-4">
          <span className="text-foreground text-[16px] font-black tracking-[-0.5px]" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
            Director Portal
          </span>
          <button onClick={toggle} aria-label="Toggle dark mode" className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors">
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </div>

        <button
          onClick={() => setActiveView("overview")}
          className={`flex w-full items-center rounded-md px-2 py-2 text-[13px] font-medium transition-colors ${activeView === "overview" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          All Newspapers
        </button>

        {newspapers.length > 0 && (
          <>
            <p className="text-muted-foreground px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wider uppercase">Newspapers</p>
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
                    <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-2 mt-0.5">
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
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground w-full rounded-md px-2 py-2 text-left text-[13px] font-medium transition-colors">
            Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col gap-7 px-12 py-8">
        {activeView === "overview" ? (
          <div className="flex flex-col gap-6">
            <SectionTitle title="All Newspapers" />
            {newspapers.length === 0 ? <LoadingState /> : (
              <div className="flex flex-col">
                {newspapers.map((np, i) => (
                  <Row key={np.id} first={i === 0} last={i === newspapers.length - 1}>
                    <div className="flex items-center gap-4">
                      <span className="text-foreground flex-1 text-[15px] font-semibold">{np.name}</span>
                      <button
                        onClick={() => setActiveView({ newspaper: np, tab: "approval" })}
                        className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[12px] font-semibold"
                      >
                        Open
                      </button>
                    </div>
                  </Row>
                ))}
              </div>
            )}
          </div>
        ) : selectedNewspaper && selectedTab === "approval" ? (
          <ApprovalQueue newspaperId={selectedNewspaper.id} />
        ) : selectedNewspaper && selectedTab === "publication" ? (
          <PublicationQueue newspaperId={selectedNewspaper.id} />
        ) : selectedNewspaper && selectedTab === "statistics" ? (
          <StatisticsPanel newspaperId={selectedNewspaper.id} />
        ) : null}
      </main>
    </div>
  );
}
