import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../../lib/api";
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

export function ReviewQueueSection({ newspaperId }: { newspaperId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [articles, setArticles] = useState<QueueArticle[]>([]);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!newspaperId) return;
    await null;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "20",
        view: "EDITOR",
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

  async function handleReview(articleId: string, decision: ReviewDecision, note: string) {
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/newspapers/${newspaperId}/articles/${articleId}/review`,
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
      <SectionTitle title="Review Queue" />

      {error ? (
        <ErrorState />
      ) : loading ? (
        <LoadingState />
      ) : articles.length === 0 ? (
        <EmptyState message="No articles awaiting your review." />
      ) : (
        <>
          <div className="flex flex-col">
            {articles.map((article, index) => (
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
                    <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                      <span>Author: {article.author.full_name}</span>
                      <span>Category: {article.category}</span>
                      <span>Submitted: {formatDate(article.submitted_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[article.status]}`}
                    >
                      {STATUS_LABELS[article.status]}
                    </span>
                    <button
                      onClick={() => setActiveId(activeId === article.id ? null : article.id)}
                      className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors"
                    >
                      Review
                    </button>
                  </div>
                </div>
                {activeId === article.id && (
                  <DecisionForm
                    onSubmit={(d, n) => handleReview(article.id, d, n)}
                    onCancel={() => setActiveId(null)}
                    submitting={submitting}
                  />
                )}
              </ListRow>
            ))}
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
