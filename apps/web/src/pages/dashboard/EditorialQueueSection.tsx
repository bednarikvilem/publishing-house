import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL, authHeaders, setArticleSubscriberOnly } from "../../lib/api";
import type { PaginatedResponse, ReviewDecision } from "../../types";
import type { QueueArticle } from "../../types/dashboard";
import { SectionTitle } from "../../components/SectionTitle";
import { ListRow } from "../../components/ListRow";
import { Pagination } from "../../components/Pagination";
import { LoadingState } from "../../components/LoadingState";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { DecisionForm } from "../../components/DecisionForm";
import { STATUS_LABELS, STATUS_STYLES } from "../../lib/articleStatus";
import { formatDate } from "../../lib/utils";

type Editor = { id: string; full_name: string };

export function EditorialQueueSection({ newspaperId }: { newspaperId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [articles, setArticles] = useState<QueueArticle[]>([]);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assignEditorId, setAssignEditorId] = useState("");
  const [editors, setEditors] = useState<Editor[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!newspaperId) return;
    await null;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "20",
        view: "NEWSPAPER_MANAGER",
      });
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/queue?${params}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as PaginatedResponse<QueueArticle>;
      setArticles(data.data);
      setPagination({
        total: data.pagination.total,
        total_pages: data.pagination.total_pages,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [newspaperId, currentPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function openAssignEditor(articleId: string) {
    setActiveId(activeId === articleId ? null : articleId);
    if (activeId === articleId) return;
    setAssignEditorId("");
    setEditorsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/editors`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { data: Editor[] };
      setEditors(data.data);
    } catch {
      setEditors([]);
    } finally {
      setEditorsLoading(false);
    }
  }

  async function handleAssignEditor(articleId: string) {
    if (!assignEditorId.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/assign-editor`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ editor_id: assignEditorId.trim() }),
        }
      );
      if (!res.ok) throw new Error();
      setActiveId(null);
      setAssignEditorId("");
      load();
    } catch {
      alert("Failed to assign editor. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleSubscriberOnly(articleId: string, current: boolean) {
    setTogglingIds((prev) => new Set(prev).add(articleId));
    try {
      await setArticleSubscriberOnly(newspaperId, articleId, !current);
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, is_subscriber_only: !current } : a))
      );
    } catch {
      alert("Failed to update subscriber-only setting. Please try again.");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    }
  }

  async function handleApprove(articleId: string, decision: ReviewDecision, note: string) {
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/approve?view=NEWSPAPER_MANAGER`,
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
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle title="Editorial Queue" />

      {error ? (
        <ErrorState />
      ) : loading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState message="No articles awaiting editorial action." />
      ) : (
        <>
          <div className="flex flex-col">
            {articles.map((article, index) => {
              const isSubmitted = article.status === "SUBMITTED";
              return (
                <ListRow
                  key={article.id}
                  first={index === 0}
                  last={index === articles.length - 1}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-foreground text-[15px] leading-snug font-semibold">
                        {article.title}
                      </span>
                      <span className="text-muted-foreground line-clamp-2 text-[13px] leading-[1.4]">
                        {article.perex}
                      </span>
                      <div className="text-muted-foreground flex flex-wrap gap-3 text-[12px]">
                        <span>Author: {article.author.full_name}</span>
                        <span>Category: {article.category}</span>
                        {article.assigned_editor && (
                          <span>Editor: {article.assigned_editor.full_name}</span>
                        )}
                        <span>Submitted: {formatDate(article.submitted_at)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          role="switch"
                          aria-checked={!!article.is_subscriber_only}
                          disabled={togglingIds.has(article.id)}
                          onClick={() =>
                            handleToggleSubscriberOnly(article.id, !!article.is_subscriber_only)
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                            article.is_subscriber_only ? "bg-foreground" : "bg-input"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              article.is_subscriber_only ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-muted-foreground text-[12px]">Subscribers only</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[12px] font-semibold ${STATUS_STYLES[article.status]}`}
                      >
                        {STATUS_LABELS[article.status]}
                      </span>
                      <button
                        onClick={() =>
                          isSubmitted
                            ? openAssignEditor(article.id)
                            : setActiveId(activeId === article.id ? null : article.id)
                        }
                        className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors"
                      >
                        {isSubmitted ? "Assign Editor" : "Review"}
                      </button>
                    </div>
                  </div>

                  {activeId === article.id && isSubmitted && (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleAssignEditor(article.id); }}
                      className="border-border bg-muted/30 mt-3 flex flex-col gap-3 rounded-lg border p-4"
                    >
                      <label className="text-foreground text-[13px] font-medium">
                        Assign Editor
                        {editorsLoading ? (
                          <p className="text-muted-foreground mt-1.5 text-[13px]">Loading editors…</p>
                        ) : editors.length === 0 ? (
                          <p className="text-muted-foreground mt-1.5 text-[13px]">
                            No editors available in this newspaper.
                          </p>
                        ) : (
                          <select
                            value={assignEditorId}
                            onChange={(e) => setAssignEditorId(e.target.value)}
                            required
                            className="border-border bg-background text-foreground focus:ring-ring mt-1.5 w-full rounded-md border px-3 py-2 text-[13px] outline-none focus:ring-2"
                          >
                            <option value="">Select an editor…</option>
                            {editors.map((editor) => (
                              <option key={editor.id} value={editor.id}>
                                {editor.full_name}
                              </option>
                            ))}
                          </select>
                        )}
                      </label>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveId(null)}
                          className="border-border text-muted-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-[13px] font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !assignEditorId.trim() || editors.length === 0}
                          className="bg-foreground text-background rounded-md px-3 py-1.5 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {submitting ? "Assigning…" : "Assign"}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeId === article.id && !isSubmitted && (
                    <DecisionForm
                      onSubmit={(d, n) => handleApprove(article.id, d, n)}
                      onCancel={() => setActiveId(null)}
                      submitting={submitting}
                    />
                  )}
                </ListRow>
              );
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.total_pages}
            total={pagination.total}
            onPageChange={(p) => {
              const next = new URLSearchParams(searchParams);
              next.set("page", String(p));
              setSearchParams(next);
            }}
          />
        </>
      )}
    </div>
  );
}
